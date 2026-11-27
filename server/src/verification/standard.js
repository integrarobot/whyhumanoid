// Why Humanoid? Verification Standard 1.0.0. All decisions are attribute-scoped.
// No string extraction, manufacturer-name heuristics or inherited verification grades.
export const STANDARD_VERSION = '1.0.0';
export const VERIFICATION_TIERS = Object.freeze(['Pending_Audit', 'V0_Unverified', 'V1_OEM_Claim', 'V2_Technical_Doc', 'V3_Corroborated', 'V4_Audited']);
export const HRL_LABELS = Object.freeze({ HRL_1: 'Concept or announcement', HRL_2: 'Laboratory prototype', HRL_3: 'Controlled external demonstration', HRL_4: 'Paid commercial pilot', HRL_5: 'Limited serial production', HRL_6: 'Commercial operation at scale' });
export const METRIC_FIELDS = Object.freeze([
  'payload_sustained_bilateral_kg', 'payload_peak_bilateral_kg', 'payload_single_arm_kg', 'payload_unclassified_claim_kg', 'payload_test_conditions',
  'runtime_idle_hours', 'runtime_rated_load_hours', 'runtime_unclassified_claim_hours', 'charging_time_hours', 'battery_swap_mechanism', 'swap_time_minutes',
  'autonomy_level', 'success_rate_pct', 'n_trials', 'task_environment', 'mtbi_minutes', 'human_speed_ratio', 'video_speed_multiplier',
]);
export const CLAIM_FIELDS = Object.freeze([...METRIC_FIELDS, 'hrl_status']);
export const CLAIM_COLUMNS = Object.freeze(['event_id', 'entity_id', 'field', 'value', 'unit', 'conditions', 'verification_tier', 'source_url', 'source_kind', 'source_locator', 'observed_at', 'verified_at', 'recorded_at', 'valid_from', 'valid_to', 'change_type', 'supersedes_event_id', 'hardware_generation', 'source_archive_url', 'archive_status', 'evidence_summary', 'evidence_json']);
const ENUMS = Object.freeze({
  battery_swap_mechanism: ['none', 'manual_swap', 'autonomous_hot_swap'],
  autonomy_level: ['L0_Teleoperated', 'L1_Scripted', 'L2_Supervised_Autonomous', 'L3_Autonomous_Exception_Handling'],
  task_environment: ['lab_controlled', 'staging_cell', 'live_production'],
  hrl_status: ['HRL_1', 'HRL_2', 'HRL_3', 'HRL_4', 'HRL_5', 'HRL_6'],
});
const CHANGES = ['initial_observation', 'hardware_revision', 'status_progression', 'oem_retraction', 'editorial_correction', 'reverification'];
const SOURCE_KINDS = ['oem_marketing', 'technical_document', 'regulatory_filing', 'customer_statement', 'integrator_statement', 'independent_test', 'peer_reviewed_paper', 'patent', 'secondary_report'];
const PUBLIC_CLAIM_KEYS = new Set([...CLAIM_COLUMNS.filter((k) => k !== 'evidence_json'), 'evidence']);
const PUBLIC_EVIDENCE_KEYS = new Set(['measurement_scope_confirmed', 'independent_direct_knowledge', 'independent_party', 'protocol_url', 'results_url', 'audit_identifier', 'n_trials', 'environment', 'task_protocol', 'sustained_bilateral', 'duty_cycle', 'thermal_conditions', 'load_pct', 'charge_from_pct', 'charge_to_pct', 'human_baseline', 'video_speed_multiplier', 'functional_hardware', 'external_demonstration', 'external_site_operation', 'paid_contract_confirmed', 'customer_confirmation', 'active_assembly_line', 'recurrent_external_deliveries', 'external_customers', 'deployed_external_units', 'continuous_customer_operation', 'customer_operated', 'process_integration', 'no_resident_oem_team', 'standardised_support', 'comparison_group', 'peak_bilateral', 'single_arm_explicit', 'exposure_minutes', 'interventions', 'exception_recovery_demonstrated', 'autonomous_battery_change', 'uninterrupted_power_confirmed']);
const UNITS = { payload_sustained_bilateral_kg: 'kg', payload_peak_bilateral_kg: 'kg', payload_single_arm_kg: 'kg', payload_unclassified_claim_kg: 'kg', runtime_idle_hours: 'h', runtime_rated_load_hours: 'h', runtime_unclassified_claim_hours: 'h', charging_time_hours: 'h', swap_time_minutes: 'min', success_rate_pct: '%', n_trials: 'trials', mtbi_minutes: 'min', human_speed_ratio: 'ratio', video_speed_multiplier: 'x' };
const DAY = 86400000;
export const tierNumber = (tier) => /^V[0-4]_/.test(tier ?? '') ? Number(tier[1]) : -1;
const fail = (reason) => { throw new TypeError(`Invalid verification claim: ${reason}`); };
const dateMs = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/.test(value)) return NaN;
  const t = Date.parse(value);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === value.slice(0, 10) ? t : NaN;
};
const safeUrl = (s) => { try { const u = new URL(s); return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && !/^(?:\d{1,3}\.){3}\d{1,3}$|[\[\]:]|^localhost$|(?:\.localhost|\.local|\.internal)$/i.test(u.hostname) && u.hostname.includes('.') && !/^(?:docs|drive)\.google\.com$/i.test(u.hostname) && ![...u.searchParams.keys()].some((k) => /^(?:token|api[_-]?key|secret|password|authorization)$/i.test(k)); } catch { return false; } };
const useful = (s) => typeof s === 'string' && s.trim().length > 0 && !/^(?:not[_ ]disclosed|unknown|n\/?a)$/i.test(s.trim());
function publicOnly(value) {
  if (typeof value === 'string' && /(?:https?:\/\/(?:docs|drive)\.google\.com|mailto:|file:\/\/|\/Users\/|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i.test(value)) fail('private links, local paths and personal contacts are not public evidence');
  if (value && typeof value === 'object') for (const v of Object.values(value)) publicOnly(v);
}

export function validateClaim(claim) {
  if (!claim || typeof claim !== 'object' || Array.isArray(claim)) fail('expected object');
  if (Object.keys(claim).some((k) => !PUBLIC_CLAIM_KEYS.has(k))) fail('unsupported public claim property');
  if (claim.evidence != null && (typeof claim.evidence !== 'object' || Array.isArray(claim.evidence) || Object.keys(claim.evidence).some((k) => !PUBLIC_EVIDENCE_KEYS.has(k)))) fail('unsupported public evidence property');
  if (claim.evidence && Object.values(claim.evidence).some((v) => v !== null && !['string', 'number', 'boolean'].includes(typeof v))) fail('evidence values must be public scalars');
  for (const key of PUBLIC_CLAIM_KEYS) if (!['value', 'evidence'].includes(key) && claim[key] != null && typeof claim[key] !== 'string') fail(`${key} must be a string or null`);
  publicOnly(claim);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,179}$/.test(claim.event_id ?? '')) fail('event_id');
  if (!/^[a-z0-9][a-z0-9-]{0,179}$/.test(claim.entity_id ?? '')) fail('entity_id must be a canonical public slug');
  if (!CLAIM_FIELDS.includes(claim.field)) fail('unsupported field');
  if (!VERIFICATION_TIERS.includes(claim.verification_tier)) fail('verification_tier');
  if (!CHANGES.includes(claim.change_type)) fail('change_type');
  if (!Number.isFinite(dateMs(claim.recorded_at))) fail('recorded_at');
  for (const f of ['observed_at', 'verified_at', 'valid_from', 'valid_to']) if (claim[f] != null && !Number.isFinite(dateMs(claim[f]))) fail(f);
  if (claim.verified_at && claim.verified_at.slice(0, 10) > claim.recorded_at.slice(0, 10)) fail('verification cannot postdate recording');
  if (claim.observed_at && claim.verified_at && claim.observed_at.slice(0, 10) > claim.verified_at.slice(0, 10)) fail('observation cannot postdate verification');
  if (claim.valid_from && claim.valid_to && dateMs(claim.valid_to) <= dateMs(claim.valid_from)) fail('valid interval is half-open and must be positive');
  if (claim.change_type === 'oem_retraction' && !claim.supersedes_event_id) fail('retraction requires superseded event');
  if (claim.change_type === 'oem_retraction' && claim.value !== null) fail('retraction value must be null');
  const tier = tierNumber(claim.verification_tier);
  if (tier >= 1 && (!safeUrl(claim.source_url) || !useful(claim.source_locator) || !claim.verified_at || !useful(claim.hardware_generation))) fail('V1+ requires source URL, locator, review date and exact hardware generation');
  if (claim.source_url != null && !safeUrl(claim.source_url)) fail('public HTTPS source URL required');
  if (claim.source_archive_url != null && !safeUrl(claim.source_archive_url)) fail('public HTTPS archive URL required');
  if (tier >= 0 && !SOURCE_KINDS.includes(claim.source_kind)) fail('source_kind');
  if (tier === 1 && !['oem_marketing', 'technical_document', 'regulatory_filing'].includes(claim.source_kind)) fail('V1 requires an attributable manufacturer claim');
  const retracted = claim.change_type === 'oem_retraction' && claim.value == null;
  if (claim.value == null && !retracted && tier >= 0) fail('missing value cannot carry a verification tier');
  if (!retracted && claim.value != null) {
    if (!UNITS[claim.field] && !ENUMS[claim.field] && typeof claim.value !== 'string') fail('text attribute requires string value');
    if (ENUMS[claim.field] && !ENUMS[claim.field].includes(claim.value)) fail(`${claim.field} vocabulary`);
    if (UNITS[claim.field]) {
      if (typeof claim.value !== 'number' || !Number.isFinite(claim.value) || claim.value < 0) fail('finite non-negative numeric value required');
      if (claim.unit !== UNITS[claim.field]) fail(`${claim.field} unit must be ${UNITS[claim.field]}`);
      if (claim.field === 'success_rate_pct' && claim.value > 100) fail('success rate must be 0..100');
      if (claim.field === 'n_trials' && (!Number.isInteger(claim.value) || claim.value < 1)) fail('n_trials must be a positive integer');
      if (['video_speed_multiplier', 'human_speed_ratio', 'runtime_rated_load_hours', 'runtime_idle_hours', 'charging_time_hours'].includes(claim.field) && claim.value <= 0) fail('positive value required');
    }
  }
  if (claim.value == null && tier < 0) return claim;
  const e = claim.evidence ?? {};
  if (tier >= 1 && !useful(claim.conditions)) fail('conditions must state known conditions or explicitly identify the gap');
  if (tier >= 2 && (!['technical_document', 'regulatory_filing', 'customer_statement', 'integrator_statement', 'independent_test', 'peer_reviewed_paper'].includes(claim.source_kind) || e.measurement_scope_confirmed !== true)) fail('V2+ requires evidence scoped to this attribute; a patent or generic certificate is not a performance test');
  if (tier >= 3 && (e.independent_direct_knowledge !== true || !useful(e.independent_party))) fail('V3+ requires an identified independent party with direct knowledge');
  if (tier >= 4 && (!safeUrl(e.protocol_url) || !safeUrl(e.results_url) || !useful(e.audit_identifier) || !claim.source_archive_url)) fail('V4 requires reproducible protocol, results, audit identifier and preserved public evidence');
  if (!retracted && claim.field === 'success_rate_pct' && (!Number.isInteger(e.n_trials) || e.n_trials < 1 || !ENUMS.task_environment.includes(e.environment) || !useful(e.task_protocol))) fail('success rate requires sample size, environment and task protocol in the same claim');
  if (!retracted && claim.field === 'payload_sustained_bilateral_kg' && (e.sustained_bilateral !== true || !useful(e.duty_cycle) || !useful(e.thermal_conditions))) fail('sustained payload requires explicit bilateral, duty-cycle and thermal conditions');
  if (!retracted && claim.field === 'payload_peak_bilateral_kg' && e.peak_bilateral !== true) fail('peak payload requires an explicit peak bilateral specification; lift alone is unclassified');
  if (!retracted && claim.field === 'payload_single_arm_kg' && e.single_arm_explicit !== true) fail('single-arm payload must be explicitly scoped to one arm');
  if (!retracted && claim.field === 'runtime_rated_load_hours' && (!Number.isFinite(e.load_pct) || e.load_pct <= 0 || e.load_pct > 100 || !useful(e.task_protocol))) fail('loaded runtime requires load percentage and task protocol');
  if (!retracted && claim.field === 'charging_time_hours' && (!Number.isFinite(e.charge_from_pct) || !Number.isFinite(e.charge_to_pct) || e.charge_from_pct < 0 || e.charge_to_pct > 100 || e.charge_to_pct <= e.charge_from_pct)) fail('charging requires state-of-charge interval');
  if (!retracted && claim.field === 'human_speed_ratio' && (!useful(e.human_baseline) || !useful(e.task_protocol) || !Number.isFinite(e.video_speed_multiplier) || e.video_speed_multiplier <= 0)) fail('human speed ratio requires baseline, protocol and video multiplier');
  if (!retracted && claim.field === 'mtbi_minutes' && (!(e.exposure_minutes > 0) || !Number.isInteger(e.interventions) || e.interventions < 1 || Math.abs(claim.value - e.exposure_minutes / e.interventions) > 0.01 || !useful(e.task_protocol))) fail('MTBI requires exposure time and at least one intervention; zero interventions is a lower bound, not an infinite MTBI');
  if (!retracted && claim.field === 'autonomy_level' && claim.value === 'L3_Autonomous_Exception_Handling' && e.exception_recovery_demonstrated !== true) fail('L3 requires documented autonomous exception recovery');
  if (!retracted && claim.field === 'battery_swap_mechanism' && claim.value === 'autonomous_hot_swap' && (e.autonomous_battery_change !== true || e.uninterrupted_power_confirmed !== true)) fail('autonomous hot swap requires autonomous change and uninterrupted power; a self-swap alone is insufficient');
  if (!retracted && claim.field === 'hrl_status') validateHrl(claim.value, e);
  return claim;
}

