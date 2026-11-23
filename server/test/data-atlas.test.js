// Robot Learning Data Atlas (23 Nov 2026): validation, snapshot rules and the published view.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  atlasProblems, buildAtlas, snapshotProblems, scrubEditorial, parseValue, modalityToken, licenceStated, bodyFamiliesOf, isPartGroup,
} from '../src/data-atlas/atlas.js';
import { DATASETS_BY_ID } from '../src/datasets.js';
import { normalizeTab } from '../src/import/normalize.js';
import { runImport } from '../src/import/run.js';
import { createTestDb, fixtureWorkbook, T0 } from './helpers.js';
import { renderDataAtlas, qText } from '../../tools/data-atlas-view.mjs';

const root = new URL('../../', import.meta.url);
const PRIVATE_SHEET = ['https://docs.google', '.com/spread', 'sheets/d/abc/edit#gid=1'].join('');

const ds = (id, over = {}) => ({
  dataset_id: id, name: `Name ${id}`, url: `https://${id}.example.com/`, data_origin: 'real_robot', resource_class: 'corpus',
  modalities: 'rgb; action', learning_uses: 'manipulation', access_status: 'dataset_link', included_in_atlas: 'true',
  checked_at: '2026-11-23', source_url: `https://${id}.example.com/`, embodiment: 'WidowX manipulation arm',
  license_note: 'Dataset licence not established in this pass; check original terms', ...over,
});
const dm = (id, dataset, over = {}) => ({
  metric_id: id, dataset_id: dataset, metric: 'trajectories', value: '100', unit: 'trajectories', qualifier: 'reported',
  data_origin: 'real_robot', release_status: 'reported_release', display_status: 'source_reported', comparison_group: 'real_robot_trajectories',
  source_url: 'https://source.example.com/', checked_at: '2026-11-23', ...over,
});
const build = (catalogue, metrics, benchmarks = []) => buildAtlas({ catalogue, metrics, benchmarks, exportedAt: '2026-11-23T19:29:29.000Z', builtAt: '2026-11-23T20:00:00.000Z' });

test('ids are unique and follow ds- / dm- patterns', () => {
  const p = atlasProblems([ds('ds-a'), ds('ds-a'), ds('bad id')], [dm('dm-1', 'ds-a'), dm('dm-1', 'ds-a', { comparison_group: 'other_group' })]);
  assert.ok(p.some((x) => /ds-a: duplicate DATASET_ID/.test(x)));
  assert.ok(p.some((x) => /DATASET_ID must look like ds-/.test(x)));
  assert.ok(p.some((x) => /dm-1: duplicate METRIC_ID/.test(x)));
});

test('foreign keys: metric dataset, parent dataset and benchmark links must exist', () => {
  const p = atlasProblems(
    [ds('ds-a', { parent_dataset_ids: 'ds-missing', related_benchmark_ids: 'bm-nowhere' }), ds('ds-b', { parent_dataset_ids: 'ds-b' })],
    [dm('dm-1', 'ds-ghost')],
    { benchmarkIds: ['bm-libero'] },
  );
  assert.ok(p.some((x) => /dm-1: DATASET_ID ds-ghost is not in the Datasets catalogue/.test(x)));
  assert.ok(p.some((x) => /parent dataset ds-missing is not in the catalogue/.test(x)));
  assert.ok(p.some((x) => /cannot be its own parent/.test(x)));
  assert.ok(p.some((x) => /related benchmark bm-nowhere is not in the Benchmarks catalogue/.test(x)));
});

test('empty is unknown, never zero; zero stays zero; empty dates stay unknown', () => {
  assert.deepEqual(parseValue(''), { ok: true, value: null });
  assert.deepEqual(parseValue('0'), { ok: true, value: 0 });
  assert.equal(parseValue('1,000').ok, false);
  assert.equal(parseValue('~76000').ok, false);
  const a = build([ds('ds-a')], [dm('dm-1', 'ds-a', { value: '', qualifier: '' }), dm('dm-2', 'ds-a', { value: '0', comparison_group: '' })]);
  assert.equal(a.quantities.find((q) => q.id === 'dm-1').value, null);
  assert.equal(a.quantities.find((q) => q.id === 'dm-2').value, 0);
  assert.equal(a.quantities.find((q) => q.id === 'dm-1').source_date, null);
  assert.equal(qText(a.quantities.find((q) => q.id === 'dm-1')), 'Not reported');
  assert.equal(a.counts.quantities_without_value, 1);
  assert.deepEqual(atlasProblems([ds('ds-a')], [dm('dm-1', 'ds-a', { value: '', qualifier: '' })]), []);
});

