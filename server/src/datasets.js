// Registry of the thirteen workbook tabs served by the paid product. Headers are the exact header rows of the
// private workbook, validated on 2026-11-13 through an authenticated Google Drive read. Any header drift makes
// the import fail loudly instead of publishing misaligned data.
// Access: the Humanoids catalogue is free in full (its public, cleaned values); every other tab shows its first
// PREVIEW_ROWS non-empty data rows (workbook order). Full values, all other rows, search and agent API keys
// need an active subscription.

import { hostKey, urlKey } from './import/identity.js';
import { HUMANOIDS_FIELDS } from './humanoids-fields.js';
import editorial from './editorial/humanoids.json' with { type: 'json' };
import { scrubEditorial } from './data-atlas/atlas.js';
import { PUBLIC_DATE_HEADERS } from './public-dates.js';
import { INTEGRATOR_FIELDS, INTEGRATOR_HEADERS, selectIntegrators } from './integrators/catalogue.js';
import { COMPONENT_FIELDS, COMPONENT_HEADERS, COMPONENT_WITHHELD, scrubComponentText, selectProducts, selectSoftware } from './components/catalogue.js';
import { DATASET_ACCESS, PREVIEW_ROWS, categoryOfDataset, isFreeDataset, publicFieldsFor } from './access/matrix.js';

// Access comes from the central access matrix (server/src/access/matrix.js, 23 Nov 2026), never from this file.
export { PREVIEW_ROWS };

// A Humanoids row the sheet itself marks as a duplicate or an editorial resource. Also used by the free catalogue
// export (tools/export-humanoids.mjs), so the site and the backend withhold the same rows. The duplicate Genesis
// row (sheet row 38) lost its "Duplicate:" robot label but still says "Duplicate reference; not a second robot" and
// "Exclude this row from company and funding counts".
export const isInternalHumanoidRow = (d) => {
  const text = Object.values(d).join(' ');
  return (
    /^(duplicate|resource)\b/i.test(d.Robot ?? '') ||
    /\bexclude[sd]?\b[^.;]{0,30}\b(counts|catalogue|catalog)\b/i.test(text) ||
    /\bexclude (this|the) row\b/i.test(text) ||
    /\bduplicate reference\b|\bnot a second robot\b/i.test(text)
  );
};
const directoryKey = (d) => (d.url ? `${d.list}|${urlKey(d.url)}` : null);

const DIRECTORY = ['NAME', 'URL', 'DESCRIPTION'];
const lower = (headers) => headers.map((h) => h.toLowerCase());

const DEPLOYMENTS = [
  'record_id', 'organization_id', 'organization_name', 'organization_role', 'organization_country',
  'deployment_id', 'manufacturer', 'robot_model', 'robot_version', 'site_name', 'city', 'region', 'country',
  'sector', 'environment', 'relationship_type', 'commercial_status', 'operational_status', 'observed_start',
  'observed_end', 'task_id', 'task_category', 'task_description', 'workflow_from', 'workflow_to',
  'integration_dependencies', 'metric_name', 'metric_operator', 'metric_value', 'metric_unit', 'metric_period',
  'claim_id', 'claim_text', 'claim_type', 'evidence_level', 'confidence', 'verification_status', 'source_id',
  'source_title', 'source_url', 'source_publisher', 'source_role', 'source_type', 'publication_date',
  'accessed_at', 'language', 'open_questions_notes',
];

const EVIDENCE_LINKS = [
  'link_id', 'model_id', 'task_id', 'source_task_id', 'deployment_id', 'claim_id', 'statement',
  'task_relevance', 'stage_at_source_date', 'source_role', 'source_url', 'source_publication_date',
  'source_rechecked_at', 'raw_record_ids', 'source_rows', 'resource_ids', 'integrator_id', 'metric_name',
  'metric_operator', 'metric_value', 'metric_unit', 'metric_period', 'limitations',
];

const TASK_EVALUATIONS = [
  'task_id', 'model_id', 'model', 'identity_resolved', 'task_performed_documented', 'operator_primary_source',
  'field_environment', 'commercial_operation_documented', 'economic_protocol_complete',
  'eligible_task_evidence', 'eligible_commercial', 'eligible_economic', 'exact_amr_to_conveyor',
  'decision_reason', 'evidence_ids',
];

