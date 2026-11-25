// Robot Learning Data Atlas (23 Nov 2026): the static HTML of /datasets/, built from data/datasets/atlas.json.
// Everything is readable without JavaScript (lanes, every quantity with its unit, qualifier and scope, every passport);
// assets/datasets.js adds the shared filters, highlighting, the scale switch, the comparison picker, the detail panel
// and shareable URL state on top of the same markup.
//
// Rules carried into the view (see server/src/data-atlas/atlas.js):
// - lanes are explicit origin categories, not coordinates; glyphs mark the resource class and always carry a label;
// - sizes are compared only inside a compatible group and unit, and the order by size is never a quality ranking;
// - more_than is drawn as an open-ended lower bound, approximate values say "about"; empty stays "not reported";
// - parts are stacked only when they add up exactly to the stated total; otherwise they are listed as reported;
// - aggregates, provider claims and training mixtures are set apart and out of the default view; nothing is summed.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const ext = (u, label) => `<a href="${esc(u)}" rel="noopener noreferrer">${esc(label ?? host(u))}</a>`;
const fmtDate = (d) => {
  if (!d) return 'not recorded';
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number);
  return `${day} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`;
};
export const fmtNum = (n) => Number(n).toLocaleString('en-GB', { maximumFractionDigits: 2 });
const compact = (n) => {
  const f = (v, s) => `${Number(v.toFixed(v < 10 ? 2 : 1)).toString()}${s}`;
  if (n >= 1e9) return f(n / 1e9, 'B');
  if (n >= 1e6) return f(n / 1e6, 'M');
  if (n >= 1e3) return f(n / 1e3, 'K');
  return String(Number(n.toFixed(2)));
};
const QUAL = { reported: '', approximate: 'about ', more_than: 'more than ' };
// "more than 1,000,000 trajectories", "about 350 hours", "139.4 hours"; empty stays "Not reported".
export const qText = (q) => (q.value === null ? 'Not reported' : `${QUAL[q.qualifier] ?? ''}${fmtNum(q.value)} ${q.unit ?? ''}`.trim());
const human = (s) => String(s ?? '').replace(/_/g, ' ');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const groupLabel = (g) => cap(human(g));
const LANE_OF_ORIGIN = { real_robot: 'robot', human_capture: 'human', simulation: 'synthetic', derived: 'synthetic', mixed: 'mixed' };

// ---------- glyphs: resource class shapes, always next to their label ----------
const SHAPES = {
  corpus: '<circle cx="8" cy="8" r="5.5" fill="currentColor"/>',
  aggregate: '<circle cx="6" cy="8" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10.5" cy="8" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  evaluation: '<path d="M8 2.2 13.8 8 8 13.8 2.2 8Z" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  assets: '<rect x="2.5" y="2.5" width="4.5" height="4.5" fill="currentColor"/><rect x="9" y="2.5" width="4.5" height="4.5" fill="currentColor"/><rect x="2.5" y="9" width="4.5" height="4.5" fill="currentColor"/><rect x="9" y="9" width="4.5" height="4.5" fill="none" stroke="currentColor" stroke-width="1.2"/>',
  mixture: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2.5A5.5 5.5 0 0 1 8 13.5Z" fill="currentColor"/>',
  service: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.2 1.6"/>',
};
const glyph = (shape) => `<svg class="gl gl-${esc(shape)}" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">${SHAPES[shape] ?? SHAPES.corpus}</svg>`;
const classOf = (atlas, r) => atlas.vocabulary.classes[r.resource_class] ?? { label: r.resource_class, shape: 'corpus' };

// ---------- helpers shared by passports ----------
const modsText = (atlas, r) => {
  if (r.modality_state && !r.modalities.length) return `<span class="na">${esc(atlas.vocabulary.modality_states[r.modality_state] ?? 'Not established')}</span>`;
  return r.modalities.map((m) => `<span class="chip${m.partial ? ' part' : ''}">${esc(atlas.vocabulary.modalities[m.key] ?? human(m.key))}${m.partial ? ' <small>subset only</small>' : ''}</span>`).join(' ');
};
const usesText = (atlas, r) => (r.learning_uses.length
  ? r.learning_uses.map((u) => esc(atlas.vocabulary.learning_uses.find((x) => x.key === u)?.label ?? u)).join(', ')
  : '<span class="na">Not recorded</span>');
