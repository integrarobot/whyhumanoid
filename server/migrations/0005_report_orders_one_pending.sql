-- At most one unpaid report order per account and service (Codex review, 25 Nov 2026): two tabs or a double click
-- can never create two payable Checkout Sessions. Additive: run after 0004 (already applied on TEST); report_orders
-- holds no customer data yet. An order leaves 'pending_payment' when it is paid, cancelled (its session expired) or
-- marked stale by the server after its session's fixed expiry (server/src/orders/orders.js).
CREATE UNIQUE INDEX IF NOT EXISTS report_orders_one_pending ON report_orders (account_id, service) WHERE status = 'pending_payment';
