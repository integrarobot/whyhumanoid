// Rules of tools/export-fundamentals.mjs on synthetic SEC company facts, and the published snapshot's own checks.
//   node --no-warnings --test tools/test-fundamentals.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { issuerEntry, pickRevenue, reviewFlags, RULES } from './export-fundamentals.mjs';

const fy = (y, val, accn, filed, over = {}) => ({ start: `${y}-01-01`, end: `${y}-12-31`, val, accn, fy: y, fp: 'FY', form: '10-K', filed, ...over });
const co = (concepts) => ({ key: 'X:FX', cik: 1, concepts });
const concept = (name, units, ns = 'us-gaap') => ({ namespace: ns, concept: name, units });

test('the most recent annual concept wins; concepts are never added up', () => {
  const r = pickRevenue(co([
    concept('Revenues', { USD: [fy(2023, 100, 'a1', '2024-02-01')] }),
    concept('RevenueFromContractWithCustomerExcludingAssessedTax', { USD: [fy(2024, 90, 'a2', '2025-02-01'), fy(2025, 120, 'a3', '2026-02-01'), fy(2024, 90, 'a3', '2026-02-01')] }),
  ]));
  assert.equal(r.status, 'published');
  assert.equal(r.concept, 'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax');
  assert.deepEqual([r.revenue.value, r.revenue.end, r.prior.value, r.prior.accession, r.growth_yoy], [120, '2025-12-31', 90, 'a3', 0.3333]);
});

test('same year in two concepts: equal values are one figure; Revenues over a contract concept it contains; else pending', () => {
  const eq = pickRevenue(co([concept('Revenues', { USD: [fy(2025, 50, 'b', '2026-02-01'), fy(2024, 40, 'b', '2026-02-01')] }), concept('RevenueFromContractWithCustomerExcludingAssessedTax', { USD: [fy(2025, 50, 'b', '2026-02-01')] })]));
  assert.deepEqual([eq.status, eq.revenue.value, eq.growth_yoy], ['published', 50, 0.25]);
  const sup = pickRevenue(co([concept('RevenueFromContractWithCustomerExcludingAssessedTax', { USD: [fy(2025, 332, 'c', '2026-03-05'), fy(2024, 300, 'c', '2026-03-05')] }), concept('Revenues', { USD: [fy(2025, 395, 'c', '2026-03-05'), fy(2024, 369, 'c', '2026-03-05')] })]));
  assert.deepEqual([sup.concept, sup.revenue.value], ['us-gaap:Revenues', 395]);
  const amb = pickRevenue(co([concept('RevenueFromContractWithCustomerExcludingAssessedTax', { USD: [fy(2025, 10, 'd', '2026-02-01')] }), concept('RevenueFromContractWithCustomerIncludingAssessedTax', { USD: [fy(2025, 11, 'd', '2026-02-01')] })]));
  assert.equal(amb.status, 'pending');
});

test('a convenience translation is set aside for the reporting currency', () => {
  const r = pickRevenue(co([concept('Revenues', {
    CNY: [fy(2025, 700, 'e', '2026-04-20', { form: '20-F' }), fy(2024, 640, 'e', '2026-04-20', { form: '20-F' })],
    USD: [fy(2025, 100, 'e', '2026-04-20', { form: '20-F' }), fy(2024, 91, 'z', '2025-04-20', { form: '20-F' })],
  })]));
  assert.deepEqual([r.status, r.revenue.currency, r.prior.currency], ['published', 'CNY', 'CNY']);
});

test('restatements take the latest filing; the previous year comes from the same filing when it is there', () => {
  const r = pickRevenue(co([concept('Revenues', { USD: [fy(2024, 80, 'f1', '2025-02-01'), fy(2025, 100, 'f2', '2026-02-01'), fy(2024, 82, 'f2', '2026-02-01'), fy(2025, 101, 'f3', '2026-06-01', { form: '10-K/A' })] })]));
  assert.deepEqual([r.revenue.value, r.revenue.form, r.prior.value], [101, '10-K/A', 82]);
});

