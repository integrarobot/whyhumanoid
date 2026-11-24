// Public projection (Javier, 17 Nov 2026: approved split of task 6, phase 1). What anyone may see about every
// company and catalogue robot, computed from the FULL Deployments and Entities rows through an allowlist. The Worker
// uses it for the visitor search and tools/export-public.mjs for the static pages, so both publish the same thing.
//
// Public, as counts and summaries: organisation, recorded maker and model, deployment country, sector, status label
// (as recorded, not verified) and year; for the selected evidence also who reports it and its source (Javier, 24 Nov
// 2026: sources and review state are public, server/src/access/fields.js). Public identity from Entities: canonical
// name, type, reference URL and review date. Never: site, city, region, task description, workflow, integration,
// metrics, claim text, claim type, confidence, evidence level, observation dates, open questions or notes.

const NA = /^(not\b|n\/?a$|unknown$|unspecified$|none$|tbd$)/i;
const has = (v) => v !== null && v !== undefined && String(v).trim() !== '' && !NA.test(String(v).trim());

// Status as recorded in the sheet, in four labels. A vendor's claim of operation is "unconfirmed".
export const STATUS_KEYS = ['op', 'pilot', 'ann', 'unc'];
export const STATUS_LABELS = { op: 'In operation', pilot: 'Pilot or trial', ann: 'Announced', unc: 'Unconfirmed' };
export const statusKey = (v) => {
  const s = String(v ?? '').toLowerCase();
  return s === 'operational' ? 'op' : s === 'pilot' || s === 'testing' ? 'pilot' : s === 'planned' ? 'ann' : 'unc';
};
const yearOf = (r) => (String(r.observed_start ?? '').match(/^(\d{4})/) ?? String(r.publication_date ?? '').match(/^(\d{4})/) ?? [])[1] ?? null;
const span = (ys) => { const v = ys.filter(Boolean).map(Number).sort((a, b) => a - b); return v.length ? [v[0], v.at(-1)] : null; };
const uniq = (xs) => [...new Set(xs.filter(has).map((x) => String(x).trim()))].sort((a, b) => a.localeCompare(b));
const recordedRobot = (r) => [r.manufacturer, r.robot_model].filter(has).join(' ');

// One slug per company: its id without the prefix; on a clash the full id keeps them apart.
export function assignSlugs(companies) {
  const seen = new Map();
  for (const c of companies) {
    let s = c.id.replace(/^(mfr|org)_/, '').replace(/_/g, '-');
    if (seen.has(s)) s = c.id.replace(/_/g, '-');
    if (seen.has(s)) throw new Error(`company slug clash: ${c.id} and ${seen.get(s)}`);
    seen.set(s, c.id);
    c.slug = s;
  }
  return companies;
}

// Counterparts of a set of records, grouped by the other company and the robot as recorded.
function counterparts(items, other) {
  const groups = new Map();
  for (const { g, r } of items) {
    const o = other(g, r);
    const key = `${o.id ?? o.name}|${recordedRobot(r)}`;
    if (!groups.has(key)) groups.set(key, { name: o.name, company: o.id, robot_recorded: recordedRobot(r) || null, robot: g.robot, level: g.level, status: Object.fromEntries(STATUS_KEYS.map((k) => [k, 0])), years: [], records: 0 });
    const x = groups.get(key);
    x.status[statusKey(r.operational_status)] += 1;
    if (x.robot === null && g.robot !== null) { x.robot = g.robot; x.level = g.level; }
    x.years.push(yearOf(r));
    x.records += 1;
  }
  return [...groups.values()]
    .map((x) => ({ ...x, years: span(x.years), level: x.robot === null ? null : x.level }))
    .sort((a, b) => b.records - a.records || String(a.name).localeCompare(String(b.name)));
}

function summary(items, other) {
  const status = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
  for (const { r } of items) status[statusKey(r.operational_status)] += 1;
  return {
    records: items.length,
    status,
    sectors: uniq(items.map(({ r }) => r.sector)),
    site_countries: uniq(items.map(({ r }) => r.country)),
    years: span(items.map(({ r }) => yearOf(r))),
    counterparts: counterparts(items, other),
  };
}

