// Evolution charts (Javier, 24 Nov 2026): one representative, sourced chronology per section, in this order:
// Humanoids, Deployments, Components, Integrators, Datasets, Benchmarks, Reports. Built only from the public snapshots
// the site already publishes and from the reviewed date decisions in tools/evolution-review.json, never from the master
// or a parallel catalogue. Aggregates and public fields only: no deployment id, site, task, metric or claim text.
//
// Rules: a record is placed in time only by a date its own public field states, at the end of the period that date
// names (a year-only date counts from 31 Dec of that year, a month from its last day), so nothing appears before it was
// published; review and snapshot dates are never used as history. A deployment case is drawn at each date with the most
// advanced status among the records published by then: the current status is never projected backwards. Benchmark
// results are compared only inside one comparability group; report estimates are drawn once each, apart by kind, never
// joined or interpolated. What cannot be dated is counted and listed as excluded.

import { MEANINGS, publicDateOf, publicDateProblems } from '../server/src/public-dates.js';
import { currentStatus, sourcePeriod } from '../server/src/public/status.js';

export const ORDER = ['humanoids', 'deployments', 'components', 'integrators', 'datasets', 'benchmarks', 'reports'];

const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
// A real calendar date at the precision written ("2026", "2026-03", "2026-03-14"), shared with the current-status
// policy (server/src/public/status.js): an impossible date (2026-02-30, 2026-13) is not a date.
export function parseDate(v) {
  const p = sourcePeriod(v);
  return p && { precision: p.precision, start: p.start, end: p.end };
}
export const dayNumber = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY);
const minIso = (a, b) => (a <= b ? a : b);
const isoOf = (snapshot) => String(snapshot ?? '').slice(0, 10);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const fail = (msg) => { throw new Error(`evolution: ${msg}`); };
const mid = (d) => { const a = dayNumber(d.start); const b = dayNumber(d.end); return new Date(Math.round((a + b) / 2) * DAY).toISOString().slice(0, 10); };
const countBy = (xs, f) => { const m = new Map(); for (const x of xs) m.set(f(x), (m.get(f(x)) ?? 0) + 1); return m; };

