// Robot Learning Data Atlas (Javier, 23 Nov 2026): the Datasets catalogue (tab Datasets, table DatasetsCatalog) joined
// with the reported quantities of tab Dataset Metrics (table DatasetMetrics) on dataset_id. Shared by the backend import
// (server/src/import/run.js validates with it) and the public snapshot (tools/export-datasets.mjs writes
// data/datasets/atlas.json with it), so both apply the same rules:
//
// - The useful question is what experience exists for a learning problem, on which bodies, with which supervision and
//   access conditions; not which dataset is biggest. Nothing here ranks resources or scores them.
// - Origins, resource classes, modalities, learning uses and access states come from explicit vocabularies. A value
//   outside them fails validation until it is reviewed. MODALITIES and LEARNING_USES are semicolon-separated tokens;
//   the suffix _subset means only part of the resource carries that modality.
// - VALUE is a number as the source states it, or empty. Empty stays null (unknown), never zero; an empty date is
//   unknown, never today. QUALIFIER more_than is a lower bound and approximate is approximate.
// - Quantities are compared only inside a compatible group (same COMPARISON_GROUP, metric and unit). Hz and fps may
//   describe different streams and are never converted; no duration is inferred from frames or rates. Aggregates,
//   provider claims and training mixtures are kept apart from open-corpus sizes. Nothing is ever summed across
//   resources: PARENT_DATASET_IDS is incomplete, so an empty value does not mean there is no overlap.
// - A benchmark link means an associated evaluation resource, not a training claim.

import { PUBLIC_DATE_FIELDS, publicDateProblems } from '../public-dates.js';

export const LANES = Object.freeze([
  { key: 'robot', label: 'Robot-recorded', note: 'Recorded on physical robots: teleoperation, scripted or policy rollouts.' },
  { key: 'human', label: 'Human observation and motion', note: 'Human video, motion capture and hand or body pose. No robot actions unless a resource retargets them.' },
  { key: 'synthetic', label: 'Synthetic, simulated and retargeted', note: 'Generated in simulation, or derived from other data such as human motion retargeted to robots.' },
  { key: 'assets', label: 'Environment assets', note: 'Scenes and objects for generating data or evaluating, not recorded episodes.' },
  { key: 'mixed', label: 'Mixed origins', note: 'Robot, human and simulated data combined in one resource or training mixture.' },
  { key: 'other', label: 'Origin not established or not applicable', note: 'Services and portals whose data origin the public pages do not establish, or that hold no data of their own.' },
]);

export const ORIGINS = Object.freeze({
  real_robot: 'Real robot', human_capture: 'Human capture', simulation: 'Simulation', derived: 'Derived or retargeted',
  mixed: 'Mixed', not_applicable: 'Not applicable', unknown: 'Not established',
});

// RESOURCE_CLASS: what kind of resource a row is. `shape` drives the glyph; every glyph is shown with its label.
export const CLASSES = Object.freeze({
  corpus: { label: 'Corpus', shape: 'corpus' },
  synthetic_data_resource: { label: 'Synthetic data resource', shape: 'corpus' },
  aggregate: { label: 'Aggregate of other datasets', shape: 'aggregate' },
  collection: { label: 'Collection of datasets', shape: 'aggregate' },
  evaluation_corpus: { label: 'Evaluation data', shape: 'evaluation' },
  simulation_assets: { label: 'Environment assets', shape: 'assets' },
  model_data_resource: { label: 'Model training mixture', shape: 'mixture' },
  commercial_data_service: { label: 'Commercial data service', shape: 'service' },
  search_portal: { label: 'Search portal', shape: 'service' },
});

export const MODALITIES = Object.freeze({
  rgb: 'RGB video', depth: 'Depth', point_cloud: 'Point clouds', human_video: 'Human video', audio: 'Audio', gaze: 'Gaze',
  imu: 'IMU', camera_pose: 'Camera pose', joint_state: 'Joint states', effort: 'Joint effort', action: 'Robot actions',
  trajectory: 'End-effector trajectories', motion: 'Motion data', body_pose: 'Body pose', hand_pose: 'Hand pose',
  grasp_pose: 'Grasp poses', object_pose: 'Object pose', tactile: 'Tactile', force: 'Force', language: 'Language',
  planning: 'Planning labels', affordance: 'Affordances', task_metadata: 'Task metadata', object_mesh: 'Object meshes',
  object_assets: 'Object assets', scene_geometry: 'Scene geometry',
});
// Tokens that say the modality list itself is unknown or does not apply.
const MODALITY_STATES = Object.freeze({ unknown: 'Not established', not_applicable: 'Not applicable' });

