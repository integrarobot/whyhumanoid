// Relations between Deployments records, catalogue robots and companies. Synthetic names only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, compileConfig, robotSlug } from '../src/relations/graph.js';
import { ALLOWED_KEYS, EVIDENCE_KEYS, publicProjection } from '../src/public/projection.js';
import { DATASETS_BY_ID } from '../src/datasets.js';
import { runImport } from '../src/import/run.js';
import { upsertStripeEntitlement } from '../src/entitlements.js';
import { fixtureWorkbook, setup, signIn, T0 } from './helpers.js';

const catalogue = [
  { id: 1, Lab: 'Example Labs 1', Robot: 'Strider 5 (in development)' },
  { id: 2, Lab: 'Example Labs 2', Robot: 'Lifter' },
  { id: 3, Lab: 'Physical Example', Robot: 'Pi' },
  { id: 4, Lab: 'Example Labs 4', Robot: 'Not disclosed' },
].map((r) => ({ ...r, lab: r.Lab, robot: r.Robot, slug: robotSlug(r.id, r.Lab, r.Robot) }));

const aliases = {
  makers: {
    'Example Labs 1': { id: 'org_example_one', entity_id: 'org_example_one', name: 'Example One Robotics', names: ['Example One Robotics'] },
    'Example Labs 2': { names: ['Example Two Inc'] },
  },
  robots: {
    1: { lab: 'Example Labs 1', robot: 'Strider 5 (in development)', model: ['Strider 5'], family: ['Strider'] },
    2: { lab: 'Example Labs 2', robot: 'Lifter', model: ['Lifter'], family: ['Lifter X'] },
  },
};
const config = { aliases, catalogue };

const row = (i, over = {}) => ({
  record_id: `fx_rec_${i}`,
  deployment_id: `fx_dep_${i}`,
  organization_id: `org_fx_op_${i}`,
  organization_name: `Operator ${i}`,
  organization_role: 'customer_operator',
  organization_country: 'Exampleland',
  manufacturer: 'Example One Robotics',
  robot_model: 'Strider',
  robot_version: 'Not disclosed',
  operational_status: 'pilot',
  ...over,
});

test('robots link only by their model or model line, never by the maker alone', () => {
  const compiled = compileConfig(config);
  assert.deepEqual(compiled.problems, []);
  const rows = [
    row(1, { robot_model: 'Strider 5' }),
    row(2, { robot_model: 'Strider' }),
    row(3, { robot_model: 'Strider', robot_version: 'Strider 5' }),
    row(4, { robot_model: 'Strider 4X' }),
    row(5, { robot_model: 'Humanoid (model not disclosed)' }),
    row(6, { robot_model: 'Strider 5X' }), // a longer name is not a match: no substrings
    row(7, { manufacturer: 'Example Two Inc', robot_model: 'LIFTER' }),
    row(8, { manufacturer: 'Example Two Inc', robot_model: 'Lifter X (as supplied)' }),
  ];
  const { graph } = buildGraph(compiled, { rows, scope: 'full' });
  const by = Object.fromEntries(graph.records.map((r) => [r.record_id, r]));
  assert.deepEqual([by.fx_rec_1.robot, by.fx_rec_1.level], [1, 'model']);
  assert.deepEqual([by.fx_rec_2.robot, by.fx_rec_2.level], [1, 'family']);
  assert.deepEqual([by.fx_rec_3.robot, by.fx_rec_3.level], [1, 'model']);
  assert.deepEqual([by.fx_rec_4.robot, by.fx_rec_4.robot_reason, by.fx_rec_4.maker], [null, 'model_not_in_catalogue', 'org_example_one']);
  assert.deepEqual([by.fx_rec_5.robot, by.fx_rec_5.robot_reason], [null, 'model_not_disclosed']);
  assert.deepEqual([by.fx_rec_6.robot, by.fx_rec_6.robot_reason], [null, 'model_not_in_catalogue']);
  assert.deepEqual([by.fx_rec_7.robot, by.fx_rec_7.level, by.fx_rec_7.maker], [2, 'model', 'mfr_example_labs_2']);
  assert.deepEqual([by.fx_rec_8.robot, by.fx_rec_8.level], [2, 'family']);
  assert.deepEqual(graph.coverage, {
    records: 8, robot_model: 3, robot_family: 2, maker_only: 3, maker_unresolved: 0, operator_linked: 8, operator_unresolved: 0,
    robots_with_records: 2, companies_with_records: 10,
  });
});

