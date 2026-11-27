import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STANDARD_VERSION, CLAIM_COLUMNS, validateClaim, validateLedger, buildVerificationView, comparisonStatus, estimateEnergyDutyCycle, freshness, ledgerFromWorkbook } from '../src/verification/standard.js';
import { verificationForRow, verificationForEntity } from '../src/verification/snapshot.js';
import { setup, fixtureWorkbook, createTestDb, T0 } from './helpers.js';
import { runImport } from '../src/import/run.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const event = (overrides = {}) => ({
  event_id: 'ver-fx-initial', entity_id: 'example-robot', field: 'payload_unclassified_claim_kg', value: 20, unit: 'kg',
  conditions: 'OEM does not identify duration, thermal limit or arm configuration.', verification_tier: 'V1_OEM_Claim',
  source_url: 'https://example.com/robot', source_kind: 'oem_marketing', source_locator: 'Specifications, payload',
  observed_at: '2026-11-01', verified_at: '2026-11-27', recorded_at: '2026-11-27T12:00:00Z', valid_from: null, valid_to: null,
  change_type: 'initial_observation', supersedes_event_id: null, hardware_generation: 'Example Robot revision A',
  source_archive_url: null, archive_status: 'pending', evidence_summary: 'Synthetic manufacturer statement.', evidence: {}, ...overrides,
});
const ledger = (events) => ({ schema_version: STANDARD_VERSION, as_of: '2026-11-27', events });

test('verification: old ambiguous payloads stay unclassified and missing attributes stay pending', () => {
  const view = buildVerificationView('example-robot', [event()], '2026-11-27');
  assert.equal(view.metrics.payload_unclassified_claim_kg.value, 20);
  assert.equal(view.metrics.payload_sustained_bilateral_kg.value, null);
  assert.equal(view.metrics.payload_sustained_bilateral_kg.status, 'not_disclosed');
  assert.equal(view.metrics.payload_sustained_bilateral_kg.verification_tier, 'Pending_Audit');
  assert.equal(view.verification_tier, 'Pending_Audit', 'one reviewed attribute never upgrades the entire robot');
  assert.equal(view.verified_at, null);
  assert.equal(view.hrl_status.level, null);
  assert.throws(() => validateClaim(event({ field: 'payload_sustained_bilateral_kg' })), /thermal conditions/);
  assert.throws(() => validateClaim(event({ field: 'payload_peak_bilateral_kg' })), /peak bilateral/);
  assert.throws(() => validateClaim(event({ field: 'payload_single_arm_kg' })), /explicitly scoped/);
});

test('verification: exact identity is required and cannot be inferred from manufacturer, numeric ID or URL alone', () => {
  const unmatched = verificationForRow({ id: 16, Lab: 'Boston Dynamics', Robot: 'A different generation', Web: 'https://bostondynamics.com/atlas/' }, '2026-11-27');
  assert.equal(unmatched.entity_id, null);
  assert.equal(unmatched.identity_status, 'unresolved');
  assert.equal(unmatched.audit_status, 'pending_audit');
  assert.equal(verificationForEntity('not-a-catalogue-slug', '2026-11-27'), null);
});

test('verification: numeric units, calendar dates and public properties are strict', () => {
  assert.throws(() => validateClaim(event({ value: '20' })), /numeric/);
  assert.throws(() => validateClaim(event({ unit: 'lb' })), /unit/);
  assert.throws(() => validateClaim(event({ verified_at: '2026-02-30' })), /verified_at/);
  assert.throws(() => validateClaim(event({ value: NaN })), /numeric/);
  assert.throws(() => validateClaim(event({ private_notes: 'secret' })), /unsupported public/);
  assert.throws(() => validateClaim(event({ evidence: { confidential_contract: 'private' } })), /unsupported public evidence/);
  assert.throws(() => validateClaim(event({ evidence_summary: 'Contact person@example.com' })), /personal contacts/);
  for (const source_url of ['http://example.com/x', 'https://127.0.0.1/x', 'https://[::1]/x', 'https://10.0.0.1/x', 'https://example.local/x', 'https://example.com:8443/x', 'https://docs.google.com' + '/document/d/private', 'https://example.com/?token=secret']) assert.throws(() => validateClaim(event({ source_url })), /source|private links/);
});