export const LEARNING_USES = Object.freeze([
  'manipulation', 'bimanual', 'dexterity', 'grasping', 'contact', 'precision', 'deformable objects', 'mobile manipulation',
  'whole-body', 'locomotion', 'motion', 'navigation', 'human-to-robot', 'human-object interaction', 'cross-embodiment',
  'generalization', 'long-horizon', 'lifelong learning', 'planning', 'reasoning', 'memory', 'VLA', 'policy learning',
  'visual pretraining', 'multimodal learning', 'egocentric perception', 'skilled activity understanding', 'world models',
  'dynamics', 'physical understanding', 'embodied learning', 'simulation', 'evaluation', 'diagnostics', 'policy analysis',
  'data discovery',
]);
export const useLabel = (u) => (u === 'VLA' ? 'Vision-language-action (VLA)' : u.charAt(0).toUpperCase() + u.slice(1));

export const ACCESS = Object.freeze({
  download_instructions: 'Download instructions published', dataset_card: 'Dataset card', dataset_link: 'Dataset link',
  partial_release: 'Partial release', project_link: 'Project page', paper_and_release_links: 'Paper and release links',
  collection_link: 'Collection page', gated_download: 'Gated download (access request)', generation_code: 'Generation code only',
  project_download_terms: 'Download under project terms', contact_provider: 'Contact the provider', search_portal: 'Search portal',
});

// Body families, derived from the recorded EMBODIMENT text by these explicit rules (never from the resource name). A
// text that matches none stays unclassified and is shown as recorded.
export const BODY_FAMILIES = Object.freeze([
  { key: 'humanoid', label: 'Humanoid', re: /\bhumanoids?\b|\bUnitree G1\b|\bH1(-2)?\b/i },
  { key: 'dual_arm', label: 'Dual-arm or bimanual', re: /\bdual[- ]arm|\bbimanual\b/i },
  { key: 'arm', label: 'Single arm', re: /\brobot arms?\b|\bmanipulation arm\b|\bFranka\b|\bWidowX\b/i },
  { key: 'robot_hand', label: 'Dexterous robot hand', re: /\bInspire Hand\b|\brobot hands\b/i },
  { key: 'mobile', label: 'Mobile base', re: /\bmobile dual|\bwheeled\b|\/mobile\b/i },
  { key: 'multi', label: 'Several robot bodies', re: /\bmultiple\b|\b\d+ robot embodiments\b|\bsix robot embodiments\b|\bheterogeneous\b|\bindexed\b|\btask-dependent robots\b/i },
  { key: 'human', label: 'Human body or hands', re: /\bhuman\b/i },
  { key: 'none', label: 'No robot', re: /\bno robot\b/i },
]);
export const bodyFamiliesOf = (embodiment) => BODY_FAMILIES.filter((f) => f.re.test(String(embodiment ?? ''))).map((f) => f.key);

// Quantities that measure how much recorded experience a resource holds; the others (tasks, objects, rates, sites...)
// describe it and appear only in its data passport.
export const SCALE_METRICS = Object.freeze(['trajectories', 'episodes', 'sequences', 'duration', 'frames', 'clips']);
const UNITS = Object.freeze({ duration: ['hours', 'minutes', 'seconds'], sample_rate: ['Hz', 'fps'] });
export const QUALIFIERS = Object.freeze({ reported: 'as reported', approximate: 'about', more_than: 'more than' });
export const RELEASE_STATUSES = Object.freeze({
  reported_release: 'Reported release', paper_scope: 'Paper scope', aggregate_scope: 'Aggregate scope: overlaps its sources',
  provider_claim: 'Provider claim', training_mix: 'Training mixture',
});
// Kept apart from open-corpus sizes and left out of the default scale view.
export const SET_APART = Object.freeze({ aggregate_scope: 'Aggregate', provider_claim: 'Provider claim', training_mix: 'Training mixture' });
// DISPLAY_STATUS: shown or withheld (kept and counted).
export const DISPLAY_STATUSES = Object.freeze({ source_reported: true, provider_reported: true, hidden: false, pending_review: false });
// A COMPARISON_GROUP ending this way holds parts of a resource (subsets, splits, releases), never a whole resource.
export const isPartGroup = (g) => /_(subset|increment|historical)$/.test(String(g ?? ''));