// ---------- Humanoids: model introductions by dated release or unveiling ----------
function humanoids(cat, review, classification = { records: [] }) {
  const r = review.humanoids;
  const snapshot = isoOf(cat.snapshot);
  const excludedById = new Map(r.excluded.map((x) => [x.id, x]));
  const dated = [];
  const excluded = { reviewed: [], undisclosed: [], empty: [], notRelease: [], other: [] };
  // Software or AI models recorded in the Humanoids tab (tools/catalogue-classification.json) are not robots: outside the
  // denominator. Entries of uncertain scope stay in it, named in the note.
  const kindOf = new Map((classification.records ?? []).map((c) => [c.id, c.kind]));
  const software = cat.records.filter((rec) => kindOf.get(rec.id) === 'software');
  const uncertain = cat.records.filter((rec) => kindOf.get(rec.id) === 'uncertain');
  for (const rec of cat.records) {
    if (kindOf.get(rec.id) === 'software') continue;
    const v = String(rec[r.field] ?? '').trim();
    const ex = excludedById.get(rec.id);
    if (ex) {
      if (!v.includes(ex.excerpt)) fail(`Humanoids ${rec.id}: excerpt "${ex.excerpt}" not in Release`);
      excluded.reviewed.push({ id: rec.id, name: `${rec.Lab} ${rec.Robot}`, reason: ex.reason });
      continue;
    }
    // A release or unveiling date as the record writes it (25 Nov 2026: the current Humanoids tab): a real calendar date
    // at the start of the value ("2024-05-13 (G1 introduction)", "2019 (PAL timeline)") or after a launch verb
    // ("Launched 2026-05-26", "Unveiled at NVIDIA GTC, 2026-03-18"), at the precision the source gives. A date that
    // names something other than a release ("project initiated"), a plan or reservation, or a date without a year is
    // not used; nothing is inferred from text.
    // What is not a model release keeps its own named reason (Codex, 25 Nov 2026): a company founding, a funding round,
    // a project start, access or reservations, and plans or targets.
    const NOT_RELEASE = [
      [/\bfounded\b|\bfounding\b|incorporat/i, 'a company founding, not a model release'],
      [/\bfunding\b|\braised\b|\bseries [a-e]\b|\bseed round\b/i, 'a funding round, not a model release'],
      [/project initiated|programme started|program started|project started/i, 'a project start, not a model release'],
      [/reservations?|waitlist|deposit|early access|pre-?order/i, 'access or reservations, not a release'],
      [/not released|planned|targeted|\btarget\b|estimated delivery|expected/i, 'a plan or target, not a release'],
    ];
    const notRelease = NOT_RELEASE.find(([re]) => re.test(v));
    let m = v.match(/^(\d{4}(?:-\d{2}(?:-\d{2})?)?)(?:\s*\((.+)\))?$/) ?? v.match(/^(?:Launched|Unveiled|Released|Introduced|Announced)\b[^()]*?\b(\d{4}-\d{2}(?:-\d{2})?)\b(?:\s*\((.+)\))?$/i);
    const date = m && parseDate(m[1]);
    const doubtful = /not disclosed|unverified|not verified|to be confirmed|not found|not confirmed|unknown|not stated|not public/i.test(v);
    if (date && !notRelease && !doubtful) { dated.push({ id: rec.id, name: `${rec.Lab} ${rec.Robot}`, date, kind: m[2] ? `${date.precision === 'year' ? 'year' : date.precision === 'month' ? 'month' : 'day'}: ${m[2]}` : 'release year' }); continue; }
    if (!v) excluded.empty.push(rec.id);
    else if (notRelease) excluded.notRelease.push({ id: rec.id, name: `${rec.Lab} ${rec.Robot}`, reason: notRelease[1] });
    else if (doubtful) excluded.undisclosed.push(rec.id);
    else excluded.other.push({ id: rec.id, name: `${rec.Lab} ${rec.Robot}`, value: v });
  }
  for (const id of excludedById.keys()) if (!cat.records.some((x) => x.id === id)) fail(`Humanoids ${id}: reviewed id not in the catalogue`);

  const years = dated.map((d) => +d.date.start.slice(0, 4));
  const y0 = Math.min(...years);
  const y1 = +snapshot.slice(0, 4);
  const columns = [];
  for (let y = y0; y <= y1; y++) {
    const xs = dated.filter((d) => +d.date.start.slice(0, 4) === y);
    columns.push({ key: String(y), label: String(y), t: minIso(`${y}-12-31`, snapshot), value: xs.length, partial: y === y1, items: xs.map((d) => d.name).sort() });
  }
  const total = cat.records.length - software.length;
  return {
    id: 'humanoids', label: 'Humanoids', path: '/humanoids/', type: 'columns',
    title: 'Humanoid models introduced per year',
    subtitle: `Models in the free catalogue by the year of their recorded release or unveiling: ${dated.length} of ${total} robots are dated.`,
    meaning: r.meaning, unit: 'models', precision: 'year',
    domain: { start: `${y0}-01-01`, end: snapshot },
    columns,
    final: { dated: dated.length, by_year: Object.fromEntries(columns.map((c) => [c.key, c.value])) },
    summary: `${dated.length} dated introductions from ${y0} to ${y1}; ${columns.filter((c) => c.value).sort((a, b) => b.value - a.value)[0].key} has the most (${Math.max(...columns.map((c) => c.value))}). ${y1} counts to ${snapshot}.`,
    coverage: {
      included: dated.length, total, unit: 'robots',
      excluded: [
        { reason: 'Release not disclosed or not verified', count: excluded.undisclosed.length },
        { reason: 'Release field empty', count: excluded.empty.length },
        ...excluded.notRelease.map((x) => ({ reason: `${x.name}: ${x.reason}`, count: 1 })),
        ...excluded.other.map((x) => ({ reason: `${x.name}: the release date is written in prose or without a year; it is not read automatically`, count: 1 })),
        ...excluded.reviewed.map((x) => ({ reason: `${x.name}: ${x.reason}`, count: 1 })),
      ],
      note: [
        `Release dates as the records write them: ${['day', 'month', 'year'].map((p) => `${dated.filter((d) => d.date.precision === p).length} to the ${p}`).join(', ')}; each is placed in its year.`,
        software.length ? `${plural(software.length, 'software or AI model')} recorded in the Humanoids tab (${software.map((x) => `${x.Lab} ${x.Robot}`).join(', ')}) ${software.length === 1 ? 'is' : 'are'} not a robot and outside this count.` : '',
        uncertain.length ? `${plural(uncertain.length, 'entry', 'entries')} of uncertain scope (${uncertain.map((x) => `${x.Lab} ${x.Robot}`).join(', ')}) ${uncertain.length === 1 ? 'is' : 'are'} inside it, undated.` : '',
      ].filter(Boolean).join(' '),
    },
    status: 'partial',
    status_note: `Partial: ${total - dated.length} of ${total} catalogue robots have no usable release date.`,
    sources: [{ label: `Free Humanoids catalogue, snapshot ${snapshot}`, url: '/data/humanoids-catalogue.json' }],
    table: { head: ['Year', 'Models introduced', 'Models'], rows: columns.filter((c) => c.value).map((c) => [c.label, String(c.value), c.items.join('; ')]) },
  };
}