test('verification: V2-V4 grades require attribute-scoped evidence, independence and reproducibility', () => {
  assert.throws(() => validateClaim(event({ verification_tier: 'V2_Technical_Doc', source_kind: 'patent', evidence: { measurement_scope_confirmed: true } })), /patent/);
  assert.throws(() => validateClaim(event({ verification_tier: 'V2_Technical_Doc', source_kind: 'technical_document' })), /attribute/);
  assert.throws(() => validateClaim(event({ verification_tier: 'V3_Corroborated', source_kind: 'customer_statement', evidence: { measurement_scope_confirmed: true } })), /independent/);
  assert.throws(() => validateClaim(event({ verification_tier: 'V4_Audited', source_kind: 'independent_test', evidence: { measurement_scope_confirmed: true, independent_direct_knowledge: true, independent_party: 'Example Lab' } })), /reproducible/);
  assert.equal(validateClaim(event({ verification_tier: 'V4_Audited', source_kind: 'independent_test', source_archive_url: 'https://archive.example.com/fx-1', evidence: { measurement_scope_confirmed: true, independent_direct_knowledge: true, independent_party: 'Example Lab', protocol_url: 'https://example.com/protocol', results_url: 'https://example.com/results', audit_identifier: 'Synthetic audit FX-1' } })).verification_tier, 'V4_Audited');
});

test('verification: HRL4 needs a paid operating customer pilot; an MoU or press release cannot pass', () => {
  const hrl = event({ field: 'hrl_status', value: 'HRL_4', unit: null, evidence: { functional_hardware: true, external_demonstration: true, external_site_operation: true } });
  assert.throws(() => validateClaim(hrl), /explicit paid/);
  const paid = { ...hrl, evidence: { ...hrl.evidence, paid_contract_confirmed: true, customer_confirmation: true } };
  assert.equal(validateClaim(paid).value, 'HRL_4');
  assert.throws(() => validateClaim({ ...paid, value: 'HRL_5' }), /recurring deliveries/);
  assert.throws(() => validateClaim({ ...paid, value: 'HRL_6', evidence: { ...paid.evidence, active_assembly_line: true, recurrent_external_deliveries: true, external_customers: 2, deployed_external_units: 15 } }), /continuous customer/);
});

test('verification: task success needs a denominator and environment; L3 needs exception recovery', () => {
  const success = event({ field: 'success_rate_pct', value: 95, unit: '%' });
  assert.throws(() => validateClaim(success), /sample size/);
  assert.throws(() => validateClaim({ ...success, value: 101 }), /0..100/);
  assert.equal(validateClaim({ ...success, evidence: { n_trials: 20, environment: 'lab_controlled', task_protocol: 'Synthetic pick test' } }).value, 95);
  assert.throws(() => validateClaim(event({ field: 'autonomy_level', value: 'L3_Autonomous_Exception_Handling', unit: null })), /exception recovery/);
  assert.throws(() => validateClaim(event({ field: 'mtbi_minutes', value: 60, unit: 'min', evidence: { exposure_minutes: 600, interventions: 0, task_protocol: 'Synthetic' } })), /at least one/);
  assert.equal(validateClaim(event({ field: 'mtbi_minutes', value: 60, unit: 'min', evidence: { exposure_minutes: 600, interventions: 10, task_protocol: 'Synthetic' } })).value, 60);
});