function validateHrl(level, e) {
  const n = Number(level.slice(-1));
  if (n >= 2 && e.functional_hardware !== true) fail('HRL2+ requires functional physical hardware');
  if (n >= 3 && e.external_demonstration !== true) fail('HRL3+ requires documented external hardware demonstration');
  if (n >= 4 && (e.external_site_operation !== true || e.paid_contract_confirmed !== true || e.customer_confirmation !== true)) fail('HRL4+ requires operation, explicit paid relationship and customer confirmation; MoU is insufficient');
  if (n >= 5 && (e.active_assembly_line !== true || e.recurrent_external_deliveries !== true || !(e.external_customers >= 2) || !(e.deployed_external_units >= 11))) fail('HRL5+ requires active assembly and recurring deliveries to multiple customers');
  if (n >= 6 && (e.continuous_customer_operation !== true || e.customer_operated !== true || e.process_integration !== true || e.no_resident_oem_team !== true || e.standardised_support !== true)) fail('HRL6 requires continuous customer operation and standardised independent operation/support');
}

export function validateLedger(ledger) {
  if (!ledger || ledger.schema_version !== STANDARD_VERSION || !Array.isArray(ledger.events)) throw new TypeError('Invalid verification ledger schema');
  if (Object.keys(ledger).some((k) => !['schema_version', 'as_of', 'events'].includes(k))) throw new TypeError('Unsupported public verification ledger property');
  if (ledger.as_of != null && !Number.isFinite(dateMs(ledger.as_of))) throw new TypeError('Invalid verification ledger as_of');
  const seen = new Map();
  for (const claim of ledger.events) {
    validateClaim(claim);
    if (seen.has(claim.event_id)) fail(`duplicate event_id ${claim.event_id}`);
    if (claim.supersedes_event_id) {
      const previous = seen.get(claim.supersedes_event_id);
      if (!previous || previous.entity_id !== claim.entity_id || previous.field !== claim.field) fail('supersedes must reference an earlier event for the same entity and attribute');
      if (dateMs(previous.recorded_at) > dateMs(claim.recorded_at)) fail('superseding event predates the earlier record');
      if (previous.hardware_generation !== claim.hardware_generation && claim.change_type !== 'hardware_revision') fail('hardware changes require hardware_revision');
    }
    seen.set(claim.event_id, claim);
  }
  return ledger;
}

