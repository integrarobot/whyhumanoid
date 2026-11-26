// Tests of the workbook write-plan contract (tools/workbook-plan.mjs). Synthetic data only (example.com, fx_ ids).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preflight, readback, simulate, splitDraft, validatePlan, validatePayload } from './workbook-plan.mjs';

const exportBefore = () => ({
  Software: [['SOFTWARE', 'URL', 'DESCRIPTION', '', 'WORLD MODEL', 'URL'], ['Fx Existing', 'https://example.com/existing', 'An existing entry'], ['', '', '', '', 'Fx World', 'https://example.com/world']],
  Datasets: [['NAME', 'URL', 'DESCRIPTION', 'DATASET_ID', 'CLASSIFICATION_NOTE'], ['Fx Data', 'https://example.com/data', 'Data', 'ds-fx-data', 'old note']],
  Deployments: [['record_id', 'organization_name', 'site_name'], ['fx_rec_1', 'Fx Org', 'Fx site']],
});

const draft = () => ({
  contract: 'whyhumanoid/workbook-plan@1',
  plan_id: 'WP-20990101-fx-edition',
  created_at: '2099-01-01T10:00:00Z',
  created_by: 'claude/test',
  basis: { workbook_modified_time: '2099-01-01T09:00:00Z' },
  editions: [{ edition_id: 'fx:2099-01-01:fx-edition', url: 'https://example.com/p/fx', title: 'Fx edition', published: '2099-01-01', section: 'News', item_count: 3 }],
  private_payload: { delivery: 'private file outside Git' },
  items: [
    { item_id: 'fx-1', edition_id: 'fx:2099-01-01:fx-edition', order: 1, title: 'Fx tool', link: 'https://example.com/tool', new_information: 'A new tool', outcome: 'planned', ops: ['op-001'], entity: { exists: false } },
    { item_id: 'fx-2', edition_id: 'fx:2099-01-01:fx-edition', order: 2, title: 'Fx data note', link: 'https://example.com/data', new_information: 'A corrected note', outcome: 'planned', ops: ['op-002', 'op-003'], entity: { exists: true } },
    { item_id: 'fx-3', edition_id: 'fx:2099-01-01:fx-edition', order: 3, title: 'Fx rumour', link: 'https://example.com/rumour', new_information: 'A round', outcome: 'pending_verification', reason: 'No primary source', ops: [], entity: { exists: false } },
  ],
  operations: [
    {
      op_id: 'op-001', item_id: 'fx-1', kind: 'fill_list_slot', sheet: 'Software', row: 3, group_expected: null,
      record: { key: { column: 'A', header: 'SOFTWARE', value: 'Fx Tool' }, unique: [{ column: 'B', header: 'URL', value: 'https://example.com/tool' }] },
      cells: [
        { column: 'A', header: 'SOFTWARE', expected_previous: '', proposed: 'Fx Tool' },
        { column: 'B', header: 'URL', expected_previous: '', proposed: 'https://example.com/tool' },
        { column: 'C', header: 'DESCRIPTION', expected_previous: '', proposed: 'A tool' },
      ],
      sources: [{ url: 'https://example.com/tool', publisher: 'Fx', published: '2099-01-01', reviewed: '2099-01-01' }],
    },
    {
      op_id: 'op-002', item_id: 'fx-2', kind: 'update_cells', sheet: 'Datasets', row: 2,
      record: { key: { column: 'D', header: 'DATASET_ID', value: 'ds-fx-data' } },
      cells: [
        { column: 'C', header: 'DESCRIPTION', expected_previous: 'Data', proposed: 'Data, corrected' },
        { column: 'E', header: 'CLASSIFICATION_NOTE', expected_previous: 'old note', proposed: 'new internal note' },
      ],
      sources: [{ url: 'https://example.com/data', publisher: 'Fx', published: '2099-01-01', reviewed: '2099-01-01' }],
    },
    {
      op_id: 'op-003', item_id: 'fx-2', kind: 'update_cells', sheet: 'Deployments', row: 2,
      record: { key: { column: 'A', header: 'record_id', value: 'fx_rec_1' } },
      cells: [{ column: 'C', header: 'site_name', expected_previous: 'Fx site', proposed: 'Fx site, hall 2' }],
      sources: [{ url: 'https://example.com/data', publisher: 'Fx', published: '2099-01-01', reviewed: '2099-01-01' }],
    },
  ],
});

const split = () => {
  const { plan, payload, payloadText } = splitDraft(draft(), 'a'.repeat(64));
  return { plan, payload, bytes: Buffer.from(payloadText) };
};

test('a draft splits into a valid public plan and a private payload; private values never stay in clear', () => {
  const { plan, payload, bytes } = split();
  assert.deepEqual(validatePlan(plan, { payload, payloadBytes: bytes }), []);
  const text = JSON.stringify(plan);
  for (const secret of ['new internal note', 'old note', 'Fx site, hall 2', 'fx_rec_1']) assert.ok(!text.includes(secret), secret);
  assert.equal(plan.private_payload.cells, 2);
  assert.equal(payload.values['op-002:E:proposed'], 'new internal note');
  assert.equal(payload.values['op-003:A:key'], 'fx_rec_1');
});

