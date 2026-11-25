-- x402 pay-per-query payments (server/src/x402/, 24 Nov 2026). Numbered 0006: additive, run after the report orders
-- migrations 0004 and 0005 (25 Nov 2026). One row per payment authorisation, keyed by its
-- deterministic identity (network, asset, payer and EIP-3009 nonce, hashed), so a re-encoded header is the same
-- payment. It makes settlement retry-safe and auditable:
--   settling  the answer is stored and settlement is in flight;
--   settled   settled on chain: the stored paid answer is replayed, unchanged, until replay_until (no second charge);
--   failed    definitively not settled (the query failed, or the facilitator refused settlement): nothing was charged;
--   unknown   settlement outcome not known (transport error, timeout, or a settling row that never finished): held for
--             reconciliation by an operator (GET/POST /v1/admin/x402/payments), never settled again automatically.
-- Holds no buyer identity beyond the paying address in the authorisation. The paid answer is kept only for the replay
-- window and then cleared by the scheduled clean-up.
CREATE TABLE IF NOT EXISTS x402_payments (
  payment_key TEXT PRIMARY KEY,                 -- sha256 of network|asset|payer|nonce (or of the header for other schemes)
  signature_hash TEXT NOT NULL,                 -- sha256 of the authorisation signature: a replay must present the same one
  request_key TEXT NOT NULL,                    -- sha256 of the normalised query the payment was for
  status TEXT NOT NULL CHECK (status IN ('settling', 'settled', 'failed', 'unknown')),
  network TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount_atomic TEXT NOT NULL,                  -- USDC atomic units (6 decimals) of the accepted requirements
  pay_to TEXT NOT NULL,
  payer TEXT,
  nonce TEXT,
  tx_hash TEXT,
  error TEXT,
  answer TEXT,                                  -- the paid answer (JSON), stored before settlement, cleared after replay_until
  replay_until INTEGER,
  stripe_payment_intent TEXT,                   -- PaymentIntent recording the settled transaction in Stripe, when enabled
  stripe_status TEXT CHECK (stripe_status IS NULL OR stripe_status IN ('recorded', 'failed', 'disabled')),
  resolved_by TEXT,                             -- 'operator' when an unknown outcome was reconciled by hand
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS x402_payments_tx ON x402_payments (network, tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS x402_payments_status ON x402_payments (status, updated_at);
