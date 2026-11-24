// Evolution charts: data tests (node --no-warnings --test tools/test-evolution.mjs). Recomputes each series from the
// public snapshots by an independent path and checks it against data/evolution/charts.json, the section order, the
// reviewed excerpts, the rules (no back-projection, undated kept apart, groups not mixed, estimates once) and that no
// paid or non-public field reaches the chart data or the pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildEvolution, parseDate, stageAt } from './evolution-model.mjs';
import { evolutionSources } from './export-evolution.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const doc = JSON.parse(read('data/evolution/charts.json'));
const src = evolutionSources();
const chart = (id) => doc.charts.find((c) => c.id === id);

test('seven charts, in the required order, rotating every 10 seconds, up to date', () => {
  assert.deepEqual(doc.charts.map((c) => c.label), ['Humanoids', 'Deployments', 'Components', 'Integrators', 'Datasets', 'Benchmarks', 'Reports']);
  assert.equal(doc.rotation_seconds, 10);
  assert.deepEqual(JSON.parse(JSON.stringify(buildEvolution(src))), doc);
});

test('Humanoids: introductions per year equal the dated Release values of the catalogue', () => {
  const c = chart('humanoids');
  const reviewed = new Set(src.review.humanoids.excluded.map((x) => x.id));
  const years = {};
  for (const r of src.humanoids.records) {
    if (reviewed.has(r.id)) continue;
    const m = String(r.Release ?? '').trim().match(/^(\d{4})$|^(\d{4})-\d{2}-\d{2} \([^)]*unveiling\)$/);
    if (m) years[m[1] ?? m[2]] = (years[m[1] ?? m[2]] ?? 0) + 1;
  }
  for (const col of c.columns) assert.equal(col.value, years[col.key] ?? 0, col.key);
  assert.equal(c.columns.reduce((a, x) => a + x.value, 0), Object.values(years).reduce((a, b) => a + b, 0));
  assert.equal(c.coverage.included + c.coverage.excluded.reduce((a, x) => a + x.count, 0), src.humanoids.records.length);
  assert.ok(!c.columns.some((x) => x.t > c.domain.end), 'nothing after the snapshot');
});

test('Deployments: documented status by date, never projected back, undated kept apart, totals reconcile with today', () => {
  const c = chart('deployments');
  const proj = JSON.parse(read('data/public/projection.json'));
  const today = { op: 0, pilot: 0, unc: 0, ann: 0 };
  for (const k of proj.cases) today[k.stage] += 1;
  const last = c.columns.at(-1);
  for (const s of ['op', 'pilot', 'unc', 'ann']) assert.equal(last.segments[s] + c.undated.segments[s], today[s], s);
  assert.equal(last.value + c.undated.cases, proj.cases.length);
  assert.equal(c.undated.records, src.deployments.rows.filter((r) => !parseDate(r.publication_date)).length);
  // Each case's status at a date uses only records published by then: a case whose only "operational" record is from
  // 2026 is not in operation in 2025.
  const recs = [{ key: 'ann', date: parseDate('2024-03-01') }, { key: 'op', date: parseDate('2026-02-10') }];
  assert.equal(stageAt(recs, '2025-12-31'), 'ann');
  assert.equal(stageAt(recs, '2026-03-31'), 'op');
  assert.equal(stageAt([{ key: 'op', date: parseDate('2025') }], '2025-06-30'), null, 'a year-only date counts from 31 Dec');
  // Monotone by definition (most advanced documented), and cases only enter, never leave.
  for (let i = 1; i < c.columns.length; i++) assert.ok(c.columns[i].value >= c.columns[i - 1].value);
  // Independent recount of the final column from the raw rows.
  const groups = new Map();
  for (const r of src.deployments.rows) { const k = r.deployment_id || r.record_id; groups.set(k, [...(groups.get(k) ?? []), r]); }
  const dated = [...groups.values()].filter((rs) => rs.some((r) => parseDate(r.publication_date))).length;
  assert.equal(last.value, dated);
});