export function freshness(claim, asOf = new Date().toISOString().slice(0, 10)) {
  const original = claim?.verification_tier ?? 'Pending_Audit';
  if (!claim?.verified_at || !Number.isFinite(dateMs(asOf))) return { state: 'not_reviewed', age_days: null, verification_tier: original, visual_tier: original };
  const age = Math.max(0, Math.floor((dateMs(asOf) - dateMs(claim.verified_at)) / DAY));
  const n = tierNumber(original);
  return { state: age <= 180 ? 'fresh' : age <= 365 ? 'review_due' : 'stale', age_days: age, verification_tier: original, visual_tier: age > 365 && n > 0 ? VERIFICATION_TIERS[n] : original };
}

const emptyMetric = (field) => ({ field, value: null, unit: UNITS[field] ?? null, status: 'not_disclosed', verification_tier: 'Pending_Audit', verified_at: null, observed_at: null, source_url: null, source_archive_url: null, conditions: null, freshness: { state: 'not_reviewed', age_days: null, verification_tier: 'Pending_Audit', visual_tier: 'Pending_Audit' } });
export const COMPARISON_CAVEATS = Object.freeze([
  'Do not compare peak, single-arm or unclassified payload directly with sustained bilateral payload.',
  'Only sustained bilateral payload is eligible for the default payload comparison; undisclosed values are excluded.',
  'Runtime requires the same workload and charging interval; a battery figure alone is not shift availability.',
  'Success rates require the same task, environment, autonomy level, protocol and sample-size context.',
  'A grade describes one source-backed attribute, never the entire robot. Missing evidence is not evidence of absence.',
]);

