#!/usr/bin/env node
// Builds the free public Humanoids catalogue: every customer row of the Humanoids tab, in workbook order, with
// the 32 public fields and public (cleaned) values. Rows the sheet itself marks as internal (a duplicate, an
// editorial entry) are never published. Full values and the 12 other tabs are paid and never written here.
// Writes data/humanoids-catalogue.json, data/humanoids-catalogue.csv and data/manifest.json.
//
// Source: the legacy snapshot embedded in efca179:index.html (built by the old pipeline from the Humanoids
// tab), or --from <file>. Values are cleaned clause by clause with server/src/import/clean.js, the same rules
// the paid import applies. The manifest records what was stripped or flagged by id, field and reason only;
// the clause text goes to the private review report (--review <file>), which must not be committed.
//
// Usage: node tools/export-humanoids.mjs [--check] [--review <file>] [--from <file>]

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { FLAG_RULES, STRIP_RULES, cleanValue } from '../server/src/import/clean.js';
const editorial = JSON.parse(readFileSync(new URL('../server/src/editorial/humanoids.json', import.meta.url), 'utf8')).rewrites;
import { HUMANOIDS_FIELDS } from '../server/src/humanoids-fields.js';

const root = new URL('../', import.meta.url);
export const LEGACY_REF = 'efca179';

export function readLegacySnapshot(fromFile) {
  const text = fromFile
    ? readFileSync(fromFile, 'utf8')
    : execFileSync('git', ['show', `${LEGACY_REF}:index.html`], { cwd: root, maxBuffer: 1 << 26 }).toString();
  if (fromFile?.endsWith('.json')) return JSON.parse(text);
  const match = /<script[^>]*id="data"[^>]*>([\s\S]*?)<\/script>/.exec(text);
  if (!match) throw new Error('no embedded data block');
  return JSON.parse(match[1]);
}

const csvCell = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// Customer-facing robots in workbook order. Rows the sheet itself excludes (duplicates, editorial resources)
// are internal provenance: the snapshot keeps them apart and they are never published.
export function catalogueRows(snapshot) {
  return snapshot.models.map((m) => ({ kind: 'model', row: m.row, model: m })).sort((a, b) => a.row - b.row);
}

export function buildExport(snapshot) {
  if (JSON.stringify(snapshot.cols) !== JSON.stringify(HUMANOIDS_FIELDS)) throw new Error('snapshot columns differ from the 32 public fields');
  const fields = HUMANOIDS_FIELDS;
  const review = [];
  const clean = (model, mode) => {
    const record = { id: model.id, sheet_row: model.row };
    fields.forEach((field, i) => {
      const r = cleanValue(model.f[i], { field, mode, editorial });
      record[field] = r.value;
      const who = { id: model.id, lab: model.lab, robot: model.robot, field };
      for (const s of r.stripped) review.push({ ...who, action: 'stripped', ...s });
      for (const s of r.rewritten) review.push({ ...who, action: 'rewritten', ...s });
      for (const s of r.excluded) review.push({ ...who, action: 'excluded_unverified', ...s });
      for (const s of r.flagged) review.push({ ...who, action: 'flagged', ...s });
    });
    return record;
  };
  snapshot.models.forEach((m) => clean(m, 'full')); // full review (private): what the paid import strips or flags
  const fullReview = review.splice(0);
  const shown = catalogueRows(snapshot);
  const records = shown.map((r) => clean(r.model, 'preview'));
  const excluded = [];
  const catalogueIds = new Set(records.map((r) => r.id));

  const json = `${JSON.stringify({ dataset: 'humanoids', access: 'free', snapshot: snapshot.snapshot, fields, records, excluded }, null, 1)}\n`;
  const csv = `${[['id', 'sheet_row', ...fields], ...records.map((r) => [r.id, r.sheet_row, ...fields.map((f) => r[f])])]
    .map((row) => row.map(csvCell).join(','))
    .join('\n')}\n`;
  const manifest = `${JSON.stringify(
    {
      dataset: 'humanoids',
      access: 'free',
      rule: 'complete Humanoids catalogue: every customer row in workbook order, 32 public fields, public (cleaned) values; rows the sheet marks as internal are not published',
      source: `Humanoids tab of the private Integrarobot workbook, via the snapshot embedded in ${LEGACY_REF}:index.html`,
      snapshot: snapshot.snapshot,
      record_count: records.length,
      full_database: {
        humanoid_records: snapshot.models.length,
        other_datasets: 12,
        other_datasets_public_rows: 10,
        access: 'subscription, €100 per year: full values, all 13 datasets in full, full search, agent API keys',
      },
      fields,
      cleaning: {
        rules: { strip: STRIP_RULES.map(([r]) => r), flag: FLAG_RULES.map(([r]) => r) },
        stripped: review.filter((r) => r.action === 'stripped').map(({ id, field, reason }) => ({ id, field, reason })),
        excluded_unverified: review.filter((r) => r.action === 'excluded_unverified').map(({ id, field, key }) => ({ id, field, key })),
        rewritten: review.filter((r) => r.action === 'rewritten').map(({ id, field, key }) => ({ id, field, key })),
      },
      license: null,
      files: {
        'humanoids-catalogue.json': { sha256: sha256(json), bytes: Buffer.byteLength(json) },
        'humanoids-catalogue.csv': { sha256: sha256(csv), bytes: Buffer.byteLength(csv) },
      },
    },
    null,
    2,
  )}\n`;
  return { json, csv, manifest, review: fullReview, catalogueIds, count: records.length };
}

function reviewMarkdown(review) {
  return [
    '# Humanoids cleaning review (private, do not commit)',
    '',
    `Full tab: ${review.filter((r) => r.action === 'stripped').length} clauses stripped, ${review.filter((r) => r.action === 'flagged').length} flagged and kept.`,
    '',
    '| id | record | field | action | reason | clause |',
    '|---|---|---|---|---|---|',
    ...review.map((r) => `| ${r.id} | ${r.lab} / ${r.robot} | ${r.field} | ${r.action} | ${r.reason} | ${r.text.replace(/\|/g, '\\|')} |`),
    '',
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
  const out = buildExport(readLegacySnapshot(arg('--from')));
  const dataDir = new URL('data/', root);
  const files = { 'humanoids-catalogue.json': out.json, 'humanoids-catalogue.csv': out.csv, 'manifest.json': out.manifest };
  if (arg('--review')) writeFileSync(arg('--review'), reviewMarkdown(out.review));
  if (process.argv.includes('--check')) {
    const stale = Object.entries(files).filter(([n, t]) => !existsSync(new URL(n, dataDir)) || readFileSync(new URL(n, dataDir), 'utf8') !== t);
    if (stale.length) {
      console.error(`data/ is out of date: ${stale.map(([n]) => n).join(', ')}. Run node tools/export-humanoids.mjs`);
      process.exit(1);
    }
    console.log(`data/ is current: free catalogue of ${out.count} records`);
  } else {
    mkdirSync(dataDir, { recursive: true });
    for (const [name, text] of Object.entries(files)) writeFileSync(new URL(name, dataDir), text);
    console.log(`Wrote data/: free catalogue of ${out.count} records`);
  }
}
