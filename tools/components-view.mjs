// Components explorer (23 Nov 2026; complete public listing since 24 Nov 2026): the static HTML of /components/ and of
// every product address, built from the public summary of every product (data/preview/hardware.json and
// component-software.json: the fields of server/src/access/fields.js), the coverage counts
// (data/components/coverage.json) and the reviewed public makers (tools/components-makers.json). The product view
// comes from assets/components-core.js, the same code the browser runs for subscribers: public rows carry
// _summary: true, so every paid field says "With the subscription" instead of pretending the source lacks it.
//
// Nothing beyond the public fields reaches these pages: the full passports render only after sign-in
// (assets/components.js asks the API with the visitor's own session, and the server checks the subscription).

import { readFileSync } from 'node:fs';
import { componentsCore } from './export-components.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const W = componentsCore();
const esc = W.esc;

// Organisations of the public products that are not this tool's to decide: a reviewed file, public products only.
export function componentsModel() {
  const hw = read('data/preview/hardware.json');
  const sw = read('data/preview/component-software.json');
  const index = read('data/preview/index.json').tabs;
  const coverage = read('data/components/coverage.json');
  const cfg = read('tools/components-makers.json');
  // Public summaries: flagged so the shared renderer marks every absent paid field as such.
  const products = hw.rows.map((r) => ({ ...r, _summary: true }));
  const software = sw.rows.map((r) => ({ ...r, _summary: true }));
  const publicIds = new Set([...products, ...software].map((r) => r.component_id));
  for (const id of Object.keys(cfg.makers)) if (!publicIds.has(id)) throw new Error(`tools/components-makers.json names ${id}, which is not a public Components row`);
  for (const r of [...products, ...software]) if (!cfg.makers[r.component_id]?.length) throw new Error(`tools/components-makers.json has no reviewed maker for public product ${r.component_id} (${r.name})`);
  for (const rel of cfg.related) if (!publicIds.has(rel.from) || !publicIds.has(rel.to)) throw new Error(`tools/components-makers.json: related ${rel.from} -> ${rel.to} is not between public rows`);
  for (const id of publicIds) if (![...coverage.ids.products, ...coverage.ids.software].includes(id)) throw new Error(`coverage.json does not list public row ${id}`);
  const meta = index.find((t) => t.id === 'hardware');
  return { products, software, coverage, makers: cfg.makers, related: cfg.related, snapshot: meta?.snapshot ?? hw.snapshot, total: coverage.counts.products };
}

const makersHtml = (cm, id, companyPath) => (cm.makers[id] ?? []).map((m) => {
  const path = companyPath(m.name);
  return `${path ? `<a href="${path}">${esc(m.name)}</a>` : esc(m.name)} <small>(${esc(m.role)})</small>`;
}).join(', ');

const fmtDay = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'not recorded' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

// Families: the researched ones from the counts, then the families this release has not researched (coverage gaps,
// never entries).
// Since 26 Nov 2026 the families are the controlled COMPONENT_CLASS vocabulary: a family without entries is a gap.
const famCounts = (cm) => cm.coverage.counts.by_component_class ?? Object.fromEntries(Object.entries(cm.coverage.counts.by_family).map(([f, k]) => [W.familyOf({ family: f }), k]));
const plural = (k, n) => (n === 1 ? W.FAMILIES[k]?.label ?? W.familyLabel(k) : W.FAMILIES[k]?.plural ?? W.familyLabel(k)).toLowerCase();
const reviewLine = (cm) => {
  const r = cm.coverage.counts.by_review ?? { pending: cm.coverage.counts.products };
  const n = cm.coverage.counts.products;
  const checked = (r.checked ?? 0) + (r.partial ?? 0);
  if (!checked) return `<span class="ev ev-pending">Research compilation · original sources still being reviewed</span> Every record comes from one research compilation. Its individual claims have not yet been checked against their original sources.`;
  const parts = [r.checked ? `${r.checked} checked against their primary sources` : null, r.partial ? `${r.partial} checked for their identity and selected figures only, with the rest of their imported claims still pending` : null, r.pending ? `${r.pending} still imported research awaiting review` : null].filter(Boolean);
  return `<span class="ev ev-partial">${checked} of ${n} checked against primary sources</span> Of the ${n} records, ${parts.join('; ')}. Each passport states its own review scope and date. A figure checked against the maker's document is the maker's statement, not an independent test.`;
};

