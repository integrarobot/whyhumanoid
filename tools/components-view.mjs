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
const GAP_FAMILIES = ['Actuators and motors', 'Reducers and gearboxes', 'Batteries and power', 'Compute', 'Cameras and depth sensors', 'Force-torque sensors'];

function head(cm, c) {
  const n = cm.coverage.counts;
  const cls = (k) => n.by_class[k] ?? 0;
  const pub = cm.products.length;
  return `<header class="cx-head">
<p class="kicker">Category ${c.index} of ${c.total} · Components${c.badge}</p>
<h1>Components</h1>
<p class="lede">The building blocks of embodied intelligence.</p>
<p class="ask">What each part senses, how it does it and what constrains it. Detailed coverage currently focuses on touch: ${n.by_family['Tactile sensor'] ?? 0} tactile sensors and ${n.by_family['Tactile robotic hand'] ?? 0} tactile research hand. Other component families are listed as gaps, not filled in.</p>
<dl class="cx-counts">
<div><dt>Physical products</dt><dd>${n.products}</dd></div>
<div><dt>Commercial</dt><dd>${cls('commercial')}</dd><small>${cls('early_access')} more in early access</small></div>
<div><dt>Research or open hardware</dt><dd>${cls('research')}</dd></div>
<div><dt>Discontinued</dt><dd>${cls('discontinued')}</dd></div>
<div><dt>Related software</dt><dd>${n.software}</dd><small>not counted as hardware</small></div>
<div><dt>Source references</dt><dd>${n.references}</dd><small>entries, not all independent</small></div>
</dl>
<p class="cx-ev"><span class="ev ev-pending">Research compilation · original sources still being reviewed</span> Every record comes from one research compilation, added on ${esc(fmtDay(cm.coverage.snapshot.exported_at))}. Its individual claims have not yet been checked against their original sources. Values are shown as the sources state them, with their conditions.</p>
<p class="cx-access" id="cx-access" data-public="${pub}" data-total="${n.products}"><b>All ${n.products} products</b> are listed with a public summary: maker, country, year, status, sensing principle, what it measures and the main source. The full technical passports (resolution, force, rates, size and mass, interfaces and software, durability, prices and BOM estimates, papers, users, advantages and drawbacks, the source of every field), the technical filters and the full side-by-side comparison come with the subscription.</p>
<nav class="views" aria-label="Components views"><a href="#approaches">Sensing approaches</a><a href="#catalogue">Catalogue</a><a href="#compare">Compare</a><a href="#software">Related software</a><a href="#method">Coverage and method</a></nav>
</header>`;
}

function families(cm) {
  const fam = Object.entries(cm.coverage.counts.by_family);
  return `<section class="cx-fam" aria-labelledby="fam-h"><h2 id="fam-h" class="sr">Component families</h2>
<ul class="fams">${fam.map(([f, k]) => `<li class="fam on"><b>${k}</b><span>${esc(f)}${/s$/.test(f) || k === 1 ? '' : 's'}</span><small>Researched</small></li>`).join('')}${GAP_FAMILIES.map((f) => `<li class="fam gap"><b aria-hidden="true">–</b><span>${esc(f)}</span><small>Not yet researched: no entries</small></li>`).join('')}</ul></section>`;
}