const bodyText = (atlas, r) => {
  const fam = r.body_families.map((k) => atlas.vocabulary.body_families.find((f) => f.key === k)?.label).filter(Boolean);
  return `${esc(r.embodiment ?? 'Not recorded')}<br><small class="dim">${fam.length ? `Body family: ${esc(fam.join(', '))}` : 'Body family not classified from the recorded text'}</small>`;
};
const nameOf = (atlas, id) => atlas.resources.find((x) => x.id === id)?.name ?? id;
const lineageText = (atlas, r) => {
  const parts = [];
  if (r.parents.length) parts.push(`Built from: ${r.parents.map((p) => `<a href="#${esc(p)}" data-ds="${esc(p)}">${esc(nameOf(atlas, p))}</a>`).join(', ')}`);
  if (r.children.length) parts.push(`Included in: ${r.children.map((p) => `<a href="#${esc(p)}" data-ds="${esc(p)}">${esc(nameOf(atlas, p))}</a>`).join(', ')}`);
  return `${parts.join('<br>') || '<span class="na">No verified link recorded</span>'}<br><small class="dim">Lineage is incomplete: an empty entry does not mean there is no overlap with other resources.</small>`;
};
const benchText = (r) => (r.related_benchmarks.length
  ? `${r.related_benchmarks.map((b) => `<a href="/benchmarks/#${esc(b.id)}">${esc(b.name ?? b.id)}</a>`).join(', ')}<br><small class="dim">An associated evaluation resource, not a claim that the data trains for it.</small>`
  : '<span class="na">None linked</span>');
const licenceText = (r) => `${esc(r.license_note ?? 'Not recorded')}<br><small class="dim">${r.licence_stated ? 'Data terms named in the source summary; check the original terms.' : 'Data licence not established.'}</small>`;
const accessText = (atlas, r) => (r.access_status ? esc(atlas.vocabulary.access[r.access_status] ?? human(r.access_status)) : '<span class="na">Not established</span>');
const quantList = (atlas, r) => {
  const qs = atlas.quantities.filter((q) => q.dataset_id === r.id);
  if (!qs.length) return '<span class="na">No quantity extracted yet</span>';
  return `<ul class="ql">${qs.map((q) => `<li><b>${esc(qText(q))}</b> <span class="dim">· ${esc(human(q.metric))} · ${esc(q.scope ?? 'scope not recorded')}${q.part ? ' · part of the resource' : ''}${q.set_apart ? ` · ${esc(q.set_apart)}` : ''}</span></li>`).join('')}</ul>`;
};
const provText = (r) => `${r.source_url ? ext(r.source_url, 'Primary source') : '<span class="na">No source link</span>'}${r.source_locator ? ` · ${esc(r.source_locator)}` : ''}<br><small class="dim">Checked ${esc(fmtDate(r.checked_at))}. ${esc(r.review_status ?? '')}</small>`;

// The passport rows, in one order for the comparison table and the per-resource cards.
const PASSPORT = [
  ['Origin', (a, r) => `${esc(a.vocabulary.lanes.find((l) => l.key === r.lane)?.label)}<br><small class="dim">Data origin as recorded: ${esc(a.vocabulary.origins[r.data_origin] ?? r.data_origin)}</small>`],
  ['Resource', (a, r) => `${glyph(classOf(a, r).shape)} ${esc(classOf(a, r).label)}`],
  ['Body', bodyText],
  ['Modalities', modsText],
  ['Capture', (a, r) => esc(r.capture_method ?? 'Not recorded')],
  ['Format', (a, r) => esc(r.data_format ?? 'Not recorded')],
  ['Access', accessText],
  ['Licence', (a, r) => licenceText(r)],
  ['Release', (a, r) => esc(r.version_scope ?? 'Not recorded')],
  ['Quantities', quantList],
  ['Learning uses', usesText],
  ['Lineage', lineageText],
  ['Benchmarks', (a, r) => benchText(r)],
  ['Limitations', (a, r) => esc(r.limitations ?? 'None recorded')],
  ['Provenance', (a, r) => provText(r)],
];

