import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T0, sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';

const DAY = 24 * 3600;

async function grant(ctx, accountId, overrides = {}) {
  const res = await sendWebhook(ctx, subscriptionEvent({ accountId, ...overrides }));
  assert.equal(res.status, 200);
  return res.json();
}

test('dataset list is public and contains no rows', async () => {
  const ctx = await setup();
  const res = await ctx.call('GET', '/v1/datasets');
  assert.equal(res.status, 200);
  const { datasets } = await res.json();
  assert.equal(datasets.length, 17); // 13 tabs, the two Robotics Evaluation Atlas tabs, Dataset Metrics and Components' related software (23 Nov 2026)
  assert.deepEqual(datasets.slice(0, 3).map((d) => d.id), ['humanoids', 'deployments', 'integrators']);
  assert.ok(datasets.every((d) => !('rows' in d)));
  assert.equal(datasets[0].access.preview_rows, 'all', 'the Humanoids catalogue is free in full');
  // Access matrix of 23 Nov 2026: Deployments and Components (Hardware tab) for subscribers, with their supporting
  // tabs; every other category free in every row; tabs outside the nine categories unchanged (10-row preview).
  const SUBSCRIPTION = ['deployments', 'hardware', 'component-software', 'evidence-links', 'entities', 'container-handling', 'data-space'];
  for (const d of datasets) {
    assert.equal(d.access.preview_rows, SUBSCRIPTION.includes(d.id) ? 10 : 'all', d.id);
    assert.equal(d.access.full, SUBSCRIPTION.includes(d.id) ? 'subscription' : 'public', d.id);
    assert.equal(d.access.public_fields, null, `${d.id}: no partial-field rule left`);
  }
  assert.equal(datasets.find((d) => d.id === 'hardware').category, 'components');
  assert.equal(datasets.find((d) => d.id === 'component-software').category, 'components');
  assert.equal(datasets.find((d) => d.id === 'stocks').category, 'investment');
  assert.equal(datasets.find((d) => d.id === 'benchmarks').category, 'benchmarks');
  assert.equal(datasets.find((d) => d.id === 'benchmark-results').category, 'benchmarks');
  assert.equal(datasets.find((d) => d.id === 'datasets').category, 'datasets');
  assert.equal(datasets.find((d) => d.id === 'dataset-metrics').category, 'datasets');
  assert.equal(datasets.find((d) => d.id === 'task-evaluations').category, null, 'internal operational assessment since 23 Nov 2026');
  assert.equal(datasets.find((d) => d.id === 'data-space').offer, false);
});

test('no session: subscription rows are refused with 401; free categories are read with public values', async () => {
  const ctx = await setup();
  for (const id of ['deployments', 'hardware', 'evidence-links', 'entities']) {
    const res = await ctx.call('GET', `/v1/datasets/${id}`);
    assert.equal(res.status, 401, id);
    assert.deepEqual(await res.json(), { error: 'authentication_required' });
  }
  for (const id of ['humanoids', 'integrators', 'software', 'datasets', 'task-evaluations', 'stocks', 'other-robots']) {
    const res = await ctx.call('GET', `/v1/datasets/${id}`);
    assert.equal(res.status, 200, id);
    assert.match(res.headers.get('cache-control'), /^public/, `${id}: a visitor answer is cacheable, never personal`);
    const body = await res.json();
    assert.equal(body.access, 'free');
    assert.equal(body.rows.length, body.total, `${id}: every row`);
  }
  const forged = await ctx.call('GET', '/v1/datasets/deployments', { token: 'whs_not_a_real_session' });
  assert.equal(forged.status, 401);
});

test('session without entitlement: 403 and no rows', async () => {
  const ctx = await setup();
  const { session } = await signIn(ctx);
  const res = await ctx.call('GET', '/v1/datasets/deployments', { token: session });
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: 'subscription_required' });
  const me = await (await ctx.call('GET', '/v1/me', { token: session })).json();
  assert.equal(me.access.active, false);
});

test('active entitlement: rows are served privately and uncached', async () => {
  const ctx = await setup();
  const { session, accountId } = await signIn(ctx);
  await grant(ctx, accountId);
  const res = await ctx.call('GET', '/v1/datasets/deployments?limit=2', { token: session });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /private/);
  assert.match(res.headers.get('cache-control'), /no-store/);
  const body = await res.json();
  assert.equal(body.total, 12);
  assert.equal(body.rows.length, 2);
  assert.equal(body.rows[0].id, 'fx_record_id_1');
  const integrators = await (await ctx.call('GET', '/v1/datasets/integrators', { token: session })).json();
  assert.equal(integrators.total, 12);
  const humanoids = await (await ctx.call('GET', '/v1/datasets/humanoids?limit=500', { token: session })).json();
  assert.equal(humanoids.total, 12);
});

