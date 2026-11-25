// Research Conclusions Atlas (24 Nov 2026): the static HTML of /reports/ and of each report page, built from the public
// snapshot data/reports/atlas.json (tools/export-reports.mjs). Everything is readable without JavaScript: the coverage
// matrix, every chart with a table of the same marks, the synthesis of each theme with links to its findings, the
// findings table and every finding passport (on its report page). assets/reports.js adds filters, the passport panel
// and shareable URL state (?theme, ?report, ?check, ?kind, ?f) on top of the same markup.
//
// Semantic rules carried into the view (server/src/reports/atlas.js holds the data rules):
// - only findings checked against the original are drawn; pending, unreachable and withheld ones are listed with state;
// - one mark per original estimate: a figure repeated by several reports is drawn once and says where it appears;
// - shipments (a flow), installed base (a stock), robot revenue and wider opportunities are separate charts;
// - no averages, no interpolation, no lines between points, no extension to a common year; a spread across
//   publishers is dispersion, not a confidence interval;
// - every percentage keeps its own denominator; surveys are answers, not realised adoption;
// - bill of materials, production cost, selling price and list price are marked apart; only exhaustive stacks in one
//   denominator are stacked; funding flows, valuations and supplier lists are kept apart;
// - mentions of a constraint are shown in vocabulary order, never ranked.

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const core = {};
vm.runInNewContext(readFileSync(new URL('../assets/reports-core.js', import.meta.url), 'utf8'), { globalThis: core, window: undefined });
const W = core.WHReports;
const { esc, isNum, compact, valueText, badge } = W;
export { W as reportsCore };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dateText = (d) => { const [y, m, day] = String(d ?? '').split('-'); return day ? `${Number(day)} ${MONTHS[m - 1]} ${y}` : m ? `${MONTHS[m - 1]} ${y}` : y || 'not stated'; };
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
export const reportPath = (r) => `/reports/${r.slug}/`;
const verified = (f) => f.check.status === 'verified';
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Original estimators, one fixed hue each (validated categorical palette, dark surface): colour follows the estimator.
const ESTIMATORS = [
  ['bofa', 'BofA Global Research', /^BofA Global Research/],
  ['gs', 'Goldman Sachs', /^Goldman Sachs/],
  ['berg', 'Berg Insight', /^Berg Insight/],
  ['barclays', 'Barclays Research', /^Barclays Research/],
  ['bcg', 'BCG (span of others’ forecasts)', /^BCG/],
  ['ms', 'Morgan Stanley', /^Morgan Stanley/],
];
const estimatorOf = (f) => ESTIMATORS.find(([, , re]) => re.test(f.attribution ?? '')) ?? ['other', f.attribution ?? 'The report itself', null];
const KIND_SHAPE = { forecast: 'circle', estimate: 'square', observed: 'triangle', scenario: 'diamond', model: 'diamond', survey: 'circle', qualitative: 'circle' };
const shapeSvg = (shape, x, y, cls, r = 5.5) => {
  if (shape === 'square') return `<rect class="${cls}" x="${x - r + 0.5}" y="${y - r + 0.5}" width="${2 * r - 1}" height="${2 * r - 1}" rx="1.5"/>`;
  if (shape === 'diamond') return `<path class="${cls} hollow" d="M${x} ${y - r - 1}L${x + r + 1} ${y}L${x} ${y + r + 1}L${x - r - 1} ${y}Z"/>`;
  if (shape === 'triangle') return `<path class="${cls}" d="M${x} ${y - r - 0.5}L${x + r + 0.5} ${y + r - 0.5}L${x - r - 0.5} ${y + r - 0.5}Z"/>`;
  return `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"/>`;
};
const keyGlyph = (shape, cls = 'e-key') => `<svg class="kg" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">${shapeSvg(shape, 8, 8, cls, 5)}</svg>`;

// ---------- model ----------
export function reportsModel(atlas) {
  const reports = new Map(atlas.reports.map((r) => [r.id, r]));
  const findings = new Map(atlas.findings.map((f) => [f.id, f]));
  const byReport = (id) => atlas.findings.filter((f) => f.report === id);
  const theme = (k) => atlas.vocabulary.themes.find((t) => t.key === k);
  const reportsObj = Object.fromEntries(atlas.reports.map((r) => [r.id, r]));
  const shortPub = (r) => r.short.split(' · ')[0];
  return { atlas, reports, findings, byReport, theme, reportsObj, shortPub };
}

const fLink = (m, f, label, cls = 'ref') => `<a class="${cls}${verified(f) ? '' : ' unchecked'}" href="${reportPath(m.reports.get(f.report))}#f-${esc(f.id)}" data-f="${esc(f.id)}">${label}</a>`;
// "[[id]]" in editorial text becomes a link to the finding, named by its report, marked when it is not checked.
const refs = (m, text) => esc(text).replace(/\[\[([a-z0-9-]+)\]\]/g, (_, id) => {
  const f = m.findings.get(id);
  if (!f) throw new Error(`synthesis cites an unknown finding: ${id}`);
  return fLink(m, f, `${esc(m.shortPub(m.reports.get(f.report)))}${verified(f) ? '' : ' · unchecked'}<span class="sr">: ${esc(f.statement)}</span>`);
});

