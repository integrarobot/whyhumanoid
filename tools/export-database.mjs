#!/usr/bin/env node
// Builds the open database of the static site: every customer row and every content field of the 12 workbook tabs
// other than Humanoids (data/database/<tab>.json plus data/database/index.json), by running the backend's own
// import (server/src/import/run.js) on a private workbook export in an in-memory database. Decision of 16 Nov
// 2026 (Javier): the whole database is open to every visitor until the paywall phase; do not go back to previews.
//
//   node --no-warnings tools/export-database.mjs --from <export.json> [--snapshot <ISO time>]
//   node tools/export-database.mjs --check        (validates the committed files without the source)
//
// <export.json> maps each tab name to its rows (header row first), as the Sheets API returns them. It stays outside
// Git. Left out, as internal data: rows the sheet marks as internal (never imported as customer rows), the backend's
// row key (id), raw sheet-row pointers (source_rows) and the importer's identity_status bookkeeping.
// The importer already removes private links (workbook, Drive, mailto:, local addresses) from every tab.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { DATASETS, publicDatasetList } from '../server/src/datasets.js';

const root = new URL('../', import.meta.url);
const DIR = new URL('data/database/', root);
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);

// The backend's own row key, raw sheet-row pointers and the importer's bookkeeping. Record ids (record_id,
// deployment_id, claim_id...) are content: they are how the tabs refer to each other.
export const isInternalField = (k) => k === 'id' || k === 'source_rows' || k === 'identity_status';
export const OTHER_TABS = DATASETS.filter((d) => d.id !== 'humanoids').map((d) => d.id);

export function validateDatabase(index, tabs) {
  const problems = [];
  const ids = index.tabs.map((t) => t.id);
  if (JSON.stringify(ids) !== JSON.stringify(OTHER_TABS)) problems.push(`tabs must be the 12 other tabs in order, got ${ids.join(', ')}`);
  for (const meta of index.tabs) {
    const tab = tabs[meta.id];
    if (!tab) { problems.push(`${meta.id}: data/database/${meta.id}.json missing`); continue; }
    if (tab.rows.length !== meta.entries_total) problems.push(`${meta.id}: ${tab.rows.length} rows, index says ${meta.entries_total}`);
    if (new Set(tab.rows.map((r) => r._row)).size !== meta.source_rows_total) problems.push(`${meta.id}: source row count mismatch`);
    const keys = new Set(tab.rows.flatMap((r) => Object.keys(r)));
    keys.delete('_row');
    for (const k of keys) {
      if (!meta.fields.includes(k)) problems.push(`${meta.id}: field ${k} not declared`);
      if (isInternalField(k)) problems.push(`${meta.id}: internal field ${k} published`);
    }
  }
  return problems;
}

export function readDatabase() {
  const index = JSON.parse(readFileSync(new URL('index.json', DIR), 'utf8'));
  const tabs = Object.fromEntries(index.tabs.map((t) => [t.id, JSON.parse(readFileSync(new URL(`${t.id}.json`, DIR), 'utf8'))]));
  return { index, tabs };
}

async function build(from, snapshot) {
  const { createTestDb } = await import('../server/test/helpers.js');
  const { runImport } = await import('../server/src/import/run.js');
  const values = JSON.parse(readFileSync(from, 'utf8'));
  const db = createTestDb();
  const result = await runImport(db, values, Math.floor(Date.parse(snapshot) / 1000));
  if (!result.ok) throw new Error(`import failed: ${result.error}`);
  const list = new Map(publicDatasetList().map((d) => [d.id, d]));
  const index = { note: 'Open database: every row and content field of the 12 workbook tabs other than Humanoids, free to read (decision of 16 Nov 2026). Rows the sheet marks as internal, the backend row key, raw sheet-row pointers and importer bookkeeping are left out.', snapshot, tabs: [] };
  const tabs = {};
  for (const spec of DATASETS.filter((d) => d.id !== 'humanoids')) {
    const { results } = await db
      .prepare("SELECT preview_rank, data FROM premium_rows WHERE dataset = ? AND visibility = 'customer' ORDER BY position")
      .bind(spec.id)
      .all();
    const rows = results.map((r) => ({ _row: r.preview_rank, ...Object.fromEntries(Object.entries(JSON.parse(r.data)).filter(([k]) => !isInternalField(k))) }));
    const fields = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => k !== '_row');
    const meta = list.get(spec.id);
    index.tabs.push({
      id: spec.id,
      title: meta.title,
      description: meta.description,
      entries_total: rows.length,
      source_rows_total: new Set(rows.map((r) => r._row)).size,
      fields,
      ...(fields.includes('list') ? { lists: rows.reduce((m, r) => ({ ...m, [r.list]: (m[r.list] ?? 0) + 1 }), {}) } : {}),
    });
    tabs[spec.id] = { id: spec.id, snapshot, rows };
    if (rows.length !== result.counts[spec.id]) throw new Error(`${spec.id}: exported ${rows.length}, imported ${result.counts[spec.id]}`);
  }
  return { index, tabs, counts: result.counts, db };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--check')) {
    const { index, tabs } = readDatabase();
    const problems = validateDatabase(index, tabs);
    const extra = readdirSync(DIR).filter((f) => f !== 'index.json' && !OTHER_TABS.includes(f.replace(/\.json$/, '')));
    if (extra.length) problems.push(`unexpected files: ${extra.join(', ')}`);
    if (problems.length) {
      console.error(`data/database is invalid:\n- ${problems.join('\n- ')}`);
      process.exit(1);
    }
    console.log(`data/database is valid: 12 tabs, ${index.tabs.reduce((n, t) => n + t.entries_total, 0)} rows, no internal fields`);
  } else {
    const { index, tabs, counts } = await build(arg('--from'), arg('--snapshot') ?? new Date().toISOString());
    const problems = validateDatabase(index, tabs);
    if (problems.length) throw new Error(problems.join('; '));
    mkdirSync(DIR, { recursive: true });
    writeFileSync(new URL('index.json', DIR), `${JSON.stringify(index, null, 1)}\n`);
    for (const [id, tab] of Object.entries(tabs)) writeFileSync(new URL(`${id}.json`, DIR), `${JSON.stringify(tab)}\n`);
    for (const t of index.tabs) console.log(`${t.id.padEnd(19)} rows ${String(t.entries_total).padStart(4)}  source rows ${String(t.source_rows_total).padStart(4)}  fields ${t.fields.length}`);
    console.log(`humanoids: ${counts.humanoids} public, ${counts.humanoids_internal} internal (exported by export-humanoids.mjs)`);
  }
}

export { build as buildDatabase };
