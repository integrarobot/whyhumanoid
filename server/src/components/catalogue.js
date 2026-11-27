// Components (Javier, 23 Nov 2026): the product catalogue of the Components tab (gid 100173846, native table
// HardwareCatalog A1:AK20). One physical product, model or version per row; the manufacturer or laboratory is an
// attribute, never the grain. Shared by the backend import (server/src/datasets.js specs, server/src/import/run.js)
// and the build tools, so both read the tab the same way:
//
// - The tab holds three blocks. The product table runs from the header row to the first empty row. Below it, a
//   CATALOGUE NOTES block (source notes and import history: read, counted, never imported as products or published)
//   and a RELATED SOFTWARE block with its own copy of the header row (TACTO: software, never counted as hardware).
//   Any other non-empty row outside those blocks stops the import: nothing is ingested by accident.
// - Values are kept as the source states them. "Not available", "N/A" and empty stay distinct and never become zero,
//   false or a decorative "undefined". Prices, distributor quotes, estimates and author BOM figures stay in their own
//   fields with their currency, date and configuration; nothing is converted.
// - The source workbook link and the row number are housekeeping: withheld at import. Clauses written for the
//   research prompt (who asked what, reminders to re-check) are removed; real technical caveats stay.

// The 37 columns A:AK of the product table (23 Nov 2026). Unchanged; a tab with only these columns stays valid.
export const COMPONENT_BASE_HEADERS = Object.freeze([
  'No.', 'Sensor', 'Group', 'Manufacturer / laboratory', 'Country', 'Year (launch / publication)', 'Current status',
  'Sensing principle', 'Measured quantities', 'No. of taxels / camera resolution', 'Spatial resolution', 'Force range',
  'Force resolution', 'Sampling rate / fps', 'Dimensions', 'Weight', 'Sensing surface / shape', 'Interface / connectivity',
  'Software / SDK / ROS', 'Durability / replaceable skin', 'List price (currency, date, source)',
  'Estimated BOM cost (open hardware)', 'Where to buy', 'Open-source license', 'Repository / design',
  'Key paper (title, journal/conference, year)', 'Known users / integrations', 'Advantages', 'Drawbacks', 'Main source URL',
  'Notes / uncertainties', 'Component ID', 'Component family', 'Review status', 'Source workbook', 'Sources and evidence',
  'Comparison summary',
]);

// Family-specific extension (26 Nov 2026, agreed with Codex): eight columns AL:AS appended in this order. When present
// they must be exactly these headers; the related software block may keep its 37-column header copy.
export const COMPONENT_EXTENSION_HEADERS = Object.freeze([
  'COMPONENT_CLASS', 'FUNCTION', 'APPLICATIONS', 'TECHNICAL_SPECIFICATIONS', 'INTEGRATION_REQUIREMENTS', 'LIMITATIONS',
  'EVIDENCE_SCOPE', 'CHECKED_AT',
]);
export const COMPONENT_HEADERS = Object.freeze([...COMPONENT_BASE_HEADERS, ...COMPONENT_EXTENSION_HEADERS]);

// Field names, column by column (server-side keys of every row).
export const COMPONENT_FIELDS = Object.freeze([
  'no', 'name', 'group', 'manufacturer', 'country', 'year', 'status', 'principle', 'measured', 'resolution_count',
  'spatial_resolution', 'force_range', 'force_resolution', 'sampling_rate', 'dimensions', 'weight', 'surface',
  'interface', 'software', 'durability', 'list_price', 'bom_cost', 'where_to_buy', 'licence', 'repository',
  'key_paper', 'integrations', 'advantages', 'drawbacks', 'main_source_url', 'notes', 'component_id', 'family',
  'review_status', 'source_workbook', 'sources', 'comparison_summary',
  'component_class', 'function', 'applications', 'technical_specifications', 'integration_requirements', 'limitations',
  'evidence_scope', 'checked_at',
]);

