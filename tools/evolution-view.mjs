// Evolution charts (Javier, 24 Nov 2026): HTML rendering of data/evolution/charts.json for the seven section pages
// (large, with a replay control and the data table) and the home carousel (compact, rotating every 10 seconds).
// The HTML is the final state of each chart, readable without JavaScript; assets/evolution.js replays it in time order:
// every mark carries the day (data-t) from which its source documents it, and the cursor never shows a mark earlier.
// Plain HTML and CSS (no canvas, no chart library), so labels stay legible from 320 px up.
import { dayNumber } from './evolution-model.mjs';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = (v) => `${Math.round(v * 10000) / 100}%`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDay = (iso) => `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
const compact = (n) => (n >= 1e9 ? `${n / 1e9}B` : n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}k` : String(n));

// Linear position of a date inside the chart's domain, 0..1.
const pos = (domain, iso) => { const a = dayNumber(domain.start); const b = dayNumber(domain.end); return Math.min(1, Math.max(0, (dayNumber(iso) - a) / (b - a))); };
function yearTicks(domain) {
  const y0 = +domain.start.slice(0, 4);
  const y1 = +domain.end.slice(0, 4);
  const n = y1 - y0 + 1;
  const step = n > 12 ? 4 : n > 6 ? 2 : 1;
  const out = [];
  for (let y = y0; y <= y1; y++) {
    const p = pos(domain, `${y}-01-01`);
    if (p > 0.97) continue;
    out.push({ label: String(y), p, minor: (y - y0) % step !== 0 });
  }
  return out;
}
const xAxis = (ticks) => `<div class="evo-x" aria-hidden="true">${ticks.map((t) => `<span class="${t.minor ? 'mn' : ''}" style="left:${pct(t.p)}">${esc(t.label)}</span>`).join('')}</div>`;
const gridX = (ticks) => ticks.map((t) => `<i class="gx${t.minor ? ' mn' : ''}" style="left:${pct(t.p)}"></i>`).join('');

// ---------- the seven chart bodies ----------
function columnsBody(c, compactView) {
  const max = Math.max(...c.columns.map((x) => x.value), 1);
  const n = c.columns.length;
  const map = c.columns.map((x, i) => `${dayNumber(`${x.key}-01-01`)}:${pct(i / n)}`).concat(`${dayNumber(c.domain.end)}:100%`).join(',');
  const cols = c.columns.map((x) => `<div class="ec" data-t="${dayNumber(x.t)}" data-n="${x.value}" title="${esc(`${x.label}${x.partial ? ' (to date)' : ''}: ${x.value} ${c.unit}`)}"><span class="ev" style="bottom:calc(${pct(x.value / max)} + 3px)">${x.value || ''}</span><span class="eb" style="height:${pct(x.value / max)}"></span></div>`).join('');
  const labels = c.columns.map((x, i) => `<span class="${n > 8 && i % 2 ? 'mn' : ''}">${esc(x.label)}${x.partial ? '<sup>*</sup>' : ''}</span>`).join('');
  return { plot: `<div class="evo-cols" style="--n:${n}">${cols}</div>`, after: `<div class="evo-cl" style="--n:${n}" aria-hidden="true">${labels}</div>${compactView ? '' : `<p class="evo-fn"><sup>*</sup>${esc(c.columns.at(-1).label)} counts to ${esc(fmtDay(c.domain.end))}.</p>`}`, map, readout: 'sum' };
}

function stackBody(c, compactView) {
  const max = Math.max(...c.columns.map((x) => x.value), c.undated?.cases ?? 0, 1);
  const n = c.columns.length;
  const map = c.columns.map((x, i) => `${dayNumber(x.key.replace(/-Q(\d)/, (_, q) => `-${String(q * 3 - 2).padStart(2, '0')}-01`))}:${pct(i / n)}`).concat(`${dayNumber(c.domain.end)}:100%`).join(',');
  const total = (seg) => Object.values(seg).reduce((a, b) => a + b, 0);
  const stack = (seg) => c.series.slice().reverse().map((s) => (seg[s.key] ? `<span class="es st-${s.key}" style="height:${pct(seg[s.key] / total(seg))}"></span>` : '')).join('');
  const bar = (seg, cls = '') => `<span class="ev" style="bottom:calc(${pct(total(seg) / max)} + 3px)">${total(seg)}</span><span class="eb stk${cls}" style="height:${pct(total(seg) / max)}">${stack(seg)}</span>`;
  const cols = c.columns.map((x, i) => `<div class="ec" data-t="${dayNumber(x.t)}" data-n="${x.value}" title="${esc(`${x.long}: ${x.value} cases. ${c.series.slice().reverse().map((s) => `${s.label} ${x.segments[s.key]}`).join(', ')}`)}">${i === n - 1 ? bar(x.segments) : `<span class="eb stk" style="height:${pct(x.value / max)}">${stack(x.segments)}</span>`}</div>`).join('');
  const labels = c.columns.map((x) => `<span>${esc(x.label)}</span>`).join('');
  const u = c.undated;
  const undated = u ? `<div class="evo-und" title="${esc(`${u.label}: ${u.cases} cases whose records all lack a publication date. Outside the time series.`)}"><div class="ec">${bar(u.segments, ' und')}</div><span class="ul">${esc(compactView ? 'No date' : u.label)}</span></div>` : '';
  return { plot: `<div class="evo-cols" style="--n:${n}">${cols}</div>`, side: undated, after: `<div class="evo-cl" style="--n:${n}" aria-hidden="true">${labels}</div>`, map, readout: 'last' };
}

