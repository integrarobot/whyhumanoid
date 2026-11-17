// Relations between Deployments records, catalogue robots and companies. Synthetic names only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, compileConfig, robotSlug } from '../src/relations/graph.js';
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
