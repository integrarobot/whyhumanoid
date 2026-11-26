// Deployment-evidence query (x402 pay-per-query, 24 Nov 2026). Reads the same authoritative rows subscribers get
// (premium_rows, dataset 'deployments', imported from the master workbook) and returns a bounded, sourced answer:
// which deployment cases match, and the evidence records behind each, with their claims, status, evidence level,
// dates, sources and open questions as the sheet states them. Nothing is summarised, scored or merged.
//
// Bounds: at most MAX_CASES cases and MAX_RECORDS records per answer; every text filter is short. The query is
// validated BEFORE any payment is asked for, so a malformed request never costs anything.
//
// Field allowlist (EVIDENCE_FIELDS): the public summary of each record plus its evidence (claim, evidence level,
// confidence, observation dates, metric, source role and type, open questions). It deliberately leaves out the
// operational detail of the subscription (site name, city, region, workflow, integration dependencies, task
// description, relationship and commercial status). Changing this list is a product decision (Javier).

import { caseSlug } from '../public/cases.js';

export const MAX_CASES = 10;
export const DEFAULT_CASES = 5;
export const MAX_RECORDS = 50;
export const MAX_RECORDS_PER_CASE = 20;
const MAX_TEXT = 80;

export const FILTERS = Object.freeze({
  robot: 'Robot maker or model as recorded (for example "Agility", "Digit", "Figure 02"). Matches manufacturer, model and version.',
  organization: 'Organisation named in the record (customer, operator or partner), for example "GXO".',
  country: 'Country of the deployment as recorded, for example "United States".',
  sector: 'Sector as recorded, for example "logistics" or "automotive".',
  task: 'Task category as recorded, for example "material handling".',
  status: 'Operational status as recorded, for example "pilot", "production" or "announced".',
  case: 'One deployment case, by its Why Humanoid? address slug (for example "agility-digit-gxo-spanx").',
});

export const EVIDENCE_FIELDS = Object.freeze([
  'record_id', 'deployment_id', 'organization_name', 'organization_role', 'organization_country', 'manufacturer',
  'robot_model', 'robot_version', 'sector', 'country', 'task_category', 'operational_status', 'verification_status',
  'claim_id', 'claim_type', 'claim_text', 'evidence_level', 'confidence', 'observed_start', 'observed_end',
  'metric_name', 'metric_operator', 'metric_value', 'metric_unit', 'metric_period', 'source_title', 'source_url',
  'source_publisher', 'source_role', 'source_type', 'publication_date', 'accessed_at', 'open_questions_notes',
]);

export const CAVEATS = Object.freeze([
  'Each record is a claim as its source states it, not an independently verified fact.',
  'Evidence level, confidence and verification status are assessments recorded in the Why Humanoid? catalogue.',
  'Pilots, proofs of concept and announcements are not production deployments; read the operational status of each record.',
  'Records of the same case may come from different sources with different dates and figures; they are not merged.',
]);

const nz = (v) => v !== null && v !== undefined && String(v).trim() !== '';
const norm = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export class QueryError extends Error {
  constructor(code, detail) { super(code); this.code = code; this.detail = detail; }
}

// Validates and normalises the query string. Unknown parameters are refused, so a client never believes a filter was
// applied when it was not. Returns { filters, limit, key } where key identifies the query for retry safety.
export function parseQuery(searchParams) {
  const filters = {};
  for (const [k, v] of searchParams) {
    if (k === 'limit') continue;
    if (!Object.hasOwn(FILTERS, k)) throw new QueryError('unknown_parameter', `Unknown parameter "${k.slice(0, 40)}". Allowed: ${[...Object.keys(FILTERS), 'limit'].join(', ')}.`);
    if (Object.hasOwn(filters, k)) throw new QueryError('repeated_parameter', `Parameter "${k}" is given more than once.`);
    const value = String(v).trim();
    if (!value) throw new QueryError('empty_parameter', `Parameter "${k}" is empty.`);
    if (value.length > MAX_TEXT || /[\u0000-\u001f]/.test(value)) throw new QueryError('invalid_parameter', `Parameter "${k}" must be plain text of at most ${MAX_TEXT} characters.`);
    filters[k] = value;
  }
  let limit = DEFAULT_CASES;
  if (searchParams.has('limit')) {
    const raw = searchParams.get('limit');
    if (!/^\d{1,2}$/.test(raw ?? '') || Number(raw) < 1 || Number(raw) > MAX_CASES) throw new QueryError('invalid_limit', `limit must be an integer from 1 to ${MAX_CASES}.`);
    limit = Number(raw);
  }
  const key = JSON.stringify([Object.keys(filters).sort().map((k) => [k, norm(filters[k])]), limit]);
  return { filters, limit, key };
}

