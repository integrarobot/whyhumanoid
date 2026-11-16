// Paywall rules added on 16 Nov 2026 (Javier: paywall in production, no trial): customer portal, no free trial,
// one Stripe customer per account, and the access states a visitor, an unpaid user, a subscriber and an expired
// subscriber get.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T0, VALID_PRICE, sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';
import { checkStripePrice } from '../src/pricing.js';

const withPortal = (ctx) => {
  const calls = [];
  ctx.gateway.createPortalSession = async (args) => {
    calls.push(args);
    return { url: 'https://billing.stripe.com/p/session/fx_portal' };
  };
  return calls;
};

test('a trialing subscription gives no access: there is no free trial', async () => {
  const ctx = await setup();
  const { session, accountId } = await signIn(ctx);
  await sendWebhook(ctx, subscriptionEvent({ accountId, status: 'trialing' }));
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403);
  const me = await (await ctx.call('GET', '/v1/me', { token: session })).json();
  assert.equal(me.access.active, false);
  assert.equal(me.access.status, 'trialing');
});

test('a Stripe price with a trial period is refused', () => {
  const problems = checkStripePrice({ ...VALID_PRICE, recurring: { ...VALID_PRICE.recurring, trial_period_days: 14 } }, { mode: 'test' });
  assert.ok(problems.some((p) => /trial/.test(p)), problems.join('; '));
  assert.deepEqual(checkStripePrice(VALID_PRICE, { mode: 'test' }), []);
});

test('the customer portal needs a signed-in session and a Stripe customer, and works with checkout off', async () => {
  const ctx = await setup({ checkoutEnabled: false });
  const calls = withPortal(ctx);
  assert.equal((await ctx.call('POST', '/v1/billing/portal')).status, 401);
  const { session, accountId } = await signIn(ctx);
  const none = await ctx.call('POST', '/v1/billing/portal', { token: session });
  assert.equal(none.status, 409);
  assert.deepEqual(await none.json(), { error: 'no_billing_account' });
  assert.equal((await (await ctx.call('GET', '/v1/me', { token: session })).json()).billing_portal, false);
  await sendWebhook(ctx, subscriptionEvent({ accountId, customer: 'cus_portal' }));
  const res = await ctx.call('POST', '/v1/billing/portal', { token: session });
  assert.equal(res.status, 200);
  assert.match((await res.json()).url, /^https:\/\/billing\.stripe\.com\//);
  assert.equal(calls[0].customerId, 'cus_portal');
  assert.match(calls[0].returnUrl, /\?billing=returned$/);
  assert.equal((await (await ctx.call('GET', '/v1/me', { token: session })).json()).billing_portal, true);
});

test('the portal refuses an unconfigured or mismatched Stripe key', async () => {
  const unconfigured = await setup({ stripeKey: '' });
  withPortal(unconfigured);
  const a = await signIn(unconfigured);
  await sendWebhook(unconfigured, subscriptionEvent({ accountId: a.accountId, customer: 'cus_x' }));
  assert.equal((await unconfigured.call('POST', '/v1/billing/portal', { token: a.session })).status, 503);
  const mismatch = await setup({ stripeKey: 'rk_live_fixture', stripeMode: 'test' });
  withPortal(mismatch);
  const b = await signIn(mismatch);
  const res = await mismatch.call('POST', '/v1/billing/portal', { token: b.session });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'stripe_mode_mismatch' });
});

test('a returning customer checks out on the same Stripe customer, not a new one', async () => {
  const ctx = await setup({ checkoutEnabled: true });
  const { session, accountId } = await signIn(ctx);
  await sendWebhook(ctx, subscriptionEvent({ id: 'evt_old', accountId, customer: 'cus_back', status: 'canceled', periodEnd: T0 - 10 }));
  const res = await ctx.call('POST', '/v1/billing/checkout', { token: session });
  assert.equal(res.status, 200);
  assert.equal(ctx.checkoutCalls[0].customerId, 'cus_back');
});

test('access by state: visitor, unpaid user, subscriber, cancelled at period end, expired', async () => {
  const ctx = await setup();
  // Visitor: previews and the free catalogue only.
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments/preview')).status, 200);
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments')).status, 401);
  // Signed in, no payment.
  const { session, accountId } = await signIn(ctx, 'unpaid@example.com');
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403);
  // Subscriber.
  await sendWebhook(ctx, subscriptionEvent({ id: 'evt_a', created: T0, accountId, customer: 'cus_s', periodEnd: T0 + 20 * 24 * 3600 }));
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 200);
  // Cancelled at period end: access until the paid period ends.
  await sendWebhook(ctx, subscriptionEvent({ id: 'evt_b', created: T0 + 1, accountId, customer: 'cus_s', cancelAtPeriodEnd: true, periodEnd: T0 + 20 * 24 * 3600 }));
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 200);
  // Past the period end: expired, no access even before Stripe sends the deletion.
  ctx.setNow(T0 + 20 * 24 * 3600 + 1);
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403);
  // Payment failure on renewal (past_due) also closes access.
  ctx.setNow(T0 + 2);
  await sendWebhook(ctx, subscriptionEvent({ id: 'evt_c', created: T0 + 2, accountId, customer: 'cus_s', status: 'past_due', periodEnd: T0 + 20 * 24 * 3600 }));
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403);
});

test('a subscription waiting for payment is not doubled by a second checkout', async () => {
  const ctx = await setup({ checkoutEnabled: true });
  const { session, accountId } = await signIn(ctx);
  await sendWebhook(ctx, subscriptionEvent({ accountId, customer: 'cus_due', status: 'past_due', periodEnd: T0 + 10 * 24 * 3600 }));
  const res = await ctx.call('POST', '/v1/billing/checkout', { token: session });
  assert.equal(res.status, 409);
  assert.deepEqual(await res.json(), { error: 'payment_pending' });
  assert.equal(ctx.checkoutCalls.length, 0);
});

test('checkout never opens when a payment could not become access', async () => {
  // No webhook secret: Stripe could charge but access could never be granted.
  const a = await setup({ checkoutEnabled: true });
  a.gateway.webhookConfigured = false;
  const sa = await signIn(a);
  const ra = await a.call('POST', '/v1/billing/checkout', { token: sa.session });
  assert.equal(ra.status, 503);
  assert.deepEqual(await ra.json(), { error: 'webhook_not_configured' });
  assert.equal((await (await a.call('GET', '/v1/billing/plan')).json()).checkout_available, false);
  // No imported data: nothing to sell.
  const b = await setup({ checkoutEnabled: true });
  const sb = await signIn(b);
  await b.db.prepare("DELETE FROM premium_rows WHERE dataset = 'deployments'").run();
  const rb = await b.call('POST', '/v1/billing/checkout', { token: sb.session });
  assert.equal(rb.status, 503);
  assert.deepEqual(await rb.json(), { error: 'data_not_imported' });
  assert.equal(b.checkoutCalls.length + a.checkoutCalls.length, 0);
  // Everything in place: available.
  const c = await setup({ checkoutEnabled: true });
  assert.equal((await (await c.call('GET', '/v1/billing/plan')).json()).checkout_available, true);
});
