// Catalogue coherence (25 Nov 2026, with Codex's review): the canonical directory rule, the current-status policy and the
// deployment country parser, on hand-made rows that pin each decision.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalDirectory, exactAddress, isSectionHeading } from '../src/catalogue/directory.js';
import { currentStatus, deploymentCountries, sourcePeriod } from '../src/public/status.js';

const spec = { id: 'software', lists: [{ list: 'software' }, { list: 'world_model' }], properNames: ['Unitree'] };
const row = (sheetRow, list, name, url, description = null) => ({ sheetRow, rank: sheetRow, data: { list, name, url, description } });
const run = (items) => canonicalDirectory(spec, items);

test('exact address keeps the path case, the query and the fragment; only host case, www and one trailing slash are ignored', () => {
  assert.equal(exactAddress('https://WWW.Example.com/Model/'), exactAddress('https://example.com/Model'));
  assert.notEqual(exactAddress('https://example.com/model?v=1'), exactAddress('https://example.com/model?v=2'));
  assert.notEqual(exactAddress('https://example.com/Project'), exactAddress('https://example.com/project'));
  assert.notEqual(exactAddress('https://example.com/a#x'), exactAddress('https://example.com/a#y'));
  assert.equal(exactAddress('not a url'), null);
});

test('distinct versions at query or case-different addresses stay separate entries', () => {
  const r = run([row(2, 'software', 'Model', 'https://example.com/model?v=1'), row(3, 'software', 'Model', 'https://example.com/model?v=2'), row(4, 'software', 'Kit', 'https://example.com/Kit'), row(5, 'software', 'Kit', 'https://example.com/kit')]);
  assert.equal(r.reconciliation.entries, 4);
  assert.equal(r.reconciliation.merged.length, 0);
  assert.equal(r.reconciliation.review.filter((x) => /same name, different addresses/.test(x.reason)).length, 2);
});

test('the same address under another name is not merged without a reviewed decision', () => {
  const r = run([row(23, 'software', 'Reachy Pollen Robotics', 'https://hub.docker.com/r/pollenrobotics/reachy2'), row(119, 'software', 'Reachy', 'https://hub.docker.com/r/pollenrobotics/reachy2')]);
  assert.equal(r.reconciliation.entries, 2);
  assert.ok(r.reconciliation.review.some((x) => /same address under another name/.test(x.reason)));
  const x = run([row(80, 'software', 'DreamDojo (NVIDIA)', 'https://dreamdojo-world.github.io/'), row(5, 'world_model', 'NVIDIA DreamDojo', 'https://dreamdojo-world.github.io/')]);
  assert.equal(x.reconciliation.memberships.length, 0, 'a cross-list pair with different names is not a membership either');
  assert.ok(x.items.every((i) => i.data.canonical === true));
});

test('an exact repeat in one list is merged, and its different description and group are kept', () => {
  const r = run([
    row(26, 'software', 'PyRoki', 'https://pyroki-toolkit.github.io/', 'Modular robot kinematics toolkit.'),
    row(77, 'software', 'SOFTWARE FOR UNITREE', null),
    row(78, 'software', 'SOFTWARE', 'URL', 'DESCRIPTION'),
    row(93, 'software', 'PyRoki', 'https://pyroki-toolkit.github.io', 'Python robot kinematics library used with Unitree arms.'),
    row(94, 'software', 'Latent', 'https://zzk273.github.io/LATENT/', 'Same text.'),
    row(110, 'software', 'Latent', 'https://zzk273.github.io/LATENT/', 'Same text.'),
  ]);
  const py = r.items.find((i) => i.data.name === 'PyRoki').data;
  assert.equal(py.description, 'Modular robot kinematics toolkit.');
  assert.deepEqual(py.other_descriptions, ['Python robot kinematics library used with Unitree arms.']);
  assert.deepEqual(py.other_groups, ['Software for Unitree']);
  assert.equal(r.reconciliation.merged.find((m) => m.sheet_row === 93).description, 'different: kept as another description');
  assert.equal(r.reconciliation.merged.find((m) => m.sheet_row === 110).description, 'identical');
  assert.deepEqual(r.reconciliation.excluded.map((e) => [e.sheet_row, e.reason.split(':')[0]]), [[77, 'section heading'], [78, 'repeated header row']]);
  assert.equal(r.items.find((i) => i.data.name === 'Latent').data.group, 'Software for Unitree');
});