// Whole words only: "Digit" matches "Digit 5", "H1" does not match "H10".
const has = (hay, needle) => ` ${norm(hay)} `.includes(` ${norm(needle)} `);

function matches(d, f) {
  if (f.robot && !has([d.manufacturer, d.robot_model, d.robot_version].join(' '), f.robot)) return false;
  if (f.organization && !has(d.organization_name, f.organization)) return false;
  if (f.country && !has(d.country, f.country)) return false;
  if (f.sector && !has(d.sector, f.sector)) return false;
  if (f.task && !has(d.task_category, f.task)) return false;
  if (f.status && !has(d.operational_status, f.status)) return false;
  if (f.case && caseSlug(d.deployment_id ?? d.record_id) !== norm(f.case).replace(/ /g, '-')) return false;
  return true;
}

const pick = (d) => Object.fromEntries(EVIDENCE_FIELDS.map((k) => [k, nz(d[k]) ? d[k] : null]));

function record(d) {
  const r = pick(d);
  return {
    record_id: r.record_id,
    claim: { id: r.claim_id, type: r.claim_type, text: r.claim_text },
    operational_status: r.operational_status,
    verification_status: r.verification_status,
    evidence_level: r.evidence_level,
    confidence: r.confidence,
    observed: { start: r.observed_start, end: r.observed_end },
    metric: r.metric_name ? { name: r.metric_name, operator: r.metric_operator, value: r.metric_value, unit: r.metric_unit, period: r.metric_period } : null,
    source: { title: r.source_title, url: r.source_url, publisher: r.source_publisher, role: r.source_role, type: r.source_type, publication_date: r.publication_date, accessed_at: r.accessed_at },
    open_questions: r.open_questions_notes,
  };
}

// Runs the query over the imported rows. The newest evidence first (publication date as recorded).
export async function queryEvidence(db, { filters, limit }, { siteOrigin = 'https://whyhumanoid.com' } = {}) {
  const rows = (await db.prepare("SELECT data FROM premium_rows WHERE dataset = 'deployments' AND visibility = 'customer' ORDER BY position").all()).results.map((r) => JSON.parse(r.data));
  const imported = await db.prepare("SELECT MAX(finished_at) AS t FROM import_runs WHERE status = 'succeeded'").first();
  const byCase = new Map();
  for (const d of rows.filter((x) => matches(x, filters))) {
    const id = d.deployment_id ?? d.record_id;
    if (!byCase.has(id)) byCase.set(id, []);
    byCase.get(id).push(d);
  }
  const latest = (list) => list.map((d) => String(d.publication_date ?? '')).sort().at(-1) ?? '';
  const cases = [...byCase.entries()].sort((a, b) => latest(b[1]).localeCompare(latest(a[1])) || String(a[0]).localeCompare(String(b[0])));
  let budget = MAX_RECORDS;
  const results = [];
  let truncatedRecords = false;
  for (const [id, list] of cases.slice(0, limit)) {
    const sorted = [...list].sort((a, b) => String(b.publication_date ?? '').localeCompare(String(a.publication_date ?? '')));
    const take = Math.min(sorted.length, MAX_RECORDS_PER_CASE, budget);
    if (take < sorted.length) truncatedRecords = true;
    if (take <= 0) break;
    budget -= take;
    const first = pick(sorted[0]);
    results.push({
      deployment_id: id,
      case_url: `${siteOrigin}/deployments/${caseSlug(id)}/`,
      organization: { name: first.organization_name, role: first.organization_role, country: first.organization_country },
      robot: { manufacturer: first.manufacturer, model: first.robot_model, version: first.robot_version },
      sector: first.sector,
      country: first.country,
      task_category: first.task_category,
      records_in_case: list.length,
      records: sorted.slice(0, take).map(record),
    });
  }
  return {
    query: { ...filters, limit },
    cases_matched: cases.length,
    cases_returned: results.length,
    truncated: cases.length > results.length || truncatedRecords,
    results,
    caveats: CAVEATS,
    source: { dataset: 'Deployments', publisher: 'Why Humanoid? (Integrarobot)', url: `${siteOrigin}/deployments/`, imported_at: imported?.t ? new Date(imported.t * 1000).toISOString() : null },
  };
}