// Component classes (26 Nov 2026): the controlled family of every product, its Component ID prefix and the metric keys
// of TECHNICAL_SPECIFICATIONS that are compared within the family. Other snake_case keys are shown, never compared.
export const COMMON_METRICS = Object.freeze(['mass', 'dimensions', 'operating_voltage', 'rated_power', 'peak_power', 'communication_interface', 'ip_rating', 'operating_temperature', 'update_rate']);
export const COMPONENT_CLASSES = Object.freeze({
  tactile_sensor: { prefix: 'TAC', label: 'Tactile sensor', tactile: true, metrics: [] },
  tactile_hand: { prefix: 'TAC', label: 'Tactile robotic hand', tactile: true, metrics: [] },
  actuator: { prefix: 'ACT', label: 'Actuator', metrics: ['rated_torque', 'peak_torque', 'rated_speed', 'max_speed', 'gear_ratio', 'backlash', 'torque_density', 'encoder_resolution', 'continuous_current', 'peak_current', 'backdrivability'] },
  reducer: { prefix: 'RED', label: 'Reducer', metrics: ['gear_ratio', 'rated_torque', 'peak_torque', 'momentary_torque', 'backlash', 'torsional_stiffness', 'efficiency', 'max_input_speed', 'rated_life'] },
  motor_drive: { prefix: 'DRV', label: 'Motor or drive', metrics: ['rated_torque', 'peak_torque', 'rated_speed', 'continuous_current', 'peak_current', 'torque_constant', 'speed_constant', 'control_modes'] },
  dexterous_hand: { prefix: 'HND', label: 'Dexterous hand', metrics: ['degrees_of_freedom', 'actuated_dof', 'fingertip_force', 'grip_force', 'payload', 'closing_time', 'tactile_sensing'] },
  gripper: { prefix: 'GRP', label: 'Gripper', metrics: ['stroke', 'grip_force', 'payload', 'closing_time', 'repeatability'] },
  force_torque_sensor: { prefix: 'FTS', label: 'Force-torque sensor', metrics: ['force_range_xy', 'force_range_z', 'torque_range_xy', 'torque_range_z', 'force_resolution', 'torque_resolution', 'overload_capacity', 'sample_rate'] },
  vision_sensor: { prefix: 'VIS', label: 'Vision or depth sensor', metrics: ['depth_range', 'depth_resolution', 'rgb_resolution', 'frame_rate', 'field_of_view', 'baseline', 'depth_accuracy', 'shutter'] },
  compute_module: { prefix: 'CMU', label: 'Compute module', metrics: ['ai_performance', 'cpu', 'gpu', 'memory', 'power_range'] },
  motion_controller: { prefix: 'CTL', label: 'Motion controller', metrics: ['control_loop_rate', 'axes'] },
  power_battery: { prefix: 'PWR', label: 'Battery, cell or power part', metrics: ['capacity', 'nominal_voltage', 'chemistry', 'max_discharge_current', 'cycle_life'] },
  encoder: { prefix: 'ENC', label: 'Encoder', metrics: ['resolution', 'accuracy', 'max_speed'] },
  // Bearings (27 Nov 2026, Codex): rolling bearings sold as parts, such as cross-roller rings; dimensions and the maker's
  // basic load ratings are compared within the class; nothing about life or rigidity is inferred.
  bearing: { prefix: 'BRG', label: 'Bearing', metrics: ['inner_diameter', 'outer_diameter', 'width', 'dynamic_load_rating', 'static_load_rating'] },
});
export const EVIDENCE_SCOPES = Object.freeze(['manufacturer_datasheet', 'manufacturer_webpage', 'manufacturer_manual', 'peer_reviewed_paper', 'preprint', 'independent_test', 'distributor_listing']);
// Columns that describe touch sensing only: a product of another class leaves them empty or "N/A".
export const TACTILE_ONLY = Object.freeze(['resolution_count', 'spatial_resolution', 'force_range', 'force_resolution', 'surface', 'durability']);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// TECHNICAL_SPECIFICATIONS: one metric per line, seven fields separated by " | ":
// metric_key | value | unit | conditions | source_url | locator | checked_at. Values stay as the source states them.
export function parseSpecs(text) {
  const specs = [];
  const problems = [];
  String(text ?? '').split('\n').map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    const parts = line.split('|').map((x) => x.trim());
    if (parts.length !== 7) { problems.push(`specification line ${i + 1} has ${parts.length} fields, not 7`); return; }
    const [metric, value, unit, conditions, sourceUrl, locator, checkedAt] = parts;
    if (!/^[a-z][a-z0-9_]*$/.test(metric)) problems.push(`specification line ${i + 1}: metric "${metric}" is not snake_case`);
    if (!value) problems.push(`specification line ${i + 1} (${metric}): no value`);
    if (!/^https:\/\/\S+$/.test(sourceUrl)) problems.push(`specification line ${i + 1} (${metric}): source is not an https link`);
    if (!ISO_DAY.test(checkedAt)) problems.push(`specification line ${i + 1} (${metric}): checked date "${checkedAt}" is not YYYY-MM-DD`);
    specs.push({ metric, value, unit: unit || null, conditions: conditions || null, source_url: sourceUrl, locator: locator || null, checked_at: checkedAt });
  });
  return { specs, problems };
}
const isNa = (v) => v === null || v === undefined || String(v).trim() === '' || /^(N\/A|Not applicable)\b/i.test(String(v).trim());

