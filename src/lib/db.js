/** All D1 access lives here so the route handlers stay readable. */

export async function isWhitelisted(env, email) {
  const row = await env.DB
    .prepare('SELECT email FROM whitelist WHERE email = ?')
    .bind(email)
    .first();
  return !!row;
}

export async function addToWhitelist(env, email, name, addedBy = 'admin') {
  await env.DB
    .prepare(
      `INSERT INTO whitelist (email, name, added_by)
       VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         name = COALESCE(excluded.name, whitelist.name),
         added_by = excluded.added_by`
    )
    .bind(email, name || null, addedBy)
    .run();
}

export async function removeFromWhitelist(env, email) {
  const res = await env.DB
    .prepare('DELETE FROM whitelist WHERE email = ?')
    .bind(email)
    .run();
  return res.meta && res.meta.changes ? res.meta.changes > 0 : true;
}

export async function createRequest(env, name, email, status) {
  const res = await env.DB
    .prepare('INSERT INTO requests (name, email, status, decided_at) VALUES (?, ?, ?, ?)')
    .bind(name, email, status, status === 'auto_approved' ? new Date().toISOString() : null)
    .run();
  return res.meta ? res.meta.last_row_id : null;
}

export async function recentRequestCount(env, email, minutes = 10) {
  const row = await env.DB
    .prepare(
      `SELECT COUNT(*) AS n FROM requests
       WHERE email = ? AND created_at >= datetime('now', ?)`
    )
    .bind(email, '-' + Number(minutes) + ' minutes')
    .first();
  return row ? Number(row.n) : 0;
}

export async function getRequest(env, id) {
  return env.DB.prepare('SELECT * FROM requests WHERE id = ?').bind(id).first();
}

export async function setRequestStatus(env, id, status) {
  await env.DB
    .prepare('UPDATE requests SET status = ?, decided_at = ? WHERE id = ?')
    .bind(status, new Date().toISOString(), id)
    .run();
}

export async function listRequests(env, status, limit = 200) {
  if (status) {
    const { results } = await env.DB
      .prepare('SELECT * FROM requests WHERE status = ? ORDER BY created_at DESC LIMIT ?')
      .bind(status, limit)
      .all();
    return results || [];
  }
  const { results } = await env.DB
    .prepare('SELECT * FROM requests ORDER BY created_at DESC LIMIT ?')
    .bind(limit)
    .all();
  return results || [];
}

export async function listWhitelist(env, limit = 500) {
  const { results } = await env.DB
    .prepare('SELECT * FROM whitelist ORDER BY added_at DESC LIMIT ?')
    .bind(limit)
    .all();
  return results || [];
}
