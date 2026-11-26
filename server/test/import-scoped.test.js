// Scoped import of the Deployments graph tabs (server/src/import/scoped.js). Synthetic rows only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T0, createTestDb, fixtureWorkbook } from './helpers.js';
import { DATASETS_BY_ID } from '../src/datasets.js';
import { runImport } from '../src/import/run.js';
import { GRAPH_DATASETS, runScopedImport, SCOPED_DATASETS } from '../src/import/scoped.js';
import { createApp } from '../src/app.js';
import { robotSlug } from '../src/relations/graph.js';

const catalogue = [
  { id: 1, Lab: 'Example Labs 1', Robot: 'Strider 5 (in development)' },
  { id: 2, Lab: 'Example Labs 2', Robot: 'Lifter' },
].map((r) => ({ ...r, lab: r.Lab, robot: r.Robot, slug: robotSlug(r.id, r.Lab, r.Robot) }));
const config = {
  aliases: {
    makers: { 'Example Labs 1': { id: 'org_example_one', entity_id: 'org_example_one', name: 'Example One Robotics', names: ['Example One Robotics'] } },
    robots: { 1: { model: ['Strider 5'], family: ['Strider'] } },
  },
  catalogue,
};
const spec = DATASETS_BY_ID.get('deployments');
const dep = (i, over = {}) => ({
  record_id: `fx_rec_${i}`, deployment_id: `fx_dep_${Math.ceil(i / 2)}`, organization_id: `org_fx_op_${i}`, organization_name: `Operator ${i}`,
  organization_role: 'customer_operator', organization_country: 'Exampleland', manufacturer: 'Example One Robotics', robot_model: 'Strider 5',
  robot_version: 'Not disclosed', operational_status: 'pilot', source_url: `https://news.example.com/${i}`, ...over,
});
function workbook(rows) {
  const values = fixtureWorkbook({ rowsPerTab: 12 });
  values[spec.tab] = [spec.headers, ...rows.map((r) => spec.headers.map((h) => r[h] ?? `fx_${h}_${r.record_id}`))];
  return values;
}
const base = () => workbook(Array.from({ length: 14 }, (_, k) => dep(k + 1)));
// The reviewed edit: one case enriched, one record withdrawn, one new evidence record, one source added. Withdrawing a
// record moves the sheet row and position of every later record, so those rows are rewritten too (8 here).
const edited = () => {
  const rows = Array.from({ length: 14 }, (_, k) => dep(k + 1)).filter((r) => r.record_id !== 'fx_rec_5');
  rows[1] = { ...rows[1], operational_status: 'production', source_url: 'https://news.example.com/2-update' };
  rows[8] = { ...rows[8], source_url: 'https://news.example.com/9-first-source' };
  rows.push(dep(15, { deployment_id: 'fx_dep_7' }));
  return workbook(rows);
};

const table = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;
const rowsState = (db, dataset) => table(db, 'SELECT row_id, position, sheet_row, preview_rank, visibility, data, preview_data FROM premium_rows WHERE dataset = ? ORDER BY row_id', dataset);
const docsState = (db, dataset) => table(db, 'SELECT scope, row_id, position, title, subtitle, names, haystack, tags, link FROM search_docs WHERE dataset = ? ORDER BY scope, row_id', dataset);
const graphs = (db) => table(db, 'SELECT scope, data, coverage FROM relation_graphs ORDER BY scope');
const others = async (db) => ({
  rows: await table(db, "SELECT dataset, row_id, data, snapshot_id FROM premium_rows WHERE dataset NOT IN ('deployments') ORDER BY dataset, row_id"),
  docs: await table(db, "SELECT scope, dataset, row_id, haystack FROM search_docs WHERE dataset NOT IN ('deployments', 'companies') ORDER BY scope, dataset, row_id"),
});

