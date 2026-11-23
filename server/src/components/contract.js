// Components data contract, version 1 (23 Nov 2026). Staging format for the Components research (Grok) before any
// master schema change. See ops/components-data-contract.md. This module validates a staging export; it imports
// nothing into D1 and publishes nothing.
//
// The staging workbook has exactly these tabs and header rows (row 1), one record per row, in English. Lists inside a
// cell are separated by " | ". Every fact row names its sources by source_id (cc_sources).

export const CONTRACT_VERSION = 1;

export const TABS = {
  cc_companies: [
    'company_id', 'name', 'legal_name', 'website', 'hq_country', 'organisation_type', 'listing_isin', 'listing_ticker',
    'listing_exchange', 'site_company_slug', 'humanoid_relevance', 'relevance_reason', 'source_ids', 'legacy_components_url',
    'reviewed_on',
  ],
  cc_roles: ['company_id', 'role', 'families', 'statement', 'source_ids'],
  cc_products: [
    'product_id', 'company_id', 'product_name', 'version', 'family', 'product_kind', 'availability', 'availability_as_of',
    'hardware_licence', 'software_licence', 'limitations', 'source_ids', 'legacy_components_url',
  ],
  cc_specs: ['product_id', 'spec', 'value', 'unit', 'conditions', 'source_id', 'locator'],
  cc_prices: ['product_id', 'price_kind', 'amount', 'currency', 'quantity_basis', 'price_date', 'source_id', 'locator'],
  cc_integrations: ['product_id', 'robot_or_platform', 'relation', 'statement', 'source_id', 'locator'],
  cc_sources: ['source_id', 'url', 'title', 'publisher', 'publication_date', 'accessed_on', 'source_role', 'language'],
  cc_investment_screen: ['investment_key', 'name', 'decision', 'families', 'reason', 'source_ids', 'reviewed_on'],
};

export const FAMILIES = [
  'actuator', 'motor', 'transmission', 'bearing', 'battery', 'bms', 'charging', 'tactile_sensor', 'force_torque_sensor',
  'vision_sensor', 'lidar', 'imu', 'encoder', 'compute', 'motion_controller', 'power_electronics', 'connector', 'cable',
  'material', 'magnet', 'thermal', 'hand_end_effector', 'software',
];
export const ORGANISATION_TYPES = ['company', 'research_lab', 'university', 'open_source_project', 'consortium'];
export const ROLES = ['manufacturer', 'designer', 'contract_manufacturer', 'distributor', 'reseller', 'integrator', 'research_developer', 'software_provider'];
export const RELEVANCE = ['documented_humanoid_supplier', 'documented_humanoid_product', 'candidate_needs_evidence', 'excluded'];
export const PRODUCT_KINDS = ['commercial_hardware', 'research_prototype', 'open_hardware', 'reference_design', 'software'];
export const AVAILABILITY = ['available', 'announced', 'sampling', 'discontinued', 'research_only', 'unknown'];
export const PRICE_KINDS = ['list_price', 'published_quote', 'estimated_bom', 'analyst_estimate'];
export const RELATIONS = ['documented_in_product', 'customer_reported', 'announced_partnership', 'research_demonstration'];
export const SOURCE_ROLES = ['manufacturer', 'distributor', 'customer', 'filing', 'research_paper', 'press', 'analyst', 'index_membership', 'other'];
export const SCREEN_DECISIONS = ['included', 'candidate_needs_evidence', 'excluded'];
// Sources that can prove a supply relation or a product fact. index_membership (ETF, index) and analyst never can.
export const EVIDENCE_ROLES = new Set(['manufacturer', 'distributor', 'customer', 'filing', 'research_paper', 'press']);

// Spec vocabulary: name -> allowed units. A spec outside this list, or a unit outside its list, is rejected; extend the
// list in a reviewed change instead of inventing names in the sheet.
export const SPECS = {
  rated_torque: ['N·m'], peak_torque: ['N·m'], rated_speed: ['rpm'], gear_ratio: ['ratio'], backlash: ['arcmin'],
  mass: ['g', 'kg'], outer_diameter: ['mm'], length: ['mm'], rated_voltage: ['V'], rated_current: ['A'], power: ['W', 'kW'],
  efficiency: ['%'], torque_density: ['N·m/kg'], dynamic_load_rating: ['kN'], static_load_rating: ['kN'],
  capacity: ['Ah', 'Wh', 'kWh'], energy_density: ['Wh/kg', 'Wh/L'], cycle_life: ['cycles'], charge_power: ['W', 'kW'],
  chemistry: ['text'], sensing_principle: ['text'], taxel_count: ['count'], spatial_resolution: ['mm'], force_range: ['N'],
  force_resolution: ['N', 'mN'], sampling_rate: ['Hz', 'kHz'], resolution: ['px', 'MP'], field_of_view: ['deg'],
  range: ['m', 'mm'], depth_accuracy: ['mm', '%'], frame_rate: ['fps', 'Hz'], channels: ['count'], ai_performance: ['TOPS', 'TFLOPS'],
  memory: ['GB'], power_draw: ['W'], interface: ['text'], ip_rating: ['text'], operating_temperature: ['°C'], encoder_resolution: ['bit', 'counts/rev'],
  remanence: ['T'], coercivity: ['kA/m'], thermal_conductivity: ['W/(m·K)'], degrees_of_freedom: ['count'], payload: ['kg', 'g'],
};

