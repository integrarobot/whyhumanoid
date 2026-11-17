// Relations between Deployments records, catalogue robots and companies. Pure functions, no I/O: the Worker runs
// them at import time (full and preview scopes), tools/relations.mjs runs them on a private export for the review
// report, and tools/build-site.mjs runs them on the public preview rows for the free robot pages.
//
// Rules (Javier, 17 Nov 2026):
// - Identity comes from stable ids: the sheet's organization_id for operators, the public catalogue id for robots,
//   the Entities id or a fixed maker id for makers. Names are compared only after normalisation and only for exact
//   equality with a catalogue name or a reviewed alias (tools/relations-aliases.json); never by substring.
// - A robot is linked only when the record names its model (level "model") or its model line with another or an
//   unstated version (level "family"). Knowing only the maker never links a robot: those records stay at the maker.
// - Maker, operator or customer, and technology partner (integrator) are separate roles of a company.
// - Inputs are never rewritten: records keep their own values; the graph only adds ids, levels and reasons.

export const LEVELS = ['model', 'family'];

const NOT_DISCLOSED = /\bnot disclosed\b|\bundisclosed\b|\bnot specified\b|\bunknown\b/i;
const NA = /^(not\b|to be (confirmed|identified)|same entity|do not add)/i;

export const norm = (s) =>
  String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:]+$/, '');
// The name without parenthetical notes such as "(as supplied)" or "(in-house)".
export const baseName = (s) => String(s ?? '').replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
const forms = (s) => [...new Set([norm(s), norm(baseName(s))].filter(Boolean))];
export const slugify = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

// Same anchor as the robot pages on whyhumanoid.com (index.html, slugOf).
export function robotSlug(id, lab, robot) {
  const name = !String(robot ?? '').trim() || NA.test(String(robot).trim()) || robot === 'Unnamed' ? 'Undisclosed model' : robot;
  return (
    'r-' +
    `${lab ?? ''}-${name}`
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) +
    '-' +
    id
  );
}

export const ROLE_LABELS = {
  maker: 'Maker',
  customer_operator: 'Operator or customer',
  customer_investor: 'Customer and investor',
  technology_partner: 'Technology partner or integrator',
};

// config = { aliases, catalogue }: aliases from tools/relations-aliases.json, catalogue = public robot index
// ([{ id, Lab, Robot, lab, robot, slug }]: record values and the page's display facets).
export function compileConfig({ aliases, catalogue }) {
  const problems = [];
  const makers = new Map(); // company id -> maker
  const byName = new Map(); // normalised maker name -> company id
  const labMaker = new Map(); // catalogue Lab -> company id
  const add = (key, id, what) => {
    if (!key) return;
    const other = byName.get(key);
    if (other && other !== id) problems.push(`maker name "${key}" is claimed by ${other} and ${id} (${what})`);
    else byName.set(key, id);
  };
  const labs = new Set(catalogue.map((r) => r.Lab));
  const reviewed = aliases.makers ?? {};
  for (const lab of labs) {
    const entry = reviewed[lab] ?? {};
    const id = entry.id ?? `mfr_${slugify(lab)}`;
    if (makers.has(id)) problems.push(`maker id ${id} is used by two catalogue labs`);
    makers.set(id, { id, name: entry.name ?? lab, labs: [lab], entityId: entry.entity_id ?? null, identity: 'catalogue_lab', names: new Set([lab, ...(entry.names ?? [])]) });
    labMaker.set(lab, id);
    for (const n of [lab, ...(entry.names ?? [])]) for (const f of forms(n)) add(f, id, `catalogue lab ${lab}`);
  }
  for (const lab of Object.keys(reviewed)) if (!labs.has(lab)) problems.push(`alias for maker "${lab}": no such Lab in the catalogue`);

  const robots = new Map(); // catalogue id -> robot
  for (const r of catalogue) {
    const alias = aliases.robots?.[String(r.id)];
    if (alias && (alias.lab !== r.Lab || alias.robot !== r.Robot)) {
      problems.push(`robot alias ${r.id} says ${alias.lab} / ${alias.robot}, the catalogue says ${r.Lab} / ${r.Robot}`);
    }
    const own = NA.test(String(r.Robot ?? '').trim()) || !String(r.Robot ?? '').trim() ? [] : [r.Robot];
    robots.set(r.id, {
      id: r.id,
      lab: r.lab ?? r.Lab,
      robot: r.robot ?? r.Robot,
      Lab: r.Lab,
      Robot: r.Robot,
      slug: r.slug ?? robotSlug(r.id, r.Lab, r.Robot),
      maker: labMaker.get(r.Lab),
      model: new Set([...own, ...(alias?.model ?? [])].flatMap(forms)),
      family: new Set((alias?.family ?? []).flatMap(forms)),
      versions: new Set((alias?.model_versions ?? []).flatMap(forms)),
    });
  }
  for (const id of Object.keys(aliases.robots ?? {})) if (!robots.has(Number(id))) problems.push(`robot alias ${id}: no such catalogue record`);
  const robotsByMaker = new Map();
  for (const r of robots.values()) robotsByMaker.set(r.maker, [...(robotsByMaker.get(r.maker) ?? []), r]);
  return { makers, byName, robots, robotsByMaker, problems };
}

