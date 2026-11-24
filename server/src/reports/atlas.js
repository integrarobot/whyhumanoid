// Research Conclusions Atlas (Javier, 24 Nov 2026): the reviewed findings of the Reports tab (ReportsCatalog A1:U13,
// one row per report edition). The master holds the extraction; tools/reports-findings.json holds the reviewed,
// normalised findings, each citing the exact master cell it comes from and, when checked, the page of the public
// original with a short phrase found there. This module validates both together and builds the public snapshot
// (data/reports/atlas.json, tools/export-reports.mjs). Rules carried by the data, not by the view:
//
// - One finding per independently interpretable claim. Stocks (installed base) and flows (annual shipments), annual
//   robot revenue and broad opportunities (labour value, GDP of physical industries), technical exposure and economic
//   competitiveness, survey answers and realised adoption, bill of materials, production cost, selling price and cost
//   per hour are different metrics. A chart only draws findings of one metric, unit, geography and scope.
// - A figure repeated by several reports is one original estimate (estimate key, target year and kind): drawn once, saying in how
//   many reports it appears. A range across publishers is dispersion, not a confidence interval. Nothing is averaged,
//   extended to a common year or interpolated.
// - Only findings checked against the original are drawn. Pending, unreachable and withheld findings are listed with
//   their state. Empty never means zero.

export const REPORT_COLUMNS = Object.freeze([
  'Report name', 'Publishing entity', 'Year of publication (month)', 'Scope & methodology',
  'Humanoid unit sales / shipments forecast', 'Installed base / units in operation', 'Market size / revenue forecast',
  'Scenarios (base / bull / bear)', 'Unit cost / BOM & price trajectory', 'Labor impact (jobs, tasks, labor shortage)',
  'Investment / funding', 'Key adoption sectors & timeline', 'China vs US / regional view', 'Key bottlenecks / risks',
  'Key companies highlighted', 'Headline conclusion', 'Other key figures', 'Source link', 'Report ID', 'Review status',
  'Source workbook',
]);

export const THEMES = Object.freeze([
  { key: 'market', label: 'Market and scale', question: 'How many robots, how much revenue, and by when?', columns: ['Humanoid unit sales / shipments forecast', 'Installed base / units in operation', 'Market size / revenue forecast', 'Scenarios (base / bull / bear)'] },
  { key: 'work', label: 'Work and automation', question: 'Which work could robots do, and at what cost to people?', columns: ['Labor impact (jobs, tasks, labor shortage)'] },
  { key: 'costs', label: 'Costs and economics', question: 'What does a humanoid cost to build, buy and run?', columns: ['Unit cost / BOM & price trajectory'] },
  { key: 'adoption', label: 'Adoption and readiness', question: 'Who plans, pilots or deploys, and in which sectors?', columns: ['Key adoption sectors & timeline'] },
  { key: 'investment', label: 'Investment and value chain', question: 'Where does the money go, and who supplies the parts?', columns: ['Investment / funding', 'Key companies highlighted'] },
  { key: 'risks', label: 'Risks and bottlenecks', question: 'What holds deployment back?', columns: ['Key bottlenecks / risks'] },
  { key: 'regions', label: 'China and the regional race', question: 'Where are robots made, modelled and patented?', columns: ['China vs US / regional view'] },
]);
const THEME_KEYS = new Set([...THEMES.map((t) => t.key), 'headline']);

export const KINDS = Object.freeze({
  observed: 'Observed', estimate: 'Estimate of a current value', forecast: 'Forecast', scenario: 'Scenario or sensitivity',
  survey: 'Survey answer', model: 'Illustrative model', qualitative: 'Qualitative conclusion',
});
export const CHECK_STATES = Object.freeze({
  verified: 'Checked against the original', pending: 'Extracted; not yet checked against the original',
  pending_unreachable: 'Original not reachable for review; shown as extracted', withheld: 'Withheld: the extraction is ambiguous',
});

