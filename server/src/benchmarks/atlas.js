// Robotics Evaluation Atlas (Javier, 23 Nov 2026): the Benchmarks catalogue (tab Benchmarks, table BenchmarksCatalog)
// joined with selected source-reported model results (tab Benchmark Results, table BenchmarkResults) on benchmark_id.
// Shared by the backend import (server/src/import/run.js validates with it) and the public snapshot
// (tools/export-benchmarks.mjs writes data/benchmarks/atlas.json with it), so both apply the same rules:
//
// - Capability groups come from an explicit, curated tag vocabulary, never from free-text matching. A tag outside the
//   vocabulary fails validation until it is reviewed. Groups mark what a resource covers, not how well any model does.
// - Evaluation settings come from an exact map of the ENVIRONMENT values. They are kinds, not a quality ladder.
// - VALUE is a number on the source's native scale (percentages 0 to 100) or empty. Empty stays null, never zero.
// - Results are source-reported, not replicated. COMPARABILITY_GROUP is an editorial aid: rows of one group must share
//   benchmark, version, track, metric, unit and direction; nothing is ranked across groups or across benchmarks.

import { PUBLIC_DATE_FIELDS, publicDateProblems } from '../public-dates.js';

export const CAPABILITY_GROUPS = Object.freeze([
  { key: 'manipulation', label: 'Manipulation', tags: ['manipulation', 'bimanual', 'mobile manipulation', 'dexterity'] },
  { key: 'whole-body', label: 'Whole-body control', tags: ['whole-body', 'locomotion'] },
  { key: 'navigation', label: 'Navigation', tags: ['navigation', 'mobile manipulation'] },
  { key: 'reasoning', label: 'Spatial and semantic reasoning', tags: ['spatial reasoning', 'semantics', 'question answering', 'memory'] },
  { key: 'physics', label: 'Physical understanding', tags: ['physical reasoning', 'physical interaction'] },
]);

// Tags that describe how a resource evaluates (conditions, axes, tooling), not a capability group.
export const ASPECT_TAGS = Object.freeze([
  'generalization', 'real-world generalization', 'spatial generalization', 'long-horizon', 'lifelong learning',
  'robustness', 'sim-real validity', 'motion quality', 'safety diagnostics', 'data generation', 'continuous-state precision',
]);

// Exact ENVIRONMENT values of the catalogue -> evaluation setting. Distinct kinds, deliberately not ordered.
export const SETTINGS = Object.freeze([
  { key: 'real', label: 'Real robot', environments: ['Real robot'] },
  {
    key: 'sim', label: 'Simulation', environments: [
      'Simulation', 'Simulation (CoppeliaSim / PyRep)', 'Simulation (SAPIEN)', 'Simulation (OmniGibson)', 'Simulation (MuJoCo)', 'Simulation (Isaac Sim)',
    ],
  },
  {
    key: 'paired', label: 'Simulation with real-robot validation', environments: [
      'Simulation with real-world validation', 'Simulation and real robot', 'Simulation with real-robot experiments', 'Simulation and real-robot experiments',
    ],
  },
  {
    key: 'observation', label: 'Video or observations, no robot actuation', environments: [
      'Video evaluation', 'Visual reasoning; no physical robot', 'Real-world environment observations; episodic and active variants',
    ],
  },
]);

export const DIRECTIONS = Object.freeze(['higher', 'lower']);
// DISPLAY_STATUS values: only source_reported rows are shown; the others are kept and counted as withheld.
export const DISPLAY_STATUSES = Object.freeze({ source_reported: true, hidden: false, pending_review: false });

const isUrl = (v) => typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const split = (v) => String(v ?? '').split(';').map((t) => t.trim()).filter(Boolean);
const PRIVATE_LINK = /docs\.google\.com|drive\.google\.com|\/spreadsheets\/d\//i;

// A source number: digits with an optional decimal part and sign. Empty means unknown (null), never zero.
export function parseValue(v) {
  if (v === null || v === undefined || String(v).trim() === '') return { ok: true, value: null };
  const s = String(v).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return { ok: false, value: null };
  return { ok: true, value: Number(s) };
}

export const settingOf = (environment) => SETTINGS.find((s) => s.environments.includes(environment))?.key ?? null;
export function capabilitiesOf(tags) {
  return CAPABILITY_GROUPS.filter((g) => tags.some((t) => g.tags.includes(t))).map((g) => g.key);
}
const KNOWN_TAGS = new Set([...CAPABILITY_GROUPS.flatMap((g) => g.tags), ...ASPECT_TAGS]);