function head(cm, c) {
  const n = cm.coverage.counts;
  const cls = (k) => n.by_class[k] ?? 0;
  const pub = cm.products.length;
  return `<header class="cx-head">
<p class="kicker">Category ${c.index} of ${c.total} · Components${c.badge}</p>
<h1>Components</h1>
<p class="lede">The building blocks of embodied intelligence.</p>
<p class="ask">What each part does, how it is specified and what constrains it: ${W.FAMILY_ORDER.filter((k) => famCounts(cm)[k]).map((k) => `${famCounts(cm)[k]} ${esc(plural(k, famCounts(cm)[k]))}`).join(', ')}. Families without entries are listed as gaps, not filled in.</p>
<dl class="cx-counts">
<div><dt>Physical products</dt><dd>${n.products}</dd></div>
<div><dt>Commercial</dt><dd>${cls('commercial')}</dd><small>${cls('early_access')} more in early access</small></div>
<div><dt>Research or open hardware</dt><dd>${cls('research')}</dd></div>
<div><dt>Discontinued</dt><dd>${cls('discontinued')}</dd></div>
<div><dt>Related software</dt><dd>${n.software}</dd><small>not counted as hardware</small></div>
<div><dt>Families covered</dt><dd>${W.FAMILY_ORDER.filter((k) => famCounts(cm)[k]).length}</dd><small>of ${W.FAMILY_ORDER.length} in the vocabulary</small></div>
<div><dt>Source references</dt><dd>${n.references}</dd><small>entries, not all independent</small></div>
</dl>
<p class="cx-ev">${reviewLine(cm)} Values are shown as the sources state them.</p>
<p class="cx-access" id="cx-access" data-public="${pub}" data-total="${n.products}"><b>All ${n.products} products</b> are listed with a public summary: family, maker, country, year, status, what the part does, the kind of evidence behind its record and the main source. The full technical passports (every specification with its unit, conditions, source and check date, integration requirements, limitations, prices and the source of each claim) and the side-by-side comparison of figures come with the <a href="/subscribe/">subscription</a>.</p>
<nav class="views" aria-label="Components views"><a href="#explore">Explore</a><a href="#families">Families</a><a href="#catalogue">Catalogue</a><a href="#approaches">Touch sensing approaches</a><a href="#compare">Compare</a><a href="#software">Related software</a><a href="#method">Coverage and method</a></nav>
</header>`;
}

// The five functional areas of the explorer (27 Nov 2026, Javier via Codex): each groups families of the reviewed
// vocabulary (W.FAMILIES); counts come from the catalogue's coverage counts at build time, never from a list here.
export const EXPLORER_AREAS = Object.freeze([
  { key: 'perception', label: 'Perception', sub: 'Vision and depth sensors', families: ['vision_sensor'],
    text: 'Cameras and depth sensors that let the robot see its surroundings and the objects it handles.' },
  { key: 'manipulation', label: 'Manipulation and touch', sub: 'Hands, grippers and tactile sensors', families: ['dexterous_hand', 'gripper', 'tactile_sensor', 'tactile_hand'],
    text: 'Hands and grippers that hold and use objects, and the tactile sensors that feel contact.' },
  { key: 'motion', label: 'Motion and feedback', sub: 'Actuators, reducers, bearings, encoders, force-torque sensing and controllers', families: ['actuator', 'motor_drive', 'reducer', 'bearing', 'encoder', 'force_torque_sensor', 'motion_controller'],
    text: 'Actuators, motors, drives, reducers and bearings that move and carry each joint; encoders, force-torque sensors and controllers that measure the motion and close the loop.' },
  { key: 'compute', label: 'Onboard compute', sub: 'Compute modules', families: ['compute_module'],
    text: 'The processors that run perception, planning and control on the robot itself.' },
  { key: 'energy', label: 'Energy', sub: 'Cells, battery parts and power electronics', families: ['power_battery'],
    text: 'Cells, battery parts and power electronics that store and supply the robot\'s energy.' },
]);