// Robotics Evaluation Atlas (23 Nov 2026): table BenchmarksCatalog (the first 20 columns as before, four appended) and
// table BenchmarkResults. Joined on BENCHMARK_ID; validated together by server/src/benchmarks/atlas.js.
const BENCHMARKS = [
  'NAME', 'URL', 'DESCRIPTION', 'BENCHMARK_ID', 'CATEGORY', 'EVALUATES', 'ENVIRONMENT', 'TASKS', 'METRICS', 'PROTOCOL',
  'RELATED_DATASET_IDS', 'RELATED_DATASETS_URL', 'LEADERBOARD_URL', 'CODE_URL', 'SOURCE_URL', 'SOURCE_LOCATOR',
  'CHECKED_AT', 'REVIEW_STATUS', 'LIMITATIONS', 'PREVIOUS_CATALOGUE_DESCRIPTION', 'EMBODIMENT', 'CAPABILITY_TAGS',
  'KEY_FINDING', 'RESULTS_COVERAGE',
];
// First public dates (25 Nov 2026): seven columns appended at the end (server/src/public-dates.js); the tab without
// them is still accepted.
const BENCHMARKS_DATED = [...BENCHMARKS, ...PUBLIC_DATE_HEADERS];

const BENCHMARK_RESULTS = [
  'RESULT_ID', 'BENCHMARK_ID', 'BENCHMARK_VERSION', 'MODEL', 'MODEL_CONFIGURATION', 'TRACK', 'ENVIRONMENT', 'EMBODIMENT',
  'TASK_SCOPE', 'METRIC', 'VALUE', 'UNIT', 'DIRECTION', 'N_EVALS', 'UNCERTAINTY', 'TRAINING_DATA', 'CONDITIONS',
  'COMPARABILITY_GROUP', 'RESULT_DATE', 'DATE_MEANING', 'SOURCE_URL', 'SOURCE_LOCATOR', 'CHECKED_AT', 'EVIDENCE_STATUS',
  'LIMITATIONS', 'DISPLAY_STATUS',
];

// Robot Learning Data Atlas (23 Nov 2026): table DatasetsCatalog (the former NAME, URL, DESCRIPTION directory plus 24
// appended columns) and table DatasetMetrics. Joined on DATASET_ID; validated together by server/src/data-atlas/atlas.js.
const DATASETS_CATALOG = [
  'NAME', 'URL', 'DESCRIPTION', 'DATASET_ID', 'RESOURCE_TYPE', 'RELATED_BENCHMARK_IDS', 'RELATED_BENCHMARK_URL',
  'CLASSIFICATION_NOTE', 'CHECKED_AT', 'DATA_ORIGIN', 'EMBODIMENT', 'MODALITIES', 'CAPTURE_METHOD', 'LEARNING_USES',
  'DATA_FORMAT', 'ACCESS_STATUS', 'LICENSE_NOTE', 'VERSION_SCOPE', 'KEY_TAKEAWAY', 'SOURCE_URL', 'SOURCE_LOCATOR',
  'REVIEW_STATUS', 'LIMITATIONS', 'PARENT_DATASET_IDS', 'RESOURCE_CLASS', 'ATTACHMENT_REF', 'INCLUDED_IN_ATLAS',
];
const DATASETS_CATALOG_DATED = [...DATASETS_CATALOG, ...PUBLIC_DATE_HEADERS];

const DATASET_METRICS = [
  'METRIC_ID', 'DATASET_ID', 'DATA_VERSION', 'METRIC', 'VALUE', 'UNIT', 'QUALIFIER', 'SCOPE', 'DATA_ORIGIN',
  'RELEASE_STATUS', 'SOURCE_URL', 'SOURCE_LOCATOR', 'SOURCE_DATE', 'DATE_MEANING', 'CHECKED_AT', 'EVIDENCE_STATUS',
  'OVERLAP_NOTE', 'COMPARISON_GROUP', 'DISPLAY_STATUS', 'LIMITATIONS',
];

const ENTITIES = [
  'entity_id', 'entity_type', 'canonical_name', 'manufacturer_id', 'parent_entity_id', 'source_sheet',
  'source_rows', 'source_label', 'reference_url', 'identity_scope', 'reviewed_at', 'notes',
];

