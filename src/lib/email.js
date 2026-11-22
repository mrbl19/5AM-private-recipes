/**
 * Transactional email via Resend (https://resend.com).
 * Free tier: 100 emails/day, 3,000/month — plenty for a bakery.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export async function sendEmail(env, { to, subject, html, text }) {
  if (!env.EMAIL_API_KEY) throw new Error('EMAIL_API_KEY is not configured');

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.EMAIL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error('Resend send failed (' + res.status + '): ' + detail);
  }
  return res.json();
}

function shell(title, inner) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f2ea;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2118;">
  <div style="max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #e8dfd0;border-radius:14px;padding:28px;">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#a8896a;">5AM Bakery</p>
    <h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;">${title}</h1>
    ${inner}
    <p style="margin:26px 0 0;font-size:12px;color:#9b8b78;">5AM Bakery · baked before sunrise</p>
  </div>
</body></html>`;
}

function button(href, label) {
  return `<p style="margin:22px 0;"><a href="${href}" style="display:inline-block;background:#2b2118;color:#fffdf9;text-decoration:none;padding:13px 22px;border-radius:9px;font-weight:600;font-size:15px;">${label}</a></p>
  <p style="margin:0;font-size:12px;color:#9b8b78;word-break:break-all;">If the button does not work, paste this link into your browser:<br>${href}</p>`;
}

/** Sent to the owner on EVERY submission. */
export function ownerNotification({ name, email, whitelisted, adminUrl, link }) {
  const status = whitelisted
    ? 'On the whitelist — recipe link sent automatically.'
    : 'Not on the whitelist — waiting for your approval.';

  return {
    subject: 'Recipe request: ' + name + ' <' + email + '>',
    html: shell(
      'New recipe request',
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
         <strong>${escapeHtml(name)}</strong><br>
         <a href="mailto:${escapeHtml(email)}" style="color:#8a6a45;">${escapeHtml(email)}</a>
       </p>
       <p style="margin:0 0 6px;font-size:14px;color:#6b5a48;">${status}</p>
       ${whitelisted ? '' : button(adminUrl, 'Review in admin panel')}
       <p style="margin:18px 0 0;font-size:12px;color:#9b8b78;">Guest link issued: ${escapeHtml(link)}</p>`
    ),
    text:
      'New recipe request\n\n' +
      'Name: ' + name + '\n' +
      'Email: ' + email + '\n' +
      'Status: ' + status + '\n' +
      (whitelisted ? '' : 'Approve here: ' + adminUrl + '\n'),
  };
}

/** Sent to a guest who is (or just became) whitelisted. */
export function guestLinkEmail({ name, link, days }) {
  const first = (name || '').trim().split(/\s+/)[0] || 'there';
  return {
    subject: 'Your 5AM Bakery recipe link',
    html: shell(
      'Here is your recipe',
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(first)},</p>
       <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
         You are on the list. This private link opens the recipe — it is yours alone, so please do not forward it.
       </p>
       ${button(link, 'Open the recipe')}
       <p style="margin:18px 0 0;font-size:13px;color:#6b5a48;">The link stays valid for ${days} days.</p>`
    ),
    text:
      'Hi ' + first + ',\n\n' +
      'You are on the list. Open your recipe here:\n' + link + '\n\n' +
      'This link is personal — please do not forward it. It stays valid for ' + days + ' days.\n',
  };
}

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
