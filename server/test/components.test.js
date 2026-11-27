// Components (23 Nov 2026): the product catalogue contract, its blocks, public allowlists and access.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  COMPONENT_BASE_HEADERS, COMPONENT_CLASSES, COMPONENT_EXTENSION_HEADERS, COMPONENT_HEADERS, COMPONENT_FIELDS, COMPONENT_WITHHELD, componentBlocks, componentProblems, parseSources, parseSpecs, scrubComponentText,
} from '../src/components/catalogue.js';
import { DATASETS_BY_ID } from '../src/datasets.js';
import { PUBLIC_FIELDS, isOpenComponent } from '../src/access/fields.js';
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

test('the Components table has the 37 reviewed columns in order plus the eight-column extension, and housekeeping columns are withheld', () => {
  assert.equal(COMPONENT_BASE_HEADERS.length, 37);
  assert.deepEqual(COMPONENT_EXTENSION_HEADERS, ['COMPONENT_CLASS', 'FUNCTION', 'APPLICATIONS', 'TECHNICAL_SPECIFICATIONS', 'INTEGRATION_REQUIREMENTS', 'LIMITATIONS', 'EVIDENCE_SCOPE', 'CHECKED_AT']);
  assert.equal(COMPONENT_HEADERS.length, 45);
  assert.equal(COMPONENT_FIELDS.length, 45);
  assert.deepEqual([COMPONENT_HEADERS[0], COMPONENT_HEADERS[1], COMPONENT_HEADERS[31], COMPONENT_HEADERS[34], COMPONENT_HEADERS[35], COMPONENT_HEADERS[36], COMPONENT_HEADERS[37], COMPONENT_HEADERS[44]], ['No.', 'Sensor', 'Component ID', 'Source workbook', 'Sources and evidence', 'Comparison summary', 'COMPONENT_CLASS', 'CHECKED_AT']);
  assert.deepEqual([...COMPONENT_WITHHELD].sort(), ['no', 'source_workbook']);
  assert.deepEqual(spec.headers, COMPONENT_HEADERS);
  assert.deepEqual(spec.formerHeaders, [COMPONENT_BASE_HEADERS], 'a tab with only A:AK stays valid');
  assert.throws(() => normalizeTab(spec, [['NAME', 'URL', 'DESCRIPTION'], ['Old', 'https://x.example.com', '']]), /header drift/, 'the former three-column directory is refused');
});

test('family extension: a 37-column tab still imports; a partial or reordered extension is refused', () => {
  const base = (r) => r.slice(0, 37);
  const values = layout([base(row())]).map((r) => (r.length >= 37 && r[0] === 'No.' ? [...COMPONENT_BASE_HEADERS] : r.length > 37 ? base(r) : r));
  assert.equal(normalizeTab(spec, values).rows.length, 1);
  const partial = layout([row()]);
  partial[0] = [...COMPONENT_BASE_HEADERS, 'COMPONENT_CLASS', 'FUNCTION'];
  assert.throws(() => normalizeTab(spec, partial), /header drift/);
  const swapped = layout([row()]);
  swapped[0] = [...COMPONENT_BASE_HEADERS, 'FUNCTION', 'COMPONENT_CLASS', ...COMPONENT_EXTENSION_HEADERS.slice(2)];
  assert.throws(() => normalizeTab(spec, swapped), /header drift/);
});

const SPEC_SRC = 'Datasheet\nhttps://maker.example.com/datasheet.pdf\nAccessed: 26 Nov 2026\nReview status: Primary source checked 2026-11-26';
const actuator = (over = {}) => ({
  component_id: 'CMP-ACT-001', name: 'Example actuator', group: 'Commercial', family: 'Quasi-direct-drive actuator',
  component_class: 'actuator', function: 'Drives a robot joint.', evidence_scope: 'manufacturer_datasheet', checked_at: '2026-11-26',
  sources: SPEC_SRC,
  technical_specifications: 'peak_torque | 120 | N·m | momentary, 48 V | https://maker.example.com/datasheet.pdf | p. 2, Table 1 | 2026-11-26\nmass | 1.2 | kg |  | https://maker.example.com/datasheet.pdf | p. 2 | 2026-11-26',
  ...over,
});