test('no previous year or a base of zero means no growth figure; quarters and short periods are not annual', () => {
  const none = pickRevenue(co([concept('Revenues', { USD: [fy(2025, 5, 'g', '2026-02-01')] })]));
  assert.deepEqual([none.growth_yoy, /No previous fiscal year/.test(none.growth_note)], [null, true]);
  const zero = pickRevenue(co([concept('Revenues', { USD: [fy(2025, 3, 'h', '2026-02-01'), fy(2024, 0, 'h', '2026-02-01')] })]));
  assert.deepEqual([zero.growth_yoy, /zero or less/.test(zero.growth_note)], [null, true]);
  const q = pickRevenue(co([concept('Revenues', { USD: [{ start: '2026-07-01', end: '2026-09-30', val: 28, accn: 'q', form: '10-Q', filed: '2026-10-22' }, fy(2025, 95, 'k', '2026-02-01', { form: '10-Q' })] })]));
  assert.equal(q.status, 'no_annual_revenue');
});

test('large changes and old years are flagged, not hidden', () => {
  assert.deepEqual(reviewFlags({ status: 'published', growth_yoy: 2.1, revenue: { end: '2025-12-31' } }, '2026-11-26'), ['growth_outlier']);
  assert.deepEqual(reviewFlags({ status: 'published', growth_yoy: 0.1, revenue: { end: '2024-12-31' } }, '2026-11-26'), ['old_fiscal_year']);
});

