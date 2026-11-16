// End-to-end subscription lifecycle in Stripe test mode, with Stripe-shaped signed events:
// checkout -> incomplete -> active -> renewal -> cancel at period end -> expiry -> deletion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T0, sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';

const YEAR = 365 * 24 * 3600;

test('test-mode purchase and access lifecycle', async () => {
  const ctx = await setup({ checkoutEnabled: true });
  let { session, accountId } = await signIn(ctx, 'lifecycle@example.com');
  const signInAgain = async () => { ({ session } = await signIn(ctx, 'lifecycle@example.com')); };
  const full = () => ctx.call('GET', '/v1/datasets/humanoids?limit=500', { token: session });
  const step = async (overrides) => (await (await sendWebhook(ctx, subscriptionEvent({ accountId, customer: 'cus_life', subscriptionId: 'sub_life', ...overrides }))).json()).outcome;

  // 1. Preview only before paying.
  assert.equal((await ctx.call('GET', '/v1/datasets/humanoids/preview')).status, 200);
  assert.equal((await full()).status, 403);

  // 2. Checkout session created after the price check; the redirect back grants nothing.
  assert.equal((await ctx.call('POST', '/v1/billing/checkout', { token: session })).status, 200);
  assert.equal((await full()).status, 403);

  // 3. Stripe completes checkout: customer linked, subscription incomplete until the invoice is paid.
  const completed = {
    id: 'evt_life_checkout',
    object: 'event',
    type: 'checkout.session.completed',
    created: T0,
    livemode: false,
    data: { object: { id: 'cs_test_life', mode: 'subscription', client_reference_id: accountId, customer: 'cus_life', subscription: 'sub_life' } },
  };
  assert.equal((await (await sendWebhook(ctx, completed)).json()).outcome, 'customer_linked');
  assert.equal(await step({ id: 'evt_life_1', type: 'customer.subscription.created', created: T0 + 1, status: 'incomplete', periodEnd: T0 + YEAR }), 'entitlement_updated');
  assert.equal((await full()).status, 403);

  // 4. Invoice paid: active for one year. Full data, all 12 rows.
  assert.equal(await step({ id: 'evt_life_2', created: T0 + 2, status: 'active', periodEnd: T0 + YEAR }), 'entitlement_updated');
  const body = await (await full()).json();
  assert.equal(body.total, 12);

  // 5. Renewal a year later extends the period.
  ctx.setNow(T0 + YEAR - 60);
  await signInAgain();
  assert.equal(await step({ id: 'evt_life_3', created: T0 + YEAR - 30, status: 'active', periodEnd: T0 + 2 * YEAR }), 'entitlement_updated');
  ctx.setNow(T0 + YEAR + 60);
  await signInAgain(); // sessions last 30 days
  assert.equal((await full()).status, 200);

  // 6. Customer cancels at period end: access continues until the paid year ends.
  assert.equal(await step({ id: 'evt_life_4', created: T0 + YEAR + 100, status: 'active', cancelAtPeriodEnd: true, periodEnd: T0 + 2 * YEAR }), 'entitlement_updated');
  assert.equal((await full()).status, 200);

  // 7. The year ends: no access even before Stripe's deletion event arrives.
  ctx.setNow(T0 + 2 * YEAR + 1);
  await signInAgain();
  assert.equal((await full()).status, 403);

  // 8. Deletion event, redelivered once: still no access, processed once.
  const deleted = { id: 'evt_life_5', type: 'customer.subscription.deleted', created: T0 + 2 * YEAR + 5, status: 'canceled', periodEnd: T0 + 2 * YEAR };
  assert.equal(await step(deleted), 'entitlement_updated');
  const again = await (await sendWebhook(ctx, subscriptionEvent({ accountId, customer: 'cus_life', subscriptionId: 'sub_life', ...deleted }))).json();
  assert.equal(again.duplicate, true);
  assert.equal((await full()).status, 403);
  assert.equal((await ctx.call('GET', '/v1/datasets/humanoids/preview')).status, 200, 'preview stays public');
});