// Every problem that must stop an import or a snapshot. `catalogue` and `results` are row data objects with
// lower-case keys (the importer's field names); `datasets` (optional) is the Datasets tab with dataset_id and
// related_benchmark_ids, for the two-way links.
export function atlasProblems(catalogue, results, datasets = null) {
  const problems = [];
  const ids = new Set();
  for (const b of catalogue) {
    const at = `Benchmarks ${b.benchmark_id ?? '(no id)'}`;
    if (!/^bm-[a-z0-9-]+$/.test(b.benchmark_id ?? '')) problems.push(`${at}: BENCHMARK_ID must look like bm-<slug>`);
    if (ids.has(b.benchmark_id)) problems.push(`${at}: duplicate BENCHMARK_ID`);
    ids.add(b.benchmark_id);
    if (!b.name) problems.push(`${at}: NAME is empty`);
    if (!settingOf(b.environment)) problems.push(`${at}: ENVIRONMENT "${b.environment}" is not in the reviewed settings map`);
    const tags = split(b.capability_tags);
    if (!tags.length) problems.push(`${at}: CAPABILITY_TAGS is empty`);
    for (const t of tags) if (!KNOWN_TAGS.has(t)) problems.push(`${at}: capability tag "${t}" is not in the reviewed vocabulary`);
    if (tags.length && !capabilitiesOf(tags).length) problems.push(`${at}: no tag maps to a capability group`);
    for (const d of split(b.related_dataset_ids)) if (!/^ds-[a-z0-9-]+$/.test(d)) problems.push(`${at}: related dataset id "${d}" must look like ds-<slug>`);
    problems.push(...publicDateProblems(b, 'benchmarks', at));
  }
  const resultIds = new Set();
  const groups = new Map();
  for (const r of results) {
    const at = `Benchmark Results ${r.result_id ?? '(no id)'}`;
    if (!/^res-[a-z0-9-]+$/.test(r.result_id ?? '')) problems.push(`${at}: RESULT_ID must look like res-<slug>`);
    if (resultIds.has(r.result_id)) problems.push(`${at}: duplicate RESULT_ID`);
    resultIds.add(r.result_id);
    if (!ids.has(r.benchmark_id)) problems.push(`${at}: BENCHMARK_ID "${r.benchmark_id}" is not in the Benchmarks catalogue`);
    if (!r.model) problems.push(`${at}: MODEL is empty`);
    if (!r.metric) problems.push(`${at}: METRIC is empty`);
    const v = parseValue(r.value);
    if (!v.ok) problems.push(`${at}: VALUE "${r.value}" is not a number (leave it empty when unknown)`);
    if (r.unit === '%' && v.value !== null && (v.value < 0 || v.value > 100)) problems.push(`${at}: percentage ${v.value} outside 0 to 100`);
    if (!DIRECTIONS.includes(r.direction)) problems.push(`${at}: DIRECTION must be higher or lower`);
    const n = parseValue(r.n_evals);
    if (!n.ok || (n.value !== null && (!Number.isInteger(n.value) || n.value <= 0))) problems.push(`${at}: N_EVALS must be a positive whole number or empty`);
    if (!(r.display_status in DISPLAY_STATUSES)) problems.push(`${at}: DISPLAY_STATUS "${r.display_status}" is not one of ${Object.keys(DISPLAY_STATUSES).join(', ')}`);
    for (const f of ['result_date', 'checked_at']) if (r[f] && !isDate(r[f])) problems.push(`${at}: ${f.toUpperCase()} must be YYYY-MM-DD`);
    if (r.result_date && !r.date_meaning) problems.push(`${at}: RESULT_DATE without DATE_MEANING`);
    if (!isUrl(r.source_url)) problems.push(`${at}: SOURCE_URL must be an https link`);
    if (!r.comparability_group) problems.push(`${at}: COMPARABILITY_GROUP is empty`);
    else {
      const g = groups.get(r.comparability_group) ?? [];
      g.push(r);
      groups.set(r.comparability_group, g);
    }
  }
  // One comparability group = one benchmark, version, track, metric, unit and direction; one row per configuration.
  const SAME = ['benchmark_id', 'benchmark_version', 'track', 'metric', 'unit', 'direction'];
  for (const [g, rows] of groups) {
    for (const f of SAME) {
      const vals = [...new Set(rows.map((r) => r[f] ?? ''))];
      if (vals.length > 1) problems.push(`Comparability group ${g}: mixes ${f.toUpperCase()} values ${vals.map((x) => JSON.stringify(x)).join(', ')}`);
    }
    const configs = rows.map((r) => `${r.model}|${r.model_configuration ?? ''}`);
    const dup = configs.find((c, i) => configs.indexOf(c) !== i);
    if (dup) problems.push(`Comparability group ${g}: the same model and configuration appears twice (${dup.replace('|', ', ')})`);
    // Native percentage scale: a whole group at or under 1 % is the 0-to-1 scale by mistake.
    const pct = rows.filter((r) => r.unit === '%').map((r) => parseValue(r.value).value).filter((x) => x !== null);
    if (pct.length >= 2 && pct.every((x) => x <= 1)) problems.push(`Comparability group ${g}: every percentage is 1 or less; VALUE uses 0 to 100, not 0 to 1`);
  }
  if (datasets) {
    const dsIds = new Map(datasets.map((d) => [d.dataset_id, d]));
    for (const b of catalogue) {
      for (const d of split(b.related_dataset_ids)) {
        const ds = dsIds.get(d);
        if (!ds) problems.push(`Benchmarks ${b.benchmark_id}: related dataset ${d} is not in the Datasets tab`);
        else if (!split(ds.related_benchmark_ids).includes(b.benchmark_id)) problems.push(`Datasets ${d}: RELATED_BENCHMARK_IDS does not link back to ${b.benchmark_id}`);
      }
    }
    for (const ds of datasets) {
      for (const bm of split(ds.related_benchmark_ids)) {
        if (!ids.has(bm)) problems.push(`Datasets ${ds.dataset_id}: related benchmark ${bm} is not in the Benchmarks catalogue`);
        else if (!split(catalogue.find((b) => b.benchmark_id === bm).related_dataset_ids).includes(ds.dataset_id)) problems.push(`Benchmarks ${bm}: RELATED_DATASET_IDS does not link back to ${ds.dataset_id}`);
      }
    }
  }
  return problems;
}