// validAt selects the hardware/specification interval; knownAt selects what the ledger knew then.
// Unknown effective dates stay explicitly unknown and are never invented from a review date.
export function buildVerificationView(entityId, events = [], validAt = new Date().toISOString().slice(0, 10), knownAt = validAt) {
  if (!Number.isFinite(dateMs(validAt)) || !Number.isFinite(dateMs(knownAt))) throw new TypeError('Invalid bitemporal query dates');
  const cutoff = (v) => dateMs(v) + (v.length === 10 ? DAY - 1 : 0);
  const knownTime = cutoff(knownAt);
  const validTime = cutoff(validAt);
  const relevant = events.filter((e) => e.entity_id === entityId && dateMs(e.recorded_at) <= knownTime);
  const applicable = relevant.filter((e) => (e.valid_from ? dateMs(e.valid_from) <= validTime : validAt === knownAt) && (!e.valid_to || dateMs(e.valid_to) > validTime));
  const superseded = new Set(applicable.map((e) => e.supersedes_event_id).filter(Boolean));
  const current = new Map();
  for (const e of applicable) if (!superseded.has(e.event_id)) {
    // Parallel claims without explicit supersession are a visible conflict, not an implicit overwrite.
    const existing = current.get(e.field);
    current.set(e.field, existing ? [...(Array.isArray(existing) ? existing : [existing]), e] : e);
  }
  const metrics = Object.fromEntries(METRIC_FIELDS.map((field) => [field, emptyMetric(field)]));
  let hrl = { level: null, label: 'Not established', ...emptyMetric('hrl_status') };
  const conflicts = [];
  for (const [field, claim] of current) {
    if (Array.isArray(claim)) {
      conflicts.push(field);
      const value = { ...emptyMetric(field), status: 'conflicting_evidence', conflicting_event_ids: claim.map((c) => c.event_id) };
      if (field === 'hrl_status') hrl = { level: null, label: 'Not established', ...value }; else metrics[field] = value;
      continue;
    }
    const { entity_id: _entity, field: _field, ...value } = claim;
    const metric = { ...emptyMetric(field), ...value, comparison_group: claim.evidence?.comparison_group ?? null, effective_date_known: Boolean(claim.valid_from), status: claim.change_type === 'oem_retraction' ? 'retracted' : 'source_reported', freshness: freshness(claim, knownAt) };
    if (field === 'hrl_status') {
      const level = metric.status === 'source_reported' ? claim.value : null;
      hrl = { ...metric, level, label: HRL_LABELS[level] ?? 'Not established' };
    } else metrics[field] = metric;
  }
  return {
    standard_version: STANDARD_VERSION, entity_id: entityId, audit_status: relevant.length ? 'attribute_reviewed' : 'pending_audit',
    verification_tier: 'Pending_Audit', verified_at: null, metrics, hrl_status: hrl,
    comparison_caveats: [...COMPARISON_CAVEATS, ...(conflicts.length ? [`Unresolved parallel claims: ${conflicts.join(', ')}. Excluded from comparisons.`] : [])],
    changelog: relevant.map((e) => ({ ...e, current: applicable.some((a) => a.event_id === e.event_id) && !superseded.has(e.event_id) })),
    as_of: validAt, known_at: knownAt,
  };
}