// ---- Discovery: input and output schemas for the Bazaar extension and the free description endpoint.
export const INPUT_EXAMPLE = Object.freeze({ robot: 'Digit', status: 'production', limit: '3' });

export const INPUT_SCHEMA = Object.freeze({
  properties: {
    ...Object.fromEntries(Object.entries(FILTERS).map(([k, description]) => [k, { type: 'string', maxLength: MAX_TEXT, description }])),
    limit: { type: 'string', pattern: '^([1-9]|10)$', description: `Number of deployment cases to return, 1 to ${MAX_CASES} (default ${DEFAULT_CASES}).` },
  },
  additionalProperties: false,
});

const SOURCE = { type: 'object', properties: { title: { type: ['string', 'null'] }, url: { type: ['string', 'null'] }, publisher: { type: ['string', 'null'] }, role: { type: ['string', 'null'] }, type: { type: ['string', 'null'] }, publication_date: { type: ['string', 'null'] }, accessed_at: { type: ['string', 'null'] } } };
export const OUTPUT_SCHEMA = Object.freeze({
  properties: {
    query: { type: 'object' },
    cases_matched: { type: 'integer' },
    cases_returned: { type: 'integer' },
    truncated: { type: 'boolean' },
    results: {
      type: 'array',
      maxItems: MAX_CASES,
      items: {
        type: 'object',
        properties: {
          deployment_id: { type: 'string' },
          case_url: { type: 'string' },
          organization: { type: 'object' },
          robot: { type: 'object' },
          sector: { type: ['string', 'null'] },
          country: { type: ['string', 'null'] },
          task_category: { type: ['string', 'null'] },
          records_in_case: { type: 'integer' },
          records: {
            type: 'array',
            maxItems: MAX_RECORDS_PER_CASE,
            items: {
              type: 'object',
              properties: {
                record_id: { type: 'string' },
                claim: { type: 'object' },
                operational_status: { type: ['string', 'null'] },
                verification_status: { type: ['string', 'null'] },
                evidence_level: { type: ['string', 'null'] },
                confidence: { type: ['string', 'null'] },
                observed: { type: 'object' },
                metric: { type: ['object', 'null'] },
                source: SOURCE,
                open_questions: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
    caveats: { type: 'array', items: { type: 'string' } },
    source: { type: 'object' },
  },
});

// Illustrative output for discovery listings: synthetic values that describe the shape, never a real record.
export const OUTPUT_EXAMPLE = Object.freeze({
  query: { robot: 'Digit', status: 'production', limit: 3 },
  cases_matched: 1,
  cases_returned: 1,
  truncated: false,
  results: [{
    deployment_id: 'example_case',
    case_url: 'https://whyhumanoid.com/deployments/',
    organization: { name: 'Example Logistics', role: 'customer_operator', country: 'United States' },
    robot: { manufacturer: 'Example Robotics', model: 'Example Humanoid', version: null },
    sector: 'Logistics',
    country: 'United States',
    task_category: 'Material handling',
    records_in_case: 1,
    records: [{
      record_id: 'example_record',
      claim: { id: 'example_claim', type: 'customer_statement', text: 'Example claim as the source states it.' },
      operational_status: 'production',
      verification_status: 'source_checked',
      evidence_level: 'E2',
      confidence: 'medium',
      observed: { start: '2026-01', end: null },
      metric: null,
      source: { title: 'Example source', url: 'https://example.com/', publisher: 'Example', role: 'primary', type: 'press_release', publication_date: '2026-01-15', accessed_at: '2026-11-20' },
      open_questions: 'Example open question.',
    }],
  }],
  caveats: [...CAVEATS],
  source: { dataset: 'Deployments', publisher: 'Why Humanoid? (Integrarobot)', url: 'https://whyhumanoid.com/deployments/', imported_at: '2026-11-24T00:00:00.000Z' },
});