const DATA_SPACE = [
  'record_id', 'workstream', 'topic', 'finding_or_proposal', 'implementation_detail', 'target', 'priority',
  'epistemic_status', 'source_url', 'next_step',
];

const STOCKS = [
  'NAME', 'URL', 'DESCRIPTION', 'TICKER', 'EXCHANGE', 'COUNTRY', 'SEGMENT', 'SOURCE', 'VERIFIED_AT', 'GF_SYMBOL',
  'FINANCE_URL', 'PRICE', 'CURRENCY', 'CHANGE_PCT', 'MARKET_CAP', 'LAST_TRADE', 'DATA_DELAY_MIN', 'QUOTE_STATUS',
  'ETF_MEMBERSHIP', 'ETF_AS_OF', 'ETF_SOURCES', 'ISIN',
];
// Appended to the Investment table on 23 Nov 2026 (StocksCatalog A1:AD277): publisher theses per company. Not part of
// any approved public or paid view yet, and THESIS_RECORDS links into the private workbook: accepted, never stored.
const STOCKS_THESES = [
  'THESIS_COUNT', 'INVESTMENT_THESES', 'THESIS_PUBLISHERS', 'THESIS_DATES', 'THESIS_SOURCES', 'THESIS_RECORDS',
  'THESIS_VERIFIED_AT', 'THESIS_COVERAGE',
];