export function comparisonStatus(a, b, { minimumTier = 2 } = {}) {
  const reasons = [];
  if (!a || !b || a.value == null || b.value == null || a.status !== 'source_reported' || b.status !== 'source_reported') reasons.push('Missing, retracted or conflicting value');
  if (a?.field !== b?.field || a?.unit !== b?.unit) reasons.push('Metric or unit differs');
  if (['payload_peak_bilateral_kg', 'payload_single_arm_kg', 'payload_unclassified_claim_kg'].includes(a?.field)) reasons.push('Not sustained bilateral payload');
  if (tierNumber(a?.verification_tier) < minimumTier || tierNumber(b?.verification_tier) < minimumTier) reasons.push(`Both attributes require V${minimumTier}+ evidence`);
  if (a?.freshness?.state === 'stale' || b?.freshness?.state === 'stale') reasons.push('Stale evidence needs re-verification');
  if (!useful(a?.comparison_group) || a.comparison_group !== b?.comparison_group) reasons.push('Matching reviewed test conditions are not established');
  return { comparable: reasons.length === 0, reasons };
}

export function estimateEnergyDutyCycle(input) {
  const runtime = input?.runtime_rated_load_hours;
  const shift = input?.shift_hours ?? 8;
  if (!(runtime > 0) || !(shift > 0) || !Number.isFinite(runtime) || !Number.isFinite(shift) || !useful(input?.conditions) || input?.initial_charge_pct !== 100) return null;
  let downtime;
  let method;
  if (['manual_swap', 'autonomous_hot_swap'].includes(input.battery_swap_mechanism)) {
    if (!(input.swap_time_minutes >= 0) || !Number.isFinite(input.swap_time_minutes) || input.charged_spares_available !== true) return null;
    downtime = input.swap_time_minutes / 60; method = 'battery_swap';
  } else {
    if (!(input.charging_time_hours > 0) || !Number.isFinite(input.charging_time_hours) || input.charge_from_pct !== 0 || input.charge_to_pct !== 100) return null;
    downtime = input.charging_time_hours; method = 'recharge';
  }
  const cycle = runtime + downtime;
  const whole = Math.floor(shift / cycle);
  const work = whole * runtime + Math.min(runtime, shift - whole * cycle);
  return { metric: 'estimated_energy_duty_cycle_pct', value: Math.round(10000 * work / shift) / 100, unit: '%', shift_hours: shift, method, conditions: input.conditions,
    assumptions: ['Starts with a fully charged battery', 'Loaded runtime and recharge/swap conditions remain constant', 'Charged spare batteries remain available when swapping', 'Excludes failures, interventions, maintenance, breaks and process delays'],
    comparison_caveats: ['An energy-only estimate, not measured operational availability or ROI.'] };
}