// Housekeeping columns: the sheet's running number and the link to the research workbook the rows were imported from.
export const COMPONENT_WITHHELD = Object.freeze(['no', 'source_workbook']);

// Group -> availability class. Kinds, not a maturity ladder; anything else fails the import until it is reviewed.
export const GROUPS = Object.freeze({
  Commercial: { key: 'commercial', label: 'Commercial product' },
  'Commercial (early access)': { key: 'early_access', label: 'Early access, not on open sale' },
  'Commercial (discontinued)': { key: 'discontinued', label: 'Discontinued' },
  'Research / open hardware': { key: 'research', label: 'Research or open hardware' },
  'Software (simulator)': { key: 'software', label: 'Related software' },
});

const isEmptyRow = (row) => !(row ?? []).some((v) => String(v ?? '').trim() !== '');
const first = (row) => String(row?.[0] ?? '').trim();
const sameHeader = (row) => COMPONENT_BASE_HEADERS.every((h, i) => String(row?.[i] ?? '').trim() === h);

export class ComponentsLayoutError extends Error {}

// The three blocks of the tab, with their sheet rows. Throws on any row outside them.
export function componentBlocks(values) {
  const header = values[0] ?? [];
  const main = [];
  let i = 1;
  for (; i < values.length && !isEmptyRow(values[i]); i += 1) main.push({ sheetRow: i + 1, row: values[i] });
  const notes = [];
  const software = [];
  let softwareHeader = null;
  while (i < values.length) {
    const row = values[i];
    if (isEmptyRow(row)) { i += 1; continue; }
    if (/^CATALOGUE NOTES\b/i.test(first(row))) {
      for (i += 1; i < values.length && !isEmptyRow(values[i]); i += 1) notes.push({ sheetRow: i + 1, label: first(values[i]) });
      continue;
    }
    if (/^RELATED SOFTWARE\b/i.test(first(row))) {
      if (!sameHeader(values[i + 1])) throw new ComponentsLayoutError(`Components: the related software block at sheet row ${i + 1} has no header row identical to the product table`);
      softwareHeader = values[i + 1];
      for (i += 2; i < values.length && !isEmptyRow(values[i]); i += 1) software.push({ sheetRow: i + 1, row: values[i] });
      continue;
    }
    throw new ComponentsLayoutError(`Components: sheet row ${i + 1} ("${first(row).slice(0, 40)}") is outside the product table, the notes and the related software block`);
  }
  return { header, main, notes, software, softwareHeader };
}

export const selectProducts = (values) => { const b = componentBlocks(values); return { header: b.header, rows: b.main }; };
export const selectSoftware = (values) => {
  const b = componentBlocks(values);
  return { header: b.softwareHeader ?? COMPONENT_BASE_HEADERS, rows: b.software };
};

// Public-friendly text: the prompt-specific clauses of the research compilation go, the caveats stay.
// "Manufacturer verified" is the compilation's own wording, not an independent verification: removed with the others.
const PROMPT_CLAUSE = /\bthe query\b|\bquery asked\b|\bcheck periodically\b|\bgrok\b|\bmanufacturer verified\b/i;
export function scrubComponentText(field, value) {
  if (value === null || value === undefined) return value;
  let s = String(value);
  if (field === 'review_status') s = s.replace(/Imported from Grok workbook/i, 'Imported research compilation');
  if (field !== 'sources' && PROMPT_CLAUSE.test(s)) {
    s = s.split(/(?<=[.;])\s+/).filter((part) => !PROMPT_CLAUSE.test(part)).join(' ').trim();
  }
  s = s.replace(/\s+—\s+NOT\s+([^;.]+)$/u, ' (not $1)').replace(/\bNOT\b/g, 'not').replace(/^DISCONTINUED:/, 'Discontinued:');
  s = s.replace(/\bown calculation\b/g, 'arithmetic from the per-sensor figure, not a count of calibrated taxels');
  return s.trim() === '' ? null : s.trim();
}

