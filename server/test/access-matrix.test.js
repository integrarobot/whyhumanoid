// Access matrix of 23 Nov 2026 (server/src/access/matrix.js), checked end to end through the API for every kind of
// visitor: anonymous, signed in without paying, active subscriber, cancelled at period end (still paid), expired.
// One EUR 100/year subscription unlocks complete Deployments and complete Components; every other category is free.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T0, sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';
import { CATEGORIES, DATASET_ACCESS, SERVICES, SUBSCRIPTION, canReadFull, publicMatrix } from '../src/access/matrix.js';
import { DATASETS } from '../src/datasets.js';
import { PLAN } from '../src/pricing.js';
import { PRODUCT } from '../src/entitlements.js';

const DAY = 24 * 3600;
const SUBSCRIPTION_TABS = ['deployments', 'hardware', 'evidence-links', 'entities', 'container-handling', 'data-space'];
const FREE_TABS = ['humanoids', 'integrators', 'software', 'datasets', 'task-evaluations', 'stocks', 'other-robots'];

test('the nine confirmed categories, in order, then Reports, each at its own address and mapped to real sources', () => {
  assert.deepEqual(CATEGORIES.map((c) => [c.label, c.path]), [
    ['Humanoids', '/humanoids/'], ['Deployments', '/deployments/'], ['Components', '/components/'],
    ['Integrators', '/integrators/'], ['Software', '/software/'], ['Datasets', '/datasets/'],
    ['Benchmarks', '/benchmarks/'], ['Investment', '/investment/'], ['Other Robots', '/other-robots/'],
    ['Reports', '/reports/'],
  ]);
  const reports = CATEGORIES.find((c) => c.id === 'reports');
  assert.equal(reports.access, 'free');
  assert.deepEqual(reports.datasets, [], 'Reports is not a workbook tab');
  assert.equal(reports.source, 'data/reports/catalogue.json');
  const ids = new Set(DATASETS.map((d) => d.id));
  for (const c of CATEGORIES) for (const d of c.datasets) assert.ok(ids.has(d), `${c.id} maps to the real tab ${d}`);
  assert.deepEqual(CATEGORIES.filter((c) => c.access === 'subscription').map((c) => c.id), ['deployments', 'components']);
  assert.deepEqual(DATASETS.map((d) => d.id).sort(), Object.keys(DATASET_ACCESS).sort(), 'every tab has exactly one entry');
  // Gaps are stated, not filled: categories without a dedicated tab say so.
  for (const id of ['components', 'benchmarks', 'investment']) assert.match(CATEGORIES.find((c) => c.id === id).gap, /no dedicated|no components table/);
  assert.match(CATEGORIES.find((c) => c.id === 'components').gap, /sparse hardware directory/, 'Components says what it is today');
});

test('one subscription unlocks Deployments and Components; the services are separate and not for sale yet', () => {
  assert.deepEqual(SUBSCRIPTION.unlocks, ['deployments', 'components']);
  assert.equal(PRODUCT, SUBSCRIPTION.product);
  assert.equal(PRODUCT, 'premium', 'existing subscribers keep their entitlement');
  assert.equal(PLAN.unitAmount, 10000);
  assert.equal(PLAN.currency, 'eur');
  assert.equal(PLAN.interval, 'year');
  for (const tab of SUBSCRIPTION_TABS) assert.equal(canReadFull(tab, { entitled: false }), false, tab);
  for (const tab of FREE_TABS) assert.equal(canReadFull(tab, { entitled: false }), true, tab);
  assert.deepEqual(SERVICES.map((s) => [s.category, s.price, s.status, s.included_in_subscription]), [
    ['deployments', '€1,000', 'proposal', false],
    ['components', '€1,000', 'proposal', false],
  ]);
});

test('GET /v1/access and /v1/billing/plan describe the rules and the plan, never data', async () => {
  const ctx = await setup();
  const res = await ctx.call('GET', '/v1/access');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, publicMatrix());
  assert.doesNotMatch(JSON.stringify(body), /fx_|Example /, 'no rows');
  const plan = (await (await ctx.call('GET', '/v1/billing/plan')).json()).plan;
  assert.equal(plan.name, SUBSCRIPTION.name);
  assert.equal(plan.price, '€100 per year');
  assert.match(plan.description, /Deployments and complete Components/);
});

// Who reads what: status of GET /v1/datasets/{id}, rows returned, and whether the 11th row is reachable by search.
async function probe(ctx, token) {
  const out = {};
  for (const id of [...SUBSCRIPTION_TABS, ...FREE_TABS]) {
    const res = await ctx.call('GET', `/v1/datasets/${id}?limit=500`, { token });
    out[id] = res.status === 200 ? (await res.json()).rows.length : res.status;
  }
  const search = await (await ctx.call('GET', '/v1/search?q=fx_record_id_11', { token })).json();
  const comp = await (await ctx.call('GET', '/v1/search?q=hardware+11', { token })).json();
  out.search_scope = search.scope;
  out.deployment_11_found = search.total > 0;
  out.component_11_found = comp.results.some((r) => /Example hardware 11/.test(r.title));
  // Past the entitlement check the full graph answers (503 here only because this fixture builds no relations).
  const rel = (await ctx.call('GET', '/v1/relations', { token })).status;
  out.relations = rel === 401 || rel === 403 ? rel : 'allowed';
  return out;
}

