#!/usr/bin/env node
// Robot Learning Data Atlas snapshot (23 Nov 2026). Reads a PRIVATE workbook export (kept outside Git), normalises the
// Datasets and Dataset Metrics tabs exactly as the backend import does (server/src/datasets.js specs, normalizeTab:
// withheld editorial columns, private links redacted, editorial clauses removed), validates them together
// (server/src/data-atlas/atlas.js: ids, metric and parent foreign keys, benchmark links, numbers, qualifiers, units,
// compatible groups, split versus total, reviewed vocabulary) and writes the public snapshot data/datasets/atlas.json,
// allowlisted fields only, with the workbook export time kept apart from the source dates. The Benchmarks tab is read
// only for the ids and names of the benchmarks a dataset links to; other tabs are not read.
//
//   node --no-warnings tools/export-datasets.mjs --from <export.json> --exported-at <ISO time of the workbook export>
//   node tools/export-datasets.mjs --check        validates the committed snapshot without the source

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DATASETS_BY_ID, tabValues } from '../server/src/datasets.js';
import { normalizeTab } from '../server/src/import/normalize.js';
import { atlasProblems, buildAtlas, snapshotProblems } from '../server/src/data-atlas/atlas.js';
import { atlasProblems as benchmarkProblems } from '../server/src/benchmarks/atlas.js';

const root = new URL('../', import.meta.url);
const FILE = new URL('data/datasets/atlas.json', root);
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);

export function atlasFromExport(values, { exportedAt, builtAt }) {
  const rows = (id) => normalizeTab(DATASETS_BY_ID.get(id), tabValues(values, DATASETS_BY_ID.get(id))).rows.filter((r) => r.visibility === 'customer').map((r) => r.data);
  const catalogue = rows('datasets');
  const metrics = rows('dataset-metrics');
  const benchmarks = rows('benchmarks');
  const problems = [
    ...atlasProblems(catalogue, metrics, { benchmarkIds: benchmarks.map((b) => b.benchmark_id) }),
    // The reciprocal links, as the import checks them: a benchmark that names a dataset is named back.
    ...benchmarkProblems(benchmarks, rows('benchmark-results'), catalogue).filter((p) => /Datasets|RELATED_DATASET_IDS|related dataset/i.test(p)),
  ];
  if (problems.length) throw new Error(`atlas validation failed:\n- ${problems.join('\n- ')}`);
  const atlas = buildAtlas({ catalogue, metrics, benchmarks, exportedAt, builtAt });
  const snap = snapshotProblems(atlas);
  if (snap.length) throw new Error(`snapshot outside the allowlist:\n- ${snap.join('\n- ')}`);
  return atlas;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const from = arg('--from');
  if (from) {
    const exportedAt = arg('--exported-at');
    if (!exportedAt || Number.isNaN(Date.parse(exportedAt))) { console.error('--exported-at <ISO time of the workbook export> is required'); process.exit(2); }
    const atlas = atlasFromExport(JSON.parse(readFileSync(from, 'utf8')), { exportedAt: new Date(exportedAt).toISOString(), builtAt: new Date().toISOString() });
    mkdirSync(new URL('data/datasets/', root), { recursive: true });
    writeFileSync(FILE, `${JSON.stringify(atlas, null, 1)}\n`);
    const c = atlas.counts;
    console.log(`Wrote data/datasets/atlas.json: ${c.resources} resources (${c.corpora} corpora), ${c.quantities} quantities from ${c.resources_with_quantities} resources, ${c.resources_awaiting_quantities} awaiting extraction, ${c.benchmark_links} benchmark links.`);
  } else if (process.argv.includes('--check')) {
    const problems = snapshotProblems(JSON.parse(readFileSync(FILE, 'utf8')));
    if (problems.length) { console.error(`Data atlas snapshot check FAILED:\n- ${problems.join('\n- ')}`); process.exit(1); }
    console.log('Data atlas snapshot holds allowlisted fields only and its counts match its rows.');
  } else {
    console.error('usage: node tools/export-datasets.mjs --from <export.json> --exported-at <ISO> | --check');
    process.exit(2);
  }
}
