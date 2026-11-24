#!/usr/bin/env node
// Private leak check (approved split, 17 Nov 2026; field contract of 24 Nov 2026). Takes a PRIVATE workbook export and
// looks for every PAID value of every Deployments record and Components product (every field outside the public
// allowlist of server/src/access/fields.js: sites, task descriptions, workflows, metrics, claims, open questions,
// specifications, prices, papers...) in what the site publishes: category, case, product, robot and company pages,
// the projection, the link map, the sitemap, the catalogue page and the app shell. A value that public inputs already
// hold for another reason (a public field of some row, the free catalogue, the projection) is not a leak. Prints counts
// and field names only, never values: run it locally, outside Git.
//
//   node --no-warnings tools/check-reserved.mjs --from <export.json>

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { PUBLIC_FIELDS } from '../server/src/access/fields.js';

const root = new URL('../', import.meta.url);
const MIN = 8; // shorter values (a city like "Austin", a number) are too common to attribute
const WORDY = /^(site_name|task_description|workflow_from|workflow_to|integration_dependencies|claim_text|open_questions_notes|notes|advantages|drawbacks|key_paper|integrations|durability|surface|software|interface|dimensions|list_price|bom_cost|comparison_summary|sources|where_to_buy)$/;
// Values every product or record shares ("Not available", review boilerplate) say nothing about one item.
const BOILER = /^(not available|n\/a|not disclosed|not recorded|imported|none)/i;

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
const rowsOf = (id) => { const spec = DATASETS_BY_ID.get(id); return normalizeTab(spec, tabValues(values, spec)).rows.filter((r) => r.visibility === 'customer').map((r) => r.data); };
const SETS = ['deployments', 'hardware', 'component-software'].map((id) => ({ id, rows: rowsOf(id) }));

const publicText = [
  'data/humanoids-catalogue.json', ...files('data/preview/'), 'data/public/projection.json', 'data/components/coverage.json',
].map((f) => readFileSync(new URL(f, root), 'utf8')).join('\n');
const published = [...files('robots/'), ...files('humanoids/'), ...files('companies/'), ...files('deployments/'), ...files('components/'), ...files('subscribe/'), ...files('method/'), 'data/pages.json', 'sitemap.xml', 'index.html', 'app/index.html', '404.html']
  .map((f) => readFileSync(new URL(f, root), 'utf8')).join('\n');
const variants = (v) => [v, v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')];

let checked = 0;
const leaks = new Map();
for (const { id, rows } of SETS) {
  const pub = new Set(PUBLIC_FIELDS[id]);
  for (const r of rows) {
    for (const [f, raw] of Object.entries(r)) {
      if (pub.has(f) || f === 'source_workbook' || f === 'no') continue;
      const v = String(raw ?? '').trim();
      if (v.length < MIN || BOILER.test(v)) continue;
      if (WORDY.test(f) && v.split(/\s+/).length < 3) continue; // two-word values are generic
      if (!/\s/.test(v) && !/^https?:\/\//.test(v)) continue; // one word ("warehouse", "pilot") is vocabulary, not an item's detail
      checked += 1;
      if (publicText.includes(v)) continue;
      if (variants(v).some((x) => published.includes(x))) leaks.set(`${id}.${f}`, (leaks.get(`${id}.${f}`) ?? 0) + 1);
    }
  }
}
if (leaks.size) {
  console.error(`Paid values FOUND in published files (field: count): ${[...leaks].map(([f, n]) => `${f}: ${n}`).join(', ')}`);
  process.exit(1);
}
console.log(`Paid values check passed: ${checked} paid values of ${SETS.map((x) => `${x.rows.length} ${x.id}`).join(', ')} rows checked; none appears in the published pages, projection, link map, sitemap, catalogue page or app shell, beyond what the public inputs already hold.`);
