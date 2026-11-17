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

// Deployments rows 1-10 are the public preview; rows 11-14 are premium and carry words and tags found nowhere else.
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
  assert.deepEqual(t, ['evidence:e2', 'hq:germany', 'site:germany', 'site:hungary', 'status:pilot', 'task:material_handling', 'type:customer_operator', 'sector:logistics', 'sector:retail'].sort());
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

test('visitors search only the public rows: no premium result, snippet, tag or count, whatever they ask', async () => {
  const ctx = await setup({ workbook: workbook() });
  const get = async (qs, token) => { const r = await ctx.call('GET', `/v1/search?${qs}`, { token }); assert.equal(r.status, 200); return { body: await r.json(), headers: r.headers }; };

  for (const qs of ['q=zetacorp', 'q=zetaword', 'q=hidden+plant', 'q=japan', 'tags=sector:healthcare', 'tags=task:assembly', 'tags=status:operational', 'q=fx_rec_11', 'q=e5']) {
    const { body, headers } = await get(qs);
    assert.equal(body.scope, 'preview');
    assert.equal(body.total, 0, qs);
    assert.match(headers.get('cache-control'), /public/);
    // The request itself is echoed (query, terms, chosen tags with a count of 0): everything else is what was found.
    const { query, terms, active, ...served } = body;
    served.facets = served.facets.map((f) => ({ ...f, values: f.values.filter((v) => !v.active) }));
    assert.ok(body.facets.every((f) => f.values.every((v) => !v.active || v.count === 0)), qs);
    assert.doesNotMatch(JSON.stringify(served), /zetacorp|zetaword|hidden plant|fx_rec_1[1-4]|japan|healthcare|assembly/i, qs);
  }
  const { body } = await get('q=acme');
  assert.equal(body.total, 10);
  const facetTags = body.facets.flatMap((f) => f.values.map((v) => v.id));
  assert.ok(!facetTags.includes('sector:healthcare') && !facetTags.includes('hq:japan'));
  assert.equal(body.categories.find((c) => c.id === 'deployments').count, 10);

  // An account without a subscription, or a broken token, gets the same public scope.
  const { session } = await signIn(ctx, 'free@example.com');
  assert.equal((await get('q=zetacorp', session)).body.total, 0);
  assert.equal((await get('q=zetacorp', 'whs_not_a_session')).body.total, 0);
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
  assert.equal((await get('q=sanidad')).total, 4);
  assert.equal((await get('q=almac%C3%A9n')).total, 5);
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
  // Preview documents are exactly the public rows.
  const deps = await db.prepare("SELECT row_id FROM search_docs WHERE scope = 'preview' AND dataset = 'deployments'").all();
  assert.equal(deps.results.length, 10);
  assert.equal((await search(db, { scope: 'preview', q: 'zetacorp' })).total, 0);
  await assert.rejects(() => search(db, { q: 'x' }), /scope/);
});