test('a private value in clear, a workbook link or an email in the public plan is refused', () => {
  const { plan } = split();
  const leaked = structuredClone(plan);
  leaked.operations[1].cells[1] = { column: 'E', header: 'CLASSIFICATION_NOTE', expected_previous: '', proposed: 'note' };
  assert.ok(validatePlan(leaked).some((p) => p.includes('private must be true')));
  const linked = structuredClone(plan);
  linked.operations[0].cells[2].proposed = `see https://docs.google${'.'}com/spreadsheets/d/x`; // split so the repository guard does not flag this test
  assert.ok(validatePlan(linked).some((p) => p.includes('Google')));
  const mailed = structuredClone(plan);
  mailed.operations[0].cells[2].proposed = 'write to someone@example.com';
  assert.ok(validatePlan(mailed).some((p) => p.includes('email')));
});

test('items cover the edition in order and keep entity existence apart from the outcome', () => {
  const { plan } = split();
  const gap = structuredClone(plan);
  gap.items[2].order = 4;
  assert.ok(validatePlan(gap).some((p) => p.includes('numbered 1 to 3')));
  const noEntity = structuredClone(plan);
  delete noEntity.items[0].entity;
  assert.ok(validatePlan(noEntity).some((p) => p.includes('entity.exists')));
  const noReason = structuredClone(plan);
  delete noReason.items[2].reason;
  assert.ok(validatePlan(noReason).some((p) => p.includes('reason is required')));
});

test('a tampered private payload is refused', () => {
  const { plan, payload } = split();
  const tampered = structuredClone(payload);
  tampered.values['op-002:E:proposed'] = 'other note';
  const bytes = Buffer.from(`${JSON.stringify(tampered, null, 2)}\n`);
  const problems = validatePayload(plan, tampered, bytes);
  assert.ok(problems.some((p) => p.includes('SHA-256')));
  assert.ok(problems.some((p) => p.includes('does not match its HMAC')));
});

test('preflight: pending cells, headers, moved records and duplicates', () => {
  const { plan, payload } = split();
  const ok = preflight(plan, exportBefore(), payload);
  assert.deepEqual(ok.problems, []);
  assert.equal(ok.pending, 6);
  const noPayload = preflight(plan, exportBefore());
  assert.equal(noPayload.unverifiable, 2);
  const moved = exportBefore();
  moved.Datasets[0][2] = 'SUMMARY';
  moved.Deployments[1][0] = 'fx_rec_9';
  const r = preflight(plan, moved, payload);
  assert.ok(r.problems.some((p) => p.includes('header is "SUMMARY"')));
  assert.ok(r.problems.some((p) => p.includes('rows moved')));
  const dup = exportBefore();
  dup.Software[1][1] = 'https://example.com/tool/';
  assert.ok(preflight(plan, dup, payload).problems.some((p) => p.includes('duplicate')));
});

test('readback after a faithful write: zero differences, neighbours unchanged, resumable', () => {
  const { plan, payload } = split();
  const before = exportBefore();
  const after = simulate(plan, before, payload);
  assert.equal(after.Software[2][4], 'Fx World');
  const r = readback(plan, after, payload, before);
  assert.deepEqual(r.differences, []);
  assert.deepEqual(r.unexpected, []);
  assert.ok(r.neighbours >= 3);
  assert.equal(preflight(plan, after, payload).applied, 6);
});

test('record.unique follows the same private rule as record.key', () => {
  const { plan } = split();
  const leaked = structuredClone(plan);
  leaked.operations[2].record.unique = [{ column: 'B', header: 'organization_name', value: 'FX_PRIVATE_CUSTOMER' }];
  const problems = validatePlan(leaked);
  assert.ok(problems.some((p) => p.includes('record.unique organization_name must be an HMAC')), problems.join('\n'));
  const hashedPublic = structuredClone(plan);
  hashedPublic.operations[0].record.unique = [{ column: 'B', header: 'URL', value_hmac: 'a'.repeat(64) }];
  assert.ok(validatePlan(hashedPublic).some((p) => p.includes('record.unique URL must be in clear')));
});

// A Software list with a titled section: header, one entry, a section title, its column headers, one entry.
const sectioned = () => ({
  ...exportBefore(),
  Software: [['SOFTWARE', 'URL', 'DESCRIPTION'], ['Fx Existing', 'https://example.com/existing', 'An existing entry'], ['SIMULATORS'], ['SIMULATOR', 'URL', 'DESCRIPTION'], ['Fx Sim', 'https://example.com/sim', 'A simulator']],
});

