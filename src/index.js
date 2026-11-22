import { signToken, verifyToken, safeEqual } from './lib/auth.js';
import { sendEmail, ownerNotification, guestLinkEmail } from './lib/email.js';
import {
  isWhitelisted,
  createRequest,
  recentRequestCount,
  getRequest,
  setRequestStatus,
  addToWhitelist,
  removeFromWhitelist,
  listRequests,
  listWhitelist,
} from './lib/db.js';
import { formPage } from './pages/form.js';
import { recipePage, linkProblemPage } from './pages/recipe.js';
import { adminPage } from './pages/admin.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_NAME = 80;
const RATE_LIMIT = 3;      // submissions per email
const RATE_WINDOW = 10;    // minutes

/* ------------------------------------------------------------------ utils */

function corsHeaders(env, request) {
  const configured = (env.ALLOWED_ORIGIN || '*').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  let allow = '*';
  if (!configured.includes('*')) {
    allow = configured.includes(origin) ? origin : configured[0];
  }
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign(
      { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      extra || {}
    ),
  });
}

function html(body, status, extra) {
  return new Response(body, {
    status: status || 200,
    headers: Object.assign(
      { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      extra || {}
    ),
  });
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isAdmin(request, url, env) {
  const provided = request.headers.get('X-Admin-Key') || url.searchParams.get('key') || '';
  return !!env.ADMIN_KEY && !!provided && safeEqual(provided, env.ADMIN_KEY);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function buildLink(env, origin, email, name) {
  const days = Number(env.TOKEN_TTL_DAYS || 7);
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const token = await signToken({ email, name: name || '', exp }, env.SIGNING_SECRET);
  return { link: origin + '/r?token=' + encodeURIComponent(token), days };
}

/* --------------------------------------------------------------- handlers */

async function handleSubmit(request, env, url, cors) {
  const body = await readJson(request);
  if (!body) return json({ ok: false, error: 'Invalid request body.' }, 400, cors);

  const name = String(body.name || '').trim().slice(0, MAX_NAME);
  const email = normalizeEmail(body.email);

  if (!name) return json({ ok: false, error: 'Please enter your name.' }, 400, cors);
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'Please enter a valid email address.' }, 400, cors);

  const recent = await recentRequestCount(env, email, RATE_WINDOW);
  if (recent >= RATE_LIMIT) {
    return json(
      { ok: false, error: 'Too many requests from this address. Please try again in a few minutes.' },
      429,
      cors
    );
  }

  const whitelisted = await isWhitelisted(env, email);
  await createRequest(env, name, email, whitelisted ? 'auto_approved' : 'pending');

  const { link, days } = await buildLink(env, url.origin, email, name);
  const adminUrl = url.origin + '/admin?key=' + encodeURIComponent(env.ADMIN_KEY || '');

  // The owner is notified on every submission, whitelisted or not.
  try {
    const note = ownerNotification({ name, email, whitelisted, adminUrl, link });
    await sendEmail(env, { to: env.OWNER_EMAIL, ...note });
  } catch (err) {
    console.error('owner notification failed:', err.message);
  }

  if (whitelisted) {
    try {
      const mail = guestLinkEmail({ name, link, days });
      await sendEmail(env, { to: email, ...mail });
    } catch (err) {
      console.error('guest email failed:', err.message);
      return json(
        { ok: false, error: 'We could not send your email just now. Please try again in a moment.' },
        502,
        cors
      );
    }
    return json(
      { ok: true, status: 'sent', message: 'You are on the list — check your inbox for the recipe link.' },
      200,
      cors
    );
  }

  return json(
    {
      ok: true,
      status: 'pending',
      message: 'Thank you — your request is with us. We will email you as soon as it is approved.',
    },
    200,
    cors
  );
}

async function handleRecipe(url, env) {
  const token = url.searchParams.get('token') || '';
  const payload = await verifyToken(token, env.SIGNING_SECRET);
  if (!payload) {
    return html(linkProblemPage('This link is invalid, has been altered, or has expired.'), 401);
  }
  const stillAllowed = await isWhitelisted(env, payload.email);
  if (!stillAllowed) {
    return html(linkProblemPage('Access for this address has been removed.'), 403);
  }
  return html(recipePage({ email: payload.email, name: payload.name }));
}

async function handleAdminData(env, cors) {
  const [pending, whitelist] = await Promise.all([
    listRequests(env, 'pending'),
    listWhitelist(env),
  ]);
  return json({ ok: true, pending, whitelist }, 200, cors);
}

async function handleApprove(request, env, cors) {
  const body = await readJson(request);
  const id = Number(body && body.id);
  if (!id) return json({ ok: false, error: 'Missing request id.' }, 400, cors);

  const row = await getRequest(env, id);
  if (!row) return json({ ok: false, error: 'Request not found.' }, 404, cors);

  await addToWhitelist(env, row.email, row.name, 'approval');
  await setRequestStatus(env, id, 'approved');

  const { link, days } = await buildLink(env, new URL(request.url).origin, row.email, row.name);
  try {
    const mail = guestLinkEmail({ name: row.name, link, days });
    await sendEmail(env, { to: row.email, ...mail });
  } catch (err) {
    console.error('approval email failed:', err.message);
    return json(
      { ok: false, error: 'Approved, but the email could not be sent. Check the Resend key and domain.' },
      502,
      cors
    );
  }

  return json({ ok: true }, 200, cors);
}

async function handleDeny(request, env, cors) {
  const body = await readJson(request);
  const id = Number(body && body.id);
  if (!id) return json({ ok: false, error: 'Missing request id.' }, 400, cors);

  const row = await getRequest(env, id);
  if (!row) return json({ ok: false, error: 'Request not found.' }, 404, cors);

  await setRequestStatus(env, id, 'denied');
  return json({ ok: true }, 200, cors);
}

async function handleAddWhitelist(request, env, cors) {
  const body = await readJson(request);
  const email = normalizeEmail(body && body.email);
  const name = String((body && body.name) || '').trim().slice(0, MAX_NAME);

  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'Enter a valid email address.' }, 400, cors);

  await addToWhitelist(env, email, name, 'admin');

  const { link, days } = await buildLink(env, new URL(request.url).origin, email, name);
  try {
    const mail = guestLinkEmail({ name, link, days });
    await sendEmail(env, { to: email, ...mail });
  } catch (err) {
    console.error('whitelist email failed:', err.message);
    return json(
      { ok: false, error: 'Added to the whitelist, but the email could not be sent.' },
      502,
      cors
    );
  }

  return json({ ok: true }, 200, cors);
}

