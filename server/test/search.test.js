// Global search and common tags. Synthetic names only (example.com, fx_ values, invented companies).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DATASETS_BY_ID } from '../src/datasets.js';
import { runImport } from '../src/import/run.js';
import { upsertStripeEntitlement } from '../src/entitlements.js';
import { norm, normMap } from '../src/search/normalize.js';
import { parseQuery, search } from '../src/search/index.js';
import { tagsFor } from '../src/search/vocabulary.js';
import { createTestDb, fixtureWorkbook, setup, signIn, T0 } from './helpers.js';

// Deployments rows 11-14 carry words and tags found nowhere else. Since 24 Nov 2026 every row is public at its public
// fields (organisation, country, sector, task category, status...); the site, task description and evidence level are paid.
const DEP = (i) => ({
  record_id: `fx_rec_${i}`,
  organization_name: i <= 10 ? `Acme Motors ${i}` : `Zetacorp Secret ${i}`,
  organization_role: i === 3 ? 'customer_investor' : 'customer_operator',
  organization_country: i <= 10 ? 'Germany' : 'Japan',
  manufacturer: 'Example Labs 1',
  robot_model: 'Strider 5',
  site_name: i <= 10 ? `Plant ${i}` : `Hidden plant ${i}`,
  country: i === 2 ? 'Germany; Hungary' : i === 5 ? 'South Korea (partner country; deployment site not confirmed)' : i <= 10 ? 'United States' : 'Japan',
  sector: i <= 10 ? (i % 2 ? 'automotive_manufacturing' : 'ecommerce_logistics') : 'healthcare',
  task_category: i <= 10 ? 'material_handling' : 'assembly',
  task_description: i <= 10 ? `Move totes between conveyors at Plant ${i}` : 'zetaword confidential workflow',
  operational_status: i <= 10 ? 'pilot' : 'operational',
  evidence_level: i <= 10 ? 'E2' : 'E5',
});

function workbook() {
  const values = fixtureWorkbook({ rowsPerTab: 12 });
  const spec = DATASETS_BY_ID.get('deployments');
  values[spec.tab] = [spec.headers, ...Array.from({ length: 14 }, (_, k) => spec.headers.map((h) => DEP(k + 1)[h] ?? `fx_${h}_${k + 1}`))];
  return values;
}

async function subscriber(ctx) {
  const { session, accountId } = await signIn(ctx);
  await upsertStripeEntitlement(ctx.db, { accountId, subscriptionId: 'sub_fx', status: 'active', currentPeriodEnd: T0 + 365 * 86400, cancelAtPeriodEnd: false, eventCreated: T0, now: T0 });
  return session;
}

// Results from the synthetic database only: Reports documents come from the real public atlas bundled with the Worker.
const dbTotal = (body) => body.total - (body.categories.find((c) => c.id === 'reports')?.count ?? 0);

test('normalisation folds case, accents and punctuation; the map points back to the original text', () => {
  assert.equal(norm('Logística  EE. UU.'), 'logistica ee uu');
  const m = normMap('Almacén Ñ');
  assert.equal(m.text, 'almacen n');
  assert.equal(m.source.slice(m.map[4], m.map[6] + 1), 'cén');
  assert.deepEqual(parseQuery('Almacén en Estados Unidos').map((t) => t.word), ['estados unidos', 'almacen']);
  assert.ok(parseQuery('almacén')[0].alts.includes('logistics'));
});