test('cancelled subscription: access ends immediately on deletion', async () => {
  const ctx = await setup();
  const { session, accountId } = await signIn(ctx);
  await grant(ctx, accountId, { id: 'evt_a', created: T0 });
  await grant(ctx, accountId, { id: 'evt_b', created: T0 + 10, type: 'customer.subscription.deleted', status: 'canceled' });
  const res = await ctx.call('GET', '/v1/datasets/deployments', { token: session });
  assert.equal(res.status, 403);
});

test('cancel at period end keeps access until the period ends, then expires', async () => {
  const ctx = await setup();
  const { session, accountId } = await signIn(ctx);
  await grant(ctx, accountId, { cancelAtPeriodEnd: true, periodEnd: T0 + 5 * DAY });
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 200);
  ctx.setNow(T0 + 5 * DAY + 1);
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403);
});

test('expired period with a stale active status does not grant access', async () => {
  const ctx = await setup();
  const { session, accountId } = await signIn(ctx);
  await grant(ctx, accountId, { periodEnd: T0 - 1 });
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403);
});

test('past_due and incomplete subscriptions do not grant access', async () => {
  for (const status of ['past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'paused']) {
    const ctx = await setup();
    const { session, accountId } = await signIn(ctx);
    await grant(ctx, accountId, { status });
    assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403, status);
  }
});

test('agent API keys are checked against the entitlement on every request', async () => {
  const ctx = await setup();
  const { session, accountId } = await signIn(ctx);
  const refused = await ctx.call('POST', '/v1/api-keys', { token: session, body: { label: 'agent' } });
  assert.equal(refused.status, 403);
  await grant(ctx, accountId, { periodEnd: T0 + DAY });
  const created = await ctx.call('POST', '/v1/api-keys', { token: session, body: { label: 'agent' } });
  assert.equal(created.status, 201);
  const { api_key: apiKey } = await created.json();
  assert.match(apiKey, /^whk_/);
  assert.equal((await ctx.call('GET', '/v1/datasets/evidence-links', { token: apiKey })).status, 200);
  const nested = await ctx.call('POST', '/v1/api-keys', { token: apiKey, body: {} });
  assert.equal(nested.status, 403);
  ctx.setNow(T0 + DAY + 1);
  assert.equal((await ctx.call('GET', '/v1/datasets/evidence-links', { token: apiKey })).status, 403);
});

test('login links work once; sessions expire and can be revoked', async () => {
  const ctx = await setup();
  const { session, loginToken } = await signIn(ctx);
  const reuse = await ctx.call('POST', '/v1/auth/redeem', { body: { token: loginToken } });
  assert.equal(reuse.status, 401);
  assert.equal((await ctx.call('GET', '/v1/me', { token: session })).status, 200);
  await ctx.call('POST', '/v1/auth/logout', { token: session });
  assert.equal((await ctx.call('GET', '/v1/me', { token: session })).status, 401);
  const second = await signIn(ctx);
  ctx.setNow(T0 + 31 * DAY);
  assert.equal((await ctx.call('GET', '/v1/me', { token: second.session })).status, 401);
});

test('magic links expire after 15 minutes and are rate limited', async () => {
  const ctx = await setup();
  await ctx.call('POST', '/v1/auth/magic-link', { body: { email: 'late@example.com' } });
  const token = /#login=(\S+)/.exec(ctx.mailer.outbox.at(-1).text)[1];
  ctx.setNow(T0 + 901);
  assert.equal((await ctx.call('POST', '/v1/auth/redeem', { body: { token } })).status, 401);
  for (let i = 0; i < 4; i += 1) await ctx.call('POST', '/v1/auth/magic-link', { body: { email: 'late@example.com' } });
  const limited = await ctx.call('POST', '/v1/auth/magic-link', { body: { email: 'late@example.com' } });
  assert.equal(limited.status, 429);
  assert.equal((await ctx.call('POST', '/v1/auth/magic-link', { body: { email: 'not-an-email' } })).status, 400);
});

test('CORS only echoes the public site origin', async () => {
  const ctx = await setup();
  const ok = await ctx.call('GET', '/v1/datasets', { headers: { origin: 'https://whyhumanoid.com' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://whyhumanoid.com');
  const other = await ctx.call('GET', '/v1/datasets', { headers: { origin: 'https://evil.example' } });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
});
