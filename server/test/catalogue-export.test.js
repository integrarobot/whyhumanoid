// The free catalogue export withholds the same rows as the import, and the 13-tab preview rule is unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExport, readLegacySnapshot, readVerifiedUpdates } from '../../tools/export-humanoids.mjs';
import { DATASETS, publicRowLimit } from '../src/datasets.js';

const legacy = readLegacySnapshot();
const updates = readVerifiedUpdates();

// 133 legacy robots plus each verified insertion (Darwin-0, 17 Nov 2026, is the first). Ids and sheet rows stay unique.
const EXPECTED_PUBLIC = 133 + updates.inserted.length;

test('the committed free catalogue holds every legacy and inserted public robot once', () => {
  const out = buildExport(legacy, updates);
  const records = JSON.parse(out.json).records;
  assert.ok(updates.inserted.length >= 1);
  assert.equal(records.length, EXPECTED_PUBLIC);
  assert.equal(new Set(records.map((r) => r.id)).size, EXPECTED_PUBLIC);
  assert.equal(new Set(records.map((r) => r.sheet_row)).size, EXPECTED_PUBLIC);
  assert.ok(!records.some((r) => /duplicate reference|exclude this row/i.test(Object.values(r).join(' '))));
});

test('an inserted row the sheet marks as a duplicate is withheld from the free catalogue', () => {
  const values = Object.fromEntries(JSON.parse(buildExport(legacy, updates).json).fields.map((f) => [f, null]));
  const duplicate = {
    id: 999,
    sheet_row: 38,
    values: {
      ...values,
      Lab: 'Genesis',
      'Platform / mobility': 'Duplicate reference; not a second robot',
      'Buyer checks': 'Exclude this row from company and funding counts',
    },
  };
  const out = buildExport(legacy, { ...updates, inserted: [...updates.inserted, duplicate] });
  assert.deepEqual(out.withheld, [999]);
  assert.equal(out.count, EXPECTED_PUBLIC);
});

test('all 13 tabs stay; Humanoids is free in full and the others show 10 source sheet rows', () => {
  assert.equal(DATASETS.length, 13);
  for (const spec of DATASETS) assert.equal(publicRowLimit(spec), spec.id === 'humanoids' ? null : 10);
});

// Paywall (decision of 16 Nov 2026): the site publishes only the first 10 sheet rows of each of the 12 other tabs;
// full rows are premium and live only in the backend database. This guards against publishing full rows again.
test('the public export holds only the first 10 sheet rows of each of the 12 other tabs, with full counts', async () => {
  const { writeFileSync, mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { fixtureWorkbook } = await import('./helpers.js');
  const { buildDatabase, validateDatabase, isInternalField, PREVIEW_SOURCE_ROWS } = await import('../../tools/export-database.mjs');
  const file = join(mkdtempSync(join(tmpdir(), 'wh-')), 'workbook.json');
  writeFileSync(file, JSON.stringify(fixtureWorkbook({ rowsPerTab: 14 })));
  const { index, tabs, counts } = await buildDatabase(file, '2026-11-16T00:00:00Z');
  assert.deepEqual(validateDatabase(index, tabs), []);
  assert.equal(index.tabs.length, 12);
  for (const t of index.tabs) {
    assert.equal(t.entries_total, counts[t.id], `${t.id}: total counts every imported row`);
    assert.ok(tabs[t.id].rows.every((r) => r._row <= PREVIEW_SOURCE_ROWS), `${t.id}: no row past sheet row 10`);
    assert.ok(tabs[t.id].rows.length < counts[t.id] || counts[t.id] <= 10, `${t.id}: cut to the preview`);
    assert.ok(!t.fields.some(isInternalField), `${t.id}: no internal fields`);
  }
  // A full tab fails validation.
  const full = { ...tabs.deployments, rows: [...tabs.deployments.rows, { ...tabs.deployments.rows[0], _row: 11 }] };
  assert.ok(validateDatabase(index, { ...tabs, deployments: full }).length > 0, 'a row past the preview is refused');
});

test('the committed previews match their index and hold no full tab', async () => {
  const { readDatabase, validateDatabase } = await import('../../tools/export-database.mjs');
  const { index, tabs } = readDatabase();
  assert.deepEqual(validateDatabase(index, tabs), []);
  assert.ok(index.tabs.some((t) => t.entries_total > tabs[t.id].rows.length), 'totals larger than the previews');
});