// ---------- Deployments: cases by the most advanced status published by each quarter end ----------
const STATUS_KEY = (s) => (s === 'operational' ? 'op' : s === 'pilot' || s === 'testing' ? 'pilot' : s === 'planned' ? 'ann' : 'unc');
const CASE_RANK = { op: 0, pilot: 1, unc: 2, ann: 3 };
export const DEPLOYMENT_STAGES = [
  { key: 'ann', label: 'Announced', note: 'planned or agreed, not evidence of work' },
  { key: 'unc', label: 'Unconfirmed', note: 'operation claimed by a vendor, or unresolved' },
  { key: 'pilot', label: 'Pilot or trial', note: 'a pilot, trial or test' },
  { key: 'op', label: 'In operation', note: 'the source says the robot is working in operation' },
];
export function stageAt(records, iso) {
  const live = records.filter((r) => r.date && r.date.end <= iso);
  if (!live.length) return null;
  return live.map((r) => r.key).sort((a, b) => CASE_RANK[a] - CASE_RANK[b])[0];
}
function deployments(prev) {
  const snapshot = isoOf(prev.snapshot);
  const groups = new Map();
  for (const r of prev.rows) {
    const k = r.deployment_id || r.record_id;
    if (!groups.has(k)) groups.set(k, []);
    const d = parseDate(r.publication_date);
    // Published by the snapshot at the latest: a date of this year or month counts at the snapshot, not after it.
    groups.get(k).push({ key: STATUS_KEY(r.operational_status), date: d && { ...d, end: minIso(d.end, snapshot) } });
  }
  const cases = [...groups.values()];
  const rawCases = [...prev.rows.reduce((m, r) => m.set(r.deployment_id || r.record_id, [...(m.get(r.deployment_id || r.record_id) ?? []), r]), new Map()).values()];
  const coarseNow = prev.rows.filter((r) => { const d = parseDate(r.publication_date); return d && d.precision !== 'day' && d.end > snapshot; }).length;
  const datedRecords = prev.rows.filter((r) => parseDate(r.publication_date)).length;
  const first = cases.flatMap((rs) => rs.filter((r) => r.date).map((r) => r.date.end)).sort()[0];
  const y0 = +first.slice(0, 4);
  const columns = [];
  for (let y = y0; y <= +snapshot.slice(0, 4); y++) {
    for (let q = 1; q <= 4; q++) {
      const qEnd = `${y}-${pad(q * 3)}-${pad(lastDay(y, q * 3))}`;
      const qStart = `${y}-${pad(q * 3 - 2)}-01`;
      if (qStart > snapshot) break;
      const t = minIso(qEnd, snapshot);
      const seg = Object.fromEntries(DEPLOYMENT_STAGES.map((s) => [s.key, 0]));
      for (const rs of cases) { const s = stageAt(rs, t); if (s) seg[s] += 1; }
      const value = Object.values(seg).reduce((a, b) => a + b, 0);
      columns.push({ key: `${y}-Q${q}`, label: q === 1 ? String(y) : '', long: `Q${q} ${y}${t < qEnd ? ` (to ${t})` : ''}`, t, value, segments: seg, partial: t < qEnd });
    }
  }
  while (columns.length > 1 && columns[0].value === 0 && columns[1].value === 0) columns.shift();
  if (columns[0].value === 0) columns[0].label = columns[0].key.slice(0, 4);
  const last = columns[columns.length - 1];
  const neverDated = cases.filter((rs) => !rs.some((r) => r.date)).length;
  const someUndated = cases.filter((rs) => rs.some((r) => !r.date) && rs.some((r) => r.date)).length;
  // The same cases with every record, dated or not: the status the public adoption view shows today.
  // The current summaries' rule (latest dated source), for the note only: the chart itself never uses it.
  const current = Object.fromEntries(DEPLOYMENT_STAGES.map((s) => [s.key, 0]));
  for (const rs of rawCases) { const c = currentStatus(rs, (r) => STATUS_KEY(r.operational_status)); if (c.dated) current[c.key] += 1; }
  const allNow = Object.fromEntries(DEPLOYMENT_STAGES.map((s) => [s.key, 0]));
  for (const rs of cases) allNow[rs.map((r) => r.key).sort((a, b) => CASE_RANK[a] - CASE_RANK[b])[0]] += 1;
  return {
    id: 'deployments', label: 'Deployments', path: '/deployments/', type: 'stack',
    title: 'Deployment cases documented, by the most advanced status documented so far',
    subtitle: 'Evidence chronology: each case counts from its first dated public source, at the most advanced status its sources had documented by the end of each quarter. Not deployment start dates and not an operating fleet.',
    meaning: 'Publication date of each source record, as recorded (evidence chronology, not the date work started). A year-only date counts from 31 December of that year and a month from its last day, or from the snapshot date for the current year or month. The status is the most advanced one documented by that date: a later status is never drawn earlier, and a later source that says less does not erase it, so this series cannot show a regression. Undated records stay outside the series.',
    unit: 'cases', precision: 'quarter',
    domain: { start: `${y0}-01-01`, end: snapshot },
    series: DEPLOYMENT_STAGES,
    columns,
    // Outside the time series: cases with no dated record, by their status as recorded. Never given a date.
    undated: { label: 'Date unknown', cases: neverDated, records: prev.rows.length - datedRecords, segments: Object.fromEntries(DEPLOYMENT_STAGES.map((s) => [s.key, cases.filter((rs) => !rs.some((r) => r.date) && rs.map((r) => r.key).sort((a, b) => CASE_RANK[a] - CASE_RANK[b])[0] === s.key).length])) },
    final: { cases: last.value, segments: last.segments, all_records_now: allNow },
    summary: `By ${snapshot}, ${last.value} of ${cases.length} cases have a dated source: ${DEPLOYMENT_STAGES.slice().reverse().map((s) => `${last.segments[s.key]} ${s.label.toLowerCase()}`).join(', ')}.`,
    coverage: {
      included: last.value, total: cases.length, unit: 'cases',
      excluded: [
        { reason: 'Cases whose records all lack a publication date', count: neverDated },
        { reason: `Records without a publication date (of ${prev.rows.length})`, count: prev.rows.length - datedRecords },
      ],
      note: `${coarseNow} records dated only by the current year or month count from the snapshot date. ${someUndated} placed ${someUndated === 1 ? 'case also has' : 'cases also have'} undated records, which are left out of their status. This chart counts the most advanced status documented by each date; the current summaries on the home page and in the Deployments section use each case's latest dated source instead (server/src/public/status.js), so their totals differ: currently ${DEPLOYMENT_STAGES.slice().reverse().map((s) => `${current[s.key]} ${s.label.toLowerCase()}`).join(', ')} among the ${cases.length - neverDated} dated cases. Undated evidence is kept apart and never assigned a date.`,
    },
    status: neverDated ? 'partial' : 'complete',
    status_note: `${last.value} of ${cases.length} cases placed in time; ${plural(neverDated, 'case')} with no dated record ${neverDated === 1 ? 'stays' : 'stay'} in the date-unknown bar, outside the time series.`,
    sources: [{ label: `Deployments public summaries, snapshot ${snapshot}`, url: '/data/preview/deployments.json' }],
    table: { head: ['Quarter', ...DEPLOYMENT_STAGES.slice().reverse().map((s) => s.label), 'Cases'], rows: columns.map((c) => [c.long, ...DEPLOYMENT_STAGES.slice().reverse().map((s) => String(c.segments[s.key])), String(c.value)]) },
  };
}