// An original, schematic humanoid: one shape group per area. Pointer and touch select an area; the labelled HTML
// buttons beside it are the keyboard and screen-reader controls, so the drawing itself takes no focus.
const explorerSvg = () => `<svg class="hx-fig" viewBox="0 0 220 400" role="img" aria-labelledby="hx-fig-t" focusable="false">
<title id="hx-fig-t">Schematic humanoid marking five functional areas: perception at the head, manipulation and touch at the hands, motion and feedback at the joints, onboard compute in the chest and energy in the torso</title>
<g class="hx-body" aria-hidden="true">
<path d="M110 74 L110 92"/><rect x="74" y="92" width="72" height="128" rx="18"/>
<path d="M74 104 L48 150 L40 206"/><path d="M146 104 L172 150 L180 206"/>
<path d="M90 220 L86 292 L84 366"/><path d="M130 220 L134 292 L136 366"/>
<path d="M70 372 L96 372"/><path d="M124 372 L150 372"/>
</g>
<g class="hx-z" data-area="perception"><rect x="84" y="20" width="52" height="56" rx="20"/><path class="hx-d" d="M94 46 L126 46"/></g>
<g class="hx-z" data-area="manipulation"><circle cx="38" cy="218" r="13"/><circle cx="182" cy="218" r="13"/></g>
<g class="hx-z" data-area="motion"><circle cx="76" cy="104" r="8"/><circle cx="144" cy="104" r="8"/><circle cx="48" cy="150" r="7"/><circle cx="172" cy="150" r="7"/><circle cx="90" cy="220" r="8"/><circle cx="130" cy="220" r="8"/><circle cx="86" cy="292" r="7"/><circle cx="134" cy="292" r="7"/><circle cx="84" cy="362" r="6"/><circle cx="136" cy="362" r="6"/></g>
<g class="hx-z" data-area="compute"><rect x="94" y="112" width="32" height="30" rx="3"/><path class="hx-d" d="M100 120 L120 120 M100 127 L120 127 M100 134 L114 134"/></g>
<g class="hx-z" data-area="energy"><rect x="92" y="156" width="36" height="48" rx="4"/><path class="hx-d" d="M104 152 L116 152"/></g>
</svg>`;

function explorer(cm) {
  const counts = famCounts(cm);
  const panel = (a) => {
    const fams = a.families.map((k) => {
      const n = counts[k] ?? 0;
      return n
        ? `<li><a href="/components/?fam=${k}#catalogue"><b>${n}</b><span>${esc(W.FAMILIES[k][n === 1 ? 'label' : 'plural'])}</span></a></li>`
        : `<li class="gap"><b aria-hidden="true">–</b><span>${esc(W.FAMILIES[k].plural)}</span><small>No entries yet</small></li>`;
    }).join('');
    const total = a.families.reduce((s, k) => s + (counts[k] ?? 0), 0);
    return `<div class="hx-p" id="hx-p-${a.key}" data-area="${a.key}" role="region" aria-labelledby="hx-h-${a.key}">
<h3 id="hx-h-${a.key}">${esc(a.label)} <small>${total} ${total === 1 ? 'product' : 'products'}</small></h3>
<p>${esc(a.text)}</p>
<ul class="hx-fams">${fams}</ul></div>`;
  };
  return `<section class="hx" id="explore" aria-labelledby="hx-h">
<div class="sec-h"><h2 id="hx-h">Explore the building blocks of a humanoid</h2>
<p>Choose an area to see its component families in the catalogue, with the number of products recorded in each. Each family opens the filtered catalogue, its passports and the comparison.</p></div>
<div class="hx-grid">
<div class="hx-art">${explorerSvg()}</div>
<div class="hx-ui">
<div class="hx-ctl" role="group" aria-label="Functional areas">
${EXPLORER_AREAS.map((a) => `<button type="button" class="hx-b" data-area="${a.key}" aria-controls="hx-p-${a.key}" aria-pressed="false"><span class="hx-bl">${esc(a.label)}</span><span class="hx-bs">${esc(a.sub)}</span></button>`).join('\n')}
</div>
<div class="hx-ps">${EXPLORER_AREAS.map(panel).join('\n')}</div>
</div></div>
<p class="hx-note">A functional overview, not the design of any robot: where each part sits varies from one robot to another, and a product listed here is shown neither to be compatible with nor to be used in any particular robot.</p>
</section>`;
}