test('the published snapshot: SEC sources, rules, growth computed from the stored values, no quote fields', () => {
  const snap = JSON.parse(readFileSync(new URL('../data/investment/fundamentals.json', import.meta.url), 'utf8'));
  assert.deepEqual(snap.rules, RULES);
  assert.match(snap.packet_sha256, /^[0-9a-f]{64}$/);
  const entries = Object.entries(snap.securities);
  assert.equal(snap.counts.companies, entries.length);
  for (const [key, x] of entries) {
    if (x.source !== 'issuer') assert.match(x.source_url, /^https:\/\/data\.sec\.gov\/api\/xbrl\/companyfacts\/CIK\d{10}\.json$/, key);
    if (x.status !== 'published') continue;
    if (x.source === 'sec') assert.match(x.revenue.filing_url, /^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/\d{18}\/$/, key);
    else assert.ok(x.revenue.locator && /^https:\/\//.test(x.revenue.filing_url), key);
    assert.equal(x.growth_status, x.growth_yoy !== null ? 'ok' : x.prior ? 'not_meaningful' : 'not_available', key);
    assert.ok(Number.isFinite(x.revenue.value), key);
    if (x.growth_yoy !== null) assert.equal(x.growth_yoy, Math.round((x.revenue.value / x.prior.value - 1) * 1e4) / 1e4, key);
    if (x.prior) assert.equal(x.prior.currency, x.revenue.currency, `${key}: same currency`);
    assert.doesNotMatch(JSON.stringify(x), /"(price|market_cap|pe|quote)"/, key);
  }
  const fanuc = snap.securities['TYO:6954'];
  assert.deepEqual([fanuc.source, fanuc.revenue.currency, fanuc.revenue.start, fanuc.revenue.end, fanuc.growth_yoy], ['issuer', 'JPY', '2025-04-01', '2026-03-31', 0.0762]);
  assert.match(snap.securities['ETR:SHA0'].note, /Vitesco.*pro-forma.*not interchangeable/);
  assert.deepEqual([snap.securities['HKG:9880'].revenue.currency, snap.securities['HKG:9880'].growth_yoy], ['CNY', 0.5329]);
  const tsla = snap.securities['NASDAQ:TSLA'];
  assert.deepEqual([tsla.revenue.value, tsla.revenue.end, tsla.prior.value, tsla.growth_yoy], [94827000000, '2025-12-31', 97690000000, -0.0293]);
});

test('issuer figures: real fiscal years, consecutive, stated growth equal to the values, reviewed reader note', () => {
  const base = { key: 'TYO:6954', name: 'FX', currency: 'JPY', revenue: 110, prior_revenue: 100, period_start: '2025-04-01', period_end: '2026-03-31', prior_start: '2024-04-01', prior_end: '2025-03-31', basis: 'FY', revenue_growth_yoy_pct: 10, source_url: 'https://ir.example.com/ar.pdf', source_locator: 'p.1', published: '2026-04-24', checked_at: '2026-11-26', raw_sha256: 'a'.repeat(64), note: 'Issuer labels the year ending March 2026 FY2025.' };
  const ok = issuerEntry(base);
  assert.deepEqual([ok.growth_yoy, ok.growth_status, ok.note], [0.1, 'ok', 'FANUC calls the year to 31 March 2026 its fiscal 2025.']);
  assert.throws(() => issuerEntry({ ...base, revenue_growth_yoy_pct: 12 }), /stated growth differs/);
  assert.throws(() => issuerEntry({ ...base, period_start: '2025-10-01' }), /period length/);
  assert.throws(() => issuerEntry({ ...base, prior_start: '2023-04-01', prior_end: '2024-03-31' }), /not consecutive/);
  assert.throws(() => issuerEntry({ ...base, note: 'changed' }), /review tools\/fundamentals-notes\.json/);
  assert.equal(issuerEntry({ ...base, prior_revenue: 0, revenue_growth_yoy_pct: undefined }).growth_status, 'not_meaningful');
  assert.equal(issuerEntry({ ...base, prior_revenue: null, revenue_growth_yoy_pct: undefined }).growth_status, 'not_available');
});

test('the SEC fetcher: identifying User-Agent, paced requests, annual total-revenue facts only, failures reported', async () => {
  const { buildPacket, extract, USER_AGENT } = await import('./fetch-sec-revenue.mjs');
  const doc = { facts: {
    'us-gaap': {
      Revenues: { units: { USD: [
        { start: '2025-01-01', end: '2025-12-31', val: 10, accn: 'a', fy: 2025, fp: 'FY', form: '10-K', filed: '2026-02-01' },
        { start: '2025-07-01', end: '2025-09-30', val: 3, accn: 'q', fy: 2025, fp: 'Q3', form: '10-Q', filed: '2025-10-20' },
        { start: '2021-01-01', end: '2021-12-31', val: 7, accn: 'o', fy: 2021, fp: 'FY', form: '10-K', filed: '2022-02-01' },
      ] } },
      SalesRevenueGoodsNet: { units: { USD: [{ start: '2025-01-01', end: '2025-12-31', val: 8, accn: 'a', fy: 2025, fp: 'FY', form: '10-K', filed: '2026-02-01' }] } },
    },
  } };
  assert.deepEqual(extract(doc, '2023-01-01'), [{ namespace: 'us-gaap', concept: 'Revenues', units: { USD: [{ start: '2025-01-01', end: '2025-12-31', val: 10, accn: 'a', fy: 2025, fp: 'FY', form: '10-K', filed: '2026-02-01' }] } }]);
  const calls = [];
  let pauses = 0;
  const fetchImpl = async (url, init) => {
    calls.push([url, init.headers['user-agent']]);
    if (url.endsWith('0000000002.json')) return { status: 404 };
    return { status: 200, arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(doc)).buffer };
  };
  const { packet, failures } = await buildPacket([{ key: 'X:A', name: 'A', cik: 1, sec_name: 'A Inc.' }, { key: 'X:B', name: 'B', cik: 2, sec_name: 'B Inc.' }], { fetchImpl, today: '2026-11-26', pause: async () => { pauses += 1; } });
  assert.deepEqual(calls, [['https://data.sec.gov/api/xbrl/companyfacts/CIK0000000001.json', USER_AGENT], ['https://data.sec.gov/api/xbrl/companyfacts/CIK0000000002.json', USER_AGENT]]);
  assert.doesNotMatch(USER_AGENT, /@/, 'no personal email in the User-Agent');
  assert.equal(pauses, 2);
  assert.deepEqual(failures, ['X:B: HTTP 404']);
  assert.equal(packet.companies.length, 1);
  assert.match(packet.companies[0].raw_sha256, /^[0-9a-f]{64}$/);
});
