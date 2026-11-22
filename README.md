# 5AM Bakery — recipe access system

A Cloudflare Worker that gates a private recipe page behind an email whitelist.

- Guest submits **name + email** → you get an email notification every time.
- Email **on the whitelist** → the guest instantly receives a signed link to the recipe.
- Email **not on the whitelist** → the request is stored; you approve or deny it in the admin panel. Approving adds them to the whitelist and emails them the link.
- Links are HMAC-signed and expire (default 7 days). Removing someone from the whitelist kills their existing links too.

Stack: **Cloudflare Workers** (routing + pages) · **D1** (whitelist + requests) · **Resend** (email).

---

## 1. Install

```bash
npm install
npx wrangler login
```

## 2. Create the database

```bash
npx wrangler d1 create fiveam-recipes
```

Copy the `database_id` it prints into `wrangler.jsonc`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

Then create the tables:

```bash
npx wrangler d1 execute fiveam-recipes --remote --file=schema.sql
```

## 3. Get a Resend API key

1. Sign up at <https://resend.com> (free tier: 100 emails/day).
2. **Domains → Add domain**, add the domain you want to send from, and add the DNS records it gives you.
   - Your DNS is at Squarespace, so add those records in the Squarespace DNS panel.
   - Testing without a domain? Resend lets you send from `onboarding@resend.dev`, but only to the email address on your own Resend account.
3. **API Keys → Create API Key** (sending permission only). Copy it.

## 4. Set the secrets

```bash
# your Resend key
npx wrangler secret put EMAIL_API_KEY

# signs the recipe links — generate with: openssl rand -hex 32
npx wrangler secret put SIGNING_SECRET

# password for /admin — generate with: openssl rand -hex 32
npx wrangler secret put ADMIN_KEY
```

## 5. Set the plain config

Edit the `vars` block in `wrangler.jsonc`:

| Var | What it is |
| --- | --- |
| `FROM_EMAIL` | Sender, e.g. `5AM Bakery <recipes@yourdomain.com>` — the domain must be verified in Resend |
| `OWNER_EMAIL` | Where your notifications go |
| `ALLOWED_ORIGIN` | Your GitHub Pages origin, e.g. `https://yourname.github.io`. Use `*` while testing |
| `TOKEN_TTL_DAYS` | How long a recipe link stays valid (default `7`) |

## 6. Deploy

```bash
npx wrangler deploy
```

Wrangler prints your URL, e.g. `https://fiveam-recipes.your-subdomain.workers.dev`.

## 7. Try it

- **Form:** `https://…workers.dev/`
- **Admin:** `https://…workers.dev/admin?key=YOUR_ADMIN_KEY` — bookmark this, it is the only way in.

Submit your own email, then approve yourself in the admin panel to confirm email delivery works.

## 8. Wire up your GitHub Pages site

Open `public/form-snippet.html`, change `WORKER_URL` to your Worker address, and paste the whole block into your GitHub Pages HTML where the form should appear.

---

## Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | Standalone request form |
| `/api/request` | POST | `{ name, email }` → whitelist check, notification, link email |
| `/r?token=…` | GET | Private recipe page (signed link) |
| `/admin?key=…` | GET | Admin panel |
| `/admin/data` | GET | Pending requests + whitelist (JSON) |
| `/admin/approve` | POST | `{ id }` → whitelist + email link |
| `/admin/deny` | POST | `{ id }` |
| `/admin/whitelist` | POST | `{ email, name }` → add + email link |
| `/admin/whitelist/remove` | POST | `{ email }` |
| `/health` | GET | Liveness check |

Admin routes require the `X-Admin-Key` header or `?key=` query parameter.

## Custom domain

Your DNS lives at Squarespace. Two options:

- **Keep it simple:** leave the Worker on its `*.workers.dev` address. Nothing else to do.
- **Use `recipes.5ambakery.com`:** in the Cloudflare dashboard open the Worker → **Settings → Domains & Routes → Add → Custom domain**, enter the hostname, then add the `CNAME` record it shows you in the Squarespace DNS panel. Wait for the certificate to issue.

## Local development

```bash
cp .dev.vars.example .dev.vars   # fill in the three secrets
npx wrangler d1 execute fiveam-recipes --local --file=schema.sql
npm run dev
```

## Notes

- Rate limit: 3 submissions per email address per 10 minutes.
- Every submission is logged in the `requests` table, so you have a history of who asked and what you decided.
- The recipe content lives in `src/pages/recipe.js` — edit the HTML there.
