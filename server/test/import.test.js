import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T0, createTestDb, fixtureWorkbook } from './helpers.js';
import { DATASETS } from '../src/datasets.js';
import { runImport } from '../src/import/run.js';
import { fetchWorkbookValues } from '../src/import/google-sheets.js';

const rowsOf = async (db, dataset) =>
  (await db.prepare('SELECT row_id, sheet_row, preview_rank, data FROM premium_rows WHERE dataset = ? ORDER BY position').bind(dataset).all())
    .results.map((r) => ({ id: r.row_id, sheet_row: r.sheet_row, preview_rank: r.preview_rank, ...JSON.parse(r.data) }));

test('imports all seventeen workbook datasets, Humanoids included', async () => {
  assert.equal(DATASETS.length, 17);
  const result = await runImport(createTestDb(), fixtureWorkbook(), T0);
  assert.equal(result.ok, true);
  assert.equal(Object.keys(result.counts).filter((k) => !k.endsWith('_internal')).length, 17);
  assert.equal(result.counts.hardware, 12, 'Components: the product table only');
  assert.equal(result.counts['component-software'], 1, 'Components: the related software block, apart');
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

test('directory ids are persistent, opaque and keyed on the entry link, never on the name', async () => {
  // Integrators carry their own PROVIDER ID since 24 Nov 2026 (server/test/integrators.test.js); the keyless link
  // directories (Software, Other robots...) keep identity-registry ids keyed on list and link.
  const db = createTestDb();
  await runImport(db, fixtureWorkbook(), T0);
  const before = (await rowsOf(db, 'software')).filter((r) => r.list === 'software');
  assert.match(before[0].id, /^sw_[A-Za-z0-9_-]{16}$/);
  assert.ok(!before[0].id.includes('example'));
  const renamed = fixtureWorkbook();
  renamed.Software[1][0] = 'Example Software Renamed';
  await runImport(db, renamed, T0 + 86400);
  const after = (await rowsOf(db, 'software')).filter((r) => r.list === 'software');
  assert.equal(after[0].id, before[0].id, 'same link keeps the id');
  assert.equal(after[0].name, 'Example Software Renamed');
  const registry = await db.prepare("SELECT aliases FROM identity_registry WHERE id = ?").bind(before[0].id).first();
  assert.deepEqual(JSON.parse(registry.aliases), ['Example software 1', 'Example Software Renamed']);
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

test('directory entries: no link stays unresolved; a repeated address in one list is merged, across lists kept as a membership', async () => {
  const values = fixtureWorkbook();
  values.Software[1][1] = '';
  values.Software[2][1] = 'https://software-3.example.com/';
  values.Software[2][0] = values.Software[3][0]; // the same name too: an exact repeat
  values.Software[2][2] = 'A second, different description.';
  // The same address as a world model: a topical membership, not a second entry.
  values.Software[5][5] = 'https://software-5.example.com/';
  values.Software[5][4] = values.Software[6][0]; // same name and address as software row 7
  const db = createTestDb();
  const result = await runImport(db, values, T0);
  const rows = await rowsOf(db, 'software');
  const software = rows.filter((r) => r.list === 'software');
  const [first, second] = software;
  assert.equal(first.identity_status, 'unresolved');
  assert.match(first.id, /^pending_software_r2/);
  assert.ok(result.warnings.some((w) => w.includes('no natural key')));
  // Rows 3 and 4 share software-3.example.com: one entry with a stable id, the other name kept.
  assert.equal(second.identity_status, 'resolved');
  assert.equal(second.url, 'https://software-3.example.com/');
  assert.equal(second.description, 'A second, different description.');
  assert.deepEqual(second.other_descriptions, ['Synthetic software 3'], 'the merged row keeps its different description');
  assert.equal(software.filter((r) => r.url === 'https://software-3.example.com/').length, 1);
  assert.ok(result.reconciliation.software.merged.some((m) => m.sheet_row === 4 && m.into_sheet_row === 3));
  // The world model row keeps its own stable id and points to the software entry; it is not counted as an entry.
  const member = rows.find((r) => r.list === 'world_model' && r.url === 'https://software-5.example.com/');
  assert.equal(member.canonical, false);
  assert.equal(member.canonical_list, 'software');
  assert.equal(member.identity_status, 'resolved');
  assert.ok(!member.id.startsWith('pending_'));
  assert.ok(software.find((r) => r.url === 'https://software-5.example.com/').also_listed_as.includes('world_model'));
  assert.equal(result.reconciliation.software.entries, result.reconciliation.software.rows - 1);
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
  missing['Evidence Relations'][1][0] = '';
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
    tabs: ['Integrators', 'Evidence Relations'],
    clientEmail: 'importer@example.iam.gserviceaccount.com',
    privateKeyPem: pem,
    now: T0,
    fetchImpl: fakeFetch,
  });
  assert.deepEqual(values.Integrators, [['NAME', 'URL', 'DESCRIPTION']]);
  assert.deepEqual(values['Evidence Relations'], []);
  assert.deepEqual(new URL(calls[1].url).searchParams.getAll('ranges'), ["'Integrators'", "'Evidence Relations'"]);
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

// Regression: the Genesis duplicate (sheet row 38) lost its "Duplicate:" robot label but still says so in its own
// cells. It must stay internal provenance: never in the free catalogue, the previews, the full rows or the counts.
test('a Humanoids row the sheet calls a duplicate reference is internal even without a Duplicate: label', async () => {
  const db = createTestDb();
  const values = fixtureWorkbook();
  const spec = DATASETS.find((d) => d.id === 'humanoids');
  values.Humanoids.splice(4, 0, spec.headers.map((f) => ({
    Lab: 'Example Labs 3',
    Web: 'https://example.com/robots/3-duplicate',
    'Platform / mobility': 'Duplicate reference; not a second robot',
    'Buyer checks': 'Exclude this row from company and funding counts',
  })[f] ?? null));
  const result = await runImport(db, values, T0);
  assert.equal(result.ok, true);
  assert.equal(result.counts.humanoids, 12, 'customer count unchanged');
  assert.equal(result.counts.humanoids_internal, 3);
  const served = await db
    .prepare("SELECT COUNT(*) AS n FROM premium_rows WHERE dataset = 'humanoids' AND visibility = 'customer' AND data LIKE '%Duplicate reference%'")
    .first();
  assert.equal(served.n, 0);
});

// Regression: the Data space tab linked to the master workbook in source_url. A workbook link would bypass every
// access rule, so private links are removed from every tab, in the public preview and in the paid data.
test('links to the private workbook never reach the preview or the paid rows of any tab', async () => {
  const db = createTestDb();
  const values = fixtureWorkbook();
  const link = 'https://docs.' + 'google.com/spreadsheets/d/' + 'fx_workbook/edit#gid=1';
  const spec = DATASETS.find((d) => d.id === 'data-space');
  const tab = values[spec.tab];
  const col = tab[0].indexOf('source_url');
  assert.ok(col >= 0, 'fixture Data space tab has source_url');
  tab[1][col] = link;
  tab[2][col] = `See ${link} and https://example.com/public-source`;
  const result = await runImport(db, values, T0);
  assert.equal(result.ok, true);
  const leaks = await db.prepare("SELECT COUNT(*) AS n FROM premium_rows WHERE data LIKE '%docs.google.com%' OR preview_data LIKE '%docs.google.com%'").first();
  assert.equal(leaks.n, 0);
  const kept = await db.prepare("SELECT COUNT(*) AS n FROM premium_rows WHERE dataset = 'data-space' AND data LIKE '%example.com/public-source%'").first();
  assert.equal(kept.n, 1, 'public links stay');
});