// Aggregates for the public report (approved split, phase 2): records by status, sector, deployment country and year.
// A cell with fewer than MIN_CELL records goes into "other", so no count points at a single record.
export const MIN_CELL = 3;
function tally(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const kept = [...counts].filter(([k, n]) => k !== null && n >= MIN_CELL).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  const other = values.length - kept.reduce((n, [, x]) => n + x, 0);
  return [...kept.map(([key, records]) => ({ key, records })), ...(other ? [{ key: 'other', records: other }] : [])];
}
function aggregates(items) {
  const status = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
  for (const { r } of items) status[statusKey(r.operational_status)] += 1;
  return {
    min_cell: MIN_CELL,
    by_status: status,
    by_sector: tally(items.map(({ r }) => (has(r.sector) ? String(r.sector).trim() : null))),
    by_country: tally(items.map(({ r }) => (has(r.country) ? String(r.country).trim() : null))),
    by_year: tally(items.map(({ r }) => yearOf(r))).sort((a, b) => (a.key === 'other') - (b.key === 'other') || String(a.key).localeCompare(String(b.key))),
  };
}

// Selected evidence (approved split, phase 2; fields narrowed on 24 Nov 2026 to the public fields of
// server/src/access/fields.js): one record per company and per catalogue robot, picked by a fixed rule. Eligible: a
// source URL and a verification other than unresolved. Order: most advanced status (operation, pilot or testing,
// vendor-claimed operation, planned), primary source (customer, maker or partner) before press, customer confirmation
// before partner, vendor and media reports, latest publication, sheet order. Shown with the organisation, the robot as
// recorded, the country, the status, who reports it and the source; site, task, metrics, evidence level and dates of
// observation are paid detail.
const STATUS_RANK = { operational: 0, pilot: 1, testing: 1, vendor_claimed_operational: 2, planned: 3 };
const PRIMARY = new Set(['customer_operator', 'manufacturer', 'technology_partner']);
const VERIFY_RANK = { customer_confirmed: 0, partner_reported: 1, vendor_reported: 2, media_reported: 3 };
export const EVIDENCE_KEYS = new Set(['organization_name', 'robot_recorded', 'country', 'status', 'verification_status', 'source_publisher', 'source_url', 'publication_date']);
function pickEvidence(items, order) {
  const ok = items.filter(({ r }) => /^https?:\/\//.test(String(r.source_url ?? '').trim()) && String(r.verification_status ?? '') !== 'unresolved');
  if (!ok.length) return null;
  const rank = (x) => [
    STATUS_RANK[String(x.r.operational_status ?? '').toLowerCase()] ?? 4,
    PRIMARY.has(String(x.r.source_role ?? '')) ? 0 : 1,
    VERIFY_RANK[String(x.r.verification_status ?? '')] ?? 4,
  ];
  const best = [...ok].sort((a, b) => {
    const [x, y] = [rank(a), rank(b)];
    for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
    const d = String(b.r.publication_date ?? '').localeCompare(String(a.r.publication_date ?? ''));
    return d || order.get(a.r.record_id) - order.get(b.r.record_id);
  })[0].r;
  const val = (k) => (has(best[k]) ? String(best[k]).trim() : null);
  return {
    organization_name: val('organization_name'), robot_recorded: recordedRobot(best) || null, country: val('country'), status: statusKey(best.operational_status),
    verification_status: val('verification_status'), source_publisher: val('source_publisher'), source_url: String(best.source_url).match(/https?:\/\/[^\s|,;]+/)[0],
    publication_date: val('publication_date'),
  };
}

// Deployment cases (Javier, 23 Nov 2026: the adoption view of the home page). One entry per deployment, deduplicated
// by the sheet's deployment id (never published), with only public fields: organisation and maker (company ids of the
// public pages), robot as recorded, sector, deployment countries, years, the number of records and their status labels.
// `stage` is the most advanced status among its records by the method's existing order (in operation, then pilot or
// trial, then a vendor's claim of operation, then announced); a case whose records are all unresolved is "unc".
const CASE_RANK = { op: 0, pilot: 1, unc: 2, ann: 3 };
function deploymentCases(items, byId, nameOf) {
  const groups = new Map();
  for (const x of items) {
    const k = x.g.deployment_id ?? x.r.deployment_id ?? x.g.record_id;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }
  const mostCommon = (vals) => { const c = new Map(); for (const v of vals.filter(has)) c.set(String(v).trim(), (c.get(String(v).trim()) ?? 0) + 1); return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null; };
  return [...groups.values()].map((xs) => {
    const status = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
    for (const { r } of xs) status[statusKey(r.operational_status)] += 1;
    const stage = STATUS_KEYS.filter((k) => status[k]).sort((a, b) => CASE_RANK[a] - CASE_RANK[b])[0];
    const first = xs[0];
    const robotOf = xs.find(({ g }) => g.robot !== null && g.robot !== undefined)?.g ?? null;
    return {
      stage,
      status,
      records: xs.length,
      organisation: { company: byId.get(first.g.operator)?.id ?? null, name: nameOf(first.g.operator, first.r.organization_name) },
      maker: { company: byId.get(first.g.maker)?.id ?? null, name: nameOf(first.g.maker, first.r.manufacturer) },
      robot_recorded: mostCommon(xs.map(({ r }) => recordedRobot(r))),
      robot: robotOf ? robotOf.robot : null,
      level: robotOf ? robotOf.level : null,
      sector: mostCommon(xs.map(({ r }) => r.sector)),
      countries: uniq(xs.map(({ r }) => r.country)),
      years: span(xs.map(({ r }) => yearOf(r))),
    };
  }).sort((a, b) => CASE_RANK[a.stage] - CASE_RANK[b.stage] || String(a.organisation.name).localeCompare(String(b.organisation.name)) || String(a.robot_recorded).localeCompare(String(b.robot_recorded)));
}

// graph: the full relations graph (server/src/relations/graph.js); rows: full Deployments rows; entities: full
// Entities rows. Returns only allowlisted values.
export function publicProjection({ graph, rows, entities = [] }) {
  const byRecord = new Map(rows.map((r) => [r.record_id, r]));
  const entity = new Map(entities.map((e) => [e.entity_id, e]));
  const items = graph.records.map((g) => ({ g, r: byRecord.get(g.record_id) })).filter((x) => x.r);
  const order = new Map(rows.map((r, i) => [r.record_id, i]));
  const companies = assignSlugs(graph.companies.map((c) => ({ id: c.id, name: c.name, identity: c.identity, roles: c.roles ?? {}, countries: uniq(c.countries ?? []), robots: c.robots ?? [], organization_ids: c.organization_ids ?? [], entity_id: c.entity_id })));
  const byId = new Map();
  for (const c of companies) { byId.set(c.id, c); for (const o of c.organization_ids) if (!byId.has(o)) byId.set(o, c); }
  const nameOf = (id, fallback) => (id && byId.get(id)?.name) || fallback || null;
  const out = companies.map((c) => {
    const ids = new Set([c.id, ...c.organization_ids]);
    const asMaker = items.filter(({ g }) => g.maker === c.id);
    const asOrg = items.filter(({ g }) => ids.has(g.operator) && g.maker !== c.id);
    const e = c.entity_id && /^org_/.test(c.entity_id) ? entity.get(c.entity_id) : null;
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      identity: c.identity,
      roles: c.roles,
      countries: c.countries,
      robots: c.robots,
      organization_ids: c.organization_ids,
      entity: e ? { canonical_name: e.canonical_name ?? null, entity_type: e.entity_type ?? null, reference_url: /^https?:\/\//.test(e.reference_url ?? '') ? e.reference_url : null, reviewed_at: e.reviewed_at ?? null } : null,
      as_maker: asMaker.length ? summary(asMaker, (g, r) => ({ id: byId.get(g.operator)?.id ?? null, name: nameOf(g.operator, r.organization_name) })) : null,
      as_organisation: asOrg.length ? summary(asOrg, (g, r) => ({ id: byId.get(g.maker)?.id ?? null, name: nameOf(g.maker, r.manufacturer) })) : null,
      evidence: pickEvidence([...asOrg, ...asMaker], order),
    };
  });
  const robots = {};
  for (const rb of graph.robots) {
    const mine = items.filter(({ g }) => g.robot === rb.id);
    if (mine.length) robots[rb.id] = { ...summary(mine, (g, r) => ({ id: byId.get(g.operator)?.id ?? null, name: nameOf(g.operator, r.organization_name) })), model_line_only: mine.every(({ g }) => g.level === 'family'), evidence: pickEvidence(mine, order) };
  }
  return {
    version: 1,
    snapshot: graph.snapshot ?? null,
    totals: {
      records: items.length,
      deployments: new Set(items.map(({ g, r }) => g.deployment_id ?? r.deployment_id ?? g.record_id)).size,
      organisations: out.filter((c) => c.as_organisation).length,
    },
    aggregates: aggregates(items),
    cases: deploymentCases(items, byId, nameOf),
    companies: out,
    robots,
  };
}

// The keys a projection may hold, for the guard (tools/check-public.mjs) and the tests.
export const ALLOWED_KEYS = new Set([
  'version', 'snapshot', 'totals', 'records', 'deployments', 'organisations', 'companies', 'robots',
  'id', 'slug', 'name', 'identity', 'roles', 'countries', 'organization_ids', 'entity', 'canonical_name', 'entity_type',
  'reference_url', 'reviewed_at', 'as_maker', 'as_organisation', 'status', 'sectors', 'site_countries', 'years',
  'counterparts', 'company', 'robot_recorded', 'robot', 'level', 'model_line_only', ...STATUS_KEYS,
  'aggregates', 'min_cell', 'by_status', 'by_sector', 'by_country', 'by_year', 'key', 'evidence',
  'cases', 'stage', 'organisation', 'maker', 'sector',
]);