function lanesBody(c, compactView) {
  const ticks = yearTicks(c.domain);
  const rows = c.rows.map((r) => {
    const pts = c.points.filter((p) => p.row === r.key).map((p) => {
      const tip = `${p.label} · ${p.date}${p.note ? ` · ${p.note}` : ''}`;
      const cls = `ep${p.hollow ? ' ho' : ''}`;
      const attrs = `class="${cls}" style="left:${pct(pos(c.domain, p.x))}" data-t="${dayNumber(p.t)}" data-n="1" title="${esc(tip)}"`;
      return compactView || !p.href ? `<span ${attrs}></span>` : `<a ${attrs} href="${esc(p.href)}"${p.external ? ' rel="noopener" target="_blank"' : ''} aria-label="${esc(tip)}"></a>`;
    }).join('');
    return `<div class="evo-lane"><span class="ll">${esc(r.label)}</span><div class="lt">${pts}</div></div>`;
  }).join('');
  return { plot: `<div class="evo-lanes">${gridX(ticks)}${rows}</div>`, plotStyle: `--rows:${c.rows.length}`, after: xAxis(ticks), map: `${dayNumber(c.domain.start)}:0%,${dayNumber(c.domain.end)}:100%`, readout: 'count' };
}

function panelsBody(c, compactView) {
  const ticks = yearTicks(c.domain);
  const panels = c.panels.map((p) => {
    const lo = Math.floor(Math.min(...p.points.map((x) => x.y)) / 10) * 10;
    const hi = Math.ceil(Math.max(...p.points.map((x) => x.y)) / 10) * 10;
    const yt = [];
    for (let v = lo; v <= hi; v += 10) yt.push(v);
    const pts = p.points.map((x) => {
      const left = pos(c.domain, x.x);
      return `<span class="ep" style="left:${pct(left)};bottom:${pct((x.y - lo) / (hi - lo))}" data-t="${dayNumber(x.t)}" data-n="1" title="${esc(`${x.label}: ${x.value}, added ${x.date}`)}">${compactView ? '' : `<em class="${left > 0.6 ? 'lf' : ''}">${esc(x.label)} ${esc(x.value)}</em>`}</span>`;
    }).join('');
    return `<div class="evo-panel"><p class="pl">${esc(p.label)}</p><div class="evo-plot2"><div class="evo-y" aria-hidden="true">${yt.map((v) => `<span style="bottom:${pct((v - lo) / (hi - lo))}">${v}%</span>`).join('')}</div><div class="evo-area">${gridX(ticks)}${yt.map((v) => `<i class="gy" style="bottom:${pct((v - lo) / (hi - lo))}"></i>`).join('')}${pts}<span class="evo-cur" aria-hidden="true"></span></div></div>${xAxis(ticks)}</div>`;
  }).join('');
  return { plot: `<div class="evo-panels">${panels}</div>`, map: `${dayNumber(c.domain.start)}:0%,${dayNumber(c.domain.end)}:100%`, readout: 'count', ownCursor: true };
}

