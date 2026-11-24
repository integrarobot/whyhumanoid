// Research Conclusions Atlas (24 Nov 2026): the semantic invariants of the Reports findings, their master provenance,
// the public allowlist, and the rendered atlas (charts and tables hold the same checked marks, measures stay apart).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  CONSTRAINTS, METRICS, REPORT_COLUMNS, THEMES, atlasProblems, buildAtlas, reportRows, snapshotProblems,
} from '../server/src/reports/atlas.js';

const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const atlas = read('data/reports/atlas.json');
const mapping = read('tools/reports-findings.json');
const clone = (x) => JSON.parse(JSON.stringify(x));
const byId = new Map(atlas.findings.map((f) => [f.id, f]));
const view = await import(new URL('tools/reports-view.mjs', root));
const W = view.reportsCore;
const page = new JSDOM(view.renderReportsAtlas(atlas, { index: 10, total: 10, badge: '' })).window.document;
const fig = (id) => page.getElementById(id);
const marks = (id) => [...fig(id).querySelectorAll('a.mk')].map((a) => a.dataset.f);
const ids = (el) => [...new Set([...el.querySelectorAll('[data-f]')].map((x) => x.dataset.f))];

// A master Reports tab rebuilt from the mapping: every cited excerpt in its cell, rows in the master's order. The real
// export is private and stays outside Git; this keeps the provenance rules testable.
function masterFrom(m) {
  const rows = [...m.reports].sort((a, z) => (atlas.reports.find((r) => r.id === a.id)?.sheet_row ?? 0) - (atlas.reports.find((r) => r.id === z.id)?.sheet_row ?? 0));
  return [REPORT_COLUMNS, ...rows.map((r) => REPORT_COLUMNS.map((h) => (h === 'Report ID' ? r.id : m.findings.filter((f) => f.report === r.id && f.cell.column === h).map((f) => f.cell.excerpt).join(' | '))))];
}
const problemsOf = (m) => atlasProblems(reportRows(masterFrom(m)), m);

test('the committed snapshot is the build of the committed mapping and passes the allowlist', () => {
  assert.deepEqual(snapshotProblems(atlas), []);
  assert.deepEqual(problemsOf(mapping), []);
  const rebuilt = buildAtlas({ rows: reportRows(masterFrom(mapping)), mapping, exportedAt: atlas.snapshot.exported_at, builtAt: atlas.snapshot.built_at });
  assert.deepEqual(rebuilt.findings, atlas.findings);
  assert.equal(atlas.reports.length, 12);
  assert.equal(atlas.counts.findings, atlas.findings.length);
  assert.equal(atlas.counts.findings_checked, atlas.findings.filter((f) => f.check.status === 'verified').length);
});

test('master contract: header drift, duplicate ids, missing editions and excerpts not in the cell stop the build', () => {
  const values = masterFrom(mapping);
  assert.throws(() => reportRows([[...REPORT_COLUMNS.slice(0, -1), 'Renamed'], ...values.slice(1)]), /header drift/);
  assert.throws(() => reportRows([...values, values[1]]), /duplicate Report ID/);
  const extra = [...values, REPORT_COLUMNS.map((h) => (h === 'Report ID' ? 'RPT-099' : ''))];
  assert.match(atlasProblems(reportRows(extra), mapping).join('\n'), /RPT-099: no report entry/);
  const m = clone(mapping);
  const rows = reportRows(masterFrom(m));
  m.findings.find((f) => f.id === 'bofa-ship-2035').cell.excerpt = '12 million by 2035';
  assert.match(atlasProblems(rows, m).join('\n'), /bofa-ship-2035: excerpt not found in master RPT-002/);
});

test('ids and foreign keys: duplicate finding ids, unknown reports and vocabularies are refused', () => {
  const m = clone(mapping);
  m.findings.push({ ...clone(m.findings[0]) });
  m.findings.push({ ...clone(m.findings[1]), id: 'orphan', report: 'RPT-404' });
  m.findings.push({ ...clone(m.findings[2]), id: 'bad-metric', metric: 'percent_automation' });
  const p = problemsOf(m).join('\n');
  assert.match(p, /duplicate id/);
  assert.match(p, /orphan: unknown report RPT-404/);
  assert.match(p, /bad-metric: unknown metric percent_automation/);
});