test('a scoped Deployments import ends exactly where a full import of the same workbook ends, and touches nothing else', async () => {
  const scoped = createTestDb();
  assert.equal((await runImport(scoped, base(), T0, { relationsConfig: config })).ok, true);
  const untouched = await others(scoped);
  const result = await runScopedImport(scoped, edited(), T0 + 60, { datasets: ['deployments'], relationsConfig: config });
  assert.equal(result.ok, true, result.error);
  assert.deepEqual(result.changes.deployments, { added: 1, changed: 10, removed: 1, unchanged: 3 });

  const full = createTestDb();
  assert.equal((await runImport(full, edited(), T0 + 60, { relationsConfig: config })).ok, true);
  assert.deepEqual(await rowsState(scoped, 'deployments'), await rowsState(full, 'deployments'));
  assert.deepEqual(await docsState(scoped, 'deployments'), await docsState(full, 'deployments'));
  assert.deepEqual(await docsState(scoped, 'companies'), await docsState(full, 'companies'));
  assert.deepEqual(await graphs(scoped), await graphs(full));
  assert.deepEqual(await others(scoped), untouched, 'other tabs and their search documents are not rewritten');
  const snaps = await table(scoped, "SELECT DISTINCT snapshot_id FROM premium_rows WHERE dataset = 'deployments'");
  assert.deepEqual(snaps.map((r) => r.snapshot_id), [new Date((T0 + 60) * 1000).toISOString()], 'every Deployments row carries the new snapshot');
  const [run] = await table(scoped, "SELECT status, counts FROM import_runs ORDER BY started_at DESC LIMIT 1");
  assert.equal(run.status, 'succeeded');
  assert.deepEqual(JSON.parse(run.counts).scoped, ['deployments']);
});

test('a dry run writes nothing and estimates the rows D1 would write, far below a full import', async () => {
  const db = createTestDb();
  await runImport(db, base(), T0, { relationsConfig: config });
  const before = { rows: await rowsState(db, 'deployments'), docs: await docsState(db, 'companies'), runs: await table(db, 'SELECT id FROM import_runs'), graphs: await graphs(db) };
  const dry = await runScopedImport(db, edited(), T0 + 60, { datasets: ['deployments'], relationsConfig: config, dryRun: true });
  assert.equal(dry.ok, true);
  assert.equal(dry.dryRun, true);
  assert.deepEqual(dry.changes.deployments, { added: 1, changed: 10, removed: 1, unchanged: 3 });
  assert.ok(dry.estimated_rows_written > 0 && dry.estimated_rows_written < 400, `estimate ${dry.estimated_rows_written}`);
  assert.deepEqual({ rows: await rowsState(db, 'deployments'), docs: await docsState(db, 'companies'), runs: await table(db, 'SELECT id FROM import_runs'), graphs: await graphs(db) }, before);
});

test('an unchanged tab rewrites no row and no search document', async () => {
  const db = createTestDb();
  await runImport(db, base(), T0, { relationsConfig: config });
  const result = await runScopedImport(db, base(), T0 + 60, { datasets: ['deployments'], relationsConfig: config });
  assert.equal(result.ok, true);
  assert.deepEqual(result.changes.deployments, { added: 0, changed: 0, removed: 0, unchanged: 14 });
  assert.deepEqual([result.search.upserted, result.search.deleted], [0, 0]);
});

test('only the Deployments graph tabs can be scoped; a bad tab or bad config changes nothing', async () => {
  assert.deepEqual(SCOPED_DATASETS, ['deployments', 'entities', 'evidence-links', 'stocks']);
  assert.deepEqual(GRAPH_DATASETS, ['deployments', 'entities', 'evidence-links']);
  const db = createTestDb();
  await runImport(db, base(), T0, { relationsConfig: config });
  const before = await rowsState(db, 'deployments');
  assert.equal((await runScopedImport(db, edited(), T0 + 60, { datasets: ['humanoids'] })).error, 'invalid_scope');
  assert.equal((await runScopedImport(db, edited(), T0 + 60, { datasets: [] })).error, 'invalid_scope');
  const drift = edited();
  drift[spec.tab][0] = drift[spec.tab][0].map((h, i) => (i === 3 ? 'RENAMED_COLUMN' : h));
  const failed = await runScopedImport(db, drift, T0 + 60, { datasets: ['deployments'], relationsConfig: config });
  assert.equal(failed.ok, false);
  assert.deepEqual((await table(db, "SELECT status FROM import_runs WHERE id = ?", failed.runId)).map((r) => r.status), ['failed']);
  assert.equal((await runScopedImport(db, edited(), T0 + 60, { datasets: ['deployments'], relationsConfig: { aliases: {}, catalogue: [] } })).error, 'invalid_relations_config');
  assert.deepEqual(await rowsState(db, 'deployments'), before);
});