test('family extension: class vocabulary, ID prefix, specification lines, sources, scopes, dates and touch-only columns', () => {
  assert.deepEqual(componentProblems([actuator()]), []);
  const { specs } = parseSpecs(actuator().technical_specifications);
  assert.deepEqual(specs[0], { metric: 'peak_torque', value: '120', unit: 'N·m', conditions: 'momentary, 48 V', source_url: 'https://maker.example.com/datasheet.pdf', locator: 'p. 2, Table 1', checked_at: '2026-11-26' });
  assert.equal(specs[1].conditions, null);
  const one = (over) => componentProblems([actuator(over)]).join(' | ');
  assert.match(one({ component_class: 'motorised_thing' }), /not in the reviewed vocabulary/);
  assert.match(one({ component_id: 'CMP-RED-001' }), /prefix does not match class actuator \(ACT\)/);
  assert.match(one({ technical_specifications: 'peak_torque | 120 | N·m' }), /has 3 fields, not 7/);
  assert.match(one({ technical_specifications: 'Peak Torque | 120 | N·m | | https://maker.example.com/datasheet.pdf | p. 2 | 2026-11-26' }), /not snake_case/);
  assert.match(one({ technical_specifications: 'peak_torque | 120 | N·m | | http://maker.example.com/x | p. 2 | 2026-11-26' }), /not an https link/);
  assert.match(one({ technical_specifications: 'peak_torque | 120 | N·m | | https://other.example.com/x | p. 2 | 2026-11-26' }), /not in Sources and evidence/);
  assert.match(one({ technical_specifications: 'peak_torque | 120 | N·m | | https://maker.example.com/datasheet.pdf | p. 2 | 26 Nov 2026' }), /not YYYY-MM-DD/);
  assert.match(one({ evidence_scope: 'manufacturer_datasheet; vibes' }), /EVIDENCE_SCOPE "vibes"/);
  assert.match(one({ checked_at: 'yesterday' }), /CHECKED_AT/);
  assert.match(one({ force_range: '0–120 N·m' }), /force_range is a touch-sensing column/, 'actuator torque never goes into a tactile force cell');
  assert.deepEqual(componentProblems([actuator({ force_range: 'N/A', resolution_count: '' })]), []);
  // Once any product is classified, every product must be.
  assert.match(componentProblems([actuator(), { ...actuator(), component_id: 'CMP-TAC-001', component_class: null, family: 'Tactile sensor' }]).join(' '), /COMPONENT_CLASS "" is not in the reviewed vocabulary/);
  assert.deepEqual(componentProblems([actuator(), { ...actuator(), component_id: 'CMP-TAC-001', component_class: 'tactile_sensor', family: 'Tactile sensor', force_range: '0.1–5 N', technical_specifications: null }]), []);
  for (const [k, c] of Object.entries(COMPONENT_CLASSES)) assert.match(c.prefix, /^[A-Z]{3}$/, k);
});

test('bearing class (27 Nov 2026): BRG prefix, dimension and load-rating keys, never a tactile column', () => {
  assert.deepEqual(COMPONENT_CLASSES.bearing, { prefix: 'BRG', label: 'Bearing', metrics: ['inner_diameter', 'outer_diameter', 'width', 'dynamic_load_rating', 'static_load_rating'] });
  const brg = (over) => actuator({
    component_id: 'CMP-BRG-001', name: 'Example cross-roller ring', family: 'Cross-roller ring', component_class: 'bearing', function: 'Carries the loads of a rotary joint.',
    technical_specifications: 'inner_diameter | 20 | mm |  | https://maker.example.com/datasheet.pdf | p. 87 | 2026-11-27\ndynamic_load_rating | 4.0 | kN | basic dynamic load rating | https://maker.example.com/datasheet.pdf | p. 87 | 2026-11-27',
    ...over,
  });
  assert.deepEqual(componentProblems([brg()]), []);
  assert.deepEqual(componentProblems([brg({ component_id: 'CMP-BRG-002' })]), []);
  assert.match(componentProblems([brg({ component_id: 'CMP-RED-005' })]).join(' '), /prefix does not match class bearing \(BRG\)/);
  assert.match(componentProblems([brg({ force_range: '0-4 kN' })]).join(' '), /force_range is a touch-sensing column/);
});

