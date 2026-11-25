// Robotics Evaluation Atlas (23 Nov 2026): the static HTML of /benchmarks/, built from data/benchmarks/atlas.json.
// Everything is readable without JavaScript (tables, panels, every value, condition and source); assets/atlas.js adds
// selection, filters, the comparison picker and shareable URL state on top of the same markup.
//
// Rules carried into the view (see server/src/benchmarks/atlas.js):
// - capability marks say what a resource covers, never how well a model does;
// - evaluation settings are kinds (shape-coded), not a ladder;
// - values stay on the source's native scale; missing stays "not reported"; no error bars are drawn from prose;
// - nothing is ranked across comparability groups or across benchmarks; no global score.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const ext = (u, label) => `<a href="${esc(u)}" rel="noopener noreferrer">${esc(label ?? host(u))}</a>`;
const fmtDate = (d) => {
  if (!d) return 'not recorded';
  const [y, m, day] = d.split('-').map(Number);
  return `${day} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`;
};
export const fmtValue = (r) => (r.value === null ? 'Not reported' : `${r.value}${r.unit === '%' ? '%' : r.unit ? ` ${r.unit}` : ''}`);
const pct = (v) => `${Math.max(0, Math.min(100, v))}%`;

// Panel structure for the two extracted benchmarks: exact track and version values of the Benchmark Results tab.
const PAW = { id: 'bm-paw', conditions: [['Nominal', 'nom'], ['Interpolation', 'int'], ['Extrapolation', 'ext']], overall: 'Overall' };
const PIQ_MODES = { i2v: { key: 'i2v', label: 'Image to video (i2v)' }, 'multiframe (v2v)': { key: 'v2v', label: 'Multiframe, video to video (v2v)' } };
const PIQ_VARIANTS = { Original: 'original', Verified: 'verified' };

const settingGlyph = (atlas, key, withLabel = false) => {
  const s = atlas.vocabulary.settings.find((x) => x.key === key);
  return `<span class="set set-${esc(key)}" ${withLabel ? 'aria-hidden="true"' : `role="img" aria-label="${esc(s?.label ?? 'Setting not recorded')}" title="${esc(s?.label ?? '')}"`}></span>${withLabel ? `<span class="set-l">${esc(s?.label)}</span>` : ''}`;
};

function groupLabel(atlas, g) {
  const r = atlas.results.find((x) => x.comparability_group === g);
  const b = atlas.benchmarks.find((x) => x.id === r.benchmark_id);
  return `${b.name} · ${r.benchmark_version ?? 'version not recorded'} · ${r.track ?? 'track not recorded'} · ${r.metric}`;
}

// ---------- header: title, coverage strip, counts ----------
function head(atlas, c) {
  const n = atlas.counts;
  const tiles = atlas.benchmarks.map((b) => `<li><a class="tile${b.observations ? ' has' : ''}" href="#${esc(b.id)}" data-bm="${esc(b.id)}" title="${esc(b.name)}: ${b.observations ? `${b.observations} observations` : 'awaiting extraction'}">${settingGlyph(atlas, b.setting)}<span class="tl">${esc(b.name)}</span></a></li>`).join('');
  return `<header class="atlas-head">
<p class="kicker">Category ${c.index} of ${c.total} · Benchmarks${c.badge ?? ''}</p>
<h1>Robotics Evaluation Atlas</h1>
<p class="lede">Explore what robotics benchmarks test, what models achieve, and where evidence is still missing.</p>
<dl class="atlas-counts">
<div><dt>Benchmark resources</dt><dd>${n.resources}</dd></div>
<div><dt>With numerical results</dt><dd>${n.resources_with_results}</dd></div>
<div><dt>Source-reported observations</dt><dd>${n.observations}</dd></div>
<div><dt>Awaiting extraction</dt><dd>${n.resources_awaiting_results}</dd></div>
</dl>
<div class="cov" aria-labelledby="cov-h"><p class="cov-h" id="cov-h">Every resource in the catalogue. <span class="cov-key"><span class="tile-key has" aria-hidden="true"></span> numerical results extracted · <span class="tile-key" aria-hidden="true"></span> awaiting extraction</span></p>
<ol class="tiles">${tiles}</ol></div>
<p class="prov">Data as of ${esc(fmtDate(String(atlas.snapshot.exported_at ?? '').slice(0, 10)))}. Results are transcribed from public sources and not independently replicated. Selected results are not complete leaderboards, nor the current state of the art.</p>
<nav class="views" aria-label="Atlas views"><a href="#results">Results</a><a href="#landscape">Landscape</a><a href="#compare">Compare</a><a href="#observations">All observations</a><a href="#resources">All ${n.resources} resources</a></nav>
</header>`;
}