test('tags come only from the controlled vocabulary: company country apart from deployment country', () => {
  const unmapped = [];
  const t = tagsFor('deployments', DEP(2), unmapped);
  assert.deepEqual(t, ['hq:germany', 'site:germany', 'site:hungary', 'status:pilot', 'task:material_handling', 'type:customer_operator', 'sector:logistics', 'sector:retail'].sort());
  // A partner country with an unconfirmed site names no deployment country.
  assert.ok(!tagsFor('deployments', DEP(5)).some((x) => x.startsWith('site:')));
  assert.deepEqual(tagsFor('deployments', { ...DEP(1), organization_role: 'customer_investor' }).filter((x) => x.startsWith('type:')), ['type:customer_operator', 'type:investor']);
  // Unknown values get no tag and are reported, never guessed.
  tagsFor('deployments', { ...DEP(1), sector: 'space_mining', country: 'Atlantis' }, unmapped);
  assert.deepEqual(unmapped, [['sector', 'space mining'], ['country', 'atlantis']]);
  assert.deepEqual(tagsFor('stocks', { country: 'EE. UU.', segment: 'Reductores / actuadores' }), ['hq:united_states', 'sector:components', 'type:listed_company']);
  assert.deepEqual(tagsFor('deployments', { ...DEP(1), sector: 'semiconductor_manufacturing' }).filter((x) => x.startsWith('sector:')), ['sector:electronics', 'sector:manufacturing']);
  assert.deepEqual(tagsFor('deployments', { ...DEP(1), sector: 'poultry_farming' }).filter((x) => x.startsWith('sector:')), ['sector:agriculture']);
  assert.ok(parseQuery('granja avícola')[0].alts.includes('agriculture'));
  assert.deepEqual(tagsFor('stocks', { country: 'Japón', segment: 'Automatización / tecnología (RBOT)' }), ['hq:japan', 'type:listed_company']);
  assert.deepEqual(tagsFor('humanoids', { Country: 'USA (New York City)', 'Platform / mobility': 'Not stated by the company' }), ['hq:united_states', 'type:humanoid_robot']);
});

test('visitors search every case by its public values, never by a paid value: no paid result, snippet, tag or count', async () => {
  const ctx = await setup({ workbook: workbook() });
  const get = async (qs, token) => { const r = await ctx.call('GET', `/v1/search?${qs}`, { token }); assert.equal(r.status, 200); return { body: await r.json(), headers: r.headers }; };

  // Paid values: the site, the task description and the evidence level (and its tag) find nothing.
  for (const qs of ['q=zetaword', 'q=hidden+plant', 'q=e5', 'tags=evidence:e5', 'q=confidential+workflow']) {
    const { body, headers } = await get(qs);
    assert.equal(body.scope, 'preview');
    assert.equal(body.total, 0, qs);
    assert.match(headers.get('cache-control'), /public/);
    // The request itself is echoed (query, terms, chosen tags with a count of 0): everything else is what was found.
    const { query, terms, active, ...served } = body;
    assert.ok(body.facets.every((f) => f.values.every((v) => !v.active || v.count === 0)), qs);
    assert.doesNotMatch(JSON.stringify(served), /zetaword|hidden plant|confidential workflow/i, qs);
  }
  // Public values of every case are findable, and their results carry public values only.
  for (const qs of ['q=zetacorp', 'q=japan', 'tags=sector:healthcare', 'tags=task:assembly', 'tags=status:operational']) {
    const { body } = await get(qs);
    assert.equal(dbTotal(body), 4, qs);
    assert.doesNotMatch(JSON.stringify(body), /zetaword|hidden plant|confidential workflow|evidence:e5/i, qs);
  }
  const { body } = await get('q=acme');
  assert.equal(body.total, 10);
  assert.ok(!body.facets.flatMap((f) => f.values.map((v) => v.id)).some((t) => t.startsWith('evidence:')), 'no evidence-level facet for visitors');
  assert.equal(body.categories.find((c) => c.id === 'deployments').count, 10);

  // An account without a subscription, or a broken token, gets the same public scope.
  const { session } = await signIn(ctx, 'free@example.com');
  assert.equal((await get('q=zetaword', session)).body.total, 0);
  assert.equal((await get('q=zetaword', 'whs_not_a_session')).body.total, 0);
  assert.equal((await get('q=zetacorp', session)).body.total, 4);
});

