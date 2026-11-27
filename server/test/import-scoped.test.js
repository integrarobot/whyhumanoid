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
  assert.deepEqual(SCOPED_DATASETS, ['deployments', 'entities', 'evidence-links', 'stocks', 'humanoids', 'integrators']);
  assert.deepEqual(GRAPH_DATASETS, ['deployments', 'entities', 'evidence-links']);
  const db = createTestDb();
  await runImport(db, base(), T0, { relationsConfig: config });
  const before = await rowsState(db, 'deployments');
  assert.equal((await runScopedImport(db, edited(), T0 + 60, { datasets: ['hardware'] })).error, 'invalid_scope');
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
  assert.match(wf, /options: \[all, deployments, stocks, stocks-humanoids, integrators, stocks-humanoids-integrators\]/);
  assert.ok(wf.indexOf('unknown scope') < wf.indexOf('/v1/admin/import'), 'the guards run before the import request');
  const sql = ['0001_init.sql', '0002_relations.sql', '0003_search.sql', '0004_report_orders.sql', '0005_report_orders_one_pending.sql']
    .map((m) => readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8')).join('\n');
  const indexes = sql.match(/CREATE (UNIQUE )?INDEX[^;]*ON premium_rows[^;]*;/g) ?? [];
  assert.ok(indexes.length >= 2 && indexes.every((i) => !/snapshot_id/.test(i)), 'a snapshot-only update writes the row alone');
});