// ---------- results: PAW and Physics-IQ panels ----------
const axis = () => `<div class="axis" aria-hidden="true">${[0, 25, 50, 75, 100].map((t) => `<span style="left:${t}%">${t}</span>`).join('')}</div>`;
// The 0 to 100 scale, in a head row whose columns line up with the value rows below it.
const axisRow = (cols) => `<div class="pr pr-head" aria-hidden="true"><span class="pr-name"></span>${axis()}${cols.map((c) => `<span class="v">${esc(c)}</span>`).join('')}</div>`;

function pawPanel(atlas) {
  const b = atlas.benchmarks.find((x) => x.id === PAW.id);
  const rows = atlas.results.filter((r) => r.benchmark_id === PAW.id);
  if (!b || !rows.length) return '';
  const cond = (r) => String(r.track ?? '').split(' / ').pop();
  const models = [...new Set(rows.map((r) => r.model))].map((m) => {
    const of = (name) => rows.find((r) => r.model === m && cond(r) === name) ?? null;
    return { model: m, overall: of(PAW.overall), by: Object.fromEntries(PAW.conditions.map(([name]) => [name, of(name)])) };
  });
  // Order as published: by the Overall value of the same table (one comparability group).
  models.sort((a, z) => (z.overall?.value ?? -1) - (a.overall?.value ?? -1));
  const version = rows[0].benchmark_version;
  const any = rows.find((r) => cond(r) === PAW.overall);
  const dot = (r, cls, name, model) => (r && r.value !== null
    ? `<button type="button" class="dot ${cls}" style="left:${pct(r.value)}" data-res="${esc(r.id)}" aria-label="${esc(model)}, ${esc(name)}: ${esc(fmtValue(r))}"></button>`
    : '');
  const body = models.map(({ model, overall, by }) => {
    const nom = by.Nominal, ex = by.Extrapolation, it = by.Interpolation;
    const lo = Math.min(nom?.value ?? 0, ex?.value ?? 0), hi = Math.max(nom?.value ?? 0, ex?.value ?? 0);
    const gap = nom?.value !== null && nom?.value !== undefined && ex?.value !== null && ex?.value !== undefined ? ex.value - nom.value : null;
    return `<li class="pr" data-model="${esc(model)}">
<button type="button" class="pr-name" data-model="${esc(model)}">${esc(model)}</button>
<div class="track">${nom && ex ? `<span class="span" style="left:${pct(lo)};width:${hi - lo}%"></span>` : ''}${dot(it, 'int', 'Interpolation', model)}${dot(nom, 'nom', 'Nominal', model)}${dot(ex, 'ext', 'Extrapolation', model)}</div>
<span class="v nom">${nom ? esc(fmtValue(nom)) : '—'}</span><span class="v int">${it ? esc(fmtValue(it)) : '—'}</span><span class="v ext">${ex ? esc(fmtValue(ex)) : '—'}</span>
<span class="v dg">${gap === null ? '—' : `${gap > 0 ? '+' : gap < 0 ? '−' : '±'}${Math.abs(gap)} pp`}</span>
${overall ? `<button type="button" class="v ovr" data-res="${esc(overall.id)}" aria-label="${esc(model)}, Overall summary: ${esc(fmtValue(overall))}">${esc(fmtValue(overall))}</button>` : '<span class="v ovr">—</span>'}
</li>`;
  }).join('');
  return `<article class="panel paw" id="panel-paw" aria-labelledby="paw-h">
<header class="panel-h"><p class="eyebrow">${settingGlyph(atlas, b.setting, true)} · ${esc(b.embodiment ?? '')}</p>
<h3 id="paw-h">${esc(b.name)} <span>${esc(String(version).split(';')[0])}, D10</span></h3>
<p class="sub">Six agentic models writing robot code, not necessarily VLA policies. Success: episodes rated Ok or Excellent, 10 demonstrations per environment.</p></header>
<div class="legend"><span><i class="k nom"></i>Nominal</span><span><i class="k ext"></i>Extrapolation</span><label class="tg"><input type="checkbox" id="paw-int"> <i class="k int"></i>Interpolation</label></div>
<div class="chart paw-chart" data-show-int="false">
<div class="pr pr-head" aria-hidden="true"><span class="pr-name">Model</span>${axis()}<span class="v nom">Nom.</span><span class="v int">Int.</span><span class="v ext">Extr.</span><span class="v dg">Gap</span><span class="v ovr">Overall</span></div>
<ol class="prs">${body}</ol></div>
<ul class="fine">
<li><b>Gap</b> is extrapolation minus nominal, in percentage points, for the same model.</li>
<li><b>Overall</b> is the source's separate summary over n = ${esc(any?.n_evals ?? 'not recorded')} episodes. It is not another dataset to add; the conditions' own sample counts are not published.</li>
<li>The source mentions 95% confidence intervals. Their bounds were not extracted, so no error bars are drawn.</li>
<li>Leaderboard export ${esc(fmtDate(any?.result_date))} (${esc(any?.date_meaning ?? '')}); transcribed ${esc(fmtDate(any?.checked_at))}. ${any?.source_url ? ext(any.source_url, 'Source') : ''}</li>
</ul></article>`;
}

