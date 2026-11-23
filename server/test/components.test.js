// Components (23 Nov 2026): the product catalogue contract, its blocks, public allowlists and access.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  COMPONENT_HEADERS, COMPONENT_FIELDS, COMPONENT_WITHHELD, componentBlocks, componentProblems, parseSources, scrubComponentText,
} from '../src/components/catalogue.js';
import { DATASETS_BY_ID } from '../src/datasets.js';
import { normalizeTab } from '../src/import/normalize.js';
import { runImport } from '../src/import/run.js';
import { createTestDb, fixtureWorkbook, setup, signIn, sendWebhook, subscriptionEvent, T0 } from './helpers.js';

const root = new URL('../../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
vm.runInThisContext(readFileSync(new URL('assets/components-core.js', root), 'utf8'));
const W = globalThis.WHComponents;
const PRIVATE = ['https://docs.google', '.com/spreadsheets/d/x/edit'].join('');

const spec = DATASETS_BY_ID.get('hardware');
const row = (over = {}) => COMPONENT_FIELDS.map((f) => (f in over ? over[f] : ({
  name: 'Sensor', group: 'Commercial', component_id: 'CMP-TAC-001', family: 'Tactile sensor',
  sources: 'Page\nhttps://a.example.com/\nAccessed: 23 Nov 2026\nReview status: Imported reference; original-source review pending',
}[f] ?? '')));
// The live layout: product table, blank rows, the notes block, blank rows, the related software block.
const layout = (products, { software = [row({ name: 'TACTO', group: 'Software (simulator)', component_id: 'CMP-TAC-008', family: 'Tactile simulator (software)' })], extra = [] } = {}) => [
  [...COMPONENT_HEADERS], ...products, [], [], [],
  ['CATALOGUE NOTES', '', 'Source notes and import history'], ['Research date', '', '23 November 2026'], ['Colour legend', '', 'undefined'],
  ...extra, [], [], ['RELATED SOFTWARE — NOT A PHYSICAL COMPONENT'], [...COMPONENT_HEADERS], ...software,
];

test('the Components table has the 37 reviewed columns in order, and housekeeping columns are withheld', () => {
  assert.equal(COMPONENT_HEADERS.length, 37);
  assert.equal(COMPONENT_FIELDS.length, 37);
  assert.deepEqual([COMPONENT_HEADERS[0], COMPONENT_HEADERS[1], COMPONENT_HEADERS[31], COMPONENT_HEADERS[34], COMPONENT_HEADERS[35], COMPONENT_HEADERS[36]], ['No.', 'Sensor', 'Component ID', 'Source workbook', 'Sources and evidence', 'Comparison summary']);
  assert.deepEqual([...COMPONENT_WITHHELD].sort(), ['no', 'source_workbook']);
  assert.deepEqual(spec.headers, COMPONENT_HEADERS);
  assert.throws(() => normalizeTab(spec, [['NAME', 'URL', 'DESCRIPTION'], ['Old', 'https://x.example.com', '']]), /header drift/, 'the former three-column directory is refused');
});

test('notes, related software and stray rows are never read as physical products', () => {
  const values = layout([row(), row({ component_id: 'CMP-TAC-002', name: 'Second' })]);
  const b = componentBlocks(values);
  assert.equal(b.main.length, 2);
  assert.equal(b.notes.length, 2, 'notes under their title are read and counted, never imported');
  assert.deepEqual(b.software.map((x) => x.sheetRow), [values.length]);
  assert.equal(normalizeTab(spec, values).rows.length, 2);
  assert.equal(normalizeTab(DATASETS_BY_ID.get('component-software'), values).rows[0].data.name, 'TACTO');
  // A row outside the three blocks stops the import.
  assert.throws(() => normalizeTab(spec, layout([row()], { extra: [[], ['Stray product', 'Commercial']] })), /outside the product table/);
  // Software in the product table, or hardware in the software block, is refused by the validator.
  const sw = row({ group: 'Software (simulator)', component_id: 'CMP-TAC-009' });
  const toData = (r) => Object.fromEntries(COMPONENT_FIELDS.map((f, i) => [f, r[i] || null]));
  assert.ok(componentProblems([toData(sw)], []).some((p) => /software in the physical product table/.test(p)));
  assert.ok(componentProblems([], [toData(row())]).some((p) => /physical product in the related software block/.test(p)));
  // The related software header must repeat the product header exactly.
  const bad = layout([row()]); bad[bad.length - 2] = ['No.', 'Name'];
  assert.throws(() => componentBlocks(bad), /no header row identical/);
});

test('the hidden archive tab is never read: imports take the Components tab only', async () => {
  const values = fixtureWorkbook();
  values['Components archive 2026-11-23'] = [['NAME', 'URL', 'DESCRIPTION'], ['Archived company', 'https://old.example.com', 'old row']];
  const result = await runImport(createTestDb(), values, T0);
  assert.equal(result.ok, true, result.error);
  assert.equal(result.counts.hardware, 12);
  assert.ok(![...DATASETS_BY_ID.values()].some((d) => /archive/i.test(d.tab)));
});

test('ids are unique and well formed; groups come from the reviewed vocabulary; every row has linked sources', () => {
  const d = (over) => Object.fromEntries(COMPONENT_FIELDS.map((f, i) => [f, row(over)[i] || null]));
  assert.ok(componentProblems([d(), d()]).some((p) => /duplicate Component ID/.test(p)));
  assert.ok(componentProblems([d({ component_id: 'TAC-1' })]).some((p) => /must look like CMP-XXX-000/.test(p)));
  assert.ok(componentProblems([d({ group: 'Startup' })]).some((p) => /Group "Startup" is not in the reviewed vocabulary/.test(p)));
  assert.ok(componentProblems([d({ sources: 'Page without link' })]).some((p) => /has no link/.test(p)));
  assert.deepEqual(componentProblems([d()]), []);
});

test('the committed public data: 19 product ids and the software id, 97 references, counts that add up', () => {
  const c = read('data/components/coverage.json');
  const want = Array.from({ length: 20 }, (_, i) => `CMP-TAC-${String(i + 1).padStart(3, '0')}`).filter((id) => id !== 'CMP-TAC-008');
  assert.deepEqual(c.ids.products, want);
  assert.deepEqual(c.ids.software, ['CMP-TAC-008'], 'TACTO is software, not a product');
  assert.equal(c.counts.products, 19);
  assert.equal(c.counts.references, 97, 'every reference entry of the products and TACTO is accounted for');
  assert.deepEqual(c.counts.by_family, { 'Tactile sensor': 18, 'Tactile robotic hand': 1 });
  assert.equal(Object.values(c.counts.by_class).reduce((a, b) => a + b, 0), 19);
  assert.deepEqual(Object.keys(c).sort(), ['counts', 'ids', 'note', 'snapshot', 'title']);
  const hw = read('data/preview/hardware.json').rows;
  assert.deepEqual(hw.map((r) => r.component_id), want.slice(0, 10), 'the public preview is the first 10 product rows, in workbook order');
  const sw = read('data/preview/component-software.json').rows;
  for (const r of [...hw, ...sw]) {
    for (const f of COMPONENT_WITHHELD) assert.ok(!(f in r), `${r.component_id}: ${f} is withheld`);
    for (const s of parseSources(r.sources)) assert.ok(s.url, `${r.component_id}: ${s.subject} has a link`);
  }
  const text = JSON.stringify([hw, sw, c]);
  assert.doesNotMatch(text, /docs\.google|drive\.google|spreadsheets\/d\//, 'no workbook link');
  assert.doesNotMatch(text, /\bGrok\b|the query asked|check periodically|manufacturer verified/i, 'no import history or prompt notes');
  assert.doesNotMatch(text, /"undefined"/);
});

test('prompt notes and import history are removed; real caveats and states stay', () => {
  assert.equal(scrubComponentText('notes', 'The query asked whether it was made by Contactile: it is made by PaXini.'), null);
  assert.equal(scrubComponentText('notes', 'Manufacturer verified: PPS. Brochure: https://x.example.com/b.pdf'), 'Brochure: https://x.example.com/b.pdf');
  assert.equal(scrubComponentText('notes', 'Check periodically whether GelSight opens sales and pricing.'), null);
  assert.equal(scrubComponentText('review_status', 'Imported from Grok workbook; original-source review pending'), 'Imported research compilation; original-source review pending');
  assert.equal(scrubComponentText('manufacturer', 'PaXini Tech (帕西尼感知科技) — NOT Contactile'), 'PaXini Tech (帕西尼感知科技) (not Contactile)');
  assert.match(scrubComponentText('resolution_count', '17 sensors × 240×240 px = 57,600 px per sensor (≈979,200 in total, own calculation)'), /per sensor .*arithmetic from the per-sensor figure, not a count of calibrated taxels/);
  assert.equal(scrubComponentText('list_price', 'Range 1,200–2,500 USD cited by third parties, NOT verified'), 'Range 1,200–2,500 USD cited by third parties, not verified');
});

test('empty, not available and not applicable stay distinct; never zero, false or "undefined"', () => {
  assert.equal(W.stateOf(''), 'not_recorded');
  assert.equal(W.stateOf(null), 'not_recorded');
  assert.equal(W.stateOf('undefined'), 'not_recorded');
  assert.equal(W.stateOf('Not available (not sold force-calibrated)'), 'not_available');
  assert.equal(W.stateOf('N/A (closed product)'), 'not_applicable');
  assert.equal(W.stateOf('0.005 N minimum detectable'), 'value');
  assert.match(W.valueHtml('weight', ''), /Not recorded/);
  assert.match(W.valueHtml('weight', 'Not available'), /Not available in the source/);
  assert.match(W.valueHtml('bom_cost', 'N/A'), /Not applicable/);
  assert.doesNotMatch(W.valueHtml('weight', 'undefined'), />undefined</);
});

test('prices, quotes, third-party figures and BOM estimates stay separate; nothing is converted or ranked', () => {
  const hw = Object.fromEntries(read('data/preview/hardware.json').rows.map((r) => [r.component_id, r]));
  assert.equal(W.priceOf(hw['CMP-TAC-001'].list_price).state, 'listed');
  assert.deepEqual(W.priceOf(hw['CMP-TAC-004'].list_price), { state: 'listed', flags: ['distributor'] }, 'uSkin: a distributor figure for one model');
  assert.deepEqual(W.priceOf(hw['CMP-TAC-003'].list_price), { state: 'no_public_price', flags: ['third_party'] }, 'DIGIT 360: no official price; the third-party range is flagged');
  assert.deepEqual(W.priceOf(hw['CMP-TAC-006'].list_price), { state: 'quote', flags: ['historical'] });
  assert.equal(W.priceOf(hw['CMP-TAC-011'].list_price).state, 'not_sold');
  assert.equal(W.priceOf('Free').state, 'free');
  assert.notEqual(hw['CMP-TAC-001'].list_price, hw['CMP-TAC-001'].bom_cost, 'list price and author BOM are different fields');
  assert.match(hw['CMP-TAC-005'].list_price, /CNY/, 'original currency kept');
  assert.ok(W.varies(hw['CMP-TAC-004'].resolution_count), 'uSkin taxel counts vary by model');
  assert.equal(W.rosOf(hw['CMP-TAC-005'].software), 'earlier_generation', 'PX-6AX: GEN3 drivers are not GEN4 support');
  assert.ok(!W.interfacesOf(hw['CMP-TAC-005'].interface).includes('usb'), 'PX-6AX: the GEN3 USB converter is not a GEN4 interface');
  assert.equal(W.principleOf(hw['CMP-TAC-005'].principle), 'not_stated', 'PX-6AX: the principle is inferred, not confirmed');
  // The comparison renders values as recorded and never sorts by a value.
  const html = W.compareHtml([hw['CMP-TAC-003'], hw['CMP-TAC-001']]);
  assert.ok(html.indexOf('DIGIT 360') < html.indexOf('>DIGIT<'), 'columns keep the chosen order');
  assert.match(html, /No public price/);
  assert.match(html, /Early access is not open sale/);
});

test('evidence badges: imported research pending review, maker-stated and paper conditions are marked', () => {
  const hw = Object.fromEntries(read('data/preview/hardware.json').rows.map((r) => [r.component_id, r]));
  assert.match(W.reviewBadge(hw['CMP-TAC-001']), /Imported research · original-source review pending/);
  assert.ok(W.evidenceTags(hw['CMP-TAC-005'].spatial_resolution).includes('Maker-stated'));
  assert.ok(W.evidenceTags(hw['CMP-TAC-001'].sampling_rate).includes('Paper conditions'));
  assert.ok(W.evidenceTags(hw['CMP-TAC-003'].weight).includes('Unverified third-party figure'));
  const pp = W.passportHtml(hw['CMP-TAC-001']);
  assert.equal((pp.match(/<li><b>/g) ?? []).length, parseSources(hw['CMP-TAC-001'].sources).length, 'every reference entry is listed');
  assert.match(pp, /A reachable link is not a verified claim/);
});

test('anonymous visitors get the first 10 products; subscribers every product, field and search result', async () => {
  const ctx = await setup();
  assert.equal((await ctx.call('GET', '/v1/datasets/hardware')).status, 401);
  assert.equal((await ctx.call('GET', '/v1/datasets/component-software')).status, 401);
  const preview = await (await ctx.call('GET', '/v1/datasets/hardware/preview')).json();
  assert.equal(preview.rows.length, 10);
  assert.equal(preview.total_rows, 12);
  for (const r of preview.rows) for (const f of COMPONENT_WITHHELD) assert.ok(!(f in r));
  const anon = await (await ctx.call('GET', '/v1/search?q=Example+sensor+12')).json();
  assert.ok(!anon.results.some((r) => /Example sensor 12/.test(r.title)), 'a product past the preview is not searchable by visitors');
  const { session, accountId } = await signIn(ctx, 'components@example.com');
  assert.equal((await ctx.call('GET', '/v1/datasets/hardware', { token: session })).status, 403);
  await sendWebhook(ctx, subscriptionEvent({ accountId }));
  const full = await (await ctx.call('GET', '/v1/datasets/hardware?limit=500', { token: session })).json();
  assert.equal(full.rows.length, 12);
  assert.ok(full.rows.every((r) => r.sources && r.measured && r.component_id), 'every meaningful field is served to subscribers');
  assert.ok(full.rows.every((r) => !('source_workbook' in r) && !('no' in r)));
  assert.doesNotMatch(JSON.stringify(full.rows), /docs\.google|Grok/);
  const sub = await (await ctx.call('GET', '/v1/search?q=Example+sensor+12', { token: session })).json();
  assert.ok(sub.results.some((r) => /Example sensor 12/.test(r.title)));
});

test('Investment: the appended thesis columns are accepted and never stored; the former header still reads', () => {
  const stocks = DATASETS_BY_ID.get('stocks');
  const values = fixtureWorkbook().Investment;
  const thesis = stocks.fields.indexOf('thesis_records');
  values[1][thesis] = `thesis-x: ${PRIVATE}`;
  const rows = normalizeTab(stocks, values).rows;
  assert.ok(rows.every((r) => !Object.keys(r.data).some((k) => k.startsWith('thesis_') || k === 'investment_theses')));
  const former = values.map((r) => r.slice(0, 22));
  assert.equal(normalizeTab(stocks, former).rows.length, rows.length);
  const drift = values.map((r, i) => (i === 0 ? [...r.slice(0, 29), 'SOMETHING_ELSE'] : r));
  assert.throws(() => normalizeTab(stocks, drift), /header drift/);
});

test('public pages: product addresses for every id, subscriber-only addresses carry no product data, makers link back', () => {
  const c = read('data/components/coverage.json');
  const pub = new Set(read('data/preview/hardware.json').rows.map((r) => r.component_id).concat(read('data/preview/component-software.json').rows.map((r) => r.component_id)));
  const makers = read('tools/components-makers.json');
  for (const id of Object.keys(makers.makers)) assert.ok(pub.has(id), `${id}: makers are reviewed for public products only`);
  for (const id of [...c.ids.products, ...c.ids.software]) {
    const file = new URL(`components/${id.toLowerCase()}/index.html`, root);
    assert.ok(existsSync(file), `${id} has its address`);
    const html = readFileSync(file, 'utf8');
    if (pub.has(id)) {
      assert.match(html, /class="pp"/);
      assert.match(html, /Imported research · original-source review pending/);
    } else {
      assert.match(html, /<meta name="robots" content="noindex">/);
      assert.doesNotMatch(html, /class="pp"|pp-kv|Sensing principle/, `${id}: no product data before sign-in`);
    }
  }
  const digit = readFileSync(new URL('components/cmp-tac-001/index.html', root), 'utf8');
  assert.match(digit, /href="\/companies\/gelsight-inc\/"/);
  const company = readFileSync(new URL('companies/gelsight-inc/index.html', root), 'utf8');
  assert.match(company, /href="\/components\/cmp-tac-001\/"/);
  // The PaXini page of the former directory now redirects to the maker's current page.
  assert.match(readFileSync(new URL('companies/paxini/index.html', root), 'utf8'), /url=\/companies\/paxini-tech\//);
  const tacto = readFileSync(new URL('components/cmp-tac-008/index.html', root), 'utf8');
  assert.match(tacto, /not counted in the Components products/);
  assert.match(tacto, /href="\/components\/cmp-tac-001\/"/);
});
