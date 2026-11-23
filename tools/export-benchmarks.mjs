#!/usr/bin/env node
// Robotics Evaluation Atlas snapshot (23 Nov 2026). Reads a PRIVATE workbook export (kept outside Git), normalises the
// Benchmarks and Benchmark Results tabs exactly as the backend import does (server/src/datasets.js specs, normalizeTab),
// validates them together (server/src/benchmarks/atlas.js: ids, foreign keys including the Datasets tab both ways,
// numbers, native scales, comparability groups, reviewed vocabulary) and writes the public snapshot:
// data/benchmarks/atlas.json, allowlisted fields only, with the workbook export time kept apart from the source dates.
// Only these two tabs are read for content; other tabs of the export are not published by this tool.
//
//   node --no-warnings tools/export-benchmarks.mjs --from <export.json> --exported-at <ISO time of the workbook export>
//   node tools/export-benchmarks.mjs --check        validates the committed snapshot without the source

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DATASETS_BY_ID, tabValues } from '../server/src/datasets.js';
import { normalizeTab } from '../server/src/import/normalize.js';
import { atlasProblems, buildAtlas, snapshotProblems } from '../server/src/benchmarks/atlas.js';

const root = new URL('../', import.meta.url);
const FILE = new URL('data/benchmarks/atlas.json', root);
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);

// The Datasets tab, read only for its DATASET_ID / RELATED_BENCHMARK_IDS links and the public name and URL of the
// datasets a benchmark names. Its own import contract is unchanged here.
function datasetsTab(values) {
  const rows = values.Datasets;
  if (!rows?.length) return null;
  const h = rows[0].map((x) => String(x ?? '').trim().toLowerCase());
  if (!h.includes('dataset_id')) return null;
  return rows.slice(1).filter((r) => r.some((v) => String(v ?? '').trim())).map((r) => Object.fromEntries(h.map((k, i) => [k, String(r[i] ?? '').trim() || null])));
}

export function atlasFromExport(values, { exportedAt, builtAt }) {
  const rows = (id) => normalizeTab(DATASETS_BY_ID.get(id), tabValues(values, DATASETS_BY_ID.get(id))).rows.filter((r) => r.visibility === 'customer').map((r) => r.data);
  const catalogue = rows('benchmarks');
  const results = rows('benchmark-results');
  const datasets = datasetsTab(values);
  const problems = atlasProblems(catalogue, results, datasets);
  if (problems.length) throw new Error(`atlas validation failed:\n- ${problems.join('\n- ')}`);
  const atlas = buildAtlas({ catalogue, results, datasets: datasets ?? [], exportedAt, builtAt });
  const snap = snapshotProblems(atlas);
  if (snap.length) throw new Error(`snapshot outside the allowlist:\n- ${snap.join('\n- ')}`);
  return { atlas, datasetsChecked: Boolean(datasets) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const from = arg('--from');
  if (from) {
    const exportedAt = arg('--exported-at');
    if (!exportedAt || Number.isNaN(Date.parse(exportedAt))) { console.error('--exported-at <ISO time of the workbook export> is required'); process.exit(2); }
    const { atlas, datasetsChecked } = atlasFromExport(JSON.parse(readFileSync(from, 'utf8')), { exportedAt: new Date(exportedAt).toISOString(), builtAt: new Date().toISOString() });
    mkdirSync(new URL('data/benchmarks/', root), { recursive: true });
    writeFileSync(FILE, `${JSON.stringify(atlas, null, 1)}\n`);
    const c = atlas.counts;
    console.log(`Wrote data/benchmarks/atlas.json: ${c.resources} resources, ${c.observations} observations from ${c.resources_with_results} resources, ${c.resources_awaiting_results} awaiting extraction; Datasets links ${datasetsChecked ? 'checked both ways' : 'not checked (no DATASET_ID column)'}.`);
  } else if (process.argv.includes('--check')) {
    const problems = snapshotProblems(JSON.parse(readFileSync(FILE, 'utf8')));
    if (problems.length) { console.error(`Atlas snapshot check FAILED:\n- ${problems.join('\n- ')}`); process.exit(1); }
    console.log('Atlas snapshot holds allowlisted fields only and its counts match its rows.');
  } else {
    console.error('usage: node tools/export-benchmarks.mjs --from <export.json> --exported-at <ISO> | --check');
    process.exit(2);
  }
}