const isUrl = (v) => typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
export const split = (v) => String(v ?? '').split(';').map((t) => t.trim()).filter(Boolean);
const PRIVATE_LINK = /docs\.google\.com|drive\.google\.com|\/spreadsheets\/d\//i;
const EDITORIAL = /\battachment\b|\bsupplied matrix\b|\bmatrix row\b/i;

// Clauses that refer to the private editorial material behind a row (the supplied matrix or attachment) are internal
// notes: they are removed from every published text; the rest of the text is kept as written.
export function scrubEditorial(text) {
  if (text === null || text === undefined) return text;
  const s = String(text);
  if (!EDITORIAL.test(s)) return s;
  const kept = s.split(/(?<=[.;])\s+/).filter((part) => !EDITORIAL.test(part)).join(' ').trim()
    .replace(/;\s+(?=[A-Z])/g, '. ').replace(/;$/, '.');
  return kept ? kept.charAt(0).toUpperCase() + kept.slice(1) : null;
}

// A source number: digits with an optional decimal part. Empty means unknown (null), never zero.
export function parseValue(v) {
  if (v === null || v === undefined || String(v).trim() === '') return { ok: true, value: null };
  const s = String(v).trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, value: null };
  return { ok: true, value: Number(s) };
}

export const modalityToken = (t) => {
  const partial = /_subset$/.test(t);
  return { key: partial ? t.slice(0, -'_subset'.length) : t, partial };
};
export const inAtlas = (d) => String(d.included_in_atlas ?? '').trim().toLowerCase() === 'true';
export const laneOf = (d) => {
  if (d.resource_class === 'simulation_assets') return 'assets';
  return { real_robot: 'robot', human_capture: 'human', simulation: 'synthetic', derived: 'synthetic', mixed: 'mixed' }[d.data_origin] ?? 'other';
};
// Licence: stated only when the note names data terms; a code licence alone or "not established" is not a data licence.
export const licenceStated = (note) => !/not established/i.test(note ?? '') && /\bCC BY\b|\bGPL-\d|\bterms\b/i.test(note ?? '');