test('checks: a checked finding quotes at most 30 words with a locator; an unreachable original has no checked finding', () => {
  const m = clone(mapping);
  const f = m.findings.find((x) => x.id === 'anth-tasks-74');
  f.check.phrase = Array(31).fill('word').join(' ');
  const ms = m.findings.find((x) => x.report === 'RPT-003');
  ms.check = { status: 'verified', phrase: 'a phrase', page: 1 };
  const p = problemsOf(m).join('\n');
  assert.match(p, /anth-tasks-74: the original phrase is too long/);
  assert.match(p, new RegExp(`${ms.id}: checked, but its report's original was not reachable`));
  for (const x of atlas.findings.filter((y) => y.check.status === 'verified')) {
    assert.ok(x.locator && x.check.phrase.split(/\s+/).length <= 30, x.id);
    assert.ok(atlas.reports.find((r) => r.id === x.report).check.status === 'verified', x.id);
  }
});

test('stocks and flows, revenue and wider measures: each in its own chart and unit', () => {
  for (const id of marks('chart-shipments')) assert.equal(byId.get(id).metric, 'shipments_annual');
  for (const id of marks('chart-installed')) assert.equal(byId.get(id).metric, 'installed_base');
  for (const id of marks('chart-revenue')) assert.equal(byId.get(id).metric, 'market_revenue');
  for (const id of ['capg-physical-gdp', 'fayd-ms-ecosystem-2050', 'fayd-industrial-robots']) {
    assert.ok(!marks('chart-revenue').includes(id) && !marks('chart-shipments').includes(id), id);
    assert.ok(ids(fig('cards-opportunity')).includes(id), id);
  }
  // An installed-base figure under a shipments estimate key, or a TAM in revenue units, is refused.
  const m = clone(mapping);
  m.findings.find((f) => f.id === 'bofa-pop-2040').estimate = 'bofa-gr-shipments';
  assert.match(problemsOf(m).join('\n'), /estimate bofa-gr-shipments: mixes/);
  const m2 = clone(mapping);
  Object.assign(m2.findings.find((f) => f.id === 'berg-rev-2040'), { unit: 'USD trillion' });
  assert.match(problemsOf(m2).join('\n'), /berg-rev-2040: market_revenue must be in usd/);
});

test('work: every percentage keeps its own denominator; exposure, cost-competitiveness and surveys are apart', () => {
  for (const f of atlas.findings.filter((x) => x.unit === '%')) assert.ok(f.denominator, f.id);
  for (const li of page.querySelectorAll('.sb')) assert.match(li.querySelector('.sb-d').textContent, /^Of \S/);
  assert.ok(ids(fig('bars-technical')).every((id) => byId.get(id).metric === 'technical_exposure'));
  assert.ok(!ids(fig('bars-technical')).includes('anth-costcomp-03'));
  assert.ok(ids(fig('bars-surveys-work')).every((id) => byId.get(id).kind === 'survey'));
  assert.equal(page.body.textContent.match(/% automation/), null);
  const m = clone(mapping);
  delete m.findings.find((f) => f.id === 'anth-hours-34').denominator;
  assert.match(problemsOf(m).join('\n'), /anth-hours-34: a percentage or survey figure needs its denominator/);
});

test('adoption: survey answers are labelled as answers, not realised adoption', () => {
  for (const id of ['bars-capgemini', 'bars-nexery']) {
    assert.match(fig(id).querySelector('figcaption').textContent, /not realised adoption/);
    for (const f of ids(fig(id)).map((x) => byId.get(x))) assert.equal(f.kind, 'survey', f.id);
  }
  assert.ok(!atlas.findings.some((f) => f.kind === 'survey' && f.metric === 'sector_share'));
});

test('costs: BOM, production cost, selling price and list price are marked apart; hourly costs and stacks stay off the unit chart', () => {
  const ms = marks('chart-costs').map((id) => byId.get(id));
  assert.deepEqual([...new Set(ms.map((f) => f.metric))].sort(), ['bom', 'list_price', 'production_cost', 'selling_price']);
  for (const a of fig('chart-costs').querySelectorAll('a.mk')) {
    const cls = a.querySelector('.mk-s').getAttribute('class');
    assert.match(cls, { production_cost: /e-c1/, bom: /e-c2/, selling_price: /e-c3/, list_price: /e-c4/ }[byId.get(a.dataset.f).metric]);
  }
  assert.ok(!marks('chart-costs').some((id) => ['cost_per_hour', 'price_structure', 'bom_structure', 'annual_cost_comparison'].includes(byId.get(id).metric)));
  // Stacks: only exhaustive parts in one denominator.
  const m = clone(mapping);
  m.findings.find((f) => f.id === 'barclays-three-bs').parts.pop();
  assert.match(problemsOf(m).join('\n'), /barclays-three-bs: parts add up to 85, not 100/);
  const nex = byId.get('nexery-price-stack');
  assert.equal(nex.parts.reduce((n, p) => n + p[1], 0), nex.parts_total);
  assert.match(fig('stack-nexery-price-stack').textContent, /R&D and margins, not itemised/);
});