async function handleRemoveWhitelist(request, env, cors) {
  const body = await readJson(request);
  const email = normalizeEmail(body && body.email);
  if (!email) return json({ ok: false, error: 'Missing email.' }, 400, cors);

  await removeFromWhitelist(env, email);
  return json({ ok: true }, 200, cors);
}

/* ----------------------------------------------------------------- router */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const path = url.pathname;

      // Public
      if (path === '/' && request.method === 'GET') return html(formPage(env));
      if (path === '/api/request' && request.method === 'POST') return handleSubmit(request, env, url, cors);
      if (path === '/r' && request.method === 'GET') return handleRecipe(url, env);
      if (path === '/health') return json({ ok: true }, 200, cors);

      // Admin — every route below requires the admin key
      if (path === '/admin' || path.startsWith('/admin/')) {
        if (!isAdmin(request, url, env)) {
          return json({ ok: false, error: 'Unauthorized.' }, 401, cors);
        }
        if (path === '/admin' && request.method === 'GET') {
          return html(adminPage({ key: url.searchParams.get('key') || '' }));
        }
        if (path === '/admin/data' && request.method === 'GET') return handleAdminData(env, cors);
        if (path === '/admin/approve' && request.method === 'POST') return handleApprove(request, env, cors);
        if (path === '/admin/deny' && request.method === 'POST') return handleDeny(request, env, cors);
        if (path === '/admin/whitelist' && request.method === 'POST') return handleAddWhitelist(request, env, cors);
        if (path === '/admin/whitelist/remove' && request.method === 'POST') return handleRemoveWhitelist(request, env, cors);
        return json({ ok: false, error: 'Not found.' }, 404, cors);
      }

      return html(linkProblemPage('That page does not exist.'), 404);
    } catch (err) {
      console.error('unhandled error:', err && err.stack ? err.stack : err);
      return json({ ok: false, error: 'Something went wrong on our side.' }, 500, cors);
    }
  },
};
