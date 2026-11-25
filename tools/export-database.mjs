#!/usr/bin/env node
// Builds the PUBLIC part of the database on whyhumanoid.com for the 12 workbook tabs other than Humanoids, with counts
// and field names. Free tabs: every row with its public values. Deployments, Components and their supporting tabs
// (Javier, 24 Nov 2026): every row at the public fields of server/src/access/fields.js, exactly the values the backend
// stores as public (premium_rows.preview_data); a tab whose allowlist is empty is counted, not listed. The full rows of
// those tabs live only in the backend's database (Cloudflare D1), served after a server-side subscription check.
// NEVER write full rows of a subscription tab to the repository or the site.
//
//   node --no-warnings tools/export-database.mjs --from <export.json> [--snapshot <ISO time>]
//   node tools/export-database.mjs --check        (validates the committed preview files without the source)
//
// <export.json> maps each tab name to its rows (header row first), as the Sheets API returns them. It stays outside
// Git. The rows come from the backend's own import (server/src/import/run.js) in an in-memory database, so the site
// preview is exactly what GET /v1/datasets/<tab>/preview returns. Left out, as internal data: rows the sheet marks as
// internal, the backend's row key (id), raw sheet-row pointers (source_rows) and identity_status bookkeeping.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { DATASETS_BY_ID, DATASETS, publicDatasetList } from '../server/src/datasets.js';

const root = new URL('../', import.meta.url);
const DIR = new URL('data/preview/', root);
export const PREVIEW_SOURCE_ROWS = 10;
// Access matrix of 24 Nov 2026 (server/src/access/matrix.js and fields.js).
export const INDEX_NOTE = 'Public data of the 12 workbook tabs other than Humanoids, with counts and field names. Free categories (Integrators, Software, Datasets, Benchmarks, Investment, Other Robots): every row and field. Deployments, Components (Hardware tab and related software) and the identity register of Deployments: every row at its public fields (public_fields); every field only for subscribers (US$100 per year), served by the backend after a subscription check. Claim-to-evidence links and the tabs outside the offer are counted, not listed (access matrix of 24 Nov 2026).';
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);

// The backend's own row key, raw sheet-row pointers and the importer's bookkeeping. Record ids (record_id,
// deployment_id, claim_id...) are content: they are how the tabs refer to each other.
export const isInternalField = (k) => k === 'id' || k === 'source_rows' || k === 'identity_status';
// Tabs published through their own snapshot (spec.publicSnapshot, e.g. the Robotics Evaluation Atlas) have no preview file.
export const OTHER_TABS = DATASETS.filter((d) => d.id !== 'humanoids' && !d.publicSnapshot).map((d) => d.id);

