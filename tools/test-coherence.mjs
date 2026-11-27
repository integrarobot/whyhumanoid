// Catalogue coherence across surfaces (node --no-warnings --test tools/test-coherence.mjs; in CI). The home page, the
// category pages, the public previews and the public projection must agree on the same canonical counts, with the
// legitimate differences labelled (Javier, 25 Nov 2026; reviewed by Codex).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { publicCases } from '../server/src/public/cases.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const json = (p) => JSON.parse(read(p));
const home = read('index.html');
const index = json('data/preview/index.json');
const tab = (id) => index.tabs.find((t) => t.id === id);
const card = (path) => Number(new RegExp(`<li><a href="${path}">[^<]*</a><p>[^<]*</p><span class="meta"><b>(\\d+)</b>`).exec(home)?.[1]);

test('directory tabs: the home card, the category page and the index count the same canonical entries', () => {
  for (const [id, path] of [['software', '/software/'], ['other-robots', '/other-robots/']]) {
    const t = tab(id);
    const entries = t.canonical_entries ?? t.entries_total;
    assert.equal(card(path), entries, `${id} home card`);
    assert.match(read(`${path.slice(1)}index.html`), new RegExp(`All ${entries} entries`), `${id} page`);
    const rows = json(`data/preview/${id}.json`).rows;
    assert.equal(rows.length, t.entries_total);
    assert.equal(rows.filter((r) => r.canonical !== false).length, entries);
    // No header or section row survives as an entry, and no exact repeat (same address and name in one list).
    assert.ok(!rows.some((r) => /^(SOFTWARE|SIMULATORS?|NAME|URL|DESCRIPTION|EDUBOTS)$/.test(String(r.name).trim()) || /^url$/i.test(String(r.url ?? ''))), `${id}: a header row is listed`);
    const seen = new Set();
    for (const r of rows) { const k = `${r.list}|${String(r.url).toLowerCase().replace(/\/$/, '')}|${String(r.name).toLowerCase()}`; assert.ok(!seen.has(k), `${id}: repeated ${r.name}`); seen.add(k); }
    // Every reconciled row is accounted for: source entries = rows + excluded + merged.
    const rc = t.reconciliation;
    assert.equal(rc.source_entries, rc.rows + rc.excluded.length + rc.merged.length, `${id} reconciliation`);
    assert.equal(rc.rows, rows.length);
  }
  // The app counts the same canonical entries from the API's `entries` (hero, index, card and app agree: Codex, 25 Nov 2026).
  const src = /const countText = (\(data\) => \{[^\n]*\});/.exec(read('app/premium.js'))?.[1];
  assert.ok(src, 'app countText found');
  const countText = new Function(`return ${src}`)();
  const sw = tab('software');
  assert.equal(countText({ entries: sw.canonical_entries, total: sw.entries_total }), `${sw.canonical_entries} entries (${sw.entries_total} rows: ${sw.memberships} are the same entry in a second list)`);
  assert.equal(countText({ entries: tab('other-robots').entries_total, total: tab('other-robots').entries_total }), `${tab('other-robots').entries_total} entries`);
  assert.ok(json('data/preview/other-robots.json').rows.some((r) => r.name === 'Agile Robots' && /agile-robots\.com/.test(r.url)), 'the corrected Agile Robots identity');
});

test('Humanoids: robots, uncertain scope and software counted apart; reviewed labels quote their records', () => {
  const cat = json('data/humanoids-catalogue.json').records;
  const cls = json('tools/catalogue-classification.json').records;
  for (const c of cls) {
    const r = cat.find((x) => x.id === c.id);
    for (const e of c.excerpts) assert.ok(String(r[e.field]).includes(e.text), `${c.id} ${e.field}`);
  }
  const sw = cls.filter((c) => c.kind === 'software').length;
  const unc = cls.filter((c) => c.kind === 'uncertain').length;
  assert.equal(card('/humanoids/'), cat.length - sw - unc);
  assert.match(home, new RegExp(`humanoid robot models${unc ? ` · ${unc} of uncertain scope` : ''}${sw ? ` · ${sw} software models listed apart` : ''} · Free`));
  const data = JSON.parse(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/.exec(home)[1]);
  assert.equal(data.models.find((m) => m.id === 132).mob, 'Wheeled', 'PokeBot: its record says wheeled and rejects the bipedal form');
  assert.ok(!JSON.stringify(cat).includes('consider moving'), 'no editor instruction in the public catalogue');
  const chart = json('data/evolution/charts.json').charts[0];
  assert.equal(chart.coverage.total, cat.length - sw, 'the chart denominator excludes software models');
});