// ---------- Lanes: dated points in rows (Components, Integrators, Datasets) ----------
function lanePoint(id, label, row, dateStr, extra = {}) {
  const date = parseDate(dateStr);
  if (!date) fail(`${id}: date "${dateStr}" is not YYYY, YYYY-MM or YYYY-MM-DD`);
  return { id, label, row, date: dateStr, precision: date.precision, x: date.precision === 'day' ? date.start : mid(date), reveal: date.end, ...extra };
}
function clampReveal(points, snapshot) { for (const p of points) p.t = minIso(p.reveal, snapshot); return points; }

function components(hw, review) {
  const r = review.components;
  const snapshot = isoOf(hw.snapshot);
  const byId = new Map(hw.rows.map((x) => [x.component_id, x]));
  const points = r.products.map((p) => {
    const row = byId.get(p.id);
    if (!row) fail(`Components ${p.id}: not in the public products`);
    if (!String(row[r.field]).includes(p.excerpt)) fail(`Components ${p.id}: excerpt "${p.excerpt}" not in year`);
    if (!r.rows.some((x) => x.key === p.row)) fail(`Components ${p.id}: unknown row ${p.row}`);
    return lanePoint(p.id, row.name, p.row, p.date, { note: p.event, href: `/components/${p.id.toLowerCase()}/`, hollow: row.family !== 'Tactile sensor' });
  });
  for (const x of r.excluded) { const row = byId.get(x.id); if (!row || !String(row[r.field]).includes(x.excerpt)) fail(`Components ${x.id}: exclusion excerpt not found`); }
  const reviewed = new Set([...r.products, ...r.excluded].map((x) => x.id));
  const missing = hw.rows.filter((x) => !reviewed.has(x.component_id)).map((x) => x.component_id);
  if (missing.length) fail(`Components: products without a reviewed date decision: ${missing.join(', ')}`);
  clampReveal(points, snapshot);
  const y0 = Math.min(...points.map((p) => +p.date.slice(0, 4)));
  return {
    id: 'components', label: 'Components', path: '/components/', type: 'lanes',
    title: 'When each tactile sensing product first appeared',
    subtitle: `${points.length} of ${hw.rows.length} products by the date of their first paper, preprint or launch, grouped by sensing principle.`,
    meaning: r.meaning, unit: 'products', precision: 'year',
    domain: { start: `${y0}-01-01`, end: snapshot }, rows: r.rows, points: points.sort((a, b) => a.x.localeCompare(b.x)),
    final: { dated: points.length, by_row: Object.fromEntries(r.rows.map((x) => [x.key, points.filter((p) => p.row === x.key).length])) },
    summary: `${points.length} products dated from ${y0} to ${points[points.length - 1].date.slice(0, 4)}: ${r.rows.map((x) => `${points.filter((p) => p.row === x.key).length} ${x.label.toLowerCase()}`).join(', ')}. No performance figures are compared: units and test conditions differ.`,
    coverage: { included: points.length, total: hw.rows.length, unit: 'products', excluded: r.excluded.map((x) => ({ reason: `${byId.get(x.id).name}: ${x.reason}`, count: 1 })), note: 'Hollow mark: a complete robotic hand, not a standalone sensor.' },
    status: 'partial', status_note: `${points.length} of ${hw.rows.length} products placed in time; ${hw.rows.length - points.length} cannot be dated from the recorded text.`,
    sources: [{ label: `Components public product rows, snapshot ${snapshot}`, url: '/data/preview/hardware.json' }],
    table: { head: ['Date', 'Product', 'Principle', 'Event as recorded'], rows: points.map((p) => [p.date, p.label, r.rows.find((x) => x.key === p.row).label, p.note]) },
  };
}

