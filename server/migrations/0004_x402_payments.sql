-- x402 pay-per-query payments (server/src/x402/, 24 Nov 2026). One row per payment authorisation (the PAYMENT-SIGNATURE
-- header, hashed): it makes settlement retry-safe. A repeated authorisation for the same query gets the same answer
-- without a second settlement; for another query it is refused; while one request is settling it, others wait.
-- Holds no buyer identity beyond the paying address the facilitator reports, and no query results.
CREATE TABLE IF NOT EXISTS x402_payments (
  payment_key TEXT PRIMARY KEY,                 -- sha256 of the PAYMENT-SIGNATURE header
  request_key TEXT NOT NULL,                    -- sha256 of the normalised query the payment was for
  status TEXT NOT NULL CHECK (status IN ('settling', 'settled', 'failed')),
  network TEXT NOT NULL,
  amount_atomic TEXT NOT NULL,                  -- USDC atomic units (6 decimals) of the accepted requirements
  pay_to TEXT NOT NULL,
  payer TEXT,
  tx_hash TEXT,
  error TEXT,
  stripe_payment_intent TEXT,                   -- PaymentIntent recording the settled transaction in Stripe, when enabled
  stripe_status TEXT CHECK (stripe_status IS NULL OR stripe_status IN ('recorded', 'failed', 'disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS x402_payments_tx ON x402_payments (network, tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS x402_payments_stripe ON x402_payments (stripe_status) WHERE status = 'settled';