// Every problem that must stop an import or a snapshot. `catalogue` and `metrics` are row data objects with lower-case
// keys (the importer's field names); `benchmarkIds` (optional) are the ids of the Benchmarks catalogue.
export function atlasProblems(catalogue, metrics, { benchmarkIds = null } = {}) {
  const problems = [];
  const ids = new Set();
  for (const d of catalogue) {
    const at = `Datasets ${d.dataset_id ?? '(no DATASET_ID)'}`;
    if (!/^ds-[a-z0-9-]+$/.test(d.dataset_id ?? '')) problems.push(`${at}: DATASET_ID must look like ds-<slug>`);
    else if (ids.has(d.dataset_id)) problems.push(`${at}: duplicate DATASET_ID`);
    ids.add(d.dataset_id);
    if (!d.name) problems.push(`${at}: NAME is empty`);
    if (!['true', 'false'].includes(String(d.included_in_atlas ?? '').trim().toLowerCase())) problems.push(`${at}: INCLUDED_IN_ATLAS must be "true" or "false", got "${d.included_in_atlas ?? ''}"`);
    if (!CLASSES[d.resource_class]) problems.push(`${at}: RESOURCE_CLASS "${d.resource_class ?? ''}" is not in the reviewed vocabulary`);
    if (!ORIGINS[d.data_origin]) problems.push(`${at}: DATA_ORIGIN "${d.data_origin ?? ''}" is not in the reviewed vocabulary`);
    for (const t of split(d.modalities)) if (!MODALITIES[modalityToken(t).key] && !MODALITY_STATES[t]) problems.push(`${at}: modality "${t}" is not in the reviewed vocabulary`);
    for (const u of split(d.learning_uses)) if (!LEARNING_USES.includes(u)) problems.push(`${at}: learning use "${u}" is not in the reviewed vocabulary`);
    if (d.access_status && !ACCESS[d.access_status]) problems.push(`${at}: ACCESS_STATUS "${d.access_status}" is not in the reviewed vocabulary`);
    for (const f of ['url', 'source_url']) if (d[f] && !isUrl(d[f])) problems.push(`${at}: ${f.toUpperCase()} must be an https link`);
    if (d.checked_at && !isDate(d.checked_at)) problems.push(`${at}: CHECKED_AT must be YYYY-MM-DD`);
    problems.push(...publicDateProblems(d, 'datasets', at));
    for (const b of split(d.related_benchmark_ids)) {
      if (!/^bm-[a-z0-9-]+$/.test(b)) problems.push(`${at}: related benchmark id "${b}" must look like bm-<slug>`);
      else if (benchmarkIds && !benchmarkIds.includes(b)) problems.push(`${at}: related benchmark ${b} is not in the Benchmarks catalogue`);
    }
  }
  for (const d of catalogue) {
    for (const p of split(d.parent_dataset_ids)) {
      if (!ids.has(p)) problems.push(`Datasets ${d.dataset_id}: parent dataset ${p} is not in the catalogue`);
      if (p === d.dataset_id) problems.push(`Datasets ${d.dataset_id}: a resource cannot be its own parent`);
    }
  }

  const mids = new Set();
  const groups = new Map();
  for (const m of metrics) {
    const at = `Dataset Metrics ${m.metric_id ?? '(no METRIC_ID)'}`;
    if (!/^dm-[a-z0-9-]+$/.test(m.metric_id ?? '')) problems.push(`${at}: METRIC_ID must look like dm-<slug>`);
    else if (mids.has(m.metric_id)) problems.push(`${at}: duplicate METRIC_ID`);
    mids.add(m.metric_id);
    if (!ids.has(m.dataset_id)) problems.push(`${at}: DATASET_ID ${m.dataset_id ?? '(empty)'} is not in the Datasets catalogue`);
    if (!m.metric) problems.push(`${at}: METRIC is empty`);
    const v = parseValue(m.value);
    if (!v.ok) problems.push(`${at}: VALUE "${m.value}" is not a number`);
    if (v.value !== null && !QUALIFIERS[m.qualifier]) problems.push(`${at}: QUALIFIER "${m.qualifier ?? ''}" is not reported, approximate or more_than`);
    if (v.value !== null && !m.unit) problems.push(`${at}: a value needs a UNIT`);
    if (UNITS[m.metric] && m.unit && !UNITS[m.metric].includes(m.unit)) problems.push(`${at}: unit ${m.unit} is not a ${m.metric} unit (${UNITS[m.metric].join(', ')})`);
    if (!ORIGINS[m.data_origin]) problems.push(`${at}: DATA_ORIGIN "${m.data_origin ?? ''}" is not in the reviewed vocabulary`);
    if (!RELEASE_STATUSES[m.release_status]) problems.push(`${at}: RELEASE_STATUS "${m.release_status ?? ''}" is not in the reviewed vocabulary`);
    if (!(m.display_status in DISPLAY_STATUSES)) problems.push(`${at}: DISPLAY_STATUS "${m.display_status ?? ''}" is not in the reviewed vocabulary`);
    if (m.source_url && !isUrl(m.source_url)) problems.push(`${at}: SOURCE_URL must be an https link`);
    for (const f of ['source_date', 'checked_at']) if (m[f] && !isDate(m[f])) problems.push(`${at}: ${f.toUpperCase()} must be YYYY-MM-DD`);
    if (m.comparison_group && SCALE_METRICS.includes(m.metric)) {
      if (!groups.has(m.comparison_group)) groups.set(m.comparison_group, []);
      groups.get(m.comparison_group).push(m);
    }
  }
  // A compatible group holds one metric in one unit; a resource appears once in a whole-resource group.
  for (const [g, rows] of groups) {
    const key = (m) => `${m.metric}|${m.unit}`;
    if (new Set(rows.map(key)).size > 1) problems.push(`Dataset Metrics group ${g}: mixes ${[...new Set(rows.map(key))].join(' and ')}`);
    if (!isPartGroup(g)) {
      const per = new Set();
      for (const m of rows) { if (per.has(m.dataset_id)) problems.push(`Dataset Metrics group ${g}: ${m.dataset_id} appears twice`); per.add(m.dataset_id); }
    }
  }
  // Split versus total: a part can never exceed the whole it belongs to.
  for (const m of metrics.filter((x) => isPartGroup(x.comparison_group))) {
    const total = metrics.find((t) => t.dataset_id === m.dataset_id && t !== m && !isPartGroup(t.comparison_group) && t.comparison_group && t.metric === m.metric && t.unit === m.unit && t.data_origin === m.data_origin);
    const pv = parseValue(m.value).value;
    const tv = total ? parseValue(total.value).value : null;
    if (pv !== null && tv !== null && pv > tv) problems.push(`Dataset Metrics ${m.metric_id}: part ${pv} exceeds the total ${tv} of ${total.metric_id}`);
  }
  return problems;
}