function families(cm) {
  const counts = famCounts(cm);
  const on = W.FAMILY_ORDER.filter((k) => counts[k]);
  const gaps = W.FAMILY_ORDER.filter((k) => !counts[k]);
  return `<section class="cx-fam" id="families" aria-labelledby="fam-h"><h2 id="fam-h" class="sr">Component families</h2>
<ul class="fams">${on.map((k) => `<li class="fam on"><a href="/components/?fam=${k}#catalogue"><b>${counts[k]}</b><span>${esc(W.FAMILIES[k][counts[k] === 1 ? 'label' : 'plural'])}</span></a><small>Researched</small></li>`).join('')}${gaps.map((k) => `<li class="fam gap"><b aria-hidden="true">–</b><span>${esc(W.FAMILIES[k].plural)}</span><small>Not yet researched: no entries</small></li>`).join('')}</ul></section>`;
}

function approaches(cm, companyPath) {
  const n = cm.coverage.counts;
  const total = n.products;
  const touch = Object.entries(n.by_principle).filter(([k]) => k !== 'not_applicable').reduce((a, [, v]) => a + v, 0);
  const bar = W.CLASS_ORDER.filter((k) => n.by_class[k]).map((k) => `<span class="seg cls-${k}" style="flex:${n.by_class[k]} 0 0" title="${esc(W.CLASS_LABEL[k])}: ${n.by_class[k]}"></span>`).join('');
  const legend = W.CLASS_ORDER.filter((k) => n.by_class[k]).map((k) => `<li><i class="sw cls-${k}" aria-hidden="true"></i>${esc(W.CLASS_LABEL[k])} <b>${n.by_class[k]}</b></li>`).join('');
  const cards = W.PRINCIPLES.filter((p) => p.key !== 'simulation' && n.by_principle[p.key]).sort((a, z) => n.by_principle[z.key] - n.by_principle[a.key]).map((p) => {
    const pub = cm.products.filter((r) => W.principleOf(r.principle) === p.key);
    const more = n.by_principle[p.key] - pub.length;
    return `<li class="ap" data-principle="${p.key}"><h3>${esc(p.label)} <span class="cn">${n.by_principle[p.key]} of ${touch}</span></h3>
<dl><dt>What it gives</dt><dd>${esc(p.gives)}</dd><dt>What to watch</dt><dd>${esc(p.limits)}</dd></dl>
<p class="ap-p">${pub.map((r) => `<a href="${W.pathOf(r.component_id)}">${esc(r.name)}</a>`).join(', ') || '<span class="na">No public passport</span>'}${more > 0 ? ` <span class="locked" data-more="${more}">+ ${more} with the subscription</span>` : ''}</p></li>`;
  }).join('');
  return `<section class="atlas-sec" id="approaches" aria-labelledby="ap-h">
<div class="sec-h"><h2 id="ap-h">Touch sensing: how each approach senses</h2>
<p>The ${touch} touch-sensing products, grouped by the sensing principle the record states. Other families are not grouped by sensing principle. The notes summarise what this kind of sensor gives and what constrains it in the records of this catalogue; they are not a ranking, and a product's own passport always takes precedence.</p></div>
<div class="avail" aria-labelledby="av-h"><h3 id="av-h">Availability of the ${total} products</h3>
<div class="avbar" role="img" aria-label="${esc(W.CLASS_ORDER.filter((k) => n.by_class[k]).map((k) => `${W.CLASS_LABEL[k]}: ${n.by_class[k]}`).join(', '))}">${bar}</div>
<ul class="avleg">${legend}</ul>
<p class="dim">Early access is not open sale, research hardware is mostly self-built, and a discontinued product is kept for reference. Not every product can be bought.</p></div>
<ul class="aps">${cards}</ul></section>`;
}