function scatterBody(c, compactView) {
  const lx = (v) => (v - c.x.min) / (c.x.max - c.x.min);
  const ly = (v) => (Math.log10(v) - Math.log10(c.y.min)) / (Math.log10(c.y.max) - Math.log10(c.y.min));
  const yt = [];
  for (let v = c.y.min; v <= c.y.max; v *= 10) yt.push(v);
  const xt = [];
  for (let y = Math.ceil(c.x.min / 5) * 5; y <= c.x.max; y += 5) xt.push(y);
  const pts = c.points.map((p) => `<span class="ep k-${p.kind} ${p.series}" style="left:${pct(lx(p.x))};bottom:${pct(ly(p.y))}" data-t="${dayNumber(p.t)}" data-n="1" title="${esc(`${c.series.find((s) => s.key === p.series).label}, published ${p.published}: ${p.value} in ${p.x} (${p.kind}${p.scenario ? `, ${p.scenario.toLowerCase()} case` : ''})`)}"></span>`).join('');
  const legend = `<ul class="evo-leg">${c.series.map((s) => `<li><i class="sw ${s.key}"></i>${esc(s.label)}</li>`).join('')}${c.kinds.map((k) => `<li><i class="sh k-${k.key}"></i>${esc(k.label)}</li>`).join('')}</ul>`;
  return {
    plot: `<div class="evo-plot2"><div class="evo-y" aria-hidden="true">${yt.map((v) => `<span style="bottom:${pct(ly(v))}">${compact(v)}</span>`).join('')}</div><div class="evo-area sc">${xt.map((y) => `<i class="gx" style="left:${pct(lx(y))}"></i>`).join('')}${yt.map((v) => `<i class="gy" style="bottom:${pct(ly(v))}"></i>`).join('')}${pts}</div></div><div class="evo-x sc" aria-hidden="true">${xt.map((y) => `<span style="left:${pct(lx(y))}">${y}</span>`).join('')}</div><p class="evo-ax">${esc(c.x.label)} · ${esc(c.unit)}</p>`,
    legend, map: null, readout: 'count', noCursor: true, ownCursor: true,
  };
}

const legendStack = (c) => `<ul class="evo-leg">${c.series.slice().reverse().map((s) => `<li><i class="sw st-${s.key}"></i>${esc(s.label)}</li>`).join('')}</ul>`;
const legendLanes = (c) => (c.points.some((p) => p.hollow) ? `<ul class="evo-leg"><li><i class="sh ep"></i>${esc(c.id === 'benchmarks' ? 'Dated by the first arXiv submission of its paper' : `Dated ${c.unit.replace(/s$/, '')}`)}</li><li><i class="sh ep ho"></i>${esc(c.hollowLabel ?? (c.id === 'integrators' ? 'Simulation only' : 'Complete hand, not a standalone sensor'))}</li></ul>` : '');

function body(c, compactView) {
  const b = c.type === 'columns' ? columnsBody(c, compactView) : c.type === 'stack' ? stackBody(c, compactView) : c.type === 'lanes' ? lanesBody(c, compactView) : c.type === 'panels' ? panelsBody(c, compactView) : scatterBody(c, compactView);
  b.legend = b.legend ?? (c.type === 'stack' ? legendStack(c) : c.type === 'lanes' ? legendLanes(c) : '');
  return b;
}

const unitOne = (c) => ({ models: 'model', cases: 'case', products: 'product', events: 'event', papers: 'paper', results: 'result' })[c.unit] ?? 'estimate';
const unitMany = (c) => (c.type === 'scatter' ? 'estimates' : c.type === 'panels' ? 'results' : c.unit);

// The chart itself: plot, axis, legend and the replay readout (date cursor and count). Shared by both views.
function chartHtml(c, { compactView = false, idp = '' } = {}) {
  const b = body(c, compactView);
  const t0 = dayNumber(c.domain.start);
  const t1 = dayNumber(c.domain.end);
  const final = c.type === 'stack' ? c.columns.at(-1).value : c.type === 'columns' ? c.columns.reduce((a, x) => a + x.value, 0) : c.type === 'panels' ? c.panels.reduce((a, p) => a + p.points.length, 0) : c.points.length;
  const cursor = b.noCursor || b.ownCursor ? '' : '<span class="evo-cur" aria-hidden="true"></span>';
  const plot = b.ownCursor ? b.plot : `<div class="evo-plot"${b.plotStyle ? ` style="${b.plotStyle}"` : ''}>${b.plot}${cursor}</div>`;
  return `<div class="evo-chart evo-type-${c.type}" data-chart="${esc(c.id)}" data-t0="${t0}" data-t1="${t1}" data-prec="${esc(c.precision)}"${b.map ? ` data-map="${b.map}"` : ''} data-readout="${b.readout}" data-one="${esc(unitOne(c))}" data-many="${esc(unitMany(c))}">
<div class="evo-fig" role="img" aria-label="${esc(`${c.title}. ${c.summary}`)}"><div class="evo-main">${plot}${b.after ?? ''}</div>${b.side ?? ''}</div>
${b.legend}
<div class="evo-read"><span class="evo-date" aria-hidden="true">${c.type === 'scatter' ? 'Published by ' : 'Through '}<b>${esc(fmtDay(c.domain.end))}</b></span><span class="evo-n" aria-hidden="true"><b>${final}</b> ${esc(final === 1 ? unitOne(c) : unitMany(c))}</span>${compactView ? '' : `<span class="evo-st">${esc(c.status === 'complete' ? 'Complete coverage' : 'Partial coverage')}</span>`}</div>
<div class="evo-track" aria-hidden="true"><i class="evo-prog" style="width:100%"></i></div>
</div>`;
}