test('Humanoids: the full current tab, historical ids kept, moved records keep a labelled page and leave the counts', () => {
  const doc = json('data/humanoids-catalogue.json');
  const ids = doc.records.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  assert.equal(doc.records.find((r) => r.id === 134)?.Robot, 'Darwin-0', 'Darwin keeps 134');
  const identity = json('tools/humanoids-identity.json');
  for (const r of identity.renamed) assert.equal(doc.records.find((x) => x.id === r.id)?.Robot, r.to.Robot, `renamed ${r.id} keeps its id`);
  for (const mv of identity.moved) {
    assert.ok(!ids.includes(mv.id), `${mv.id} is no longer counted`);
    assert.ok(doc.moved.some((x) => x.id === mv.id), `${mv.id} is listed as moved`);
    const dir = readdirSync(new URL('humanoids/', root)).find((d) => d.endsWith(`-${mv.id}`));
    assert.ok(dir, `${mv.id} keeps its historical address`);
    const html = read(`humanoids/${dir}/index.html`);
    assert.match(html, new RegExp(`Reclassified as ${mv.to.label}`), `${mv.id} page says where it went`);
    assert.doesNotMatch(html, /hidden tab|sheet row|\brow \d|workbook moved|Humanoids reclassified/i, `${mv.id}: no internal spreadsheet operations on the page`);
    assert.ok(!('evidence' in doc.moved.find((x) => x.id === mv.id)), `${mv.id}: review evidence stays out of the public catalogue`);
  }
  for (const id of Object.keys(json('tools/robot-presentation.json').robots)) assert.ok(ids.includes(Number(id)), `presentation override ${id} still applies`);
  // Release dates on the chart: only a model release or unveiling; anything else is excluded with its reason.
  const chart = json('data/evolution/charts.json').charts[0];
  const reasons = chart.coverage.excluded.map((x) => x.reason).join(' | ');
  for (const [name, why] of [['InMoov', 'a project start'], ['HIRO Industries Origin', 'access or reservations'], ['PokeBot', 'No product released']]) assert.match(reasons, new RegExp(`${name}[^|]*${why}`), name);
  assert.equal(chart.coverage.excluded.reduce((n, x) => n + x.count, 0) + chart.coverage.included, chart.coverage.total);
});

test('Deployments: the home projection and the section show the same current status; undated cases apart; countries clean', () => {
  const proj = json('data/public/projection.json');
  const cases = publicCases(json('data/preview/deployments.json').rows);
  const tally = (xs) => xs.reduce((m, k) => ({ ...m, [k]: (m[k] ?? 0) + 1 }), {});
  assert.deepEqual(tally(proj.cases.map((c) => c.stage)), tally(cases.map((c) => c.status.key)));
  assert.equal(proj.cases.filter((c) => c.dated === false).length, cases.filter((c) => !c.status.dated).length);
  assert.equal(json('data/preview/deployments.json').rows.length, proj.totals.records, 'every claim row kept');
  for (const c of cases) for (const x of c.countries) assert.doesNotMatch(x, /[();]|^multiple$|not disclosed|partner/i, `${c.slug}: "${x}" is not a country`);
  for (const c of proj.cases) for (const x of c.countries) assert.doesNotMatch(x, /[();]/);
  const korea = cases.find((c) => c.slug === 'persona-hdhyundai-shipyards');
  assert.deepEqual(korea.countries, []);
  assert.ok(korea.country_notes.some((n) => /partner country; deployment site not confirmed/.test(n)), 'the original note is kept');
  // A tie-break is said next to the status, never hidden.
  const page = read('deployments/index.html');
  for (const c of cases.filter((x) => x.status.tie)) assert.match(page, new RegExp(`id="${c.slug}"[\\s\\S]*?the most advanced is shown`), c.slug);
});