// Public fields of the atlas snapshot. Everything else in the two tabs stays out: the private workbook link
// (RELATED_DATASETS_URL), the previous catalogue description (editorial history).
export const PUBLIC_BENCHMARK_FIELDS = Object.freeze([
  'benchmark_id', 'name', 'url', 'description', 'category', 'evaluates', 'environment', 'embodiment', 'tasks', 'metrics',
  'protocol', 'leaderboard_url', 'code_url', 'source_url', 'source_locator', 'checked_at', 'review_status',
  'limitations', 'key_finding', 'results_coverage', ...PUBLIC_DATE_FIELDS,
]);
export const PUBLIC_RESULT_FIELDS = Object.freeze([
  'result_id', 'benchmark_id', 'benchmark_version', 'model', 'model_configuration', 'track', 'environment', 'embodiment',
  'task_scope', 'metric', 'unit', 'direction', 'uncertainty', 'training_data', 'conditions', 'comparability_group',
  'result_date', 'date_meaning', 'source_url', 'source_locator', 'checked_at', 'evidence_status', 'limitations',
]);

const linkOrNull = (v) => (isUrl(v) && !PRIVATE_LINK.test(v) ? v : null);
const textOrNull = (v) => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());

// The public snapshot: catalogue entries with their derived setting and capability groups, the displayed results
// with numbers parsed (null stays null), and every count computed from the rows themselves.
export function buildAtlas({ catalogue, results, datasets = [], exportedAt, builtAt }) {
  const dsById = new Map(datasets.map((d) => [d.dataset_id, d]));
  const shown = results.filter((r) => DISPLAY_STATUSES[r.display_status]);
  const benchmarks = catalogue.map((b) => {
    const tags = split(b.capability_tags);
    const out = Object.fromEntries(PUBLIC_BENCHMARK_FIELDS.map((f) => [f, textOrNull(b[f])]));
    for (const f of ['url', 'leaderboard_url', 'code_url', 'source_url', 'public_date_source_url']) out[f] = linkOrNull(out[f]);
    const obs = shown.filter((r) => r.benchmark_id === b.benchmark_id);
    return {
      ...out,
      id: b.benchmark_id,
      setting: settingOf(b.environment),
      capability_tags: tags,
      capabilities: capabilitiesOf(tags),
      aspects: tags.filter((t) => ASPECT_TAGS.includes(t)),
      related_datasets: split(b.related_dataset_ids).map((id) => {
        const d = dsById.get(id);
        return { id, name: textOrNull(d?.name), url: linkOrNull(d?.url) };
      }),
      observations: obs.length,
      // Distinct values only, so related rows of one table (PAW's Overall and its conditions) are not summed as evaluations.
      models: [...new Set(obs.map((r) => r.model))].length,
      groups: [...new Set(obs.map((r) => r.comparability_group))].length,
    };
  });
  const rows = shown.map((r) => {
    const out = Object.fromEntries(PUBLIC_RESULT_FIELDS.map((f) => [f, textOrNull(r[f])]));
    out.source_url = linkOrNull(out.source_url);
    // Text such as "Not extracted" or "Not reported in selected table" is kept as written: it says why a value is missing.
    return { ...out, id: r.result_id, value: parseValue(r.value).value, n_evals: parseValue(r.n_evals).value };
  });
  const withResults = benchmarks.filter((b) => b.observations > 0).length;
  return {
    title: 'Robotics Evaluation Atlas',
    note: 'Benchmarks catalogue and selected source-reported results from the Why Humanoid? master workbook. Results are transcribed from public sources and not independently replicated; selected results are not complete leaderboards; values use each source\'s native scale. Comparability groups are editorial aids, not proof of equal compute, data or statistical significance.',
    snapshot: { exported_at: exportedAt ?? null, built_at: builtAt ?? null },
    vocabulary: {
      capability_groups: CAPABILITY_GROUPS.map(({ key, label, tags }) => ({ key, label, tags })),
      aspect_tags: [...ASPECT_TAGS],
      settings: SETTINGS.map(({ key, label, environments }) => ({ key, label, environments })),
    },
    counts: {
      resources: benchmarks.length,
      resources_with_results: withResults,
      resources_awaiting_results: benchmarks.length - withResults,
      observations: rows.length,
      observations_withheld: results.length - shown.length,
      observations_without_value: rows.filter((r) => r.value === null).length,
      comparability_groups: [...new Set(rows.map((r) => r.comparability_group))].length,
      models: [...new Set(rows.map((r) => r.model))].length,
      // Non-additive: a resource counts in every group it covers.
      by_capability: Object.fromEntries(CAPABILITY_GROUPS.map((g) => [g.key, benchmarks.filter((b) => b.capabilities.includes(g.key)).length])),
      by_setting: Object.fromEntries(SETTINGS.map((s) => [s.key, benchmarks.filter((b) => b.setting === s.key).length])),
    },
    benchmarks,
    results: rows,
  };
}

