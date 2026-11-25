// The free catalogue export withholds the same rows as the import, and the 13-tab preview rule is unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExport, readLegacySnapshot, readVerifiedUpdates } from '../../tools/export-humanoids.mjs';
import { DATASETS, publicRowLimit } from '../src/datasets.js';
import { PUBLIC_FIELDS } from '../src/access/fields.js';

const legacy = readLegacySnapshot();
const updates = readVerifiedUpdates();

// 133 legacy robots plus each verified insertion (Darwin-0, 17 Nov 2026, is the first), less the records the workbook
// moved to another tab (tools/humanoids-identity.json, 25 Nov 2026), which keep a labelled page but leave the catalogue.
// Ids and sheet rows stay unique.
const EXPECTED_PUBLIC = 133 + updates.inserted.length - (updates.moved?.length ?? 0);

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

const PUBLIC_ALL = ['benchmarks', 'benchmark-results', 'humanoids', 'integrators', 'software', 'datasets', 'dataset-metrics', 'task-evaluations', 'other-robots', 'stocks'];
const COUNTED_ONLY = ['evidence-links', 'container-handling', 'data-space'];
test('all 17 datasets stay; every row public (free tabs in full, Deployments and Components at public fields); three counted only', () => {
  assert.equal(DATASETS.length, 17);
  for (const spec of DATASETS) assert.equal(publicRowLimit(spec), COUNTED_ONLY.includes(spec.id) ? 0 : null, spec.id);
  for (const spec of DATASETS) assert.equal(spec.access === 'free', PUBLIC_ALL.includes(spec.id), spec.id);
});

// Access (24 Nov 2026): the site publishes every row of the free tabs, and every row of Deployments and Components at
// the public fields of server/src/access/fields.js; full rows of those tabs live only in the backend database. This
// guards against publishing a paid field.
test('the public export: free tabs in full, subscription tabs at their public fields only, counted-only tabs empty', async () => {
  const { writeFileSync, mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { fixtureWorkbook } = await import('./helpers.js');
  const { buildDatabase, validateDatabase, isInternalField, PREVIEW_SOURCE_ROWS } = await import('../../tools/export-database.mjs');
  const file = join(mkdtempSync(join(tmpdir(), 'wh-')), 'workbook.json');
  writeFileSync(file, JSON.stringify(fixtureWorkbook({ rowsPerTab: 14 })));
  const { index, tabs, counts } = await buildDatabase(file, '2026-11-16T00:00:00Z');
  assert.deepEqual(validateDatabase(index, tabs), []);
  // Datasets and the two Atlas tabs of Benchmarks publish through their own snapshots, not previews.
  assert.equal(index.tabs.length, 12);
  assert.ok(!index.tabs.some((t) => ['datasets', 'dataset-metrics', 'benchmarks', 'benchmark-results'].includes(t.id)));
  for (const t of index.tabs) {
    assert.equal(t.entries_total, counts[t.id], `${t.id}: total counts every imported row`);
    if (PUBLIC_ALL.includes(t.id)) {
      assert.equal(tabs[t.id].rows.length, counts[t.id], `${t.id}: every row is public`);
      if (t.id === 'stocks') for (const r of tabs[t.id].rows) assert.ok(!('price' in r) && !('market_cap' in r), 'stocks: third-party quote columns stay withheld');
      continue;
    }
    const allowed = PUBLIC_FIELDS[t.id];
    if (!allowed.length) { assert.equal(tabs[t.id].rows.length, 0, `${t.id}: counted only`); continue; }
    assert.equal(tabs[t.id].rows.length, counts[t.id], `${t.id}: every row listed`);
    for (const r of tabs[t.id].rows) for (const k of Object.keys(r)) assert.ok(k === '_row' || allowed.includes(k), `${t.id}.${k} is paid`);
    assert.ok(!t.fields.some(isInternalField), `${t.id}: no internal fields`);
    assert.doesNotMatch(JSON.stringify(tabs[t.id]), /fx_(claim_text|site_name|task_description|metric_value)_/);
  }
  // A paid field fails validation, in Deployments and in Components.
  const leak = { ...tabs.deployments, rows: tabs.deployments.rows.map((r, i) => (i ? r : { ...r, claim_text: 'x' })) };
  assert.ok(validateDatabase(index, { ...tabs, deployments: leak }).some((p) => /paid field claim_text/.test(p)), 'a paid Deployments field is refused');
  const comp = { ...tabs.hardware, rows: tabs.hardware.rows.map((r, i) => (i ? r : { ...r, list_price: '1 USD' })) };
  assert.ok(validateDatabase(index, { ...tabs, hardware: comp }).some((p) => /paid field list_price/.test(p)), 'a paid Components field is refused');
  const cut = { ...tabs.deployments, rows: tabs.deployments.rows.slice(1) };
  assert.ok(validateDatabase(index, { ...tabs, deployments: { ...cut } }).length > 0, 'a missing case is refused: every row is listed');
});

test('the committed public rows match their index and hold no paid field', async () => {
  const { readDatabase, validateDatabase } = await import('../../tools/export-database.mjs');
  const { index, tabs } = readDatabase();
  assert.deepEqual(validateDatabase(index, tabs), []);
  assert.ok(index.tabs.filter((t) => t.public === 'none').every((t) => t.entries_total > 0 && !tabs[t.id].rows.length), 'counted-only tabs list nothing');
});
