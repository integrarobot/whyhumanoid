// Access to premium data is decided here and nowhere else.
// A subscription grants access only while Stripe reports it active or trialing
// AND its paid period has not ended. Cancelled-at-period-end keeps access until that date.

export const PRODUCT = 'premium';
const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export async function getEntitlement(db, accountId, product = PRODUCT) {
  return db
    .prepare(
      `SELECT status, current_period_end, cancel_at_period_end, stripe_subscription_id
         FROM entitlements WHERE account_id = ? AND product = ?`,
    )
    .bind(accountId, product)
    .first();
}

export function hasAccess(entitlement, now) {
  return Boolean(
    entitlement && ACTIVE_STATUSES.has(entitlement.status) && Number(entitlement.current_period_end) > now,
  );
}

export function describeAccess(entitlement, now) {
  if (!entitlement) return { active: false, status: 'none' };
  return {
    active: hasAccess(entitlement, now),
    status: entitlement.status,
    current_period_end: Number(entitlement.current_period_end),
    cancel_at_period_end: Boolean(Number(entitlement.cancel_at_period_end)),
  };
}

// Upsert guarded by event time so an older Stripe event can never overwrite a newer state.
export async function upsertStripeEntitlement(db, row) {
  const result = await db
    .prepare(
      `INSERT INTO entitlements
         (account_id, product, source, stripe_subscription_id, status, current_period_end,
          cancel_at_period_end, last_event_created, updated_at)
       VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?)
       ON CONFLICT (account_id, product) DO UPDATE SET
         stripe_subscription_id = excluded.stripe_subscription_id,
         status = excluded.status,
         current_period_end = excluded.current_period_end,
         cancel_at_period_end = excluded.cancel_at_period_end,
         last_event_created = excluded.last_event_created,
         updated_at = excluded.updated_at
       WHERE excluded.last_event_created >= entitlements.last_event_created`,
    )
    .bind(
      row.accountId,
      row.product ?? PRODUCT,
      row.subscriptionId,
      row.status,
      row.currentPeriodEnd,
      row.cancelAtPeriodEnd ? 1 : 0,
      row.eventCreated,
      row.now,
    )
    .run();
  return Boolean(result?.meta?.changes);
}
