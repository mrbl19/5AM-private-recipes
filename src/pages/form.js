/**
 * Standalone request form served by the Worker at "/".
 * Use this to test, or drop the snippet in public/form-snippet.html
 * into your GitHub Pages site instead.
 */
export function formPage(env) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>5AM Bakery — Recipe access</title>
<style>
  :root { --ink:#2b2118; --paper:#f6f2ea; --card:#fffdf9; --line:#e8dfd0; --muted:#8d7c69; }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:28px;
         background:var(--paper); color:var(--ink);
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .card { width:100%; max-width:440px; background:var(--card); border:1px solid var(--line);
          border-radius:16px; padding:32px; box-shadow:0 10px 30px rgba(43,33,24,.06); }
  .eyebrow { margin:0 0 6px; font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:#a8896a; }
  h1 { margin:0 0 8px; font-size:24px; line-height:1.25; }
  p.lede { margin:0 0 24px; font-size:14px; line-height:1.6; color:var(--muted); }
  label { display:block; margin:0 0 6px; font-size:13px; font-weight:600; }
  input { width:100%; padding:12px 14px; margin-bottom:16px; font-size:15px; color:var(--ink);
          background:#fff; border:1px solid var(--line); border-radius:9px; }
  input:focus { outline:none; border-color:#b99a76; box-shadow:0 0 0 3px rgba(185,154,118,.18); }
  button { width:100%; padding:13px 18px; font-size:15px; font-weight:600; color:#fffdf9;
           background:var(--ink); border:0; border-radius:9px; cursor:pointer; }
  button:disabled { opacity:.6; cursor:default; }
  .msg { margin:16px 0 0; padding:12px 14px; font-size:14px; line-height:1.5; border-radius:9px; display:none; }
  .msg.ok { display:block; background:#eef6ee; color:#2f5d34; }
  .msg.err { display:block; background:#fbeeee; color:#8a2f2f; }
</style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">5AM Bakery</p>
    <h1>Request the recipe</h1>
    <p class="lede">Leave your name and email. If you are on the list the recipe link arrives right away — otherwise we will approve you by hand.</p>

    <form id="f" novalidate>
      <label for="name">Name</label>
      <input id="name" name="name" type="text" autocomplete="name" required maxlength="80" placeholder="Maribel Delatorre">

      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="email" required placeholder="you@example.com">

      <button id="submit" type="submit">Send me the recipe</button>
      <p class="msg" id="msg" role="status" aria-live="polite"></p>
    </form>
  </main>

<script>
(function () {
  var form = document.getElementById('f');
  var msg = document.getElementById('msg');
  var btn = document.getElementById('submit');

  function show(kind, text) {
    msg.className = 'msg ' + kind;
    msg.textContent = text;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = document.getElementById('name').value.trim();
    var email = document.getElementById('email').value.trim();

    if (!name || !email) { show('err', 'Please fill in both fields.'); return; }

    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      var res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email })
      });
      var data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong.');
      show('ok', data.message);
      form.reset();
    } catch (err) {
      show('err', err.message || 'Something went wrong. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send me the recipe';
    }
  });
})();
</script>
</body>
</html>`;
}