// ---------- header ----------
function head(atlas, c) {
  const n = atlas.counts;
  return `<header class="atlas-head">
<p class="kicker">Category ${c.index} of ${c.total} · Datasets${c.badge ?? ''}</p>
<h1>Robot Learning Data Atlas</h1>
<p class="lede">${esc(atlas.subtitle)}</p>
<p class="ask">Not which dataset is biggest, but what experience exists for a learning problem: on which bodies, with which supervision and under which access conditions.</p>
<dl class="atlas-counts ds-counts">
<div><dt>Data resources</dt><dd>${n.resources}</dd></div>
<div><dt>Corpora</dt><dd>${n.corpora}</dd></div>
<div><dt>With reported quantities</dt><dd>${n.resources_with_quantities}</dd></div>
<div><dt>Quantity records</dt><dd>${n.quantities}</dd></div>
<div><dt>Awaiting extraction</dt><dd>${n.resources_awaiting_quantities}</dd></div>
</dl>
<p class="prov">Data as of ${esc(fmtDate(atlas.snapshot.exported_at))}. Quantities are transcribed from public sources as stated, not independently counted. Collections overlap, so nothing is summed across resources.</p>
<nav class="views" aria-label="Atlas views"><a href="#origins">Origins and uses</a><a href="#scale">Scale</a><a href="#passports">Data passports</a><a href="#matrix">Modality matrix</a><a href="#resources">All ${n.resources} resources</a><a href="#method">Method</a></nav>
</header>`;
}

// ---------- shared filters (enabled by assets/datasets.js) ----------
function filters(atlas) {
  const count = (pred) => atlas.resources.filter(pred).length;
  const opt = (v, label, n) => `<option value="${esc(v)}">${esc(label)} (${n})</option>`;
  const mods = Object.entries(atlas.vocabulary.modalities).map(([k, l]) => [k, l, count((r) => r.modalities.some((m) => m.key === k))]).sort((a, z) => z[2] - a[2] || a[1].localeCompare(z[1]));
  const bodies = atlas.vocabulary.body_families.map((f) => [f.key, f.label, count((r) => r.body_families.includes(f.key))]).filter((x) => x[2]);
  const uses = atlas.vocabulary.learning_uses.map((u) => [u.key, u.label, count((r) => r.learning_uses.includes(u.key))]).sort((a, z) => z[2] - a[2] || a[1].localeCompare(z[1]));
  const lanes = atlas.vocabulary.lanes.map((l) => [l.key, l.label, count((r) => r.lane === l.key)]);
  const sel = (id, label, all, list) => `<label class="fsel"><span class="fl">${label}</span><select id="${id}" data-f="${id.slice(2)}"><option value="">${all}</option>${list.map(([k, l, n]) => opt(k, l, n)).join('')}</select></label>`;
  return `<section class="ds-filters" id="filters" aria-labelledby="filters-h" hidden>
<h2 class="sr" id="filters-h">Filters shared by every view</h2>
<p class="fl fpre">Ask a question of the data</p>
<div class="presets" role="group" aria-label="Example questions">
<button type="button" class="preset" data-q="body=dual_arm&amp;mod=tactile">Bimanual with tactile data</button>
<button type="button" class="preset" data-q="lane=human&amp;mod=hand_pose">Human hand-pose supervision</button>
<button type="button" class="preset" data-q="body=humanoid">Humanoid bodies</button>
<button type="button" class="preset" data-q="lane=robot&amp;mod=language">Robot data with language</button>
<button type="button" class="preset" data-q="lane=synthetic&amp;mod=action">Synthetic data with robot actions</button>
</div>
<div class="fgrid">
${sel('f-mod', 'Modality', 'Any modality', mods)}
${sel('f-body', 'Body family', 'Any body', bodies)}
${sel('f-use', 'Learning use', 'Any use', uses)}
${sel('f-lane', 'Origin', 'Any origin', lanes)}
<button type="button" class="clear-f" id="f-clear">Clear</button>
</div>
<p class="fstat" id="f-stat" role="status" aria-live="polite"></p>
</section>`;
}