test('old addresses still answer: renamed or merged entries redirect', () => {
  for (const [file, to] of [['other-robots/agilex-2/index.html', '/other-robots/agile-robots/'], ['companies/hexagon-2/index.html', '/companies/hexagon/'], ['companies/shenzhen-dobot-technology-corp/index.html', '/companies/dobot/']]) {
    assert.ok(existsSync(new URL(file, root)), file);
    assert.match(read(file), new RegExp(`is now at <a href="${to}"`), file);
  }
});

test('freshness: every category card names its own date and kind; no blanket export date', () => {
  const fresh = [...home.matchAll(/<span class="meta fresh">([^<]*)<\/span>/g)].map((m) => m[1]);
  assert.equal(fresh.length, 10);
  assert.ok(fresh.every((f) => /^(records checked up to|workbook copy of|originals checked) \d{1,2} [A-Z][a-z]{2} \d{4}$/.test(f)), fresh.join(' | '));
  assert.ok(!/Humanoids free · exported/.test(home));
  assert.match(home, /<b>13<\/b> external reports \+ 1 Why Humanoid\? analysis/);
});

// Countries (27 Nov 2026): the Humanoids country filter counts countries, not localities, with the same reading as the
// search tags; the recorded Country value, locality included, stays in each record; unknown stays unknown.
test('the Humanoids country facet is the shared country reading; localities stay in the recorded value', async () => {
  const { countryNames } = await import('../server/src/search/vocabulary.js');
  const catalogue = json('data/humanoids-catalogue.json');
  const facets = new Map();
  for (const x of home.match(/"id":\d+,"row":\d+,[^]*?"c":\[[^\]]*\]/g) ?? []) {
    const id = Number(/"id":(\d+)/.exec(x)[1]);
    facets.set(id, JSON.parse(/"c":(\[[^\]]*\])/.exec(x)[1]));
  }
  assert.ok(facets.size > 200, `facets read for ${facets.size} records`);
  const names = new Set([...facets.values()].flat());
  assert.ok([...names].every((n) => !/[()]/.test(n)), `no locality in a country: ${[...names].filter((n) => /[()]/.test(n))}`);
  for (const r of catalogue.records) {
    if (!facets.has(r.id)) continue;
    assert.deepEqual(facets.get(r.id), countryNames(r.Country), `record ${r.id} "${r.Country}"`);
  }
  const beijing = catalogue.records.find((r) => r.Country === 'China (Beijing)');
  assert.deepEqual(facets.get(beijing.id), ['China']);
  assert.ok(home.includes('China (Beijing)'), 'the recorded value, locality included, is still in the record');
  const undisclosed = catalogue.records.find((r) => r.Country === 'Not disclosed');
  assert.deepEqual(facets.get(undisclosed.id), [], 'unknown stays unknown');
  const claimed = catalogue.records.find((r) => /claimed/.test(r.Country ?? ''));
  assert.deepEqual(facets.get(claimed.id), [], 'a claimed location is not a recorded country');
  assert.equal(names.size, 22, [...names].sort().join(', '));
});

// Method (27 Nov 2026): E0-E5 have no documented definition; they are not presented as a quality scale anywhere public.
test('Method names E0-E5 as undefined legacy codes, never as a scale; no public page ranks by them', () => {
  const method = read('method/index.html');
  assert.match(method, /No definition of these codes exists in the research workbook or in the project's documentation, so they are not a quality scale/);
  assert.match(method, /a code implies no confidence and no independent verification/);
  assert.doesNotMatch(method, /an evidence level\.|metric, evidence level, verification label/);
  assert.doesNotMatch(read('app/premium.js'), /Evidence level \$\{/);
  assert.match(read('app/premium.js'), /legacy evidence code \(undefined, not a quality rank\)/);
});
