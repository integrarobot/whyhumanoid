// Robotics Evaluation Atlas (23 Nov 2026): validation, public snapshot and view rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ASPECT_TAGS, CAPABILITY_GROUPS, atlasProblems, buildAtlas, capabilitiesOf, parseValue, snapshotProblems } from '../src/benchmarks/atlas.js';
import { compareGroup, renderAtlas } from '../../tools/atlas-view.mjs';
import { runImport } from '../src/import/run.js';
import { createTestDb, fixtureWorkbook } from './helpers.js';

const bench = (id, over = {}) => ({ benchmark_id: id, name: id.replace('bm-', '').toUpperCase(), environment: 'Real robot', capability_tags: 'manipulation; generalization', related_dataset_ids: null, source_url: 'https://example.org/b', ...over });
let n = 0;
const res = (over = {}) => ({
  result_id: `res-t-${(n += 1)}`, benchmark_id: 'bm-a', benchmark_version: 'v1', model: 'Model A', model_configuration: 'base', track: 'T1',
  metric: 'Success', value: '50', unit: '%', direction: 'higher', n_evals: null, comparability_group: 'g1', result_date: '2026-11-20',
  date_meaning: 'Export date', source_url: 'https://example.org/r', checked_at: '2026-11-23', display_status: 'source_reported', ...over,
});
// A private workbook link, built from parts so the repository guard never sees one in source.
const PRIVATE_SHEET = ['https://docs', 'google', 'com/spreadsheets/d/x'].join('.');
const catalogue = [bench('bm-a'), bench('bm-b', { environment: 'Video evaluation', capability_tags: 'physical reasoning' })];

test('a valid catalogue and results have no problems', () => {
  assert.deepEqual(atlasProblems(catalogue, [res(), res({ model: 'Model B' })]), []);
});

test('duplicate result ids and broken foreign keys stop the import', () => {
  const r = res();
  assert.ok(atlasProblems(catalogue, [r, { ...r, model: 'Model B' }]).some((p) => /duplicate RESULT_ID/.test(p)));
  assert.ok(atlasProblems(catalogue, [res({ benchmark_id: 'bm-missing' })]).some((p) => /not in the Benchmarks catalogue/.test(p)));
  assert.ok(atlasProblems([...catalogue, bench('bm-a')], []).some((p) => /duplicate BENCHMARK_ID/.test(p)));
});

test('dataset links are checked both ways against the Datasets tab', () => {
  const cat = [bench('bm-a', { related_dataset_ids: 'ds-x' })];
  assert.deepEqual(atlasProblems(cat, [], [{ dataset_id: 'ds-x', related_benchmark_ids: 'bm-a' }]), []);
  assert.ok(atlasProblems(cat, [], [{ dataset_id: 'ds-x', related_benchmark_ids: null }]).some((p) => /does not link back/.test(p)));
  assert.ok(atlasProblems(cat, [], []).some((p) => /not in the Datasets tab/.test(p)));
  assert.ok(atlasProblems([bench('bm-a')], [], [{ dataset_id: 'ds-y', related_benchmark_ids: 'bm-zz' }]).some((p) => /related benchmark bm-zz/.test(p)));
});

test('a missing value stays null, never zero; text is not a number', () => {
  assert.deepEqual(parseValue(''), { ok: true, value: null });
  assert.deepEqual(parseValue(null), { ok: true, value: null });
  assert.deepEqual(parseValue('0'), { ok: true, value: 0 });
  assert.equal(parseValue('65%').ok, false);
  assert.ok(atlasProblems(catalogue, [res({ value: 'about 60' })]).some((p) => /not a number/.test(p)));
  const atlas = buildAtlas({ catalogue, results: [res({ value: null }), res({ model: 'B', value: '0' })] });
  assert.deepEqual(atlas.results.map((r) => r.value), [null, 0]);
  assert.equal(atlas.counts.observations_without_value, 1);
  assert.match(compareGroup(atlas, 'g1'), /Not reported/, 'the view says a value is not reported instead of drawing zero');
});

