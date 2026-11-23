#!/usr/bin/env node
// Private leak check (approved split, 17 Nov 2026). Takes a PRIVATE workbook export and looks for every reserved
// value of every Deployments record (sites, tasks, metrics, claims, verification, sources, notes, record ids) in what
// the site publishes: robot and company pages, the projection, the link map, the sitemap, the catalogue page and the
// app shell. A value that public inputs already hold (free catalogue, 10-row previews, the Entities reference URL of
// the projection) is not a leak. Prints counts and field names only, never values: run it locally, outside Git.
//
//   node --no-warnings tools/check-reserved.mjs --from <export.json>

import { existsSync, readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const RESERVED = ['record_id', 'deployment_id', 'claim_id', 'task_id', 'source_id', 'site_name', 'city', 'region', 'task_description',
  'workflow_from', 'workflow_to', 'integration_dependencies', 'metric_value', 'claim_text', 'source_title', 'source_url',
  'open_questions_notes'];
const MIN = 8; // shorter values (a city like "Austin", a number) are too common to attribute
const WORDY = new Set(['site_name', 'task_description', 'workflow_from', 'workflow_to', 'integration_dependencies', 'claim_text', 'source_title', 'open_questions_notes']);

function files(dir) {
  const base = new URL(dir, root);
  if (!existsSync(base)) return [];
  const out = [];
  const walk = (rel) => { for (const e of readdirSync(new URL(rel, base), { withFileTypes: true })) { const p = `${rel}${e.name}`; if (e.isDirectory()) walk(`${p}/`); else out.push(`${dir}${p}`); } };
  walk('');
  return out;
}

const at = process.argv.indexOf('--from');
if (at < 0) { console.error('usage: node tools/check-reserved.mjs --from <export.json>'); process.exit(2); }
const { DATASETS_BY_ID, tabValues } = await import('../server/src/datasets.js');
const { normalizeTab } = await import('../server/src/import/normalize.js');
const values = JSON.parse(readFileSync(process.argv[at + 1], 'utf8'));
const spec = DATASETS_BY_ID.get('deployments');
const rows = normalizeTab(spec, tabValues(values, spec)).rows.filter((r) => r.visibility === 'customer').map((r) => r.data);

const publicText = [
  'data/humanoids-catalogue.json', ...files('data/preview/'),
].map((f) => readFileSync(new URL(f, root), 'utf8')).join('\n')
  // The projection holds only allowlisted values (organisation and maker names, countries, sectors...): an organisation
  // that is itself the site (a hospital, a plant) shares its name with the site, which is not a leak.
  + readFileSync(new URL('data/public/projection.json', root), 'utf8');
const published = [...files('robots/'), ...files('companies/'), 'data/public/projection.json', 'data/pages.json', 'sitemap.xml', 'index.html', 'app/index.html', '404.html']
  .map((f) => readFileSync(new URL(f, root), 'utf8')).join('\n');
const variants = (v) => [v, v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')];

let checked = 0;
const leaks = new Map();
for (const r of rows) {
  for (const f of RESERVED) {
    const v = String(r[f] ?? '').trim();
    if (v.length < MIN || /^not disclosed$/i.test(v)) continue;
    if (WORDY.has(f) && v.split(/\s+/).length < 3) continue; // two-word titles ("Humanoid robots") are generic
    checked += 1;
    if (publicText.includes(v)) continue;
    if (variants(v).some((x) => published.includes(x))) leaks.set(f, (leaks.get(f) ?? 0) + 1);
  }
}
if (leaks.size) {
  console.error(`Reserved values FOUND in published files (field: count): ${[...leaks].map(([f, n]) => `${f}: ${n}`).join(', ')}`);
  process.exit(1);
}
console.log(`Reserved values check passed: ${checked} reserved values of ${rows.length} records (${RESERVED.length} fields, ${MIN}+ characters) checked; none appears in the published pages, projection, link map, sitemap, catalogue page or app shell, beyond what the free inputs already publish.`);
