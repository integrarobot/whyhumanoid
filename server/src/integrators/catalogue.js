// Integrators (Javier, 24 Nov 2026): the provider catalogue of the Integrators tab (sheetId 1407250335, native table
// IntegratorsCatalog A1:Z29). One provider per row, keyed by PROVIDER ID; 26 columns. Free in full: every row and
// every field is public. Shared by the backend import (server/src/datasets.js) and the build tools, so both read the
// tab the same way:
//
// - The header row must be exactly INTEGRATOR_HEADERS and every row must carry a well-formed, unique provider id, a
//   known catalogue status, a website, sources and a review date. Anything else stops the import: nothing is
//   published by accident, and an old three-column snapshot can never come back silently.
// - Values are kept as the sheet states them. "Not established in reviewed sources" and similar statements stay as
//   written and are shown as unknown, never as an empty cell or a guess.
// - The derived tags below (roles, services, platforms, sectors, stated service territory) are read from the cell
//   text with fixed vocabularies. A term outside the vocabulary is not tagged; the cell is always shown in full.
// - Counting rule (Javier, 24 Nov 2026): CATALOG STATUS decides who counts as a humanoid-specific provider. The
//   requested specialist exception (CA3) and the records whose humanoid scope is unconfirmed never do.

export const INTEGRATOR_HEADERS = Object.freeze([
  'NAME', 'URL', 'DESCRIPTION', 'PROVIDER ID', 'CANONICAL NAME', 'ROLES', 'EVIDENCED LOCATION', 'SERVICE COVERAGE',
  'HUMANOID PLATFORMS', 'SERVICES', 'SECTORS', 'HUMANOID CLAIM STATUS', 'EVIDENCE STAGE', 'HUMANOID PROJECT',
  'SOFTWARE STACK', 'TELEOPERATION AND DATA', 'SUPPORT', 'DELIVERY MODEL', 'PRICING', 'SOURCE URLS', 'SOURCE DATES',
  'REVIEWED AT', 'VERIFICATION', 'LIMITATIONS', 'CATALOG STATUS', 'SELECTION BASIS',
]);