function piqPanel(atlas) {
  const b = atlas.benchmarks.find((x) => x.id === 'bm-physics-iq');
  const rows = atlas.results.filter((r) => r.benchmark_id === 'bm-physics-iq');
  if (!b || !rows.length) return '';
  const facets = [];
  for (const [version, vkey] of Object.entries(PIQ_VARIANTS)) {
    for (const [track, mode] of Object.entries(PIQ_MODES)) {
      const sel = rows.filter((r) => r.benchmark_version === version && r.track === track).sort((a, z) => (z.value ?? -1) - (a.value ?? -1));
      facets.push({ version, vkey, mode, rows: sel });
    }
  }
  const facet = ({ version, vkey, mode, rows: sel }) => `<section class="facet" data-variant="${vkey}" data-mode="${mode.key}" aria-label="${esc(`${version}, ${mode.label}`)}">
<h4>${esc(version)} <span>${esc(mode.label)}</span></h4>
${sel.length ? `<div class="chart">${axisRow(['', ''])}<ol class="prs">${sel.map((r) => `<li class="pr" data-model="${esc(r.model)}">
<button type="button" class="pr-name" data-model="${esc(r.model)}">${esc(r.model)}</button>
<div class="track">${r.value === null ? '' : `<button type="button" class="dot piq" style="left:${pct(r.value)}" data-res="${esc(r.id)}" aria-label="${esc(r.model)}, ${esc(version)} ${esc(mode.key)}: ${esc(fmtValue(r))}"></button>`}</div>
<span class="v">${esc(fmtValue(r))}</span>${/±/.test(r.uncertainty ?? '') ? `<span class="v pm">${esc(String(r.uncertainty).match(/±\s*[\d.]+/)[0])}</span>` : '<span class="v pm"></span>'}
</li>`).join('')}</ol></div>` : `<p class="empty">No ${esc(version)} ${esc(mode.key)} entries in this extraction.</p>`}
</section>`;
  const any = rows[0];
  return `<article class="panel piq" id="panel-piq" aria-labelledby="piq-h">
<header class="panel-h"><p class="eyebrow">${settingGlyph(atlas, b.setting, true)} · video models, not physical robots</p>
<h3 id="piq-h">${esc(b.name)} <span>selected base entries</span></h3>
<p class="sub">Physics-IQ score, higher is better. Original and Verified are different scoring and prompting variants: never one leaderboard, never a time series.</p></header>
<div class="ctl" role="group" aria-label="Physics-IQ variant and input mode">
<fieldset><legend>Variant</legend><label><input type="radio" name="piq-v" value="original" checked> Original</label><label><input type="radio" name="piq-v" value="verified"> Verified</label></fieldset>
<fieldset><legend>Input mode</legend><label><input type="radio" name="piq-m" value="all" checked> Both</label><label><input type="radio" name="piq-m" value="i2v"> i2v</label><label><input type="radio" name="piq-m" value="v2v"> v2v</label></fieldset>
</div>
<div class="facets">${facets.map(facet).join('')}</div>
<ul class="fine">
<li>Verified uses model-specific best-practice prompting (bpp) by default; the configuration is kept with each value.</li>
<li>Published ± values are shown as written. Whether they are confidence intervals or standard deviations was not extracted.</li>
<li>Dates are when an entry was added to the leaderboard, not when it was run. Transcribed ${esc(fmtDate(any.checked_at))}. ${any.source_url ? ext(any.source_url, 'Source') : ''}</li>
</ul></article>`;
}

