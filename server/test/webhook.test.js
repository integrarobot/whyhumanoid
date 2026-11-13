import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T0, sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';

const count = async (db, sql, ...params) => Number((await db.prepare(sql).bind(...params).first()).n);

test('missing, wrong or tampered signatures are rejected without side effects', async () => {
  const ctx = await setup();
  const { accountId } = await signIn(ctx);
  const event = subscriptionEvent({ accountId });
  const unsigned = await ctx.call('POST', '/v1/stripe/webhook', { body: JSON.stringify(event) });
  assert.equal(unsigned.status, 400);
  assert.equal((await sendWebhook(ctx, event, { secret: 'whsec_wrong' })).status, 400);
  assert.equal((await sendWebhook(ctx, event, { tamper: true })).status, 400);
  assert.equal(await count(ctx.db, 'SELECT COUNT(*) AS n FROM entitlements'), 0);
  assert.equal(await count(ctx.db, 'SELECT COUNT(*) AS n FROM stripe_events'), 0);
});

test('a verified event is applied once; redelivery is idempotent', async () => {
  const ctx = await setup();
  const { accountId } = await signIn(ctx);
  const event = subscriptionEvent({ id: 'evt_once', accountId });
  const first = await (await sendWebhook(ctx, event)).json();
  assert.equal(first.outcome, 'entitlement_updated');
  const second = await (await sendWebhook(ctx, event)).json();
  assert.equal(second.duplicate, true);
  assert.equal(await count(ctx.db, 'SELECT COUNT(*) AS n FROM stripe_events WHERE id = ?', 'evt_once'), 1);
});

test('an older event delivered late cannot restore a cancelled subscription', async () => {
  const ctx = await setup();
  const { session, accountId } = await signIn(ctx);
  await sendWebhook(ctx, subscriptionEvent({ id: 'evt_new', created: T0 + 100, type: 'customer.subscription.deleted', status: 'canceled', accountId }));
  const late = await (await sendWebhook(ctx, subscriptionEvent({ id: 'evt_old', created: T0 + 50, accountId }))).json();
  assert.equal(late.outcome, 'ignored_stale');
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403);
});

test('only the configured test price grants access', async () => {
  const ctx = await setup();
  const { session, accountId } = await signIn(ctx);
  const res = await (await sendWebhook(ctx, subscriptionEvent({ accountId, priceId: 'price_other_product' }))).json();
  assert.equal(res.outcome, 'ignored_price');
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403);
});

test('live-mode events are ignored while live checkout is not allowed', async () => {
  const ctx = await setup();
  const { accountId } = await signIn(ctx);
  const res = await (await sendWebhook(ctx, subscriptionEvent({ accountId, livemode: true }))).json();
  assert.equal(res.outcome, 'ignored_mode_mismatch');
  assert.equal(await count(ctx.db, 'SELECT COUNT(*) AS n FROM entitlements'), 0);
});

test('checkout completion links the customer server-side; later events map by customer', async () => {
  const ctx = await setup();
  const { session, accountId } = await signIn(ctx);
  const completed = {
    id: 'evt_checkout',
    object: 'event',
    type: 'checkout.session.completed',
    created: T0,
    livemode: false,
    data: { object: { id: 'cs_test_1', mode: 'subscription', client_reference_id: accountId, customer: 'cus_mapped', subscription: 'sub_mapped' } },
  };
  assert.equal((await (await sendWebhook(ctx, completed)).json()).outcome, 'customer_linked');
  const update = subscriptionEvent({ id: 'evt_sub', created: T0 + 1, customer: 'cus_mapped', metadata: {} });
  assert.equal((await (await sendWebhook(ctx, update)).json()).outcome, 'entitlement_updated');
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 200);
});

test('a customer is never moved to another account', async () => {
  const ctx = await setup();
  const a = await signIn(ctx, 'a@example.com');
  const b = await signIn(ctx, 'b@example.com');
  await sendWebhook(ctx, subscriptionEvent({ id: 'evt_a', accountId: a.accountId, customer: 'cus_shared' }));
  const hijack = await (await sendWebhook(ctx, subscriptionEvent({ id: 'evt_b', accountId: b.accountId, customer: 'cus_shared', subscriptionId: 'sub_other' }))).json();
  assert.equal(hijack.outcome, 'customer_conflict');
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: b.session })).status, 403);
});

test('events that cannot be mapped to an account are acknowledged and grant nothing', async () => {
  const ctx = await setup();
  const res = await (await sendWebhook(ctx, subscriptionEvent({ accountId: 'acct_unknown', customer: 'cus_unknown' }))).json();
  assert.equal(res.outcome, 'unmapped');
  assert.equal(await count(ctx.db, 'SELECT COUNT(*) AS n FROM entitlements'), 0);
});
