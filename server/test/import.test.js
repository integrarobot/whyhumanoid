import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T0, createTestDb, fixtureWorkbook } from './helpers.js';
import { DATASETS } from '../src/datasets.js';
import { runImport } from '../src/import/run.js';
import { fetchWorkbookValues } from '../src/import/google-sheets.js';

const rowsOf = async (db, dataset) =>
  (await db.prepare('SELECT row_id, sheet_row, preview_rank, data FROM premium_rows WHERE dataset = ? ORDER BY position').bind(dataset).all())
    .results.map((r) => ({ id: r.row_id, sheet_row: r.sheet_row, preview_rank: r.preview_rank, ...JSON.parse(r.data) }));

test('imports all thirteen workbook tabs, Humanoids included', async () => {
  assert.equal(DATASETS.length, 13);
  const result = await runImport(createTestDb(), fixtureWorkbook(), T0);
  assert.equal(result.ok, true);
  assert.equal(Object.keys(result.counts).filter((k) => !k.endsWith('_internal')).length, 13);
  assert.equal(result.counts.humanoids, 12);
  assert.equal(result.counts.humanoids_internal, 2);
  assert.equal(result.counts.deployments, 12);
  assert.equal(result.counts.integrators, 12);
  assert.equal(result.counts.software, 24);
  assert.equal(result.counts['other-robots'], 24);
});

test('preview ranks follow workbook order and skip empty rows', async () => {
  const db = createTestDb();
  await runImport(db, fixtureWorkbook(), T0);
  const rows = await rowsOf(db, 'deployments');
  assert.deepEqual(rows.slice(2, 5).map((r) => [r.sheet_row, r.preview_rank]), [[4, 3], [6, 4], [7, 5]]);
  assert.equal(rows.filter((r) => r.preview_rank <= 10).length, 10);
});

test('side-by-side directory tabs are split into typed lists', async () => {
  const db = createTestDb();
  await runImport(db, fixtureWorkbook(), T0);
  const software = await rowsOf(db, 'software');
  assert.deepEqual([...new Set(software.map((r) => r.list))], ['software', 'world_model']);
});

test('stock quote fields from GOOGLEFINANCE are withheld', async () => {
  const db = createTestDb();
  await runImport(db, fixtureWorkbook(), T0);
  const [stock] = await rowsOf(db, 'stocks');
  for (const field of ['price', 'change_pct', 'market_cap', 'last_trade', 'data_delay_min', 'quote_status']) assert.ok(!(field in stock), field);
});

test('Humanoids rows are cleaned: internal editor tasks stripped, ambiguous clauses kept and reported', async () => {
  const result = await runImport(createTestDb(), fixtureWorkbook(), T0);
  assert.deepEqual(
    result.review.filter((r) => r.dataset === 'humanoids').map((r) => [r.action, r.reason]),
    [['stripped', 'internal_editor_task'], ['flagged', 'instruction_wording']],
  );
});

test('integrator ids are persistent, opaque and keyed on the official domain, never on the name', async () => {
  const db = createTestDb();
  await runImport(db, fixtureWorkbook(), T0);
  const before = await rowsOf(db, 'integrators');
  assert.match(before[0].id, /^int_[A-Za-z0-9_-]{16}$/);
  assert.ok(!before[0].id.includes('example'));
  const renamed = fixtureWorkbook();
  renamed.Integrators[1][0] = 'Example Integrator Renamed GmbH';
  renamed.Integrators[1][1] = 'https://www.integrator-1.example.com/about';
  await runImport(db, renamed, T0 + 86400);
  const after = await rowsOf(db, 'integrators');
  assert.equal(after[0].id, before[0].id, 'same official domain keeps the id');
  assert.equal(after[0].name, 'Example Integrator Renamed GmbH');
  const registry = await db.prepare("SELECT aliases FROM identity_registry WHERE id = ?").bind(before[0].id).first();
  assert.deepEqual(JSON.parse(registry.aliases), ['Example integrator 1', 'Example Integrator Renamed GmbH']);
});

// Cloudflare allows about 1,000 D1 calls per Worker invocation; the first live import failed at 999.
function countingDb() {
  const db = createTestDb();
  const counter = { calls: 0 };
  const wrap = (stmt) => ({
    bind: (...p) => wrap(stmt.bind(...p)),
    first: () => (counter.calls++, stmt.first()),
    all: () => (counter.calls++, stmt.all()),
    run: () => (counter.calls++, stmt.run()),
    runSync: () => stmt.runSync(),
  });
  return {
    counter,
    prepare: (sql) => wrap(db.prepare(sql)),
    batch: (statements) => (counter.calls++, db.batch(statements)),
  };
}