// ---------- landscape: capability matrix ----------
function landscape(atlas) {
  const groups = atlas.vocabulary.capability_groups;
  const n = atlas.counts;
  const SHORT = { manipulation: 'Manipulation', 'whole-body': 'Whole-body', navigation: 'Navigation', reasoning: 'Reasoning', physics: 'Physics' };
  const head = groups.map((g) => `<th scope="col" class="cap"><button type="button" class="cap-f" data-cap="${esc(g.key)}" aria-pressed="false" aria-label="${esc(`${g.label}: ${n.by_capability[g.key]} resources. Show only these`)}" title="${esc(g.label)}"><span class="cl">${esc(g.label)}</span><span class="cs" aria-hidden="true">${esc(SHORT[g.key] ?? g.label)}</span> <span class="cn">${n.by_capability[g.key]}</span></button></th>`).join('');
  const rows = atlas.benchmarks.map((b) => `<tr id="row-${esc(b.id)}" data-bm="${esc(b.id)}" data-set="${esc(b.setting)}" data-caps="${esc(b.capabilities.join(' '))}" data-res="${b.observations ? 1 : 0}">
<th scope="row"><a class="bm-sel" href="#${esc(b.id)}" data-bm="${esc(b.id)}">${esc(b.name)}</a></th>
<td class="st">${settingGlyph(atlas, b.setting)}</td>
${groups.map((g) => `<td class="cv">${b.capabilities.includes(g.key) ? `<span class="g on" role="img" aria-label="Covers ${esc(g.label.toLowerCase())}"></span>` : '<span class="g" aria-hidden="true"></span>'}</td>`).join('')}
<td class="rs">${b.observations ? `<span class="has">${b.observations}</span>` : '<span class="na" title="Awaiting extraction">—</span>'}</td>
</tr>`).join('');
  const settings = atlas.vocabulary.settings.map((s) => `<button type="button" class="set-f" data-set="${esc(s.key)}" aria-pressed="false">${settingGlyph(atlas, s.key, true)} <span class="cn">${n.by_setting[s.key]}</span></button>`).join('');
  return `<section class="atlas-sec" id="landscape" aria-labelledby="land-h">
<div class="sec-h"><h2 id="land-h">Landscape</h2><p>What each of the ${n.resources} resources tests, and where. A mark says a resource covers a capability, not that any model is good at it. A resource can cover several capabilities, so the counts do not add up to ${n.resources}.</p></div>
<div class="filters"><div class="frow" role="group" aria-label="Filter by setting"><span class="fl">Setting</span>${settings}</div>
<div class="frow"><label class="tg"><input type="checkbox" id="only-res"> Only resources with numerical results</label><button type="button" class="clear-f" hidden>Clear filters</button></div></div>
<div class="land">
<div class="matrix-wrap"><table class="matrix" id="matrix"><caption class="sr">Capability coverage of the benchmark resources. Choose a capability heading to filter.</caption>
<thead><tr><th scope="col" class="nm">Resource</th><th scope="col" class="st"><span class="sr">Setting</span></th>${head}<th scope="col" class="rs">Results</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="empty" id="matrix-empty" hidden>No resource matches these filters.</p></div>
<aside class="detail" id="bm-detail" aria-live="polite" tabindex="-1"><p class="hint">Choose a resource to see what it evaluates, its protocol, limitations, links and any extracted results.</p></aside>
</div></section>`;
}