function integrators(atlas, review) {
  const r = review.integrators;
  const snapshot = isoOf(atlas.snapshot);
  const byId = new Map(atlas.providers.map((p) => [p.id, p]));
  const projects = new Set(atlas.projects.map((p) => p.id));
  const seen = new Set();
  const points = r.events.map((e) => {
    if (seen.has(e.id)) fail(`Integrators: event ${e.id} twice`);
    seen.add(e.id);
    const provs = e.providers.map((id) => byId.get(id) ?? fail(`Integrators ${e.id}: provider ${id} not in the atlas`));
    if (!provs.some((p) => String(p.fields[r.field]).includes(e.excerpt))) fail(`Integrators ${e.id}: excerpt "${e.excerpt}" not in source dates`);
    const evid = byId.get(e.evidence_provider ?? e.providers[0]);
    if (!String(evid.fields.evidence_stage).includes(e.evidence_excerpt)) fail(`Integrators ${e.id}: evidence excerpt not in evidence stage`);
    if (e.project && !projects.has(e.project)) fail(`Integrators ${e.id}: project ${e.project} not in the atlas`);
    if (!r.rows.some((x) => x.key === e.row)) fail(`Integrators ${e.id}: unknown row ${e.row}`);
    return lanePoint(e.id, e.label, e.row, e.date, { note: provs.map((p) => p.display_name).join(' and '), href: `/integrators/#${e.project ? `project-${e.project}` : 'projects'}`, hollow: e.row === 'simulation' });
  });
  for (const x of r.not_counted) if (!String(byId.get(x.provider)?.fields[r.field]).includes(x.excerpt)) fail(`Integrators: not-counted excerpt "${x.excerpt}" not found`);
  clampReveal(points, snapshot);
  const providersWithDate = new Set(r.events.flatMap((e) => e.providers));
  const undatedProviders = atlas.providers.filter((p) => !providersWithDate.has(p.id));
  const undatedProjects = atlas.projects.filter((p) => !r.events.some((e) => e.project === p.id));
  const y0 = Math.min(...points.map((p) => +p.date.slice(0, 4)));
  return {
    id: 'integrators', label: 'Integrators', path: '/integrators/', type: 'lanes',
    title: 'Dated integration evidence, by what it shows',
    subtitle: `${points.length} dated projects, partnerships and test results from ${providersWithDate.size} of ${atlas.providers.length} providers, by the strength of the evidence. A shared project counts once.`,
    meaning: r.meaning, unit: 'events', precision: 'day',
    domain: { start: `${y0}-01-01`, end: snapshot }, rows: r.rows, points: points.sort((a, b) => a.x.localeCompare(b.x)),
    final: { events: points.length, by_row: Object.fromEntries(r.rows.map((x) => [x.key, points.filter((p) => p.row === x.key).length])) },
    summary: `${points.length} dated events from ${y0} to ${points[points.length - 1].date}: ${r.rows.map((x) => `${points.filter((p) => p.row === x.key).length} ${x.label.toLowerCase()}`).join('; ')}. An announcement is not delivered work.`,
    coverage: {
      included: providersWithDate.size, total: atlas.providers.length, unit: 'providers',
      excluded: [
        { reason: 'Providers whose reviewed pages state no dates', count: undatedProviders.length },
        ...undatedProjects.map((p) => ({ reason: `Named project without a dated source: ${p.name}`, count: 1 })),
        ...r.not_counted.map((x) => ({ reason: x.reason, count: 1 })),
      ],
      note: 'Hollow mark: simulation only (CA3, a listed exception, never counted as a humanoid integrator).',
    },
    status: 'partial', status_note: `${providersWithDate.size} of ${atlas.providers.length} providers have dated evidence; ${undatedProviders.length} have none on their reviewed pages.`,
    sources: [{ label: `Integrators atlas, snapshot ${snapshot}`, url: '/data/integrators/atlas.json' }],
    table: { head: ['Date', 'Event', 'Providers', 'Evidence'], rows: points.map((p) => [p.date, p.label, p.note, r.rows.find((x) => x.key === p.row).label]) },
  };
}

// Datasets: the dated event of each resource in its stated meaning (today, the first arXiv submission of the associated
// paper; not necessarily the resource's first public appearance). The master's PUBLIC_DATE columns
// (server/src/public-dates.js) are the source; the reviewed dates of tools/evolution-review.json fill only resources
// whose columns are still empty, and must agree with the master where both exist.
function datasets(atlas, review) {
  const r = review.datasets;
  const byId = new Map(atlas.resources.map((x) => [x.id, x]));
  const lanes = atlas.vocabulary.lanes;
  const reviewed = new Map(r.papers.map((p) => [p.id, p]));
  for (const p of r.papers) {
    if (!byId.has(p.id)) fail(`Datasets ${p.id}: not in the atlas`);
    if (!/^\d{4}\.\d{4,5}$/.test(p.arxiv)) fail(`Datasets ${p.id}: bad arXiv id`);
  }
  const points = [];
  for (const res of atlas.resources) {
    const master = publicDateOf(res);
    const rv = reviewed.get(res.id);
    const fromReview = rv && {
      date: rv.date, meaning: 'associated_paper_first_arxiv_submission', source_url: `https://arxiv.org/abs/${rv.arxiv}`,
      locator: r.locator, checked_at: rv.checked_at ?? r.checked_at, note: rv.note ?? null,
    };
    if (master && fromReview && (master.date !== fromReview.date || master.meaning !== fromReview.meaning || master.source_url !== fromReview.source_url)) {
      fail(`Datasets ${res.id}: the master says ${master.date} (${master.meaning}, ${master.source_url}) but the reviewed reading says ${fromReview.date} (${fromReview.source_url})`);
    }
    const d = master ?? fromReview;
    if (!d) continue;
    const problems = publicDateProblems({ public_date: d.date, public_date_precision: parseDate(d.date)?.precision, public_date_meaning: d.meaning, public_date_source_url: d.source_url, public_date_locator: d.locator, public_date_checked_at: d.checked_at }, 'datasets', `Datasets ${res.id}`);
    if (problems.length) fail(problems.join('; '));
    const arxiv = /arxiv\.org\/abs\/(\S+)$/.exec(d.source_url ?? '')?.[1];
    points.push(lanePoint(res.id, res.name, res.lane, d.date, {
      note: `${arxiv ? `arXiv ${arxiv}` : MEANINGS[d.meaning].short}${d.note ? `. ${d.note}` : ''}`, meaning: d.meaning, checked_at: d.checked_at,
      from: master ? 'master' : 'review', href: d.source_url, external: true,
    }));
  }
  const rowsUsed = lanes.filter((l) => points.some((p) => p.row === l.key)).map((l) => ({ key: l.key, label: l.label }));
  const end = points.map((p) => p.checked_at).sort().at(-1);
  clampReveal(points, end);
  points.sort((a, b) => a.x.localeCompare(b.x));
  const undated = atlas.resources.filter((x) => !points.some((p) => p.id === x.id));
  const meanings = [...new Set(points.map((p) => p.meaning))];
  const onlyPapers = meanings.length === 1 && meanings[0] === 'associated_paper_first_arxiv_submission';
  return {
    id: 'datasets', label: 'Datasets', path: '/datasets/', type: 'lanes',
    title: onlyPapers ? 'Associated papers of robot learning data resources' : 'Dated papers and announcements of robot learning data resources',
    subtitle: `${points.length} of ${atlas.resources.length} resources by ${onlyPapers ? 'the first arXiv submission of their associated paper' : 'the date of their associated paper or announcement, each in its stated meaning'}: a partial chronology of publications, not of dataset releases or volume.`,
    meaning: onlyPapers ? r.meaning : `${r.meaning} Each date keeps its own meaning: ${meanings.map((m) => MEANINGS[m].label.toLowerCase()).join('; ')}.`,
    unit: onlyPapers ? 'papers' : 'resources', precision: 'day',
    domain: { start: `${Math.min(...points.map((p) => +p.date.slice(0, 4)))}-01-01`, end }, rows: rowsUsed, points,
    final: { papers: points.length, by_row: Object.fromEntries(rowsUsed.map((x) => [x.key, points.filter((p) => p.row === x.key).length])) },
    summary: `${points.length} ${onlyPapers ? 'associated papers' : 'dated resources'} from ${points[0].date.slice(0, 4)} to ${points[points.length - 1].date.slice(0, 4)}: ${rowsUsed.map((x) => `${points.filter((p) => p.row === x.key).length} ${x.label.toLowerCase()}`).join(', ')}. Collections overlap: their sizes are never added.`,
    coverage: { included: points.length, total: atlas.resources.length, unit: 'resources', excluded: [{ reason: 'Resources without a checked date yet', count: undated.length }], note: 'Several papers have later versions; current figures are not dated back to v1. A date is the first arXiv submission of the associated paper unless its row says otherwise; where a paper or announcement came earlier, the row says so.' },
    status: 'partial', status_note: `Partial: ${points.length} of ${atlas.resources.length} resources dated; ${undated.length} undated. Release and availability dates are not established.`,
    sources: [{ label: `arXiv submission histories, checked ${[...new Set(points.map((p) => p.checked_at))].sort().join(' and ')}`, url: 'https://arxiv.org/' }, { label: `Robot Learning Data Atlas, snapshot ${isoOf(atlas.snapshot?.exported_at ?? atlas.snapshot)}`, url: '/data/datasets/atlas.json' }],
    table: { head: ['First submitted', 'Resource', 'Origin', 'Paper and notes'], rows: points.map((p) => [p.date, p.label, rowsUsed.find((x) => x.key === p.row).label, p.note]) },
  };
}