test('section titles and repeated column headers: wrong group, header rows and the gap between them are refused', () => {
  const { plan, payload } = split();
  const noGroup = structuredClone(plan);
  delete noGroup.operations[0].group_expected;
  assert.ok(validatePlan(noGroup).some((p) => p.includes('group_expected')));
  const atEnd = structuredClone(plan);
  atEnd.operations[0].row = 6;
  assert.ok(preflight(atEnd, sectioned(), payload).problems.some((p) => p.includes('would be listed under "Simulators"')));
  atEnd.operations[0].group_expected = 'Simulators';
  assert.deepEqual(preflight(atEnd, sectioned(), payload).problems, []);
  const onTitle = structuredClone(plan);
  onTitle.operations[0].row = 3;
  assert.ok(preflight(onTitle, sectioned(), payload).problems.some((p) => p.includes('section title row')));
  const onHeader = structuredClone(plan);
  onHeader.operations[0].row = 4;
  assert.ok(preflight(onHeader, sectioned(), payload).problems.some((p) => p.includes('column-header row')));
  const gap = sectioned();
  gap.Software.splice(3, 0, []);
  const inGap = structuredClone(plan);
  inGap.operations[0].row = 4;
  inGap.operations[0].group_expected = 'Simulators';
  assert.ok(preflight(inGap, gap, payload).problems.some((p) => p.includes('between the section title')));
});

test('readback rechecks the group and the record after the write (Codex regression)', () => {
  const { plan, payload } = split();
  const before = { ...exportBefore(), Software: [['SOFTWARE', 'URL', 'DESCRIPTION'], ['Existing', 'https://example.com/existing', 'An existing entry'], [], []] };
  const after = { ...before, Software: [['SOFTWARE', 'URL', 'DESCRIPTION'], ['Existing', 'https://example.com/existing', 'An existing entry'], ['SIMULATORS'], ['Fx Tool', 'https://example.com/tool', 'A tool']] };
  const op = structuredClone(plan);
  op.operations = [op.operations[0]];
  op.operations[0].row = 4;
  const r = readback(op, after, payload, before);
  assert.ok(r.differences.some((d) => d.includes('listed under "Simulators"')), r.differences.join('\n'));
  assert.ok(r.unexpected.includes('Software!A3'));
  const twice = { ...after, Software: [...after.Software.slice(0, 2), ['Fx Tool', 'https://example.com/tool', 'A tool'], after.Software[3]] };
  assert.ok(readback(op, twice, payload, before).differences.some((d) => d.includes('appears 2 times')));
});

test('changes outside the plan fail the readback; only live market numbers may move', () => {
  const { plan, payload } = split();
  const before = { ...exportBefore(), Investment: [['NAME', 'PRICE', 'DESCRIPTION'], ['Fx Corp', '10.5', 'Listed']], Humanoids: [['Lab', 'Robot', 'Valuation'], ['Fx', 'One', '1,000.00'], ['Fx', 'Two', 'USD 5M (2099)']] };
  const after = simulate(plan, before, payload);
  after.Investment[1][1] = '10.75';
  after.Humanoids[1][2] = '1,020.50';
  let r = readback(plan, after, payload, before);
  assert.deepEqual(r.unexpected, []);
  assert.deepEqual(r.live, { Investment: 1, Humanoids: 1 });
  after.Humanoids[2][2] = 'USD 6M (2099)';
  after.Investment[1][2] = 'Delisted';
  after.Software[2][2] = 'A tool!';
  after.Software[2][4] = 'Fx World overwritten';
  r = readback(plan, after, payload, before);
  assert.deepEqual(r.unexpected.sort(), ['Humanoids!C3', 'Investment!C2', 'Software!E3']);
  assert.equal(r.differences.length, 1);
  assert.ok(!JSON.stringify(r).includes('USD 6M') && !JSON.stringify(r).includes('Delisted'));
});

test('the CLI runs from a path with spaces and a question mark, and fails on a missing or invalid plan', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const dir = join(mkdtempSync(join(tmpdir(), 'wh plan ? ')), 'Why Humanoid?');
  mkdirSync(join(dir, 'tools'), { recursive: true });
  cpSync(join(root, 'tools/workbook-plan.mjs'), join(dir, 'tools/workbook-plan.mjs'));
  cpSync(join(root, 'server/src'), join(dir, 'server/src'), { recursive: true });
  cpSync(join(root, 'server/package.json'), join(dir, 'server/package.json'));
  const cli = join(dir, 'tools/workbook-plan.mjs');
  const run = (args, cwd = dir) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
  const missing = run(['check', join(dir, 'no-such-plan.json')]);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /no-such-plan/);
  const { plan, payloadText } = splitDraft(draft(), 'b'.repeat(64));
  writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan));
  writeFileSync(join(dir, 'payload.json'), payloadText);
  const ok = run(['check', 'plan.json', '--private', 'payload.json']);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /follow whyhumanoid\/workbook-plan@1: 1 plan\(s\), private payload verified/);
  writeFileSync(join(dir, 'bad.json'), JSON.stringify({ ...plan, contract: 'other' }));
  const bad = run(['check', 'bad.json']);
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /contract must be/);
  writeFileSync(join(dir, 'export.json'), JSON.stringify(exportBefore()));
  const noPrevious = run(['readback', 'plan.json', '--from', 'export.json', '--private', 'payload.json']);
  assert.notEqual(noPrevious.status, 0);
  assert.match(noPrevious.stderr, /--previous/);
  assert.equal(execFileSync(process.execPath, [cli, 'hash', 'plan.json'], { cwd: dir, encoding: 'utf8' }).trim().length, 64);
});
