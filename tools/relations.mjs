#!/usr/bin/env node
// Relations between Deployments, catalogue robots and companies (server/src/relations/graph.js).
//
//   node tools/relations.mjs --config            JSON sent with every import: reviewed aliases + public robot index
//   node tools/relations.mjs --check             aliases match the catalogue; the page's preview relations are current
//   node tools/relations.mjs --from <export>     review report on a private workbook export (stdout only, never Git)
//
// The import workflow posts --config to the Worker, which builds the full and the preview graphs from the imported
// rows, so relations are regenerated with every import and never edited by hand.

import { readFileSync } from 'node:fs';
import { buildData } from './build-site.mjs';
import { buildGraph, compileConfig, robotSlug } from '../server/src/relations/graph.js';

const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const NA = /^(not\b|to be (confirmed|identified)|same entity|do not add)/i;

// Public robot index: record values (for matching) and the page's display facets (for names and anchors).
export function catalogueIndex() {
  const exported = read('data/humanoids-catalogue.json');
  const overrides = read('tools/humanoids-facet-overrides.json').overrides;
  const { models } = buildData(exported, overrides, null);
  const byId = new Map(exported.records.map((r) => [r.id, r]));
  return models.map((m) => {
    const r = byId.get(m.id);
    const name = !m.robot || NA.test(m.robot) || m.robot === 'Unnamed' ? 'Undisclosed model' : m.robot;
    return { id: m.id, Lab: r.Lab, Robot: r.Robot, lab: m.lab, robot: name, slug: robotSlug(m.id, m.lab, m.robot) };
  });
}

export function relationsConfig() {
  return { aliases: read('tools/relations-aliases.json'), catalogue: catalogueIndex() };
}

// The free robot pages may show only what the public rows say: every Deployments and Entities row at its public
// fields (server/src/access/fields.js), already published in data/preview/.
export function previewGraph(config = relationsConfig()) {
  const deployments = read('data/preview/deployments.json');
  const entities = read('data/preview/entities.json');
  const compiled = compileConfig(config);
  const strip = (r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== '_row'));
  return buildGraph(compiled, { rows: deployments.rows.map(strip), entities: entities.rows.map(strip), scope: 'preview', snapshot: deployments.snapshot });
}

// What index.html embeds: per catalogue robot, the preview records linked to it, with the public fields its page shows.
// Records are referred to by their preview row (1 to 10) and grouped by deployment with a small number, so the page
// carries no record identifiers (tools/check-public.mjs keeps those to data/preview/).
// Public fields only (server/src/access/fields.js, 24 Nov 2026): what a public page may show of a Deployments record.
export const PAGE_FIELDS = [
  'organization_name', 'organization_role', 'country', 'task_category', 'operational_status',
  'verification_status', 'source_url', 'source_publisher', 'source_title', 'publication_date',
  'manufacturer', 'robot_model', 'robot_version',
];
export function pageRelations() {
  const { graph } = previewGraph();
  const rows = new Map(read('data/preview/deployments.json').rows.map((r) => [r.record_id, r]));
  const groups = [...new Set(graph.records.map((r) => r.deployment_id ?? r.record_id))];
  const byRobot = {};
  for (const rec of graph.records) {
    if (rec.robot === null) continue;
    const row = rows.get(rec.record_id);
    (byRobot[rec.robot] ??= []).push({ row: row._row, group: groups.indexOf(rec.deployment_id ?? rec.record_id), level: rec.level, ...Object.fromEntries(PAGE_FIELDS.map((f) => [f, row[f] ?? null])) });
  }
  return { scope: 'preview', preview_rows: graph.records.length, snapshot: graph.snapshot, robots: byRobot };
}

function check() {
  const problems = [];
  const config = relationsConfig();
  problems.push(...compileConfig(config).problems);
  const { graph } = previewGraph(config);
  const previewIds = new Set(read('data/preview/deployments.json').rows.map((r) => r.record_id));
  if (graph.records.some((r) => !previewIds.has(r.record_id))) problems.push('preview graph holds a record outside the 10 public rows');
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const data = JSON.parse(/<script[^>]*id="data"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1]);
  const expected = pageRelations();
  if (JSON.stringify(data.relations) !== JSON.stringify(expected)) problems.push('index.html relations are not the build of the preview; run node tools/build-site.mjs');
  const previewRows = new Set(read('data/preview/deployments.json').rows.map((r) => r._row));
  for (const list of Object.values(data.relations?.robots ?? {})) for (const r of list) if (!previewRows.has(r.row)) problems.push(`index.html links preview row ${r.row}, which is not a public preview row`);
  if (problems.length) {
    console.error(`Relations check FAILED:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  const c = graph.coverage;
  console.log(`Relations check passed: aliases match ${config.catalogue.length} catalogue robots; preview ${c.records} records, ${c.robot_model + c.robot_family} linked to a robot, ${c.maker_only} at the maker only.`);
}

async function report(file) {
  const { DATASETS_BY_ID, tabValues } = await import('../server/src/datasets.js');
  const { normalizeTab } = await import('../server/src/import/normalize.js');
  const values = JSON.parse(readFileSync(file, 'utf8'));
  const tab = (id) => {
    const spec = DATASETS_BY_ID.get(id);
    return normalizeTab(spec, tabValues(values, spec)).rows.filter((r) => r.visibility === 'customer').map((r) => r.data);
  };
  const config = relationsConfig();
  const { graph, report: rep } = buildGraph(compileConfig(config), { rows: tab('deployments'), entities: tab('entities'), scope: 'full' });
  const fmt = (c) => `${String(c.records).padStart(3)}  ${c.manufacturer} | ${c.robot_model} | ${c.robot_version}  ->  ${c.robot !== null ? `robot ${c.robot} (${c.level})` : c.maker ? `maker ${c.maker}; ${c.reason}` : c.reason}`;
  console.log(JSON.stringify(rep.coverage, null, 1));
  console.log('\nRobot links by reason:', rep.robot_reasons);
  console.log('Maker resolution:', rep.maker_reasons);
  console.log('Organisation resolution:', rep.operator_reasons);
  console.log('\nManufacturer | model | version, as recorded:');
  for (const c of rep.combinations) console.log(fmt(c));
  console.log('\nMakers outside the catalogue, grouped by their recorded name:', rep.makers_as_recorded.join(', ') || 'none');
  console.log('Organisations merged with a maker by exact name:', rep.merged_by_name);
  console.log('Organisation ids recorded with several names:', rep.organisations_with_several_names);
  console.log('Config problems:', rep.config_problems.length ? rep.config_problems : 'none');
  console.log(`\nRobots with records: ${graph.coverage.robots_with_records}; companies with records: ${graph.coverage.companies_with_records}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
  if (process.argv.includes('--config')) process.stdout.write(`${JSON.stringify(relationsConfig())}\n`);
  else if (process.argv.includes('--check')) check();
  else if (arg('--from')) await report(arg('--from'));
  else {
    console.error('usage: node tools/relations.mjs --config | --check | --from <export.json>');
    process.exit(2);
  }
}