function resolveMaker(compiled, value) {
  const text = String(value ?? '').trim();
  if (!text) return { reason: 'maker_missing' };
  if (NOT_DISCLOSED.test(text)) return { reason: 'maker_not_disclosed' };
  if (text.includes(';') || /\bmultiple\b/i.test(text)) return { reason: 'several_makers' };
  for (const f of forms(text)) {
    const id = compiled.byName.get(f);
    if (id) return { id, identity: 'catalogue_lab' };
  }
  // A maker outside the catalogue: grouped under its name as recorded, never attached to a catalogue company.
  const name = baseName(text) || text;
  return { id: `mfr_${slugify(name)}`, name, identity: 'name_as_recorded' };
}

function resolveRobot(compiled, makerId, model, version) {
  const candidates = compiled.robotsByMaker.get(makerId) ?? [];
  if (!candidates.length) return { reason: 'maker_not_in_catalogue' };
  const text = String(model ?? '').trim();
  if (!text || NOT_DISCLOSED.test(text) || NA.test(text)) return { reason: 'model_not_disclosed' };
  const m = forms(text);
  const v = forms(version);
  const hits = [];
  for (const r of candidates) {
    if (m.some((f) => r.model.has(f))) hits.push({ robot: r.id, level: 'model' });
    else if (m.some((f) => r.family.has(f))) hits.push({ robot: r.id, level: v.some((f) => r.model.has(f) || r.versions.has(f)) ? 'model' : 'family' });
  }
  if (hits.length > 1) return { reason: 'several_catalogue_robots' };
  if (hits.length === 1) return hits[0];
  return { reason: 'model_not_in_catalogue' };
}

const count = (map, key, n = 1) => map.set(key, (map.get(key) ?? 0) + n);

