// Sheet titles of the master workbook (23 Nov 2026): the live import requests the CURRENT titles; former titles are
// aliases for old exports only. Hardware -> Components and Stocks -> Investment keep their dataset ids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATASETS, DATASETS_BY_ID, tabValues } from '../src/datasets.js';
import { fetchWorkbookValues } from '../src/import/google-sheets.js';
import { runImport } from '../src/import/run.js';
import { createTestDb, fixtureWorkbook } from './helpers.js';

test('the live import asks Google Sheets for the current titles only', async () => {
  const titles = DATASETS.map((d) => d.tab);
  for (const t of ['Components', 'Investment', 'Evidence Relations', 'Task Evaluation', 'Clean Entities', 'Product - Container Handling']) assert.ok(titles.includes(t), t);
  for (const t of ['Hardware', 'Stocks', 'Relaciones evidencia', 'Evaluacion tarea', 'Entidades limpias', 'Producto - Contenedores']) assert.ok(!titles.includes(t), `${t} is a former title`);
  assert.equal(DATASETS_BY_ID.get('hardware').tab, 'Components');
  assert.equal(DATASETS_BY_ID.get('stocks').tab, 'Investment');
  // The request itself: one batchGet with the current titles as ranges.
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => { calls.push(String(url)); return new Response(JSON.stringify({ valueRanges: titles.map(() => ({ values: [] })) })); };
  try { await fetchWorkbookValues({ sheetId: 'fx', tabs: titles, accessToken: 'fx', now: 0 }); } finally { globalThis.fetch = realFetch; }
  const ranges = new URL(calls.at(-1)).searchParams.getAll('ranges');
  assert.ok(ranges.includes("'Components'") && ranges.includes("'Investment'"));
  assert.ok(!ranges.includes("'Hardware'") && !ranges.includes("'Stocks'"));
});

test('ids, rows and identities do not depend on the sheet title', async () => {
  const current = fixtureWorkbook({ rowsPerTab: 12 });
  const former = { ...current };
  for (const [id, old] of [['hardware', 'Hardware'], ['stocks', 'Stocks']]) { former[old] = current[DATASETS_BY_ID.get(id).tab]; delete former[DATASETS_BY_ID.get(id).tab]; }
  assert.equal(tabValues(former, DATASETS_BY_ID.get('stocks')), current.Investment, 'an old export still reads through the alias');
  const a = createTestDb(); const b = createTestDb();
  const ra = await runImport(a, current, 1_800_000_000);
  const rb = await runImport(b, former, 1_800_000_000);
  assert.ok(ra.ok && rb.ok);
  assert.deepEqual(ra.counts, rb.counts);
  for (const id of ['hardware', 'stocks']) {
    const rows = async (db) => (await db.prepare('SELECT row_id, data FROM premium_rows WHERE dataset = ? ORDER BY position').bind(id).all()).results.map((r) => [r.row_id.replace(/^[a-z]+_[A-Za-z0-9]+$/, (x) => x.split('_')[0]), r.data]);
    assert.deepEqual((await rows(a)).map((r) => r[1]), (await rows(b)).map((r) => r[1]), `${id}: same rows under either title`);
  }
});