// Benchmarks: dated publications and announcements of each benchmark, from the master's PUBLIC_DATE columns, by setting.
// Each date keeps its meaning (mostly the first arXiv submission of the associated paper). These need not be a
// benchmark's first public appearance (BEHAVIOR-1K had an earlier paper), and are never result or protocol dates.
// The dated results chart (benchmarkResults) follows it on the section page.
function benchmarks(atlas, review) {
  const r = review.benchmarks;
  const settings = atlas.vocabulary.settings;
  const points = [];
  for (const b of atlas.benchmarks) {
    const d = publicDateOf(b);
    if (!d) continue;
    const problems = publicDateProblems(b, 'benchmarks', `Benchmarks ${b.id}`);
    if (problems.length) fail(problems.join('; '));
    if (!settings.some((s) => s.key === b.setting)) fail(`Benchmarks ${b.id}: unknown setting ${b.setting}`);
    const arxiv = /arxiv\.org\/abs\/(\S+)$/.exec(d.source_url ?? '')?.[1];
    points.push(lanePoint(b.id, b.name, b.setting, d.date, {
      note: `${MEANINGS[d.meaning].short}${arxiv ? ` ${arxiv}` : ''}${d.note ? `. ${d.note}` : ''}`, meaning: d.meaning, checked_at: d.checked_at,
      href: d.source_url, external: true, hollow: !MEANINGS[d.meaning].arxiv,
    }));
  }
  if (!points.length) return benchmarkResults(atlas, review);
  const end = points.map((p) => p.checked_at).sort().at(-1);
  clampReveal(points, end);
  points.sort((a, b) => a.x.localeCompare(b.x));
  const rows = settings.filter((s) => points.some((p) => p.row === s.key)).map((s) => ({ key: s.key, label: s.label }));
  const undated = atlas.benchmarks.filter((b) => !points.some((p) => p.id === b.id));
  const meanings = [...new Set(points.map((p) => p.meaning))];
  return {
    id: 'benchmarks', label: 'Benchmarks', path: '/benchmarks/', type: 'lanes',
    title: 'Dated publications and announcements of robotics benchmarks',
    subtitle: `${points.length} of ${atlas.benchmarks.length} benchmarks by the date of their associated paper or official announcement, grouped by evaluation setting. Most dates are first arXiv submissions; they need not be the benchmark’s first public appearance. Not dates of results.`,
    meaning: r.public_meaning, unit: 'benchmarks', precision: 'day', hollowLabel: 'Dated by an announcement or a publication year, not arXiv',
    domain: { start: `${Math.min(...points.map((p) => +p.date.slice(0, 4)))}-01-01`, end }, rows, points,
    final: { benchmarks: points.length, by_row: Object.fromEntries(rows.map((x) => [x.key, points.filter((p) => p.row === x.key).length])), meanings: Object.fromEntries(meanings.map((m) => [m, points.filter((p) => p.meaning === m).length])) },
    summary: `${points.length} benchmarks with a dated paper or announcement, from ${points[0].date.slice(0, 4)} to ${points.at(-1).date.slice(0, 4)}: ${rows.map((x) => `${points.filter((p) => p.row === x.key).length} ${x.label.toLowerCase()}`).join(', ')}. ${points.filter((p) => +p.date.slice(0, 4) >= 2025).length} of them since 2025. Each date is the benchmark's associated paper or announcement, not necessarily its first public appearance, and says nothing about how models score on it.`,
    coverage: {
      included: points.length, total: atlas.benchmarks.length, unit: 'benchmarks',
      excluded: undated.map((b) => ({ reason: `${b.name}: no checked date of a paper or announcement`, count: 1 })),
      note: `Meanings: ${meanings.map((m) => `${points.filter((p) => p.meaning === m).length} ${MEANINGS[m].label.toLowerCase()}`).join('; ')}. Hollow mark: dated by an announcement or a publication year instead of an arXiv submission.`,
    },
    status: 'partial', status_note: `${points.length} of ${atlas.benchmarks.length} benchmarks dated; not yet: ${undated.map((b) => b.name).join(', ') || 'none'}.`,
    sources: [{ label: `Dated papers and announcements in the master, checked ${[...new Set(points.map((p) => p.checked_at))].sort().join(' and ')}`, url: '/data/benchmarks/atlas.json' }],
    table: { head: ['Date', 'Benchmark', 'Setting', 'What the date is'], rows: points.map((p) => [p.date, p.label, rows.find((x) => x.key === p.row).label, p.note]) },
    secondary: benchmarkResults(atlas, review),
  };
}

