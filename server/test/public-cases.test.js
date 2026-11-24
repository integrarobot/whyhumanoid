// Public deployment cases (24 Nov 2026): every case from the public rows, grouped by deployment id, never merging
// distinct organisations, robots or versions, and never carrying a paid field.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEPLOYMENTS_PUBLIC, PUBLIC_FIELDS, publicValues } from '../src/access/fields.js';
import { caseSlug, publicCases, robotText } from '../src/public/cases.js';

const rec = (i, over = {}) => publicValues('deployments', {
  record_id: `fx_rec_${i}`, organization_id: 'org_fx_a', organization_name: 'Example Logistics', organization_role: 'customer_operator',
  organization_country: 'Germany', deployment_id: 'fx_dep_a_site', manufacturer: 'Example Robots', robot_model: 'Strider', robot_version: 'Not disclosed',
  sector: 'logistics', country: 'Germany', task_category: 'material_handling', operational_status: 'pilot', verification_status: 'vendor_reported',
  source_title: `Source ${i}`, source_url: `https://news-${i}.example.com/`, source_publisher: 'Example News', publication_date: `2025-0${i}-01`,
  // Paid fields are dropped by the allowlist before the cases ever see them.
  site_name: 'Hidden plant', claim_text: 'zetaword claim', metric_value: '42', task_description: 'confidential workflow',
  ...over,
});

test('the allowlist drops every paid field of a record', () => {
  const r = rec(1);
  assert.deepEqual(Object.keys(r).sort(), [...DEPLOYMENTS_PUBLIC].sort());
  assert.doesNotMatch(JSON.stringify(r), /Hidden plant|zetaword|confidential/);
  assert.deepEqual(PUBLIC_FIELDS['evidence-links'], [], 'claim-to-evidence links are paid detail');
});

test('several sources about one deployment are one case; its status is the latest recorded one', () => {
  const rows = [rec(1), rec(2, { operational_status: 'operational', verification_status: 'customer_confirmed' }), rec(3, { deployment_id: 'fx_dep_b_other', organization_id: 'org_fx_b', organization_name: 'Other Co' })];
  const cases = publicCases(rows);
  assert.equal(cases.length, 2);
  const a = cases[0];
  assert.equal(a.records, 2);
  assert.equal(a.slug, 'fx-dep-a-site');
  assert.equal(a.status.key, 'op');
  assert.equal(a.status.as_of, '2025-02-01');
  assert.equal(a.review.label, 'Confirmed by the customer or operator');
  assert.deepEqual(a.sources.map((s) => s.url), ['https://news-1.example.com/', 'https://news-2.example.com/']);
  assert.equal(a.first_date, '2025-01-01');
  assert.ok(!('history' in a), 'the detailed timeline is paid');
  assert.doesNotMatch(JSON.stringify(cases), /Hidden plant|zetaword|confidential|"42"/);
});

test('distinct organisations, robots and versions in one case stay distinct; unknown stays unknown', () => {
  const rows = [rec(1), rec(2, { robot_version: 'Gen 2', organization_id: 'org_fx_c', organization_name: 'Partner Co', organization_role: 'technology_partner' }), rec(3, { task_category: 'unspecified' })];
  const [c] = publicCases(rows);
  assert.equal(c.organisations.length, 2);
  assert.equal(c.robots.length, 2, 'an unstated version and Gen 2 are not merged');
  assert.equal(robotText(c), 'Example Robots Strider; Example Robots Strider (version Gen 2)');
  assert.ok(c.tasks.includes('Material handling'));
  const [u] = publicCases([rec(1, { task_category: 'unspecified' })]);
  assert.deepEqual(u.tasks, ['Task not specified in the sources']);
});

test('the committed public rows give one case per deployment id and every case keeps its sources', () => {
  const rows = JSON.parse(readFileSync(new URL('../../data/preview/deployments.json', import.meta.url), 'utf8')).rows;
  const cases = publicCases(rows);
  assert.equal(cases.length, new Set(rows.map((r) => r.deployment_id)).size);
  assert.equal(cases.reduce((n, c) => n + c.records, 0), rows.length);
  assert.equal(new Set(cases.map((c) => c.slug)).size, cases.length, 'slugs are unique');
  for (const c of cases) assert.ok(c.sources.length >= 1, `${c.id}: no source`);
  for (const r of rows) for (const k of Object.keys(r)) assert.ok(k === '_row' || DEPLOYMENTS_PUBLIC.includes(k), `paid field ${k} committed`);
  assert.equal(caseSlug('dep_example'), 'example', 'the dep_ prefix is dropped from the address');
});