test('family extension: the public projection carries class, function, evidence scope and date, never specifications', () => {
  const pub = PUBLIC_FIELDS.hardware;
  for (const f of ['component_class', 'function', 'evidence_scope', 'checked_at']) assert.ok(pub.includes(f), f);
  for (const f of ['applications', 'technical_specifications', 'integration_requirements', 'limitations']) assert.ok(!pub.includes(f), f);
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

test('the committed public data: 51 product ids (19 touch, 32 other families) and the software id, 154 references, counts that add up', () => {
  const c = read('data/components/coverage.json');
  const want = Array.from({ length: 20 }, (_, i) => `CMP-TAC-${String(i + 1).padStart(3, '0')}`).filter((id) => id !== 'CMP-TAC-008');
  assert.deepEqual(c.ids.products.slice(0, 19), want, 'the 19 touch products keep their ids and order');
  assert.equal(c.ids.products.length, 51);
  for (const id of c.ids.products.slice(19)) assert.doesNotMatch(id, /^CMP-TAC-/, `${id}: a new family keeps its own prefix`);
  assert.deepEqual(c.ids.software, ['CMP-TAC-008'], 'TACTO is software, not a product');
  assert.equal(c.counts.products, 51);
  assert.equal(c.counts.references, 154, 'every reference entry of the products and TACTO is accounted for');
  assert.deepEqual(c.counts.by_component_class, { tactile_sensor: 18, tactile_hand: 1, actuator: 3, reducer: 4, motion_controller: 1, dexterous_hand: 6, gripper: 2, force_torque_sensor: 3, vision_sensor: 6, compute_module: 3, encoder: 2, power_battery: 2 });
  assert.deepEqual(c.counts.by_review, { partial: 18, pending: 1, checked: 32 });
  assert.equal(Object.values(c.counts.by_class).reduce((a, b) => a + b, 0), 51);
  assert.deepEqual(Object.keys(c).sort(), ['counts', 'ids', 'note', 'snapshot', 'title']);
  const hw = read('data/preview/hardware.json').rows;
  assert.deepEqual(hw.map((r) => r.component_id), c.ids.products, 'every product is public at its public fields, in workbook order (24 Nov 2026)');
  for (const r of hw) assert.ok(r.component_class && r.function, `${r.component_id}: class and function are public`);
  const sw = read('data/preview/component-software.json').rows;
  for (const r of [...hw, ...sw]) {
    for (const f of COMPONENT_WITHHELD) assert.ok(!(f in r), `${r.component_id}: ${f} is withheld`);
    for (const k of Object.keys(r)) assert.ok(k === '_row' || PUBLIC_FIELDS.hardware.includes(k), `${r.component_id}: ${k} is a paid field`);
    assert.ok(r.main_source_url && r.review_status && r.principle && r.measured, `${r.component_id}: public summary incomplete`);
    // Open hardware keeps its licence and its reference; a proprietary product does not publish them.
    assert.equal('licence' in r, isOpenComponent(r), `${r.component_id}: licence published only for open hardware`);
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

// Synthetic values with the same shapes as the research records (no paid value of a real product is kept in Git).
const SYN = {
  listed: '120 USD (maker store, accessed 23 Nov 2026; lead time 4 weeks)',
  distributor: 'From 3,900 USD for one model (distributor price list, 2026)',
  third: 'No official price. Range 1,000–2,000 USD cited by third parties, not verified',
  quote: 'On request (historical reference: a 2021 article cited about 6,000 USD)',
  notSold: 'N/A (not sold: open source, build it yourself)',
  cny: '2,000 CNY per unit (maker store, 2026)',
  rate: '60 fps (paper); 30 fps by default in the interface',
  maker: 'Sub-millimetre (manufacturer)',
  weight: '≈ 30 g (third-party spec sheet, not verified)',
};
test('prices, quotes, third-party figures and BOM estimates stay separate; nothing is converted or ranked', () => {
  assert.equal(W.priceOf(SYN.listed).state, 'listed');
  assert.deepEqual(W.priceOf(SYN.distributor), { state: 'listed', flags: ['distributor'] });
  assert.deepEqual(W.priceOf(SYN.third), { state: 'no_public_price', flags: ['third_party'] });
  assert.deepEqual(W.priceOf(SYN.quote), { state: 'quote', flags: ['historical'] });
  assert.equal(W.priceOf(SYN.notSold).state, 'not_sold');
  assert.equal(W.priceOf('Free').state, 'free');
  assert.match(W.valueHtml('list_price', SYN.cny), /CNY/, 'original currency kept, never converted');
  assert.ok(W.varies('uSPa44: 44 taxels; uSCu ALHA: 240 taxels'), 'values that differ by model are flagged');
  // The comparison renders values as recorded and never sorts by a value.
  const a = { component_id: 'CMP-TST-003', name: 'Example early access', group: 'Commercial (early access)', list_price: SYN.third };
  const b = { component_id: 'CMP-TST-001', name: 'Example listed', group: 'Commercial', list_price: SYN.listed };
  const html = W.compareHtml([a, b]);
  assert.ok(html.indexOf('Example early access') < html.indexOf('Example listed'), 'columns keep the chosen order');
  assert.match(html, /No public price/);
});

test('evidence badges: imported research pending review, maker-stated and paper conditions are marked', () => {
  const hw = Object.fromEntries(read('data/preview/hardware.json').rows.map((r) => [r.component_id, r]));
  const by = (st) => Object.values(hw).find((r) => W.reviewState(r) === st);
  assert.match(W.reviewBadge(by('pending')), /Imported research · original-source review pending/);
  assert.match(W.reviewBadge(by('partial')), /ev-partial">Primary sources checked 2026-11-26 for identity and selected specifications; other imported claims remain pending/);
  assert.match(W.reviewBadge(by('checked')), /ev-checked">Original sources checked 2026-11-26; manufacturer or research claims, not independent testing/);
  assert.doesNotMatch(W.passportHtml({ ...by('checked'), _summary: true }), /Independent test/, 'no record claims an independent test');
  assert.ok(W.evidenceTags(SYN.maker).includes('Maker-stated'));
  assert.ok(W.evidenceTags(SYN.rate).includes('Paper conditions'));
  assert.ok(W.evidenceTags(SYN.weight).includes('Unverified third-party figure'));
  const full = { component_id: 'CMP-TST-001', name: 'Example', group: 'Commercial', review_status: 'Imported research compilation; original-source review pending', sources: 'Product page\nhttps://a.example.com/\nAccessed: 23 Nov 2026\n\nPaper\nhttps://b.example.com/\nAccessed: 23 Nov 2026' };
  const pp = W.passportHtml(full);
  assert.equal((pp.match(/<li><b>/g) ?? []).length, 2, 'every reference entry is listed');
  assert.match(pp, /A reachable link is not a verified claim/);
});

test('a public summary names every paid field as with the subscription, never as missing from the source', () => {
  const hw = read('data/preview/hardware.json').rows.map((r) => ({ ...r, _summary: true }));
  for (const r of hw) {
    const pp = W.passportHtml(r);
    for (const sec of W.sectionsFor(r)) for (const [f] of sec.fields) {
      const cell = pp.match(new RegExp(`data-f="${f}">(.*?)</dd>`))?.[1] ?? '';
      if (!(f in r)) assert.match(cell, /With the subscription/, `${r.component_id}.${f}`);
    }
    assert.doesNotMatch(pp, /class="srcs"/, `${r.component_id}: field-level sources are paid`);
    assert.match(pp, /Main source/);
    // Cautions that cite paid values stay out of the public summary.
    if (W.PRODUCT_CAUTIONS[r.component_id] && !W.PUBLIC_CAUTIONS[r.component_id]) assert.doesNotMatch(pp, /Read with care/);
  }
  const card = W.cardHtml(hw[0], '');
  assert.match(card, /Specifications, price and sources with the subscription/);
  assert.doesNotMatch(card, /Quote on request|Price stated|No public price/);
});

test('anonymous visitors get every product at its public fields; subscribers every product, field and search result', async () => {
  const ctx = await setup();
  assert.equal((await ctx.call('GET', '/v1/datasets/hardware')).status, 401);
  assert.equal((await ctx.call('GET', '/v1/datasets/component-software')).status, 401);
  const preview = await (await ctx.call('GET', '/v1/datasets/hardware/preview')).json();
  assert.equal(preview.rows.length, 12);
  assert.equal(preview.total_rows, 12);
  for (const r of preview.rows) for (const f of [...COMPONENT_WITHHELD, 'dimensions', 'weight', 'list_price', 'bom_cost', 'sources', 'notes', 'advantages', 'drawbacks', 'comparison_summary']) assert.ok(!(f in r), f);
  // Open hardware keeps its licence and repository as the reference of its openness; a commercial product does not.
  const open = preview.rows.find((r) => r.group === 'Research / open hardware');
  const closed = preview.rows.find((r) => r.group === 'Commercial');
  assert.ok('licence' in open && 'repository' in open);
  assert.ok(!('licence' in closed) && !('repository' in closed));
  const anon = await (await ctx.call('GET', '/v1/search?q=Example+sensor+12')).json();
  assert.ok(anon.results.some((r) => /Example sensor 12/.test(r.title)), 'every product is findable by its public name');
  const paid = await (await ctx.call('GET', '/v1/search?q=Synthetic+force+range+12')).json();
  assert.equal(paid.total, 0, 'a paid value of a product is not searchable by visitors');
  const { session, accountId } = await signIn(ctx, 'components@example.com');
  assert.equal((await ctx.call('GET', '/v1/datasets/hardware', { token: session })).status, 403);
  await sendWebhook(ctx, subscriptionEvent({ accountId }));
  const full = await (await ctx.call('GET', '/v1/datasets/hardware?limit=500', { token: session })).json();
  assert.equal(full.rows.length, 12);
  assert.ok(full.rows.every((r) => r.sources && r.measured && r.component_id), 'every meaningful field is served to subscribers');
  assert.ok(full.rows.every((r) => !('source_workbook' in r) && !('no' in r)));
  assert.doesNotMatch(JSON.stringify(full.rows), /docs\.google|Grok/);
  const sub = await (await ctx.call('GET', '/v1/search?q=Synthetic+force+range+12', { token: session })).json();
  assert.ok(sub.results.some((r) => /Example sensor 12/.test(r.title)), 'subscribers search the paid values too');
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

test('public pages: a public summary at every product address, the full passport offered, makers link back', () => {
  const c = read('data/components/coverage.json');
  const pub = new Set(read('data/preview/hardware.json').rows.map((r) => r.component_id).concat(read('data/preview/component-software.json').rows.map((r) => r.component_id)));
  const makers = read('tools/components-makers.json');
  for (const id of Object.keys(makers.makers)) assert.ok(pub.has(id), `${id}: makers are reviewed for public products only`);
  for (const id of [...c.ids.products, ...c.ids.software]) {
    const file = new URL(`components/${id.toLowerCase()}/index.html`, root);
    assert.ok(existsSync(file), `${id} has its address`);
    const html = readFileSync(file, 'utf8');
    assert.ok(pub.has(id), `${id} is public at its public fields`);
    assert.match(html, /class="pp pp-summary"/);
    assert.match(html, /class="ev ev-(pending|partial|checked)"/, `${id}: its review state is shown`);
    assert.doesNotMatch(html, /<meta name="robots" content="noindex">/);
    assert.match(html, /class="pp-lockbox"/);
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

test('the browser core and the server share the family vocabulary and the metric keys', () => {
  assert.deepEqual(Object.keys(W.FAMILIES).sort(), Object.keys(COMPONENT_CLASSES).sort());
  for (const [k, c] of Object.entries(COMPONENT_CLASSES)) {
    assert.deepEqual(W.FAMILIES[k].metrics, c.metrics, k);
    assert.equal(W.FAMILIES[k].label, c.label, k);
    assert.equal(Boolean(W.FAMILIES[k].tactile), Boolean(c.tactile), k);
    for (const m of c.metrics) assert.ok(W.METRIC_LABEL[m], `${k}.${m} has a display label`);
  }
  assert.deepEqual([...W.FAMILY_ORDER].sort(), Object.keys(COMPONENT_CLASSES).sort());
  // A non-touch product is never given a touch-sensing principle or a tactile chart label.
  const act = { component_id: 'CMP-ACT-001', name: 'A', group: 'Commercial', component_class: 'actuator', principle: 'camera-based', _summary: true };
  assert.equal(W.facetsOf(act).principle, 'not_applicable');
  assert.doesNotMatch(W.passportHtml(act), /What it senses|Taxels|Force range/);
  assert.match(W.passportHtml({ ...act, review_status: 'Primary sources checked 2026-11-26 for identity and selected specifications; other imported claims remain pending' }), /ev-partial/);
});

test('full passports render every recorded field of every family, BOM apart from list price; cards and comparisons use family figures', () => {
  const special = new Set(['name', 'no', 'source_workbook', 'technical_specifications', 'sources', 'main_source_url', 'review_status', 'evidence_scope', 'checked_at', 'component_class', 'comparison_summary']);
  for (const cls of Object.keys(COMPONENT_CLASSES)) {
    const r = Object.fromEntries(COMPONENT_FIELDS.map((f) => [f, `Recorded ${f}`]));
    Object.assign(r, actuator({ component_class: cls, component_id: `CMP-${COMPONENT_CLASSES[cls].prefix}-001`, comparison_summary: 'Comparison scope: equal units only' }));
    if (!COMPONENT_CLASSES[cls].tactile) for (const f of ['resolution_count', 'spatial_resolution', 'force_range', 'force_resolution', 'surface', 'durability']) r[f] = null;
    const pp = W.passportHtml(r);
    for (const [k, v] of Object.entries(r)) if (v !== null && !special.has(k)) assert.ok(pp.includes(`data-f="${k}"`), `${cls}: ${k} is rendered`);
    assert.match(pp, /Peak torque<\/th><td><b>120<\/b> N·m/);
    assert.match(pp, /data-sec="comparison"/);
    assert.match(pp, /Estimated BOM or material cost|Estimated BOM \(open hardware\)/);
    if (!COMPONENT_CLASSES[cls].tactile) assert.doesNotMatch(W.cardHtml(r), /Taxels or camera/, `${cls}: no touch label on the card`);
  }
  const a = actuator();
  assert.match(W.cardHtml(a), /Peak torque.*120 N·m \(momentary, 48 V\)/s);
  const tac = { component_id: 'CMP-TAC-001', name: 'T', group: 'Commercial', component_class: 'tactile_sensor', integration_requirements: 'USB 3', limitations: 'Gel wears', technical_specifications: 'mass | 20 | g |  | https://maker.example.com/datasheet.pdf | p. 1 | 2026-11-26', sources: SPEC_SRC };
  const cmp = W.compareHtml([tac, { ...tac, component_id: 'CMP-TAC-002', name: 'U' }]);
  assert.match(cmp, /Structured figures/);
  assert.match(cmp, /Integration requirements/);
  assert.match(cmp, /href="https:\/\/maker\.example\.com\/datasheet\.pdf"[^>]*>source<\/a>, p\. 1/, 'each compared figure links its source');
});
