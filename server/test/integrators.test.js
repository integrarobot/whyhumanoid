// Integrators (24 Nov 2026): the 26-column provider catalogue, keyed by PROVIDER ID, free in full. The import keeps
// every field, refuses any structural surprise (old three-column snapshot, bad or repeated ids, unreviewed statuses)
// and serves every row and field to anonymous visitors; search finds a provider by any of its recorded names.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T0, createTestDb, fixtureWorkbook, setup } from './helpers.js';
import { runImport } from '../src/import/run.js';
import { INTEGRATOR_FIELDS, INTEGRATOR_HEADERS, displayName, isUnknown, sourceUrls, statusClass, tagsOf } from '../src/integrators/catalogue.js';

const rowsOf = async (db) =>
  (await db.prepare("SELECT row_id, data, preview_data FROM premium_rows WHERE dataset = 'integrators' ORDER BY position").all()).results
    .map((r) => ({ id: r.row_id, data: JSON.parse(r.data), preview: r.preview_data ? JSON.parse(r.preview_data) : null }));

test('the import keeps all 26 fields of every provider, keyed by its provider id', async () => {
  const db = createTestDb();
  const result = await runImport(db, fixtureWorkbook(), T0);
  assert.equal(result.ok, true);
  const rows = await rowsOf(db);
  assert.equal(rows.length, 12);
  assert.equal(INTEGRATOR_FIELDS.length, 26);
  for (const [i, r] of rows.entries()) {
    assert.equal(r.id, `int_fx${i + 1}`);
    assert.deepEqual(Object.keys(r.data).sort(), [...INTEGRATOR_FIELDS].sort());
    assert.deepEqual(r.data, r.preview ?? r.data, 'free: the public values are the full values');
  }
  assert.deepEqual(sourceUrls(rows[0].data.source_urls), ['https://integrator-1.example.com/', 'https://news.example.com/integrator-1']);
});

test('a renamed provider keeps its id and its values change', async () => {
  const db = createTestDb();
  await runImport(db, fixtureWorkbook(), T0);
  const values = fixtureWorkbook();
  values.Integrators[3][0] = 'Example Integrator Renamed';
  values.Integrators[3][1] = 'https://renamed.example.com/';
  await runImport(db, values, T0 + 86400);
  const r = (await rowsOf(db)).find((x) => x.id === 'int_fx3');
  assert.equal(r.data.name, 'Example Integrator Renamed');
  assert.equal(r.data.url, 'https://renamed.example.com/');
});

test('the import refuses the old three-column snapshot and any structural surprise, writing nothing', async () => {
  const cases = [
    ['old three-column directory', (v) => { v.Integrators = [['NAME', 'URL', 'DESCRIPTION'], ['Example', 'https://example.com/', 'Old']]; }, /header drift/],
    ['a renamed column', (v) => { v.Integrators[0][13] = 'PROJECT'; }, /header drift/],
    ['a repeated provider id', (v) => { v.Integrators[3][3] = 'int_fx1'; }, /repeats sheet row/],
    ['a malformed provider id', (v) => { v.Integrators[3][3] = 'Intec'; }, /not of the form int_/],
    ['an unreviewed catalogue status', (v) => { v.Integrators[3][24] = 'Validated production integrator'; }, /catalogue status/],
    ['a source that is not a web address', (v) => { v.Integrators[3][19] = 'https://ok.example.com/\nfile:///private/notes'; }, /source is not an http/],
    ['a bad review date', (v) => { v.Integrators[3][21] = '24/11/2026'; }, /YYYY-MM-DD/],
    ['an empty limitations cell', (v) => { v.Integrators[3][23] = ''; }, /Limitations is empty/],
  ];
  for (const [label, mutate, error] of cases) {
    const db = createTestDb();
    const values = fixtureWorkbook();
    mutate(values);
    const result = await runImport(db, values, T0).catch((e) => ({ ok: false, error: e.message }));
    assert.equal(result.ok, false, label);
    assert.match(result.error, error, label);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM premium_rows').first()).n, 0, `${label}: nothing written`);
  }
});

test('anonymous visitors get every provider with every field, and find one by any recorded name', async () => {
  const ctx = await setup();
  const preview = await (await ctx.call('GET', '/v1/datasets/integrators/preview')).json();
  assert.equal(preview.rows.length, 12);
  assert.equal(preview.total_rows, 12);
  for (const f of INTEGRATOR_FIELDS) assert.ok(f in preview.rows[0], `${f} served`);
  const full = await ctx.call('GET', '/v1/datasets/integrators');
  assert.equal(full.status, 200, 'free in full, no session');
  const search = async (q) => (await (await ctx.call('GET', `/v1/search?q=${encodeURIComponent(q)}`)).json()).results.filter((r) => r.category === 'integrators');
  assert.equal((await search('Example Integrator 5 Group'))[0]?.title, 'Example Integrator 5 Group');
  assert.ok((await search('Example 7')).some((r) => r.title === 'Example Integrator 7 Group'), 'legacy name in the canonical name');
  assert.ok((await search('Synthetic limitation 9')).some((r) => r.title === 'Example Integrator 9 Group'), 'every field searchable');
});

test('tags come from the cells: territory from service coverage only, negated clauses and robot training do not count', () => {
  const base = Object.fromEntries(INTEGRATOR_FIELDS.map((f) => [f, '']));
  const d = {
    ...base,
    canonical_name: 'Synergy Tech (Syn-Tech; legacy Syntech)', name: 'Syntech',
    roles: 'Distributor; technical support; research collaboration',
    evidenced_location: 'Madrid, Spain', service_coverage: 'Not established in reviewed sources',
    humanoid_platforms: 'Unitree R1; G1; G1 EDU',
    services: 'Digital-twin training; deployment support; platform advice',
    teleoperation_and_data: 'Teleoperation listed as an application; teleoperation service not established',
    support: 'Maintenance SLA not published',
    catalog_status: 'Humanoid-specific provider',
  };
  const t = tagsOf(d);
  assert.equal(displayName(d), 'Synergy Tech');
  assert.equal(statusClass(d), 'humanoid');
  assert.deepEqual(t.territories, ['not-established'], 'a headquarters is not a service territory');
  assert.deepEqual(t.roles, ['distribution', 'engineering', 'support']);
  assert.ok(!t.services.includes('training'), 'training a digital twin is not training people');
  assert.ok(!t.services.includes('integration'), 'deployment support is not integration');
  assert.ok(!t.services.includes('teleoperation'), 'listed as an application, or not established');
  assert.ok(t.services.includes('support'), 'deployment support is support, even when an SLA is not published');
  assert.deepEqual(t.platforms, ['unitree', 'unitree-g1', 'unitree-r1']);
  assert.ok(isUnknown('Not established in reviewed sources'));
  assert.ok(isUnknown('Humanoid integration project price not published in reviewed sources'));
  assert.ok(!isUnknown('Spain; Portugal'));
  assert.equal(statusClass({ catalog_status: 'Requested specialist exception; exclude from validated humanoid-provider counts' }), 'exception');
  assert.equal(INTEGRATOR_HEADERS.length, 26);
});
