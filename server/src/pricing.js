// The single paid plan for NEW subscriptions: US$100 per year, billed annually, no free trial (Javier, 24 Nov 2026: the
// currency changes from EUR to USD, not the interval). It unlocks complete Deployments and complete Components
// (server/src/access/matrix.js); every other category is free. Checkout is refused unless the Stripe price behind
// STRIPE_PRICE_ID matches this exactly. Subscriptions bought at the former EUR 100 per year price keep their contract,
// currency and renewal price: their price ids are listed in STRIPE_LEGACY_PRICE_IDS so the webhook keeps granting and
// ending their access (billing.js). They are never migrated, cancelled or charged by this code.

import { SUBSCRIPTION } from './access/matrix.js';

// Javier authorised reopening new data-subscription sales at US$100 per year on 24 Nov 2026, once the new format is
// published and verified and a matching live USD price exists. Until then this stays false and live checkout answers
// 503 'offer_in_review'; Stripe test mode, existing subscriptions, the webhook and the billing portal are unaffected.
export const LIVE_SALES_OPEN = false;

export const PLAN = Object.freeze({
  id: 'deployments-components-annual',
  name: SUBSCRIPTION.name,
  description: 'Complete Deployments and complete Components, with search and agent API keys over them. Every other category is free.',
  currency: 'usd',
  unitAmount: 10000,
  interval: 'year',
  intervalCount: 1,
  display: 'US$100 per year',
  billing: 'Billed annually. No free trial.',
});

// Returns a list of problems; an empty list means the Stripe price matches the plan.
export function checkStripePrice(price, { mode }) {
  const problems = [];
  if (!price) return ['price not found'];
  if (price.active !== true) problems.push('price is not active');
  if (price.type !== 'recurring') problems.push(`type is ${price.type}, expected recurring`);
  if (price.currency !== PLAN.currency) problems.push(`currency is ${price.currency}, expected ${PLAN.currency}`);
  if (price.unit_amount !== PLAN.unitAmount) problems.push(`unit_amount is ${price.unit_amount}, expected ${PLAN.unitAmount}`);
  if (price.recurring?.interval !== PLAN.interval) problems.push(`interval is ${price.recurring?.interval}, expected ${PLAN.interval}`);
  if ((price.recurring?.interval_count ?? 1) !== PLAN.intervalCount) problems.push(`interval_count is ${price.recurring?.interval_count}, expected 1`);
  if (price.recurring?.usage_type && price.recurring.usage_type !== 'licensed') problems.push('price is metered');
  if (price.livemode !== (mode === 'live')) problems.push(`price livemode is ${price.livemode}, key mode is ${mode}`);
  // No free trial (Javier, 16 Nov 2026).
  if (Number(price.recurring?.trial_period_days ?? 0) > 0) problems.push(`price has a ${price.recurring.trial_period_days}-day trial`);
  return problems;
}
