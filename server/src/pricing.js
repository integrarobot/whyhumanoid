// The single paid plan: EUR 100 per year (price decided 13 Nov 2026). Since 23 Nov 2026 it unlocks complete
// Deployments and complete Components (server/src/access/matrix.js); every other category is free.
// Checkout is refused unless the Stripe price behind STRIPE_PRICE_ID matches this exactly. The Stripe product keeps
// its own name until Javier renames it in the Stripe dashboard; this name is what the site and the API show.

import { SUBSCRIPTION } from './access/matrix.js';

export const PLAN = Object.freeze({
  id: 'deployments-components-annual',
  name: SUBSCRIPTION.name,
  description: 'Complete Deployments and complete Components, with search and agent API keys over them. Every other category is free.',
  currency: 'eur',
  unitAmount: 10000,
  interval: 'year',
  intervalCount: 1,
  display: '€100 per year',
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
