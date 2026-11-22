import { escapeHtml } from '../lib/email.js';

/** The private recipe page, shown only with a valid signed link. */
export function recipePage({ email, name }) {
  const first = (name || '').trim().split(/\s+/)[0] || 'friend';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>5AM Bakery — Signature Sourdough</title>
<style>
  :root { --ink:#2b2118; --paper:#f6f2ea; --card:#fffdf9; --line:#e8dfd0; --muted:#8d7c69; }
  * { box-sizing:border-box; }
  body { margin:0; padding:32px 20px 72px; background:var(--paper); color:var(--ink);
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
         line-height:1.65; }
  .wrap { max-width:660px; margin:0 auto; }
  .eyebrow { margin:0 0 6px; font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:#a8896a; }
  h1 { margin:0 0 6px; font-size:30px; line-height:1.2; }
  .sub { margin:0 0 26px; color:var(--muted); font-size:14px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:28px; margin-bottom:20px; }
  h2 { margin:0 0 12px; font-size:16px; letter-spacing:.02em; }
  ul, ol { margin:0; padding-left:20px; }
  li { margin-bottom:8px; }
  .meta { display:flex; flex-wrap:wrap; gap:10px; margin:0 0 22px; }
  .pill { font-size:12px; padding:6px 12px; border-radius:999px; background:#efe7d9; color:#6b5a48; }
  .note { font-size:13px; color:var(--muted); }
  .private { margin-top:26px; padding-top:16px; border-top:1px dashed var(--line); font-size:12px; color:#9b8b78; }
  @media print { body { background:#fff; padding:0; } .card { border:0; padding:0 0 12px; } .private { display:none; } }
</style>
</head>
<body>
  <div class="wrap">
    <p class="eyebrow">5AM Bakery · private</p>
    <h1>Signature Sourdough</h1>
    <p class="sub">Hello ${escapeHtml(first)} — this page is yours. Please keep the link to yourself.</p>

    <div class="meta">
      <span class="pill">2 loaves</span>
      <span class="pill">24 h starter · 12 h proof</span>
      <span class="pill">Bake 250 °C</span>
    </div>

    <div class="card">
      <h2>What you need</h2>
      <ul>
        <li>500 g strong white bread flour</li>
        <li>350 g water at 24 °C (70 % hydration)</li>
        <li>100 g active starter, fed 6–8 hours earlier</li>
        <li>10 g fine sea salt</li>
        <li>Rice flour and a linen couche, or a banneton</li>
      </ul>
    </div>

    <div class="card">
      <h2>Method</h2>
      <ol>
        <li><strong>Autolyse.</strong> Mix flour and water until no dry patches remain. Rest covered for 45 minutes.</li>
        <li><strong>Add starter and salt.</strong> Squeeze through the dough until fully incorporated. The dough will slacken — that is normal.</li>
        <li><strong>Bulk, 4–5 hours at 24 °C.</strong> Four sets of stretch-and-folds, 30 minutes apart, in the first two hours. Then leave it alone until it is jiggly, domed and about 60 % larger.</li>
        <li><strong>Shape.</strong> Turn out on a lightly floured bench, pre-shape into a loose round, rest 20 minutes, then shape tight and place seam-up in a floured banneton.</li>
        <li><strong>Cold proof.</strong> Cover and refrigerate 8–14 hours. This is where the flavour comes from.</li>
        <li><strong>Bake.</strong> Preheat a Dutch oven at 250 °C for 45 minutes. Score the cold loaf, bake covered 20 minutes, then uncovered 22–25 minutes until deep mahogany.</li>
        <li><strong>Rest.</strong> At least one hour on a wire rack before you cut. We know. Wait anyway.</li>
      </ol>
    </div>

    <div class="card">
      <h2>Bakery notes</h2>
      <p class="note">If your kitchen runs cold, extend the bulk by an hour rather than warming the dough. Judge the dough, not the clock. A loaf that springs back slowly and leaves a slight indent is ready; one that bounces back hard needs longer.</p>
    </div>

    <p class="private">Issued to ${escapeHtml(email)}. Do not share this link — it identifies you.</p>
  </div>
</body>
</html>`;
}

/** Shown when a link is invalid, tampered with, or expired. */
export function linkProblemPage(message) {
  const text = message || 'This link is invalid or has expired.';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>5AM Bakery — link problem</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:28px;
         background:#f6f2ea; color:#2b2118;
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .card { max-width:420px; background:#fffdf9; border:1px solid #e8dfd0; border-radius:16px; padding:32px; text-align:center; }
  h1 { margin:0 0 10px; font-size:20px; }
  p { margin:0; font-size:14px; line-height:1.6; color:#8d7c69; }
</style>
</head>
<body>
  <div class="card">
    <h1>That link will not open</h1>
    <p>${escapeHtml(text)}</p>
    <p style="margin-top:14px;">Request a fresh one from the bakery and we will send it over.</p>
  </div>
</body>
</html>`;
}