// ---------- editorial synthesis: what the checked findings agree on, where they diverge, conditions and gaps ----------
// Written from the findings only; every claim cites them. Unchecked findings are cited only as gaps.
export const SYNTHESIS = {
  market: {
    agree: 'Both original estimates for 2025 put humanoid shipments in the tens of thousands: about 20,000 units [[bofa-ship-2025]] and 16,000 units [[berg-ship-2025]]. Every checked forecast has annual shipments growing by orders of magnitude over the following ten to fifteen years.',
    diverge: 'For 2035, BofA Global Research forecasts 10 million units a year [[bofa-ship-2035]] and Goldman Sachs 1.4 million in its base case [[gs-ship-2035]], about seven times apart, as Fayd notes [[fayd-bofa-ship-2035]]. BCG puts published forecasts for 2030 anywhere from below 1 million to above 6 million units [[fayd-bcg-span-2030]]. Even the size of the market in 2025 differs about eightfold: US$890 million [[berg-rev-2025]], US$2 to 3 billion [[barclays-rev-today]] and about US$7 billion [[bluebay-rev-2025]].',
    conditions: 'Shipments are a flow (units a year) and installed base is a stock (units in operation): 3 billion units in operation by 2060 [[bofa-pop-2060]] is not comparable with 10 million shipped in 2035. Goldman Sachs made its figures in January 2024, two years before the others [[gs-ship-2035]]. Scenarios stay apart from base cases: Barclays’ most optimistic US$200 billion for 2035 [[barclays-rev-2035-high]] is not its baseline of about US$40 billion [[barclays-rev-2035-base]]. The GDP of physical industries [[capg-physical-gdp]] and ecosystem estimates [[fayd-ms-ecosystem-2050]] measure activity robots could address, not robot sales.',
    gaps: 'Repeats are not confirmation: the 10 million figure appears in three reports and is one BofA estimate. Morgan Stanley’s original could not be reached for review, and its China figures are withheld because their years cannot be matched to values [[ms-china-ambiguous]]. Berg Insight’s model sits in a paid report; only its public summary was checked [[berg-ship-2040]].',
  },
  work: {
    agree: 'Barclays and BlueBay expect humanoids to augment workers rather than replace them [[barclays-augment]] [[bluebay-augment]]. Executives cite labour shortages as the main reason to adopt [[capg-shortage-74]], and US manufacturing faces nearly 1 million production openings a year through 2034 [[fayd-openings]].',
    diverge: 'What robots could do and where they pay are far apart. Anthropic finds robots able to perform 74% of US physical tasks in some setting [[anth-tasks-74]] but cost-competitive for 0.3% of job tasks today [[anth-costcomp-03]]. NEXERY sees more than 60% of manual operational tasks in manufacturing and logistics as theoretically supportable within a decade [[nexery-theoretical-60]]; Goldman Sachs’ scenario covers 10% to 15% of a subset of hazardous and auto manufacturing roles [[gs-roles]].',
    conditions: 'Every percentage has its own denominator: physical tasks, working hours, job tasks, a subset of roles, project cases or survey respondents. None is a share of jobs lost. Timing depends on cost: at past rates of decline, half of today’s physical work is not cost-competitive until 2085; in a fast scenario, by 2050 [[anth-half-2085]] [[anth-half-2050]].',
    gaps: 'Only Anthropic sets exposure against observed history, finding larger wage and employment declines in more exposed jobs over 50 years [[anth-history]]. Morgan Stanley’s “humanoidability” and Intel’s workforce-capability figures could not be checked [[ms-humanoidability]] [[intel-capability]].',
  },
  costs: {
    agree: 'Costs are falling, and much of the cost is actuation. Barclays and Capgemini give the same figure, a fall from about US$3 million to about US$100,000 per unit in a decade, counted once [[barclays-cost-decade]] [[capg-cost-decade]]. Four reports put actuation at around half of the cost of a humanoid, as a share of production cost or of the bill of materials [[barclays-three-bs]] [[bofa-bom-shares-2030]] [[fayd-actuation]] [[bluebay-actuators]].',
    diverge: 'Unit costs today differ by a factor of up to five depending on what is counted and where: a China-built bill of materials of about US$35,000 [[bofa-bom-china-2025]], pilot-stage costs of US$90,000 to 100,000 [[bofa-bom-pilot]], McKinsey’s US$30,000 to 150,000 [[fayd-mck-bom]] and a high-spec US$150,000 in 2023 [[gs-bom-2023]].',
    conditions: 'Bill of materials, production cost, selling price and list price are different measures and are marked apart. A selling price includes R&D and margins: NEXERY itemises about US$43,000 inside a price of about US$55,000 [[nexery-price-stack]]. Cost per hour depends on the hours worked and leaves out financing, integration and supervision [[fayd-cost-hour]].',
    gaps: 'Morgan Stanley’s Optimus bill of materials and Intel’s three-year payback expectation could not be checked [[ms-optimus-bom]] [[intel-cost-3y]]. Unitree’s list prices describe different models, not a cost trend, and two have no stated year [[barclays-unitree-prices]].',
  },
  adoption: {
    agree: 'Plans run well ahead of deployment: 79% of Capgemini’s organisations engage with physical AI and 27% deploy or scale it [[capg-engaging]] [[capg-deploying]]; 73% of NEXERY’s respondents plan to deploy humanoids [[nexery-plan]].',
    diverge: 'Expectations of timing differ even inside one survey: 45% expect humanoids alongside employees by 2030 [[capg-hum-2030]], but only 30% see them as viable general-purpose workers within three to five years [[capg-hum-viable]].',
    conditions: 'A survey answer is an intention or a perception, not realised adoption, and samples differ: 1,678 organisations for Capgemini, 152 industry participants for NEXERY. The only checked sector split, 72% of 2027 installations in logistics, manufacturing and automotive, is a Counterpoint Research forecast [[bofa-sectors-2027]].',
    gaps: 'Intel’s survey of 800 leaders could not be checked against its original [[intel-fleet]] [[intel-never]], and the sector sequences of BlueBay, Fayd and Berg Insight are pending [[industrial-first]] [[fayd-sequence]] [[berg-sequence]]. No report counts robots actually at work by sector.',
  },
  investment: {
    agree: 'Every checked funding series rises: humanoid investment from US$0.7 billion in 2018 to US$4.3 billion in 2025 [[bofa-invest]], a record US$40.7 billion of robotics venture capital in 2025 [[capg-vc-2025]], and 42% of venture money for humanoid and robot AI companies in 2024–26 [[pham-share]].',
    diverge: 'The flows measure different things: humanoid investment in a year, robotics venture capital in one quarter, US$8.8 billion [[barclays-vc-q2]], and robotics venture capital in a year. They are not drawn on one axis. A valuation is a price, not money raised: Figure AI’s rise to US$39 billion [[barclays-figure-valuation]] is not a flow.',
    conditions: 'Supplier lists name likely beneficiaries [[bluebay-beneficiaries]], not evidence that a company supplies humanoid makers. Trade shares are of actuator components in general, not of humanoids [[barclays-europe-actuators]].',
    gaps: 'Morgan Stanley’s valuations and Intel’s edge-AI figures could not be checked [[ms-valuations]] [[intel-edge]].',
  },
  risks: {
    agree: 'Reliability and maturity is named by four checked reports [[bofa-r-reliability]] [[fayd-r-list]] [[capg-r-tech]] [[berg-r-list]]; supply chains for actuators, sensors and batteries are named too [[bofa-r-supply]].',
    diverge: 'Reports put different bottlenecks first: manipulation limits about half of physical tasks for Anthropic [[anth-r-capability]]; data quality for NEXERY’s respondents [[nexery-r-data]]; slow, costly robot data for Pham [[pham-r-data]]; battery run time for Barclays [[barclays-r-battery]].',
    conditions: 'A mention is not a ranking: the matrix shows which constraints each report names, not how severe they are. Survey percentages say how many respondents chose a barrier.',
    gaps: 'Several mentions are pending, among them actuator and rare-earth dependence in Barclays and roller-screw capacity in Goldman Sachs [[barclays-r-actuators]] [[gs-r-screws]].',
  },
  regions: {
    agree: 'Every checked count puts China ahead on volume: 48 of about 90 commercial humanoid vendors [[nexery-china-vendors]], close to 70% of the new models of 2025 [[barclays-china-models]], about 7,700 patents against 1,560 in the US [[bluebay-patents]] and 78 robot AI models against 30 [[pham-models]].',
    diverge: 'Counts of products and makers use different definitions and dates: more than 330 models from more than 140 manufacturers in 2025 [[capg-china]] and more than 400 complete products by mid-2026 [[fayd-china-products]].',
    conditions: 'Each share has its own denominator: vendors identified by one study, new models in one year, patents over five years, unicorns with paying customers [[pham-unicorns]].',
    gaps: 'Berg Insight’s regional ranking is pending [[berg-regions]]; Morgan Stanley’s China figures are withheld [[ms-china-ambiguous]].',
  },
};
const SYN_LABEL = [['agree', 'Where they agree'], ['diverge', 'Where they diverge'], ['conditions', 'What drives the numbers'], ['gaps', 'Gaps and limits']];

