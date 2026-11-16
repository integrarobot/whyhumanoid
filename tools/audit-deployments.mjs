#!/usr/bin/env node
// Deployments audit: the workbook's Deployments sheet against what the site publishes, cell by cell.
// Deployments is the main section of whyhumanoid.com (Javier, 16 Nov 2026): every row, every column and every
// non-empty value of the sheet must be published unchanged. Nothing is dropped for looking like a duplicate:
// different claims and evidence about one deployment are different rows.
//
//   node tools/audit-deployments.mjs --from <export.json> [--json]
//
// <export.json> is the same private export export-database.mjs reads (tab name -> rows, header row first, as the
// Sheets API returns them). It stays outside Git. Exits 1 on any difference and lists each one.
// The page side (every field and value of every row shown in its "View all data" card) is checked by
// tools/verify-site.mjs, so sheet -> data/database -> page is covered end to end.

import { readFileSync } from 'node:fs';

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
  const published = JSON.parse(readFileSync(new URL('data/database/deployments.json', root), 'utf8')).rows;
  const index = JSON.parse(readFileSync(new URL('data/database/index.json', root), 'utf8'));
  const r = auditDeployments(values, published, index);
  if (process.argv.includes('--json')) console.log(JSON.stringify({ rows: r.rows, columns: r.columns, values: r.values, differences: r.problems }, null, 2));
  if (r.problems.length) {
    console.error(`Deployments audit FAILED (${r.problems.length}):\n- ${r.problems.slice(0, 200).join('\n- ')}`);
    process.exit(1);
  }
  console.log(`Deployments audit passed: ${r.rows} rows, ${r.columns} columns, ${r.values} non-empty values in the sheet, all published unchanged (0 differences).`);
}
