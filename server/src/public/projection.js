// Public projection (Javier, 17 Nov 2026: approved split of task 6, phase 1). What anyone may see about every
// company and catalogue robot, computed from the FULL Deployments and Entities rows through an allowlist. The Worker
// uses it for the visitor search and tools/export-public.mjs for the static pages, so both publish the same thing.
//
// Public, and only as counts and summaries: organisation, recorded maker and model, deployment country, sector,
// status label (as recorded, not verified) and year. Public identity from Entities: canonical name, type, reference
// URL and review date. Never: site, city, region, task, workflow, integration, metrics, claim text, claim type,
// confidence, verification, evidence level, sources, exact dates, open questions, notes, or record and deployment ids.

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

// graph: the full relations graph (server/src/relations/graph.js); rows: full Deployments rows; entities: full
// Entities rows. Returns only allowlisted values.
export function publicProjection({ graph, rows, entities = [] }) {
  const byRecord = new Map(rows.map((r) => [r.record_id, r]));
  const entity = new Map(entities.map((e) => [e.entity_id, e]));
  const items = graph.records.map((g) => ({ g, r: byRecord.get(g.record_id) })).filter((x) => x.r);
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
    };
  });
  const robots = {};
  for (const rb of graph.robots) {
    const mine = items.filter(({ g }) => g.robot === rb.id);
    if (mine.length) robots[rb.id] = { ...summary(mine, (g, r) => ({ id: byId.get(g.operator)?.id ?? null, name: nameOf(g.operator, r.organization_name) })), model_line_only: mine.every(({ g }) => g.level === 'family') };
  }
  return {
    version: 1,
    snapshot: graph.snapshot ?? null,
    totals: {
      records: items.length,
      deployments: new Set(items.map(({ g, r }) => g.deployment_id ?? r.deployment_id ?? g.record_id)).size,
      organisations: out.filter((c) => c.as_organisation).length,
    },
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
]);
