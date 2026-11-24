import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_EUR_PRICE, T0, TEST_PRICE, VALID_PRICE, sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';
import { PLAN, checkStripePrice } from '../src/pricing.js';

test('the plan is one recurring price: USD 10000 minor units per year, billed annually, shown as US$100 per year', async () => {
  assert.equal(PLAN.currency, 'usd');
  assert.equal(PLAN.unitAmount, 10000);
  assert.equal(PLAN.interval, 'year');
  const ctx = await setup();
  const { plan, checkout_available: available } = await (await ctx.call('GET', '/v1/billing/plan')).json();
  assert.equal(plan.price, 'US$100 per year');
  assert.equal(plan.unit_amount, 10000);
  assert.equal(plan.currency, 'USD');
  assert.equal(plan.interval, 'year');
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

test('a Stripe price that differs from USD 10000 per year blocks checkout, including the former EUR price', async () => {
  const wrong = {
    amount: { unit_amount: 9900 },
    former_eur_price: { currency: 'eur' },
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

// Legacy EUR subscriptions (bought before 24 Nov 2026) keep their contract and their access: the webhook still applies
// their renewals, cancellations and deletions, while new checkouts only ever use the USD price.
test('a legacy EUR subscription keeps granting, renewing and ending access; an unknown price grants nothing', async () => {
  const DAY = 24 * 3600;
  const ctx = await setup({ checkoutEnabled: true });
  const { session, accountId } = await signIn(ctx, 'legacy@example.com');
  const legacy = (over) => subscriptionEvent({ accountId, priceId: LEGACY_EUR_PRICE, subscriptionId: 'sub_legacy', customer: 'cus_legacy', ...over });
  let res = await sendWebhook(ctx, legacy({ id: 'evt_l1', status: 'active', periodEnd: T0 + 365 * DAY }));
  assert.equal((await res.json()).outcome, 'entitlement_updated');
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 200, 'legacy EUR subscriber reads the full rows');
  // Renewal for another year at its own price.
  res = await sendWebhook(ctx, legacy({ id: 'evt_l2', created: T0 + 10, status: 'active', periodEnd: T0 + 730 * DAY }));
  assert.equal((await res.json()).outcome, 'entitlement_updated');
  // A second checkout is refused while the legacy subscription is active: no duplicate purchase.
  const again = await ctx.call('POST', '/v1/billing/checkout', { token: session });
  assert.equal(again.status, 409);
  assert.deepEqual(await again.json(), { error: 'already_subscribed' });
  assert.equal(ctx.checkoutCalls.length, 0);
  // Cancellation at period end keeps access until then; deletion ends it.
  await sendWebhook(ctx, legacy({ id: 'evt_l3', created: T0 + 20, status: 'active', cancelAtPeriodEnd: true, periodEnd: T0 + 730 * DAY }));
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 200);
  res = await sendWebhook(ctx, legacy({ id: 'evt_l4', type: 'customer.subscription.deleted', created: T0 + 30, status: 'canceled', periodEnd: T0 + 730 * DAY }));
  assert.equal((await res.json()).outcome, 'entitlement_updated');
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403);
  // A price that is neither the plan nor a legacy price grants nothing.
  const other = await signIn(ctx, 'other@example.com');
  res = await sendWebhook(ctx, subscriptionEvent({ accountId: other.accountId, id: 'evt_x', priceId: 'price_unrelated', subscriptionId: 'sub_x', customer: 'cus_x', status: 'active', periodEnd: T0 + 365 * DAY }));
  assert.equal((await res.json()).outcome, 'ignored_price');
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: other.session })).status, 403);
});

test('a new USD subscription: duplicate and late events change nothing; a failed payment closes access', async () => {
  const DAY = 24 * 3600;
  const ctx = await setup({ checkoutEnabled: true });
  const { session, accountId } = await signIn(ctx, 'new@example.com');
  const ev = (over) => subscriptionEvent({ accountId, priceId: TEST_PRICE, subscriptionId: 'sub_usd', customer: 'cus_usd', ...over });
  await sendWebhook(ctx, ev({ id: 'evt_u1', created: T0 + 10, status: 'active', periodEnd: T0 + 365 * DAY }));
  assert.equal((await ctx.call('GET', '/v1/datasets/hardware', { token: session })).status, 200);
  // The same event again (Stripe retries): recorded once.
  const dup = await (await sendWebhook(ctx, ev({ id: 'evt_u1', created: T0 + 10, status: 'active', periodEnd: T0 + 365 * DAY }))).json();
  assert.equal(dup.duplicate, true);
  // An older event delivered late (incomplete, created before the active one) does not undo access.
  const late = await (await sendWebhook(ctx, ev({ id: 'evt_u0', created: T0 + 1, status: 'incomplete', periodEnd: T0 + 365 * DAY }))).json();
  assert.equal(late.outcome, 'ignored_stale');
  assert.equal((await ctx.call('GET', '/v1/datasets/hardware', { token: session })).status, 200);
  // A failed renewal (unpaid) closes access.
  await sendWebhook(ctx, ev({ id: 'evt_u2', created: T0 + 20, status: 'unpaid', periodEnd: T0 + 365 * DAY }));
  assert.equal((await ctx.call('GET', '/v1/datasets/hardware', { token: session })).status, 403);
});

// The deployed configuration keeps EUR subscribers entitled: every environment lists its former EUR price as legacy,
// so switching STRIPE_PRICE_ID to the USD price never orphans their renewals, cancellations or deletions.
test('wrangler.toml lists the EUR price of each environment as a legacy entitled price', async () => {
  const { readFileSync } = await import('node:fs');
  const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  for (const env of ['test', 'production']) {
    const block = toml.split(`[env.${env}.vars]`)[1].split(/\n\[/)[0];
    const legacy = (block.match(/STRIPE_LEGACY_PRICE_IDS = "([^"]*)"/) ?? [])[1] ?? '';
    assert.ok(legacy.split(',').filter(Boolean).length >= 1, `${env}: legacy EUR price listed`);
    assert.match(block, /EUR 100\.00 \/ year/, `${env}: the EUR price is documented`);
    const current = (block.match(/STRIPE_PRICE_ID = "([^"]*)"/) ?? [])[1];
    assert.ok(current && !legacy.split(',').includes(current), `${env}: new checkouts use a price that is not a legacy one`);
    assert.match(block, /STRIPE_PRICE_ID = "[^"]+"\s+# [^\n]*USD 100\.00 \/ year, no trial/, `${env}: the current price is the USD plan`);
  }
});