// ---------- compare: one comparability group at a time ----------
function compareSection(atlas) {
  const groups = [...new Set(atlas.results.map((r) => r.comparability_group))];
  const def = groups[0];
  const opts = groups.map((g) => `<option value="${esc(g)}"${g === def ? ' selected' : ''}>${esc(groupLabel(atlas, g))}</option>`).join('');
  return `<section class="atlas-sec" id="compare" aria-labelledby="cmp-h">
<div class="sec-h"><h2 id="cmp-h">Compare</h2><p>Model configurations side by side only where the benchmark, version, track and metric are the same. Comparability groups are an editorial aid, not proof of equal compute, data or statistical significance. Success percentages from different benchmarks are never compared, and there is no cross-benchmark score: the data does not overlap enough for one.</p></div>
<label class="pick">Comparison <select id="cmp-group">${opts}</select></label>
<div id="cmp-out">${compareGroup(atlas, def)}</div>
${groups.map((g) => `<template id="cmp-${esc(g)}">${compareGroup(atlas, g)}</template>`).join('')}</section>`;
}

export function compareGroup(atlas, g) {
  const rows = atlas.results.filter((r) => r.comparability_group === g);
  const r0 = rows[0];
  // Best first within this one group, by the source's direction; a missing value goes last.
  const key = (r) => (r.value === null ? -Infinity : r0.direction === 'lower' ? -r.value : r.value);
  const sorted = [...rows].sort((a, z) => key(z) - key(a));
  const others = atlas.results.filter((r) => r.benchmark_id === r0.benchmark_id && r.comparability_group !== g);
  const why = (r) => ['benchmark_version', 'track', 'metric', 'unit'].filter((f) => r[f] !== r0[f]).map((f) => ({ benchmark_version: 'version', track: 'track', metric: 'metric', unit: 'unit' })[f]);
  const listed = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  const bname = atlas.benchmarks.find((b) => b.id === r0.benchmark_id)?.name ?? r0.benchmark_id;
  const reasons = new Map();
  for (const r of others) { const k = listed(why(r)) || 'comparability group'; reasons.set(k, (reasons.get(k) ?? 0) + 1); }
  const elsewhere = atlas.results.filter((r) => r.benchmark_id !== r0.benchmark_id).length;
  return `<p class="cmp-h">${esc(groupLabel(atlas, g))} · ${esc(r0.direction === 'lower' ? 'lower is better' : 'higher is better')} · ${rows.length} configuration${rows.length === 1 ? '' : 's'}</p>
${rows.length < 2 ? '<p class="empty">Only one configuration in this group: nothing to compare.</p>' : ''}
<div class="chart cmp">${r0.unit === '%' ? axisRow(['']) : ''}<ol class="prs">${sorted.map((r) => `<li class="pr" data-model="${esc(r.model)}"><span class="pr-name">${esc(r.model)}<small>${esc(r.model_configuration ?? '')}</small></span><div class="track">${r.value === null || r.unit !== '%' ? '' : `<button type="button" class="dot cmp" style="left:${pct(r.value)}" data-res="${esc(r.id)}" aria-label="${esc(r.model)}: ${esc(fmtValue(r))}"></button>`}</div><span class="v">${esc(fmtValue(r))}</span></li>`).join('')}</ol></div>
<p class="excl"><b>Not in this comparison:</b> ${[...reasons].map(([k, v]) => `${v} other ${esc(bname)} observation${v === 1 ? '' : 's'} with a different ${esc(k)}`).join('; ') || 'no other observation of this benchmark'}; ${elsewhere} observation${elsewhere === 1 ? '' : 's'} of other benchmarks.</p>`;
}