test('the admin route passes the scope and dry run to the import and returns the estimate', async () => {
  const calls = [];
  const app = createApp({
    db: createTestDb(),
    config: { allowedOrigins: [], adminToken: 'admin-fixture' },
    gateway: {},
    mailer: {},
    importNow: async (token, relations, scoped) => {
      calls.push(scoped);
      return { ok: true, dryRun: scoped?.dryRun, scope: scoped?.datasets, changes: { deployments: { added: 0, changed: 3, removed: 0, unchanged: 195 } }, estimated_rows_written: 420, snapshotId: 'snap', warnings: [] };
    },
    clock: () => T0,
    log: { error() {}, warn() {} },
  });
  const res = await app(new Request('https://api.test/v1/admin/import', { method: 'POST', headers: { 'x-admin-token': 'admin-fixture', 'content-type': 'application/json' }, body: JSON.stringify({ datasets: ['deployments'], dry_run: true }) }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(calls, [{ datasets: ['deployments'], dryRun: true }]);
  assert.deepEqual([body.scope, body.dry_run, body.estimated_rows_written], [['deployments'], true, 420]);
  await app(new Request('https://api.test/v1/admin/import', { method: 'POST', headers: { 'x-admin-token': 'admin-fixture' } }));
  assert.deepEqual(calls[1], null, 'without datasets the full import runs as before');
});

test('a dry run can never become a full import: every other shape is refused before the import runs', async () => {
  const calls = [];
  const app = createApp({
    db: createTestDb(),
    config: { allowedOrigins: [], adminToken: 'admin-fixture' },
    gateway: {},
    mailer: {},
    importNow: async (token, relations, scoped) => { calls.push(scoped); return { ok: true, warnings: [] }; },
    clock: () => T0,
    log: { error() {}, warn() {} },
  });
  const post = (body) => app(new Request('https://api.test/v1/admin/import', { method: 'POST', headers: { 'x-admin-token': 'admin-fixture', 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  const refused = [
    [{ dry_run: true }, 'dry_run_requires_scope'],
    [{ dry_run: true, datasets: [] }, 'invalid_scope'],
    [{ dry_run: true, datasets: 'deployments' }, 'invalid_scope'],
    [{ datasets: [1] }, 'invalid_scope'],
    [{ datasets: [''] }, 'invalid_scope'],
    [{ datasets: null }, 'invalid_scope'],
    [{ dry_run: 'true', datasets: ['deployments'] }, 'invalid_dry_run'],
    [{ dry_run: 1 }, 'invalid_dry_run'],
  ];
  for (const [body, error] of refused) {
    const res = await post(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal((await res.json()).error, error, JSON.stringify(body));
  }
  assert.deepEqual(calls, [], 'the import never ran');
  assert.equal((await post({ dry_run: false })).status, 200, 'dry_run false without datasets is the full import, as before');
  assert.deepEqual(calls, [null]);
});

test('the workflow stops a dry run outside the scoped import; the snapshot column is in no index', async () => {
  const { readFileSync } = await import('node:fs');
  const wf = readFileSync(new URL('../../.github/workflows/import-workbook.yml', import.meta.url), 'utf8');
  assert.match(wf, /if \[ "\$\{\{ inputs\.dry_run == true \}\}" = true \] && \[ "\$\{\{ inputs\.scope \|\| 'all' \}\}" != deployments \] && \[ "\$\{\{ inputs\.scope \|\| 'all' \}\}" != stocks \]; then\n\s+echo "dry_run needs scope=deployments or scope=stocks; nothing was imported"; exit 1/);
  assert.ok(wf.indexOf('dry_run needs scope=deployments') < wf.indexOf('/v1/admin/import'), 'the guard runs before the import request');
  assert.match(wf, /options: \[all, deployments, stocks\]/);
  assert.match(wf, /if \[ "\$\{\{ inputs\.scope \|\| 'all' \}\}" = stocks \]; then\n\s+jq -c --argjson dry "\$\{\{ inputs\.dry_run == true \}\}" '\. \+ \{datasets: \["stocks"\], dry_run: \$dry\}'/);
  const sql = ['0001_init.sql', '0002_relations.sql', '0003_search.sql', '0004_report_orders.sql', '0005_report_orders_one_pending.sql']
    .map((m) => readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8')).join('\n');
  const indexes = sql.match(/CREATE (UNIQUE )?INDEX[^;]*ON premium_rows[^;]*;/g) ?? [];
  assert.ok(indexes.length >= 2 && indexes.every((i) => !/snapshot_id/.test(i)), 'a snapshot-only update writes the row alone');
});

// Scoped import of the Investment tab (stocks) alone, 26 Nov 2026: one listed company added and one corrected.
const stocksSpec = DATASETS_BY_ID.get('stocks');
const withStocks = (values, edit) => {
  const tab = values[stocksSpec.tab].map((r) => [...r]);
  edit(tab, stocksSpec.headers);
  return { ...values, [stocksSpec.tab]: tab };
};
const stocksEdited = () => withStocks(base(), (tab, h) => {
  const row = (name, ticker, isin) => h.map((f) => ({ NAME: name, TICKER: ticker, EXCHANGE: 'Nasdaq', ISIN: isin, GF_SYMBOL: `NASDAQ:${ticker}` }[f] ?? `fx_${f}_${ticker}`));
  tab[2] = tab[2].map((v, i) => (h[i] === 'DESCRIPTION' ? 'A corrected description' : v));
  tab.splice(tab.length - 1, 0, row('Example Listed Robotics', 'EXLR', ''));
});
const everythingButStocks = async (db) => ({
  rows: await table(db, "SELECT dataset, row_id, position, data, preview_data, snapshot_id FROM premium_rows WHERE dataset <> 'stocks' ORDER BY dataset, row_id"),
  docs: await table(db, "SELECT scope, dataset, row_id, position, title, subtitle, names, haystack, tags, link FROM search_docs WHERE dataset <> 'stocks' ORDER BY scope, dataset, row_id"),
  graphs: await table(db, 'SELECT * FROM relation_graphs ORDER BY scope'),
  config: await table(db, 'SELECT * FROM relation_config'),
});

test('a scoped stocks import ends where a full import ends for that tab and leaves every other tab, document and graph as it was', async () => {
  const scoped = createTestDb();
  assert.equal((await runImport(scoped, base(), T0, { relationsConfig: config })).ok, true);
  const untouched = await everythingButStocks(scoped);
  const result = await runScopedImport(scoped, stocksEdited(), T0 + 60, { datasets: ['stocks'], relationsConfig: config });
  assert.equal(result.ok, true, result.error);
  assert.deepEqual(result.changes.stocks, { added: 1, changed: 1, removed: 0, unchanged: 11 });
  assert.equal(result.relations, null, 'no relation graph rebuilt');

  const full = createTestDb();
  assert.equal((await runImport(full, stocksEdited(), T0 + 60, { relationsConfig: config })).ok, true);
  assert.deepEqual(await rowsState(scoped, 'stocks'), await rowsState(full, 'stocks'));
  assert.deepEqual(await docsState(scoped, 'stocks'), await docsState(full, 'stocks'));
  assert.deepEqual(await everythingButStocks(scoped), untouched, 'other tabs, their search documents, the company dossiers and the graphs are not rewritten');
  const snaps = await table(scoped, "SELECT DISTINCT snapshot_id FROM premium_rows WHERE dataset = 'stocks'");
  assert.deepEqual(snaps.map((r) => r.snapshot_id), [new Date((T0 + 60) * 1000).toISOString()]);
  const added = await table(scoped, "SELECT data FROM premium_rows WHERE dataset = 'stocks' AND data LIKE '%EXLR%'");
  assert.equal(added.length, 1);
  assert.equal(JSON.parse(added[0].data).isin, null, 'no ISIN is invented');
  assert.ok((await table(scoped, "SELECT row_id FROM search_docs WHERE dataset = 'stocks' AND scope = 'preview' AND haystack LIKE '% exlr %'")).length === 1, 'the new listing is searchable publicly');
});

test('a scoped stocks dry run writes nothing and estimates a few dozen rows', async () => {
  const db = createTestDb();
  await runImport(db, base(), T0, { relationsConfig: config });
  const before = { stocks: await rowsState(db, 'stocks'), docs: await docsState(db, 'stocks'), rest: await everythingButStocks(db), runs: await table(db, 'SELECT id FROM import_runs') };
  const dry = await runScopedImport(db, stocksEdited(), T0 + 60, { datasets: ['stocks'], dryRun: true });
  assert.equal(dry.ok, true);
  assert.deepEqual(dry.changes, { stocks: { added: 1, changed: 1, removed: 0, unchanged: 11 } });
  assert.ok(dry.estimated_rows_written > 0 && dry.estimated_rows_written < 60, `estimate ${dry.estimated_rows_written}`);
  assert.deepEqual({ stocks: await rowsState(db, 'stocks'), docs: await docsState(db, 'stocks'), rest: await everythingButStocks(db), runs: await table(db, 'SELECT id FROM import_runs') }, before);
});