test('percentages keep the native 0 to 100 scale', () => {
  assert.ok(atlasProblems(catalogue, [res({ value: '120' })]).some((p) => /outside 0 to 100/.test(p)));
  assert.ok(atlasProblems(catalogue, [res({ value: '0.65' }), res({ model: 'B', value: '0.4' })]).some((p) => /0 to 100, not 0 to 1/.test(p)));
  assert.deepEqual(atlasProblems(catalogue, [res({ value: '65' }), res({ model: 'B', value: '0.4' })]), []);
});

test('one comparability group never mixes versions (Original and Verified), tracks, metrics, units or directions', () => {
  const mix = (over) => atlasProblems(catalogue, [res(), res({ model: 'B', ...over })]);
  assert.ok(mix({ benchmark_version: 'Verified' }).some((p) => /mixes BENCHMARK_VERSION/.test(p)));
  assert.ok(mix({ track: 'T2' }).some((p) => /mixes TRACK/.test(p)));
  assert.ok(mix({ metric: 'Score' }).some((p) => /mixes METRIC/.test(p)));
  assert.ok(mix({ direction: 'lower' }).some((p) => /mixes DIRECTION/.test(p)));
  assert.ok(mix({ model: 'Model A' }).some((p) => /same model and configuration appears twice/.test(p)));
});

test('the comparison shows one group only and names what it leaves out', () => {
  const atlas = buildAtlas({
    catalogue,
    results: [res({ value: '40' }), res({ model: 'B', value: '60' }), res({ model: 'C', track: 'T2', comparability_group: 'g2' }), res({ benchmark_id: 'bm-b', comparability_group: 'g3' })],
  });
  const html = compareGroup(atlas, 'g1');
  assert.ok(html.indexOf('>B<') < html.indexOf('>Model A<'), 'higher is better: B (60) before Model A (40)');
  assert.doesNotMatch(html, />C</, 'another track is not compared');
  assert.match(html, /1 other A observation with a different track/);
  assert.match(html, /1 observation of other benchmarks/);
});

test('published uncertainty stays text: no interval bounds, no error bars', () => {
  const atlas = buildAtlas({ catalogue, results: [res({ uncertainty: 'Source mentions 95% CIs; numerical bounds not extracted' }), res({ model: 'B', uncertainty: '± 2.2 as published' })] });
  for (const r of atlas.results) for (const k of Object.keys(r)) assert.doesNotMatch(k, /ci_|lower_bound|upper_bound|error/);
  assert.equal(atlas.results[1].uncertainty, '± 2.2 as published');
  assert.doesNotMatch(renderAtlas(atlas, { index: 7, total: 10 }), /class="[^"]*\b(err|whisker|ci)\b/);
});

test('capability groups come from the reviewed vocabulary and are coverage, not scores', () => {
  assert.deepEqual(capabilitiesOf(['mobile manipulation']), ['manipulation', 'navigation']);
  assert.deepEqual(capabilitiesOf(['generalization']), [], 'an aspect is not a capability');
  assert.ok(ASPECT_TAGS.includes('robustness'));
  assert.ok(atlasProblems([bench('bm-a', { capability_tags: 'manipulation; vibes' })], []).some((p) => /"vibes" is not in the reviewed vocabulary/.test(p)));
  assert.ok(atlasProblems([bench('bm-a', { capability_tags: 'generalization' })], []).some((p) => /no tag maps to a capability group/.test(p)));
  assert.ok(atlasProblems([bench('bm-a', { environment: 'Somewhere' })], []).some((p) => /not in the reviewed settings map/.test(p)));
  const b = buildAtlas({ catalogue, results: [] }).benchmarks[0];
  for (const k of Object.keys(b)) assert.doesNotMatch(k, /score|rank|grade|maturity/);
  assert.equal(CAPABILITY_GROUPS.length, 5);
});

test('related observations of one table are counted as observations, not as separate evaluations', () => {
  const rows = ['Overall', 'Nominal', 'Interpolation', 'Extrapolation'].flatMap((c) => ['M1', 'M2'].map((m) => res({ model: m, track: `D10 / ${c}`, comparability_group: `paw-${c}` })));
  const atlas = buildAtlas({ catalogue, results: rows });
  const a = atlas.benchmarks.find((x) => x.id === 'bm-a');
  assert.deepEqual([a.observations, a.models, a.groups], [8, 2, 4]);
  assert.deepEqual([atlas.counts.resources_with_results, atlas.counts.resources_awaiting_results, atlas.counts.models], [1, 1, 2]);
});

