#!/usr/bin/env node
// Builds the public previews of the 12 other workbook tabs for the static site (data/previews.json), and the
// public Humanoids preview used to resync the free catalogue, by running the backend's own import
// (server/src/import/run.js) on a private workbook export in an in-memory database. So the site shows exactly what
// the backend's public preview serves: the first 10 source sheet rows of each tab, public values only.
//
//   node --no-warnings tools/export-previews.mjs --from <export.json> [--snapshot <ISO time>]
//   node tools/export-previews.mjs --check        (validates the committed file without the source)
//
// <export.json> maps each tab name to its rows (header row first), as the Sheets API returns them. It stays outside
// Git. Identifier columns (record ids that join to the paid rows) are left out of the public previews.

import { readFileSync, writeFileSync } from 'node:fs';
import { DATASETS, PREVIEW_ROWS, publicDatasetList } from '../server/src/datasets.js';

const root = new URL('../', import.meta.url);
const OUT = new URL('data/previews.json', root);
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);

// Join keys and raw-record pointers into the paid data; never published.
export const isIdentifierField = (k) => k === 'id' || k === 'source_rows' || /(^|_)ids?$/.test(k);

export function validatePreviews(doc) {
  const problems = [];
  const others = DATASETS.filter((d) => d.id !== 'humanoids').map((d) => d.id);
  const ids = doc.datasets.map((d) => d.id);
  if (JSON.stringify(ids) !== JSON.stringify(others)) problems.push(`datasets must be the 12 other tabs in order, got ${ids.join(', ')}`);
  for (const d of doc.datasets) {
    const ranks = new Set(d.rows.map((r) => r._source_row));
    if ([...ranks].some((n) => !Number.isInteger(n) || n < 1 || n > PREVIEW_ROWS)) problems.push(`${d.id}: a row beyond the first ${PREVIEW_ROWS} source rows`);
    if (ranks.size !== d.preview_source_rows) problems.push(`${d.id}: preview_source_rows mismatch`);
    if (d.rows.length > d.entries_total) problems.push(`${d.id}: more preview rows than entries`);
    const keys = new Set(d.rows.flatMap((r) => Object.keys(r)));
    keys.delete('_source_row');
    for (const k of keys) {
      if (!d.fields.includes(k)) problems.push(`${d.id}: field ${k} not declared`);
      if (isIdentifierField(k)) problems.push(`${d.id}: identifier field ${k} published`);
    }
  }
  return problems;
}

async function build(from, snapshot) {
  // The in-memory D1 and the importer are the backend's own code paths.
  const { createTestDb } = await import('../server/test/helpers.js');
  const { runImport } = await import('../server/src/import/run.js');
  const values = JSON.parse(readFileSync(from, 'utf8'));
  const db = createTestDb();
  const result = await runImport(db, values, Math.floor(Date.parse(snapshot) / 1000));
  if (!result.ok) throw new Error(`import failed: ${result.error}`);
  const list = new Map(publicDatasetList().map((d) => [d.id, d]));
  const datasets = [];
  for (const spec of DATASETS.filter((d) => d.id !== 'humanoids')) {
    const { results } = await db
      .prepare("SELECT preview_rank, COALESCE(preview_data, data) AS preview_data FROM premium_rows WHERE dataset = ? AND visibility = 'customer' ORDER BY position")
      .bind(spec.id)
      .all();
    const sourceRows = (await db.prepare("SELECT COUNT(DISTINCT sheet_row) AS n FROM premium_rows WHERE dataset = ? AND visibility = 'customer'").bind(spec.id).first()).n;
    const shown = results.filter((r) => r.preview_rank != null && r.preview_rank <= PREVIEW_ROWS);
    const rows = shown.map((r) => {
      const data = JSON.parse(r.preview_data);
      return { _source_row: r.preview_rank, ...Object.fromEntries(Object.entries(data).filter(([k]) => !isIdentifierField(k))) };
    });
    const fields = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => k !== '_source_row');
    const meta = list.get(spec.id);
    datasets.push({
      id: spec.id,
      title: meta.title,
      description: meta.description,
      entries_total: result.counts[spec.id],
      source_rows_total: sourceRows,
      preview_source_rows: new Set(rows.map((r) => r._source_row)).size,
      fields,
      rows,
    });
  }
  return {
    doc: {
      note: 'Public previews of the 12 other workbook tabs: the first 10 source sheet rows of each, public values, as the backend serves them. Identifier columns are left out. Full data: subscription.',
      snapshot,
      rule: `first ${PREVIEW_ROWS} source sheet rows of each tab; tabs with side-by-side lists show every entry in those rows`,
      datasets,
    },
    counts: result.counts,
    db,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--check')) {
    const problems = validatePreviews(JSON.parse(readFileSync(OUT, 'utf8')));
    if (problems.length) {
      console.error(`data/previews.json is invalid:\n- ${problems.join('\n- ')}`);
      process.exit(1);
    }
    console.log('data/previews.json is valid: 12 tabs, first 10 source rows each, no identifier fields');
  } else {
    const { doc, counts } = await build(arg('--from'), arg('--snapshot') ?? new Date().toISOString());
    const problems = validatePreviews(doc);
    if (problems.length) throw new Error(problems.join('; '));
    writeFileSync(OUT, `${JSON.stringify(doc, null, 1)}\n`);
    for (const d of doc.datasets) console.log(`${d.id.padEnd(19)} entries ${String(d.entries_total).padStart(4)}  source rows ${String(d.source_rows_total).padStart(4)}  preview ${String(d.rows.length).padStart(2)} entries from ${d.preview_source_rows} source rows`);
    console.log(`humanoids: ${counts.humanoids} public, ${counts.humanoids_internal} internal`);
  }
}

export { build as buildPreviews };