test('anonymous, unpaid, active, cancelled-at-period-end and expired accounts see exactly what the matrix says', async () => {
  const ctx = await setup();
  // Two side-by-side lists per sheet row in Software and Other Robots: 24 entries from 12 rows.
  const free = Object.fromEntries(FREE_TABS.map((id) => [id, ['software', 'other-robots'].includes(id) ? 24 : 12]));
  const locked = (status) => Object.fromEntries(SUBSCRIPTION_TABS.map((id) => [id, status]));
  const closed = { search_scope: 'preview', deployment_11_found: false, component_11_found: false };

  // Anonymous: free categories in full, subscription categories 401.
  assert.deepEqual(await probe(ctx), { ...locked(401), ...free, ...closed, relations: 401 });

  // Signed in, never paid: 403 on subscription categories.
  const { session, accountId } = await signIn(ctx, 'buyer@example.com');
  assert.deepEqual(await probe(ctx, session), { ...locked(403), ...free, ...closed, relations: 403 });

  // Active (test-mode event, signed): everything, Deployments and Components together.
  await sendWebhook(ctx, subscriptionEvent({ accountId, id: 'evt_m1', status: 'active', periodEnd: T0 + 365 * DAY }));
  const open = { ...Object.fromEntries(SUBSCRIPTION_TABS.map((id) => [id, 12])), ...free, search_scope: 'full', deployment_11_found: true, component_11_found: true, relations: 'allowed' };
  assert.deepEqual(await probe(ctx, session), open);

  // Cancelled at period end: still paid, still open.
  await sendWebhook(ctx, subscriptionEvent({ accountId, id: 'evt_m2', created: T0 + 10, status: 'active', cancelAtPeriodEnd: true, periodEnd: T0 + 365 * DAY }));
  assert.deepEqual(await probe(ctx, session), open);

  // A duplicate delivery of an older event changes nothing.
  await sendWebhook(ctx, subscriptionEvent({ accountId, id: 'evt_m1', status: 'active', periodEnd: T0 + 365 * DAY }));
  const me = await (await ctx.call('GET', '/v1/me', { token: session })).json();
  assert.equal(me.access.cancel_at_period_end, true);

  // The paid year ends: closed again before any deletion event arrives (new session: sessions last 30 days).
  ctx.setNow(T0 + 365 * DAY + 1);
  const again = (await signIn(ctx, 'buyer@example.com')).session;
  assert.deepEqual(await probe(ctx, again), { ...locked(403), ...free, ...closed, relations: 403 });
});

test('free categories answer visitors with public, cacheable values; subscription answers are private', async () => {
  const ctx = await setup();
  const { session, accountId } = await signIn(ctx);
  await sendWebhook(ctx, subscriptionEvent({ accountId }));
  const visitor = await ctx.call('GET', '/v1/datasets/stocks');
  assert.match(visitor.headers.get('cache-control'), /^public/);
  const row = (await visitor.json()).rows[0];
  for (const quote of ['price', 'change_pct', 'market_cap', 'last_trade']) assert.ok(!(quote in row), `${quote} stays withheld`);
  const member = await ctx.call('GET', '/v1/datasets/deployments', { token: session });
  assert.equal(member.headers.get('cache-control'), 'private, no-store');
  const previewOnly = await (await ctx.call('GET', '/v1/datasets/hardware/preview')).json();
  assert.equal(previewOnly.rows.length, 10, 'Components preview: the first 10 rows');
  assert.equal(previewOnly.total_rows, 12);
});

test('live sales of the new offer stay closed until its terms are final; existing subscribers and test mode are unaffected', async () => {
  const live = await setup({ checkoutEnabled: true, stripeKey: 'sk_live_fixture', stripeMode: 'live', allowLiveCheckout: true, price: { ...(await import('./helpers.js')).VALID_PRICE, livemode: true } });
  assert.equal((await (await live.call('GET', '/v1/billing/plan')).json()).checkout_available, false);
  const { session, accountId } = await signIn(live, 'renewing@example.com');
  const res = await live.call('POST', '/v1/billing/checkout', { token: session });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'offer_in_review' });
  assert.equal(live.checkoutCalls.length, 0, 'Stripe is never asked for a live session');
  // An existing live subscription keeps working: its signed live events still grant access to both categories.
  await sendWebhook(live, subscriptionEvent({ accountId, livemode: true, status: 'active', periodEnd: T0 + 300 * DAY }));
  assert.equal((await live.call('GET', '/v1/datasets/deployments', { token: session })).status, 200);
  assert.equal((await live.call('GET', '/v1/datasets/hardware', { token: session })).status, 200);
  // Test mode (staging) sells the same plan with test keys.
  const test = await setup({ checkoutEnabled: true });
  assert.equal((await (await test.call('GET', '/v1/billing/plan')).json()).checkout_available, true);
});

test('visitor search ignores a stale index entry past the preview of a subscription category', async () => {
  const ctx = await setup();
  const row = await ctx.db.prepare("SELECT row_id FROM premium_rows WHERE dataset = 'hardware' AND preview_rank = 11").first();
  assert.ok(row, 'fixture has an 11th Components row');
  // An index built under older rules could hold it in the public scope.
  await ctx.db.prepare("INSERT INTO search_docs (scope, dataset, row_id, position, title, subtitle, names, haystack, tags, link) VALUES ('preview', 'hardware', ?, 99, 'Stale component', '', '|Stale component|', ' stale component ', '||', '')").bind(row.row_id).run();
  const visitor = await (await ctx.call('GET', '/v1/search?q=stale+component')).json();
  assert.equal(visitor.total, 0);
  const free = await (await ctx.call('GET', '/v1/search?q=hardware')).json();
  assert.ok(free.results.every((r) => r.category !== 'hardware' || !/ 11$/.test(r.title)), 'only the first 10 Components rows');
});
