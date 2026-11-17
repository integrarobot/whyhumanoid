#!/usr/bin/env node
// Public projection for the static site (approved split, phase 1, 17 Nov 2026). Reads a PRIVATE workbook export,
// builds the full relations graph with the reviewed config and keeps only what server/src/public/projection.js
// allows: the same module the Worker uses for the visitor search. Writes data/public/projection.json, which
// tools/build-pages.mjs turns into robot and company pages. The export itself never enters Git.
//
//   node --no-warnings tools/export-public.mjs --from <export.json>    write data/public/projection.json
//   node tools/export-public.mjs --check                               the file holds allowlisted keys only

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relationsConfig } from './relations.mjs';
import { buildGraph, compileConfig } from '../server/src/relations/graph.js';
import { ALLOWED_KEYS, publicProjection } from '../server/src/public/projection.js';

const root = new URL('../', import.meta.url);
const FILE = new URL('data/public/projection.json', root);

// Keys under "roles" (role names) and the top-level "robots" map (catalogue ids) are data, not field names.
export function projectionProblems(p) {
  const problems = [];
  const walk = (v, parent, path) => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, parent, `${path}[${i}]`));
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      const dynamic = (parent === 'roles' && /^[a-z_]+$/.test(k)) || (path === '.robots' && /^\d+$/.test(k));
      if (!dynamic && !ALLOWED_KEYS.has(k)) problems.push(`${path}.${k}: key not in the allowlist`);
      walk(x, k, `${path}.${k}`);
    }
  };
  walk(p, null, '');
  if (/\b(?:rec|clm|dep|lnk|src|mdl|res)_[a-z0-9]+_[a-z0-9_]+\b/.test(JSON.stringify(p))) problems.push('holds a premium-style record id');
  return problems;
}

async function exportFrom(file) {
  const { DATASETS_BY_ID } = await import('../server/src/datasets.js');
  const { normalizeTab } = await import('../server/src/import/normalize.js');
  const values = JSON.parse(readFileSync(file, 'utf8'));
  const tab = (id) => {
    const spec = DATASETS_BY_ID.get(id);
    return normalizeTab(spec, values[spec.tab]).rows.filter((r) => r.visibility === 'customer').map((r) => r.data);
  };
  const rows = tab('deployments');
  const entities = tab('entities');
  const snapshot = JSON.parse(readFileSync(new URL('data/preview/index.json', root), 'utf8')).snapshot ?? null;
  const { graph } = buildGraph(compileConfig(relationsConfig()), { rows, entities, scope: 'full', snapshot });
  const p = publicProjection({ graph, rows, entities });
  const problems = projectionProblems(p);
  if (problems.length) throw new Error(`projection outside the allowlist:\n- ${problems.join('\n- ')}`);
  mkdirSync(new URL('data/public/', root), { recursive: true });
  writeFileSync(FILE, `${JSON.stringify(p, null, 1)}\n`);
  console.log(`Wrote data/public/projection.json: ${p.companies.length} companies, ${Object.keys(p.robots).length} robots with records, ${p.totals.records} records (counts only).`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const at = process.argv.indexOf('--from');
  if (at > 0) await exportFrom(process.argv[at + 1]);
  else if (process.argv.includes('--check')) {
    const problems = projectionProblems(JSON.parse(readFileSync(FILE, 'utf8')));
    if (problems.length) { console.error(`Public projection check FAILED:\n- ${problems.join('\n- ')}`); process.exit(1); }
    console.log('Public projection holds allowlisted keys only.');
  } else {
    console.error('usage: node tools/export-public.mjs --from <export.json> | --check');
    process.exit(2);
  }
}