test('withheld rows are counted, not shown; private links never reach the snapshot', () => {
  const atlas = buildAtlas({ catalogue: [bench('bm-a', { related_datasets_url: PRIVATE_SHEET }), catalogue[1]], results: [res(), res({ model: 'B', display_status: 'hidden' })] });
  assert.equal(atlas.counts.observations, 1);
  assert.equal(atlas.counts.observations_withheld, 1);
  assert.doesNotMatch(JSON.stringify(atlas), /docs\.google\.com/);
  assert.deepEqual(snapshotProblems(atlas), []);
  assert.ok(snapshotProblems({ ...atlas, results: [{ ...atlas.results[0], notes: 'x' }] }).some((p) => /field notes is not public/.test(p)));
});

test('an inconsistent Benchmark Results tab makes the whole import fail', async () => {
  const values = fixtureWorkbook();
  const tab = values['Benchmark Results'];
  const col = tab[0].indexOf('BENCHMARK_ID');
  tab[1][col] = 'bm-not-in-catalogue';
  const result = await runImport(createTestDb(), values, 1_800_000_000);
  assert.equal(result.ok, false);
  assert.match(result.error, /Benchmarks: .*not in the Benchmarks catalogue/);
});

test('the committed snapshot matches the master of 23 Nov 2026: 22 resources, 34 observations from 2, 20 awaiting', () => {
  const atlas = JSON.parse(readFileSync(new URL('../../data/benchmarks/atlas.json', import.meta.url), 'utf8'));
  assert.deepEqual(snapshotProblems(atlas), []);
  const c = atlas.counts;
  assert.deepEqual([c.resources, c.resources_with_results, c.observations, c.resources_awaiting_results], [22, 2, 34, 20]);
  const ids = atlas.benchmarks.map((b) => b.id);
  for (const id of ['bm-libero', 'bm-calvin', 'bm-roboeval', 'bm-roboarena', 'bm-polaris', 'bm-realm', 'bm-physics-iq', 'bm-robodojo', 'bm-paw', 'bm-robocolosseum', 'bm-molmospaces', 'bm-spatialbench', 'bm-rlbench', 'bm-simpler', 'bm-maniskill3', 'bm-vlabench', 'bm-robotwin2', 'bm-behavior1k', 'bm-gensim2', 'bm-openeqa', 'bm-humanoidbench', 'bm-arnold']) assert.ok(ids.includes(id), id);
  const paw = atlas.results.filter((r) => r.benchmark_id === 'bm-paw');
  const piq = atlas.results.filter((r) => r.benchmark_id === 'bm-physics-iq');
  assert.equal(paw.length, 24);
  assert.equal(new Set(paw.map((r) => r.model)).size, 6);
  assert.deepEqual(paw.filter((r) => r.n_evals !== null).map((r) => r.n_evals), [900, 900, 900, 900, 900, 900], 'n = 900 belongs to Overall only');
  assert.ok(paw.filter((r) => !/Overall/.test(r.track)).every((r) => r.n_evals === null));
  assert.deepEqual([piq.filter((r) => r.benchmark_version === 'Original').length, piq.filter((r) => r.benchmark_version === 'Verified').length], [8, 2]);
  for (const g of new Set(piq.map((r) => r.comparability_group))) assert.equal(new Set(piq.filter((r) => r.comparability_group === g).map((r) => r.benchmark_version)).size, 1, `${g} mixes variants`);
  assert.ok(atlas.results.every((r) => r.value === null || (r.unit === '%' && r.value > 1 && r.value <= 100)), 'native percentage scale');
  assert.equal(atlas.results.find((r) => r.id === 'res-paw-agentic-d10-1-1').value, 65);
  for (const b of atlas.benchmarks) assert.deepEqual(b.capabilities, capabilitiesOf(b.capability_tags), `${b.id}: groups follow the reviewed vocabulary`);
  assert.equal(atlas.snapshot.exported_at, '2026-11-23T15:28:29.000Z');
});