test('makers: undisclosed or several stay unlinked, homonyms and makers outside the catalogue are not attached', () => {
  const compiled = compileConfig(config);
  const rows = [
    row(1, { manufacturer: 'Not disclosed', robot_model: 'Not disclosed' }),
    row(2, { manufacturer: 'Example One Robotics; Example Two Inc', robot_model: 'Strider' }),
    row(3, { manufacturer: 'Physical Example Intelligence (policy provider)', robot_model: 'Pi' }),
    row(4, { manufacturer: 'Example One Robotic', robot_model: 'Strider 5' }), // near miss: no fuzzy matching
    row(5, { manufacturer: 'Other Maker (in-house)', robot_model: 'Tool' }),
  ];
  const { graph, report } = buildGraph(compiled, { rows, scope: 'full' });
  const by = Object.fromEntries(graph.records.map((r) => [r.record_id, r]));
  assert.equal(by.fx_rec_1.maker_reason, 'maker_not_disclosed');
  assert.equal(by.fx_rec_2.maker_reason, 'several_makers');
  assert.deepEqual([by.fx_rec_3.maker, by.fx_rec_3.robot, by.fx_rec_3.robot_reason], ['mfr_physical_example_intelligence', null, 'maker_not_in_catalogue']);
  assert.deepEqual([by.fx_rec_4.maker, by.fx_rec_4.robot], ['mfr_example_one_robotic', null]);
  assert.equal(by.fx_rec_5.maker, 'mfr_other_maker');
  const auto = graph.companies.find((c) => c.id === 'mfr_other_maker');
  assert.deepEqual([auto.identity, auto.name, auto.robots], ['name_as_recorded', 'Other Maker', []]);
  assert.deepEqual(report.makers_as_recorded.sort(), ['mfr_example_one_robotic', 'mfr_other_maker', 'mfr_physical_example_intelligence']);
});

test('organisations: sheet ids, roles, merges with a maker by exact name, entities only in scope', () => {
  const compiled = compileConfig(config);
  const rows = [
    row(1, { organization_id: 'org_shared', organization_name: 'Shared Group (Plant A)' }),
    row(2, { organization_id: 'org_shared', organization_name: 'Shared Group (Plant B)', organization_role: 'customer_investor' }),
    row(3, { organization_id: 'org_partner', organization_name: 'Partner SE', organization_role: 'technology_partner' }),
    row(4, { organization_id: '', organization_name: 'Not disclosed (retail operators)' }),
    row(5, { organization_id: 'org_example_two', organization_name: 'Example Two Inc', manufacturer: 'Other Maker', robot_model: 'Tool' }),
    row(6, { organization_id: 'org_other', organization_name: 'Other Maker', manufacturer: 'Other Maker (in-house)', robot_model: 'Tool' }),
  ];
  const entities = [{ entity_id: 'org_shared', canonical_name: 'Shared Group' }];
  const { graph, report } = buildGraph(compiled, { rows, entities, scope: 'full' });
  const company = (id) => graph.companies.find((c) => c.id === id);
  assert.deepEqual(company('org_shared').roles, { customer_operator: 1, customer_investor: 1 });
  assert.equal(company('org_shared').name, 'Shared Group');
  assert.equal(company('org_shared').entity_id, 'org_shared');
  assert.deepEqual(company('org_partner').roles, { technology_partner: 1 });
  assert.equal(graph.records[3].operator_reason, 'no_organization_id');
  // The operator named exactly like a catalogue maker's alias is that maker, in both roles.
  assert.deepEqual(company('mfr_example_labs_2').roles, { customer_operator: 1 });
  assert.deepEqual(company('mfr_example_labs_2').organization_ids, ['org_example_two']);
  assert.deepEqual(company('mfr_other_maker').roles, { maker: 2, customer_operator: 1 });
  assert.deepEqual(report.merged_by_name, { org_example_two: 'mfr_example_labs_2', org_other: 'mfr_other_maker' });
  // The maker's Entities record is linked only when that record is in the same scope.
  assert.equal(company('org_example_one').entity_id, null);
  const withEntity = buildGraph(compiled, { rows, entities: [{ entity_id: 'org_example_one', canonical_name: 'Example One Robotics' }], scope: 'preview' }).graph;
  assert.equal(withEntity.companies.find((c) => c.id === 'org_example_one').entity_id, 'org_example_one');
});

test('config problems are reported, not guessed', () => {
  const broken = compileConfig({
    catalogue,
    aliases: {
      makers: { 'No Such Lab': { names: ['X'] }, 'Example Labs 1': { names: ['Example Labs 2'] } },
      robots: { 1: { lab: 'Example Labs 1', robot: 'Renamed' }, 99: { lab: 'Gone', robot: 'Gone' } },
    },
  });
  assert.equal(broken.problems.length, 4);
});