test('repeats: one mark per original estimate, saying in how many reports it appears', () => {
  assert.deepEqual(byId.get('bofa-ship-2035').appears_in, ['RPT-002', 'RPT-007', 'RPT-008']);
  assert.deepEqual(byId.get('bofa-ship-2025').appears_in, ['RPT-002']);
  assert.equal(atlas.counts.repeated_estimates, 4);
  const ship = marks('chart-shipments');
  assert.equal(ship.filter((id) => byId.get(id).origin === byId.get('bofa-ship-2035').origin).length, 1);
  assert.match(fig('chart-shipments').querySelector('a[data-f="bofa-ship-2035"]').textContent, /×3/);
  for (const id of ['chart-shipments', 'chart-installed', 'chart-revenue', 'chart-costs']) {
    const origins = marks(id).map((x) => byId.get(x).origin);
    assert.equal(new Set(origins).size, origins.length, id);
  }
});

test('ranges and scenarios: base and high cases are separate marks; a spread across publishers is not an estimate', () => {
  const rev = marks('chart-revenue');
  assert.ok(rev.includes('barclays-rev-2035-base') && rev.includes('barclays-rev-2035-high'));
  assert.notEqual(byId.get('barclays-rev-2035-base').origin, byId.get('barclays-rev-2035-high').origin);
  const span = fig('chart-shipments').querySelector('a[data-f="fayd-bcg-span-2030"]');
  assert.ok(span.querySelector('path.span') && !span.querySelector('rect'));
  assert.match(span.getAttribute('aria-label'), /span of others/);
  // Nothing is averaged or interpolated: no lines join marks, and no mark falls on a year no finding states.
  assert.equal(fig('chart-shipments').querySelectorAll('polyline, path.series').length, 0);
  for (const id of ['chart-shipments', 'chart-installed', 'chart-revenue', 'chart-costs']) for (const x of marks(id)) assert.ok(Number.isInteger(byId.get(x).target_year));
});

test('the ambiguous Morgan Stanley China figures are withheld: no numbers, no year, never drawn', () => {
  const f = byId.get('ms-china-ambiguous');
  assert.equal(f.check.status, 'withheld');
  for (const k of ['value', 'min', 'max', 'target_year', 'points']) assert.equal(f[k], null, k);
  assert.ok(!page.querySelector('svg a[data-f="ms-china-ambiguous"]'));
  assert.ok(page.querySelector('.rp-ft tr[data-f="ms-china-ambiguous"][data-check="withheld"]'));
  const m = clone(mapping);
  Object.assign(m.findings.find((x) => x.id === 'ms-china-ambiguous'), { value: 12, unit: 'RMB billion', target_year: 2030 });
  assert.match(problemsOf(m).join('\n'), /ms-china-ambiguous: a withheld finding must not carry figures or years/);
});

test('only checked findings are drawn; missing values are listed, not drawn', () => {
  for (const svg of page.querySelectorAll('svg.rp-svg')) for (const a of svg.querySelectorAll('a.mk')) assert.equal(byId.get(a.dataset.f).check.status, 'verified', a.dataset.f);
  for (const li of page.querySelectorAll('.sb.undrawn')) assert.notEqual(byId.get(li.dataset.f).check.status, 'verified');
  for (const f of atlas.findings.filter((x) => x.check.status !== 'verified')) {
    assert.ok(!page.querySelector(`svg a[data-f="${f.id}"]`), f.id);
    assert.ok(page.querySelector(`.rp-ft tr[data-f="${f.id}"]`), f.id);
  }
});

test('charts and their tables hold the same marks; the findings table holds every finding', () => {
  for (const svg of page.querySelectorAll('svg.rp-svg')) {
    const f = svg.closest('figure');
    assert.deepEqual([...svg.querySelectorAll('a.mk')].map((a) => a.dataset.f).sort(), [...f.querySelectorAll('.rp-tv tbody tr')].map((tr) => tr.dataset.f).sort(), f.id);
  }
  assert.deepEqual([...page.querySelectorAll('.rp-ft tbody tr')].map((tr) => tr.dataset.f), atlas.findings.map((f) => f.id));
});