// "Sources and evidence": blocks separated by blank lines; each a subject line, its link, the access date and the
// review state. Kept as entries so none is lost and each keeps its own subject.
export function parseSources(text) {
  if (!text) return [];
  return String(text).split(/\n\s*\n/).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const url = lines.find((l) => /^https?:\/\//.test(l)) ?? null;
    const accessed = lines.find((l) => /^Accessed:/i.test(l))?.replace(/^Accessed:\s*/i, '') ?? null;
    const review = lines.find((l) => /^Review status:/i.test(l))?.replace(/^Review status:\s*/i, '') ?? null;
    const subject = lines.find((l) => l !== url && !/^Accessed:|^Review status:/i.test(l)) ?? null;
    return { subject, url, accessed, review };
  }).filter((e) => e.subject || e.url);
}

// "Comparison summary": labelled lines (Label: value).
export function parseComparison(text) {
  if (!text) return [];
  return String(text).split('\n').map((l) => l.match(/^([^:]{2,60}):\s*(.*)$/)).filter(Boolean).map((m) => ({ label: m[1].trim(), value: m[2].trim() }));
}

const PRIVATE_LINK = /docs\.google\.com|drive\.google\.com|\/spreadsheets\/d\//i;

// Every problem that must stop an import. `products` and `software` are row data objects (COMPONENT_FIELDS keys).
export function componentProblems(products, software = []) {
  const problems = [];
  const ids = new Set();
  const check = (r, kind) => {
    const at = `Components ${r.component_id ?? '(no Component ID)'}`;
    if (!/^CMP-[A-Z]{3}-\d{3,}$/.test(r.component_id ?? '')) problems.push(`${at}: Component ID must look like CMP-XXX-000`);
    else if (ids.has(r.component_id)) problems.push(`${at}: duplicate Component ID`);
    ids.add(r.component_id);
    if (!r.name) problems.push(`${at}: Sensor (name) is empty`);
    if (!r.family) problems.push(`${at}: Component family is empty`);
    const g = GROUPS[r.group];
    if (!g) problems.push(`${at}: Group "${r.group ?? ''}" is not in the reviewed vocabulary`);
    else if (kind === 'product' && g.key === 'software') problems.push(`${at}: software in the physical product table`);
    else if (kind === 'software' && g.key !== 'software') problems.push(`${at}: a physical product in the related software block`);
    const sources = parseSources(r.sources);
    if (!sources.length) problems.push(`${at}: no entry in Sources and evidence`);
    for (const s of sources) if (!s.url) problems.push(`${at}: a source entry ("${s.subject ?? ''}") has no link`);
    if (PRIVATE_LINK.test(Object.values(r).join(' '))) problems.push(`${at}: holds a private workbook link`);
    // Family-specific extension (26 Nov 2026): checked whenever the row carries it, and required on every product once
    // any product does (the columns exist in the tab).
    if (kind === 'product' && (r.component_class || classified)) {
      const c = COMPONENT_CLASSES[r.component_class];
      if (!c) problems.push(`${at}: COMPONENT_CLASS "${r.component_class ?? ''}" is not in the reviewed vocabulary`);
      else {
        if (/^CMP-[A-Z]{3}-/.test(r.component_id ?? '') && r.component_id.slice(4, 7) !== c.prefix) problems.push(`${at}: Component ID prefix does not match class ${r.component_class} (${c.prefix})`);
        if (!c.tactile) for (const f of TACTILE_ONLY) if (!isNa(r[f])) problems.push(`${at}: ${f} is a touch-sensing column; a product of class ${r.component_class} leaves it empty or N/A`);
      }
    }
    if (r.technical_specifications) {
      const { specs, problems: sp } = parseSpecs(r.technical_specifications);
      for (const x of sp) problems.push(`${at}: ${x}`);
      const listed = new Set(sources.map((x) => x.url));
      for (const x of specs) if (/^https:\/\//.test(x.source_url) && !listed.has(x.source_url)) problems.push(`${at}: specification ${x.metric} cites ${x.source_url}, which is not in Sources and evidence`);
    }
    if (r.evidence_scope) for (const k of String(r.evidence_scope).split(';').map((x) => x.trim()).filter(Boolean)) if (!EVIDENCE_SCOPES.includes(k)) problems.push(`${at}: EVIDENCE_SCOPE "${k}" is not in the vocabulary`);
    if (r.checked_at && !ISO_DAY.test(r.checked_at)) problems.push(`${at}: CHECKED_AT "${r.checked_at}" is not YYYY-MM-DD`);
  };
  const classified = products.some((r) => r.component_class);
  for (const r of products) check(r, 'product');
  for (const r of software) check(r, 'software');
  return problems;
}