// ---------- view 1: origins and uses ----------
function origins(atlas) {
  const lanes = atlas.vocabulary.lanes.map((l) => {
    const rs = atlas.resources.filter((r) => r.lane === l.key);
    if (!rs.length) return '';
    const tiles = rs.map((r) => {
      const k = classOf(atlas, r);
      const data = `data-ds="${esc(r.id)}" data-lane="${esc(r.lane)}" data-mods="${esc(r.modalities.map((m) => (m.partial ? `${m.key}~` : m.key)).join(' '))}" data-mstate="${esc(r.modality_state ?? '')}" data-body="${esc(r.body_families.join(' '))}" data-uses="${esc(r.learning_uses.join('|'))}"`;
      return `<li><a class="dtile s-${esc(k.shape)}" href="#${esc(r.id)}" ${data}>${glyph(k.shape)}<span class="tn">${esc(r.name)}</span><span class="tk">${esc(k.label)}${r.quantities ? ` · ${r.quantities} quantit${r.quantities === 1 ? 'y' : 'ies'}` : ' · no quantity yet'}</span><span class="mt" aria-live="off"></span></a></li>`;
    }).join('');
    return `<section class="lane" data-lane="${esc(l.key)}" aria-labelledby="lane-${esc(l.key)}">
<header class="lane-h"><h3 id="lane-${esc(l.key)}">${esc(l.label)} <span class="cn">${rs.length}</span></h3><p>${esc(l.note)}</p></header>
<ul class="dtiles">${tiles}</ul></section>`;
  }).join('');
  const shapes = [...new Map(Object.values(atlas.vocabulary.classes).map((v) => [v.shape, v])).keys()];
  const legend = shapes.map((s) => `<li>${glyph(s)} ${esc(Object.values(atlas.vocabulary.classes).filter((v) => v.shape === s).map((v) => v.label).join(' or '))}</li>`).join('');
  return `<section class="atlas-sec" id="origins" aria-labelledby="origins-h">
<div class="sec-h"><h2 id="origins-h">Origins and uses</h2>
<p>Each resource sits in the lane of its recorded data origin. The shape marks what kind of resource it is. Use the filters to highlight resources by modality, body family or learning use; a dashed outline means the modality covers only a subset.</p></div>
<ul class="gl-legend" aria-label="Resource kinds">${legend}</ul>
<div class="land ds-land">
<div class="lanes">${lanes}</div>
<aside class="detail" id="ds-detail" tabindex="-1" aria-live="polite" aria-label="Selected resource"><p class="hint">Select a resource to read its data passport here. Every passport is also listed under <a href="#resources">All resources</a>.</p></aside>
</div></section>`;
}

// ---------- view 2: scale in compatible groups ----------
function niceMax(max) {
  const p = 10 ** Math.floor(Math.log10(max));
  const m = max / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}