// ---------- charts ----------
const LOG_TICKS = (lo, hi) => { const t = []; for (let p = Math.ceil(Math.log10(lo)); 10 ** p <= hi; p++) t.push(10 ** p); return t; };
// One mark per original estimate (origin). The representative finding is the original publisher's when it is in the atlas.
function originGroups(list) {
  const groups = new Map();
  for (const f of list) { if (!groups.has(f.origin)) groups.set(f.origin, []); groups.get(f.origin).push(f); }
  return [...groups.values()].map((fs) => {
    const own = fs.find((f) => !/^(Cites|Repeats)\b/.test(f.statement)) ?? fs[0];
    return { rep: own, members: fs };
  });
}
const tableView = (m, id, caption, rows) => `<details class="rp-tv" data-table="${esc(id)}"><summary>Table of the ${plural(rows.length, 'mark')} in this chart</summary><div class="scroll"><table class="rp-t"><caption class="sr">${esc(caption)}</caption><thead><tr><th scope="col">Estimate</th><th scope="col">Value as stated</th><th scope="col">Year</th><th scope="col">Kind</th><th scope="col">Appears in</th></tr></thead><tbody>${rows.map(({ rep, members, label }) => `<tr data-f="${esc(rep.id)}"><td>${esc(label)}</td><td>${fLink(m, rep, esc(valueText(rep)), 'tv-v')}</td><td>${esc(rep.target_year ?? '')}</td><td>${esc(m.atlas.vocabulary.kinds[rep.kind])}${rep.scenario ? ` · ${esc(rep.scenario)}` : ''}</td><td>${members.map((f) => fLink(m, f, esc(m.shortPub(m.reports.get(f.report))))).join(', ')}</td></tr>`).join('')}</tbody></table></div></details>`;

// A year × log-value scatter. `colour(f)` gives [key, label]; marks for a range are a vertical bar; open bounds get an arrow.
function horizonChart(m, { id, title, metrics, years, domain, usd = false, colour, unitLabel, note, wide = false }) {
  const list = m.atlas.findings.filter((f) => metrics.includes(f.metric) && verified(f) && f.target_year && (isNum(f.value) || isNum(f.min)));
  const groups = originGroups(list);
  const W0 = 720, H0 = 330, L = 64, R = 92, T = 18, B = 40;
  const sx = (y) => L + ((y - years[0]) / (years[1] - years[0])) * (W0 - L - R);
  const ly = [Math.log10(domain[0]), Math.log10(domain[1])];
  const sy = (v) => T + (1 - (Math.log10(v) - ly[0]) / (ly[1] - ly[0])) * (H0 - T - B);
  // Marks sharing a year are set side by side, in a fixed estimator order, so none hides another.
  const order = (g) => ESTIMATORS.findIndex((e) => e[0] === colour(g.rep)[0]);
  const byYear = new Map();
  for (const g of groups.sort((a, z) => a.rep.target_year - z.rep.target_year || order(a) - order(z) || (a.rep.value ?? a.rep.max) - (z.rep.value ?? z.rep.max))) { (byYear.get(g.rep.target_year) ?? byYear.set(g.rep.target_year, []).get(g.rep.target_year)).push(g); }
  const xTicks = []; for (let y = Math.ceil(years[0] / 5) * 5; y <= years[1]; y += 5) xTicks.push(y);
  const grid = LOG_TICKS(domain[0], domain[1]).map((v) => `<line class="gr" x1="${L}" x2="${W0 - R}" y1="${sy(v)}" y2="${sy(v)}"/><text class="ax" x="${L - 8}" y="${sy(v) + 4}" text-anchor="end">${esc(compact(v, usd))}</text>`).join('')
    + xTicks.map((y) => `<text class="ax" x="${sx(y)}" y="${H0 - B + 20}" text-anchor="middle">${y}</text>`).join('')
    + `<line class="base" x1="${L}" x2="${W0 - R}" y1="${H0 - B}" y2="${H0 - B}"/>`;
  // First pass: positions and shapes. Second pass: each label goes where it overlaps no mark and no other label.
  const items = [];
  for (const gs of byYear.values()) {
    gs.forEach((g, i) => {
      const f = g.rep;
      const x = sx(f.target_year) + (i - (gs.length - 1) / 2) * 16;
      const [ck] = colour(f);
      const cls = `mk-s e-${ck}`;
      const shape = KIND_SHAPE[f.kind] ?? 'circle';
      let svg = '';
      let ly0, top, bot;
      if (isNum(f.min) && isNum(f.max)) {
        const y1 = sy(f.max), y2 = sy(f.min);
        // A spread of other publishers' forecasts is a dashed whisker, not a bar: it is not an estimate.
        svg += f.qualifier === 'span of published forecasts'
          ? `<path class="span e-${ck}" d="M${x} ${y1}V${y2}"/><path class="cap e-${ck}" d="M${x - 6} ${y1}H${x + 6}M${x - 6} ${y2}H${x + 6}"/>`
          : `<rect class="${cls} rng" x="${x - 4}" y="${y1}" width="8" height="${Math.max(8, y2 - y1)}" rx="4"/>`;
        ly0 = (y1 + y2) / 2; top = y1; bot = Math.max(y2, y1 + 8);
      } else {
        ly0 = sy(f.value); top = ly0 - 7; bot = ly0 + 7;
        svg += shapeSvg(shape, x, ly0, cls);
      }
      if (f.qualifier === 'more than') { svg += `<path class="bound e-${ck}" d="M${x} ${ly0 - 9}V${ly0 - 22}M${x - 4} ${ly0 - 18}L${x} ${ly0 - 22}L${x + 4} ${ly0 - 18}"/>`; top = ly0 - 23; }
      if (f.qualifier === 'below' || f.qualifier === 'up to') { svg += `<path class="bound e-${ck}" d="M${x} ${ly0 + 9}V${ly0 + 22}M${x - 4} ${ly0 + 18}L${x} ${ly0 + 22}L${x + 4} ${ly0 + 18}"/>`; bot = ly0 + 23; }
      const n = g.members.length;
      const lab = `${f.qualifier === 'more than' ? '>' : f.qualifier === 'below' ? '<' : f.qualifier === 'about' ? '~' : f.qualifier === 'up to' ? '≤' : ''}${isNum(f.min) ? `${compact(f.min, usd)}–${compact(f.max, usd)}` : compact(f.value, usd)}${n > 1 ? ` ×${n}` : ''}`;
      g.label = `${colour(f)[1]}${f.scenario ? ` (${f.scenario})` : ''}`;
      items.push({ f, g, x, ly0, svg, lab, box: [x - 7, top, x + 7, bot] });
    });
  }
  const placed = items.map((it) => it.box);
  const hits = (b) => b[0] < L - 2 || b[2] > W0 - 2 || b[1] < T || b[3] > H0 - B || placed.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  const marks = items.map((it) => {
    const w = it.lab.length * 7 + 2;
    let pos = null;
    for (const dy of [0, 13, -13, 26, -26, 39, -39]) {
      for (const side of ['r', 'l']) {
        const x0 = side === 'r' ? it.x + 10 : it.x - 10 - w;
        const b = [x0, it.ly0 + dy - 8, x0 + w, it.ly0 + dy + 6];
        if (!hits(b)) { pos = { side, dy, b }; break; }
      }
      if (pos) break;
    }
    pos ??= { side: 'r', dy: 0, b: [it.x + 10, it.ly0 - 8, it.x + 10 + w, it.ly0 + 6] };
    placed.push(pos.b);
    const tx = pos.side === 'r' ? it.x + 10 : it.x - 10;
    const lead = pos.dy ? `<path class="lead" d="M${pos.side === 'r' ? it.x + 6 : it.x - 6} ${it.ly0}L${tx} ${it.ly0 + pos.dy}"/>` : '';
    const f = it.f;
    const n = it.g.members.length;
    const aria = `${it.g.label}, ${f.target_year}: ${valueText(f)}${n > 1 ? `, appears in ${n} reports` : ''}. Open the finding passport.`;
    return `<a class="mk" href="${reportPath(m.reports.get(f.report))}#f-${esc(f.id)}" data-f="${esc(f.id)}" aria-label="${esc(aria)}"><circle class="hit" cx="${it.x}" cy="${it.ly0}" r="15"/>${it.svg}${lead}<text class="ml" x="${tx}" y="${it.ly0 + pos.dy + 4}" text-anchor="${pos.side === 'r' ? 'start' : 'end'}">${esc(it.lab)}</text></a>`;
  });
  const used = [...new Map(groups.map((g) => [colour(g.rep)[0], colour(g.rep)[1]])).entries()];
  const kinds = [...new Set(groups.map((g) => g.rep.kind))];
  const legend = `<div class="legend rp-legend">${used.map(([k, l]) => `<span><i class="sw e-${k}"></i>${esc(l)}</span>`).join('')}${kinds.map((k) => `<span>${keyGlyph(KIND_SHAPE[k] ?? 'circle')}${esc(m.atlas.vocabulary.kinds[k])}</span>`).join('')}${groups.some((g) => isNum(g.rep.min)) ? '<span><i class="sw rngk"></i>Range as stated</span>' : ''}</div>`;
  const svg = `<div class="rp-chart-scroll"><svg class="rp-svg" viewBox="0 0 ${W0} ${H0}" role="group" aria-label="${esc(title)}: ${groups.length} marks, logarithmic scale in ${esc(unitLabel)}" data-chart="${esc(id)}">${grid}<text class="ax unit" x="${L}" y="${T - 4}">${esc(unitLabel)} · log scale</text>${marks.join('')}</svg></div>`;
  return `<figure class="rp-fig${wide ? ' wide' : ''}" id="${esc(id)}"><figcaption><b>${esc(title)}</b>${note ? ` <span>${esc(note)}</span>` : ''}</figcaption>${legend}${svg}${tableView(m, id, title, groups)}</figure>`;
}