test('verification: battery self-swap is not automatically an uninterrupted autonomous hot swap', () => {
  const swap = event({ field: 'battery_swap_mechanism', value: 'autonomous_hot_swap', unit: null, evidence: { autonomous_battery_change: true } });
  assert.throws(() => validateClaim(swap), /uninterrupted power/);
  assert.equal(validateClaim({ ...swap, evidence: { ...swap.evidence, uninterrupted_power_confirmed: true } }).value, 'autonomous_hot_swap');
});

test('verification: append-only supersession preserves previous values and checks both temporal axes', () => {
  const first = event({ valid_from: '2026-11-01' });
  const correction = event({ event_id: 'ver-fx-corrected', value: 15, verified_at: '2026-11-28', recorded_at: '2026-11-28T12:00:00Z', valid_from: '2026-11-15', change_type: 'editorial_correction', supersedes_event_id: first.event_id });
  validateLedger(ledger([first, correction]));
  const beforeKnown = buildVerificationView('example-robot', [first, correction], '2026-11-20', '2026-11-27');
  assert.equal(beforeKnown.metrics.payload_unclassified_claim_kg.value, 20);
  const afterKnown = buildVerificationView('example-robot', [first, correction], '2026-11-20', '2026-11-28');
  assert.equal(afterKnown.metrics.payload_unclassified_claim_kg.value, 15);
  const beforeValid = buildVerificationView('example-robot', [first, correction], '2026-11-10', '2026-11-28');
  assert.equal(beforeValid.metrics.payload_unclassified_claim_kg.value, 20);
  assert.equal(afterKnown.changelog.length, 2);
  assert.equal(first.value, 20, 'compilation never mutates the source event');
  assert.throws(() => validateLedger(ledger([first, first])), /duplicate/);
  assert.throws(() => validateLedger(ledger([correction])), /earlier event/);
  assert.throws(() => validateLedger(ledger([first, { ...correction, hardware_generation: 'Revision B' }])), /hardware_revision/);
});

test('verification: conflicting assertions and unknown valid dates are excluded from historical assertions', () => {
  const first = event();
  const parallel = event({ event_id: 'ver-fx-parallel', value: 15 });
  const conflict = buildVerificationView('example-robot', [first, parallel], '2026-11-27');
  assert.equal(conflict.metrics.payload_unclassified_claim_kg.status, 'conflicting_evidence');
  assert.equal(conflict.metrics.payload_unclassified_claim_kg.value, null);
  const unknownEffective = buildVerificationView('example-robot', [first], '2026-11-15', '2026-11-27');
  assert.equal(unknownEffective.metrics.payload_unclassified_claim_kg.value, null, 'review date is not invented as an effective date');
});

test('verification: retractions remain in the changelog and never reappear as current capability', () => {
  const first = event();
  const retraction = event({ event_id: 'ver-fx-retracted', value: null, change_type: 'oem_retraction', supersedes_event_id: first.event_id });
  validateLedger(ledger([first, retraction]));
  const view = buildVerificationView('example-robot', [first, retraction], '2026-11-27');
  assert.equal(view.metrics.payload_unclassified_claim_kg.status, 'retracted');
  assert.equal(view.metrics.payload_unclassified_claim_kg.value, null);
  assert.equal(view.changelog.length, 2);
});

test('verification: retracted HRL values must be null and cannot remain a current maturity level', () => {
  const first = event({ field: 'hrl_status', value: 'HRL_3', unit: null, evidence: { functional_hardware: true, external_demonstration: true } });
  const invalidRetraction = { ...first, event_id: 'ver-fx-hrl-retracted', change_type: 'oem_retraction', supersedes_event_id: first.event_id };
  assert.throws(() => validateLedger(ledger([first, invalidRetraction])), /retraction value must be null/);
  const defensiveView = buildVerificationView('example-robot', [first, invalidRetraction], '2026-11-27');
  assert.equal(defensiveView.hrl_status.status, 'retracted');
  assert.equal(defensiveView.hrl_status.level, null, 'even an invalid direct projection cannot retain the withdrawn HRL');
  const retraction = { ...invalidRetraction, value: null };
  validateLedger(ledger([first, retraction]));
  assert.equal(buildVerificationView('example-robot', [first, retraction], '2026-11-27').hrl_status.level, null);
});