export const DATASETS = [
  {
    id: 'humanoids',
    tab: 'Humanoids',
    title: 'Humanoid robots',
    description: 'Humanoid robot catalogue: makers, specifications, funding, buyer checks and sources.',
    kind: 'table',
    headers: HUMANOIDS_FIELDS,
    clean: true,
    editorial: editorial.rewrites,
    // The sheet marks some rows as duplicates or editorial resources: kept as internal provenance, never served.
    internalRow: (d) => isInternalHumanoidRow(d),
    idPrefix: 'hum',
    // A robot's own page identifies it; rows that share or lack a page stay unresolved for review.
    naturalKey: (d) => (d.Web ? `web|${urlKey(d.Web)}` : null),
  },
  {
    id: 'deployments',
    tab: 'Deployments',
    title: 'Deployments',
    description: 'One claim per row about a humanoid robot deployment, with evidence level, source and dates.',
    kind: 'table',
    headers: DEPLOYMENTS,
    idFields: ['record_id'],
  },
  {
    id: 'integrators',
    // Since 24 Nov 2026 a provider catalogue (server/src/integrators/catalogue.js): one provider per row of the native
    // table IntegratorsCatalog, 26 columns, keyed by PROVIDER ID. Supersedes the three-column directory (archived in the
    // workbook as hidden dated tabs, never read). Free in full.
    tab: 'Integrators',
    title: 'Integrators',
    description: 'Humanoid integrators and service providers: roles, services, platforms, territory, named projects and the evidence behind each claim.',
    kind: 'table',
    headers: INTEGRATOR_HEADERS,
    fields: INTEGRATOR_FIELDS,
    select: selectIntegrators,
    idFields: ['provider_id'],
  },
  {
    id: 'evidence-links',
    tab: 'Evidence Relations',
    formerTabs: ['Relaciones evidencia'],
    title: 'Evidence links',
    description: 'Links between robot models, tasks, deployments and claims, with stage and limitations.',
    kind: 'table',
    headers: EVIDENCE_LINKS,
    idFields: ['link_id'],
  },
  {
    id: 'benchmarks',
    tab: 'Benchmarks',
    title: 'Benchmarks',
    description: 'Robotics evaluation resources: what each tests, in which setting, with which metrics, protocol and limitations.',
    kind: 'table',
    headers: BENCHMARKS_DATED,
    formerHeaders: [BENCHMARKS],
    fields: lower(BENCHMARKS_DATED),
    idFields: ['benchmark_id'],
    // Published as the Robotics Evaluation Atlas snapshot (tools/export-benchmarks.mjs), not as a preview file.
    publicSnapshot: 'data/benchmarks/atlas.json',
  },
  {
    id: 'benchmark-results',
    tab: 'Benchmark Results',
    title: 'Benchmark results',
    description: 'Selected source-reported model results on benchmark resources, with version, track, conditions and source.',
    kind: 'table',
    headers: BENCHMARK_RESULTS,
    fields: lower(BENCHMARK_RESULTS),
    idFields: ['result_id'],
    publicSnapshot: 'data/benchmarks/atlas.json',
  },
  {
    id: 'task-evaluations',
    tab: 'Task Evaluation',
    formerTabs: ['Evaluacion tarea'],
    // Internal operational assessment since 23 Nov 2026: Benchmarks now shows the Benchmarks tab and its results.
    title: 'Task evaluations',
    description: 'Internal operational assessment: per-task eligibility of each robot model against documented evidence.',
    kind: 'table',
    headers: TASK_EVALUATIONS,
    idFields: ['task_id', 'model_id'],
  },
  {
    id: 'container-handling',
    tab: 'Product - Container Handling',
    formerTabs: ['Producto - Contenedores'],
    title: 'Container handling analysis',
    description: 'Task analysis for container handling in intralogistics, with traceability.',
    kind: 'table',
    headers: ['Layer', 'Element', 'Outcome / implication', 'Traceability'],
    // Header row before the workbook was translated to English (20 Nov 2026); same columns, same order.
    formerHeaders: [['Capa', 'Elemento', 'Resultado / implicación', 'Trazabilidad']],
    fields: ['layer', 'element', 'result', 'traceability'],
    idPrefix: 'ch',
    // Analysis lines have no natural identity yet: served with unstable pending ids until Codex defines one.
    naturalKey: () => null,
  },
  {
    id: 'entities',
    tab: 'Clean Entities',
    formerTabs: ['Entidades limpias'],
    title: 'Entities',
    description: 'Canonical organisations, models and resources with identity scope and review date.',
    kind: 'table',
    headers: ENTITIES,
    idFields: ['entity_id'],
  },
  {
    id: 'stocks',
    // Sheet renamed from 'Stocks' on 23 Nov 2026 (same sheetId 1211512398, gid, columns; native table StocksCatalog).
    tab: 'Investment',
    formerTabs: ['Stocks'],
    title: 'Investment: listed companies',
    description: 'Listed companies exposed to humanoid robotics: tickers, ISIN, segment and ETF membership.',
    kind: 'table',
    headers: [...STOCKS, ...STOCKS_THESES],
    fields: lower([...STOCKS, ...STOCKS_THESES]),
    formerHeaders: [STOCKS],
    idFields: ['isin'],
    fallbackIdFields: ['ticker', 'exchange'],
    // Quote data comes from GOOGLEFINANCE and is withheld until data licensing is decided; the appended thesis columns
    // are withheld until Javier decides how theses are published.
    withheld: ['price', 'change_pct', 'market_cap', 'last_trade', 'data_delay_min', 'quote_status', ...lower(STOCKS_THESES)],
  },
  {
    id: 'software',
    tab: 'Software',
    title: 'Software and world models',
    description: 'Robot foundation models, VLA models, world models and robotics software.',
    kind: 'lists',
    headers: ['SOFTWARE', 'URL', 'DESCRIPTION', '', 'WORLD MODEL', 'URL'],
    lists: [
      { list: 'software', columns: { name: 0, url: 1, description: 2 } },
      { list: 'world_model', columns: { name: 4, url: 5 } },
    ],
    // Canonical active catalogue (server/src/catalogue/directory.js): header and section rows out, exact identities
    // merged. The software column holds three blocks: general, "SOFTWARE FOR UNITREE" and "SIMULATORS".
    canonical: true,
    properNames: ['Unitree'],
    idPrefix: 'sw',
    naturalKey: directoryKey,
  },
  {
    id: 'datasets',
    tab: 'Datasets',
    title: 'Datasets',
    description: 'Robot learning data resources: origin, bodies, modalities, uses, access and licence notes.',
    kind: 'table',
    headers: DATASETS_CATALOG_DATED,
    formerHeaders: [DATASETS_CATALOG],
    fields: lower(DATASETS_CATALOG_DATED),
    idFields: ['dataset_id'],
    // Editorial bookkeeping of the workbook, never stored or served: a link into the private workbook, the review note
    // of the classification pass and the reference to the supplied matrix.
    withheld: ['related_benchmark_url', 'classification_note', 'attachment_ref'],
    scrub: (field, value) => scrubEditorial(value),
    publicSnapshot: 'data/datasets/atlas.json',
  },
  {
    id: 'dataset-metrics',
    tab: 'Dataset Metrics',
    title: 'Dataset metrics',
    description: 'Reported quantities of the data resources, with unit, qualifier, scope, release status and source.',
    kind: 'table',
    headers: DATASET_METRICS,
    fields: lower(DATASET_METRICS),
    idFields: ['metric_id'],
    scrub: (field, value) => scrubEditorial(value),
    publicSnapshot: 'data/datasets/atlas.json',
  },
  {
    id: 'hardware',
    // Sheet renamed from 'Hardware' on 23 Nov 2026 (same sheetId 100173846, gid, native table HardwareCatalog). Since
    // 23 Nov 2026 a product catalogue (server/src/components/catalogue.js): one product per row, keyed by Component ID,
    // read from the product table block only. The former three-column directory is archived in the workbook.
    tab: 'Components',
    formerTabs: ['Hardware'],
    title: 'Components',
    description: 'Robot components as products: sensing principle, specifications, interfaces, availability, price and sources.',
    kind: 'table',
    headers: COMPONENT_HEADERS,
    fields: COMPONENT_FIELDS,
    select: selectProducts,
    idFields: ['component_id'],
    withheld: COMPONENT_WITHHELD,
    scrub: scrubComponentText,
  },
  {
    // The related software block of the Components tab (TACTO): software that works with the products, never counted
    // as hardware.
    id: 'component-software',
    tab: 'Components',
    formerTabs: ['Hardware'],
    title: 'Components: related software',
    description: 'Software related to the component products, such as simulators of tactile sensors.',
    kind: 'table',
    headers: COMPONENT_HEADERS,
    fields: COMPONENT_FIELDS,
    select: selectSoftware,
    idFields: ['component_id'],
    withheld: COMPONENT_WITHHELD,
    scrub: scrubComponentText,
  },
  {
    id: 'other-robots',
    tab: 'Other Robots',
    title: 'Other robots',
    description: 'Non-humanoid and educational robots tracked alongside the humanoid catalogue.',
    kind: 'lists',
    headers: ['NAME', 'URL', 'DESCRIPTION', '', 'EDUBOTS', 'URL', 'DESCRIPTION'],
    lists: [
      { list: 'other_robot', columns: { name: 0, url: 1, description: 2 } },
      { list: 'edubot', columns: { name: 4, url: 5, description: 6 } },
    ],
    canonical: true,
    idPrefix: 'or',
    naturalKey: directoryKey,
  },
  {
    id: 'data-space',
    tab: 'Data Space',
    title: 'Data space design notes',
    description: 'Findings and proposals for the humanoid robotics data space.',
    kind: 'table',
    headers: DATA_SPACE,
    idFields: ['record_id'],
  },
];

