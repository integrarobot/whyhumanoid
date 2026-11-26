// Rules of tools/export-fundamentals.mjs on synthetic SEC company facts, and the published snapshot's own checks.
//   node --no-warnings --test tools/test-fundamentals.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickRevenue, reviewFlags, RULES } from './export-fundamentals.mjs';

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
    assert.match(x.source_url, /^https:\/\/data\.sec\.gov\/api\/xbrl\/companyfacts\/CIK\d{10}\.json$/, key);
    if (x.status !== 'published') continue;
    assert.match(x.revenue.filing_url, /^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/\d{18}\/$/, key);
    assert.ok(Number.isFinite(x.revenue.value), key);
    if (x.growth_yoy !== null) assert.equal(x.growth_yoy, Math.round((x.revenue.value / x.prior.value - 1) * 1e4) / 1e4, key);
    if (x.prior) assert.equal(x.prior.currency, x.revenue.currency, `${key}: same currency`);
    assert.doesNotMatch(JSON.stringify(x), /"(price|market_cap|pe|quote)"/, key);
  }
  const tsla = snap.securities['NASDAQ:TSLA'];
  assert.deepEqual([tsla.revenue.value, tsla.revenue.end, tsla.prior.value, tsla.growth_yoy], [94827000000, '2025-12-31', 97690000000, -0.0293]);
});
