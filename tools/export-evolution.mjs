#!/usr/bin/env node
// Writes data/evolution/charts.json: the seven evolution charts (Humanoids, Deployments, Components, Integrators,
// Datasets, Benchmarks, Reports) from the public snapshots and the reviewed date decisions (tools/evolution-review.json).
// The section pages and the home carousel are rendered from this file by tools/build-pages.mjs and tools/build-site.mjs.
//   node tools/export-evolution.mjs           rebuild the snapshot
//   node tools/export-evolution.mjs --check   fail if it is out of date or a reviewed excerpt no longer matches
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildEvolution } from './evolution-model.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
export function evolutionSources() {
  return {
    review: read('tools/evolution-review.json'),
    humanoids: read('data/humanoids-catalogue.json'),
    deployments: read('data/preview/deployments.json'),
    hardware: read('data/preview/hardware.json'),
    integrators: read('data/integrators/atlas.json'),
    datasets: read('data/datasets/atlas.json'),
    benchmarks: read('data/benchmarks/atlas.json'),
    reports: read('data/reports/atlas.json'),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = new URL('data/evolution/charts.json', root);
  const next = `${JSON.stringify(buildEvolution(evolutionSources()), null, 1)}\n`;
  if (process.argv.includes('--check')) {
    if (!existsSync(out) || readFileSync(out, 'utf8') !== next) {
      console.error('data/evolution/charts.json is out of date. Run node tools/export-evolution.mjs');
      process.exit(1);
    }
    console.log('data/evolution/charts.json is up to date.');
  } else {
    mkdirSync(new URL('data/evolution/', root), { recursive: true });
    writeFileSync(out, next);
    const doc = JSON.parse(next);
    for (const c of doc.charts) console.log(`${c.label.padEnd(12)} ${c.status.padEnd(9)} ${c.coverage.included}/${c.coverage.total} ${c.coverage.unit} · ${c.summary}`);
  }
}
