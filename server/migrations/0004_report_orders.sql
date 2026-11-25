-- Custom report orders (25 Nov 2026): one row per order, created before checkout and bound to one account and one
-- service. Answers live here only (never in static files, search, logs or Git). submitted_at and due_at are written
-- once, by the atomic submit; nothing later changes them.
CREATE TABLE IF NOT EXISTS report_orders (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id),
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_payment', 'awaiting_questionnaire', 'awaiting_report', 'in_progress', 'delivered', 'cancelled', 'payment_failed')),
  mode TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  price_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  checkout_session_id TEXT UNIQUE,
  checkout_url TEXT,
  payment_intent_id TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  cancelled_at INTEGER,
  draft_json TEXT,
  draft_saved_at INTEGER,
  form_version TEXT,
  submitted_json TEXT,
  submitted_at INTEGER,
  due_at INTEGER,
  operator_note TEXT,
  started_at INTEGER,
  delivered_at INTEGER,
  delivery_note TEXT,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS report_orders_account ON report_orders (account_id, created_at);
CREATE INDEX IF NOT EXISTS report_orders_status ON report_orders (status, due_at);

-- Durable outbox: every email about an order is written here in the same step that changes the order, then sent;
-- failures are retried with backoff by the scheduled handler and from the operator queue.
CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  kind TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  UNIQUE (order_id, kind)
);
CREATE INDEX IF NOT EXISTS notification_outbox_due ON notification_outbox (status, next_attempt_at);

-- Fair-use counters for agent API keys and MCP: requests per credential per minute and per day.
CREATE TABLE IF NOT EXISTS usage_counters (
  credential TEXT NOT NULL,
  window TEXT NOT NULL,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (credential, window)
);