// Access from the matrix: publicRows 'all' marks a free tab (every customer row, public values, to anyone).
for (const spec of DATASETS) {
  if (!DATASET_ACCESS[spec.id]) throw new Error(`dataset ${spec.id} has no entry in the access matrix`);
  spec.access = isFreeDataset(spec.id) ? 'free' : 'subscription';
  spec.category = categoryOfDataset(spec.id)?.id ?? null;
  if (spec.access === 'free') spec.publicRows = 'all';
  // Subscription tabs (24 Nov 2026): every row at its public fields, or none listed when the allowlist is empty.
  else { spec.publicFields = publicFieldsFor(spec.id); spec.publicRows = spec.publicFields.length ? 'summary' : 'none'; }
  if (DATASET_ACCESS[spec.id].offer === false) spec.offer = false;
}

// The rows of a tab in a workbook export or a Sheets API read, under its current name or a former one.
export const tabValues = (values, spec) => values?.[spec.tab] ?? (spec.formerTabs ?? []).map((t) => values?.[t]).find(Boolean);

export const PREMIUM_DATASETS = DATASETS; // kept for tooling that scans premium column names
export const DATASETS_BY_ID = new Map(DATASETS.map((d) => [d.id, d]));

// Public rows per tab: null means every customer row; 0 means none is listed (counted only).
export const publicRowLimit = (spec) => (spec.publicRows === 'none' ? 0 : null);
// The SQL expression of a row's public values. A subscription row is public only through its stored public values,
// never through its full values: a row without them (an import older than 24 Nov 2026) is not public at all.
export const publicValuesSql = (spec) => (spec.access === 'free' ? 'COALESCE(preview_data, data)' : 'preview_data');
export const publicRowSql = (spec) => (spec.access === 'free' ? '1 = 1' : 'preview_data IS NOT NULL');