test('verification: freshness thresholds change visual confidence without rewriting the evidence tier', () => {
  const c = event({ verification_tier: 'V2_Technical_Doc' });
  assert.equal(freshness(c, '2027-05-26').state, 'fresh');
  assert.equal(freshness(c, '2027-05-27').state, 'review_due');
  assert.equal(freshness(c, '2027-11-27').state, 'review_due');
  const stale = freshness(c, '2027-11-28');
  assert.equal(stale.state, 'stale');
  assert.equal(stale.visual_tier, 'V1_OEM_Claim');
  assert.equal(stale.verification_tier, 'V2_Technical_Doc');
  assert.equal(c.verification_tier, 'V2_Technical_Doc');
});

test('verification: apples-to-apples comparison requires the same reviewed conditions and metric', () => {
  const a = { field: 'payload_sustained_bilateral_kg', value: 20, unit: 'kg', status: 'source_reported', verification_tier: 'V2_Technical_Doc', comparison_group: 'fx-bilateral-duty-1', freshness: { state: 'fresh' } };
  const b = { ...a, value: 15 };
  assert.equal(comparisonStatus(a, b).comparable, true);
  assert.equal(comparisonStatus(a, { ...b, field: 'payload_peak_bilateral_kg' }).comparable, false);
  assert.equal(comparisonStatus(a, { ...b, comparison_group: 'another-test' }).comparable, false);
  assert.equal(comparisonStatus(a, { ...b, verification_tier: 'V1_OEM_Claim' }).comparable, false);
  assert.equal(comparisonStatus(a, { ...b, freshness: { state: 'stale' } }).comparable, false);
  assert.equal(comparisonStatus({ ...a, comparison_group: null }, { ...b, comparison_group: null }).comparable, false);
});

test('verification: finite-shift energy estimates state assumptions and exclude unsupported charging cycles', () => {
  const c = { runtime_rated_load_hours: 4, charging_time_hours: 1, charge_from_pct: 0, charge_to_pct: 100, initial_charge_pct: 100, shift_hours: 8, conditions: 'Synthetic workload at rated load' };
  const estimate = estimateEnergyDutyCycle(c);
  assert.equal(estimate.value, 87.5, '4h work + 1h charge + 3h work in an eight-hour shift');
  assert.match(estimate.comparison_caveats[0], /not measured operational availability/);
  assert.equal(estimateEnergyDutyCycle({ ...c, charge_from_pct: 20, charge_to_pct: 80 }), null);
  assert.equal(estimateEnergyDutyCycle({ ...c, initial_charge_pct: 50 }), null);
  assert.equal(estimateEnergyDutyCycle({ ...c, battery_swap_mechanism: 'manual_swap', swap_time_minutes: 2 }), null);
  assert.ok(estimateEnergyDutyCycle({ ...c, battery_swap_mechanism: 'manual_swap', swap_time_minutes: 2, charged_spares_available: true }).value < 100);
});

const CHANGE_COLUMNS = ['event_id', 'entity_id', 'field', 'previous_event_id', 'new_event_id', 'change_type', 'recorded_at', 'reason', 'contributor', 'source_url'];
function workbookTabs(c = event()) {
  return { 'Verification Claims': [CLAIM_COLUMNS, CLAIM_COLUMNS.map((f) => f === 'value' ? JSON.stringify(c.value) : f === 'evidence_json' ? JSON.stringify(c.evidence) : c[f] ?? '')],
    'Verification Changelog': [CHANGE_COLUMNS, [c.event_id, c.entity_id, c.field, c.supersedes_event_id ?? '', c.event_id, c.change_type, c.recorded_at, 'Synthetic source review', 'Example reviewer', c.source_url]] };
}
test('verification: optional workbook ledger extensions require exact headers, typed JSON and complete event references', () => {
  assert.equal(ledgerFromWorkbook({}), null);
  assert.equal(ledgerFromWorkbook(workbookTabs()).events.length, 1);
  const bad = workbookTabs(); bad['Verification Claims'][1][3] = 'not-json';
  assert.throws(() => ledgerFromWorkbook(bad), /encoded as JSON/);
  const missing = workbookTabs(); missing['Verification Changelog'].pop();
  assert.throws(() => ledgerFromWorkbook(missing), /every claim/);
  const mismatch = workbookTabs(); mismatch['Verification Changelog'][1][9] = 'https://example.com/other';
  assert.throws(() => ledgerFromWorkbook(mismatch), /unchanged claim/);
});

