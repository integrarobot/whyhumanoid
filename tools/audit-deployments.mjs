#!/usr/bin/env node
// Deployments audit: the workbook's Deployments sheet against what is served, cell by cell.
// Deployments is the main section (Javier, 16 Nov 2026): every row, every column and every non-empty value of the
// sheet must reach subscribers unchanged, and nothing is dropped for looking like a duplicate. Since the paywall
// (16 Nov 2026) full rows live only in the backend database; the site publishes the first 10 sheet rows.
//
//   node tools/audit-deployments.mjs --from <export.json> [--json]
//
// Checks, on the same private export export-database.mjs reads (it stays outside Git):
//   1. the backend import of the export (in memory, the code production runs) holds every sheet row, column and
//      value of Deployments, in order: what subscribers get from GET /v1/datasets/deployments;
//   2. data/preview/deployments.json holds exactly the first 10 sheet rows, unchanged, and nothing more.
// Exits 1 on any difference and lists each one. The page side (every field and value in each "View all data" card)
// is checked by tools/verify-site.mjs for the site and by the premium app checks for subscribers.

import { readFileSync } from 'node:fs';
import { importInMemory } from './export-database.mjs';
import { queryDatasetRows } from '../server/src/datasets.js';

const root = new URL('../', import.meta.url);
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const SHEET = 'Deployments';

const norm = (v) => (v === null || v === undefined ? '' : String(v).trim());

export function auditDeployments(values, published, index) {
  const problems = [];
  const sheet = values[SHEET];
  if (!Array.isArray(sheet) || !sheet.length) return { problems: [`the export has no ${SHEET} sheet`] };
  const header = sheet[0].map(norm);
  const width = Math.max(header.length, ...sheet.map((r) => r.length));
  // Data rows: every row with at least one non-empty cell, in sheet order. Fully empty rows are not records.
  const rows = sheet.slice(1).map((r, i) => ({ sheetRow: i + 2, cells: Array.from({ length: width }, (_, j) => norm(r[j])) }))
    .filter((r) => r.cells.some(Boolean));
  const meta = index.tabs.find((t) => t.id === 'deployments');
  const cols = header.filter(Boolean);
  if (header.length < width && sheet.some((r) => r.slice(header.length).some((c) => norm(c)))) problems.push('cells to the right of the header row');
  if (JSON.stringify(cols) !== JSON.stringify(meta.fields)) {
    for (const c of cols) if (!meta.fields.includes(c)) problems.push(`column "${c}" is in the sheet but not published`);
    for (const f of meta.fields) if (!cols.includes(f)) problems.push(`field "${f}" is published but not in the sheet`);
    if (!problems.length) problems.push('columns are published in a different order');
  }
  if (rows.length !== published.length) problems.push(`${rows.length} rows in the sheet, ${published.length} published`);
  if (meta.entries_total !== published.length || meta.source_rows_total !== published.length) problems.push(`index counts ${meta.entries_total}/${meta.source_rows_total}, ${published.length} rows published`);
  let values_ = 0;
  const diffs = [];
  rows.forEach((r, i) => {
    const p = published[i];
    if (!p) return;
    if (p._row !== i + 1) diffs.push({ sheet_row: r.sheetRow, column: '_row', sheet: String(i + 1), published: String(p._row) });
    header.forEach((h, j) => {
      if (!h) return;
      const s = r.cells[j];
      const w = norm(p[h]);
      if (s) values_++;
      if (s !== w) diffs.push({ sheet_row: r.sheetRow, column: h, sheet: s, published: w });
    });
  });
  for (const d of diffs) problems.push(`row ${d.sheet_row}, ${d.column}: sheet "${d.sheet.slice(0, 80)}" / published "${d.published.slice(0, 80)}"`);
  return { problems, rows: rows.length, columns: cols.length, values: values_, diffs };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const from = arg('--from');
  if (!from) {
    console.error('usage: node tools/audit-deployments.mjs --from <export.json> [--json]');
    process.exit(2);
  }
  const values = JSON.parse(readFileSync(from, 'utf8'));
  const index = JSON.parse(readFileSync(new URL('data/preview/index.json', root), 'utf8'));
  const meta = index.tabs.find((t) => t.id === 'deployments');
  // 1. What subscribers get: the backend import, every row, in order.
  const { db } = await importInMemory(from);
  const page = await queryDatasetRows(db, 'deployments', { limit: 100000, offset: 0, q: null });
  const served = page.rows.map(({ id, ...r }, i) => ({ _row: i + 1, ...r }));
  const full = auditDeployments(values, served, { tabs: [{ ...meta, entries_total: served.length, source_rows_total: served.length }] });
  // 2. What the site publishes: exactly the first 10 sheet rows.
  const preview = JSON.parse(readFileSync(new URL('data/preview/deployments.json', root), 'utf8')).rows;
  const firstTen = { ...values, [SHEET]: values[SHEET].slice(0, 11) };
  const pre = auditDeployments(firstTen, preview, { tabs: [{ ...meta, entries_total: preview.length, source_rows_total: preview.length }] });
  if (meta.entries_total !== full.rows) full.problems.push(`index says ${meta.entries_total} entries, the sheet has ${full.rows}`);
  const problems = [...full.problems.map((p) => `served: ${p}`), ...pre.problems.map((p) => `preview: ${p}`)];
  if (process.argv.includes('--json')) console.log(JSON.stringify({ rows: full.rows, columns: full.columns, values: full.values, preview_rows: pre.rows, differences: problems }, null, 2));
  if (problems.length) {
    console.error(`Deployments audit FAILED (${problems.length}):\n- ${problems.slice(0, 200).join('\n- ')}`);
    process.exit(1);
  }
  console.log(`Deployments audit passed: ${full.rows} rows, ${full.columns} columns, ${full.values} non-empty values in the sheet, all served to subscribers unchanged; the site preview holds exactly the first ${pre.rows} sheet rows (0 differences).`);
}