export function publicDatasetList() {
  return DATASETS.map((spec) => ({
    id: spec.id,
    title: spec.title,
    description: spec.description,
    category: spec.category,
    access: { preview_rows: publicRowLimit(spec) === 0 ? 'none' : 'all', public_fields: spec.publicFields ?? null, full: spec.access === 'free' ? 'public' : 'subscription' },
    offer: spec.offer !== false,
  }));
}

// 1 for a row that is an entry, 0 for a topical membership row of a directory tab (data.canonical === false).
const CANONICAL_SQL = "CASE WHEN json_extract(data, '$.canonical') = 0 THEN 0 ELSE 1 END";
// Importer bookkeeping (identity_status, raw sheet-row pointers) is internal: never served, not even to subscribers.
const INTERNAL_KEYS = new Set(['identity_status', 'source_rows']);
const toRow = (r) => ({ id: r.row_id, ...Object.fromEntries(Object.entries(JSON.parse(r.data)).filter(([k]) => !INTERNAL_KEYS.has(k))) });

// Public rows: every customer row of a tab in workbook order, at its public values (all values of a free tab, the
// allowlisted fields of a subscription tab); none for a tab that is counted only. No search, no paging.
export async function queryPreview(db, spec) {
  const datasetId = spec.id;
  const page = publicRowLimit(spec) === 0
    ? { results: [] }
    : await db
      .prepare(
        `SELECT row_id, ${publicValuesSql(spec)} AS data, snapshot_id FROM premium_rows
          WHERE dataset = ? AND visibility = 'customer' AND ${publicRowSql(spec)} ORDER BY position`,
      )
      .bind(datasetId)
      .all();
  const total = await db
    .prepare(`SELECT COUNT(*) AS n, SUM(${CANONICAL_SQL}) AS e FROM premium_rows WHERE dataset = ? AND visibility = 'customer'`)
    .bind(datasetId)
    .first();
  const results = page.results ?? [];
  // entries: the canonical entries of a directory tab (server/src/catalogue/directory.js); a topical membership row (the
  // same entity in a second list) is listed but not counted again. Equal to total_rows for every other tab.
  return { snapshot: results[0]?.snapshot_id ?? null, total_rows: Number(total?.n ?? 0), entries: Number(total?.e ?? total?.n ?? 0), rows: results.map(toRow) };
}

// Paged rows of a tab. publicValues: the public values (free tabs read without a subscription); otherwise the full
// values, which the caller serves only after the entitlement check.
export async function queryDatasetRows(db, datasetId, { limit, offset, q, publicValues = false }) {
  const col = publicValues ? 'COALESCE(preview_data, data)' : 'data';
  const where = q ? `dataset = ? AND visibility = 'customer' AND ${col} LIKE ?` : "dataset = ? AND visibility = 'customer'";
  const params = q ? [datasetId, `%${q}%`] : [datasetId];
  const total = await db.prepare(`SELECT COUNT(*) AS n, SUM(${CANONICAL_SQL}) AS e FROM premium_rows WHERE ${where}`).bind(...params).first();
  const page = await db
    .prepare(`SELECT row_id, ${col} AS data, snapshot_id FROM premium_rows WHERE ${where} ORDER BY position LIMIT ? OFFSET ?`)
    .bind(...params, limit, offset)
    .all();
  const rows = (page.results ?? []).map(toRow);
  return { total: Number(total?.n ?? 0), entries: Number(total?.e ?? total?.n ?? 0), snapshot: page.results?.[0]?.snapshot_id ?? null, rows };
}