export function validateDatabase(index, tabs) {
  const problems = [];
  const ids = index.tabs.map((t) => t.id);
  // The note describes the access matrix in force; a stale one would tell visitors and agents the old rule.
  if (index.note !== INDEX_NOTE) problems.push('index note is not the current access note (INDEX_NOTE); run --reapply-access');
  if (JSON.stringify(ids) !== JSON.stringify(OTHER_TABS)) problems.push(`tabs must be the ${OTHER_TABS.length} other tabs in order, got ${ids.join(', ')}`);
  for (const meta of index.tabs) {
    const tab = tabs[meta.id];
    if (!tab) { problems.push(`${meta.id}: data/preview/${meta.id}.json missing`); continue; }
    // Free tabs: every row (Stocks: beyond row 10 its basic fields). Subscription tabs (24 Nov 2026): every row at the
    // public fields of server/src/access/fields.js and not one other field, or no row when the allowlist is empty.
    const spec = DATASETS_BY_ID.get(meta.id);
    const all = spec?.publicRows === 'all';
    const sourceRows = new Set(tab.rows.map((r) => r._row));
    if (spec?.access === 'subscription') {
      const allowed = new Set(spec.publicFields ?? []);
      if (!allowed.size && tab.rows.length) problems.push(`${meta.id}: counted-only tab lists ${tab.rows.length} rows`);
      for (const r of tab.rows) for (const k of Object.keys(r)) if (k !== '_row' && !allowed.has(k)) problems.push(`${meta.id}: paid field ${k} published (row ${r._row})`);
      if (allowed.size && tab.rows.length !== meta.entries_total) problems.push(`${meta.id}: ${tab.rows.length} public rows of ${meta.entries_total}: every row is listed at its public fields`);
      if (JSON.stringify(meta.public_fields ?? []) !== JSON.stringify(spec.publicFields ?? [])) problems.push(`${meta.id}: index public_fields differ from the central contract`);
    } else if (spec?.publicFields && all) {
      for (const r of tab.rows.filter((x) => x._row > PREVIEW_SOURCE_ROWS)) for (const k of Object.keys(r)) if (k !== '_row' && !spec.publicFields.includes(k)) problems.push(`${meta.id}: field ${k} published beyond row ${PREVIEW_SOURCE_ROWS}`);
    }
    if (!all && spec?.access !== 'subscription') problems.push(`${meta.id}: no access rule`);
    if (tab.rows.length !== meta.preview_entries) problems.push(`${meta.id}: ${tab.rows.length} preview rows, index says ${meta.preview_entries}`);
    if (all && sourceRows.size !== meta.source_rows_total) problems.push(`${meta.id}: a free tab must publish every sheet row`);
    if (meta.entries_total < tab.rows.length) problems.push(`${meta.id}: total smaller than the preview`);
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
  const index = { note: INDEX_NOTE, snapshot, tabs: [] };
  const tabs = {};
  for (const spec of DATASETS.filter((d) => d.id !== 'humanoids' && !d.publicSnapshot)) {
    const { results } = await db
      .prepare("SELECT preview_rank, data, preview_data FROM premium_rows WHERE dataset = ? AND visibility = 'customer' ORDER BY position")
      .bind(spec.id)
      .all();
    const all = results.map((r) => ({ _row: r.preview_rank, ...Object.fromEntries(Object.entries(JSON.parse(r.data)).filter(([k]) => !isInternalField(k))) }));
    if (all.length !== result.counts[spec.id]) throw new Error(`${spec.id}: read ${all.length}, imported ${result.counts[spec.id]}`);
    // Free tabs: every row; beyond row 10, the public values (preview_data) where the tab has them (Stocks).
    // Subscription tabs: every row through its stored public values only, never its full values.
    const rows = spec.publicRows === 'all'
      ? results.map((r, i) => (all[i]._row <= PREVIEW_SOURCE_ROWS || !r.preview_data ? all[i] : { _row: r.preview_rank, ...JSON.parse(r.preview_data) }))
      : results.filter((r) => r.preview_data).map((r) => ({ _row: r.preview_rank, ...Object.fromEntries(Object.entries(JSON.parse(r.preview_data)).filter(([k]) => !isInternalField(k))) }));
    const fields = [...new Set(all.flatMap((r) => Object.keys(r)))].filter((k) => k !== '_row');
    const meta = list.get(spec.id);
    index.tabs.push({
      id: spec.id,
      title: meta.title,
      description: meta.description,
      entries_total: all.length,
      // Directory tabs: canonical entries (a topical membership row, canonical: false, is listed but not counted again).
      ...(all.some((r) => r.canonical === false) ? { canonical_entries: all.filter((r) => r.canonical !== false).length, memberships: all.filter((r) => r.canonical === false).length } : {}),
      source_rows_total: new Set(all.map((r) => r._row)).size,
      preview_entries: rows.length,
      preview_source_rows: new Set(rows.map((r) => r._row)).size,
      fields,
      access: spec.access,
      category: spec.category,
      ...(spec.publicRows === 'all' ? { public: spec.publicFields ? 'basic_fields' : 'all' } : { public: spec.publicRows }),
      ...(spec.publicFields ? { public_fields: spec.publicFields } : {}),
      ...(spec.offer === false ? { offer: false } : {}),
      ...(fields.includes('list') ? { lists: all.reduce((m, r) => ({ ...m, [r.list]: (m[r.list] ?? 0) + 1 }), {}) } : {}),
      // Directory tabs: how the source entries became the canonical catalogue (server/src/catalogue/directory.js).
      ...(result.reconciliation?.[spec.id] ? { reconciliation: result.reconciliation[spec.id] } : {}),
    });
    tabs[spec.id] = { id: spec.id, snapshot, preview: true, rows };
  }
  return { index, tabs, counts: result.counts, db };
}

// The backend import of a private export, in memory: what production D1 will hold. Used by the Deployments audit.
export async function importInMemory(from, snapshot = new Date().toISOString()) {
  const { createTestDb } = await import('../server/test/helpers.js');
  const { runImport } = await import('../server/src/import/run.js');
  const db = createTestDb();
  const result = await runImport(db, JSON.parse(readFileSync(from, 'utf8')), Math.floor(Date.parse(snapshot) / 1000));
  if (!result.ok) throw new Error(`import failed: ${result.error}`);
  return { db, counts: result.counts };
}

// Re-applies the access matrix to the committed previews without a new export: a subscription tab is cut to its first
// 10 sheet rows and the index takes the matrix's titles, access and category. It never adds a value: a free tab keeps
// the fields its snapshot already published (Stocks beyond row 10: basic fields until the next export), marked so.
export function reapplyAccess({ index, tabs }) {
  const list = new Map(publicDatasetList().map((d) => [d.id, d]));
  const next = { ...index, note: INDEX_NOTE, tabs: [] };
  const out = {};
  // A tab that now has its own public snapshot (spec.publicSnapshot) leaves the previews; its file is removed below.
  for (const meta of index.tabs.filter((t) => OTHER_TABS.includes(t.id))) {
    const spec = DATASETS_BY_ID.get(meta.id);
    const tab = tabs[meta.id];
    // A subscription tab's public rows come only from an import (stored public values): re-applying cannot invent them.
    if (spec.access === 'subscription' && meta.public !== spec.publicRows) throw new Error(`${meta.id}: re-export from a workbook export to publish it at its public fields (--only ${meta.id})`);
    const rows = tab.rows;
    const { public: wasPublic, public_fields: basic, ...rest } = meta;
    const entry = {
      ...rest, title: list.get(meta.id).title, description: list.get(meta.id).description, access: spec.access, category: spec.category,
      preview_entries: rows.length, preview_source_rows: new Set(rows.map((r) => r._row)).size,
    };
    if (spec.access === 'subscription') { entry.public = spec.publicRows; entry.public_fields = spec.publicFields; }
    if (spec.publicRows === 'all') {
      entry.public = wasPublic === 'basic_fields' ? 'basic_fields' : 'all';
      if (wasPublic === 'basic_fields') { entry.public_fields = basic; entry.snapshot_fields = 'Beyond row 10 this snapshot holds the basic fields only; the other fields are free and arrive with the next export.'; }
    }
    if (spec.offer === false) entry.offer = false; else delete entry.offer;
    next.tabs.push(entry);
    out[meta.id] = { ...tab, rows };
  }
  return { index: next, tabs: out };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--reapply-access')) {
    const { index, tabs } = reapplyAccess(readDatabase());
    const problems = validateDatabase(index, tabs);
    if (problems.length) throw new Error(problems.join('; '));
    writeFileSync(new URL('index.json', DIR), `${JSON.stringify(index, null, 1)}\n`);
    for (const [id, tab] of Object.entries(tabs)) writeFileSync(new URL(`${id}.json`, DIR), `${JSON.stringify(tab)}\n`);
    for (const f of readdirSync(DIR).filter((x) => x !== 'index.json' && !OTHER_TABS.includes(x.replace(/\.json$/, '')))) {
      unlinkSync(new URL(f, DIR));
      console.log(`${f} removed: the tab is published through its own snapshot`);
    }
    for (const t of index.tabs) console.log(`${t.id.padEnd(19)} ${t.access.padEnd(12)} public ${String(t.preview_entries).padStart(3)} of ${String(t.entries_total).padStart(4)}`);
  } else if (process.argv.includes('--check')) {
    const { index, tabs } = readDatabase();
    const problems = validateDatabase(index, tabs);
    const extra = readdirSync(DIR).filter((f) => f !== 'index.json' && !OTHER_TABS.includes(f.replace(/\.json$/, '')));
    if (extra.length) problems.push(`unexpected files: ${extra.join(', ')}`);
    if (problems.length) {
      console.error(`data/preview is invalid:\n- ${problems.join('\n- ')}`);
      process.exit(1);
    }
    console.log(`data/preview is valid: ${index.tabs.length} tabs, ${index.tabs.reduce((n, t) => n + t.preview_entries, 0)} public rows of ${index.tabs.reduce((n, t) => n + t.entries_total, 0)} (subscription tabs at their public fields only), no internal fields`);
  } else if (arg('--only')) {
    // A controlled refresh (Components, 23 Nov 2026): rebuild only the named tabs from the export (the whole workbook
    // is still imported and validated in memory, exactly as production would) and keep every other committed preview,
    // with its own snapshot, untouched. Each refreshed tab records its own export time.
    const only = arg('--only').split(',').map((x) => x.trim()).filter(Boolean);
    for (const id of only) if (!OTHER_TABS.includes(id)) throw new Error(`--only: ${id} is not a preview tab`);
    const snapshot = arg('--snapshot') ?? new Date().toISOString();
    const fresh = await build(arg('--from'), snapshot);
    const current = readDatabase();
    const keep = new Map((current?.index.tabs ?? []).map((t) => [t.id, t]));
    const index = { ...(current?.index ?? fresh.index), note: INDEX_NOTE, tabs: OTHER_TABS.map((id) => (only.includes(id) ? { ...fresh.index.tabs.find((t) => t.id === id), snapshot } : keep.get(id))).filter(Boolean) };
    const tabs = Object.fromEntries(index.tabs.map((t) => [t.id, only.includes(t.id) ? fresh.tabs[t.id] : current.tabs[t.id]]));
    const problems = validateDatabase(index, tabs);
    if (problems.length) throw new Error(problems.join('; '));
    writeFileSync(new URL('index.json', DIR), `${JSON.stringify(index, null, 1)}\n`);
    for (const id of only) writeFileSync(new URL(`${id}.json`, DIR), `${JSON.stringify(tabs[id])}\n`);
    for (const id of only) { const t = index.tabs.find((x) => x.id === id); console.log(`${id.padEnd(19)} preview ${String(t.preview_entries).padStart(3)} of ${String(t.entries_total).padStart(4)}  fields ${t.fields.length}`); }
  } else {
    const { index, tabs, counts } = await build(arg('--from'), arg('--snapshot') ?? new Date().toISOString());
    const problems = validateDatabase(index, tabs);
    if (problems.length) throw new Error(problems.join('; '));
    mkdirSync(DIR, { recursive: true });
    writeFileSync(new URL('index.json', DIR), `${JSON.stringify(index, null, 1)}\n`);
    for (const [id, tab] of Object.entries(tabs)) writeFileSync(new URL(`${id}.json`, DIR), `${JSON.stringify(tab)}\n`);
    for (const t of index.tabs) console.log(`${t.id.padEnd(19)} preview ${String(t.preview_entries).padStart(3)} of ${String(t.entries_total).padStart(4)}  fields ${t.fields.length}`);
    console.log(`humanoids: ${counts.humanoids} public, ${counts.humanoids_internal} internal (exported by export-humanoids.mjs)`);
  }
}

export { build as buildDatabase };