test('locators and deep links: every finding has a passport on its report page and links back to its original', () => {
  for (const r of atlas.reports) {
    const d = new JSDOM(view.renderReportPage(atlas, r)).window.document;
    assert.ok(d.querySelector(`a[href="${r.url}"]`), r.id);
    for (const f of atlas.findings.filter((x) => x.report === r.id)) {
      const pp = d.getElementById(`f-${f.id}`);
      assert.ok(pp, f.id);
      assert.match(pp.textContent, new RegExp(`Reports row ${f.cell.row}, column ${f.cell.column}`));
      if (f.check.status === 'verified') assert.ok(pp.querySelector(`a[href="${r.url}"]`) && pp.textContent.includes(f.locator), f.id);
    }
  }
  for (const a of page.querySelectorAll('a.mk, .ref, .rp-ft .ft-s a')) assert.match(a.getAttribute('href'), /^\/reports\/[a-z0-9-]+\/#f-[a-z0-9-]+$/);
  assert.equal(atlas.reports.find((r) => r.slug === 'anthropic-what-work-can-robots-do-2026').page_id, 'rpt_anthropic_2026_what-work-can-robots-do');
});

test('public allowlist: no private links, local paths, workbook names or editorial notes', () => {
  const text = JSON.stringify(atlas);
  assert.doesNotMatch(text, /docs\.google|drive\.google|\/spreadsheets\/d\/|googleusercontent|file:\/\/|\/tmp\/|scratchpad|Source workbook|Grok/i);
  const bad = clone(atlas);
  bad.findings[0].internal_note = 'x';
  assert.match(snapshotProblems(bad).join('\n'), /internal_note/);
  const bad2 = clone(atlas);
  bad2.reports[0].url = 'https://docs.google.com/document/d/x';
  assert.ok(snapshotProblems(bad2).length);
});

test('mentions are not a ranking: the constraint matrix keeps vocabulary order and marks lists on every constraint they name', () => {
  const rows = [...fig('constraints').querySelectorAll('tbody th')].map((th) => th.textContent);
  assert.deepEqual(rows, Object.values(CONSTRAINTS));
  const fayd = [...fig('constraints').querySelectorAll('a[data-f="fayd-r-list"]')].length;
  assert.equal(fayd, 1 + byId.get('fayd-r-list').constraints_also.length);
  assert.match(fig('constraints').querySelector('figcaption').textContent, /not a ranking/);
});

test('funding flows, shares and valuations are separate figures', () => {
  assert.ok(ids(fig('cards-flows')).every((id) => byId.get(id).metric === 'funding_flow'));
  assert.deepEqual(ids(fig('cards-valuation')), ['barclays-figure-valuation']);
  assert.match(fig('cards-flows').querySelector('figcaption').textContent, /not on one axis/);
});

test('the synthesis cites only existing findings, and marks unchecked ones', () => {
  for (const [key, s] of Object.entries(view.SYNTHESIS)) {
    assert.ok(THEMES.some((t) => t.key === key), key);
    for (const [, id] of Object.values(s).join(' ').matchAll(/\[\[([a-z0-9-]+)\]\]/g)) assert.ok(byId.has(id), id);
  }
  for (const a of page.querySelectorAll('.rp-syn .ref')) assert.equal(a.classList.contains('unchecked'), byId.get(a.dataset.f).check.status !== 'verified', a.dataset.f);
});

test('values are shown as stated: units, qualifiers and ranges, never converted', () => {
  assert.equal(W.valueText(byId.get('fayd-bcg-span-2030')), '1 to 6 million units');
  assert.equal(W.valueText(byId.get('barclays-rev-2030')), 'US$10 to US$25 billion');
  assert.equal(W.valueText(byId.get('fayd-gs-ship-2030')), 'more than 250,000 units');
  assert.equal(W.valueText(byId.get('bofa-bom-china-2030')), 'below US$17,000 per unit');
  assert.equal(W.valueText(byId.get('fayd-actuation')), '40% to 60% of BOM');
  assert.equal(W.valueText(byId.get('pham-unicorns')), 'Chinese humanoid unicorns: 9 of 13; Western humanoid unicorns: 1 of 7');
  for (const k of Object.keys(METRICS)) assert.ok(atlas.vocabulary.metrics[k], k);
});