test('subscribers search every row, with tags, filters, counts, ranking, snippets and pages', async () => {
  const ctx = await setup({ workbook: workbook() });
  const session = await subscriber(ctx);
  const get = async (qs) => { const r = await ctx.call('GET', `/v1/search?${qs}`, { token: session }); assert.equal(r.status, 200); assert.match(r.headers.get('cache-control'), /private/); return r.json(); };

  const z = await get('q=zetaword');
  assert.deepEqual([z.scope, z.total], ['full', 4]);
  const hit = z.results[0];
  assert.equal(hit.category, 'deployments');
  assert.equal(hit.link, `deployments/${hit.id}`);
  assert.equal(hit.snippet.label, 'task description');
  assert.deepEqual(hit.snippet.marks.map(([a, b]) => hit.snippet.text.slice(a, b)), ['zetaword']);

  // Spanish words reach the vocabulary; filters combine across facets and add up within one.
  assert.equal(dbTotal(await get('q=sanidad')), 4);
  assert.equal(dbTotal(await get('q=almac%C3%A9n')), 5);
  const both = await get('tags=sector:automotive,hq:germany');
  assert.equal(both.total, 5);
  assert.deepEqual(both.active.map((a) => a.id).sort(), ['hq:germany', 'sector:automotive']);
  const either = await get('tags=sector:automotive,sector:healthcare');
  assert.equal(either.total, 9);
  const sector = either.facets.find((f) => f.id === 'sector');
  assert.equal(sector.values.find((v) => v.id === 'sector:healthcare').count, 4);
  assert.equal((await get('q=acme&category=integrators')).total, 0);
  assert.equal((await get('tags=sector:automotive&category=deployments')).categories.find((c) => c.id === 'deployments').count, 5);

  // Exact name first; no duplicates; pages of 20.
  const ranked = await get('q=Acme+Motors+3');
  assert.equal(ranked.results[0].title.startsWith('Acme Motors 3 '), true);
  const all = await get('tags=type:customer_operator');
  assert.equal(all.total, 14);
  const many = await get('q=example');
  assert.ok(many.total > 20);
  assert.equal(many.results.length, 20);
  const page2 = await get('q=example&page=2');
  assert.equal(page2.page, 2);
  const ids = [...many.results, ...page2.results].map((r) => `${r.category}/${r.id}`);
  assert.equal(new Set(ids).size, ids.length);

  // Nothing asked, unknown tags and LIKE wildcards find nothing.
  assert.equal((await get('q=')).total, 0);
  assert.equal((await get('tags=sector:nonsense')).total, 0);
  assert.equal((await get('q=%25')).total, 0);
});

test('the import rebuilds both scopes and reports counts only', async () => {
  const db = createTestDb();
  const r = await runImport(db, workbook(), T0);
  assert.equal(r.ok, true);
  // The fixture's fx_ placeholders are not vocabulary values: counted, never listed in the result.
  assert.ok(Number.isInteger(r.search.unmapped_values) && r.search.unmapped_values > 0);
  assert.deepEqual(Object.keys(r.search).sort(), ['full', 'preview', 'unmapped_values']);
  const n = async (scope) => (await db.prepare('SELECT COUNT(*) AS n FROM search_docs WHERE scope = ?').bind(scope).first()).n;
  const full = await n('full');
  const preview = await n('preview');
  assert.equal(full, r.search.full);
  assert.ok(preview < full);
  // Public documents: every Deployments row, built from its public values only.
  const deps = await db.prepare("SELECT row_id, haystack FROM search_docs WHERE scope = 'preview' AND dataset = 'deployments'").all();
  assert.equal(deps.results.length, 14);
  assert.ok(deps.results.every((d) => !/zetaword|hidden plant/.test(d.haystack)));
  assert.equal((await search(db, { scope: 'preview', q: 'zetaword' })).total, 0);
  assert.equal((await search(db, { scope: 'preview', q: 'zetacorp' })).total, 4);
  assert.equal(await (await db.prepare("SELECT COUNT(*) AS n FROM search_docs WHERE scope = 'preview' AND dataset = 'evidence-links'").first()).n, 0, 'claim-to-evidence links: counted, never indexed publicly');
  await assert.rejects(() => search(db, { q: 'x' }), /scope/);
});