// Percentages with their own denominators: one bar per finding, each track labelled with what it is a share of.
function shareBars(m, ids, { id, title, note }) {
  const fs = ids.map((x) => m.findings.get(x)).filter(Boolean);
  const rows = fs.map((f) => {
    const v = isNum(f.value) ? f.value : f.max;
    const drawn = verified(f) && isNum(v);
    const lo = isNum(f.min) ? f.min : null;
    return `<li class="sb${drawn ? '' : ' undrawn'}" data-f="${esc(f.id)}">
<a class="sb-l" href="${reportPath(m.reports.get(f.report))}#f-${esc(f.id)}" data-f="${esc(f.id)}"><b>${esc(valueText(f) || 'No figure')}</b> <span>${esc(f.stage ?? m.atlas.vocabulary.metrics[f.metric])}</span></a>
<span class="sb-track" aria-hidden="true">${drawn ? `${lo !== null ? `<i class="sb-bar rng" style="left:${lo}%;width:${v - lo}%"></i>` : `<i class="sb-bar${f.qualifier === 'more than' ? ' open' : ''}" style="width:${v}%"></i>`}` : '<i class="sb-none">not drawn: not checked against the original</i>'}</span>
<span class="sb-d">Of ${esc(lc(f.denominator ?? 'the stated base'))} · ${esc(m.shortPub(m.reports.get(f.report)))}${f.appears_in.length > 1 ? ` · in ${f.appears_in.length} reports` : ''}</span></li>`;
  }).join('');
  return `<figure class="rp-fig rp-bars" id="${esc(id)}" data-chart="${esc(id)}"><figcaption><b>${esc(title)}</b>${note ? ` <span>${esc(note)}</span>` : ''}</figcaption><ol class="sbl">${rows}</ol></figure>`;
}

// An exhaustive stack in one denominator: parts that add up to 100% (or to the stated subtotal) and nothing else.
function stack(m, fid, { title }) {
  const f = m.findings.get(fid);
  if (!f?.parts) return '';
  const total = f.parts_total ?? 100;
  const scale = f.parts_total && isNum(f.value) ? f.value : total;
  const usd = Boolean(f.parts_total);
  const val = (v) => (usd ? `US$${Number(v).toLocaleString('en-GB')}` : `${v}%`);
  const seg = f.parts.map(([label, v], i) => `<i class="st-${i % 8}" style="width:${(v / scale) * 100}%" title="${esc(label)}: ${esc(val(v))}">${(v / scale) * 320 >= val(v).length * 7.5 + 14 ? `<span>${esc(val(v))}</span>` : ''}</i>`).join('');
  const rest = f.parts_total && isNum(f.value) ? `<i class="st-rest" style="width:${((scale - total) / scale) * 100}%" title="R&amp;D and margins, not itemised"></i>` : '';
  const list = f.parts.map(([label, v], i) => `<li><i class="st-${i % 8}" aria-hidden="true"></i><span>${esc(label)}</span><b>${esc(val(v))}</b></li>`).join('')
    + (rest ? `<li><i class="st-rest" aria-hidden="true"></i><span>Rest of the ~US$${Number(f.value).toLocaleString('en-GB')} price: R&amp;D and margins, not itemised</span><b>not itemised</b></li>` : '');
  return `<figure class="rp-fig rp-stack" id="stack-${esc(f.id)}" data-chart="stack-${esc(f.id)}"><figcaption><b>${esc(title)}</b> <span>${esc(f.parts_check)}</span></figcaption><div class="stk" aria-hidden="true">${seg}${rest}</div><ol class="stk-list">${list}</ol><p class="rp-src">${fLink(m, f, `${esc(m.shortPub(m.reports.get(f.report)))} · ${esc(f.unit)}${f.target_year ? ` · ${f.target_year}` : ''} · passport`)}</p></figure>`;
}

// Small figure cards for values that do not share a unit or a period.
function cards(m, ids, { id, title, note }) {
  const fs = ids.map((x) => m.findings.get(x)).filter(Boolean);
  return `<figure class="rp-fig" id="${esc(id)}" data-chart="${esc(id)}"><figcaption><b>${esc(title)}</b>${note ? ` <span>${esc(note)}</span>` : ''}</figcaption><ul class="rp-cards">${fs.map((f) => `<li data-f="${esc(f.id)}" class="${verified(f) ? '' : 'undrawn'}"><a href="${reportPath(m.reports.get(f.report))}#f-${esc(f.id)}" data-f="${esc(f.id)}">${valueText(f) ? `<span class="cv">${esc(valueText(f))}</span>` : ''}<span class="cm">${esc(m.atlas.vocabulary.metrics[f.metric])}</span><span class="cs">${esc(f.statement)}</span><span class="cr">${esc(m.shortPub(m.reports.get(f.report)))}${f.target_year ? ` · ${f.target_year}` : ''}${f.history ? ` · from ${esc(compact(f.history.value, /USD/.test(f.unit ?? '')))}${/%/.test(f.unit ?? '') ? '%' : ''} in ${f.history.year}` : ''} · ${badge(f)}</span></a></li>`).join('')}</ul></figure>`;
}

