-- 5AM Bakery recipe access system
-- Apply with:
--   npx wrangler d1 execute fiveam-recipes --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS whitelist (
  email      TEXT PRIMARY KEY,
  name       TEXT,
  added_by   TEXT NOT NULL DEFAULT 'admin',
  added_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | denied | auto_approved
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_requests_status  ON requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_email   ON requests (email, created_at DESC);