const ID = {
  company_id: /^cco_[a-z0-9]+(-[a-z0-9]+)*$/,
  product_id: /^cpr_[a-z0-9]+(-[a-z0-9]+)*__[a-z0-9]+(-[a-z0-9]+)*$/,
  source_id: /^csr_[a-z0-9]+(-[a-z0-9]+)*$/,
};
const PRIVATE = /docs\.google\.com|drive\.google\.com|googleusercontent\.com|\/spreadsheets\/d\//i;
const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const list = (v) => String(v ?? '').split('|').map((s) => s.trim()).filter(Boolean);
const nz = (v) => v !== null && v !== undefined && String(v).trim() !== '';

// tabs: { tabName: [headerRow, ...rows] } as tools/workbook-xlsx-to-json.py writes it.
// investmentKeys (optional): every key of the Investment tab (ISIN, else TICKER:EXCHANGE) to check full screening coverage.
export function validateStaging(tabs, { investmentKeys = null } = {}) {
  const problems = [];
  const records = {};
  for (const [tab, headers] of Object.entries(TABS)) {
    const rows = tabs[tab];
    if (!rows) { problems.push(`tab ${tab} missing`); records[tab] = []; continue; }
    const actual = (rows[0] ?? []).map((h) => String(h ?? '').trim());
    if (JSON.stringify(actual.slice(0, headers.length)) !== JSON.stringify(headers) || actual.slice(headers.length).some(Boolean)) problems.push(`${tab}: header row must be exactly ${headers.join(', ')}`);
    records[tab] = rows.slice(1).filter((r) => r.some(nz)).map((r, i) => ({ _row: i + 2, ...Object.fromEntries(headers.map((h, j) => [h, nz(r[j]) ? String(r[j]).trim() : null])) }));
  }
  for (const extra of Object.keys(tabs)) if (!TABS[extra]) problems.push(`unexpected tab ${extra}`);
  const at = (tab, r) => `${tab} row ${r._row}`;
  const unique = (tab, key) => {
    const seen = new Set();
    for (const r of records[tab]) { if (seen.has(r[key])) problems.push(`${at(tab, r)}: duplicate ${key} ${r[key]}`); seen.add(r[key]); }
    return seen;
  };
  const enumOk = (tab, r, f, allowed, required = true) => { if (nz(r[f]) ? !allowed.includes(r[f]) : required) problems.push(`${at(tab, r)}: ${f} must be one of ${allowed.join(', ')}`); };

  // Sources first: everything else points at them.
  const sources = new Map();
  for (const r of records.cc_sources) {
    if (!ID.source_id.test(r.source_id ?? '')) problems.push(`${at('cc_sources', r)}: source_id ${r.source_id}`);
    if (!/^https:\/\//.test(r.url ?? '') || PRIVATE.test(r.url ?? '')) problems.push(`${at('cc_sources', r)}: url must be a public https address (no Google sheet, Docs or Drive file)`);
    if (!nz(r.title) || !nz(r.publisher)) problems.push(`${at('cc_sources', r)}: title and publisher required`);
    if (nz(r.publication_date) && !DATE.test(r.publication_date)) problems.push(`${at('cc_sources', r)}: publication_date YYYY[-MM[-DD]]`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.accessed_on ?? '')) problems.push(`${at('cc_sources', r)}: accessed_on YYYY-MM-DD`);
    enumOk('cc_sources', r, 'source_role', SOURCE_ROLES);
    sources.set(r.source_id, r);
  }
  unique('cc_sources', 'source_id');
  const needSources = (tab, r, field = 'source_ids', { evidence = false } = {}) => {
    const ids = list(r[field]);
    if (!ids.length) { problems.push(`${at(tab, r)}: ${field} required`); return []; }
    for (const id of ids) if (!sources.has(id)) problems.push(`${at(tab, r)}: unknown source ${id}`);
    if (evidence && !ids.some((id) => EVIDENCE_ROLES.has(sources.get(id)?.source_role))) problems.push(`${at(tab, r)}: needs at least one evidence source (manufacturer, distributor, customer, filing, research_paper or press); index membership or an analyst note is not evidence`);
    return ids;
  };

  const companies = unique('cc_companies', 'company_id');
  const names = new Map();
  for (const r of records.cc_companies) {
    if (!ID.company_id.test(r.company_id ?? '')) problems.push(`${at('cc_companies', r)}: company_id cco_<slug>`);
    if (!nz(r.name)) problems.push(`${at('cc_companies', r)}: name required`);
    const key = String(r.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (names.has(key)) problems.push(`${at('cc_companies', r)}: same name as ${names.get(key)}; one company, one record`); else names.set(key, r.company_id);
    if (nz(r.website) && (!/^https?:\/\//.test(r.website) || PRIVATE.test(r.website))) problems.push(`${at('cc_companies', r)}: website must be a public address`);
    enumOk('cc_companies', r, 'organisation_type', ORGANISATION_TYPES);
    enumOk('cc_companies', r, 'humanoid_relevance', RELEVANCE);
    if (nz(r.listing_isin) && !/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(r.listing_isin)) problems.push(`${at('cc_companies', r)}: listing_isin`);
    if (!nz(r.relevance_reason)) problems.push(`${at('cc_companies', r)}: relevance_reason required`);
    needSources('cc_companies', r, 'source_ids', { evidence: ['documented_humanoid_supplier', 'documented_humanoid_product'].includes(r.humanoid_relevance) });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.reviewed_on ?? '')) problems.push(`${at('cc_companies', r)}: reviewed_on YYYY-MM-DD`);
  }
  for (const r of records.cc_roles) {
    if (!companies.has(r.company_id)) problems.push(`${at('cc_roles', r)}: unknown company ${r.company_id}`);
    enumOk('cc_roles', r, 'role', ROLES);
    for (const f of list(r.families)) if (!FAMILIES.includes(f)) problems.push(`${at('cc_roles', r)}: family ${f}`);
    if (!nz(r.statement)) problems.push(`${at('cc_roles', r)}: statement required (what the source says)`);
    needSources('cc_roles', r, 'source_ids', { evidence: true });
  }
  const products = unique('cc_products', 'product_id');
  for (const r of records.cc_products) {
    if (!ID.product_id.test(r.product_id ?? '')) problems.push(`${at('cc_products', r)}: product_id cpr_<company-slug>__<product-slug>`);
    if (!companies.has(r.company_id)) problems.push(`${at('cc_products', r)}: unknown company ${r.company_id}`);
    else if (r.product_id && !r.product_id.startsWith(`cpr_${r.company_id.slice(4)}__`)) problems.push(`${at('cc_products', r)}: product_id must start with its company slug`);
    if (!nz(r.product_name)) problems.push(`${at('cc_products', r)}: product_name required`);
    if (!FAMILIES.includes(r.family)) problems.push(`${at('cc_products', r)}: family ${r.family}`);
    enumOk('cc_products', r, 'product_kind', PRODUCT_KINDS);
    enumOk('cc_products', r, 'availability', AVAILABILITY);
    if (r.product_kind === 'research_prototype' && ['available', 'sampling'].includes(r.availability)) problems.push(`${at('cc_products', r)}: a research prototype is not available as a commercial product`);
    if (nz(r.availability_as_of) && !DATE.test(r.availability_as_of)) problems.push(`${at('cc_products', r)}: availability_as_of`);
    needSources('cc_products', r, 'source_ids', { evidence: true });
  }
  for (const r of records.cc_specs) {
    if (!products.has(r.product_id)) problems.push(`${at('cc_specs', r)}: unknown product ${r.product_id}`);
    const units = SPECS[r.spec];
    if (!units) problems.push(`${at('cc_specs', r)}: spec ${r.spec} is not in the vocabulary`);
    else if (!units.includes(r.unit)) problems.push(`${at('cc_specs', r)}: unit ${r.unit} for ${r.spec}; allowed ${units.join(', ')}`);
    if (!nz(r.value)) problems.push(`${at('cc_specs', r)}: value required`);
    if (units && units[0] !== 'text' && !/^[<>~≤≥]?\s?-?\d+(\.\d+)?(\s?(-|to)\s?-?\d+(\.\d+)?)?$/.test(r.value ?? '')) problems.push(`${at('cc_specs', r)}: value must be a number or a range; put words in conditions`);
    if (!sources.has(r.source_id)) problems.push(`${at('cc_specs', r)}: source_id required`);
    else if (!EVIDENCE_ROLES.has(sources.get(r.source_id).source_role)) problems.push(`${at('cc_specs', r)}: a specification needs an evidence source`);
  }
  for (const r of records.cc_prices) {
    if (!products.has(r.product_id)) problems.push(`${at('cc_prices', r)}: unknown product ${r.product_id}`);
    enumOk('cc_prices', r, 'price_kind', PRICE_KINDS);
    if (!/^\d+(\.\d+)?$/.test(r.amount ?? '')) problems.push(`${at('cc_prices', r)}: amount must be a number`);
    if (!/^[A-Z]{3}$/.test(r.currency ?? '')) problems.push(`${at('cc_prices', r)}: currency ISO 4217`);
    if (!nz(r.quantity_basis)) problems.push(`${at('cc_prices', r)}: quantity_basis required (per unit, per 1,000 units...)`);
    if (!DATE.test(r.price_date ?? '')) problems.push(`${at('cc_prices', r)}: price_date required`);
    if (!sources.has(r.source_id)) problems.push(`${at('cc_prices', r)}: source_id required`);
    else if (['list_price', 'published_quote'].includes(r.price_kind) && !['manufacturer', 'distributor'].includes(sources.get(r.source_id).source_role)) problems.push(`${at('cc_prices', r)}: a list price or quote comes from the manufacturer or a distributor; anything else is an estimate`);
  }
  for (const r of records.cc_integrations) {
    if (!products.has(r.product_id)) problems.push(`${at('cc_integrations', r)}: unknown product ${r.product_id}`);
    enumOk('cc_integrations', r, 'relation', RELATIONS);
    if (!nz(r.robot_or_platform) || !nz(r.statement)) problems.push(`${at('cc_integrations', r)}: robot_or_platform and statement required`);
    if (!sources.has(r.source_id)) problems.push(`${at('cc_integrations', r)}: source_id required`);
    else if (!EVIDENCE_ROLES.has(sources.get(r.source_id).source_role)) problems.push(`${at('cc_integrations', r)}: an integration needs an evidence source`);
  }
  const screened = new Map();
  for (const r of records.cc_investment_screen) {
    if (!nz(r.investment_key)) problems.push(`${at('cc_investment_screen', r)}: investment_key (ISIN, else TICKER:EXCHANGE)`);
    if (screened.has(r.investment_key)) problems.push(`${at('cc_investment_screen', r)}: ${r.investment_key} screened twice`);
    screened.set(r.investment_key, r);
    enumOk('cc_investment_screen', r, 'decision', SCREEN_DECISIONS);
    for (const f of list(r.families)) if (!FAMILIES.includes(f)) problems.push(`${at('cc_investment_screen', r)}: family ${f}`);
    if (!nz(r.reason)) problems.push(`${at('cc_investment_screen', r)}: reason required, also for excluded`);
    if (r.decision === 'included') needSources('cc_investment_screen', r, 'source_ids', { evidence: true });
    else if (nz(r.source_ids)) needSources('cc_investment_screen', r);
  }
  if (investmentKeys) {
    for (const k of investmentKeys) if (!screened.has(k)) problems.push(`cc_investment_screen: ${k} not screened`);
    for (const k of screened.keys()) if (!investmentKeys.includes(k)) problems.push(`cc_investment_screen: ${k} is not an Investment row`);
  }
  // A source nobody cites is noise; a cited source must exist (checked above).
  const cited = new Set(Object.values(records).flat().flatMap((r) => [...list(r.source_ids), ...(r.source_id && !r.url ? [r.source_id] : [])]));
  for (const id of sources.keys()) if (!cited.has(id)) problems.push(`cc_sources: ${id} is not cited by any record`);
  const counts = Object.fromEntries(Object.entries(records).map(([t, rs]) => [t, rs.length]));
  return { problems, counts, records };
}

// Public projection (explicit allowlist): what a visitor may see of a Components company once the schema is live.
// Components is a subscription category: products' specifications, prices, integrations, limitations, statements and
// sources are for subscribers only.
export const PUBLIC_COMPANY_FIELDS = ['company_id', 'name', 'website', 'hq_country', 'organisation_type', 'site_company_slug'];
export function publicProjection(records) {
  return records.cc_companies.filter((c) => c.humanoid_relevance !== 'excluded').map((c) => ({
    ...Object.fromEntries(PUBLIC_COMPANY_FIELDS.map((f) => [f, c[f] ?? null])),
    roles: [...new Set(records.cc_roles.filter((r) => r.company_id === c.company_id).map((r) => r.role))],
    families: [...new Set([...records.cc_roles.filter((r) => r.company_id === c.company_id).flatMap((r) => list(r.families)), ...records.cc_products.filter((p) => p.company_id === c.company_id).map((p) => p.family)])],
    products: records.cc_products.filter((p) => p.company_id === c.company_id).length,
  }));
}