// Benchmarks, second chart: dated results, only within one comparability group (shown on /benchmarks/ under the
// publication chronology).
function benchmarkResults(atlas, review) {
  const r = review.benchmarks;
  const snapshot = isoOf(atlas.snapshot?.exported_at);
  const panels = r.groups.map((g) => {
    const rs = atlas.results.filter((x) => x.comparability_group === g);
    if (rs.length < 2) fail(`Benchmarks: group ${g} has fewer than two results`);
    const one = (k) => { const v = new Set(rs.map((x) => x[k])); if (v.size !== 1) fail(`Benchmarks ${g}: mixed ${k}`); return [...v][0]; };
    const [metric, unit, version, track, config, direction, meaning] = ['metric', 'unit', 'benchmark_version', 'track', 'model_configuration', 'direction', 'date_meaning'].map(one);
    if (!/not experiment date/i.test(meaning)) fail(`Benchmarks ${g}: date meaning changed`);
    const points = rs.map((x) => ({ id: x.result_id, label: x.model, y: x.value, value: `${x.value}${unit}`, ...lanePoint(x.result_id, x.model, g, x.result_date), row: g })).sort((a, b) => a.x.localeCompare(b.x) || b.y - a.y);
    clampReveal(points, snapshot);
    return { key: g, label: `${metric}, ${version} set, ${track}`, config, metric, unit, direction, points, dates: [...new Set(points.map((p) => p.date))] };
  });
  const allResults = atlas.results.length;
  const plotted = panels.reduce((a, p) => a + p.points.length, 0);
  const groups = countBy(atlas.results, (x) => x.comparability_group);
  const singleDate = [...groups.keys()].filter((g) => new Set(atlas.results.filter((x) => x.comparability_group === g).map((x) => x.result_date)).size < 2);
  const dates = panels.flatMap((p) => p.points.map((x) => x.date)).sort();
  return {
    id: 'benchmarks-results', label: 'Benchmarks', path: '/benchmarks/', type: 'panels',
    title: 'Physics-IQ scores by the date each was added',
    subtitle: `${plotted} source-reported results in ${panels.length} comparability groups, each on its own scale. The only groups in the atlas with results added on more than one date.`,
    meaning: r.meaning, unit: '%', precision: 'day',
    domain: { start: `${dates[0].slice(0, 4)}-01-01`, end: snapshot }, panels,
    final: Object.fromEntries(panels.map((p) => [p.key, Object.fromEntries(p.points.map((x) => [x.id, x.y]))])),
    summary: `${panels.map((p) => `${p.label}: ${p.points.length} results on ${p.dates.length} dates, from ${Math.min(...p.points.map((x) => x.y))}% to ${Math.max(...p.points.map((x) => x.y))}%`).join('. ')}. Results come from different models; the dates are leaderboard additions, not a measured improvement.`,
    coverage: {
      included: plotted, total: allResults, unit: 'results',
      excluded: [
        { reason: `Results in groups with a single date (${singleDate.length} groups, including every PAW group: leaderboard export date)`, count: allResults - plotted },
      ],
      note: 'No result is compared across groups, versions, tracks or benchmarks.',
    },
    status: 'partial', status_note: `Partial: ${plotted} of ${allResults} results, from the one benchmark with results added on more than one date.`,
    sources: [{ label: 'Physics-IQ leaderboard (as transcribed)', url: panels[0] && atlas.results.find((x) => x.comparability_group === panels[0].key).source_url }, { label: `Robotics Evaluation Atlas, snapshot ${snapshot}`, url: '/data/benchmarks/atlas.json' }],
    table: { head: ['Date added', 'Model', 'Score', 'Group'], rows: panels.flatMap((p) => p.points.map((x) => [x.date, x.label, x.value, p.label])) },
  };
}