// Labelled comparisons that a report makes itself (China against the US, robot against worker): one bar per point.
function pointBars(m, fid, { usd = false } = {}) {
  const f = m.findings.get(fid);
  if (!f?.points) return '';
  const max = Math.max(...f.points.map((p) => (isNum(p.of) ? p.value / p.of : p.value)));
  return `<figure class="rp-fig rp-pts" id="pts-${esc(f.id)}" data-chart="pts-${esc(f.id)}"><figcaption><b>${esc(m.atlas.vocabulary.metrics[f.metric])}</b> <span>${esc(f.statement)}</span></figcaption><ul class="ptl">${f.points.map((p) => {
    const share = isNum(p.of) ? p.value / p.of : p.value;
    return `<li><span class="pt-l">${esc(p.label)}</span><span class="pt-t" aria-hidden="true"><i style="width:${(share / max) * 100}%"></i></span><span class="pt-v">${esc(isNum(p.of) ? `${p.value} of ${p.of}` : usd ? `US$${Number(p.value).toLocaleString('en-GB')}` : Number(p.value).toLocaleString('en-GB'))}</span></li>`;
  }).join('')}</ul><p class="rp-src">${fLink(m, f, `${esc(m.shortPub(m.reports.get(f.report)))} · ${esc(f.unit ?? '')} · passport`)}</p></figure>`;
}