// Optional workbook extension. Existing workbooks remain valid; malformed extensions fail instead of being ignored.
export function ledgerFromWorkbook(valuesByTab) {
  const rows = valuesByTab['Verification Claims'];
  const history = valuesByTab['Verification Changelog'];
  if (!rows && !history) return null;
  if (!rows || !history) throw new TypeError('Verification Claims and Verification Changelog must be supplied together');
  const parse = (tab, title) => {
    if (!Array.isArray(tab) || !Array.isArray(tab[0]) || JSON.stringify(tab[0]) !== JSON.stringify(CLAIM_COLUMNS)) throw new TypeError(`${title}: verification header mismatch`);
    return tab.slice(1).filter((r) => r.some((v) => v !== '' && v != null)).map((row) => {
      const c = Object.fromEntries(CLAIM_COLUMNS.map((f, i) => [f, row[i] === '' || row[i] == null ? null : row[i]]));
      if (typeof c.value === 'string') { try { c.value = JSON.parse(c.value); } catch { throw new TypeError(`${title}: value must be encoded as JSON`); } }
      try { c.evidence = c.evidence_json == null ? {} : typeof c.evidence_json === 'string' ? JSON.parse(c.evidence_json) : c.evidence_json; } catch { throw new TypeError(`${title}: malformed evidence_json`); }
      delete c.evidence_json;
      return c;
    });
  };
  const events = parse(rows, 'Verification Claims');
  validateLedger({ schema_version: STANDARD_VERSION, events });
  const logHeaders = ['event_id', 'entity_id', 'field', 'previous_event_id', 'new_event_id', 'change_type', 'recorded_at', 'reason', 'contributor', 'source_url'];
  if (!Array.isArray(history) || JSON.stringify(history[0]) !== JSON.stringify(logHeaders)) throw new TypeError('Verification Changelog: header mismatch');
  const byId = new Map(events.map((e) => [e.event_id, e]));
  const logged = new Set();
  const logIds = new Set();
  for (const row of history.slice(1).filter((r) => r.some((v) => v !== '' && v != null))) {
    const c = Object.fromEntries(logHeaders.map((f, i) => [f, row[i] === '' || row[i] == null ? null : row[i]]));
    const claim = byId.get(c.new_event_id);
    if (!claim || claim.entity_id !== c.entity_id || claim.field !== c.field || claim.change_type !== c.change_type || claim.recorded_at !== c.recorded_at || (claim.supersedes_event_id ?? null) !== c.previous_event_id || claim.source_url !== c.source_url) throw new TypeError('Verification Changelog must reference the unchanged claim event');
    if (!useful(c.event_id) || logIds.has(c.event_id) || logged.has(c.new_event_id) || !useful(c.reason) || !useful(c.contributor)) throw new TypeError('Verification Changelog requires unique log/event IDs, reason and contributor');
    logged.add(c.new_event_id); logIds.add(c.event_id);
  }
  if (logged.size !== events.length) throw new TypeError('Verification Changelog must reference every claim exactly once');
  return { schema_version: STANDARD_VERSION, events };
}