// rows: Deployments rows (objects keyed by the 47 sheet fields). entities: Entities rows in the same scope.
// scope: 'full' or 'preview'. Returns the graph served to the app and a review report.
export function buildGraph(compiled, { rows, entities = [], scope, snapshot = null }) {
  const entityById = new Map(entities.map((e) => [e.entity_id, e]));
  const companies = new Map();
  const company = (id, identity) => {
    if (!companies.has(id)) companies.set(id, { id, name: null, names: new Map(), roles: {}, countries: new Set(), entity_id: null, robots: [], organization_ids: new Set(), identity });
    return companies.get(id);
  };
  // Every catalogue maker is public (the free catalogue), with its robots.
  for (const mk of compiled.makers.values()) {
    const c = company(mk.id, 'catalogue_lab');
    c.name = mk.name;
    c.entity_id = mk.entityId && entityById.has(mk.entityId) ? mk.entityId : null;
    c.robots = (compiled.robotsByMaker.get(mk.id) ?? []).map((r) => r.id);
  }

  const reasons = { robot: new Map(), maker: new Map(), operator: new Map() };
  const combos = new Map();
  const autoMakers = new Map(); // normalised name -> company id, for makers outside the catalogue
  const merges = new Map();
  const orgNames = new Map();

  // Pass 1: makers and robots.
  const records = rows.map((row) => {
    const rec = { record_id: row.record_id ?? null, deployment_id: row.deployment_id ?? null, robot: null, level: null, robot_reason: null, maker: null, maker_reason: null, operator: null, role: row.organization_role ?? null, operator_reason: null };
    const maker = resolveMaker(compiled, row.manufacturer);
    if (maker.id) {
      rec.maker = maker.id;
      const c = company(maker.id, maker.identity);
      if (!c.name) c.name = maker.name;
      count(c.names, String(row.manufacturer).trim());
      c.roles.maker = (c.roles.maker ?? 0) + 1;
      if (maker.identity === 'name_as_recorded') for (const f of forms(maker.name)) autoMakers.set(f, maker.id);
      const robot = resolveRobot(compiled, maker.id, row.robot_model, row.robot_version);
      if (robot.robot !== undefined) Object.assign(rec, { robot: robot.robot, level: robot.level });
      else rec.robot_reason = robot.reason;
    } else {
      rec.maker_reason = maker.reason;
      rec.robot_reason = maker.reason;
    }
    count(reasons.maker, rec.maker_reason ?? 'linked');
    count(reasons.robot, rec.level ?? rec.robot_reason);
    const key = JSON.stringify([row.manufacturer ?? '', row.robot_model ?? '', row.robot_version ?? '']);
    const combo = combos.get(key) ?? { manufacturer: row.manufacturer ?? '', robot_model: row.robot_model ?? '', robot_version: row.robot_version ?? '', maker: rec.maker, robot: rec.robot, level: rec.level, reason: rec.robot_reason, records: 0 };
    combo.records += 1;
    combos.set(key, combo);
    return rec;
  });

  // Pass 2: organisations. An organisation is the same company as a maker only when its recorded name equals one
  // of that maker's names exactly (after normalisation); otherwise its sheet organization_id is its identity.
  rows.forEach((row, i) => {
    const rec = records[i];
    const orgId = String(row.organization_id ?? '').trim();
    if (!orgId) {
      rec.operator_reason = 'no_organization_id';
      count(reasons.operator, rec.operator_reason);
      return;
    }
    const name = String(row.organization_name ?? '').trim();
    const asMaker = forms(name).map((f) => compiled.byName.get(f) ?? autoMakers.get(f)).find(Boolean) ?? null;
    if (asMaker) merges.set(orgId, asMaker);
    const id = asMaker ?? orgId;
    const c = company(id, 'sheet_organization_id');
    c.organization_ids.add(orgId);
    if (name) {
      count(c.names, name);
      const nm = orgNames.get(orgId) ?? new Map();
      count(nm, name);
      orgNames.set(orgId, nm);
    }
    const role = ROLE_LABELS[row.organization_role] && row.organization_role !== 'maker' ? row.organization_role : 'customer_operator';
    c.roles[role] = (c.roles[role] ?? 0) + 1;
    const country = String(row.organization_country ?? '').trim();
    if (country && !NOT_DISCLOSED.test(country)) c.countries.add(country);
    if (!c.entity_id && entityById.has(orgId)) c.entity_id = orgId;
    rec.operator = id;
    count(reasons.operator, 'linked');
  });

  for (const c of companies.values()) {
    if (c.name) continue;
    const entity = c.entity_id ? entityById.get(c.entity_id) : null;
    c.name = entity?.canonical_name || [...c.names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || c.id;
  }
  const used = new Set(records.flatMap((r) => [r.maker, r.operator]).filter(Boolean));
  const out = [...companies.values()]
    .filter((c) => c.identity === 'catalogue_lab' || used.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      names: [...c.names.keys()],
      identity: c.identity,
      roles: c.roles,
      countries: [...c.countries],
      entity_id: c.entity_id,
      robots: c.robots,
      organization_ids: [...c.organization_ids],
    }));

  const coverage = {
    records: records.length,
    robot_model: records.filter((r) => r.level === 'model').length,
    robot_family: records.filter((r) => r.level === 'family').length,
    maker_only: records.filter((r) => r.maker && r.robot === null).length,
    maker_unresolved: records.filter((r) => !r.maker).length,
    operator_linked: records.filter((r) => r.operator).length,
    operator_unresolved: records.filter((r) => !r.operator).length,
    robots_with_records: new Set(records.filter((r) => r.robot !== null).map((r) => r.robot)).size,
    companies_with_records: out.filter((c) => used.has(c.id)).length,
  };
  const graph = {
    scope,
    snapshot,
    robots: [...compiled.robots.values()].map((r) => ({ id: r.id, lab: r.lab, robot: r.robot, Lab: r.Lab, Robot: r.Robot, slug: r.slug, maker: r.maker })),
    companies: out,
    records,
    coverage,
  };
  const report = {
    coverage,
    robot_reasons: Object.fromEntries(reasons.robot),
    maker_reasons: Object.fromEntries(reasons.maker),
    operator_reasons: Object.fromEntries(reasons.operator),
    combinations: [...combos.values()].sort((a, b) => b.records - a.records),
    makers_as_recorded: [...new Set(autoMakers.values())],
    merged_by_name: Object.fromEntries(merges),
    organisations_with_several_names: [...orgNames.entries()].filter(([, m]) => m.size > 1).map(([id, m]) => ({ id, names: [...m.keys()] })),
    config_problems: compiled.problems,
  };
  return { graph, report };
}
