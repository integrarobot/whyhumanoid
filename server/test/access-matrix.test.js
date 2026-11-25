// Access matrix of 23 Nov 2026 (server/src/access/matrix.js), checked end to end through the API for every kind of
// visitor: anonymous, signed in without paying, active subscriber, cancelled at period end (still paid), expired.
// One US$100/year subscription unlocks complete Deployments and complete Components; every other category is free.
// Since 24 Nov 2026 every case and product of those two is public at its public fields (server/src/access/fields.js).
import { REPORTS_LIVE_OPEN } from '../src/orders/services.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T0, sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';
import { CATEGORIES, DATASET_ACCESS, SERVICES, SUBSCRIPTION, canReadFull, publicMatrix } from '../src/access/matrix.js';
import { DATASETS } from '../src/datasets.js';
import { PUBLIC_FIELDS } from '../src/access/fields.js';
import { LIVE_SALES_OPEN, PLAN } from '../src/pricing.js';
import { PRODUCT } from '../src/entitlements.js';

const DAY = 24 * 3600;
const SUBSCRIPTION_TABS = ['deployments', 'hardware', 'evidence-links', 'entities', 'container-handling', 'data-space'];
// Components' related software block (one row in the fixture), with the Components access.
const COMPONENT_SOFTWARE = 'component-software';
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
  assert.equal(reports.source, 'data/reports/atlas.json');
  const ids = new Set(DATASETS.map((d) => d.id));
  for (const c of CATEGORIES) for (const d of c.datasets) assert.ok(ids.has(d), `${c.id} maps to the real tab ${d}`);
  assert.deepEqual(CATEGORIES.filter((c) => c.access === 'subscription').map((c) => c.id), ['deployments', 'components']);
  assert.deepEqual(DATASETS.map((d) => d.id).sort(), Object.keys(DATASET_ACCESS).sort(), 'every tab has exactly one entry');
  // Gaps are stated, not filled: Investment has no dedicated private-investment table; Components says which families
  // have not been researched yet (23 Nov 2026), and its related software block supports the category.
  assert.match(CATEGORIES.find((c) => c.id === 'investment').gap, /no separate deal-by-deal list/);
  assert.match(CATEGORIES.find((c) => c.id === 'components').gap, /focuses on touch.*not been researched/);
  assert.deepEqual(CATEGORIES.find((c) => c.id === 'components').supporting, ['component-software']);
  // Benchmarks has its own tabs since 23 Nov 2026 and states the gap it has: most resources have no extracted results.
  assert.deepEqual(CATEGORIES.find((c) => c.id === 'benchmarks').datasets, ['benchmarks', 'benchmark-results']);
  assert.match(CATEGORIES.find((c) => c.id === 'benchmarks').gap, /extracted/);
  assert.equal(DATASET_ACCESS['task-evaluations'].category, null, 'Task Evaluation is an internal operational assessment, not the Benchmarks category');
  assert.equal(DATASET_ACCESS['task-evaluations'].access, 'free', 'its access is unchanged');
});

