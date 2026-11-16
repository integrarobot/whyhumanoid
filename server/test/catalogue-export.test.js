// The free catalogue export withholds the same rows as the import, and the 13-tab preview rule is unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExport, readLegacySnapshot, readVerifiedUpdates } from '../../tools/export-humanoids.mjs';
import { DATASETS, publicRowLimit } from '../src/datasets.js';

const legacy = readLegacySnapshot();
const updates = readVerifiedUpdates();

test('the committed free catalogue holds 133 distinct public robots', () => {
  const out = buildExport(legacy, updates);
  const records = JSON.parse(out.json).records;
  assert.equal(records.length, 133);
  assert.equal(new Set(records.map((r) => r.id)).size, 133);
  assert.equal(new Set(records.map((r) => r.sheet_row)).size, 133);
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
  assert.equal(out.count, 133);
});

test('all 13 tabs stay; Humanoids is free in full and the others show 10 source sheet rows', () => {
  assert.equal(DATASETS.length, 13);
  for (const spec of DATASETS) assert.equal(publicRowLimit(spec), spec.id === 'humanoids' ? null : 10);
});