// Runs the workflow step that builds the import request, as GitHub runs it (bash -eo pipefail), for every scope and
// dry-run value, with a stub relations config. An unknown scope, a malformed dry_run or a dry run of the full import
// stops before writing a request body; every allowed scope produces exactly the body it names.
test('the workflow step that builds the request refuses unknown scopes and never sends a dry run without datasets', async () => {
  const { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } = await import('node:fs');
  const { spawnSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const lines = readFileSync(new URL('../../.github/workflows/import-workbook.yml', import.meta.url), 'utf8').split('\n');
  const at = lines.indexOf('      - name: Relations config from this commit');
  const runAt = lines.indexOf('        run: |', at);
  const script = [];
  for (const line of lines.slice(runAt + 1)) {
    if (line.trim() && !line.startsWith('          ')) break;
    script.push(line.slice(10));
  }
  const body = script.join('\n');
  assert.ok(!body.includes('${{'), 'inputs reach the script as environment variables only');
  const run = (env) => {
    const dir = mkdtempSync(join(tmpdir(), 'wf-'));
    mkdirSync(join(dir, 'tools'));
    writeFileSync(join(dir, 'tools', 'relations.mjs'), "console.log(JSON.stringify({ aliases: { makers: {}, robots: {} }, catalogue: [] }));\n");
    const res = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', body], { cwd: dir, env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });
    const file = join(dir, 'relations-body.json');
    const out = { status: res.status, stdout: res.stdout, body: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null };
    rmSync(dir, { recursive: true, force: true });
    return out;
  };
  for (const [SCOPE, DRY_RUN] of [['deploy', 'true'], ['deploy', 'false'], ['Stocks', 'true'], ['', 'true'], ['all', 'true'], ['stocks', 'yes'], ['stocks;rm -rf /', 'true']]) {
    const r = run({ SCOPE, DRY_RUN });
    assert.equal(r.status, 1, `${SCOPE}/${DRY_RUN} must stop`);
    assert.equal(r.body, null, `${SCOPE}/${DRY_RUN} writes no request body`);
  }
  const full = run({ SCOPE: 'all', DRY_RUN: 'false' });
  assert.equal(full.status, 0, full.stdout);
  assert.ok(!('datasets' in full.body) && !('dry_run' in full.body) && full.body.relations_config);
  const expected = { deployments: ['deployments', 'entities', 'evidence-links'], stocks: ['stocks'], 'stocks-humanoids': ['stocks', 'humanoids'], integrators: ['integrators'], 'stocks-humanoids-integrators': ['stocks', 'humanoids', 'integrators'] };
  for (const [SCOPE, datasets] of Object.entries(expected)) {
    for (const dry of [true, false]) {
      const r = run({ SCOPE, DRY_RUN: String(dry) });
      assert.equal(r.status, 0, `${SCOPE}/${dry}: ${r.stdout}`);
      assert.deepEqual([r.body.datasets, r.body.dry_run], [datasets, dry], `${SCOPE}/${dry}`);
    }
  }
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

// Scoped import of Investment and Humanoids (26 Nov 2026): the listing confirmed in both tabs. Humanoids has no id
// column: ids come from identity_registry, planned in the same way as the full import and never written by a dry run.
const humSpec = DATASETS_BY_ID.get('humanoids');
const listedEdit = () => {
  const values = stocksEdited();
  const tab = values[humSpec.tab].map((r) => [...r]);
  const h = humSpec.headers;
  const stockCol = h.indexOf('Stock');
  tab[1] = tab[1].map((v, i) => (i === stockCol ? 'NASDAQ:EXLR; common stock trading since 2026-11-05' : v));
  const fresh = tab[1].map((v, i) => (h[i] === 'Lab' ? 'Example Labs 99' : h[i] === 'Robot' ? 'Example Robot 99' : h[i] === 'Web' ? 'https://example.com/robots/99' : v));
  tab.splice(tab.length - 1, 0, fresh);
  return { ...values, [humSpec.tab]: tab };
};
const registry = (db, ns) => table(db, 'SELECT namespace, natural_key, id, aliases, first_seen, last_seen FROM identity_registry WHERE namespace = ? ORDER BY natural_key', ns);
const outside = async (db) => ({
  rows: await table(db, "SELECT dataset, row_id, position, data, preview_data, snapshot_id FROM premium_rows WHERE dataset NOT IN ('stocks', 'humanoids') ORDER BY dataset, row_id"),
  docs: await table(db, "SELECT scope, dataset, row_id, position, title, subtitle, names, haystack, tags, link FROM search_docs WHERE dataset NOT IN ('stocks', 'humanoids') ORDER BY scope, dataset, row_id"),
  graphs: await table(db, 'SELECT * FROM relation_graphs ORDER BY scope'),
  config: await table(db, 'SELECT * FROM relation_config'),
  identities: await table(db, "SELECT * FROM identity_registry WHERE namespace <> 'humanoids' ORDER BY namespace, natural_key"),
});
const humState = async (db) => ({ rows: await rowsState(db, 'humanoids'), docs: await docsState(db, 'humanoids'), registry: await registry(db, 'humanoids'), stocks: await rowsState(db, 'stocks'), stockDocs: await docsState(db, 'stocks') });

test('a scoped Investment and Humanoids import: same rows, ids and documents as a full import, nothing else touched', async () => {
  const db = createTestDb();
  assert.equal((await runImport(db, base(), T0, { relationsConfig: config })).ok, true);
  const idsBefore = new Map((await registry(db, 'humanoids')).map((r) => [r.natural_key, r.id]));
  const untouched = await outside(db);
  const humanoidRows = (await rowsState(db, 'humanoids')).length;
  const result = await runScopedImport(db, listedEdit(), T0 + 60, { datasets: ['stocks', 'humanoids'], relationsConfig: config });
  assert.equal(result.ok, true, result.error);
  assert.deepEqual(result.changes.humanoids, { added: 1, changed: 1, removed: 0, unchanged: humanoidRows - 1 });
  assert.deepEqual(result.identities, { inserted: 1, updated: idsBefore.size });
  assert.equal(result.relations, null);
  assert.deepEqual(await outside(db), untouched, 'other tabs, documents, graphs, relations config and identity namespaces are not rewritten');
  const after = await registry(db, 'humanoids');
  for (const r of after) if (idsBefore.has(r.natural_key)) assert.equal(r.id, idsBefore.get(r.natural_key), `${r.natural_key} keeps its id`);
  assert.equal(after.length, idsBefore.size + 1, 'the new robot gets one new id');
  assert.ok(after.every((r) => r.last_seen === T0 + 60));
  // A full import of the same workbook at the same time finds nothing left to change in these two tabs.
  const scopedState = await humState(db);
  assert.ok(scopedState.docs.some((d) => d.scope === 'full' && /example one robotics/.test(d.haystack)), 'Humanoids documents carry the reviewed maker aliases');
  assert.equal((await runImport(db, listedEdit(), T0 + 60, { relationsConfig: config })).ok, true);
  assert.deepEqual(await humState(db), scopedState);
});

test('a scoped Investment and Humanoids dry run plans the registry writes and writes nothing, not even last_seen', async () => {
  const db = createTestDb();
  await runImport(db, base(), T0, { relationsConfig: config });
  const before = { ...(await humState(db)), rest: await outside(db), runs: await table(db, 'SELECT id FROM import_runs') };
  const dry = await runScopedImport(db, listedEdit(), T0 + 60, { datasets: ['stocks', 'humanoids'], relationsConfig: config, dryRun: true });
  assert.equal(dry.ok, true, dry.error);
  assert.equal(dry.dryRun, true);
  assert.deepEqual(dry.identities, { inserted: 1, updated: before.registry.length });
  assert.deepEqual(dry.changes.stocks, { added: 1, changed: 1, removed: 0, unchanged: 11 });
  assert.ok(dry.estimated_rows_written > 0 && dry.estimated_rows_written < 120, `estimate ${dry.estimated_rows_written}`);
  assert.deepEqual({ ...(await humState(db)), rest: await outside(db), runs: await table(db, 'SELECT id FROM import_runs') }, before);
});

// Scoped import of the Integrators catalogue (27 Nov 2026): one provider's reviewed cells change (as CA3's eight cells
// did). Only that tab's rows and search documents change; graphs, projection, dossiers and other tabs stay as they were.
const intSpec = DATASETS_BY_ID.get('integrators');
const integratorsEdited = (values = base()) => {
  const tab = values[intSpec.tab].map((r) => [...r]);
  const h = intSpec.headers;
  const row = tab.findIndex((r) => r[h.indexOf('PROVIDER ID')] === 'int_fx1');
  tab[row] = tab[row].map((v, i) => ({ DESCRIPTION: 'Synthetic specialist exception, rechecked description.', 'REVIEWED AT': '2026-11-26', LIMITATIONS: 'Synthetic single-seed limitation.' }[h[i]] ?? v));
  return { ...values, [intSpec.tab]: tab };
};
const outsideIntegrators = async (db) => ({
  rows: await table(db, "SELECT dataset, row_id, position, data, preview_data, snapshot_id FROM premium_rows WHERE dataset <> 'integrators' ORDER BY dataset, row_id"),
  docs: await table(db, "SELECT scope, dataset, row_id, position, title, subtitle, names, haystack, tags, link FROM search_docs WHERE dataset <> 'integrators' ORDER BY scope, dataset, row_id"),
  graphs: await table(db, 'SELECT * FROM relation_graphs ORDER BY scope'),
  config: await table(db, 'SELECT * FROM relation_config'),
  identities: await table(db, 'SELECT * FROM identity_registry ORDER BY namespace, natural_key'),
});

test('a scoped Integrators import ends where a full import ends for that tab and touches nothing else', async () => {
  const scoped = createTestDb();
  assert.equal((await runImport(scoped, base(), T0, { relationsConfig: config })).ok, true);
  const untouched = await outsideIntegrators(scoped);
  const rows = (await rowsState(scoped, 'integrators')).length;
  const result = await runScopedImport(scoped, integratorsEdited(), T0 + 60, { datasets: ['integrators'], relationsConfig: config });
  assert.equal(result.ok, true, result.error);
  assert.deepEqual(result.changes.integrators, { added: 0, changed: 1, removed: 0, unchanged: rows - 1 });
  assert.equal(result.relations, null, 'no relation graph rebuilt');
  assert.deepEqual(await outsideIntegrators(scoped), untouched);
  const full = createTestDb();
  assert.equal((await runImport(full, integratorsEdited(), T0 + 60, { relationsConfig: config })).ok, true);
  assert.deepEqual(await rowsState(scoped, 'integrators'), await rowsState(full, 'integrators'));
  assert.deepEqual(await docsState(scoped, 'integrators'), await docsState(full, 'integrators'));
  const ca3 = (await table(scoped, "SELECT data FROM premium_rows WHERE dataset = 'integrators'")).map((r) => JSON.parse(r.data)).filter((d) => d.provider_id === 'int_fx1');
  assert.deepEqual(ca3.map((d) => d.reviewed_at), ['2026-11-26'], 'the rechecked date is served');
  assert.ok((await table(scoped, "SELECT row_id FROM search_docs WHERE dataset = 'integrators' AND scope = 'preview' AND haystack LIKE '%rechecked description%'")).length === 1, 'the public search sees the new text');
});

test('one scoped import covers Investment, Humanoids and Integrators together; its dry run writes nothing', async () => {
  const db = createTestDb();
  await runImport(db, base(), T0, { relationsConfig: config });
  const values = integratorsEdited(listedEdit());
  const before = { all: await table(db, 'SELECT dataset, row_id, data, snapshot_id FROM premium_rows ORDER BY dataset, row_id'), docs: await table(db, 'SELECT * FROM search_docs ORDER BY scope, dataset, row_id'), ids: await table(db, 'SELECT * FROM identity_registry ORDER BY namespace, natural_key'), runs: await table(db, 'SELECT id FROM import_runs') };
  const dry = await runScopedImport(db, values, T0 + 60, { datasets: ['stocks', 'humanoids', 'integrators'], relationsConfig: config, dryRun: true });
  assert.equal(dry.ok, true, dry.error);
  assert.deepEqual(Object.keys(dry.changes).sort(), ['humanoids', 'integrators', 'stocks']);
  assert.equal(dry.changes.integrators.changed, 1);
  assert.ok(dry.estimated_rows_written > 0 && dry.estimated_rows_written < 200, `estimate ${dry.estimated_rows_written}`);
  assert.deepEqual({ all: await table(db, 'SELECT dataset, row_id, data, snapshot_id FROM premium_rows ORDER BY dataset, row_id'), docs: await table(db, 'SELECT * FROM search_docs ORDER BY scope, dataset, row_id'), ids: await table(db, 'SELECT * FROM identity_registry ORDER BY namespace, natural_key'), runs: await table(db, 'SELECT id FROM import_runs') }, before);
  const run = await runScopedImport(db, values, T0 + 60, { datasets: ['stocks', 'humanoids', 'integrators'], relationsConfig: config });
  assert.equal(run.ok, true, run.error);
  const full = createTestDb();
  assert.equal((await runImport(full, values, T0 + 60, { relationsConfig: config })).ok, true);
  for (const d of ['stocks', 'integrators']) assert.deepEqual(await rowsState(db, d), await rowsState(full, d), d);
  // Humanoids ids come from each database's identity registry, so compare the rows without them.
  const noIds = async (x) => (await rowsState(x, 'humanoids')).map(({ row_id, ...r }) => r).sort((a, b) => a.position - b.position);
  assert.deepEqual(await noIds(db), await noIds(full), 'humanoids');
});