test('an import makes a fixed number of D1 calls, whatever the number of rows', async () => {
  for (const rowsPerTab of [12, 1500]) {
    const db = countingDb();
    const first = await runImport(db, fixtureWorkbook({ rowsPerTab }), T0);
    assert.equal(first.ok, true);
    const again = await runImport(db, fixtureWorkbook({ rowsPerTab }), T0 + 86400);
    assert.equal(again.ok, true);
    assert.ok(db.counter.calls <= 2 * 12, `${db.counter.calls} D1 calls for two imports of ${rowsPerTab} rows per tab`);
    const ids = await db.prepare('SELECT COUNT(*) AS n FROM identity_registry').first();
    assert.ok(ids.n > rowsPerTab, 'identities registered');
  }
});

test('identities are registered only when the import commits', async () => {
  const db = createTestDb();
  const failing = { prepare: db.prepare, batch: async () => { throw new Error('simulated D1 failure'); } };
  await assert.rejects(runImport(failing, fixtureWorkbook(), T0), /simulated/);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM identity_registry').first()).n, 0);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM premium_rows').first()).n, 0);
});

test('integrators without a URL or sharing a domain stay unresolved instead of getting a name-based id', async () => {
  const values = fixtureWorkbook();
  values.Integrators[1][1] = '';
  values.Integrators[2][1] = 'https://integrator-3.example.com/';
  const db = createTestDb();
  const result = await runImport(db, values, T0);
  const [first, second, third, fourth] = await rowsOf(db, 'integrators');
  assert.equal(first.identity_status, 'unresolved');
  assert.match(first.id, /^pending_integrators_r2/);
  assert.equal(second.identity_status, 'unresolved', 'shares integrator-3.example.com');
  assert.equal(third.identity_status, 'unresolved', 'shares integrator-3.example.com');
  assert.equal(fourth.identity_status, 'resolved');
  assert.ok(result.warnings.some((w) => w.includes('no natural key')));
});

test('header drift aborts the whole import and keeps the previous snapshot', async () => {
  const db = createTestDb();
  await runImport(db, fixtureWorkbook(), T0);
  const drifted = fixtureWorkbook();
  drifted.Deployments[0][3] = 'organisation_role';
  const result = await runImport(db, drifted, T0 + 60);
  assert.equal(result.ok, false);
  assert.match(result.error, /header drift/);
  assert.equal((await rowsOf(db, 'deployments')).length, 12);
});

test('duplicate or missing identifiers, or a missing tab, abort the import', async () => {
  const dup = fixtureWorkbook();
  dup.Deployments[2][0] = dup.Deployments[1][0];
  assert.match((await runImport(createTestDb(), dup, T0)).error, /duplicate id/);
  const missing = fixtureWorkbook();
  missing['Relaciones evidencia'][1][0] = '';
  assert.match((await runImport(createTestDb(), missing, T0)).error, /missing link_id/);
  const absent = fixtureWorkbook();
  delete absent.Humanoids;
  assert.match((await runImport(createTestDb(), absent, T0)).error, /empty or missing/);
});

test('Sheets API source signs a service-account JWT and reads the requested tabs only', async () => {
  const keys = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', keys.privateKey)).toString('base64');
  const pem = `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----`;
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith('https://oauth2.googleapis.com/token')) {
      const [h, c, s] = new URLSearchParams(String(init.body)).get('assertion').split('.');
      const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0));
      assert.ok(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', keys.publicKey, sig, new TextEncoder().encode(`${h}.${c}`)));
      assert.equal(JSON.parse(atob(c.replace(/-/g, '+').replace(/_/g, '/'))).scope, 'https://www.googleapis.com/auth/spreadsheets.readonly');
      return new Response(JSON.stringify({ access_token: 'ya29.fixture' }));
    }
    assert.equal(init.headers.authorization, 'Bearer ya29.fixture');
    return new Response(JSON.stringify({ valueRanges: [{ values: [['NAME', 'URL', 'DESCRIPTION']] }, {}] }));
  };
  const values = await fetchWorkbookValues({
    sheetId: 'fixture-sheet',
    tabs: ['Integrators', 'Relaciones evidencia'],
    clientEmail: 'importer@example.iam.gserviceaccount.com',
    privateKeyPem: pem,
    now: T0,
    fetchImpl: fakeFetch,
  });
  assert.deepEqual(values.Integrators, [['NAME', 'URL', 'DESCRIPTION']]);
  assert.deepEqual(values['Relaciones evidencia'], []);
  assert.deepEqual(new URL(calls[1].url).searchParams.getAll('ranges'), ["'Integrators'", "'Relaciones evidencia'"]);
});

test('a federated access token can read the workbook without a private key', async () => {
  const values = await fetchWorkbookValues({
    sheetId: 'fixture-sheet',
    tabs: ['Humanoids'],
    accessToken: 'temporary-fixture-token',
    fetchImpl: async (url, init) => {
      assert.equal(new URL(url).hostname, 'sheets.googleapis.com');
      assert.equal(init.headers.authorization, 'Bearer temporary-fixture-token');
      return new Response(JSON.stringify({ valueRanges: [{ values: [['NAME']] }] }));
    },
  });
  assert.deepEqual(values, { Humanoids: [['NAME']] });
});