// Synthetic Deployments rows with structured values for the import path (the default fixture uses fx_ values).
function workbookWithDeployments(n) {
  const values = fixtureWorkbook({ rowsPerTab: 12 });
  const spec = DATASETS_BY_ID.get('deployments');
  const rows = [spec.headers];
  for (let i = 1; i <= n; i += 1) {
    const r = row(i, { robot_model: i % 2 ? 'Strider 5' : 'Strider 4X' });
    rows.push(spec.headers.map((h) => r[h] ?? `fx_${h}_${i}`));
  }
  values[spec.tab] = rows;
  return values;
}

test('import builds both graphs; the preview graph holds only the 10 public rows; access is checked', async () => {
  const ctx = await setup({ workbook: workbookWithDeployments(14) });
  // Imported without a config: relations are not ready.
  assert.equal((await ctx.call('GET', '/v1/relations/preview')).status, 503);

  const imported = await runImport(ctx.db, workbookWithDeployments(14), T0, { relationsConfig: config });
  assert.equal(imported.ok, true);
  assert.deepEqual([imported.relations.ok, imported.relations.coverage.records, imported.relations.coverage.robot_model], [true, 14, 7]);

  const preview = await ctx.call('GET', '/v1/relations/preview');
  assert.equal(preview.status, 200);
  assert.match(preview.headers.get('cache-control'), /public/);
  const pg = await preview.json();
  assert.equal(pg.scope, 'preview');
  assert.deepEqual(pg.records.map((r) => r.record_id), Array.from({ length: 10 }, (_, i) => `fx_rec_${i + 1}`));
  assert.ok(!JSON.stringify(pg).includes('fx_rec_11') && !JSON.stringify(pg).includes('org_fx_op_12'));
  assert.equal(pg.robots.length, catalogue.length);

  assert.equal((await ctx.call('GET', '/v1/relations')).status, 401);
  const { session, accountId } = await signIn(ctx);
  assert.equal((await ctx.call('GET', '/v1/relations', { token: session })).status, 403);
  await upsertStripeEntitlement(ctx.db, {
    accountId, subscriptionId: 'sub_fx', status: 'active', currentPeriodEnd: T0 + 365 * 86400, cancelAtPeriodEnd: false, eventCreated: T0, now: T0,
  });
  const full = await ctx.call('GET', '/v1/relations', { token: session });
  assert.equal(full.status, 200);
  assert.match(full.headers.get('cache-control'), /private/);
  const fg = await full.json();
  assert.equal(fg.records.length, 14);
  assert.equal(fg.coverage.robot_model, 7);

  // A later import without a config reuses the last reviewed one; an invalid config fails the whole import.
  const again = await runImport(ctx.db, workbookWithDeployments(14), T0 + 60);
  assert.equal(again.relations.ok, true);
  const bad = await runImport(ctx.db, workbookWithDeployments(14), T0 + 120, { relationsConfig: { aliases: {}, catalogue: [] } });
  assert.deepEqual([bad.ok, bad.error], [false, 'invalid_relations_config']);
  assert.equal((await (await ctx.call('GET', '/v1/relations/preview')).json()).records.length, 10);
});

// Approved split, phase 1 (17 Nov 2026): the public projection holds every company, with allowlisted values only, and
// the visitor search finds company dossiers through it, never a reserved value.
const RESERVED = ['site_name', 'city', 'region', 'environment', 'relationship_type', 'commercial_status', 'observed_end', 'task_id', 'task_description',
  'workflow_from', 'workflow_to', 'integration_dependencies', 'metric_name', 'metric_value', 'metric_unit', 'metric_period', 'claim_id', 'claim_text',
  'claim_type', 'evidence_level', 'confidence', 'verification_status', 'source_id', 'source_title', 'source_url', 'source_publisher', 'source_role',
  'source_type', 'publication_date', 'accessed_at', 'language', 'open_questions_notes'];