// The committed snapshot holds only public fields and stays consistent with itself.
export function snapshotProblems(atlas) {
  const problems = [];
  const benchKeys = new Set([...PUBLIC_BENCHMARK_FIELDS, 'id', 'setting', 'capability_tags', 'capabilities', 'aspects', 'related_datasets', 'observations', 'models', 'groups']);
  const resultKeys = new Set([...PUBLIC_RESULT_FIELDS, 'id', 'value', 'n_evals']);
  for (const b of atlas.benchmarks ?? []) for (const k of Object.keys(b)) if (!benchKeys.has(k)) problems.push(`benchmark ${b.id}: field ${k} is not public`);
  for (const r of atlas.results ?? []) for (const k of Object.keys(r)) if (!resultKeys.has(k)) problems.push(`result ${r.id}: field ${k} is not public`);
  if (PRIVATE_LINK.test(JSON.stringify(atlas))) problems.push('holds a private Google link');
  const ids = new Set((atlas.benchmarks ?? []).map((b) => b.id));
  for (const r of atlas.results ?? []) {
    if (!ids.has(r.benchmark_id)) problems.push(`result ${r.id}: unknown benchmark ${r.benchmark_id}`);
    if (r.value !== null && typeof r.value !== 'number') problems.push(`result ${r.id}: value must be a number or null`);
  }
  const c = atlas.counts ?? {};
  if (c.resources !== ids.size) problems.push('counts.resources does not match the benchmarks');
  if (c.observations !== (atlas.results ?? []).length) problems.push('counts.observations does not match the results');
  const withRes = new Set((atlas.results ?? []).map((r) => r.benchmark_id)).size;
  if (c.resources_with_results !== withRes || c.resources_awaiting_results !== ids.size - withRes) problems.push('result coverage counts do not match the rows');
  return problems;
}
