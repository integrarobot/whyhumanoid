// The single paid plan, as decided by Javier on 2026-11-13: full database, EUR 100 per year.
// Checkout is refused unless the Stripe price behind STRIPE_PRICE_ID matches this exactly.

export const PLAN = Object.freeze({
  id: 'full-database',
  name: 'Why Humanoid? full database',
  description: 'All 13 datasets in full, full search and agent API keys.',
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
  return problems;
}
