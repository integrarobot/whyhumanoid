import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEST_PRICE, VALID_PRICE, sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';
import { PLAN, checkStripePrice } from '../src/pricing.js';

test('the plan is one recurring price: EUR 10000 minor units per year, shown as €100 per year', async () => {
  assert.equal(PLAN.currency, 'eur');
  assert.equal(PLAN.unitAmount, 10000);
  assert.equal(PLAN.interval, 'year');
  const ctx = await setup();
  const { plan, checkout_available: available } = await (await ctx.call('GET', '/v1/billing/plan')).json();
  assert.equal(plan.price, '€100 per year');
  assert.equal(plan.unit_amount, 10000);
  assert.equal(plan.currency, 'EUR');
  assert.equal(available, false);
});

test('checkout is disabled by default and never reaches Stripe', async () => {
  const ctx = await setup();
  const { session } = await signIn(ctx);
  const res = await ctx.call('POST', '/v1/billing/checkout', { token: session });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'checkout_disabled' });
  assert.equal(ctx.checkoutCalls.length + ctx.priceLookups.length, 0);
});

test('in test mode, checkout verifies the Stripe price first and maps the account server-side', async () => {
  const ctx = await setup({ checkoutEnabled: true });
  const { session, accountId } = await signIn(ctx);
  const res = await ctx.call('POST', '/v1/billing/checkout', { token: session });
  assert.equal(res.status, 200);
  assert.match((await res.json()).url, /^https:\/\/checkout\.stripe\.com\//);
  assert.deepEqual(ctx.priceLookups, [TEST_PRICE]);
  assert.equal(ctx.checkoutCalls[0].priceId, TEST_PRICE);
  assert.equal(ctx.checkoutCalls[0].accountId, accountId);
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403, 'redirect grants nothing');
});

test('a Stripe price that differs from EUR 10000 per year blocks checkout', async () => {
  const wrong = {
    amount: { unit_amount: 9900 },
    currency: { currency: 'usd' },
    monthly: { recurring: { interval: 'month', interval_count: 1 } },
    biennial: { recurring: { interval: 'year', interval_count: 2 } },
    one_time: { type: 'one_time', recurring: null },
    inactive: { active: false },
    live_price_on_test_key: { livemode: true },
  };
  for (const [label, patch] of Object.entries(wrong)) {
    const ctx = await setup({ checkoutEnabled: true, price: { ...VALID_PRICE, ...patch } });
    const { session } = await signIn(ctx);
    const res = await ctx.call('POST', '/v1/billing/checkout', { token: session });
    assert.deepEqual(await res.json(), { error: 'price_mismatch' }, label);
    assert.equal(ctx.checkoutCalls.length, 0, label);
  }
  const missing = await setup({ checkoutEnabled: true, price: null });
  const { session } = await signIn(missing);
  assert.deepEqual(await (await missing.call('POST', '/v1/billing/checkout', { token: session })).json(), { error: 'price_mismatch' });
  assert.deepEqual(checkStripePrice(VALID_PRICE, { mode: 'test' }), []);
});

test('test and live credentials never mix', async () => {
  const liveKeyInTestEnv = await setup({ checkoutEnabled: true, stripeKey: 'sk_live_fixture' });
  const a = await signIn(liveKeyInTestEnv);
  assert.deepEqual(await (await liveKeyInTestEnv.call('POST', '/v1/billing/checkout', { token: a.session })).json(), { error: 'stripe_mode_mismatch' });
  const testKeyInLiveEnv = await setup({ checkoutEnabled: true, stripeMode: 'live' });
  const b = await signIn(testKeyInLiveEnv);
  assert.deepEqual(await (await testKeyInLiveEnv.call('POST', '/v1/billing/checkout', { token: b.session })).json(), { error: 'stripe_mode_mismatch' });
  const liveNotAllowed = await setup({ checkoutEnabled: true, stripeMode: 'live', stripeKey: 'sk_live_fixture' });
  const c = await signIn(liveNotAllowed);
  assert.deepEqual(await (await liveNotAllowed.call('POST', '/v1/billing/checkout', { token: c.session })).json(), { error: 'live_checkout_disabled' });
  // A test-mode event never grants access in a live environment, and vice versa.
  const liveEnv = await setup({ stripeMode: 'live', stripeKey: 'sk_live_fixture', allowLiveCheckout: true });
  const d = await signIn(liveEnv);
  const outcome = (await (await sendWebhook(liveEnv, subscriptionEvent({ accountId: d.accountId, livemode: false }))).json()).outcome;
  assert.equal(outcome, 'ignored_mode_mismatch');
});

test('checkout without a configured price is refused', async () => {
  const ctx = await setup({ checkoutEnabled: true, priceId: null });
  const { session } = await signIn(ctx);
  assert.deepEqual(await (await ctx.call('POST', '/v1/billing/checkout', { token: session })).json(), { error: 'checkout_not_configured' });
});

test('checkout requires a browser session and no current subscription', async () => {
  const ctx = await setup({ checkoutEnabled: true });
  assert.equal((await ctx.call('POST', '/v1/billing/checkout')).status, 401);
  const { session, accountId } = await signIn(ctx);
  await sendWebhook(ctx, subscriptionEvent({ accountId }));
  assert.equal((await ctx.call('POST', '/v1/billing/checkout', { token: session })).status, 409);
  const key = (await (await ctx.call('POST', '/v1/api-keys', { token: session, body: {} })).json()).api_key;
  assert.equal((await ctx.call('POST', '/v1/billing/checkout', { token: key })).status, 403);
});