function panel(atlas, group, rows, { apart = false } = {}) {
  const unit = rows[0].unit;
  const max = Math.max(...rows.map((q) => q.value));
  const min = Math.min(...rows.map((q) => q.value));
  const nm = niceMax(max);
  let hi = Math.ceil(Math.log10(max));
  let lo = Math.floor(Math.log10(min));
  if (hi === lo) lo = hi - 1;
  if (hi - lo > 6) lo = hi - 6;
  const lin = (v) => Math.max(1.5, (v / nm) * 100);
  const log = (v) => Math.max(1.5, ((Math.log10(Math.max(v, 10 ** lo)) - lo) / (hi - lo)) * 100);
  const w = (v) => `--lin:${lin(v).toFixed(2)}%;--log:${log(v).toFixed(2)}%`;
  const ticksLin = [0, nm / 2, nm].map((t) => `<span style="left:${((t / nm) * 100).toFixed(2)}%">${compact(t)}</span>`).join('');
  const ticksLog = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((e) => `<span style="left:${(((e - lo) / (hi - lo)) * 100).toFixed(2)}%">${compact(10 ** e)}</span>`).join('');
  const sorted = [...rows].sort((a, z) => z.value - a.value);
  const items = sorted.map((q) => {
    const r = atlas.resources.find((x) => x.id === q.dataset_id);
    const parts = atlas.quantities.filter((p) => p.part && p.dataset_id === q.dataset_id && p.metric === q.metric && p.unit === q.unit && p.data_origin === q.data_origin && p.value !== null);
    let comp = '';
    if (parts.length) {
      const sum = parts.reduce((s, p) => s + p.value, 0);
      const exact = Math.abs(sum - q.value) < 1e-9 && parts.every((p) => p.qualifier !== 'more_than');
      if (exact) {
        comp = `<div class="stack" role="img" aria-label="${esc(`Split of ${qText(q)}: ${parts.map((p) => `${p.scope} ${qText(p)}`).join(', ')}`)}" style="${w(q.value)}">${parts.map((p) => `<span class="seg" style="flex:${p.value} 0 0"></span>`).join('')}</div>
<p class="parts">Split as reported: ${parts.map((p) => `<b>${esc(qText(p))}</b> ${esc(p.scope ?? '')}`).join(' + ')} = ${esc(qText(q))}.</p>`;
      } else if (sum > q.value) {
        comp = `<p class="parts">Parts reported separately: ${parts.map((p) => `<b>${esc(qText(p))}</b> ${esc(p.scope ?? '')}`).join('; ')}. They sum to ${esc(fmtNum(sum))} ${esc(unit)}, while the source states ${esc(qText(q))} in total; both are kept as reported.</p>`;
      } else {
        comp = `<p class="parts">Subsets of this total, not additions: ${parts.map((p) => `<b>${esc(qText(p))}</b> ${esc(p.scope ?? '')}`).join('; ')}.</p>`;
      }
    }
    return `<li class="sr-row" data-ds="${esc(q.dataset_id)}" data-v="${q.value}" data-n="${esc(r?.name ?? '')}">
<button type="button" class="sn" data-ds="${esc(q.dataset_id)}">${esc(r?.name ?? q.dataset_id)}</button>
<div class="sbar"><span class="bar q-${esc(q.qualifier)}${apart ? ' apart' : ''}" style="${w(q.value)}"></span></div>
<p class="sl"><b>${esc(qText(q))}</b> <span class="dim">· ${esc(q.scope ?? 'scope not recorded')} · ${esc(atlas.vocabulary.release_statuses[q.release_status] ?? human(q.release_status))}${q.data_version ? ` · ${esc(q.data_version)}` : ''}</span></p>
${comp}</li>`;
  }).join('');
  return `<article class="spanel${apart ? ' apart' : ''}" data-group="${esc(group)}" aria-labelledby="g-${esc(group)}">
<header><h4 id="g-${esc(group)}">${esc(groupLabel(group))}</h4><p class="dim">Unit: ${esc(unit)} · ${rows.length} resource${rows.length === 1 ? '' : 's'}${apart ? ` · ${esc(rows[0].set_apart)}` : ''}</p></header>
<div class="saxis" aria-hidden="true"><div class="ax-lin">${ticksLin}</div><div class="ax-log">${ticksLog}</div></div>
<ol class="srows">${items}</ol></article>`;
}
function scale(atlas) {
  const scaled = atlas.quantities.filter((q) => q.scale && q.value !== null);
  const whole = scaled.filter((q) => !q.part);
  const byGroup = (qs) => {
    const m = new Map();
    for (const q of qs) { if (!m.has(q.comparison_group)) m.set(q.comparison_group, []); m.get(q.comparison_group).push(q); }
    return m;
  };
  const open = byGroup(whole.filter((q) => !q.set_apart));
  const apart = byGroup(whole.filter((q) => q.set_apart));
  // Parts with no whole of the same metric and unit in the same resource: listed, never drawn against each other.
  const orphans = scaled.filter((q) => q.part && !whole.some((t) => t.dataset_id === q.dataset_id && t.metric === q.metric && t.unit === q.unit && t.data_origin === q.data_origin));
  const lanes = atlas.vocabulary.lanes.map((l) => {
    const groups = [...open].filter(([, qs]) => LANE_OF_ORIGIN[qs[0].data_origin] === l.key);
    const orph = orphans.filter((q) => LANE_OF_ORIGIN[q.data_origin] === l.key);
    const inLane = atlas.resources.filter((r) => r.lane === l.key);
    const missing = inLane.filter((r) => !scaled.some((q) => q.dataset_id === r.id));
    if (!groups.length && !orph.length && !missing.length) return '';
    const orphHtml = orph.length ? `<article class="spanel orph" aria-labelledby="orph-${esc(l.key)}"><header><h4 id="orph-${esc(l.key)}">Subsets reported without a matching total</h4><p class="dim">Different units or no stated whole: listed, not drawn against each other or summed.</p></header>
<ul class="ql">${orph.map((q) => `<li><button type="button" class="sn" data-ds="${esc(q.dataset_id)}">${esc(nameOf(atlas, q.dataset_id))}</button> <b>${esc(qText(q))}</b> <span class="dim">· ${esc(q.scope ?? '')}${q.data_origin === 'derived' ? ' · derived data' : ''}</span></li>`).join('')}</ul></article>` : '';
    const miss = missing.length ? `<p class="miss"><b>No size extracted yet</b> for ${missing.length} of ${inLane.length} resources in this lane: ${missing.map((r) => `<a href="#${esc(r.id)}" data-ds="${esc(r.id)}">${esc(r.name)}</a>`).join(', ')}.</p>` : '';
    return `<section class="slane" aria-labelledby="sl-${esc(l.key)}"><h3 id="sl-${esc(l.key)}">${esc(l.label)}</h3>
<div class="spanels">${groups.map(([g, qs]) => panel(atlas, g, qs)).join('')}${orphHtml}</div>${miss}</section>`;
  }).join('');
  const apartHtml = [...apart].map(([g, qs]) => panel(atlas, g, qs, { apart: true })).join('');
  return `<section class="atlas-sec" id="scale" aria-labelledby="scale-h" data-scale="lin">
<div class="sec-h"><h2 id="scale-h">Scale, in compatible groups</h2>
<p>Each panel holds one kind of quantity in one unit, with its scope at every mark. Panels are never compared with each other, hours are never converted to episodes, and nothing is added up across resources. Within a panel, rows are ordered by reported size: size is not quality.</p></div>
<div class="ctl sctl" role="group" aria-label="Scale options">
<fieldset><legend>Axis</legend><label><input type="radio" name="sc" value="lin" checked> Linear</label><label><input type="radio" name="sc" value="log"> Logarithmic</label></fieldset>
<fieldset><legend>Order</legend><label><input type="radio" name="so" value="size" checked> Reported size</label><label><input type="radio" name="so" value="name"> Name</label></fieldset>
</div>
<ul class="fine skey"><li><span class="kb q-more_than" aria-hidden="true"></span> <b>More than</b>: a lower bound; the open end means the true size can be larger.</li><li><span class="kb q-approximate" aria-hidden="true"></span> <b>About</b>: an approximate figure.</li><li><span class="kb q-reported" aria-hidden="true"></span> <b>As reported</b>: the figure the source states.</li></ul>
${lanes}
<details class="apart-box" id="set-apart"><summary>Set apart: aggregates, provider claims and training mixtures <span class="cn">${[...apart.values()].flat().length}</span></summary>
<p class="dim">These figures overlap their sources, describe a provider's supply or a model's training mixture. They are kept out of the default view and are not open-corpus sizes.</p>
<div class="spanels">${apartHtml}</div></details>
</section>`;
}