export const INTEGRATOR_FIELDS = Object.freeze(INTEGRATOR_HEADERS.map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_')));

// Field labels for pages, in sheet order.
export const FIELD_LABELS = Object.freeze({
  name: 'Name', url: 'Website', description: 'Description', provider_id: 'Provider id', canonical_name: 'Canonical name',
  roles: 'Roles', evidenced_location: 'Evidenced location', service_coverage: 'Service coverage',
  humanoid_platforms: 'Humanoid platforms', services: 'Services', sectors: 'Sectors',
  humanoid_claim_status: 'Humanoid claim status', evidence_stage: 'Evidence stage', humanoid_project: 'Humanoid project',
  software_stack: 'Software stack', teleoperation_and_data: 'Teleoperation and data', support: 'Support',
  delivery_model: 'Delivery model', pricing: 'Pricing', source_urls: 'Sources', source_dates: 'Source dates',
  reviewed_at: 'Reviewed', verification: 'Verification', limitations: 'Limitations', catalog_status: 'Catalogue status',
  selection_basis: 'Selection basis',
});

// CATALOG STATUS -> counting class. A new status fails the import until it is reviewed here.
export const CATALOG_STATUS = Object.freeze({
  'Humanoid-specific provider': 'humanoid',
  'Requested specialist exception; exclude from validated humanoid-provider counts': 'exception',
  'Existing adjacent record; humanoid eligibility unconfirmed': 'unconfirmed',
  'Existing record; current humanoid scope needs reconfirmation': 'unconfirmed',
});

export const STATUS_CLASSES = Object.freeze({
  humanoid: { label: 'Humanoid-specific provider', short: 'Humanoid-specific', note: 'Explicit humanoid work or offering in reviewed sources. Not a validation of production results.' },
  exception: { label: 'Requested specialist exception', short: 'Specialist exception', note: 'Included at the editor’s request as a specialist exception. Not counted as a humanoid provider.' },
  unconfirmed: { label: 'Humanoid scope unconfirmed', short: 'Scope unconfirmed', note: 'Not counted as a humanoid provider.' },
});

const ID = /^int_[a-z0-9]+(?:_[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HTTP = /^https?:\/\/[^\s]+$/;
const REQUIRED = ['name', 'url', 'description', 'provider_id', 'canonical_name', 'roles', 'humanoid_claim_status', 'evidence_stage', 'source_urls', 'reviewed_at', 'verification', 'limitations', 'catalog_status'];

const text = (v) => (v === null || v === undefined ? '' : String(v).trim());

// The provider block: header row, then one provider per non-empty row. Throws on any surprise (the import reports it).
export function selectIntegrators(values) {
  const header = (values[0] ?? []).map(text);
  // A different header row (the old three-column directory, a renamed column) is reported as header drift by the
  // import's own header check, before any row is read.
  if (header.length !== INTEGRATOR_HEADERS.length || header.some((h, i) => h !== INTEGRATOR_HEADERS[i])) return { header, rows: [] };
  const rows = [];
  const seen = new Map();
  values.slice(1).forEach((row, i) => {
    const sheetRow = i + 2;
    if (!(row ?? []).some((v) => text(v) !== '')) return;
    const d = Object.fromEntries(INTEGRATOR_FIELDS.map((f, c) => [f, text(row[c])]));
    const where = `Integrators sheet row ${sheetRow}`;
    for (const f of REQUIRED) if (!d[f]) throw new Error(`${where}: ${FIELD_LABELS[f]} is empty`);
    if (!ID.test(d.provider_id)) throw new Error(`${where}: provider id "${d.provider_id}" is not of the form int_<name>`);
    if (seen.has(d.provider_id)) throw new Error(`${where}: provider id ${d.provider_id} repeats sheet row ${seen.get(d.provider_id)}`);
    seen.set(d.provider_id, sheetRow);
    if (!HTTP.test(d.url)) throw new Error(`${where}: website is not an http(s) address`);
    for (const u of sourceUrls(d.source_urls)) if (!HTTP.test(u)) throw new Error(`${where}: a source is not an http(s) address`);
    if (!DATE.test(d.reviewed_at)) throw new Error(`${where}: reviewed date "${d.reviewed_at}" is not YYYY-MM-DD`);
    if (!CATALOG_STATUS[d.catalog_status]) throw new Error(`${where}: catalogue status "${d.catalog_status}" is not reviewed in server/src/integrators/catalogue.js`);
    rows.push({ sheetRow, row });
  });
  if (!rows.length) throw new Error('Integrators: no provider rows');
  return { header, rows };
}

// SOURCE URLS holds one or more addresses, one per line.
export const sourceUrls = (v) => text(v).split(/\s*\n\s*/).map((s) => s.trim()).filter(Boolean);

// A statement that the reviewed sources do not establish the value. Shown as unknown, with the sheet's own words.
export const isUnknown = (v) => !text(v) || /^(not established|none established|not stated|not disclosed|not published|humanoid integration project price not published)\b/i.test(text(v));

export const statusClass = (d) => CATALOG_STATUS[text(d.catalog_status)] ?? null;

// Display name: the canonical name without its qualifiers ("Synergy Tech (Syn-Tech; legacy Syntech)" -> "Synergy
// Tech"; "Reply / Area42 robotics" -> "Reply"). The full canonical name is always shown on the profile.
export const displayName = (d) => text(d.canonical_name).split(/\s+\(|\s+\/\s+/)[0].trim() || text(d.name);

// Clause-level reading: a clause that says the capability is not established does not count as having it.
const clauses = (v) => text(v).split(/\s*;\s*/).filter(Boolean);
// "Listed as an application" names what a robot can be used for, not a service the provider delivers.
const NEGATED = /\bnot (established|published|disclosed)\b|\bunvalidated\b|\bto confirm\b|\blisted as an application\b/i;
// Training of people (operators, teams, clients), not training of a robot policy or a digital twin.
const PEOPLE_TRAINING = /\b(operator|team|client|client-team|staff) training\b|^training\b|\btraining support\b|\band training\b|familiarisation|handover/i;
const positive = (v, re) => clauses(v).some((c) => re.test(c) && !NEGATED.test(c));

// ---- Vocabularies. Each: id, label, test over the provider's cells. Order is presentation order, not a ranking.
export const ROLE_CLASSES = Object.freeze([
  { id: 'distribution', label: 'Distribution and supply', test: (d) => /distribut|reseller/i.test(d.roles) },
  { id: 'integration', label: 'System integration', test: (d) => /integrat/i.test(d.roles) },
  { id: 'software', label: 'Software and AI', test: (d) => /software|learning|developer|\bHRI\b|\bAI\b|application developer|motion-program/i.test(d.roles) },
  { id: 'engineering', label: 'Engineering and R&D', test: (d) => /engineering|R&D|research collaboration|consulting|solution design|simulation/i.test(d.roles) },
  { id: 'training', label: 'Training', test: (d) => /training/i.test(d.roles) },
  { id: 'support', label: 'Maintenance and support', test: (d) => /maintenance|repair|support|lifecycle/i.test(d.roles) },
  { id: 'operations', label: 'Operations and pilots', test: (d) => /\boperator\b|supervised operations|pilot integrator|evaluation/i.test(d.roles) },
]);

export const SERVICE_CLASSES = Object.freeze([
  { id: 'assessment', label: 'Assessment and selection', test: (d) => positive(d.services, /assessment|audit|feasibility|qualification|scoping|survey|requirements|use-case|selection|advice|consulting/i) },
  { id: 'design', label: 'Solution and workflow design', test: (d) => positive(d.services, /design|workflow|planning|operations design|protocol/i) },
  // "Deployment support" and "deployment planning" are support and planning, not integration work.
  { id: 'integration', label: 'Integration and commissioning', test: (d) => positive(d.services, /integration|commissioning|installation|configuration|deployment(?! support| planning)|mapping|fit-out|fitting|connectivity/i) },
  { id: 'software', label: 'Software and AI development', test: (d) => positive(d.services, /programming|software|development|SDK|ROS|driver|perception|navigation|motion|policy|learning|\bAI\b|VLA|simulation|digital.twin|conversation|governance|regression/i) },
  { id: 'teleoperation', label: 'Teleoperation', test: (d) => positive(d.services, /teleoperat|teletrain/i) || positive(d.teleoperation_and_data, /teleoperat|teletrain|operator controls|exosuit|\bXR\b/i) },
  { id: 'pilots', label: 'Pilots and proofs of concept', test: (d) => positive(d.services, /\bPoC\b|pilot|proof of concept|trial|validation|evaluation/i) || positive(d.delivery_model, /\bPoC\b|pilot|proof of concept/i) },
  { id: 'safety', label: 'Safety integration or assessment', test: (d) => positive(d.services, /safety|risk assessment/i) },
  { id: 'training', label: 'Training of people', test: (d) => positive(d.services, PEOPLE_TRAINING) || positive(d.support, PEOPLE_TRAINING) },
  { id: 'support', label: 'Maintenance and support', test: (d) => positive(d.services, /maintenance|repair|support|RMA|warranty|monitoring|diagnostics|after-sales/i) || positive(d.support, /maintenance|repair|support|RMA|spares|warranty|monitoring|diagnostics|after-sales/i) },
  // Robots run by the provider's own operators (events, dispatch). Robots-as-a-service leasing is not an operated service.
  { id: 'operations', label: 'Operated service', test: (d) => positive(d.services, /event operation|dispatch|operated/i) || positive(d.delivery_model, /operated|dispatch|Labor as a Service/i) },
]);

// Platforms named in HUMANOID PLATFORMS. Brand level, plus the Unitree models the tab names most. "Referenced" or
// conditional wording stays in the cell text shown next to the tags.
export const PLATFORMS = Object.freeze([
  { id: 'unitree', label: 'Unitree (any model)', maker: 'Unitree', test: (t) => /unitree/i.test(t) },
  { id: 'unitree-g1', label: 'Unitree G1', maker: 'Unitree', test: (t) => /unitree/i.test(t) && /\bG1\b/.test(t) },
  { id: 'unitree-h1', label: 'Unitree H1', maker: 'Unitree', test: (t) => /unitree/i.test(t) && /\bH1\b/.test(t) },
  { id: 'unitree-h2', label: 'Unitree H2', maker: 'Unitree', test: (t) => /unitree/i.test(t) && /\bH2\b/.test(t) },
  { id: 'unitree-r1', label: 'Unitree R1', maker: 'Unitree', test: (t) => /unitree/i.test(t) && /\bR1\b/.test(t) },
  { id: 'agility', label: 'Agility Robotics Digit', maker: 'Agility Robotics', test: (t) => /agility|\bdigit\b/i.test(t) },
  { id: 'ubtech', label: 'UBTECH', maker: 'UBTECH', test: (t) => /ubtech/i.test(t) },
  { id: 'pudu', label: 'PUDU (bipedal and semi-humanoid)', maker: 'PUDU', test: (t) => /pudu/i.test(t) },
  { id: 'nao', label: 'NAO', maker: null, test: (t) => /\bNAO\b/.test(t) },
  { id: 'atlas', label: 'Boston Dynamics Atlas (referenced)', maker: 'Boston Dynamics', test: (t) => /\batlas\b/i.test(t) },
]);
export const NO_PLATFORM = Object.freeze({ id: 'none', label: 'No humanoid platform named' });

export const SECTORS = Object.freeze([
  { id: 'manufacturing', label: 'Manufacturing and industry', re: /manufactur|industr|automotive|chemical|nuclear|factory/i },
  { id: 'logistics', label: 'Warehousing and logistics', re: /warehous|logistic|fulfil|supply chain|ecommerce/i },
  { id: 'research', label: 'Research and education', re: /research|education|universit|laborator|\bR&D\b|\bHRI\b|robotics development/i },
  { id: 'retail', label: 'Retail, hospitality and reception', re: /retail|hospitality|showroom|reception|customer service|brand interaction|offices|visitor/i },
  { id: 'healthcare', label: 'Healthcare', re: /health/i },
  { id: 'events', label: 'Events and demonstrations', re: /event|demonstration/i },
  { id: 'inspection', label: 'Inspection, infrastructure and security', re: /inspection|infrastructure|security|asset audit|data cent/i },
  { id: 'airports', label: 'Airports and ground handling', re: /airport|ground-handling/i },
]);

// Places named in SERVICE COVERAGE (never in EVIDENCED LOCATION: a headquarters is not a service territory).
export const TERRITORIES = Object.freeze([
  { id: 'spain', label: 'Spain', re: /\bSpain\b/ },
  { id: 'portugal', label: 'Portugal', re: /\bPortugal\b/ },
  { id: 'andorra', label: 'Andorra', re: /\bAndorra\b/ },
  { id: 'france', label: 'France', re: /\bFrance\b/ },
  { id: 'germany', label: 'Germany', re: /\bGerman(y|-based)\b/ },
  { id: 'finland', label: 'Finland', re: /\bFinland\b/ },
  { id: 'poland', label: 'Poland', re: /\bPoland\b/ },
  { id: 'romania', label: 'Romania', re: /\bRomania\b/ },
  { id: 'europe', label: 'Europe (stated)', re: /\bEurope\b/ },
  { id: 'united-states', label: 'United States', re: /\bUnited States\b/ },
  { id: 'north-america', label: 'North America (stated)', re: /\bNorth America\b/ },
  { id: 'japan', label: 'Japan', re: /\bJapan\b/ },
  { id: 'australia', label: 'Australia', re: /\bAustralia\b/ },
  { id: 'new-zealand', label: 'New Zealand', re: /\bNew Zealand\b/ },
  { id: 'worldwide', label: 'Worldwide (stated)', re: /\bworldwide\b/i },
]);
export const NO_TERRITORY = Object.freeze({ id: 'not-established', label: 'Not established' });

// Every tag of one provider, from its own cells.
export function tagsOf(d) {
  const platformText = text(d.humanoid_platforms);
  const platforms = PLATFORMS.filter((p) => p.test(platformText)).map((p) => p.id);
  const territories = isUnknown(d.service_coverage) ? [] : TERRITORIES.filter((t) => t.re.test(text(d.service_coverage))).map((t) => t.id);
  return {
    roles: ROLE_CLASSES.filter((r) => r.test(d)).map((r) => r.id),
    services: SERVICE_CLASSES.filter((s) => s.test(d)).map((s) => s.id),
    platforms: platforms.length ? platforms : [NO_PLATFORM.id],
    sectors: SECTORS.filter((s) => s.re.test(text(d.sectors))).map((s) => s.id),
    territories: territories.length ? territories : [NO_TERRITORY.id],
  };
}

// Fields whose "established or not" is worth showing across the catalogue (the coverage overview).
export const COVERAGE_FIELDS = Object.freeze(['evidenced_location', 'service_coverage', 'humanoid_platforms', 'humanoid_project', 'software_stack', 'teleoperation_and_data', 'support', 'delivery_model', 'pricing', 'source_dates']);
