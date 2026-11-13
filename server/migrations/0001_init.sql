-- Why Humanoid? premium API, initial schema (SQLite / Cloudflare D1).
-- All timestamps are Unix seconds.

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  created_at INTEGER NOT NULL
);

-- One-time magic-link tokens. Only the SHA-256 hash is stored.
CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS login_tokens_email ON login_tokens (email, created_at);

-- Bearer credentials: browser sessions and agent API keys. Only hashes are stored.
CREATE TABLE IF NOT EXISTS credentials (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id),
  kind TEXT NOT NULL CHECK (kind IN ('session', 'api_key')),
  label TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  revoked_at INTEGER,
  last_used_at INTEGER
);
CREATE INDEX IF NOT EXISTS credentials_account ON credentials (account_id);

-- Access is granted only from this table, which only the verified webhook writes.
CREATE TABLE IF NOT EXISTS entitlements (
  account_id TEXT NOT NULL REFERENCES accounts (id),
  product TEXT NOT NULL,
  source TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL,
  current_period_end INTEGER NOT NULL,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  last_event_created INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, product)
);

-- Processed Stripe events, for idempotency.
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  processed_at INTEGER NOT NULL
);

-- Rows of all 13 workbook tabs, imported server-side from the private workbook. Only rows with
-- preview_rank <= 10 are public; the rest is served after an entitlement check.
CREATE TABLE IF NOT EXISTS premium_rows (
  dataset TEXT NOT NULL,
  row_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  sheet_row INTEGER NOT NULL,
  preview_rank INTEGER NOT NULL,
  data TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  PRIMARY KEY (dataset, row_id)
);
CREATE INDEX IF NOT EXISTS premium_rows_order ON premium_rows (dataset, position);
CREATE INDEX IF NOT EXISTS premium_rows_preview ON premium_rows (dataset, preview_rank);

-- Persistent ids for tabs without an id column, keyed on a natural identity (for Integrators: official
-- domain plus jurisdiction). Assigned once, never regenerated; every display name seen is kept as an alias.
CREATE TABLE IF NOT EXISTS identity_registry (
  namespace TEXT NOT NULL,
  natural_key TEXT NOT NULL,
  id TEXT NOT NULL UNIQUE,
  aliases TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  PRIMARY KEY (namespace, natural_key)
);

CREATE TABLE IF NOT EXISTS import_runs (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  status TEXT NOT NULL,
  counts TEXT,
  warnings TEXT,
  error TEXT
);