// ---------- accessible table of every observation ----------
function observations(atlas) {
  const name = new Map(atlas.benchmarks.map((b) => [b.id, b.name]));
  const rows = atlas.results.map((r) => `<tr id="${esc(r.id)}" data-res="${esc(r.id)}" data-bm="${esc(r.benchmark_id)}">
<th scope="row">${esc(r.model)}<small>${esc(r.model_configuration ?? '')}</small></th>
<td>${esc(name.get(r.benchmark_id))}<small>${esc(r.benchmark_version ?? 'Version not recorded')}</small></td>
<td>${esc(r.track ?? 'Not recorded')}</td><td>${esc(r.metric)}</td>
<td class="num">${esc(fmtValue(r))}<small>${esc(r.direction === 'lower' ? 'lower is better' : 'higher is better')}</small></td>
<td class="num">${r.n_evals === null ? '<span class="na">Not reported</span>' : esc(r.n_evals)}</td>
<td>${esc(r.uncertainty ?? 'Not recorded')}</td>
<td>${esc(r.conditions ?? 'Not recorded')}</td>
<td>${r.source_url ? ext(r.source_url) : '<span class="na">No link</span>'}<small>${esc(r.source_locator ?? '')}</small></td>
<td>${esc(fmtDate(r.checked_at))}</td>
<td><a class="res-link" href="?res=${esc(r.id)}#results" data-res="${esc(r.id)}">${esc(r.id)}</a></td>
</tr>`).join('');
  return `<section class="atlas-sec" id="observations" aria-labelledby="obs-h">
<div class="sec-h"><h2 id="obs-h">All observations</h2><p>Every displayed value with its protocol and source, as a table. ${atlas.counts.observations} source-reported observations from ${atlas.counts.resources_with_results} resources; related observations of one table (such as Poke and Wiggle's Overall and its conditions) are separate rows, not separate evaluations.</p></div>
<div class="filters"><label class="pick">Benchmark <select id="obs-bm"><option value="">All</option>${[...new Set(atlas.results.map((r) => r.benchmark_id))].map((id) => `<option value="${esc(id)}">${esc(name.get(id))}</option>`).join('')}</select></label></div>
<div class="scroll obs-wrap"><table class="obs" id="obs"><caption class="sr">Source-reported benchmark observations</caption>
<thead><tr><th scope="col">Model and configuration</th><th scope="col">Benchmark and version</th><th scope="col">Track</th><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">n</th><th scope="col">Uncertainty as published</th><th scope="col">Conditions</th><th scope="col">Source</th><th scope="col">Checked</th><th scope="col">Result ID</th></tr></thead>
<tbody>${rows}</tbody></table></div></section>`;
}

// ---------- every resource, as a static card (anchor #bm-<id>) ----------
export function resourceDetail(atlas, b) {
  const groups = atlas.vocabulary.capability_groups.filter((g) => b.capabilities.includes(g.key));
  const kv = (k, v) => (v ? `<dt>${esc(k)}</dt><dd>${v}</dd>` : '');
  const t = (v) => (v ? esc(v) : null);
  const links = [['Project', b.url], ['Leaderboard', b.leaderboard_url], ['Code', b.code_url], ['Source', b.source_url]].filter(([, u]) => u).map(([l, u]) => ext(u, l)).join(' · ');
  return `<p class="d-k">${settingGlyph(atlas, b.setting, true)}${b.category ? ` · ${esc(b.category)}` : ''}</p>
<h3 class="d-t">${esc(b.name)}</h3>
${b.description ? `<p class="d-d">${esc(b.description)}</p>` : ''}
${b.key_finding ? `<p class="d-f"><b>Key finding as recorded:</b> ${esc(b.key_finding)}</p>` : ''}
<p class="d-caps">${groups.map((g) => `<span class="chip on">${esc(g.label)}</span>`).join('')}${b.aspects.map((a) => `<span class="chip">${esc(a)}</span>`).join('')}</p>
<dl class="d-kv">
${kv('Evaluates', t(b.evaluates))}${kv('Embodiment', t(b.embodiment))}${kv('Environment', t(b.environment))}${kv('Tasks', t(b.tasks))}${kv('Metrics', t(b.metrics))}${kv('Protocol', t(b.protocol))}${kv('Limitations', t(b.limitations))}
${kv('Results', b.observations ? `${b.observations} source-reported observations, ${b.models} models, ${b.groups} comparability groups. <a href="?bm=${esc(b.id)}#results" data-goto-res="${esc(b.id)}">See them</a>` : `None extracted yet${b.results_coverage ? ` (${esc(b.results_coverage)})` : ''}.`)}
${kv('Related datasets', b.related_datasets.length ? b.related_datasets.map((d) => `<a href="/datasets/#${esc(d.id)}">${esc(d.name ?? d.id)}</a>${d.url ? ` (${ext(d.url)})` : ''}`).join(', ') : null)}
${kv('Links', links || null)}${kv('Source checked', `${esc(fmtDate(b.checked_at))}${b.source_locator ? ` · ${esc(b.source_locator)}` : ''}`)}${kv('Review', t(b.review_status))}
</dl>`;
}