export const PUBLIC_RESOURCE_FIELDS = Object.freeze([
  'name', 'url', 'description', 'data_origin', 'resource_class', 'embodiment', 'capture_method', 'data_format',
  'access_status', 'license_note', 'version_scope', 'key_takeaway', 'limitations', 'review_status', 'checked_at',
  'source_url', 'source_locator', ...PUBLIC_DATE_FIELDS,
]);
export const PUBLIC_QUANTITY_FIELDS = Object.freeze([
  'dataset_id', 'data_version', 'metric', 'unit', 'qualifier', 'scope', 'data_origin', 'release_status', 'comparison_group',
  'display_status', 'evidence_status', 'overlap_note', 'limitations', 'source_url', 'source_locator', 'source_date',
  'date_meaning', 'checked_at',
]);
const RESOURCE_KEYS = Object.freeze([...PUBLIC_RESOURCE_FIELDS, 'id', 'lane', 'modalities', 'modality_state', 'learning_uses', 'body_families',
  'licence_stated', 'parents', 'children', 'related_benchmarks', 'quantities', 'evaluation']);
const QUANTITY_KEYS = Object.freeze([...PUBLIC_QUANTITY_FIELDS, 'id', 'value', 'scale', 'part', 'set_apart']);

const linkOrNull = (v) => (isUrl(v) && !PRIVATE_LINK.test(v) ? v : null);
const textOrNull = (v) => (v === null || v === undefined || String(v).trim() === '' ? null : scrubEditorial(String(v).trim()));

// The public snapshot: resources in the atlas with their derived lane, tokens and families, the displayed quantities
// with numbers parsed (null stays null), and every count computed from the rows themselves.
export function buildAtlas({ catalogue, metrics, benchmarks = [], exportedAt, builtAt }) {
  const included = catalogue.filter(inAtlas);
  const ids = new Set(included.map((d) => d.dataset_id));
  const bmName = new Map(benchmarks.map((b) => [b.benchmark_id, b.name]));
  const shown = metrics.filter((m) => DISPLAY_STATUSES[m.display_status] && ids.has(m.dataset_id));
  const quantities = shown.map((m) => {
    const out = Object.fromEntries(PUBLIC_QUANTITY_FIELDS.map((f) => [f, textOrNull(m[f])]));
    out.source_url = linkOrNull(out.source_url);
    const part = isPartGroup(m.comparison_group);
    return {
      ...out,
      id: m.metric_id,
      value: parseValue(m.value).value,
      scale: Boolean(m.comparison_group) && SCALE_METRICS.includes(m.metric),
      part,
      set_apart: SET_APART[m.release_status] ?? null,
    };
  });
  const resources = included.map((d) => {
    const out = Object.fromEntries(PUBLIC_RESOURCE_FIELDS.map((f) => [f, textOrNull(d[f])]));
    for (const f of ['url', 'source_url', 'public_date_source_url']) out[f] = linkOrNull(out[f]);
    const tokens = split(d.modalities);
    return {
      ...out,
      id: d.dataset_id,
      lane: laneOf(d),
      modalities: tokens.filter((t) => !MODALITY_STATES[t]).map(modalityToken),
      modality_state: tokens.find((t) => MODALITY_STATES[t]) ?? (tokens.length ? null : 'unknown'),
      learning_uses: split(d.learning_uses),
      body_families: bodyFamiliesOf(d.embodiment),
      licence_stated: licenceStated(d.license_note),
      parents: split(d.parent_dataset_ids).filter((p) => ids.has(p)),
      children: included.filter((c) => split(c.parent_dataset_ids).includes(d.dataset_id)).map((c) => c.dataset_id),
      related_benchmarks: split(d.related_benchmark_ids).map((id) => ({ id, name: textOrNull(bmName.get(id)) })),
      quantities: quantities.filter((q) => q.dataset_id === d.dataset_id).length,
      evaluation: d.resource_class === 'evaluation_corpus',
    };
  });
  const withQ = resources.filter((r) => r.quantities > 0).length;
  const presentMods = new Set(resources.flatMap((r) => r.modalities.map((m) => m.key)));
  const presentUses = new Set(resources.flatMap((r) => r.learning_uses));
  return {
    title: 'Robot Learning Data Atlas',
    subtitle: 'Where robot learning data comes from, what it contains, and how it can be used.',
    note: 'Datasets catalogue and reported quantities from the Why Humanoid? master workbook. Quantities are transcribed from public sources as stated, not independently counted. Sizes are compared only within a compatible group and unit; they are not a ranking of quality, and nothing is summed across resources because collections overlap. Aggregates, provider claims and training mixtures are kept apart from open-corpus sizes. Access and licence notes are summaries: check the original terms before use.',
    snapshot: { exported_at: exportedAt ?? null, built_at: builtAt ?? null },
    vocabulary: {
      lanes: LANES.map(({ key, label, note }) => ({ key, label, note })),
      origins: { ...ORIGINS },
      classes: Object.fromEntries(Object.entries(CLASSES).map(([k, v]) => [k, { ...v }])),
      modalities: Object.fromEntries(Object.entries(MODALITIES).filter(([k]) => presentMods.has(k))),
      modality_states: { ...MODALITY_STATES },
      learning_uses: LEARNING_USES.filter((u) => presentUses.has(u)).map((u) => ({ key: u, label: useLabel(u) })),
      access: { ...ACCESS },
      body_families: BODY_FAMILIES.map(({ key, label }) => ({ key, label })),
      qualifiers: { ...QUALIFIERS },
      release_statuses: { ...RELEASE_STATUSES },
      scale_metrics: [...SCALE_METRICS],
    },
    counts: {
      resources: resources.length,
      resources_outside_atlas: catalogue.length - included.length,
      corpora: resources.filter((r) => r.resource_class === 'corpus').length,
      resources_with_quantities: withQ,
      resources_awaiting_quantities: resources.length - withQ,
      quantities: quantities.length,
      quantities_withheld: metrics.filter((m) => ids.has(m.dataset_id)).length - shown.length,
      quantities_without_value: quantities.filter((q) => q.value === null).length,
      scale_groups: [...new Set(quantities.filter((q) => q.scale).map((q) => q.comparison_group))].length,
      by_lane: Object.fromEntries(LANES.map((l) => [l.key, resources.filter((r) => r.lane === l.key).length])),
      by_class: Object.fromEntries(Object.keys(CLASSES).map((k) => [k, resources.filter((r) => r.resource_class === k).length])),
      benchmark_links: resources.reduce((n, r) => n + r.related_benchmarks.length, 0),
    },
    resources,
    quantities,
  };
}