function catalogue(cm, companyPath) {
  const opt = (v, l) => `<option value="${esc(v)}">${esc(l)}</option>`;
  const sel = (id, label, all, opts) => `<label class="fsel"><span class="fl">${label}</span><select id="${id}" data-f="${id.slice(2)}"><option value="">${all}</option>${opts}</select></label>`;
  // Technical filters read paid fields: they appear for subscribers, once the full rows have loaded.
  const adv = (html) => html.replace('<label class="fsel">', '<label class="fsel adv" hidden>');
  const cards = cm.products.map((r) => W.cardHtml(r, makersHtml(cm, r.component_id, companyPath))).join('');
  const locked = cm.total - cm.products.length;
  return `<section class="atlas-sec" id="catalogue" aria-labelledby="cat-h">
<div class="sec-h"><h2 id="cat-h">Catalogue</h2>
<p>One product, model or version per entry; the manufacturer or laboratory is an attribute, and a part is never a whole robot. The family comes from each record's reviewed class. The touch filters use explicit rules over each record's own words: "mentions shear" means the measured quantities mention it, not that it is calibrated.</p></div>
<div class="cx-filters" id="cx-filters" hidden>
<label class="fsel fsearch"><span class="fl">Search</span><input type="search" id="f-q" placeholder="Name, maker, principle, quantity" autocomplete="off"></label>
${sel('f-fam', 'Family', 'Any family', W.FAMILY_ORDER.filter((k) => famCounts(cm)[k]).map((k) => opt(k, `${W.FAMILIES[k].plural} (${famCounts(cm)[k]})`)).join(''))}
${sel('f-class', 'Availability', 'Any availability', W.CLASS_ORDER.filter((k) => k !== 'software').map((k) => opt(k, W.CLASS_LABEL[k])).join(''))}
${sel('f-principle', 'Touch sensing approach', 'Any approach', W.PRINCIPLES.filter((p) => p.key !== 'simulation').map((p) => opt(p.key, p.label)).join(''))}
${sel('f-q2', 'Mentions', 'Any quantity', W.QUANTITIES.map((q) => opt(q.key, q.label)).join(''))}
${adv(sel('f-if', 'Interface', 'Any interface', W.INTERFACES.filter((i) => i.key !== 'library').map((i) => opt(i.key, i.label)).join('')))}
${adv(sel('f-ros', 'ROS', 'Any', Object.entries(W.ROS_LABEL).map(([k, l]) => opt(k, l)).join('')))}
${adv(sel('f-licence', 'Licence', 'Any licence', Object.entries(W.LICENCE_LABEL).map(([k, l]) => opt(k, l)).join('')))}
<button type="button" class="clear-f" id="f-clear">Clear</button>
</div>
<p class="fstat" id="f-stat" role="status" aria-live="polite">${cm.products.length} public products${locked > 0 ? `; ${locked} more with the subscription` : ''}.</p>
<ul class="pcs" id="pcs">${cards}</ul>
<p class="empty" id="pcs-empty" hidden>No product matches every filter. Clear a filter to see more.</p>
${locked > 0 ? `<div class="pc-lock" id="pc-lock"><p><b>${locked} more products</b> with full passports, specifications and sources are in the complete Components category.</p><p><a class="btn" href="/subscribe/">See the subscription</a> <a href="/app/">Sign in</a></p></div>` : ''}
</section>`;
}