function resources(atlas) {
  return `<section class="atlas-sec" id="resources" aria-labelledby="all-h">
<div class="sec-h"><h2 id="all-h">All ${atlas.counts.resources} resources</h2><p>Each resource as recorded in the catalogue, with its links. Its address stays the same: /benchmarks/#&lt;resource id&gt;, for example /benchmarks/#bm-libero.</p></div>
<div class="res-list">${atlas.benchmarks.map((b) => `<details class="res-card" id="${esc(b.id)}"><summary>${settingGlyph(atlas, b.setting)}<span class="rn">${esc(b.name)}</span><span class="rc">${b.observations ? `${b.observations} observations` : 'awaiting extraction'}</span></summary><div class="res-body">${resourceDetail(atlas, b)}</div></details>`).join('')}</div></section>`;
}

function method(atlas) {
  const n = atlas.counts;
  const tags = atlas.vocabulary.capability_groups.map((g) => `<li><b>${esc(g.label)}</b>: ${g.tags.map(esc).join(', ')}</li>`).join('');
  return `<section class="atlas-sec atlas-method" id="atlas-method" aria-labelledby="am-h">
<div class="sec-h"><h2 id="am-h">How to read the atlas</h2></div>
<div class="cols">
<div><h3>Counting</h3><ul class="fine">
<li>${n.resources} resources in the catalogue; ${n.resources_with_results} have numerical results extracted, ${n.resources_awaiting_results} are awaiting a source and protocol check before any value is added. No gap is filled with an estimate.</li>
<li>${n.observations} observations, each a value as reported by its source, for ${n.models} model names in ${n.comparability_groups} comparability groups. Missing values stay missing, never zero.</li>
<li>Percentages use the source's native 0 to 100 scale.</li></ul></div>
<div><h3>Capabilities</h3><ul class="fine">${tags}</ul><p class="fine">Mapped from each resource's editorial capability tags with this reviewed list; other tags (such as ${atlas.vocabulary.aspect_tags.slice(0, 4).map(esc).join(', ')}) describe how it evaluates and are shown as such.</p></div>
<div><h3>Settings</h3><ul class="fine">${atlas.vocabulary.settings.map((s) => `<li>${settingGlyph(atlas, s.key, true)}</li>`).join('')}</ul><p class="fine">Kinds of evaluation, not a ranking of quality.</p></div>
</div></section>`;
}

export function renderAtlas(atlas, c) {
  const data = JSON.stringify(atlas).replace(/</g, '\\u003c');
  return `<div class="atlas" id="atlas">
${head(atlas, c)}
<section class="atlas-sec" id="results" aria-labelledby="res-h">
<div class="sec-h"><h2 id="res-h">Results</h2><p>What models achieved, on each source's own scale and protocol. Selected source-reported observations: not full leaderboards, not the current state of the art, not replicated by Why Humanoid?. Choose a mark or a model for its conditions and citation.</p></div>
<div class="panels">${pawPanel(atlas)}${piqPanel(atlas)}</div>
<div class="detail res-detail" id="res-detail" aria-live="polite" tabindex="-1" hidden></div>
</section>
${landscape(atlas)}
${compareSection(atlas)}
${observations(atlas)}
${resources(atlas)}
${method(atlas)}
<p class="atlas-error" id="atlas-error" hidden>The interactive views could not start. Every value, condition and source is still in the tables on this page.</p>
<script type="application/json" id="atlas-data">${data}</script>
</div>`;
}
