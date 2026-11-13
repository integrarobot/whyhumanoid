#!/usr/bin/env node
// Regenerates tools/humanoids-verified-updates.json from a saved copy of the backend's public Humanoids preview,
// so the free catalogue keeps equal to what a verified import serves.
//
//   node tools/sync-humanoids.mjs --preview <file> --sheet-rows <2,3,...> --run <import run URL>
//
// <file> is the JSON of GET /v1/datasets/humanoids/preview (public values only). --sheet-rows lists the sheet row
// of each preview record in order (from the import's premium_rows, ordered by position). Preview records are
// matched to the cleaned legacy records by Lab and Robot (then Web); matched records keep their public id, new
// ones get the next free id. Then run node tools/export-humanoids.mjs and node tools/build-site.mjs.

import { readFileSync, writeFileSync } from 'node:fs';
import { buildExport, readLegacySnapshot } from './export-humanoids.mjs';

const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const norm = (v) => String(v ?? '').trim().toLowerCase();

export function diffPreview(baseRecords, fields, preview, sheetRows) {
  if (preview.preview_rows !== 'all') throw new Error('not the free Humanoids catalogue (preview_rows must be "all")');
  if (sheetRows.length !== preview.rows.length) throw new Error('one sheet row per preview record is required');
  const byKey = new Map();
  for (const r of baseRecords) byKey.set(`${norm(r.Lab)}|${norm(r.Robot)}`, [...(byKey.get(`${norm(r.Lab)}|${norm(r.Robot)}`) ?? []), r]);
  const used = new Set();
  let nextId = Math.max(...baseRecords.map((r) => r.id)) + 1;
  const updated = [];
  const inserted = [];
  preview.rows.forEach((w, i) => {
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
  const removed = baseRecords.filter((r) => !used.has(r.id)).map((r) => r.id);
  if (removed.length) throw new Error(`records no longer served: ${removed.join(', ')}; review by hand`);
  return { updated, inserted };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const preview = JSON.parse(readFileSync(arg('--preview'), 'utf8'));
  const sheetRows = (arg('--sheet-rows') ?? '').split(',').filter(Boolean).map(Number);
  const empty = { source: {}, updated: [], inserted: [] };
  const base = JSON.parse(buildExport(readLegacySnapshot(), empty).json);
  const { updated, inserted } = diffPreview(base.records, base.fields, preview, sheetRows);
  const file = new URL('humanoids-verified-updates.json', import.meta.url);
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  doc.source = { ...doc.source, snapshot: preview.snapshot, import_run: arg('--run') ?? doc.source.import_run };
  doc.updated = updated;
  doc.inserted = inserted;
  writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`${updated.length} updated values, ${inserted.length} inserted records; now run export-humanoids.mjs and build-site.mjs`);
}