test('one subscription unlocks Deployments and Components; the two reports are separate one-off services', () => {
  assert.deepEqual(SUBSCRIPTION.unlocks, ['deployments', 'components']);
  assert.equal(PRODUCT, SUBSCRIPTION.product);
  assert.equal(PRODUCT, 'premium', 'existing subscribers keep their entitlement');
  assert.equal(PLAN.unitAmount, 10000);
  assert.equal(PLAN.currency, 'usd');
  assert.equal(PLAN.interval, 'year');
  for (const tab of SUBSCRIPTION_TABS) assert.equal(canReadFull(tab, { entitled: false }), false, tab);
  for (const tab of FREE_TABS) assert.equal(canReadFull(tab, { entitled: false }), true, tab);
  // Orderable once live report sales are open (REPORTS_LIVE_OPEN, 25 Nov 2026); never part of the subscription.
  const state = REPORTS_LIVE_OPEN ? 'available' : 'not_available';
  assert.deepEqual(SERVICES.map((s) => [s.category, s.name, s.price, s.status, s.included_in_subscription, s.orderable]), [
    ['deployments', 'Robot integration diagnostic', 'US$1,000', state, false, REPORTS_LIVE_OPEN],
    ['components', 'Industrial diversification report', 'US$1,000', state, false, REPORTS_LIVE_OPEN],
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
  assert.equal(plan.price, 'US$100 per year');
  assert.match(plan.description, /Deployments and complete Components/);
});

// Who reads what: status of GET /v1/datasets/{id}, rows returned, and whether a PAID value of the 11th row (claim text of
// a Deployments record, dimensions of a Components product) is reachable by search. Public values are always findable.
async function probe(ctx, token) {
  const out = {};
  for (const id of [...SUBSCRIPTION_TABS, COMPONENT_SOFTWARE, ...FREE_TABS]) {
    const res = await ctx.call('GET', `/v1/datasets/${id}?limit=500`, { token });
    out[id] = res.status === 200 ? (await res.json()).rows.length : res.status;
  }
  const search = await (await ctx.call('GET', '/v1/search?q=fx_claim_text_11', { token })).json();
  const comp = await (await ctx.call('GET', '/v1/search?q=Synthetic+dimensions+11', { token })).json();
  out.search_scope = search.scope;
  out.deployment_11_found = search.total > 0;
  out.component_11_found = comp.results.some((r) => /Example sensor 11/.test(r.title));
  // Past the entitlement check the full graph answers (503 here only because this fixture builds no relations).
  const rel = (await ctx.call('GET', '/v1/relations', { token })).status;
  out.relations = rel === 401 || rel === 403 ? rel : 'allowed';
  return out;
}

test('anonymous, unpaid, active, cancelled-at-period-end and expired accounts see exactly what the matrix says', async () => {
  const ctx = await setup();
  // Two side-by-side lists per sheet row in Software and Other Robots: 24 entries from 12 rows.
  const free = Object.fromEntries(FREE_TABS.map((id) => [id, ['software', 'other-robots'].includes(id) ? 24 : 12]));
  const locked = (status) => Object.fromEntries([...SUBSCRIPTION_TABS, COMPONENT_SOFTWARE].map((id) => [id, status]));
  const closed = { search_scope: 'preview', deployment_11_found: false, component_11_found: false };

  // Anonymous: free categories in full, subscription categories 401.
  assert.deepEqual(await probe(ctx), { ...locked(401), ...free, ...closed, relations: 401 });

  // Signed in, never paid: 403 on subscription categories.
  const { session, accountId } = await signIn(ctx, 'buyer@example.com');
  assert.deepEqual(await probe(ctx, session), { ...locked(403), ...free, ...closed, relations: 403 });

  // Active (test-mode event, signed): everything, Deployments and Components together.
  await sendWebhook(ctx, subscriptionEvent({ accountId, id: 'evt_m1', status: 'active', periodEnd: T0 + 365 * DAY }));
  const open = { ...Object.fromEntries(SUBSCRIPTION_TABS.map((id) => [id, 12])), [COMPONENT_SOFTWARE]: 1, ...free, search_scope: 'full', deployment_11_found: true, component_11_found: true, relations: 'allowed' };
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
  // Components: every product is public at its public fields; nothing else of any row.
  const pub = await (await ctx.call('GET', '/v1/datasets/hardware/preview')).json();
  assert.equal(pub.rows.length, 12, 'every Components product is listed');
  assert.equal(pub.total_rows, 12);
  for (const r of pub.rows) for (const k of Object.keys(r)) assert.ok(k === 'id' || PUBLIC_FIELDS.hardware.includes(k), `hardware.${k} is not a public field`);
  assert.ok(pub.rows.every((r) => !('dimensions' in r) && !('list_price' in r) && !('sources' in r)));
});

test('every subscription tab follows the central field contract in its public rows; counted-only tabs list nothing', async () => {
  const ctx = await setup();
  for (const id of [...SUBSCRIPTION_TABS, COMPONENT_SOFTWARE]) {
    const body = await (await ctx.call('GET', `/v1/datasets/${id}/preview`)).json();
    const fields = PUBLIC_FIELDS[id];
    if (!fields.length) { assert.equal(body.rows.length, 0, `${id} is counted, not listed`); assert.ok(body.total_rows > 0); continue; }
    assert.equal(body.rows.length, body.total_rows, `${id}: every row is listed`);
    for (const r of body.rows) for (const k of Object.keys(r)) assert.ok(k === 'id' || fields.includes(k), `${id}.${k} is not public`);
    assert.doesNotMatch(JSON.stringify(body), /fx_(claim_text|site_name|city|task_description|metric_value|open_questions_notes|notes|source_rows)_/, `${id}: no paid value`);
  }
  // An older import without stored public values publishes nothing of that row (never its full values).
  await ctx.db.prepare("UPDATE premium_rows SET preview_data = NULL WHERE dataset = 'deployments' AND preview_rank = 2").run();
  const dep = await (await ctx.call('GET', '/v1/datasets/deployments/preview')).json();
  assert.equal(dep.rows.length, 11);
  assert.doesNotMatch(JSON.stringify(dep), /fx_claim_text_2"/);
});

test('live sales follow LIVE_SALES_OPEN; existing subscribers, test mode and unorderable reports are unaffected', async () => {
  const live = await setup({ checkoutEnabled: true, stripeKey: 'sk_live_fixture', stripeMode: 'live', allowLiveCheckout: true, price: { ...(await import('./helpers.js')).VALID_PRICE, livemode: true } });
  assert.equal((await (await live.call('GET', '/v1/billing/plan')).json()).checkout_available, LIVE_SALES_OPEN);
  const { session, accountId } = await signIn(live, 'renewing@example.com');
  const res = await live.call('POST', '/v1/billing/checkout', { token: session });
  if (LIVE_SALES_OPEN) {
    assert.equal(res.status, 200);
    assert.equal(live.checkoutCalls.length, 1, 'one live Checkout session for the USD plan');
  } else {
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: 'offer_in_review' });
    assert.equal(live.checkoutCalls.length, 0, 'Stripe is never asked for a live session');
  }
  // An existing live subscription keeps working: its signed live events still grant access to both categories.
  await sendWebhook(live, subscriptionEvent({ accountId, livemode: true, status: 'active', periodEnd: T0 + 300 * DAY }));
  assert.equal((await live.call('GET', '/v1/datasets/deployments', { token: session })).status, 200);
  assert.equal((await live.call('GET', '/v1/datasets/hardware', { token: session })).status, 200);
  // A subscriber is never sold a second subscription.
  assert.equal((await live.call('POST', '/v1/billing/checkout', { token: session })).status, 409);
  // Custom company reports follow their own switch (REPORTS_LIVE_OPEN), never the subscription gate, and are never
  // included in the subscription.
  assert.ok(SERVICES.every((s) => s.orderable === REPORTS_LIVE_OPEN && s.included_in_subscription === false));
  // Test mode (staging) sells the same plan with test keys.
  const test = await setup({ checkoutEnabled: true });
  assert.equal((await (await test.call('GET', '/v1/billing/plan')).json()).checkout_available, true);
});

test('visitor search ignores a stale index entry for a row without public values or a counted-only tab', async () => {
  const ctx = await setup();
  const row = await ctx.db.prepare("SELECT row_id FROM premium_rows WHERE dataset = 'hardware' AND preview_rank = 11").first();
  assert.ok(row, 'fixture has an 11th Components row');
  // A row whose public values are missing (older import) is not public, whatever an older index holds.
  await ctx.db.prepare("UPDATE premium_rows SET preview_data = NULL WHERE dataset = 'hardware' AND row_id = ?").bind(row.row_id).run();
  await ctx.db.prepare("INSERT OR REPLACE INTO search_docs (scope, dataset, row_id, position, title, subtitle, names, haystack, tags, link) VALUES ('preview', 'hardware', ?, 99, 'Stale component', '', '|Stale component|', ' stale component ', '||', '')").bind(row.row_id).run();
  assert.equal((await (await ctx.call('GET', '/v1/search?q=stale+component')).json()).total, 0);
  // Evidence links are counted only: a stale public entry for one is never served.
  const link = await ctx.db.prepare("SELECT row_id FROM premium_rows WHERE dataset = 'evidence-links' LIMIT 1").first();
  await ctx.db.prepare("INSERT OR REPLACE INTO search_docs (scope, dataset, row_id, position, title, subtitle, names, haystack, tags, link) VALUES ('preview', 'evidence-links', ?, 99, 'Stale link', '', '|Stale link|', ' stale link ', '||', '')").bind(link.row_id).run();
  assert.equal((await (await ctx.call('GET', '/v1/search?q=stale+link')).json()).total, 0);
  // Every product with public values is findable by its public name, the 11th included.
  const found = await (await ctx.call('GET', '/v1/search?q=Example+sensor+12')).json();
  assert.ok(found.results.some((r) => /Example sensor 12/.test(r.title)));
});