test('verification: malformed workbook extensions fail before any catalogue replacement', async () => {
  const db = createTestDb();
  assert.equal((await runImport(db, fixtureWorkbook(), T0)).ok, true);
  const before = await db.prepare('SELECT data FROM premium_rows ORDER BY dataset,row_id').all();
  const bad = { ...fixtureWorkbook(), ...workbookTabs() }; bad['Verification Claims'][1][6] = 'V9_Bogus';
  const result = await runImport(db, bad, T0 + 1);
  assert.equal(result.ok, false);
  assert.match(result.error, /verification_tier/);
  assert.deepEqual(await db.prepare('SELECT data FROM premium_rows ORDER BY dataset,row_id').all(), before);
});

test('verification: public HTTP metadata is attribute-scoped, keeps legacy row shape and leaves premium boundaries unchanged', async () => {
  const ctx = await setup();
  const description = await ctx.call('GET', '/v1/verification');
  assert.equal(description.status, 200);
  assert.equal((await description.json()).standard_version, STANDARD_VERSION);
  const rows = await (await ctx.call('GET', '/v1/datasets/humanoids?limit=1')).json();
  assert.equal(rows.verification.standard_version, STANDARD_VERSION);
  assert.equal(rows.verification.by_row_id[rows.rows[0].id].verification_tier, 'Pending_Audit');
  assert.equal(rows.rows[0].verification, undefined, 'existing catalogue values and fields remain compatible');
  for (const id of ['deployments', 'hardware']) {
    const response = await (await ctx.call('GET', `/v1/datasets/${id}/preview`)).json();
    assert.equal(response.verification, undefined, 'no paid evidence leaks through the public verification extension');
  }
  assert.equal((await ctx.call('GET', '/v1/verification?entity=not-real')).status, 404);
  assert.equal((await ctx.call('GET', '/v1/verification?entity=example&known_at=2026-02-30')).status, 400);
});

test('verification: existing MCP tools return metadata without adding a write tool or changing the paid field boundary', async () => {
  const ctx = await setup();
  const fetchImpl = async (url, init = {}) => ctx.call(init.method ?? 'GET', new URL(url).pathname, { body: init.body, headers: Object.fromEntries(new Headers(init.headers).entries()) });
  const client = new Client({ name: 'verification-test', version: '1' });
  await client.connect(new StreamableHTTPClientTransport(new URL('https://api.test/mcp'), { fetch: fetchImpl }));
  try {
    const tools = (await client.listTools()).tools;
    assert.equal(tools.length, 6);
    assert.ok(tools.every((t) => t.annotations?.readOnlyHint));
    const result = JSON.parse((await client.callTool({ name: 'get_rows', arguments: { table: 'humanoids', limit: 1 } })).content[0].text);
    assert.equal(result.verification.standard_version, STANDARD_VERSION);
    assert.equal(result.verification.by_row_id[result.rows[0].id].verification_tier, 'Pending_Audit');
    const categories = JSON.parse((await client.callTool({ name: 'list_categories', arguments: {} })).content[0].text);
    assert.equal(categories.verification_standard.default_status, 'Pending_Audit');
  } finally { await client.close(); }
});