const exclusions = (c) => `<ul class="evo-ex">${c.coverage.excluded.filter((x) => x.count).map((x) => `<li><b>${x.count}</b> ${esc(x.reason)}</li>`).join('')}</ul>`;
const table = (c) => `<div class="scroll"><table class="evo-tbl"><thead><tr>${c.table.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${c.table.rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const sourceLinks = (c) => c.sources.filter((s) => s.url).map((s) => `<a href="${esc(s.url)}"${/^https?:/.test(s.url) ? ' rel="noopener"' : ''}>${esc(s.label)}</a>`).join(' · ');

// Section view: the large chart at the top of each of the seven section pages.
export function renderEvolutionSection(c, { anchor = 'evolution' } = {}) {
  return `<section class="evo evo-sec" id="${esc(anchor)}" aria-labelledby="evo-h-${esc(c.id)}">
<div class="evo-head"><p class="lbl">Evolution · replay of dated records, not live activity</p><h2 id="evo-h-${esc(c.id)}">${esc(c.title)}</h2><p class="evo-sub">${esc(c.subtitle)}</p></div>
${chartHtml(c)}
<div class="evo-ctl"><button type="button" class="evo-play" aria-label="Replay ${esc(c.title.toLowerCase())} in time order">Replay</button><label class="evo-scrub"><span class="sr-only">Date cursor for ${esc(c.title.toLowerCase())}</span><input type="range" min="${dayNumber(c.domain.start)}" max="${dayNumber(c.domain.end)}" step="1" value="${dayNumber(c.domain.end)}" aria-valuetext="${esc(fmtDay(c.domain.end))}"></label></div>
<p class="evo-sum">${esc(c.summary)}</p>
<p class="evo-cov"><b>Coverage:</b> ${esc(c.status_note)}</p>
<details class="evo-data"><summary>Data, dates and exclusions</summary>
<p><b>What the date means.</b> ${esc(c.meaning)}</p>
${table(c)}
<p><b>Not placed in time</b></p>${exclusions(c)}
${c.coverage.note ? `<p>${esc(c.coverage.note)}</p>` : ''}
<p class="meta">Sources: ${sourceLinks(c)} · <a href="/data/evolution/charts.json">chart data</a>. Built by tools/export-evolution.mjs.</p>
</details>
</section>`;
}

// Home carousel: the same seven charts in the same order, one every 10 seconds, each linking to its section.
export function renderEvolutionCarousel(doc) {
  const n = doc.charts.length;
  const tabs = doc.charts.map((c, i) => `<a role="tab" id="evo-t-${i}" href="${esc(c.path)}#evolution" data-i="${i}" aria-controls="evo-s-${i}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(c.label)}</a>`).join('');
  const slides = doc.charts.map((c, i) => `<div class="evo-slide${i === 0 ? ' on' : ''}" role="tabpanel" id="evo-s-${i}" aria-labelledby="evo-t-${i}" aria-roledescription="slide" aria-label="${i + 1} of ${n}: ${esc(c.label)}">
<p class="evo-st2"><span class="lbl hi">${esc(c.label)}</span><span class="lbl">${esc(c.status === 'complete' ? 'Complete coverage' : `Partial: ${c.coverage.included} of ${c.coverage.total} ${c.coverage.unit}`)}</span></p>
<h3>${esc(c.title)}</h3>
${chartHtml(c, { compactView: true, idp: `h${i}` })}
<p class="evo-sum">${esc(c.summary)}</p>
<p class="evo-go"><a href="${esc(c.path)}#evolution">Open ${esc(c.label)}: data, dates and exclusions →</a></p>
</div>`).join('\n');
  return `<!-- evolution:start -->
      <figure class="evo evo-car" id="evo-car" aria-roledescription="carousel" aria-labelledby="evo-car-h" data-seconds="${doc.rotation_seconds}">
        <figcaption class="fc-head"><span class="lbl hi" id="evo-car-h">How the record has grown, section by section</span><span class="lbl">Replay of dated sources · not live</span></figcaption>
        <div class="evo-tabs" role="tablist" aria-label="Evolution charts">${tabs}</div>
        <div class="evo-slides">${slides}</div>
        <div class="evo-nav"><button type="button" class="evo-prev" aria-label="Previous chart"><span aria-hidden="true">‹</span></button><button type="button" class="evo-pp" aria-label="Pause rotation" hidden>Pause</button><button type="button" class="evo-next" aria-label="Next chart"><span aria-hidden="true">›</span></button><span class="evo-pos" aria-hidden="true">1 / ${n}</span><span class="evo-timer" aria-hidden="true"><i></i></span></div>
        <p class="sr-only evo-live" aria-live="polite"></p>
      </figure>
      <!-- evolution:end -->`;
}

export const evolutionCss = 'assets/evolution.css';
export const evolutionJs = 'assets/evolution.js';