// Metric semantics: what is measured, and which findings may share an axis.
export const METRICS = Object.freeze({
  shipments_annual: { label: 'Annual shipments (a flow: units per year)', chart: 'units' },
  installed_base: { label: 'Installed base or units in operation (a stock)', chart: 'units' },
  market_revenue: { label: 'Annual humanoid robot market (revenue)', chart: 'usd' },
  broad_opportunity: { label: 'Size of an addressable opportunity (not robot sales)' },
  company_target: { label: 'Company production target' },
  context_industrial_robots: { label: 'Context: industrial robots (not humanoids)' },
  technical_exposure: { label: 'Technical exposure (what robots can do)' },
  economic_exposure: { label: 'Economic competitiveness (where robots cost less)' },
  time_to_cost_competitive: { label: 'Time until robots are cost-competitive' },
  theoretical_task_potential: { label: 'Theoretical task potential' },
  role_substitution_scenario: { label: 'Substitution scenario for a subset of roles' },
  observed_employment: { label: 'Observed employment and wage change' },
  labour_shortage_driver: { label: 'Labour shortage driver' },
  survey_concern: { label: 'Concern reported in a survey' },
  survey_expectation: { label: 'Expectation reported in a survey' },
  productivity_model: { label: 'Productivity model' },
  augmentation: { label: 'Augmentation rather than replacement' },
  labour_value: { label: 'Value of labour (not robot sales)' },
  production_cost: { label: 'Production cost per unit', chart: 'usd_unit' },
  bom: { label: 'Bill of materials per unit', chart: 'usd_unit' },
  selling_price: { label: 'Selling price per unit', chart: 'usd_unit' },
  list_price: { label: 'Observed list price', chart: 'usd_unit' },
  bom_structure: { label: 'Structure of the bill of materials' },
  price_structure: { label: 'Structure of the selling price' },
  cost_per_hour: { label: 'Cost per productive hour' },
  labour_cost_reference: { label: 'Labour cost reference' },
  annual_cost_comparison: { label: 'Annual cost: robot against worker' },
  survey_stage: { label: 'Survey: stage of plans or adoption' },
  sector_share: { label: 'Share of installations by sector' },
  sequence: { label: 'Order of adoption by sector' },
  capability_trend: { label: 'Trend in robot capability' },
  funding_flow: { label: 'Funding flow' },
  funding_share: { label: 'Share of venture funding' },
  valuation: { label: 'Valuation' },
  value_chain: { label: 'Value chain and suppliers' },
  constraint: { label: 'Constraint on deployment' },
  china_share: { label: 'China\'s share' },
  china_vs_west: { label: 'China against the West' },
  china_scale: { label: 'Scale of China\'s industry' },
  regional_ranking: { label: 'Regional ranking' },
  headline: { label: 'Headline conclusion' },
});
export const CONSTRAINTS = Object.freeze({
  reliability: 'Reliability and maturity', dexterity: 'Dexterity and manipulation', power: 'Battery and power',
  economics: 'Cost and return on investment', integration: 'Integration and deployment', safety_regulation: 'Safety, regulation and acceptance',
  supply_chain: 'Supply chain and components', data: 'Training data', autonomy_ai: 'Autonomy and general-purpose AI',
});

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const PRIVATE_LINK = /docs\.google\.com|drive\.google\.com|\/spreadsheets\/d\/|googleusercontent\.com/i;
const colLetter = (i) => String.fromCharCode(65 + i);

// The Reports tab as rows keyed by Report ID, with sheet rows. Throws on a header that is not the reviewed contract.
export function reportRows(values) {
  const header = (values?.[0] ?? []).map((h) => String(h ?? '').trim());
  if (REPORT_COLUMNS.some((h, i) => header[i] !== h) || header.length > REPORT_COLUMNS.length) {
    throw new Error(`Reports: header drift. Expected ${JSON.stringify(REPORT_COLUMNS)}, got ${JSON.stringify(header)}`);
  }
  const rows = new Map();
  values.slice(1).forEach((r, i) => {
    if (!(r ?? []).some((v) => String(v ?? '').trim())) return;
    const id = String(r[REPORT_COLUMNS.indexOf('Report ID')] ?? '').trim();
    if (rows.has(id)) throw new Error(`Reports: duplicate Report ID ${id}`);
    rows.set(id, { sheetRow: i + 2, cells: Object.fromEntries(REPORT_COLUMNS.map((h, c) => [h, String(r[c] ?? '').trim()])) });
  });
  return rows;
}