function approaches(cm, companyPath) {
  const n = cm.coverage.counts;
  const total = n.products;
  const bar = W.CLASS_ORDER.filter((k) => n.by_class[k]).map((k) => `<span class="seg cls-${k}" style="flex:${n.by_class[k]} 0 0" title="${esc(W.CLASS_LABEL[k])}: ${n.by_class[k]}"></span>`).join('');
  const legend = W.CLASS_ORDER.filter((k) => n.by_class[k]).map((k) => `<li><i class="sw cls-${k}" aria-hidden="true"></i>${esc(W.CLASS_LABEL[k])} <b>${n.by_class[k]}</b></li>`).join('');
  const cards = W.PRINCIPLES.filter((p) => p.key !== 'simulation' && n.by_principle[p.key]).sort((a, z) => n.by_principle[z.key] - n.by_principle[a.key]).map((p) => {
    const pub = cm.products.filter((r) => W.principleOf(r.principle) === p.key);
    const more = n.by_principle[p.key] - pub.length;
    return `<li class="ap" data-principle="${p.key}"><h3>${esc(p.label)} <span class="cn">${n.by_principle[p.key]} of ${total}</span></h3>
<dl><dt>What it gives</dt><dd>${esc(p.gives)}</dd><dt>What to watch</dt><dd>${esc(p.limits)}</dd></dl>
<p class="ap-p">${pub.map((r) => `<a href="${W.pathOf(r.component_id)}">${esc(r.name)}</a>`).join(', ') || '<span class="na">No public passport</span>'}${more > 0 ? ` <span class="locked" data-more="${more}">+ ${more} with the subscription</span>` : ''}</p></li>`;
  }).join('');
  return `<section class="atlas-sec" id="approaches" aria-labelledby="ap-h">
<div class="sec-h"><h2 id="ap-h">How each approach senses touch</h2>
<p>Grouped by the sensing principle the record states. The notes summarise what this kind of sensor gives and what constrains it in the records of this catalogue; they are not a ranking, and a product's own passport always takes precedence.</p></div>
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
<p>One product, model or version per entry; the manufacturer or laboratory is an attribute. Filters use explicit rules over each record's own words: "mentions shear" means the measured quantities mention it, not that it is calibrated.</p></div>
<div class="cx-filters" id="cx-filters" hidden>
<label class="fsel fsearch"><span class="fl">Search</span><input type="search" id="f-q" placeholder="Name, maker, principle, quantity" autocomplete="off"></label>
${sel('f-class', 'Availability', 'Any availability', W.CLASS_ORDER.filter((k) => k !== 'software').map((k) => opt(k, W.CLASS_LABEL[k])).join(''))}
${sel('f-principle', 'Sensing approach', 'Any approach', W.PRINCIPLES.filter((p) => p.key !== 'simulation').map((p) => opt(p.key, p.label)).join(''))}
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
<p>Every field side by side, grouped by meaning, with each value's state: not available in the source, not applicable, varying by model, stated by the maker, or measured under paper conditions. There is no chart: across these products units, configurations, streams and conditions differ, so a single scale would mislead. Nothing is ranked by pixels, rate or price.</p></div>
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
<li>All records come from one research compilation, added on the same day. Specifications, prices, integrations and licences are as the sources state them; checking each against its original source is still pending.</li>
<li>Advantages and drawbacks are the compilation's summary, attributed as such, not an independent assessment.</li></ul></div>
<div><h3>Reading the numbers</h3><ul class="fine">
<li>Camera pixels are not calibrated taxels. Spatial resolution, localisation error, force resolution and force accuracy are different quantities.</li>
<li>A rate can belong to a different stream or mode: internal sampling is not output rate, and a paper's frame rate is not the default interface's.</li>
<li>List prices, distributor figures, third-party estimates and author BOM estimates stay separate, in their original currency and with their date; nothing is converted or ranked.</li>
<li>"Not available" means the source does not give the value; "not applicable" means it does not apply; neither is zero.</li></ul></div>
<div><h3>Known gaps</h3><ul class="fine">
<li>Weight is missing for almost every product.</li>
<li>Optical sensors rarely publish a force range or resolution, because they are not sold force-calibrated.</li>
<li>Several prices are on request or not public, several research sensors publish no sampling rate, and some hardware licences are not stated.</li>
<li>Only touch has been researched so far: other families are gaps, not empty markets.</li></ul></div>
</div></section>`;
}

export function renderComponentsCategory(cm, c, companyPath, apiOrigin) {
  const json = JSON.stringify({ products: cm.products, software: cm.software, makers: cm.makers, total: cm.total }).replace(/</g, '\\u003c');
  return `<div class="cx" id="cx" data-api="${esc(apiOrigin)}">
${head(cm, c)}
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
export function renderProductPage(cm, r, companyPath) {
  const sw = cm.software.some((x) => x.component_id === r.component_id);
  const f = W.facetsOf(r);
  const related = cm.related.filter((x) => x.from === r.component_id || x.to === r.component_id).map((x) => {
    const otherId = x.from === r.component_id ? x.to : x.from;
    const other = [...cm.products, ...cm.software].find((p) => p.component_id === otherId);
    return `<li>${x.from === r.component_id ? esc(x.label) : `${esc(x.label)} by`} <a href="${W.pathOf(otherId)}">${esc(other?.name ?? otherId)}</a> <small>${esc(x.basis)}</small></li>`;
  });
  return `<div class="cx cx-prod" id="cx" data-id="${esc(r.component_id)}">
<header class="cx-head">
<p class="kicker">${sw ? 'Related software' : 'Component'} · ${esc(r.family ?? 'Family not recorded')} · <span class="cls cls-${f.cls}">${esc(W.CLASS_LABEL[f.cls])}</span></p>
<h1>${esc(r.name)}</h1>
<p class="lede">${esc(r.principle ?? 'Sensing principle not recorded')}</p>
<p class="pc-m">${makersHtml(cm, r.component_id, companyPath)}</p>
${sw ? '<p class="cx-ev">Software, not a physical component: it is not counted in the Components products.</p>' : ''}
<p class="cx-ev pp-access">${W.reviewBadge(r)} Public summary: values as the sources state them; the full passport is with the subscription.</p>
<nav class="views" aria-label="On this page">${W.SECTIONS.map((s) => `<a href="#sec-${s.key}">${esc(s.title)}</a>`).join('')}<a href="#sec-sources">Sources</a></nav>
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