// Constraint × report: which report names which constraint. Rows in vocabulary order; a mention is not a ranking.
function constraintMatrix(m) {
  const fs = m.atlas.findings.filter((f) => f.metric === 'constraint');
  const reps = m.atlas.reports;
  const rows = Object.entries(m.atlas.vocabulary.constraints).map(([k, label]) => `<tr><th scope="row">${esc(label)}</th>${reps.map((r) => {
    const hit = fs.filter((f) => f.report === r.id && (f.constraint === k || (f.constraints_also ?? []).includes(k))).sort((a, z) => Number(verified(z)) - Number(verified(a)));
    if (!hit.length) return '<td><span class="sr">Not named</span></td>';
    const f = hit[0];
    return `<td><a class="cx ${verified(f) ? 'on' : 'pend'}" href="${reportPath(r)}#f-${esc(f.id)}" data-f="${esc(f.id)}" title="${esc(f.statement)}"><span class="sr">${esc(r.short)}: ${esc(f.statement)} (${esc(m.atlas.vocabulary.check_states[f.check.status])})</span></a></td>`;
  }).join('')}</tr>`).join('');
  return `<figure class="rp-fig" id="constraints" data-chart="constraints"><figcaption><b>Constraints named, by report</b> <span>Mentions, not a ranking: a filled mark is a mention checked against the original; an open mark is pending or unreachable. A report that lists several constraints has a mark on each. Rows keep a fixed order.</span></figcaption><div class="scroll rp-mx-wrap"><table class="rp-mx"><thead><tr><th scope="col"><span class="sr">Constraint</span></th>${reps.map((r) => `<th scope="col"><a href="${reportPath(r)}" title="${esc(r.title)}">${esc(m.shortPub(r))}</a></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></figure>`;
}

// A timeline of years when a share of work becomes cost-competitive, per scenario: one row per mark, on a shared axis.
const lc = (t) => (/^[A-Z]{2}/.test(t ?? '') ? t : String(t ?? '').charAt(0).toLowerCase() + String(t ?? '').slice(1));
function timeline(m, ids) {
  const fs = ids.map((x) => m.findings.get(x)).filter((f) => f && verified(f)).sort((a, z) => a.target_year - z.target_year);
  const y0 = 2026, y1 = 2090;
  const pos = (y) => ((y - y0) / (y1 - y0)) * 100;
  return `<figure class="rp-fig rp-tl" id="cost-competitive" data-chart="cost-competitive"><figcaption><b>When work becomes cost-competitive</b> <span>Scenarios from one report (Anthropic). Each mark is a share of a stated base reached in a year under a stated scenario, not a forecast of jobs.</span></figcaption><ol class="tl">${fs.map((f) => `<li><a href="${reportPath(m.reports.get(f.report))}#f-${esc(f.id)}" data-f="${esc(f.id)}"><b>${esc(valueText(f))} of ${esc(lc(f.denominator))} by ${f.target_year}</b><span>${esc(f.scenario ?? '')}</span></a><span class="tl-track" aria-hidden="true"><i style="left:${pos(f.target_year)}%"></i></span></li>`).join('')}<li class="tl-axis" aria-hidden="true"><span></span><span class="tl-track">${[2026, 2050, 2070, 2090].map((y) => `<em style="left:${pos(y)}%">${y}</em>`).join('')}</span></li></ol></figure>`;
}

// ---------- the pieces of the page ----------
const STATE_GLYPH = { quantitative: 'q', qualitative: 'l', pending: 'p', unreachable: 'u', not_extracted: 'x', not_covered: 'n' };
function coverageMatrix(m) {
  const { atlas } = m;
  const themes = atlas.vocabulary.themes;
  const head = `<tr><th scope="col" class="nm">Report</th>${themes.map((t) => `<th scope="col"><a href="#theme-${t.key}">${esc(t.label)}</a></th>`).join('')}<th scope="col" class="nm">Findings</th></tr>`;
  const body = atlas.coverage.map((c) => {
    const r = m.reports.get(c.report);
    const fs = m.byReport(r.id);
    return `<tr data-report="${esc(r.id)}"><th scope="row"><a href="${reportPath(r)}">${esc(m.shortPub(r))}</a><span>${esc(r.title)} · ${esc(String(r.published).slice(0, 4))}</span></th>${themes.map((t) => {
      const st = c.themes[t.key];
      const n = fs.filter((f) => f.theme === t.key).length;
      const label = `${r.short}, ${t.label}: ${atlas.vocabulary.coverage_states[st]}${n ? `, ${plural(n, 'finding')}` : ''}`;
      return `<td class="cv-${STATE_GLYPH[st]}">${n ? `<a href="${reportPath(r)}#t-${t.key}" data-report="${esc(r.id)}" data-theme="${t.key}" aria-label="${esc(label)}"><i aria-hidden="true"></i><b>${n}</b></a>` : `<span aria-label="${esc(label)}" role="img"><i aria-hidden="true"></i></span>`}</td>`;
    }).join('')}<td class="tot">${fs.length}<span> · ${fs.filter(verified).length} checked</span></td></tr>`;
  }).join('');
  const key = Object.entries(atlas.vocabulary.coverage_states).map(([k, l]) => `<span class="cv-${STATE_GLYPH[k]}"><i aria-hidden="true"></i>${esc(l)}</span>`).join('');
  return `<section class="atlas-sec" id="coverage" aria-labelledby="coverage-h">
<div class="sec-h"><p class="eyebrow">1 · Coverage</p><h2 id="coverage-h">Which report speaks to which question</h2><p>Each cell is a report and a theme. Its state comes from our first reading of each report and from the findings checked so far; the number is how many findings the cell holds. Select a cell to see them.</p></div>
<div class="rp-key">${key}</div>
<div class="scroll rp-cov-wrap"><table class="rp-cov"><thead>${head}</thead><tbody>${body}</tbody></table></div>
</section>`;
}

const LEAD = {
  market: ['bofa-ship-2035', 'gs-ship-2035'],
  work: ['anth-tasks-74', 'anth-costcomp-03'],
  costs: ['bofa-bom-china-2025', 'gs-bom-2023'],
  adoption: ['capg-engaging', 'capg-deploying'],
  investment: ['bofa-invest', 'capg-vc-2025'],
  risks: ['anth-r-capability'],
  regions: ['nexery-china-vendors', 'barclays-china-models'],
};
function themeCards(m) {
  return `<ul class="rp-themes">${m.atlas.vocabulary.themes.map((t) => {
    const fs = m.atlas.findings.filter((f) => f.theme === t.key);
    const reps = new Set(fs.map((f) => f.report));
    const lead = (LEAD[t.key] ?? []).map((id) => m.findings.get(id)).filter(Boolean);
    return `<li><a href="#theme-${t.key}" data-theme="${t.key}"><span class="th-l">${esc(t.label)}</span><span class="th-q">${esc(t.question)}</span><span class="th-v">${lead.map((f) => `<span><b>${esc(valueText(f) || f.statement.split(/[:;,.]/)[0])}</b> ${esc(f.metric === 'constraint' ? '' : (f.denominator ? `of ${f.denominator}` : m.atlas.vocabulary.metrics[f.metric].replace(/ \(.*\)$/, '').toLowerCase()))}${f.target_year ? `, ${f.target_year}` : ''} · ${esc(m.shortPub(m.reports.get(f.report)))}</span>`).join('')}</span><span class="th-n">${plural(fs.length, 'finding')} · ${plural(reps.size, 'report')} · ${fs.filter(verified).length} checked</span></a></li>`;
  }).join('')}</ul>`;
}

function synthesisHtml(m, key) {
  const s = SYNTHESIS[key];
  return `<div class="rp-syn">${SYN_LABEL.map(([k, l]) => `<div class="syn-${k}"><h4>${esc(l)}</h4><p>${refs(m, s[k])}</p></div>`).join('')}</div>`;
}

// The findings of a theme that are not drawn above (qualitative, pending, unreachable, withheld): a compact list.
function themeList(m, key, drawnIds) {
  const fs = m.atlas.findings.filter((f) => f.theme === key && !drawnIds.has(f.id));
  if (!fs.length) return '';
  return `<details class="rp-more"><summary>${plural(fs.length, 'more finding')} in this theme, listed rather than drawn</summary><ul class="rp-fl">${fs.map((f) => `<li data-f="${esc(f.id)}">${badge(f)} ${fLink(m, f, esc(f.statement), 'fl-s')} <span class="dim">${esc(m.shortPub(m.reports.get(f.report)))}</span></li>`).join('')}</ul></details>`;
}

const estColour = (f) => { const e = estimatorOf(f); return [e[0], e[1]]; };
const COST_KIND = { production_cost: ['c1', 'Production cost'], bom: ['c2', 'Bill of materials'], selling_price: ['c3', 'Selling price'], list_price: ['c4', 'List price'] };
function themeSection(m, t, i) {
  const figs = [];
  if (t.key === 'market') {
    figs.push(horizonChart(m, { id: 'chart-shipments', title: 'Annual shipments: a flow', metrics: ['shipments_annual'], years: [2023, 2041], domain: [1e4, 1e8], colour: estColour, unitLabel: 'Units a year', note: 'One mark per original estimate; ×n means it appears in n reports. A bar is a range as stated; BCG’s is the spread of other publishers’ forecasts.' }));
    figs.push(horizonChart(m, { id: 'chart-installed', title: 'Installed base: a stock', metrics: ['installed_base'], years: [2024, 2061], domain: [1e4, 1e10], colour: estColour, unitLabel: 'Units in operation', note: 'Robots in use at a date. Not comparable with shipments.' }));
    figs.push(horizonChart(m, { id: 'chart-revenue', title: 'Humanoid robot market: revenue a year', metrics: ['market_revenue'], years: [2023, 2041], domain: [1e8, 1e12], usd: true, colour: estColour, unitLabel: 'US$ a year, as stated', note: 'Robot sales only. Scenarios are marked apart from base cases.' }));
    figs.push(cards(m, ['capg-physical-gdp', 'fayd-ms-ecosystem-2050', 'fayd-industrial-robots'], { id: 'cards-opportunity', title: 'Not robot sales', note: 'Wider measures, kept off the revenue chart: economic activity robots could address, an ecosystem with services, and industrial robots for context.' }));
  } else if (t.key === 'work') {
    figs.push(shareBars(m, ['anth-tasks-74', 'anth-hours-34', 'anth-exposed-80'], { id: 'bars-technical', title: 'Technical exposure: what robots could do', note: 'Shares of different bases. Capability in some setting, not automation.' }));
    figs.push(shareBars(m, ['anth-costcomp-03', 'nexery-theoretical-60', 'nexery-cases-40', 'gs-roles'], { id: 'bars-economic', title: 'Economic and theoretical potential', note: 'Cost-competitive today, theoretical over a decade, project cases and a scenario for a subset of roles. Four different denominators.' }));
    figs.push(shareBars(m, ['capg-shortage-74', 'nexery-jobloss-36', 'barclays-genz'], { id: 'bars-surveys-work', title: 'What respondents say', note: 'Survey answers, shares of each survey’s respondents.' }));
    figs.push(cards(m, ['anth-workers-300k', 'anth-workers-28m', 'fayd-openings', 'barclays-output'], { id: 'cards-workers', title: 'People and output', note: 'Counts of workers and openings, and an illustrative output model. Not counts of jobs lost.' }));
    figs.push(timeline(m, ['anth-ten-40y', 'anth-half-2050', 'anth-half-2085']));
  } else if (t.key === 'costs') {
    figs.push(horizonChart(m, { id: 'chart-costs', title: 'Cost and price per unit, by year', metrics: ['production_cost', 'bom', 'selling_price', 'list_price'], years: [2022, 2036], domain: [1e3, 1e6], usd: true, colour: (f) => COST_KIND[f.metric], unitLabel: 'US$ per unit, as stated', wide: true, note: 'Colour is the measure, not the publisher: bill of materials, production cost, selling price and list price are different things.' }));
    figs.push(`<div class="rp-stacks">${stack(m, 'bofa-bom-shares-2030', { title: 'BofA Global Research: 2030 bill of materials by module' })}${stack(m, 'barclays-three-bs', { title: 'Barclays: production cost by the “three Bs”' })}${stack(m, 'nexery-price-stack', { title: 'NEXERY: what is inside a ~US$55,000 selling price' })}</div>`);
    figs.push(pointBars(m, 'fayd-cost-hour', { usd: true }) + cards(m, ['fayd-wage', 'anth-packers', 'fayd-actuation', 'bluebay-actuators'], { id: 'cards-running', title: 'Running costs and the cost of labour', note: 'A model per productive hour, a wage per paid hour and an annual comparison: different denominators, set side by side as each report does.' }));
  } else if (t.key === 'adoption') {
    figs.push(shareBars(m, ['capg-engaging', 'capg-deploying', 'capg-scale5', 'capg-hum-invest', 'capg-hum-2030', 'capg-hum-scale', 'capg-hum-viable'], { id: 'bars-capgemini', title: 'Capgemini survey: 1,678 organisations', note: 'Answers about plans and expectations, not realised adoption.' }));
    figs.push(shareBars(m, ['nexery-plan', 'nexery-pilot'], { id: 'bars-nexery', title: 'NEXERY survey: 152 industry participants', note: 'Answers about plans, not realised adoption.' }));
    figs.push(stack(m, 'bofa-sectors-2027', { title: 'Counterpoint Research forecast: humanoid installations by sector, 2027' }));
    figs.push(cards(m, ['anth-capability-growth'], { id: 'cards-capability', title: 'Capability over time', note: 'An observed trend in what robots can do, not adoption.' }));
  } else if (t.key === 'investment') {
    figs.push(cards(m, ['bofa-invest', 'barclays-vc-q2', 'capg-vc-2025'], { id: 'cards-flows', title: 'Funding flows', note: 'Different scopes and periods (a year of humanoid investment, a quarter and a year of robotics venture capital): not on one axis.' }));
    figs.push(cards(m, ['pham-share', 'pham-seed'], { id: 'cards-shares', title: 'Shares of venture funding', note: 'Shares of the money one study traced.' }));
    figs.push(cards(m, ['barclays-figure-valuation'], { id: 'cards-valuation', title: 'Valuation', note: 'A price set in a funding round, not money raised.' }));
    figs.push(cards(m, ['barclays-europe-actuators', 'bluebay-screws-24', 'bluebay-beneficiaries'], { id: 'cards-chain', title: 'Value chain', note: 'Trade and market sizes for components, and named beneficiaries. Not evidence of who supplies humanoid makers.' }));
  } else if (t.key === 'risks') {
    figs.push(constraintMatrix(m));
  } else if (t.key === 'regions') {
    figs.push(cards(m, ['nexery-china-vendors', 'barclays-china-models', 'capg-china', 'fayd-china-products'], { id: 'cards-china', title: 'China’s share and scale', note: 'Each with its own base and date.' }));
    figs.push(`<div class="rp-stacks">${pointBars(m, 'pham-unicorns')}${pointBars(m, 'pham-models')}${pointBars(m, 'bluebay-patents')}</div>`);
  }
  const html = figs.join('');
  const drawn = new Set([...html.matchAll(/data-f="([a-z0-9-]+)"/g)].map((x) => x[1]));
  const fs = m.atlas.findings.filter((f) => f.theme === t.key);
  return `<section class="atlas-sec rp-theme" id="theme-${t.key}" aria-labelledby="theme-${t.key}-h" data-theme="${t.key}">
<div class="sec-h"><p class="eyebrow">2.${i + 1} · ${esc(t.label)} · ${plural(fs.length, 'finding')} from ${plural(new Set(fs.map((f) => f.report)).size, 'report')}</p><h2 id="theme-${t.key}-h">${esc(t.question)}</h2></div>
${synthesisHtml(m, t.key)}
<div class="rp-figs">${html}</div>
${themeList(m, t.key, drawn)}
</section>`;
}

function findingsTable(m) {
  const { atlas } = m;
  const opt = (v, l, n) => `<option value="${esc(v)}">${esc(l)} (${n})</option>`;
  const cnt = (p) => atlas.findings.filter(p).length;
  const themes = [...atlas.vocabulary.themes, { key: 'headline', label: 'Headline conclusions' }];
  const rows = atlas.findings.map((f) => {
    const r = m.reports.get(f.report);
    const th = themes.find((t) => t.key === f.theme);
    const years = [f.target_year ? `${f.target_year}` : null].filter(Boolean).join('');
    return `<tr id="row-${esc(f.id)}" data-f="${esc(f.id)}" data-theme="${f.theme}" data-report="${r.id}" data-check="${f.check.status}" data-kind="${f.kind}"><td class="ft-s"><a href="${reportPath(r)}#f-${esc(f.id)}" data-f="${esc(f.id)}">${esc(f.statement)}</a></td><td class="ft-v">${esc(valueText(f))}</td><td>${esc(th.label)}<br><span class="dim">${esc(atlas.vocabulary.kinds[f.kind])}</span></td><td><a href="${reportPath(r)}">${esc(m.shortPub(r))}</a>${f.appears_in.length > 1 ? `<br><span class="dim">in ${f.appears_in.length} reports</span>` : ''}</td><td>${esc(years)}</td><td>${badge(f)}</td></tr>`;
  }).join('');
  return `<section class="atlas-sec" id="findings" aria-labelledby="findings-h">
<div class="sec-h"><p class="eyebrow">3 · Every finding</p><h2 id="findings-h">All ${atlas.findings.length} findings</h2><p>The table behind every chart. Each finding has a passport: wording, report, original attribution, page, unit, denominator, geography, years, scenario, assumptions, check.</p></div>
<form class="rp-filters" id="rp-filters" hidden aria-label="Filter the findings">
<label><span class="fl">Theme</span><select name="theme"><option value="">All themes</option>${themes.map((t) => opt(t.key, t.label, cnt((f) => f.theme === t.key))).join('')}</select></label>
<label><span class="fl">Report</span><select name="report"><option value="">All reports</option>${atlas.reports.map((r) => opt(r.id, r.short, cnt((f) => f.report === r.id))).join('')}</select></label>
<label><span class="fl">Check</span><select name="check"><option value="">Any state</option>${Object.entries(atlas.vocabulary.check_states).map(([k, l]) => opt(k, l, cnt((f) => f.check.status === k))).join('')}</select></label>
<label><span class="fl">Kind</span><select name="kind"><option value="">Any kind</option>${Object.entries(atlas.vocabulary.kinds).map(([k, l]) => opt(k, l, cnt((f) => f.kind === k))).filter((x) => !/\(0\)/.test(x)).join('')}</select></label>
<button type="reset" class="rp-reset">Clear</button>
<p class="rp-count" id="rp-count" aria-live="polite"></p>
</form>
<div class="scroll rp-ft-wrap"><table class="rp-ft"><caption class="sr">All findings with value, theme, report, year and check state</caption><thead><tr><th scope="col">Finding</th><th scope="col">Value as stated</th><th scope="col">Theme and kind</th><th scope="col">Report</th><th scope="col">Year</th><th scope="col">Check</th></tr></thead><tbody>${rows}</tbody></table></div>
</section>`;
}

function reportCards(m) {
  return `<section class="atlas-sec" id="reports" aria-labelledby="reports-h">
<div class="sec-h"><p class="eyebrow">4 · The reports</p><h2 id="reports-h">${m.atlas.reports.length} report editions</h2><p>Scope, method, access and every finding, on one page per report. Why Humanoid? links to each publisher’s original and does not host the reports.</p></div>
<ul class="rp-reports">${m.atlas.reports.map((r) => {
    const fs = m.byReport(r.id);
    const head = fs.find((f) => f.theme === 'headline');
    return `<li><a href="${reportPath(r)}"><span class="rr-p">${esc(r.publisher)} · ${esc(dateText(r.published))}</span><span class="rr-t">${esc(r.title)}</span>${head ? `<span class="rr-h">${esc(head.statement)}</span>` : ''}<span class="rr-n">${plural(fs.length, 'finding')} · ${fs.filter(verified).length} checked${r.check.status === 'pending_unreachable' ? ' · original not reachable for review' : ''}</span></a></li>`;
  }).join('')}<li><a href="/reports/deployment-records/"><span class="rr-p">Why Humanoid? analysis</span><span class="rr-t">Robot deployment records</span><span class="rr-h">Deployment records by status as recorded, sector, country and year, from the Why Humanoid? database.</span><span class="rr-n">Our own analysis</span></a></li></ul>
</section>`;
}

function methodSection(m) {
  const n = m.atlas.counts;
  return `<section class="atlas-sec" id="method" aria-labelledby="method-h">
<div class="sec-h"><p class="eyebrow">5 · Method</p><h2 id="method-h">How the findings were built and checked</h2></div>
<ul class="fine rp-method">
<li><b>Source.</b> Our research on ${n.reports} report editions with their main conclusions, extracted automatically and marked for review. Each finding quotes the note it comes from.</li>
<li><b>Check.</b> ${n.reports_checked} originals were opened; ${n.findings_checked} findings were found on the page cited, with a phrase of at most 30 words recorded as proof. ${n.findings_pending} are extracted but not yet checked, ${n.findings_unreachable} come from ${plural(n.reports_unreachable, 'original')} that could not be reached, and ${n.findings_withheld} is withheld because its extraction is ambiguous. Only checked findings are drawn.</li>
<li><b>Repeats.</b> A figure cited by several reports is one original estimate, drawn once: ${n.findings} findings hold ${n.original_estimates} original estimates, ${n.repeated_estimates} of them repeated across reports.</li>
<li><b>Units.</b> Values keep the unit, currency, qualifier, geography, scope, denominator and year the report gives. Nothing is converted, averaged, interpolated or extended to a common year. A spread across publishers is dispersion, not a confidence interval.</li>
<li><b>Measures kept apart.</b> Annual shipments and installed base; robot revenue and wider opportunities; technical exposure, economic competitiveness and survey answers; bill of materials, production cost, selling price and cost per hour; funding flows and valuations. Parts are stacked only when they add up to the stated total in one denominator.</li>
<li><b>Mentions.</b> A constraint named by several reports is not ranked by its mentions, and a supplier named in a report is not evidence of supply.</li>
<li><b>What this is not.</b> Findings are the reports’ claims as stated, not facts verified by Why Humanoid?. Read each report for its full argument.</li>
</ul>
<p class="prov">Data as of ${esc(dateText(String(m.atlas.snapshot.exported_at).slice(0, 10)))}; findings checked on ${esc(dateText(m.atlas.findings.find(verified)?.check.checked_on))}.</p>
</section>`;
}

// ---------- /reports/ ----------
export function renderReportsAtlas(atlas, c) {
  const m = reportsModel(atlas);
  const n = atlas.counts;
  return `<header class="atlas-head rp-head">
<p class="kicker">Category ${c.index} of ${c.total} · Reports${c.badge ?? ''}</p>
<h1>Research Conclusions Atlas</h1>
<p class="lede">${esc(atlas.question)}</p>
<p class="ask">${n.reports} research reports on humanoid robots and physical AI, read claim by claim: what they forecast, where they agree, where they part, and which assumptions and definitions move the numbers.</p>
<dl class="atlas-counts rp-counts">
<div><dt>Report editions</dt><dd>${n.reports}</dd></div>
<div><dt>Findings</dt><dd>${n.findings}</dd></div>
<div><dt>Checked against the original</dt><dd>${n.findings_checked}</dd></div>
<div><dt>Original estimates</dt><dd>${n.original_estimates}</dd></div>
</dl>
<p class="prov">${n.reports_checked} of ${n.reports} originals checked page by page; ${plural(n.reports_unreachable, 'original')} could not be reached. ${n.repeated_estimates} estimates are repeated across reports and drawn once. Findings are the reports’ claims as stated, not facts verified by Why Humanoid?.</p>
<nav class="views" aria-label="Atlas views"><a href="#coverage">Coverage</a><a href="#themes">Themes</a><a href="#findings">All findings</a><a href="#reports">Reports</a><a href="#method">Method</a></nav>
</header>
<section class="atlas-sec rp-land" id="themes" aria-labelledby="themes-h"><div class="sec-h"><p class="eyebrow">Seven questions</p><h2 id="themes-h">Start from a question</h2></div>${themeCards(m)}</section>
${coverageMatrix(m)}
${atlas.vocabulary.themes.map((t, i) => themeSection(m, t, i)).join('\n')}
${findingsTable(m)}
${reportCards(m)}
${methodSection(m)}
<aside class="rp-panel" id="rp-panel" aria-label="Finding passport" hidden><div class="rp-panel-in"><button type="button" class="rp-close" aria-label="Close the passport">×</button><div id="rp-panel-body" tabindex="-1"></div></div></aside>`;
}

// ---------- /reports/<slug>/ ----------
const ACCESS = { public: 'Public original', 'public-redacted': 'Public redacted edition', 'public-summary-of-paid-report': 'Public summary of a paid report' };
export function renderReportPage(atlas, r) {
  const m = reportsModel(atlas);
  const fs = m.byReport(r.id);
  const cov = atlas.coverage.find((c) => c.report === r.id).themes;
  const head = fs.find((f) => f.theme === 'headline');
  const themes = [...atlas.vocabulary.themes, { key: 'headline', label: 'Headline conclusion', question: '' }];
  const kv = (pairs) => `<dl class="kv">${pairs.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const check = r.check.status === 'verified'
    ? `Checked against the public original on ${esc(dateText(r.check.checked_on))}: ${esc(r.check.checked.join(', '))}${r.check.locator ? ` (${esc(r.check.locator)})` : ''}.`
    : `The original could not be reached for review on ${esc(dateText(r.check.checked_on))}. Its findings are shown as extracted and are not drawn in the charts.${r.check.note ? ` ${esc(r.check.note)}` : ''}`;
  const groups = themes.map((t) => {
    const tf = fs.filter((f) => f.theme === t.key);
    if (!tf.length) return '';
    return `<section id="t-${t.key}" class="rp-group"><h2>${esc(t.label)} <span class="dim">(${tf.length})</span></h2>${tf.map((f) => W.passport(f, m.reportsObj, atlas.vocabulary, { level: 3 })).join('')}</section>`;
  }).join('');
  const covRow = `<ul class="rp-covrow">${atlas.vocabulary.themes.map((t) => `<li class="cv-${STATE_GLYPH[cov[t.key]]}"><i aria-hidden="true"></i><span>${esc(t.label)}</span><b>${esc(atlas.vocabulary.coverage_states[cov[t.key]])}</b></li>`).join('')}</ul>`;
  return `<p class="kicker">Report · ${esc(r.publisher)} · ${esc(dateText(r.published))}</p>
<h1>${esc(r.title)}</h1>
<p class="lede">${esc(r.scope)}</p>
${head ? `<p class="rp-headline">${badge(head)} ${esc(head.statement)}</p>` : ''}
<section><h2>Bibliographic record</h2>${kv([
    ['Title', esc(r.title)], ['Publisher', esc(r.publisher)], ['Authors', r.authors ? esc(r.authors) : '<span class="na">Not stated</span>'],
    ['Published', `${esc(dateText(r.published))}${r.published_note ? ` <span class="dim">(${esc(r.published_note)})</span>` : ''}`], ['Format', esc(r.format)],
    ['Access', esc(ACCESS[r.access] ?? r.access)], ['Restrictions', r.restrictions ? esc(r.restrictions) : null], ['Hosted by', r.host_note ? esc(r.host_note) : null],
    ['Original', `<a href="${esc(r.url)}" rel="noopener noreferrer">${esc(host(r.url))} ↗</a>`],
    ['Check', check],
  ])}</section>
<section><h2>Coverage</h2><p>What this report says about each of the atlas’s seven questions. <a href="/reports/#coverage">Compare with the other reports</a>.</p>${covRow}</section>
<section><h2>Findings <span class="dim">(${fs.length}: ${fs.filter(verified).length} checked)</span></h2><p>Each finding as the report states it, with its passport. Figures cited from another publisher name the original estimator.</p></section>
${groups}
<section><h2>Sources</h2><ul class="sources"><li><a href="${esc(r.url)}" rel="noopener noreferrer">${esc(r.url)}</a></li></ul></section>
<p class="meta">Why Humanoid? links to the publisher’s original and does not host the report. Quotations are limited to short phrases used to check each finding.</p>`;
}
