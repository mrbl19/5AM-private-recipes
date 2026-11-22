/**
 * Admin panel served at /admin?key=YOUR_ADMIN_KEY
 * The key is embedded in the page and sent as the X-Admin-Key header
 * on every API call. Bookmark the URL; do not share it.
 */
export function adminPage({ key }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>5AM Bakery — recipe access admin</title>
<style>
  :root { --ink:#2b2118; --paper:#f6f2ea; --card:#fffdf9; --line:#e8dfd0; --muted:#8d7c69; }
  * { box-sizing:border-box; }
  body { margin:0; padding:32px 20px 72px; background:var(--paper); color:var(--ink);
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .wrap { max-width:900px; margin:0 auto; }
  .eyebrow { margin:0 0 6px; font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:#a8896a; }
  h1 { margin:0 0 22px; font-size:26px; }
  h2 { margin:0 0 14px; font-size:15px; letter-spacing:.02em; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:22px; margin-bottom:20px; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th { text-align:left; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted);
       padding:0 10px 8px 0; font-weight:600; }
  td { padding:10px 10px 10px 0; border-top:1px solid var(--line); vertical-align:middle; }
  td.when { color:var(--muted); font-size:12px; white-space:nowrap; }
  .email { color:#6b5a48; font-size:13px; }
  .empty { color:var(--muted); font-size:14px; padding:8px 0; }
  button { font:inherit; font-size:13px; font-weight:600; padding:7px 13px; border-radius:8px;
           border:1px solid var(--line); background:#fff; color:var(--ink); cursor:pointer; margin-right:6px; }
  button.primary { background:var(--ink); color:#fffdf9; border-color:var(--ink); }
  button.danger { color:#8a2f2f; border-color:#e7cccc; }
  button:disabled { opacity:.5; cursor:default; }
  .row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
  input { font:inherit; font-size:14px; padding:9px 12px; border:1px solid var(--line); border-radius:8px; background:#fff; }
  .grow { flex:1 1 200px; }
  .toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); background:var(--ink);
           color:#fffdf9; font-size:13px; padding:11px 18px; border-radius:9px; opacity:0;
           transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
</style>
</head>
<body>
  <div class="wrap">
    <p class="eyebrow">5AM Bakery</p>
    <h1>Recipe access</h1>

    <div class="card">
      <h2>Pending requests</h2>
      <div id="pending"><p class="empty">Loading…</p></div>
    </div>

    <div class="card">
      <h2>Add to the whitelist</h2>
      <form id="addForm" class="row">
        <input id="addName" class="grow" type="text" placeholder="Name (optional)" maxlength="80">
        <input id="addEmail" class="grow" type="email" placeholder="email@example.com" required>
        <button class="primary" type="submit">Add &amp; send link</button>
      </form>
    </div>

    <div class="card">
      <h2>Whitelist</h2>
      <div id="list"><p class="empty">Loading…</p></div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

<script>
(function () {
  var KEY = ${JSON.stringify(key)};

  var pendingEl = document.getElementById('pending');
  var listEl = document.getElementById('list');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function toast(text) {
    toastEl.textContent = text;
    toastEl.className = 'toast show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = 'toast'; }, 2600);
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso.indexOf('T') === -1 ? iso.replace(' ', 'T') + 'Z' : iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  }

  async function api(path, options) {
    options = options || {};
    options.headers = Object.assign({ 'X-Admin-Key': KEY }, options.headers || {});
    if (options.body) options.headers['Content-Type'] = 'application/json';
    var res = await fetch(path, options);
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Request failed');
    return data;
  }

  function renderPending(rows) {
    if (!rows.length) { pendingEl.innerHTML = '<p class="empty">Nothing waiting. Nice.</p>'; return; }
    var html = '<table><thead><tr><th>Name</th><th>Email</th><th>Requested</th><th></th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr>' +
        '<td>' + esc(r.name) + '</td>' +
        '<td class="email">' + esc(r.email) + '</td>' +
        '<td class="when">' + esc(when(r.created_at)) + '</td>' +
        '<td><button class="primary" data-approve="' + r.id + '">Approve</button>' +
        '<button class="danger" data-deny="' + r.id + '">Deny</button></td>' +
        '</tr>';
    });
    pendingEl.innerHTML = html + '</tbody></table>';
  }

  function renderList(rows) {
    if (!rows.length) { listEl.innerHTML = '<p class="empty">The whitelist is empty.</p>'; return; }
    var html = '<table><thead><tr><th>Name</th><th>Email</th><th>Added</th><th></th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr>' +
        '<td>' + esc(r.name || '—') + '</td>' +
        '<td class="email">' + esc(r.email) + '</td>' +
        '<td class="when">' + esc(when(r.added_at)) + '</td>' +
        '<td><button class="danger" data-remove="' + esc(r.email) + '">Remove</button></td>' +
        '</tr>';
    });
    listEl.innerHTML = html + '</tbody></table>';
  }

  async function load() {
    try {
      var data = await api('/admin/data');
      renderPending(data.pending || []);
      renderList(data.whitelist || []);
    } catch (err) {
      pendingEl.innerHTML = '<p class="empty">' + esc(err.message) + '</p>';
      listEl.innerHTML = '<p class="empty">Could not load.</p>';
    }
  }

  document.addEventListener('click', async function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'BUTTON') return;

    var id = t.getAttribute('data-approve') || t.getAttribute('data-deny');
    var email = t.getAttribute('data-remove');

    try {
      t.disabled = true;
      if (t.hasAttribute('data-approve')) {
        await api('/admin/approve', { method: 'POST', body: JSON.stringify({ id: Number(id) }) });
        toast('Approved — link emailed.');
      } else if (t.hasAttribute('data-deny')) {
        await api('/admin/deny', { method: 'POST', body: JSON.stringify({ id: Number(id) }) });
        toast('Request denied.');
      } else if (email) {
        if (!confirm('Remove ' + email + ' from the whitelist?')) { t.disabled = false; return; }
        await api('/admin/whitelist/remove', { method: 'POST', body: JSON.stringify({ email: email }) });
        toast('Removed.');
      }
      await load();
    } catch (err) {
      t.disabled = false;
      toast(err.message);
    }
  });

  document.getElementById('addForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = document.getElementById('addName').value.trim();
    var email = document.getElementById('addEmail').value.trim();
    if (!email) return;
    try {
      await api('/admin/whitelist', { method: 'POST', body: JSON.stringify({ name: name, email: email }) });
      document.getElementById('addName').value = '';
      document.getElementById('addEmail').value = '';
      toast('Added — link emailed.');
      await load();
    } catch (err) {
      toast(err.message);
    }
  });

  load();
})();
</script>
</body>
</html>`;
}
