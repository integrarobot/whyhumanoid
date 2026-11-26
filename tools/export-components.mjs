#!/usr/bin/env node
// Components coverage snapshot (23 Nov 2026). Components is a subscription category: the site publishes every product at its public fields (24 Nov 2026); before, the first 10
// product rows (data/preview/hardware.json, tools/export-database.mjs) and, from every row, only counts. This tool
// reads a PRIVATE workbook export (kept outside Git), normalises the Components tab exactly as the import does
// (product table and related software block, server/src/components/catalogue.js), validates it and writes
// data/components/coverage.json: totals by availability class, sensing approach and family, the reference count and
// the stable component ids (for the per-product addresses). No name, maker, value or source of any product is in it.
//
//   node --no-warnings tools/export-components.mjs --from <export.json> --exported-at <ISO time of the workbook export>
//   node tools/export-components.mjs --check

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { DATASETS_BY_ID, tabValues } from '../server/src/datasets.js';
import { normalizeTab } from '../server/src/import/normalize.js';
import { componentBlocks, componentProblems } from '../server/src/components/catalogue.js';

const root = new URL('../', import.meta.url);
const FILE = new URL('data/components/coverage.json', root);
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);

export function componentsCore() {
  if (!globalThis.WHComponents) vm.runInThisContext(readFileSync(new URL('assets/components-core.js', root), 'utf8'));
  return globalThis.WHComponents;
}

const KEYS = ['title', 'note', 'snapshot', 'counts', 'ids'];
const COUNT_KEYS = ['products', 'software', 'references', 'by_class', 'by_principle', 'by_family', 'by_component_class', 'by_review', 'notes_rows'];
export function coverageProblems(c) {
  const problems = [];
  for (const k of Object.keys(c)) if (!KEYS.includes(k)) problems.push(`field ${k} is not public`);
  for (const k of Object.keys(c.counts ?? {})) if (!COUNT_KEYS.includes(k)) problems.push(`count ${k} is not public`);
  const sum = (o) => Object.values(o ?? {}).reduce((n, v) => n + v, 0);
  if (sum(c.counts?.by_class) !== c.counts?.products) problems.push('by_class does not add up to the products');
  if (sum(c.counts?.by_principle) !== c.counts?.products) problems.push('by_principle does not add up to the products');
  if (sum(c.counts?.by_family) !== c.counts?.products) problems.push('by_family does not add up to the products');
  for (const k of ['by_component_class', 'by_review']) if (c.counts?.[k] && sum(c.counts[k]) !== c.counts.products) problems.push(`${k} does not add up to the products`);
  if ((c.ids?.products ?? []).length !== c.counts?.products || (c.ids?.software ?? []).length !== c.counts?.software) problems.push('ids do not match the counts');
  for (const id of [...(c.ids?.products ?? []), ...(c.ids?.software ?? [])]) if (!/^CMP-[A-Z]{3}-\d{3,}$/.test(id)) problems.push(`id ${id} is not a component id`);
  if (/docs\.google|drive\.google|spreadsheets\/d\//i.test(JSON.stringify(c))) problems.push('holds a private link');
  return problems;
}

export function coverageFromExport(values, { exportedAt }) {
  const W = componentsCore();
  const rows = (id) => normalizeTab(DATASETS_BY_ID.get(id), tabValues(values, DATASETS_BY_ID.get(id))).rows.map((r) => r.data);
  const products = rows('hardware');
  const software = rows('component-software');
  const problems = componentProblems(products, software);
  if (problems.length) throw new Error(`Components validation failed:\n- ${problems.join('\n- ')}`);
  const tally = (list, key) => list.reduce((m, r) => ({ ...m, [key(r)]: (m[key(r)] ?? 0) + 1 }), {});
  const coverage = {
    title: 'Components coverage',
    note: 'Counts only, from every row of the Components tab; product details are for subscribers except the public first rows. Classes and sensing approaches come from explicit rules over the recorded text (assets/components-core.js).',
    snapshot: { exported_at: exportedAt },
    counts: {
      products: products.length,
      software: software.length,
      references: [...products, ...software].reduce((n, r) => n + W.parseSources(r.sources).length, 0),
      by_class: tally(products, (r) => W.classOf(r.group)),
      by_principle: tally(products, (r) => W.facetsOf(r).principle),
      by_family: tally(products, (r) => r.family),
      // Since 26 Nov 2026: the controlled family (COMPONENT_CLASS) and the review state of every product, counts only.
      by_component_class: tally(products, (r) => W.familyOf(r)),
      by_review: tally(products, (r) => W.reviewState(r)),
      notes_rows: componentBlocks(tabValues(values, DATASETS_BY_ID.get('hardware'))).notes.length,
    },
    ids: { products: products.map((r) => r.component_id), software: software.map((r) => r.component_id) },
  };
  const bad = coverageProblems(coverage);
  if (bad.length) throw new Error(`coverage outside the allowlist:\n- ${bad.join('\n- ')}`);
  return coverage;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (arg('--from')) {
    const exportedAt = arg('--exported-at');
    if (!exportedAt || Number.isNaN(Date.parse(exportedAt))) { console.error('--exported-at <ISO time of the workbook export> is required'); process.exit(2); }
    const c = coverageFromExport(JSON.parse(readFileSync(arg('--from'), 'utf8')), { exportedAt: new Date(exportedAt).toISOString() });
    mkdirSync(new URL('data/components/', root), { recursive: true });
    writeFileSync(FILE, `${JSON.stringify(c, null, 1)}\n`);
    console.log(`Wrote data/components/coverage.json: ${c.counts.products} products, ${c.counts.software} related software, ${c.counts.references} reference entries, ${c.counts.notes_rows} notes rows read and not imported.`);
  } else if (process.argv.includes('--check')) {
    const problems = coverageProblems(JSON.parse(readFileSync(FILE, 'utf8')));
    if (problems.length) { console.error(`Components coverage check FAILED:\n- ${problems.join('\n- ')}`); process.exit(1); }
    console.log('Components coverage holds counts and component ids only.');
  } else {
    console.error('usage: node tools/export-components.mjs --from <export.json> --exported-at <ISO> | --check');
    process.exit(2);
  }
}