// ---------- view 3: data passports and questions ----------
// Default comparison: in each of the robot, human and synthetic lanes, the corpus with the most reported quantities
// (workbook order breaks ties). A starting point for reading passports side by side, not a recommendation.
export const DEFAULT_COMPARE = (atlas) => ['robot', 'human', 'synthetic'].map((lane) => atlas.resources
  .filter((r) => r.lane === lane && r.resource_class === 'corpus' && r.quantities > 0)
  .reduce((best, r) => (!best || r.quantities > best.quantities ? r : best), null)?.id).filter(Boolean);
function compareTable(atlas, ids) {
  const rs = ids.map((id) => atlas.resources.find((r) => r.id === id)).filter(Boolean);
  return `<table class="pp"><caption class="sr">Data passports compared side by side</caption>
<thead><tr><th scope="col" class="pk">Field</th>${rs.map((r) => `<th scope="col" data-ds="${esc(r.id)}"><a href="#${esc(r.id)}" data-ds="${esc(r.id)}">${esc(r.name)}</a></th>`).join('')}</tr></thead>
<tbody>${PASSPORT.map(([label, fn]) => `<tr><th scope="row" class="pk">${esc(label)}</th>${rs.map((r) => `<td>${fn(atlas, r)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function passports(atlas) {
  const ids = DEFAULT_COMPARE(atlas);
  const options = (sel) => `<option value="">None</option>${[...atlas.resources].sort((a, z) => a.name.localeCompare(z.name)).map((r) => `<option value="${esc(r.id)}"${r.id === sel ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}`;
  return `<section class="atlas-sec" id="passports" aria-labelledby="pp-h">
<div class="sec-h"><h2 id="pp-h">Data passports</h2>
<p>Compare resources across origin, body, modalities, capture, format, access, licence, release, quantity definitions and provenance. Answers to a question list known matches, partial matches and unknowns separately. There is no recommendation score.</p></div>
<div class="query" id="query" hidden>
<h3>Answers to the current filters</h3>
<p class="dim" id="q-none">Choose an example question or a filter above to list matching resources.</p>
<div class="qcols" id="q-out"></div>
</div>
<div class="pick" role="group" aria-label="Resources to compare">
${[0, 1, 2].map((i) => `<label><span class="fl">Resource ${i + 1}</span><select class="cmp-s" data-i="${i}">${options(ids[i])}</select></label>`).join('')}
</div>
<div class="pp-wrap" role="region" aria-label="Passport comparison table, scrolls sideways on small screens" tabindex="0" id="pp-out">${compareTable(atlas, ids)}</div>
</section>`;
}

// ---------- secondary: modality matrix ----------
function matrix(atlas) {
  const mods = Object.entries(atlas.vocabulary.modalities);
  const rows = atlas.vocabulary.lanes.map((l) => {
    const rs = atlas.resources.filter((r) => r.lane === l.key);
    if (!rs.length) return '';
    return `<tr class="mlane"><th scope="rowgroup" colspan="${mods.length + 1}">${esc(l.label)}</th></tr>${rs.map((r) => `<tr data-ds="${esc(r.id)}"><th scope="row"><a href="#${esc(r.id)}" data-ds="${esc(r.id)}">${esc(r.name)}</a>${r.modality_state && !r.modalities.length ? ` <small class="dim">(${esc(atlas.vocabulary.modality_states[r.modality_state])})</small>` : ''}</th>${mods.map(([k, label]) => {
      const m = r.modalities.find((x) => x.key === k);
      return m ? `<td class="${m.partial ? 'mp' : 'mf'}"><span class="mk" aria-hidden="true"></span><span class="sr">${esc(label)}: ${m.partial ? 'subset only' : 'yes'}</span></td>` : '<td></td>';
    }).join('')}</tr>`).join('')}`;
  }).join('');
  return `<section class="atlas-sec" id="matrix" aria-labelledby="mx-h">
<div class="sec-h"><h2 id="mx-h">Modality matrix</h2>
<p>Which recorded signals each resource carries. <span class="mkey"><span class="mk mf" aria-hidden="true"></span> recorded · <span class="mk mp" aria-hidden="true"></span> only in a subset · blank: not recorded in the catalogue</span>. On small screens the table scrolls sideways; each resource's modalities are also listed in its passport below.</p></div>
<div class="mx-wrap" role="region" aria-label="Modality matrix, scrolls sideways" tabindex="0">
<table class="mx"><caption class="sr">Modalities by resource</caption><thead><tr><th scope="col" class="mxn">Resource</th>${mods.map(([, label]) => `<th scope="col"><span>${esc(label)}</span></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
</section>`;
}

// ---------- every resource: stable anchors /datasets/#<dataset id> ----------
function resources(atlas) {
  const cards = atlas.resources.map((r) => {
    const k = classOf(atlas, r);
    return `<details class="res-card" id="${esc(r.id)}" data-ds="${esc(r.id)}">
<summary>${glyph(k.shape)}<span class="rn">${esc(r.name)}</span><span class="rc">${esc(k.label)}</span></summary>
<div class="res-body">
<p class="d-d">${esc(r.description ?? '')}</p>
${r.key_takeaway ? `<p class="d-f"><b>Takeaway:</b> ${esc(r.key_takeaway)}</p>` : ''}
<dl class="d-kv">${PASSPORT.map(([label, fn]) => `<dt>${esc(label)}</dt><dd>${fn(atlas, r)}</dd>`).join('')}<dt>Link</dt><dd>${r.url ? ext(r.url) : '<span class="na">Not recorded</span>'}</dd></dl>
<p class="perma"><a href="/datasets/#${esc(r.id)}">Permalink</a> · <button type="button" class="add-cmp" data-ds="${esc(r.id)}">Add to comparison</button></p>
</div></details>`;
  }).join('');
  return `<section class="atlas-sec" id="resources" aria-labelledby="res-h">
<div class="sec-h"><h2 id="res-h">All ${atlas.resources.length} resources</h2><p>Every resource in the catalogue with its full data passport, in catalogue order. Each has a permanent address on this page.</p></div>
<div class="res-list">${cards}</div></section>`;
}

function method(atlas) {
  return `<section class="atlas-sec atlas-method" id="method" aria-labelledby="m-h">
<div class="sec-h"><h2 id="m-h">Method and limits</h2><p>${esc(atlas.note)}</p></div>
<div class="cols">
<div><h3>Categories, not coordinates</h3><ul class="fine">
<li>Lanes follow the recorded data origin: robot-recorded, human observation and motion, synthetic or retargeted, environment assets, mixed, and not established.</li>
<li>The kind of resource (corpus, aggregate, collection, evaluation data, environment assets, training mixture, commercial service, search portal) comes from its recorded class.</li>
<li>Body families are derived from the recorded embodiment text by explicit rules; a text they do not cover stays unclassified.</li>
<li>A modality marked "subset only" is carried by part of the resource, not all of it.</li></ul></div>
<div><h3>Reading the quantities</h3><ul class="fine">
<li>"More than" is a lower bound and "about" is approximate. An empty value is unknown, never zero; an empty date is unknown.</li>
<li>Groups are editorial aids. Hz and fps can describe different streams; no duration is inferred from frames or rates.</li>
<li>A quantity can have its own origin: a mainly real-robot resource can report a separate simulated subset.</li>
<li>Aggregates, provider claims and training mixtures are set apart and excluded from the default view.</li></ul></div>
<div><h3>Overlap, access and evaluation</h3><ul class="fine">
<li>Lineage is incomplete: only verified links are shown, and an empty entry does not mean there is no overlap. Overlapping collections are never summed.</li>
<li>Access and licence notes summarise the public pages; a code licence is not a data licence. Check the original terms before use.</li>
<li>A benchmark link means an associated evaluation resource, not a training claim. Evaluation data is listed apart from training data in answers.</li>
<li>Editorial aid, not a requirement: a common way to think about mixing data is a pyramid, with broad human and web video at the base, simulated and retargeted data in the middle and smaller amounts of robot-recorded data with actions at the top. It carries no numerical thresholds.</li></ul></div>
</div></section>`;
}

export function renderDataAtlas(atlas, c) {
  const json = JSON.stringify({ resources: atlas.resources.map((r) => ({ id: r.id, name: r.name, lane: r.lane, mods: r.modalities, mstate: r.modality_state, body: r.body_families, uses: r.learning_uses, evaluation: r.evaluation, cls: r.resource_class })), vocabulary: { lanes: atlas.vocabulary.lanes.map(({ key, label }) => ({ key, label })), modalities: atlas.vocabulary.modalities, body_families: atlas.vocabulary.body_families, learning_uses: atlas.vocabulary.learning_uses } }).replace(/</g, '\\u003c');
  return `<div class="atlas data-atlas" id="atlas">
${head(atlas, c)}
<p class="ds-loading" id="ds-loading">Interactive filters load with the page. Every resource, quantity and passport below is readable without them.</p>
${filters(atlas)}
${origins(atlas)}
${scale(atlas)}
${passports(atlas)}
${matrix(atlas)}
${resources(atlas)}
${method(atlas)}
<p class="atlas-error" id="atlas-error" role="alert" hidden>The interactive views could not start. Every resource, quantity and passport is still listed on this page.</p>
<script type="application/json" id="data-atlas">${json}</script>
</div>`;
}