test('qualifiers: lower bounds and approximations are kept and labelled; others are refused', () => {
  assert.ok(atlasProblems([ds('ds-a')], [dm('dm-1', 'ds-a', { qualifier: 'at_least' })]).some((x) => /QUALIFIER/.test(x)));
  const a = build([ds('ds-a'), ds('ds-b')], [dm('dm-1', 'ds-a', { value: '1000000', qualifier: 'more_than' }), dm('dm-2', 'ds-b', { value: '76000', qualifier: 'approximate' })]);
  assert.equal(qText(a.quantities[0]), 'more than 1,000,000 trajectories');
  assert.equal(qText(a.quantities[1]), 'about 76,000 trajectories');
  const html = renderDataAtlas(a, { index: 6, total: 10 });
  assert.match(html, /class="bar q-more_than/);
  assert.match(html, /class="bar q-approximate/);
});

test('mixed units: a size group holds one metric in one unit; rates are never converted or plotted together', () => {
  const mixed = atlasProblems([ds('ds-a'), ds('ds-b')], [dm('dm-1', 'ds-a', { metric: 'duration', unit: 'hours', comparison_group: 'g' }), dm('dm-2', 'ds-b', { metric: 'episodes', unit: 'episodes', comparison_group: 'g' })]);
  assert.ok(mixed.some((x) => /group g: mixes duration\|hours and episodes\|episodes/.test(x)));
  assert.ok(atlasProblems([ds('ds-a')], [dm('dm-1', 'ds-a', { metric: 'duration', unit: 'frames' })]).some((x) => /not a duration unit/.test(x)));
  // Hz and fps may describe different streams: allowed side by side in an editorial group, but never a size panel.
  const rates = [dm('dm-1', 'ds-a', { metric: 'sample_rate', unit: 'Hz', value: '30', comparison_group: 'video_frame_rate' }), dm('dm-2', 'ds-b', { metric: 'sample_rate', unit: 'fps', value: '30', comparison_group: 'video_frame_rate' })];
  assert.deepEqual(atlasProblems([ds('ds-a'), ds('ds-b')], rates), []);
  const a = build([ds('ds-a'), ds('ds-b')], rates);
  assert.ok(a.quantities.every((q) => q.scale === false));
  assert.doesNotMatch(renderDataAtlas(a, { index: 6, total: 10 }), /data-group="video_frame_rate"/);
});

test('aggregates overlap their sources: lineage both ways, set apart, never summed', () => {
  const cat = [ds('ds-egodex', { data_origin: 'human_capture' }), ds('ds-openego', { resource_class: 'aggregate', data_origin: 'human_capture', parent_dataset_ids: 'ds-egodex' })];
  const met = [
    dm('dm-1', 'ds-egodex', { metric: 'duration', unit: 'hours', value: '829', data_origin: 'human_capture', comparison_group: 'human_video_hours' }),
    dm('dm-2', 'ds-openego', { metric: 'duration', unit: 'hours', value: '1107', data_origin: 'human_capture', release_status: 'aggregate_scope', comparison_group: 'aggregate_human_video_hours' }),
  ];
  assert.deepEqual(atlasProblems(cat, met), []);
  const a = build(cat, met);
  assert.deepEqual(a.resources.find((r) => r.id === 'ds-openego').parents, ['ds-egodex']);
  assert.deepEqual(a.resources.find((r) => r.id === 'ds-egodex').children, ['ds-openego']);
  assert.equal(a.quantities.find((q) => q.id === 'dm-2').set_apart, 'Aggregate');
  const html = renderDataAtlas(a, { index: 6, total: 10 });
  assert.doesNotMatch(html, /1,936/, 'no sum of overlapping collections');
  const apart = html.slice(html.indexOf('id="set-apart"'));
  assert.match(apart, /data-group="aggregate_human_video_hours"/);
  assert.doesNotMatch(html.slice(0, html.indexOf('id="set-apart"')), /data-group="aggregate_human_video_hours"/);
});

test('split versus total: exact splits stack, subsets nest, a part larger than its total is refused', () => {
  const cat = [ds('ds-bridge'), ds('ds-hub', { data_origin: 'human_capture' }), ds('ds-mind')];
  const met = [
    dm('dm-b1', 'ds-bridge', { value: '60096' }),
    dm('dm-b2', 'ds-bridge', { value: '50365', comparison_group: 'real_robot_teleop_subset' }),
    dm('dm-b3', 'ds-bridge', { value: '9731', comparison_group: 'real_robot_scripted_subset' }),
    dm('dm-h1', 'ds-hub', { metric: 'duration', unit: 'hours', value: '20113', data_origin: 'human_capture', comparison_group: 'human_video_hours' }),
    dm('dm-h2', 'ds-hub', { metric: 'duration', unit: 'hours', value: '10124', data_origin: 'human_capture', comparison_group: 'human_video_hours_historical', scope: 'Release 1' }),
    dm('dm-h3', 'ds-hub', { metric: 'duration', unit: 'hours', value: '9990', data_origin: 'human_capture', comparison_group: 'human_video_hours_increment', scope: 'Release 2' }),
    dm('dm-m1', 'ds-mind', { value: '310000', qualifier: 'more_than' }),
    dm('dm-m2', 'ds-mind', { value: '20000', qualifier: 'approximate', comparison_group: 'mobile_subset' }),
  ];
  assert.deepEqual(atlasProblems(cat, met), []);
  assert.ok(isPartGroup('mobile_subset') && isPartGroup('human_video_hours_increment') && !isPartGroup('human_video_hours'));
  const html = renderDataAtlas(build(cat, met), { index: 6, total: 10 });
  assert.match(html, /Split as reported: <b>50,365 trajectories<\/b>.*\+ <b>9,731 trajectories<\/b>.* = 60,096 trajectories/);
  assert.match(html, /They sum to 20,114 hours, while the source states 20,113 hours in total; both are kept as reported/);
  assert.match(html, /Subsets of this total, not additions: <b>about 20,000 trajectories<\/b>/);
  const bad = atlasProblems([ds('ds-a')], [dm('dm-1', 'ds-a', { value: '10' }), dm('dm-2', 'ds-a', { value: '50', comparison_group: 'x_subset' })]);
  assert.ok(bad.some((x) => /part 50 exceeds the total 10/.test(x)));
});

test('provider claims and training mixtures are excluded from the default scale view', () => {
  const cat = [ds('ds-scale', { resource_class: 'commercial_data_service', data_origin: 'human_capture' }), ds('ds-mix', { resource_class: 'model_data_resource', data_origin: 'mixed' }), ds('ds-open', { data_origin: 'human_capture' })];
  const met = [
    dm('dm-1', 'ds-scale', { metric: 'duration', unit: 'hours', value: '140000', qualifier: 'more_than', data_origin: 'human_capture', release_status: 'provider_claim', display_status: 'provider_reported', comparison_group: 'commercial_provider_hours' }),
    dm('dm-2', 'ds-mix', { metric: 'duration', unit: 'hours', value: '30000', qualifier: 'more_than', data_origin: 'mixed', release_status: 'training_mix', comparison_group: 'mixed_training_hours' }),
    dm('dm-3', 'ds-open', { metric: 'duration', unit: 'hours', value: '829', data_origin: 'human_capture', comparison_group: 'human_video_hours' }),
  ];
  const a = build(cat, met);
  assert.equal(a.quantities.find((q) => q.id === 'dm-1').set_apart, 'Provider claim');
  assert.equal(a.quantities.find((q) => q.id === 'dm-2').set_apart, 'Training mixture');
  const html = renderDataAtlas(a, { index: 6, total: 10 });
  const main = html.slice(html.indexOf('id="scale"'), html.indexOf('id="set-apart"'));
  assert.doesNotMatch(main, /commercial_provider_hours|mixed_training_hours/);
  assert.match(main, /data-group="human_video_hours"/);
  assert.match(html, /<details class="apart-box" id="set-apart">/, 'set apart, closed by default');
});

test('partial modalities, unknown modalities, access and licences are reported as such', () => {
  assert.deepEqual(modalityToken('tactile_subset'), { key: 'tactile', partial: true });
  assert.ok(atlasProblems([ds('ds-a', { modalities: 'rgb; smell' })], []).some((x) => /modality "smell"/.test(x)));
  const a = build([ds('ds-a', { modalities: 'rgb; tactile_subset' }), ds('ds-b', { modalities: 'unknown', access_status: '' })], []);
  assert.deepEqual(a.resources[0].modalities, [{ key: 'rgb', partial: false }, { key: 'tactile', partial: true }]);
  assert.equal(a.resources[1].modality_state, 'unknown');
  const html = renderDataAtlas(a, { index: 6, total: 10 });
  assert.match(html, /data-mods="rgb tactile~"/);
  assert.match(html, /Tactile <small>subset only<\/small>/);
  assert.match(html, /<dt>Access<\/dt><dd><span class="na">Not established<\/span>/);
  assert.equal(licenceStated('Dataset licence not established in this pass; check original terms'), false);
  assert.equal(licenceStated('Code MIT; constituent datasets retain their own licences'), false, 'a code licence is not a data licence');
  assert.equal(licenceStated('Code Apache-2.0; dataset terms not established'), false);
  assert.equal(licenceStated('CC BY-NC-SA 4.0 (data card); retail access separate'), true);
});

test('evaluation data is marked apart from training data', () => {
  const a = build([ds('ds-eval', { resource_class: 'evaluation_corpus', related_benchmark_ids: 'bm-physics-iq' }), ds('ds-train')], [], [{ benchmark_id: 'bm-physics-iq', name: 'Physics IQ' }]);
  assert.equal(a.resources[0].evaluation, true);
  assert.equal(a.resources[1].evaluation, false);
  const html = renderDataAtlas(a, { index: 6, total: 10 });
  const json = JSON.parse(html.match(/<script type="application\/json" id="data-atlas">([\s\S]*?)<\/script>/)[1]);
  assert.equal(json.resources.find((r) => r.id === 'ds-eval').evaluation, true);
  assert.match(html, /href="\/benchmarks\/#bm-physics-iq">Physics IQ<\/a><br><small class="dim">An associated evaluation resource, not a claim that the data trains for it/);
});

test('INCLUDED_IN_ATLAS is parsed explicitly; RESOURCE_CLASS drives the corpora count', () => {
  assert.ok(atlasProblems([ds('ds-a', { included_in_atlas: 'yes' })], []).some((x) => /INCLUDED_IN_ATLAS/.test(x)));
  assert.deepEqual(atlasProblems([ds('ds-a', { included_in_atlas: 'TRUE' })], []), []);
  const a = build([ds('ds-a'), ds('ds-b', { included_in_atlas: 'false' }), ds('ds-c', { resource_class: 'aggregate' })], [dm('dm-1', 'ds-b')]);
  assert.equal(a.counts.resources, 2);
  assert.equal(a.counts.resources_outside_atlas, 1);
  assert.equal(a.counts.corpora, 1);
  assert.equal(a.quantities.length, 0, 'quantities of a resource outside the atlas are not published');
  assert.deepEqual(snapshotProblems(a), []);
});

test('private links, editorial notes and withheld columns never reach the snapshot, the store or search', async () => {
  assert.equal(scrubEditorial('Three stereo RGB views in card; not four independent camera streams as attachment suggests. Retail data is outside public first release.'), 'Three stereo RGB views in card. Retail data is outside public first release.');
  assert.equal(scrubEditorial('Attachment incorrectly calls 3.3K episodes real; HF file rows are not episode counts.'), 'HF file rows are not episode counts.');
  const a = build([ds('ds-a', { url: PRIVATE_SHEET, limitations: 'See matrix row 4.' })], []);
  assert.equal(a.resources[0].url, null);
  assert.equal(a.resources[0].limitations, null);
  assert.deepEqual(snapshotProblems(a), []);
  assert.ok(snapshotProblems({ ...a, resources: [{ ...a.resources[0], url: PRIVATE_SHEET }] }).some((x) => /private Google link/.test(x)));
  assert.ok(snapshotProblems({ ...a, resources: [{ ...a.resources[0], classification_note: 'x' }] }).some((x) => /not public/.test(x)));

  const values = fixtureWorkbook();
  const spec = DATASETS_BY_ID.get('datasets');
  const h = spec.fields;
  values.Datasets[1][h.indexOf('related_benchmark_url')] = PRIVATE_SHEET;
  values.Datasets[1][h.indexOf('classification_note')] = 'Existing record retained';
  values.Datasets[1][h.indexOf('attachment_ref')] = 'matrix row 23';
  values.Datasets[1][h.indexOf('limitations')] = 'Attachment says 140 tasks; tactile coverage is partial.';
  const row = normalizeTab(spec, values.Datasets).rows[0].data;
  assert.ok(!('related_benchmark_url' in row) && !('classification_note' in row) && !('attachment_ref' in row));
  assert.equal(row.limitations, 'Tactile coverage is partial.');
  const db = createTestDb();
  const result = await runImport(db, values, T0);
  assert.equal(result.ok, true, result.error);
  const stored = await db.prepare("SELECT data FROM premium_rows WHERE dataset = 'datasets'").all();
  assert.doesNotMatch(JSON.stringify(stored.results), /docs\.google|matrix row|attachment_ref|classification_note/i);
  const docs = await db.prepare("SELECT haystack FROM search_docs WHERE dataset IN ('datasets', 'dataset-metrics')").all();
  assert.ok(docs.results.length > 0);
  assert.doesNotMatch(JSON.stringify(docs.results), /docs google|matrix row|attachment/i);
});

test('the import refuses an incoherent data atlas, like header drift', async () => {
  const values = fixtureWorkbook();
  const h = DATASETS_BY_ID.get('dataset-metrics').fields;
  values['Dataset Metrics'][1][h.indexOf('dataset_id')] = 'ds-unknown';
  const result = await runImport(createTestDb(), values, T0);
  assert.equal(result.ok, false);
  assert.match(result.error, /^Datasets: .*ds-unknown is not in the Datasets catalogue/);
});

test('body families come from explicit rules on the recorded text', () => {
  assert.deepEqual(bodyFamiliesOf('Galaxea R1 Lite mobile dual arm'), ['dual_arm', 'mobile']);
  assert.deepEqual(bodyFamiliesOf('Franka Panda; standardized mobile desk setup'), ['arm'], 'a mobile desk is not a mobile base');
  assert.deepEqual(bodyFamiliesOf('Unitree G1; H1-2 retargeted motion'), ['humanoid']);
  assert.deepEqual(bodyFamiliesOf('No robot; physical scene videos'), ['none']);
  assert.deepEqual(bodyFamiliesOf('AgiBot manipulation platform; release-dependent hands'), [], 'unclassified rather than guessed');
});

// The committed snapshot, exported from the live workbook: the editorial corrections of the brief hold.
test('committed snapshot: counts from the data and the reviewed corrections', () => {
  const a = JSON.parse(readFileSync(new URL('data/datasets/atlas.json', root), 'utf8'));
  assert.deepEqual(snapshotProblems(a), []);
  assert.equal(a.counts.resources, a.resources.length);
  assert.equal(a.counts.corpora, a.resources.filter((r) => r.resource_class === 'corpus').length);
  const q = (id) => a.quantities.find((x) => x.id === id);
  const of = (ds) => a.quantities.filter((x) => x.dataset_id === ds);
  const r = (id) => a.resources.find((x) => x.id === id);
  for (const id of ['ds-agibot-world', 'ds-bridgedata-v2', 'ds-rh20t', 'ds-robomind2', 'ds-lingyu', 'ds-robocoin', 'ds-dexmanipnet', 'ds-ultradexgrasp20m', 'ds-egodex', 'ds-ego4d', 'ds-ego-exo4d']) assert.ok(r(id), id);
  assert.deepEqual(['ds-libero', 'ds-calvin', 'ds-roboeval', 'ds-physics-iq', 'ds-molmospaces', 'ds-robocolosseum'].map((id) => r(id).related_benchmarks.map((b) => b.id)), [['bm-libero'], ['bm-calvin'], ['bm-roboeval'], ['bm-physics-iq'], ['bm-molmospaces'], ['bm-robocolosseum']]);
  for (const name of ['RoboArena', 'PolaRiS', 'REALM', 'RoboDojo', 'Poke and Wiggle']) assert.ok(!a.resources.some((x) => x.name.includes(name)), `${name} is not a dataset`);
  // DexManipNet: about 3.3K simulated episodes; frames and objects are distinct quantities.
  const dex = of('ds-dexmanipnet');
  assert.ok(dex.some((x) => x.metric === 'episodes' && x.value === 3300 && x.qualifier === 'approximate' && x.data_origin === 'simulation'));
  assert.ok(dex.some((x) => x.metric === 'frames' && x.value === 1340000) && dex.some((x) => x.metric === 'objects' && x.value === 1200));
  // BridgeData V2: 60,096 = 50,365 teleoperated + 9,731 scripted.
  assert.equal(of('ds-bridgedata-v2').filter((x) => x.part).reduce((s, x) => s + x.value, 0), 60096);
  // RoboMIND 2.0: more than 310K real; tactile and mobile are subsets; 20K simulated is separate.
  assert.ok(of('ds-robomind2').some((x) => x.value === 310000 && x.qualifier === 'more_than' && !x.part));
  assert.ok(of('ds-robomind2').some((x) => x.value === 20000 && x.data_origin === 'simulation' && !x.part));
  // EgoDex 829 h with its splits; Ego4D and Ego-Exo4D separate; HubEgo releases and the stated total.
  assert.deepEqual(of('ds-egodex').filter((x) => x.metric === 'duration').map((x) => x.value).sort((m, n) => n - m), [829, 725, 97, 7]);
  assert.equal(of('ds-ego4d')[0].value, 3670);
  assert.equal(of('ds-ego-exo4d')[0].value, 1286.3);
  assert.notEqual(of('ds-ego4d')[0].comparison_group, of('ds-ego-exo4d')[0].comparison_group);
  assert.deepEqual(of('ds-hubego-100k').filter((x) => x.unit === 'hours').map((x) => x.value), [10124, 9990, 20113]);
  // UltraDexGrasp-20M: frames, not grasps or episodes.
  assert.deepEqual(of('ds-ultradexgrasp20m').map((x) => x.metric).sort(), ['frames', 'objects']);
  // OpenEgo contains EgoDex; the code licence is not the data licence.
  assert.deepEqual(r('ds-openego').parents, ['ds-egodex']);
  assert.equal(r('ds-openego').licence_stated, false);
  // LDA-1B / EI-30k and EgoScale: set apart from open corpora.
  assert.equal(of('ds-lda-1b')[0].set_apart, 'Training mixture');
  assert.equal(of('ds-egoscale')[0].set_apart, 'Provider claim');
  // LingYu: 139.4 h, 13,263 episodes, 45 Hz, CC BY-NC-SA 4.0.
  assert.deepEqual(of('ds-lingyu').filter((x) => ['hours', 'episodes', 'Hz'].includes(x.unit)).map((x) => qText(x)), ['139.4 hours', '13,263 episodes', '45 Hz']);
  assert.match(r('ds-lingyu').license_note, /CC BY-NC-SA 4\.0/);
  assert.ok(!q('dm-lingyu-1').limitations || !/attachment/i.test(q('dm-lingyu-1').limitations));
});

test('the published page and home page carry the atlas counts, never the old 28-entry directory', () => {
  const a = JSON.parse(readFileSync(new URL('data/datasets/atlas.json', root), 'utf8'));
  const page = readFileSync(new URL('datasets/index.html', root), 'utf8');
  assert.match(page, /<h1>Robot Learning Data Atlas<\/h1>/);
  assert.match(page, new RegExp(`<dt>Data resources</dt><dd>${a.counts.resources}</dd>`));
  assert.doesNotMatch(page, /docs\.google\.com|drive\.google\.com|spreadsheets\/d\//);
  const home = readFileSync(new URL('index.html', root), 'utf8');
  assert.match(home, new RegExp(`<a href="/datasets/">Datasets</a><p>[^<]*</p><span class="meta"><b>${a.counts.resources}</b> data resources`));
  assert.doesNotMatch(home, /<b>28<\/b> datasets/);
  const index = JSON.parse(readFileSync(new URL('data/preview/index.json', root), 'utf8'));
  assert.ok(!index.tabs.some((t) => t.id === 'datasets'), 'Datasets left the previews');
});
