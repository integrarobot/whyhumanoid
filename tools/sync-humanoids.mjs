#!/usr/bin/env node
// Regenerates tools/humanoids-verified-updates.json from a saved copy of the backend's public Humanoids preview,
// so the free catalogue keeps equal to what a verified import serves.
//
//   node tools/sync-humanoids.mjs --preview <file> --sheet-rows <2,3,...> --run <import run URL>
//   node --no-warnings tools/sync-humanoids.mjs --from-export <private export.json> --snapshot <ISO>   (25 Nov 2026)
//
// <file> is the JSON of GET /v1/datasets/humanoids/preview (public values only). --sheet-rows lists the sheet row
// of each preview record in order (from the import's premium_rows, ordered by position). Preview records are
// matched to the cleaned legacy records by Lab and Robot (then Web); matched records keep their public id, new
// ones get the next free id. Then run node tools/export-humanoids.mjs and node tools/build-site.mjs.

import { readFileSync, writeFileSync } from 'node:fs';
import { buildExport, readLegacySnapshot } from './export-humanoids.mjs';

const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const norm = (v) => String(v ?? '').trim().toLowerCase();

// identity (tools/humanoids-identity.json): renamed records (matched by sheet row and Web instead of Lab and Robot) and
// records moved out of the tab (allowed to be missing, kept as labelled historical pages).
export function diffPreview(baseRecords, fields, preview, sheetRows, identity = { renamed: [], moved: [] }) {
  if (preview.preview_rows !== 'all') throw new Error('not the free Humanoids catalogue (preview_rows must be "all")');
  if (sheetRows.length !== preview.rows.length) throw new Error('one sheet row per preview record is required');
  const byKey = new Map();
  for (const r of baseRecords) byKey.set(`${norm(r.Lab)}|${norm(r.Robot)}`, [...(byKey.get(`${norm(r.Lab)}|${norm(r.Robot)}`) ?? []), r]);
  const used = new Set();
  let nextId = Math.max(...baseRecords.map((r) => r.id)) + 1;
  const updated = [];
  const inserted = [];
  const renamedTo = new Map((identity.renamed ?? []).map((x) => [`${norm(x.to.Lab)}|${norm(x.to.Robot)}`, x]));
  preview.rows.forEach((w, i) => {
    const rn = renamedTo.get(`${norm(w.Lab)}|${norm(w.Robot)}`);
    if (rn) {
      const base = baseRecords.find((r) => r.id === rn.id);
      if (!base || used.has(base.id) || base.sheet_row !== sheetRows[i] || rn.sheet_row !== sheetRows[i] || norm(base.Web) !== norm(w.Web)) throw new Error(`renamed record ${rn.id}: sheet row or Web does not match the reviewed identity`);
      used.add(base.id);
      for (const f of fields) if ((base[f] ?? null) !== (w[f] ?? null)) updated.push({ id: base.id, field: f, value: w[f] ?? null });
      return;
    }
    const candidates = (byKey.get(`${norm(w.Lab)}|${norm(w.Robot)}`) ?? []).filter((r) => !used.has(r.id));
    const base = candidates.find((r) => norm(r.Web) === norm(w.Web)) ?? candidates[0];
    if (!base) {
      inserted.push({ id: nextId++, sheet_row: sheetRows[i], values: Object.fromEntries(fields.map((f) => [f, w[f] ?? null])) });
      return;
    }
    used.add(base.id);
    if (base.sheet_row !== sheetRows[i]) throw new Error(`record ${base.id} moved from sheet row ${base.sheet_row} to ${sheetRows[i]}; review by hand`);
    for (const f of fields) if ((base[f] ?? null) !== (w[f] ?? null)) updated.push({ id: base.id, field: f, value: w[f] ?? null });
  });
  const movedIds = new Set((identity.moved ?? []).map((x) => x.id));
  const removed = baseRecords.filter((r) => !used.has(r.id) && !movedIds.has(r.id)).map((r) => r.id);
  if (removed.length) throw new Error(`records no longer served: ${removed.join(', ')}; add them to tools/humanoids-identity.json with their evidence`);
  for (const id of movedIds) if (used.has(id)) throw new Error(`record ${id} is listed as moved but still in the tab`);
  const moved = (identity.moved ?? []).map(({ id, to, evidence }) => ({ id, to, evidence }));
  return { updated, inserted, moved };
}

// The free Humanoids rows of a workbook export, as the backend import serves them (public values, customer rows, in
// workbook order), with their sheet rows: the same rows GET /v1/datasets/humanoids/preview returns after that import.
async function previewFromExport(file, snapshot) {
  const { createTestDb } = await import('../server/test/helpers.js');
  const { runImport } = await import('../server/src/import/run.js');
  const db = createTestDb();
  const result = await runImport(db, JSON.parse(readFileSync(file, 'utf8')), Math.floor(Date.parse(snapshot) / 1000));
  if (!result.ok) throw new Error(`import failed: ${result.error}`);
  const { results } = await db.prepare("SELECT sheet_row, data, preview_data FROM premium_rows WHERE dataset = 'humanoids' AND visibility = 'customer' ORDER BY position").all();
  return { preview: { preview_rows: 'all', snapshot, rows: results.map((r) => JSON.parse(r.preview_data ?? r.data)) }, sheetRows: results.map((r) => r.sheet_row) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fromExport = arg('--from-export') ? await previewFromExport(arg('--from-export'), arg('--snapshot')) : null;
  const preview = fromExport?.preview ?? JSON.parse(readFileSync(arg('--preview'), 'utf8'));
  const sheetRows = fromExport?.sheetRows ?? (arg('--sheet-rows') ?? '').split(',').filter(Boolean).map(Number);
  const identity = JSON.parse(readFileSync(new URL('humanoids-identity.json', import.meta.url), 'utf8'));
  const empty = { source: {}, updated: [], inserted: [] };
  const base = JSON.parse(buildExport(readLegacySnapshot(), empty).json);
  const { updated, inserted, moved } = diffPreview(base.records, base.fields, preview, sheetRows, identity);
  const file = new URL('humanoids-verified-updates.json', import.meta.url);
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  doc.source = fromExport ? { environment: 'workbook export', snapshot: preview.snapshot, import_run: `workbook export of ${preview.snapshot}, imported in memory by the backend import (tools/sync-humanoids.mjs --from-export)` } : { ...doc.source, snapshot: preview.snapshot, import_run: arg('--run') ?? doc.source.import_run };
  doc.updated = updated;
  doc.inserted = inserted;
  doc.moved = moved;
  writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`${updated.length} updated values, ${inserted.length} inserted records, ${moved.length} moved out of the tab; now run export-humanoids.mjs and build-site.mjs`);
}