test('a world model with the same name and address as a software entry is a membership with its own row', () => {
  const r = run([row(35, 'software', 'Lightwheel', 'https://lightwheel.ai/', 'Simulation.'), row(13, 'world_model', 'Lightwheel', 'https://www.lightwheel.ai')]);
  assert.equal(r.reconciliation.rows, 2);
  assert.equal(r.reconciliation.entries, 1);
  const wm = r.items.find((i) => i.data.list === 'world_model').data;
  assert.equal(wm.canonical, false);
  assert.equal(wm.canonical_list, 'software');
  assert.deepEqual(r.items.find((i) => i.data.list === 'software').data.also_listed_as, ['world_model']);
});

test('section headings are capitals with no address or description; a short or described name is an entry', () => {
  assert.equal(isSectionHeading({ name: 'SIMULATORS', url: null, description: null }), true);
  assert.equal(isSectionHeading({ name: 'TNKR', url: 'https://www.tnkr.ai/', description: 'IDE' }), false);
  assert.equal(isSectionHeading({ name: 'HDMI', url: 'https://hdmi-humanoid.github.io/', description: null }), false);
});

test('source dates: real calendar only; a year or month is an interval, not a point', () => {
  assert.equal(sourcePeriod('2026-99-99'), null);
  assert.equal(sourcePeriod('2026-02-30'), null);
  assert.equal(sourcePeriod('2026-13'), null);
  assert.deepEqual(sourcePeriod('2024-02'), { start: '2024-02-01', end: '2024-02-29', precision: 'month' });
  assert.deepEqual(sourcePeriod('2026'), { start: '2026-01-01', end: '2026-12-31', precision: 'year' });
});

test('current status: clear, same-day tie, ambiguous order and undated are told apart; ties are flagged, not hidden', () => {
  const k = (r) => r.s;
  const clear = currentStatus([{ publication_date: '2025-03-01', s: 'op' }, { publication_date: '2026-01-10', s: 'ann' }], k);
  assert.deepEqual([clear.key, clear.order, clear.tie], ['ann', 'clear', false], 'a later, less advanced source is what the case shows');
  const sameDay = currentStatus([{ publication_date: '2024-08-07', s: 'pilot' }, { publication_date: '2024-08-07', s: 'unc' }], k);
  assert.deepEqual([sameDay.key, sameDay.order, sameDay.tie], ['pilot', 'same_day', true]);
  const amb = currentStatus([{ publication_date: '2026-02-19', s: 'ann' }, { publication_date: '2026', s: 'unc' }], k);
  assert.deepEqual([amb.key, amb.order, amb.tie], ['unc', 'ambiguous', true], 'a year cannot be placed against a day inside it');
  const agree = currentStatus([{ publication_date: '2026-09', s: 'pilot' }, { publication_date: '2026-09-21', s: 'pilot' }], k);
  assert.deepEqual([agree.order, agree.tie], ['ambiguous', false]);
  const undated = currentStatus([{ publication_date: '', s: 'ann' }, { publication_date: 'n/a', s: 'op' }], k);
  assert.deepEqual([undated.dated, undated.key, undated.order], [false, 'op', 'undated']);
  const invalid = currentStatus([{ publication_date: '2026-99-99', s: 'op' }, { publication_date: '2025-05-05', s: 'ann' }], k);
  assert.deepEqual([invalid.key, invalid.as_of], ['ann', '2025-05-05'], 'an impossible date is not a date');
});

test('deployment countries: semicolons inside parentheses, partner-only, multiple and annotated parts', () => {
  const partner = deploymentCountries('South Korea (partner country; deployment site not confirmed)');
  assert.deepEqual([partner.countries, partner.unknown, partner.notes], [[], true, ['South Korea (partner country; deployment site not confirmed)']]);
  assert.deepEqual(deploymentCountries('Germany; Hungary').countries, ['Germany', 'Hungary']);
  const multiple = deploymentCountries('Multiple');
  assert.deepEqual([multiple.countries, multiple.multiple], [[], true]);
  const region = deploymentCountries('Not disclosed (North America)');
  assert.deepEqual([region.countries, region.unknown, region.notes], [[], true, ['Not disclosed (North America)']]);
  const annotated = deploymentCountries('Japan (Tokyo plant; line 2); France');
  assert.deepEqual([annotated.countries, annotated.notes, annotated.original], [['Japan', 'France'], ['Japan (Tokyo plant; line 2)'], 'Japan (Tokyo plant; line 2); France']);
  for (const v of ['South Korea (partner country; deployment site not confirmed)', 'Japan (Tokyo plant; line 2); France']) for (const c of deploymentCountries(v).countries) assert.doesNotMatch(c, /[();]/);
});