// Every problem that must stop a snapshot. `rows` from reportRows(); `mapping` is tools/reports-findings.json.
export function atlasProblems(rows, mapping) {
  const problems = [];
  const reports = new Map();
  for (const r of mapping.reports ?? []) {
    if (!/^RPT-\d{3}$/.test(r.id ?? '')) problems.push(`report ${r.id}: id must look like RPT-000`);
    if (reports.has(r.id)) problems.push(`report ${r.id}: duplicate`);
    reports.set(r.id, r);
    if (!rows.has(r.id)) problems.push(`report ${r.id}: not in the master Reports tab`);
    if (!/^[a-z0-9-]+$/.test(r.slug ?? '') || r.slug === 'deployment-records') problems.push(`report ${r.id}: bad slug`);
    if (!/^https:\/\//.test(r.url ?? '') || PRIVATE_LINK.test(r.url)) problems.push(`report ${r.id}: the original must be a public https link`);
    if (!CHECK_STATES[r.check?.status]) problems.push(`report ${r.id}: unknown check status`);
  }
  for (const id of rows.keys()) if (!reports.has(id)) problems.push(`master row ${id}: no report entry in the reviewed mapping (every edition must be accounted for)`);
  const slugs = new Set();
  for (const r of reports.values()) { if (slugs.has(r.slug)) problems.push(`slug ${r.slug} used twice`); slugs.add(r.slug); }

  const ids = new Set();
  for (const f of mapping.findings ?? []) {
    const at = `finding ${f.id ?? '(no id)'}`;
    if (!/^[a-z0-9-]+$/.test(f.id ?? '')) problems.push(`${at}: id must be lower-case words`);
    if (ids.has(f.id)) problems.push(`${at}: duplicate id`);
    ids.add(f.id);
    const rep = reports.get(f.report);
    if (!rep) { problems.push(`${at}: unknown report ${f.report}`); continue; }
    if (!THEME_KEYS.has(f.theme)) problems.push(`${at}: unknown theme ${f.theme}`);
    if (!METRICS[f.metric]) problems.push(`${at}: unknown metric ${f.metric}`);
    if (!KINDS[f.kind]) problems.push(`${at}: unknown kind ${f.kind}`);
    if (!CHECK_STATES[f.check?.status]) problems.push(`${at}: unknown check status`);
    if (f.constraint && !CONSTRAINTS[f.constraint]) problems.push(`${at}: unknown constraint ${f.constraint}`);
    if (f.constraints_also !== undefined && (!f.constraint || !Array.isArray(f.constraints_also) || !f.constraints_also.length || f.constraints_also.some((c) => !CONSTRAINTS[c] || c === f.constraint) || new Set(f.constraints_also).size !== f.constraints_also.length)) problems.push(`${at}: constraints_also must list other known constraints of a constraint finding`);
    if (!norm(f.statement)) problems.push(`${at}: no statement`);
    // Provenance in the master: the column exists and the excerpt is literally in that cell.
    const row = rows.get(f.report);
    if (!REPORT_COLUMNS.includes(f.cell?.column)) problems.push(`${at}: unknown master column ${f.cell?.column}`);
    else if (row && !norm(row.cells[f.cell.column]).includes(norm(f.cell.excerpt))) problems.push(`${at}: excerpt not found in master ${f.report} / ${f.cell.column}`);
    // A checked finding names its page or section and the phrase found there; an unreachable report has no checked finding.
    if (f.check?.status === 'verified') {
      if (!norm(f.check.phrase) || !norm(f.locator)) problems.push(`${at}: a checked finding needs a locator and the phrase found in the original`);
      if (norm(f.check.phrase).split(' ').length > 30) problems.push(`${at}: the original phrase is too long to quote (30 words at most)`);
      if (rep.check?.status === 'pending_unreachable') problems.push(`${at}: checked, but its report's original was not reachable`);
    }
    if (rep.check?.status === 'pending_unreachable' && f.check?.status === 'pending') problems.push(`${at}: a finding of an unreachable report must say so (pending_unreachable)`);
    // Numbers: native values only; a range is ordered; a number has a unit.
    for (const k of ['value', 'min', 'max']) if (f[k] !== undefined && f[k] !== null && !isNum(f[k])) problems.push(`${at}: ${k} must be a number`);
    if (isNum(f.min) && isNum(f.max) && f.min > f.max) problems.push(`${at}: min above max`);
    if ((isNum(f.value) || isNum(f.min)) && !f.unit) problems.push(`${at}: a number needs a unit`);
    if (f.target_year !== undefined && f.target_year !== null && !(Number.isInteger(f.target_year) && f.target_year > 1990 && f.target_year < 2200)) problems.push(`${at}: target_year must be a year`);
    // Measures that share a chart share a unit: units a year or in operation, US$ a year, US$ per unit.
    const CHART_UNIT = { units: (x) => x.unit === 'units', usd: (x) => x.currency === 'USD' && x.unit === 'USD', usd_unit: (x) => x.currency === 'USD' && x.unit === 'USD per unit' };
    if (METRICS[f.metric]?.chart && (isNum(f.value) || isNum(f.min)) && !CHART_UNIT[METRICS[f.metric].chart](f)) problems.push(`${at}: ${f.metric} must be in ${METRICS[f.metric].chart}, not ${f.unit}`);
    // A percentage, and any survey answer with a number, says what it is a share of.
    if ((f.unit === '%' || (f.kind === 'survey' && (isNum(f.value) || isNum(f.min)))) && !norm(f.denominator)) problems.push(`${at}: a percentage or survey figure needs its denominator`);
    // A withheld finding carries no figure and no year: nothing is assigned positionally.
    if (f.check?.status === 'withheld' && [f.value, f.min, f.max, f.target_year, f.points, f.parts].some((v) => v !== undefined && v !== null)) problems.push(`${at}: a withheld finding must not carry figures or years`);
    if (f.parts) {
      const total = f.parts.reduce((n, p) => n + p[1], 0);
      const want = f.parts_total ?? 100;
      if (Math.abs(total - want) > 0.5) problems.push(`${at}: parts add up to ${total}, not ${want}: a stack needs exhaustive parts`);
      if (!norm(f.parts_check)) problems.push(`${at}: a stack needs the reason its parts are exhaustive`);
    }
    if (PRIVATE_LINK.test(JSON.stringify(f))) problems.push(`${at}: holds a private link`);
  }
  // One original estimate, one series: findings that share an estimate key agree on metric and unit.
  const est = new Map();
  for (const f of mapping.findings ?? []) {
    if (!f.estimate) continue;
    const key = `${f.metric}|${f.unit}`;
    if (est.has(f.estimate) && est.get(f.estimate) !== key) problems.push(`estimate ${f.estimate}: mixes ${est.get(f.estimate)} and ${key}`);
    est.set(f.estimate, key);
  }
  return problems;
}

const FINDING_FIELDS = Object.freeze([
  'id', 'report', 'theme', 'metric', 'kind', 'statement', 'value', 'min', 'max', 'qualifier', 'unit', 'currency', 'geography',
  'scope', 'denominator', 'reference_year', 'target_year', 'scenario', 'stage', 'sample', 'assumptions', 'limits',
  'attribution', 'estimate', 'locator', 'constraint', 'constraints_also', 'parts', 'parts_total', 'parts_check', 'points', 'history',
]);
const REPORT_FIELDS = Object.freeze([
  'id', 'slug', 'page_id', 'title', 'short', 'publisher', 'authors', 'published', 'published_note', 'format', 'url', 'host_note',
  'access', 'restrictions', 'scope',
]);

// Coverage of one report and theme: what the review found there.
export function coverageState(row, report, findings, theme) {
  const cells = theme.columns.map((c) => row.cells[c]);
  const fs = findings.filter((f) => f.report === report.id && f.theme === theme.key);
  // A column counts as reviewed when it says "Not covered" or a finding of any theme cites it (a scenario cell about
  // work, for example, is reviewed under Work and automation, not under Market and scale).
  const cited = new Set(findings.filter((f) => f.report === report.id).map((f) => f.cell?.column));
  if (!fs.length) return theme.columns.every((c, i) => !cells[i] || /^not covered\b/i.test(cells[i]) || cited.has(c)) ? 'not_covered' : report.check?.status === 'pending_unreachable' ? 'unreachable' : 'not_extracted';
  const checked = fs.filter((f) => f.check.status === 'verified');
  if (checked.some((f) => isNum(f.value) || isNum(f.min) || f.parts)) return 'quantitative';
  if (checked.length) return 'qualitative';
  if (fs.every((f) => f.check.status === 'pending_unreachable' || f.check.status === 'withheld')) return 'unreachable';
  return 'pending';
}
export const COVERAGE_STATES = Object.freeze({
  quantitative: 'Checked numbers', qualitative: 'Checked conclusions, no numbers', pending: 'Extracted, check pending',
  unreachable: 'Original not reachable', not_extracted: 'In the extraction, not yet reviewed', not_covered: 'Not covered by the report',
});

export function buildAtlas({ rows, mapping, exportedAt, builtAt }) {
  const reports = mapping.reports.map((r) => {
    const row = rows.get(r.id);
    const out = Object.fromEntries(REPORT_FIELDS.map((k) => [k, r[k] ?? null]));
    return { ...out, sheet_row: row.sheetRow, check: { status: r.check.status, checked: r.check.checked ?? [], locator: r.check.locator ?? null, note: r.check.note ?? null, checked_on: r.check.status === 'verified' ? mapping.checked_on : null } };
  });
  const byId = new Map(reports.map((r) => [r.id, r]));
  const findings = mapping.findings.map((f) => {
    const out = Object.fromEntries(FINDING_FIELDS.map((k) => [k, f[k] ?? null]));
    const row = rows.get(f.report);
    const ci = REPORT_COLUMNS.indexOf(f.cell.column);
    return {
      ...out,
      check: { status: f.check.status, phrase: f.check.status === 'verified' ? f.check.phrase : null, checked_on: f.check.status === 'verified' ? mapping.checked_on : null },
      cell: { row: row.sheetRow, column: colLetter(ci), header: f.cell.column, excerpt: f.cell.excerpt },
      source_url: byId.get(f.report).url,
      numeric: isNum(f.value) || isNum(f.min) || Boolean(f.parts),
    };
  });
  // Original estimates: one original figure is one point of a series (estimate key, target year and kind, so a base case
  // and a high case of the same series stay apart). Findings that share that point are repeats of one estimate; a finding
  // without a key is its own origin.
  const originOf = (f) => (f.estimate ? `${f.estimate}@${f.target_year ?? ''}@${f.kind}` : `own:${f.id}`);
  const origins = new Map();
  for (const f of findings) {
    const key = originOf(f);
    if (!origins.has(key)) origins.set(key, new Set());
    origins.get(key).add(f.report);
  }
  for (const f of findings) {
    f.origin = originOf(f);
    f.appears_in = [...origins.get(f.origin)].sort();
  }
  const numericChecked = findings.filter((f) => f.numeric && f.check.status === 'verified');
  const coverage = reports.map((r) => ({
    report: r.id,
    themes: Object.fromEntries(THEMES.map((t) => [t.key, coverageState(rows.get(r.id), r, mapping.findings, t)])),
  }));
  return {
    title: 'Research Conclusions Atlas',
    question: 'What do the reports agree on, where do they diverge, and what assumptions drive the numbers?',
    note: 'Findings from the Reports tab of the Why Humanoid? workbook, reviewed one claim at a time. Checked findings were compared with the public original on the page given; only those are drawn. A figure repeated in several reports is one original estimate. Ranges across publishers show dispersion, not uncertainty. Reports are summarised and linked, never rehosted.',
    snapshot: { exported_at: exportedAt ?? null, built_at: builtAt ?? null, checked_on: mapping.checked_on },
    vocabulary: {
      themes: THEMES.map(({ key, label, question }) => ({ key, label, question })),
      kinds: { ...KINDS }, check_states: { ...CHECK_STATES }, coverage_states: { ...COVERAGE_STATES },
      metrics: Object.fromEntries(Object.entries(METRICS).map(([k, v]) => [k, v.label])), constraints: { ...CONSTRAINTS },
    },
    counts: {
      reports: reports.length,
      reports_checked: reports.filter((r) => r.check.status === 'verified').length,
      reports_unreachable: reports.filter((r) => r.check.status === 'pending_unreachable').length,
      findings: findings.length,
      findings_checked: findings.filter((f) => f.check.status === 'verified').length,
      findings_pending: findings.filter((f) => f.check.status === 'pending').length,
      findings_unreachable: findings.filter((f) => f.check.status === 'pending_unreachable').length,
      findings_withheld: findings.filter((f) => f.check.status === 'withheld').length,
      numeric_checked: numericChecked.length,
      original_estimates: origins.size,
      repeated_estimates: [...origins.values()].filter((s) => s.size > 1).length,
    },
    reports,
    coverage,
    findings,
  };
}

// The committed snapshot holds only public fields, no private link, and counts that match its rows.
export function snapshotProblems(atlas) {
  const problems = [];
  const fk = new Set([...FINDING_FIELDS, 'check', 'cell', 'source_url', 'numeric', 'appears_in', 'origin']);
  const rk = new Set([...REPORT_FIELDS, 'sheet_row', 'check']);
  for (const f of atlas.findings ?? []) for (const k of Object.keys(f)) if (!fk.has(k)) problems.push(`finding ${f.id}: field ${k} is not public`);
  for (const r of atlas.reports ?? []) for (const k of Object.keys(r)) if (!rk.has(k)) problems.push(`report ${r.id}: field ${k} is not public`);
  if (PRIVATE_LINK.test(JSON.stringify(atlas))) problems.push('holds a private Google link');
  if (/Source workbook|Grok/i.test(JSON.stringify(atlas.findings ?? []))) problems.push('holds the import history');
  const ids = new Set((atlas.reports ?? []).map((r) => r.id));
  for (const f of atlas.findings ?? []) if (!ids.has(f.report)) problems.push(`finding ${f.id}: unknown report`);
  const c = atlas.counts ?? {};
  if (c.reports !== ids.size) problems.push('counts.reports does not match');
  if (c.findings !== (atlas.findings ?? []).length) problems.push('counts.findings does not match');
  if (c.findings_checked !== (atlas.findings ?? []).filter((f) => f.check.status === 'verified').length) problems.push('counts.findings_checked does not match');
  return problems;
}