const DEFAULT_COMPARE = ['CMP-TAC-001', 'CMP-TAC-004', 'CMP-TAC-006'];
function compare(cm) {
  const ids = DEFAULT_COMPARE.filter((id) => cm.products.some((r) => r.component_id === id));
  const rows = ids.map((id) => cm.products.find((r) => r.component_id === id));
  const options = (sel) => `<option value="">None</option>${[...cm.products].sort((a, b) => a.name.localeCompare(b.name)).map((r) => `<option value="${esc(r.component_id)}"${r.component_id === sel ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}`;
  return `<section class="atlas-sec" id="compare" aria-labelledby="cmp-h">
<div class="sec-h"><h2 id="cmp-h">Compare up to three</h2>
<p>Products of one family are compared on that family's figures, each with its unit and conditions; products of different families only on the fields they share. Every field side by side, grouped by meaning, with each value's state: not available in the source, not applicable, varying by model, stated by the maker, or measured under paper conditions. There is no chart: across these products units, configurations, streams and conditions differ, so a single scale would mislead. Nothing is ranked by pixels, rate or price.</p></div>
<div class="pick" role="group" aria-label="Products to compare">
${[0, 1, 2].map((i) => `<label><span class="fl">Product ${i + 1}</span><select class="cmp-s" data-i="${i}">${options(ids[i])}</select></label>`).join('')}
</div>
<div class="cmp-wrap" role="region" aria-label="Comparison table; on small screens each field lists the products one under another" tabindex="0" id="cmp-out">${W.compareHtml(rows)}</div>
</section>`;
}

function softwareSection(cm) {
  return `<section class="atlas-sec" id="software" aria-labelledby="sw-h">
<div class="sec-h"><h2 id="sw-h">Related software</h2><p>Software that works with these products. It is not a physical component and is not counted in the products above.</p></div>
<ul class="sws">${cm.software.map((r) => {
    const rel = cm.related.filter((x) => x.from === r.component_id).map((x) => {
      const to = cm.products.find((p) => p.component_id === x.to);
      return `${esc(x.label)} <a href="${W.pathOf(x.to)}">${esc(to?.name ?? x.to)}</a>`;
    });
    return `<li class="sw-card"><p class="pc-k"><span class="cls cls-software">Related software</span><span>${esc(W.principleLabel(W.principleOf(r.principle)))}</span></p>
<h3><a href="${W.pathOf(r.component_id)}">${esc(r.name)}</a></h3><p>${esc(r.measured ?? '')}</p>${rel.length ? `<p class="dim">${rel.join('; ')}. Other sensors named in its record are listed there.</p>` : ''}</li>`;
  }).join('')}</ul></section>`;
}

function method(cm) {
  const n = cm.coverage.counts;
  return `<section class="atlas-sec atlas-method" id="method" aria-labelledby="m-h">
<div class="sec-h"><h2 id="m-h">Coverage and method</h2><p>Data as of ${esc(fmtDay(cm.coverage.snapshot.exported_at))}: ${n.products} physical products and ${n.software} related software in the Components table, with ${n.references} reference entries.</p></div>
<div class="cols">
<div><h3>What the records are</h3><ul class="fine">
<li>One product, model or version per record. A family entry that spans several models keeps each figure with the model it names, and is flagged as varying.</li>
<li>Each record states its review scope: imported research still pending, checked against primary sources for its identity and selected figures, or checked. Specifications, prices, integrations and licences are as the sources state them.</li>
<li>A figure checked against the maker's datasheet or the paper is that maker's or author's statement under their conditions, not an independent performance test. Customers, prices, certifications and supply to humanoid makers are recorded only when a source states them.</li>
<li>A component is a part: a cell or a battery-management chip is not a robot battery pack, a reducer is not an actuator, and a sensor module is not a robot.</li>
<li>Advantages and drawbacks are the compilation's summary, attributed as such, not an independent assessment.</li></ul></div>
<div><h3>Reading the numbers</h3><ul class="fine">
<li>Camera pixels are not calibrated taxels. Spatial resolution, localisation error, force resolution and force accuracy are different quantities.</li>
<li>A rate can belong to a different stream or mode: internal sampling is not output rate, and a paper's frame rate is not the default interface's.</li>
<li>List prices, distributor figures, third-party estimates and author BOM estimates stay separate, in their original currency and with their date; nothing is converted or ranked.</li>
<li>"Not available" means the source does not give the value; "not applicable" means it does not apply; neither is zero.</li></ul></div>
<div><h3>Known gaps</h3><ul class="fine">
<li>Weight is missing for most touch sensors.</li>
<li>Optical sensors rarely publish a force range or resolution, because they are not sold force-calibrated.</li>
<li>Several prices are on request or not public, several research sensors publish no sampling rate, and some hardware licences are not stated.</li>
<li>${W.FAMILY_ORDER.filter((k) => !famCounts(cm)[k]).length ? `Families not yet researched (${esc(W.FAMILY_ORDER.filter((k) => !famCounts(cm)[k]).map((k) => W.FAMILIES[k].plural.toLowerCase()).join(', '))}) are gaps, not empty markets.` : 'Every family of the vocabulary has entries; within each, coverage is a selection of specific models, not the whole market.'}</li></ul></div>
</div></section>`;
}

export function renderComponentsCategory(cm, c, companyPath, apiOrigin) {
  const json = JSON.stringify({ products: cm.products, software: cm.software, makers: cm.makers, total: cm.total }).replace(/</g, '\\u003c');
  return `<div class="cx" id="cx" data-api="${esc(apiOrigin)}">
${head(cm, c)}
${explorer(cm)}
${families(cm)}
${approaches(cm, companyPath)}
${catalogue(cm, companyPath)}
${compare(cm)}
${softwareSection(cm)}
${method(cm)}
<p class="atlas-error" id="cx-error" role="alert" hidden>The interactive catalogue could not start. Every public product and its passport are still listed on this page.</p>
<script type="application/json" id="cx-data">${json}</script>
</div>`;
}

// A public product's (or the related software's) own page.
// apiOrigin: the API the page asks, with the visitor's own session, for the full passport (the server checks the
// subscription); without it the upgrade would ask this site, which has no API.
export function renderProductPage(cm, r, companyPath, apiOrigin) {
  if (!apiOrigin) throw new Error('renderProductPage needs the API origin');
  const sw = cm.software.some((x) => x.component_id === r.component_id);
  const f = W.facetsOf(r);
  const related = cm.related.filter((x) => x.from === r.component_id || x.to === r.component_id).map((x) => {
    const otherId = x.from === r.component_id ? x.to : x.from;
    const other = [...cm.products, ...cm.software].find((p) => p.component_id === otherId);
    return `<li>${x.from === r.component_id ? esc(x.label) : `${esc(x.label)} by`} <a href="${W.pathOf(otherId)}">${esc(other?.name ?? otherId)}</a> <small>${esc(x.basis)}</small></li>`;
  });
  return `<div class="cx cx-prod" id="cx" data-id="${esc(r.component_id)}" data-api="${esc(apiOrigin)}">
<header class="cx-head">
<p class="kicker">${sw ? 'Related software' : 'Component'} · ${esc(f.fam === 'unclassified' ? r.family ?? 'Family not recorded' : W.familyLabel(f.fam))} · <span class="cls cls-${f.cls}">${esc(W.CLASS_LABEL[f.cls])}</span></p>
<h1>${esc(r.name)}</h1>
<p class="lede">${esc(r.function ?? r.principle ?? 'What it does is not recorded')}</p>
<p class="pc-m">${makersHtml(cm, r.component_id, companyPath)}</p>
${sw ? '<p class="cx-ev">Software, not a physical component: it is not counted in the Components products.</p>' : ''}
<p class="cx-ev pp-access">${W.reviewBadge(r)} Public summary: values as the sources state them; the full passport is with the subscription.</p>
<nav class="views" aria-label="On this page">${W.sectionsFor(r).map((s) => `<a href="#sec-${s.key}">${esc(s.title)}</a>`).join('')}<a href="#sec-sources">Sources</a></nav>
</header>
${W.passportHtml(r, { level: 2 }).replace(/<section class="pp-sec" data-sec="([a-z]+)">/g, '<section class="pp-sec" data-sec="$1" id="sec-$1">')}
<aside class="pp-lockbox" aria-label="Full passport"><p><b>Public summary.</b> The full technical passport of ${esc(r.name)} (every specification with its conditions and units, interfaces and software, prices and BOM estimates with currency and date, papers, users, advantages and drawbacks, uncertainties and the source of every field) comes with the data subscription. Subscribers see it on this page after signing in.</p><p><a class="btn" href="/subscribe/">See the subscription</a> <a href="/app/">Sign in</a></p></aside>
${related.length ? `<section class="pp-sec"><h2>Related</h2><ul class="rel">${related.join('')}</ul></section>` : ''}
<p class="pp-acts">${sw ? '' : `<a href="/components/?cmp=${esc(r.component_id)}#compare">Compare with other products</a> · `}<a href="/components/">All components</a></p>
<p class="meta">Component ID ${esc(r.component_id)} · snapshot ${esc(fmtDay(cm.snapshot))}.</p>
</div>`;
}

// The address of a subscriber-only product: its id only. The passport renders after sign-in, from the API.
export function renderLockedPage(id, apiOrigin) {
  return `<div class="cx cx-prod cx-locked" id="cx" data-id="${esc(id)}" data-api="${esc(apiOrigin)}">
<header class="cx-head">
<p class="kicker">Component · subscription</p>
<h1 id="cx-title">Component ${esc(id)}</h1>
<p class="lede" id="cx-lede">This product passport is part of the complete Components category.</p>
<p class="cx-access" id="cx-access">Subscribers see it here after signing in: identity, specifications with their conditions, interfaces, availability, price and sources. <a href="/subscribe/">See the subscription</a> · <a href="/app/">Sign in</a> · <a href="/components/">Public products</a></p>
</header>
<div id="cx-pp"></div>
<p class="atlas-error" id="cx-error" role="alert" hidden>The passport could not be loaded. Reload the page, or sign in again in the subscriber app.</p>
</div>`;
}