function reports(atlas, review) {
  const r = review.reports;
  const snapshot = isoOf(atlas.snapshot?.checked_on ?? atlas.snapshot?.exported_at);
  const repById = new Map(atlas.reports.map((x) => [x.id, x]));
  const candidates = atlas.findings.filter((f) => f.metric === r.metric);
  const usable = candidates.filter((f) => f.numeric && Number.isFinite(f.value) && f.unit === 'units' && f.geography === 'Global' && f.check?.status === 'verified' && f.target_year);
  const byOrigin = new Map();
  for (const f of usable) { if (!byOrigin.has(f.origin)) byOrigin.set(f.origin, []); byOrigin.get(f.origin).push(f); }
  const points = [...byOrigin.values()].map((fs) => {
    const values = new Set(fs.map((f) => f.value));
    if (values.size !== 1) fail(`Reports: one estimate ${fs[0].origin} with different values`);
    const reps = fs[0].appears_in.map((id) => repById.get(id) ?? fail(`Reports: ${id} unknown`));
    const firstRep = reps.map((x) => ({ x, d: parseDate(x.published) })).filter((x) => x.d).sort((a, b) => a.d.end.localeCompare(b.d.end))[0];
    if (!firstRep) fail(`Reports: ${fs[0].origin} has no dated report`);
    const own = fs.find((f) => f.report === firstRep.x.id) ?? fs[0];
    return {
      id: own.id, origin: own.origin, publisher: own.attribution, kind: own.kind, scenario: own.scenario, qualifier: own.qualifier,
      x: own.target_year, y: own.value, label: own.statement, value: `${own.qualifier ? `${own.qualifier} ` : ''}${own.value.toLocaleString('en-US')} units`,
      published: firstRep.x.published, reveal: firstRep.d.end, via: firstRep.x.publisher, report: firstRep.x.id, href: `/reports/${firstRep.x.slug}/`,
    };
  });
  for (const p of points) p.t = minIso(p.reveal, snapshot);
  points.sort((a, b) => a.t.localeCompare(b.t) || a.x - b.x);
  const publisherOf = (a) => (/bofa|bank of america/i.test(a) ? 'BofA Global Research' : /goldman/i.test(a) ? 'Goldman Sachs' : /berg/i.test(a) ? 'Berg Insight' : a);
  for (const p of points) p.series = publisherOf(p.publisher);
  const series = [...new Set(points.map((p) => p.series))].map((label, i) => ({ key: `p${i + 1}`, label }));
  for (const p of points) p.series = series.find((s) => s.label === p.series).key;
  const excluded = candidates.filter((f) => !usable.includes(f));
  const ys = points.map((p) => p.y);
  const xs = points.map((p) => p.x);
  const repDates = points.map((p) => p.reveal).sort();
  return {
    id: 'reports', label: 'Reports', path: '/reports/', type: 'scatter',
    title: 'Annual humanoid shipments, as each report published them',
    subtitle: `${points.length} original estimates from ${series.length} publishers, revealed in order of publication. Past-year estimates and forecasts drawn apart; points never joined.`,
    meaning: r.meaning, unit: 'units per year (log scale)', precision: 'month',
    domain: { start: `${repDates[0].slice(0, 4)}-01-01`, end: snapshot },
    x: { min: Math.min(...xs) - 1, max: Math.max(...xs) + 1, label: 'Year the figure describes' },
    y: { log: true, min: 10 ** Math.floor(Math.log10(Math.min(...ys))), max: 10 ** Math.ceil(Math.log10(Math.max(...ys))), label: 'Units per year' },
    kinds: [{ key: 'estimate', label: 'Estimate of a past year' }, { key: 'forecast', label: 'Forecast' }, { key: 'scenario', label: 'Scenario (bull case)' }],
    series, points,
    final: { estimates: points.length, by_origin: Object.fromEntries(points.map((p) => [p.origin, p.y])) },
    summary: `For 2025, the two past-year estimates are ${points.filter((p) => p.x === 2025).map((p) => `${p.y.toLocaleString('en-US')} (${series.find((s) => s.key === p.series).label})`).join(' and ')}. For 2035, published forecasts range from ${Math.min(...points.filter((p) => p.x === 2035).map((p) => p.y)).toLocaleString('en-US')} to ${Math.max(...points.filter((p) => p.x === 2035).map((p) => p.y)).toLocaleString('en-US')} units, made in different years with different scopes.`,
    coverage: {
      included: points.length, total: candidates.length, unit: 'findings',
      excluded: [
        { reason: 'Repetitions of an estimate already drawn (one point per original estimate)', count: usable.length - points.length },
        ...excluded.map((f) => ({ reason: `${f.id}: ${!f.numeric || !Number.isFinite(f.value) ? 'a range or no single value' : f.check?.status !== 'verified' ? 'not yet checked against the original' : 'different unit, geography or no target year'}`, count: 1 })),
      ],
      note: 'Installed base, revenue and other metrics are separate measures and are not drawn on this scale.',
    },
    status: 'partial', status_note: `${points.length} original estimates from ${candidates.length} shipment findings; one comparable measure (global annual shipments in units), so the other report metrics are not on this chart.`,
    sources: [{ label: `Research Conclusions Atlas, checked ${snapshot}`, url: '/data/reports/atlas.json' }],
    table: { head: ['Published', 'Publisher', 'Year described', 'Kind', 'Value', 'First carried by'], rows: points.map((p) => [p.published, series.find((s) => s.key === p.series).label, String(p.x), `${p.kind}${p.scenario ? ` (${p.scenario})` : ''}`, p.value, p.via]) },
  };
}

export function buildEvolution(src) {
  const review = src.review;
  const charts = [
    humanoids(src.humanoids, review, src.classification),
    deployments(src.deployments),
    components(src.hardware, review),
    integrators(src.integrators, review),
    datasets(src.datasets, review),
    benchmarks(src.benchmarks, review),
    reports(src.reports, review),
  ];
  if (charts.map((c) => c.id).join() !== ORDER.join()) fail('section order');
  return {
    title: 'Evolution charts',
    note: 'One sourced chronology per section, built from the public snapshots and tools/evolution-review.json by tools/export-evolution.mjs. Historical replay of dated records, not live activity. Aggregates and public fields only.',
    order: ORDER,
    rotation_seconds: 10,
    charts,
  };
}
