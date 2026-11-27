// Components data contract v1 (ops/components-data-contract.md): synthetic fixtures only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TABS, validateStaging, publicProjection, PUBLIC_COMPANY_FIELDS } from '../src/components/contract.js';

const sheet = (tab, rows) => [TABS[tab], ...rows.map((r) => TABS[tab].map((h) => r[h] ?? ''))];
function fixture(over = {}) {
  const t = {
    cc_sources: [
      { source_id: 'csr_example-actuators-datasheet', url: 'https://example.com/a1-datasheet', title: 'A1 datasheet', publisher: 'Example Actuators', publication_date: '2026-05', accessed_on: '2026-11-23', source_role: 'manufacturer', language: 'en' },
      { source_id: 'csr_example-etf', url: 'https://example.org/etf-holdings', title: 'ETF holdings', publisher: 'Example ETF', accessed_on: '2026-11-23', source_role: 'index_membership', language: 'en' },
      { source_id: 'csr_example-robot-news', url: 'https://example.net/news', title: 'Robot uses A1', publisher: 'Example Robots', publication_date: '2026-09-01', accessed_on: '2026-11-23', source_role: 'customer', language: 'en' },
    ],
    cc_companies: [
      { company_id: 'cco_example-actuators', name: 'Example Actuators', website: 'https://example.com', hq_country: 'Germany', organisation_type: 'company', humanoid_relevance: 'documented_humanoid_supplier', relevance_reason: 'A customer names its actuator in a humanoid.', source_ids: 'csr_example-robot-news', legacy_components_url: 'https://example.com/a1', reviewed_on: '2026-11-23' },
      { company_id: 'cco_example-bearings', name: 'Example Bearings', hq_country: 'Japan', organisation_type: 'company', humanoid_relevance: 'candidate_needs_evidence', relevance_reason: 'Listed in a robotics ETF; no supply evidence found.', source_ids: 'csr_example-etf', listing_isin: 'JP0000000001', reviewed_on: '2026-11-23' },
    ],
    cc_roles: [{ company_id: 'cco_example-actuators', role: 'manufacturer', families: 'actuator | motor', statement: 'Makes the A1 rotary actuator.', source_ids: 'csr_example-actuators-datasheet' }],
    cc_products: [{ product_id: 'cpr_example-actuators__a1', company_id: 'cco_example-actuators', product_name: 'A1', version: 'Rev B', family: 'actuator', product_kind: 'commercial_hardware', availability: 'available', availability_as_of: '2026-11', limitations: 'Torque at 25 °C only.', source_ids: 'csr_example-actuators-datasheet' }],
    cc_specs: [{ product_id: 'cpr_example-actuators__a1', spec: 'peak_torque', value: '120', unit: 'N·m', conditions: '25 °C, 2 s', source_id: 'csr_example-actuators-datasheet', locator: 'p. 2' }],
    cc_prices: [{ product_id: 'cpr_example-actuators__a1', price_kind: 'list_price', amount: '900', currency: 'EUR', quantity_basis: 'per unit, 1 to 9 units', price_date: '2026-11-01', source_id: 'csr_example-actuators-datasheet', locator: 'price list' }],
    cc_integrations: [{ product_id: 'cpr_example-actuators__a1', robot_or_platform: 'Example Robot', relation: 'customer_reported', statement: 'Example Robots says its knee uses A1.', source_id: 'csr_example-robot-news', locator: 'paragraph 3' }],
    cc_investment_screen: [
      { investment_key: 'JP0000000001', name: 'Example Bearings', decision: 'candidate_needs_evidence', families: 'bearing', reason: 'ETF membership only.', source_ids: 'csr_example-etf', reviewed_on: '2026-11-23' },
      { investment_key: 'XYZ:NYSE', name: 'Example Bank', decision: 'excluded', reason: 'Financial services; no physical supply chain role.', reviewed_on: '2026-11-23' },
    ],
    ...over,
  };
  return Object.fromEntries(Object.entries(t).map(([k, rows]) => [k, sheet(k, rows)]));
}

test('a complete staging export passes, and the investment screen must cover every Investment row', () => {
  const { problems, counts } = validateStaging(fixture());
  assert.deepEqual(problems, []);
  assert.equal(counts.cc_specs, 1);
  const missing = validateStaging(fixture(), { investmentKeys: ['JP0000000001', 'XYZ:NYSE', 'US0000000002'] }).problems;
  assert.ok(missing.some((p) => /US0000000002 not screened/.test(p)));
});

test('index membership is never evidence; included and documented records need evidence sources', () => {
  const t = fixture({ cc_investment_screen: [{ investment_key: 'JP0000000001', name: 'Example Bearings', decision: 'included', families: 'bearing', reason: 'In a robotics ETF.', source_ids: 'csr_example-etf', reviewed_on: '2026-11-23' }, { investment_key: 'XYZ:NYSE', name: 'Example Bank', decision: 'excluded', reason: 'Bank.', reviewed_on: '2026-11-23' }] });
  assert.ok(validateStaging(t).problems.some((p) => /index membership or an analyst note is not evidence/.test(p)));
});

test('units, ids, research vs commercial, price kinds and private links are enforced', () => {
  const bad = fixture({
    cc_specs: [{ product_id: 'cpr_example-actuators__a1', spec: 'peak_torque', value: 'about 120', unit: 'Nm', source_id: 'csr_example-actuators-datasheet' }],
    cc_products: [{ product_id: 'cpr_other__a1', company_id: 'cco_example-actuators', product_name: 'A1', family: 'actuator', product_kind: 'research_prototype', availability: 'available', source_ids: 'csr_example-actuators-datasheet' }],
    cc_prices: [{ product_id: 'cpr_example-actuators__a1', price_kind: 'list_price', amount: '900', currency: 'EUR', quantity_basis: 'per unit', price_date: '2026-11-01', source_id: 'csr_example-robot-news' }],
  });
  // A private sheet link, assembled so that no such link sits in the repository.
  bad.cc_sources.push(['csr_private', ['https://docs', 'google', 'com/spreadsheets/d/x/edit'].join('.'), 'Sheet', 'Someone', '', '2026-11-23', 'other', 'en']);
  const p = validateStaging(bad).problems.join('\n');
  for (const want of [/unit Nm for peak_torque/, /must start with its company slug/, /research prototype is not available/, /list price or quote comes from the manufacturer/, /public https address/, /value must be a number/]) assert.match(p, want);
});

test('one company, one record; the public projection holds allowlisted fields only', () => {
  const dup = fixture();
  dup.cc_companies.push(['cco_example-actuators-2', 'Example Actuators', '', '', 'Germany', 'company', '', '', '', '', 'excluded', 'dup', 'csr_example-etf', '', '2026-11-23']);
  assert.ok(validateStaging(dup).problems.some((p) => /one company, one record/.test(p)));
  const { records } = validateStaging(fixture());
  const pub = publicProjection(records);
  assert.equal(pub.length, 2);
  for (const c of pub) assert.deepEqual(Object.keys(c).sort(), [...PUBLIC_COMPANY_FIELDS, 'roles', 'families', 'products'].sort());
  assert.doesNotMatch(JSON.stringify(pub), /120|900|Torque at|customer|example\.net|csr_/, 'no specs, prices, limitations, integrations or sources in public');
});