// Reader-facing labels (27 Nov 2026): a listed company found by its ticker shows the reviewed English segment and
// description the site uses, and never a raw identifier field ("gf symbol", ISIN, *_id) as its snippet.
test('a listed company result shows reviewed English labels and no raw identifier snippet', async () => {
  const values = workbook();
  const spec = DATASETS_BY_ID.get('stocks');
  const h = spec.headers;
  const es = 'Desarrolla robótica para inspección, seguridad y logística: cuadrúpedos, brazos y descarga de mercancías.';
  values[spec.tab] = [h, h.map((f) => ({ NAME: 'Example Logistics Robotics', TICKER: 'EXLG', EXCHANGE: 'NYSE', COUNTRY: 'EE. UU.', SEGMENT: 'Robótica / automatización (ROBO)', DESCRIPTION: es, GF_SYMBOL: 'NYSE:EXLG', ISIN: 'US0000000001' }[f] ?? ''))];
  const ctx = await setup({ workbook: values });
  const body = await (await ctx.call('GET', '/v1/search?q=EXLG')).json();
  const hit = body.results.find((r) => r.category === 'stocks');
  assert.ok(hit, JSON.stringify(body.results.map((r) => r.category)));
  assert.equal(hit.subtitle, 'NYSE · United States · Robotics / automation (ROBO)');
  assert.ok(!hit.snippet || !/gf symbol|isin|NYSE:EXLG/i.test(`${hit.snippet.label} ${hit.snippet.text}`), JSON.stringify(hit.snippet));
  assert.equal(hit.snippet?.text, 'Develops robotics for inspection, security and logistics: quadrupeds, arms and goods unloading.');
  // The stored row keeps the recorded values: only the result display uses the reviewed wording.
  const row = (await ctx.call('GET', '/v1/datasets/stocks/preview').then((r) => r.json())).rows.find((r) => r.ticker === 'EXLG');
  assert.equal(row.segment, 'Robótica / automatización (ROBO)');
});

// Evidence codes E0-E5 have no documented definition (27 Nov 2026): no tag, facet, filter or count, for anyone; the
// complete subscriber record still holds the code exactly as recorded.
test('undefined E0-E5 codes are never a tag, facet or filter; the subscriber record keeps the code as recorded', async () => {
  const ctx = await setup({ workbook: workbook() });
  const session = await subscriber(ctx);
  const get = async (qs) => (await ctx.call('GET', `/v1/search?${qs}`, { token: session })).json();
  const all = await get('q=acme');
  assert.ok(all.total > 0);
  assert.ok(!all.facets.some((f) => f.id === 'evidence'), 'no evidence facet');
  assert.ok(all.results.every((r) => r.tags.every((t) => !t.id.startsWith('evidence:'))), 'no evidence tag on any result');
  const filtered = await get('q=acme&tags=evidence:e2');
  assert.equal(filtered.total, all.total, 'an evidence tag filters nothing');
  assert.deepEqual(filtered.active, []);
  const rows = (await (await ctx.call('GET', '/v1/datasets/deployments?limit=20', { token: session })).json()).rows;
  assert.ok(rows.some((r) => r.evidence_level === 'E5') && rows.some((r) => r.evidence_level === 'E2'), 'the legacy code is kept in the complete record');
  assert.deepEqual(tagsFor('deployments', { evidence_level: 'E5' }), []);
  // A subscriber searching the code finds the record; the snippet names the field as an undefined legacy code.
  const e5 = await get('q=e5');
  const hit = e5.results.find((r) => r.snippet?.field === 'evidence_level');
  assert.ok(hit, JSON.stringify(e5.results.map((r) => r.snippet)));
  assert.equal(hit.snippet.label, 'Legacy evidence code (undefined)');
  assert.doesNotMatch(JSON.stringify(e5), /"evidence level"/i);
});