// The committed snapshot holds only public fields and stays consistent with itself.
export function snapshotProblems(atlas) {
  const problems = [];
  const rk = new Set(RESOURCE_KEYS);
  const qk = new Set(QUANTITY_KEYS);
  for (const r of atlas.resources ?? []) for (const k of Object.keys(r)) if (!rk.has(k)) problems.push(`resource ${r.id}: field ${k} is not public`);
  for (const q of atlas.quantities ?? []) for (const k of Object.keys(q)) if (!qk.has(k)) problems.push(`quantity ${q.id}: field ${k} is not public`);
  const text = JSON.stringify(atlas);
  if (PRIVATE_LINK.test(text)) problems.push('holds a private Google link');
  if (EDITORIAL.test(text)) problems.push('holds an internal editorial note (attachment or matrix reference)');
  const ids = new Set((atlas.resources ?? []).map((r) => r.id));
  if (ids.size !== (atlas.resources ?? []).length) problems.push('duplicate resource ids');
  for (const q of atlas.quantities ?? []) {
    if (!ids.has(q.dataset_id)) problems.push(`quantity ${q.id}: unknown resource ${q.dataset_id}`);
    if (q.value !== null && typeof q.value !== 'number') problems.push(`quantity ${q.id}: value must be a number or null`);
  }
  for (const r of atlas.resources ?? []) for (const p of [...(r.parents ?? []), ...(r.children ?? [])]) if (!ids.has(p)) problems.push(`resource ${r.id}: lineage points to unknown ${p}`);
  const c = atlas.counts ?? {};
  if (c.resources !== ids.size) problems.push('counts.resources does not match the resources');
  if (c.quantities !== (atlas.quantities ?? []).length) problems.push('counts.quantities does not match the quantities');
  const withQ = new Set((atlas.quantities ?? []).map((q) => q.dataset_id)).size;
  if (c.resources_with_quantities !== withQ || c.resources_awaiting_quantities !== ids.size - withQ) problems.push('quantity coverage counts do not match the rows');
  if (c.corpora !== (atlas.resources ?? []).filter((r) => r.resource_class === 'corpus').length) problems.push('counts.corpora does not match RESOURCE_CLASS');
  return problems;
}