test('public projection: every company, allowlisted values only; visitor search finds dossiers, never reserved values', async () => {
  const spec = DATASETS_BY_ID.get('deployments');
  const rows = Array.from({ length: 14 }, (_, k) => {
    const r = row(k + 1, { robot_model: (k + 1) % 2 ? 'Strider 5' : 'Strider 4X', operational_status: k === 11 ? 'planned' : 'pilot' });
    return Object.fromEntries(spec.headers.map((h) => [h, r[h] ?? `fx_${h}_${k + 1}`]));
  });
  const { graph } = buildGraph(compileConfig(config), { rows, entities: [], scope: 'full' });
  const p = publicProjection({ graph, rows });
  const text = JSON.stringify(p);
  for (const f of RESERVED) assert.ok(!text.includes(`fx_${f}_`), `projection holds ${f}`);
  assert.ok(!/fx_rec_|fx_dep_/.test(text), 'projection holds record or deployment ids');
  const walk = (v, parent) => {
    if (Array.isArray(v)) return v.forEach((x) => walk(x, parent));
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (parent !== 'roles' && parent !== 'robots') assert.ok(ALLOWED_KEYS.has(k), `key ${k} not allowlisted`);
      walk(x, k);
    }
  };
  walk(p, null);
  assert.equal(p.totals.records, 14);
  assert.equal(p.companies.filter((c) => c.as_organisation).length, 14);
  const op12 = p.companies.find((c) => c.id === 'org_fx_op_12');
  assert.deepEqual([op12.slug, op12.as_organisation.records, op12.as_organisation.status.ann], ['fx-op-12', 1, 1]);
  assert.equal(op12.as_organisation.counterparts[0].name, 'Example One Robotics');

  const ctx = await setup({ workbook: workbookWithDeployments(14) });
  const res = await runImport(ctx.db, workbookWithDeployments(14), T0 + 60, { relationsConfig: config });
  assert.equal(res.ok, true);
  const vis = await (await ctx.call('GET', '/v1/search?q=Operator%2012')).json();
  assert.equal(vis.scope, 'preview');
  const hit = vis.results.find((r) => r.category === 'companies');
  assert.equal(hit?.link, '/companies/fx-op-12/');
  assert.equal(hit.category_title, 'Companies');
  for (const q of ['fx_site_name_12', 'fx_task_description_12', 'fx_claim_text_12', 'fx_open_questions_notes_12']) {
    assert.equal((await (await ctx.call('GET', `/v1/search?q=${q}`)).json()).total, 0, `visitor finds ${q}`);
  }
  const { session, accountId } = await signIn(ctx);
  await upsertStripeEntitlement(ctx.db, { accountId, subscriptionId: 'sub_fx', status: 'active', currentPeriodEnd: T0 + 365 * 86400, cancelAtPeriodEnd: false, eventCreated: T0, now: T0 });
  const full = await (await ctx.call('GET', '/v1/search?q=Operator%2012', { token: session })).json();
  assert.equal(full.scope, 'full');
  assert.equal(full.results.find((r) => r.category === 'companies')?.link, 'company/org_fx_op_12');
});

test('selected evidence: one record by the fixed rule, allowlisted fields only, never claim text, notes or ids', () => {
  const spec = DATASETS_BY_ID.get('deployments');
  const mk = (i, over) => { const r = row(i, { organization_id: 'org_fx_ev', organization_name: 'Evidence Org', source_url: `https://example.com/src/${i}`, verification_status: 'vendor_reported', source_role: 'manufacturer', ...over }); return Object.fromEntries(spec.headers.map((h) => [h, r[h] ?? `fx_${h}_${i}`])); };
  const rows = [
    mk(1, { operational_status: 'planned', publication_date: '2026-05-01' }),
    mk(2, { operational_status: 'pilot', publication_date: '2025-01-01', source_role: 'news_media' }),
    mk(3, { operational_status: 'pilot', publication_date: '2024-01-01' }),
    mk(4, { operational_status: 'operational', verification_status: 'unresolved' }),
    mk(5, { operational_status: 'operational', source_url: 'not a link' }),
  ];
  const { graph } = buildGraph(compileConfig(config), { rows, entities: [], scope: 'full' });
  const e = publicProjection({ graph, rows }).companies.find((c) => c.id === 'org_fx_ev').evidence;
  // Unresolved and link-less records are not eligible; among pilots, the primary source beats the newer press report.
  assert.equal(e.source_url, 'https://example.com/src/3');
  assert.equal(e.status, 'pilot');
  for (const k of Object.keys(e)) assert.ok(EVIDENCE_KEYS.has(k), `evidence key ${k}`);
  const text = JSON.stringify(e);
  for (const f of ['claim_text', 'open_questions_notes', 'confidence', 'integration_dependencies', 'claim_id', 'task_id', 'source_id']) assert.ok(!text.includes(`fx_${f}_`), f);
  assert.ok(!/fx_rec_|fx_dep_/.test(text));
});