test('Components: every dated product quotes its own year cell; the rest are listed as excluded', () => {
  const c = chart('components');
  const byId = new Map(src.hardware.rows.map((r) => [r.component_id, r]));
  for (const p of c.points) {
    const rv = src.review.components.products.find((x) => x.id === p.id);
    assert.ok(byId.get(p.id).year.includes(rv.excerpt), p.id);
    assert.ok(byId.get(p.id).year.includes(p.date.slice(0, 4)), `${p.id}: the year is in the cell`);
  }
  assert.equal(c.points.length + src.review.components.excluded.length, src.hardware.rows.length);
});

test('Integrators: dated events quote their source dates; Novares counted once; simulation and announcements apart', () => {
  const c = chart('integrators');
  const atlas = src.integrators;
  for (const e of src.review.integrators.events) {
    const cells = e.providers.map((id) => atlas.providers.find((p) => p.id === id).fields.source_dates).join(' | ');
    assert.ok(cells.includes(e.date.slice(0, 7)) || cells.includes('August 2026'), `${e.id}: date in the cell`);
  }
  assert.equal(c.points.filter((p) => /Novares/.test(p.label)).length, 1);
  assert.deepEqual(c.points.filter((p) => p.row === 'simulation').map((p) => p.id), ['ca3-arm', 'ca3-home']);
  assert.ok(c.points.filter((p) => p.row === 'simulation').every((p) => p.hollow));
  assert.equal(new Set(c.points.map((p) => p.id)).size, c.points.length);
});

test('Datasets: associated-paper dates match their arXiv identifiers; no volumes added', () => {
  const c = chart('datasets');
  assert.equal(c.points.length, 11);
  for (const p of c.points) {
    const id = p.href.split('/abs/')[1];
    assert.equal(`${p.date.slice(2, 4)}${p.date.slice(5, 7)}`, id.slice(0, 4), p.id);
    assert.ok(src.datasets.resources.some((r) => r.id === p.id));
  }
  assert.match(c.title + c.subtitle, /paper/i);
  assert.doesNotMatch(JSON.stringify(c), /"(?:hours|episodes|trajectories|value)":/);
  assert.equal(c.coverage.excluded[0].count, 24);
});

test('Benchmarks: points only inside one comparability group, values as transcribed', () => {
  const c = chart('benchmarks');
  for (const p of c.panels) {
    const rs = src.benchmarks.results.filter((r) => r.comparability_group === p.key);
    assert.equal(p.points.length, rs.length);
    for (const x of p.points) assert.equal(x.y, rs.find((r) => r.result_id === x.id).value);
    assert.equal(new Set(rs.map((r) => `${r.benchmark_version}|${r.track}|${r.metric}|${r.model_configuration}`)).size, 1);
    assert.ok(new Set(rs.map((r) => r.result_date)).size >= 2);
  }
});

test('Reports: each original shipment estimate once, verified, at the value and year the finding states', () => {
  const c = chart('reports');
  const origins = c.points.map((p) => p.origin);
  assert.equal(new Set(origins).size, origins.length);
  for (const p of c.points) {
    const f = src.reports.findings.find((x) => x.id === p.id);
    assert.equal(f.value, p.y);
    assert.equal(f.target_year, p.x);
    assert.equal(f.check.status, 'verified');
    assert.equal(f.metric, 'shipments_annual');
  }
  assert.ok(c.points.every((p) => ['estimate', 'forecast', 'scenario'].includes(p.kind)));
});

test('no paid or non-public field in the chart data or the pages', () => {
  const text = read('data/evolution/charts.json');
  for (const k of ['deployment_id', 'record_id', 'site', 'city', 'task_description', 'claim_text', 'evidence_level', 'confidence', 'observation_date', 'workflow', 'integration_notes', 'source_workbook', 'sheet_row', '_row']) {
    assert.ok(!text.includes(`"${k}"`), k);
  }
  for (const id of new Set(src.deployments.rows.map((r) => r.deployment_id))) assert.ok(!text.includes(id), 'deployment id published');
  assert.doesNotMatch(text, /docs\.google|drive\.google|spreadsheets/i);
  for (const p of ['index.html', 'humanoids/index.html', 'deployments/index.html', 'components/index.html', 'integrators/index.html', 'datasets/index.html', 'benchmarks/index.html', 'reports/index.html']) {
    const html = read(p);
    assert.equal((html.match(/class="evo-chart /g) ?? []).length, p === 'index.html' ? 7 : 1, p);
  }
});
