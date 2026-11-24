// Integrators (Javier, 24 Nov 2026): the static HTML of /integrators/ and of the integrator profile on each provider's
// company page, from the public snapshot data/integrators/atlas.json (tools/export-integrators.mjs). Free in full.
// Every page is complete without JavaScript; assets/integrators.js only filters what is already there.
//
// Rules the pages keep: a value the sources do not establish is shown as the sheet states it, never filled; a service
// offered is not a project delivered; a headquarters is not a service territory; CA3 and the records whose humanoid
// scope is unconfirmed are listed and labelled, never counted as humanoid providers; a shared project is one project.

import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
export const readIntegratorsAtlas = () => JSON.parse(readFileSync(new URL('data/integrators/atlas.json', root), 'utf8'));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const ext = (u, label) => `<a href="${esc(u)}" rel="noopener noreferrer">${esc(label ?? host(u))}</a>`;
const lower = (s) => String(s ?? '').toLowerCase();

export const providerAnchor = (id) => `p-${id.replace(/^int_/, '').replace(/_/g, '-')}`;
const labelOf = (list, id) => list.find((x) => x.id === id)?.label ?? id;

// A cell as the sheet states it; a statement that the sources do not establish it is marked as unknown.
function cellHtml(p, field) {
  const v = p.fields[field];
  if (v === null || v === undefined || String(v).trim() === '') return '<span class="na">Not recorded in the sheet</span>';
  const body = esc(v).replace(/\n/g, '<br>');
  return p.unknown.includes(field) ? `<span class="na" title="Not established in the reviewed sources">${body}</span>` : body;
}

const STATUS_BADGE = { humanoid: '', exception: 'Specialist exception · not counted', unconfirmed: 'Humanoid scope unconfirmed · not counted' };
const badge = (p) => (STATUS_BADGE[p.status] ? `<span class="ip-badge ip-${esc(p.status)}">${esc(STATUS_BADGE[p.status])}</span>` : '');
const tagList = (ids, vocab, cls = '') => (ids.length ? `<ul class="ip-tags ${cls}">${ids.map((id) => `<li>${esc(labelOf(vocab, id))}</li>`).join('')}</ul>` : '');

function sortProviders(atlas) {
  const byName = (a, b) => a.display_name.localeCompare(b.display_name);
  return {
    counted: atlas.providers.filter((p) => p.status === 'humanoid').sort(byName),
    others: atlas.providers.filter((p) => p.status !== 'humanoid').sort((a, b) => (a.status === b.status ? byName(a, b) : a.status === 'exception' ? -1 : 1)),
  };
}

const dataAttrs = (p, atlas) => {
  const g = atlas.groups.find((x) => x.id === p.group);
  const text = [p.display_name, p.name, ...Object.values(p.fields), g?.label, ...p.tags.platforms.map((t) => labelOf(atlas.vocab.platforms, t)), ...p.tags.territories.map((t) => labelOf(atlas.vocab.territories, t))].join(' ');
  return `data-id="${esc(p.id)}" data-status="${esc(p.status)}" data-group="${esc(p.group)}" data-roles="${esc(p.tags.roles.join(' '))}" data-services="${esc(p.tags.services.join(' '))}" data-platforms="${esc(p.tags.platforms.join(' '))}" data-sectors="${esc(p.tags.sectors.join(' '))}" data-territories="${esc(p.tags.territories.join(' '))}" data-q="${esc(lower(text).replace(/\s+/g, ' '))}"`;
};

// ---- overview: compact bar lists, every number written out (the bars only repeat it)
function bars(items, total, { cls = '', note = '' } = {}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return `<ul class="ib ${cls}">${items.map((i) => `<li${i.muted ? ' class="muted"' : ''}><span class="ib-l">${esc(i.label)}</span><span class="ib-t" aria-hidden="true"><span style="width:${((i.count / max) * 100).toFixed(1)}%"></span></span><span class="ib-n">${i.count}<span class="sr"> of ${total}</span></span></li>`).join('')}</ul>${note ? `<p class="fine-n">${note}</p>` : ''}`;
}
function overview(atlas) {
  const n = atlas.counts;
  const st = Object.fromEntries(atlas.statuses.map((s) => [s.id, s]));
  const groups = atlas.groups.map((g) => ({ label: g.label, count: g.count, muted: g.status !== 'humanoid' }));
  const sorted = (list) => [...list].filter((x) => x.count > 0).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const unitreeAny = n.platforms.find((x) => x.id === 'unitree');
  const platforms = sorted(n.platforms.filter((x) => x.id !== 'unitree' && x.id !== 'none'));
  const none = n.platforms.find((x) => x.id === 'none');
  const terr = sorted(n.territories.filter((x) => x.id !== 'not-established'));
  const terrNone = n.territories.find((x) => x.id === 'not-established');
  const coverage = atlas.coverage.map((c) => `<li><span class="ib-l">${esc(c.label)}</span><span class="ib-t ib-split" aria-hidden="true"><span style="width:${((c.established / n.providers) * 100).toFixed(1)}%"></span></span><span class="ib-n">${c.established}<span class="sr"> of ${n.providers} state it; ${c.unknown} say not established</span></span></li>`).join('');
  return `<section class="atlas-sec" id="overview" aria-labelledby="overview-h">
<div class="sec-h"><h2 id="overview-h">Overview</h2><p>What the ${n.providers} records say, counted from their own cells. Roles, platforms and territory count the ${n.humanoid} humanoid-specific providers only; the evidence chart and the coverage chart count every record.</p></div>
<div class="ov-grid">
<div class="panel ov"><div class="panel-h"><p class="eyebrow">All ${n.providers} records</p><h3>What the evidence is</h3></div>${bars(groups, n.providers, { note: `Kinds of evidence, not a ranking. ${st.exception.count} requested specialist exception and ${st.unconfirmed.count} records with unconfirmed humanoid scope are shown in grey and are not humanoid providers.` })}</div>
<div class="panel ov"><div class="panel-h"><p class="eyebrow">${n.humanoid} humanoid-specific providers</p><h3>Roles</h3></div>${bars(sorted(n.roles), n.humanoid, { note: 'From the Roles cell. A provider can hold several roles.' })}</div>
<div class="panel ov"><div class="panel-h"><p class="eyebrow">${n.humanoid} humanoid-specific providers</p><h3>Platforms named</h3></div>${bars(platforms, n.humanoid, { note: `${unitreeAny.count} name Unitree robots (any model); ${none.count} name no humanoid platform. Named is not integrated: the platform cell says when a model is only referenced, listed or conditional.` })}</div>
<div class="panel ov"><div class="panel-h"><p class="eyebrow">${n.humanoid} humanoid-specific providers</p><h3>Service territory stated</h3></div>${bars(terr, n.humanoid, { note: `Places named in the Service coverage cell, never taken from a headquarters. ${terrNone.count} state no territory.` })}</div>
<div class="panel ov ov-wide"><div class="panel-h"><p class="eyebrow">All ${n.providers} records</p><h3>What the sources establish</h3></div><ul class="ib">${coverage}</ul><p class="fine-n">Filled bar: records whose cell states something; the rest say “not established”, “not stated” or “not published” in the reviewed sources. No record publishes a humanoid project price.</p></div>
</div>
</section>`;
}

// ---- directory with filters
function filterForm(atlas) {
  const all = atlas.providers;
  const opt = (key, vocab) => vocab.map((v) => ({ ...v, n: all.filter((p) => p.tags[key].includes(v.id)).length })).filter((v) => v.n > 0).map((v) => `<option value="${esc(v.id)}">${esc(v.label)} (${v.n})</option>`).join('');
  const groupOpts = atlas.groups.filter((g) => g.count > 0).map((g) => `<option value="${esc(g.id)}">${esc(g.label)} (${g.count})</option>`).join('');
  const sel = (id, label, options) => `<label class="if-f" for="if-${id}"><span>${esc(label)}</span><select id="if-${id}" name="${id}"><option value="">Any</option>${options}</select></label>`;
  return `<form class="if" id="if" role="search" aria-label="Filter providers" hidden>
<label class="if-f if-q" for="if-q"><span>Search</span><input id="if-q" name="q" type="search" autocomplete="off" placeholder="Name, platform, service, place"></label>
${sel('role', 'Role', opt('roles', atlas.vocab.roles))}
${sel('service', 'Service', opt('services', atlas.vocab.services))}
${sel('platform', 'Platform or robot', opt('platforms', atlas.vocab.platforms))}
${sel('sector', 'Sector', opt('sectors', atlas.vocab.sectors))}
${sel('territory', 'Service territory stated', opt('territories', atlas.vocab.territories))}
${sel('evidence', 'Evidence', groupOpts)}
<label class="if-c"><input type="checkbox" id="if-counted" name="counted" value="1"> Humanoid-specific providers only</label>
<button type="button" class="if-clear" id="if-clear">Clear filters</button>
</form>
<p class="if-count" id="if-count" aria-live="polite">${all.length} providers</p>`;
}
function card(p, atlas, companyPath) {
  const g = atlas.groups.find((x) => x.id === p.group);
  const path = companyPath(p.id);
  return `<li class="ip" id="${esc(providerAnchor(p.id))}" ${dataAttrs(p, atlas)}>
<div class="ip-h"><h3>${path ? `<a href="${esc(path)}">${esc(p.display_name)}</a>` : esc(p.display_name)}</h3>${badge(p)}</div>
${p.fields.canonical_name !== p.display_name ? `<p class="ip-cn">${esc(p.fields.canonical_name)}</p>` : ''}
<p class="ip-ev"><span class="ip-g ip-g-${esc(p.status)}">${esc(g?.label ?? '')}</span> <span class="ip-st">${esc(p.fields.evidence_stage)}</span></p>
<p class="ip-d">${esc(p.fields.description)}</p>
<dl class="ip-kv">
<dt>Roles</dt><dd>${cellHtml(p, 'roles')}</dd>
<dt>Platforms</dt><dd>${cellHtml(p, 'humanoid_platforms')}</dd>
<dt>Service coverage</dt><dd>${cellHtml(p, 'service_coverage')}</dd>
<dt>Named project</dt><dd>${cellHtml(p, 'humanoid_project')}</dd>
</dl>
<p class="ip-links">${path ? `<a href="${esc(path)}">Full profile</a>` : ''}${ext(p.url, 'Website ↗')}<span class="dim">${p.sources.length} source${p.sources.length === 1 ? '' : 's'} · reviewed ${esc(p.fields.reviewed_at)}</span></p>
</li>`;
}
function directory(atlas, companyPath) {
  const { counted, others } = sortProviders(atlas);
  return `<section class="atlas-sec" id="directory" aria-labelledby="directory-h">
<div class="sec-h"><h2 id="directory-h">Directory</h2><p>Every provider in the sheet, with its evidence stage, roles, platforms, stated service coverage and named project as recorded. Each has a full profile with services, software, support, delivery, limitations and sources.</p></div>
${filterForm(atlas)}
<div id="if-lists">
<h3 class="ip-lh" data-list="counted">Humanoid-specific providers <span class="dim">(${counted.length})</span></h3>
<ul class="ips" data-list="counted">${counted.map((p) => card(p, atlas, companyPath)).join('')}</ul>
<h3 class="ip-lh" data-list="others">Listed, not counted as humanoid providers <span class="dim">(${others.length})</span></h3>
<p class="ip-note" data-list="others">CA3 is a specialist exception included at the editor’s request: provider-reported simulated tests only, no humanoid validation and no completed humanoid integration. Bumerania, Amerevo and RH Bots are earlier records kept for continuity; the reviewed sources do not establish humanoid work.</p>
<ul class="ips" data-list="others">${others.map((p) => card(p, atlas, companyPath)).join('')}</ul>
</div>
<div class="empty" id="if-empty" hidden><p>No provider matches these filters.</p><button type="button" class="if-clear" data-clear>Clear filters</button></div>
</section>`;
}

// ---- capability comparison: services stated, one row per provider
const SHORT = { assessment: 'Assess', design: 'Design', integration: 'Integrate', software: 'Software, AI', teleoperation: 'Teleop', pilots: 'Pilots, PoC', safety: 'Safety', training: 'Training', support: 'Support', operations: 'Operated' };
function compare(atlas, companyPath) {
  const { counted, others } = sortProviders(atlas);
  const cols = atlas.vocab.services;
  const row = (p) => `<tr ${dataAttrs(p, atlas)}><th scope="row">${companyPath(p.id) ? `<a href="${esc(companyPath(p.id))}">${esc(p.display_name)}</a>` : esc(p.display_name)}${p.status !== 'humanoid' ? ` <span class="dim">(${p.status === 'exception' ? 'exception' : 'unconfirmed'})</span>` : ''}</th>${cols.map((c) => (p.tags.services.includes(c.id) ? '<td class="y"><span aria-hidden="true">●</span><span class="sr">Stated</span></td>' : '<td class="n"><span aria-hidden="true">·</span><span class="sr">Not stated</span></td>')).join('')}</tr>`;
  return `<section class="atlas-sec" id="compare" aria-labelledby="compare-h">
<div class="sec-h"><h2 id="compare-h">Compare capabilities</h2><p>Which services each provider states, read from its Services, Support, Teleoperation and Delivery model cells. ● means the provider states it; a dot means the cells do not. Stated is not proven: the profile shows the exact words, the evidence stage and the limitations. Follows the directory filters.</p></div>
<div class="cmp-wrap" role="region" aria-labelledby="compare-cap" tabindex="0">
<table class="cmp-t"><caption id="compare-cap" class="sr">Services stated by each provider</caption>
<thead><tr><th scope="col">Provider</th>${cols.map((c) => `<th scope="col" title="${esc(c.label)}"><span aria-hidden="true">${esc(SHORT[c.id] ?? c.label)}</span><span class="sr">${esc(c.label)}</span></th>`).join('')}</tr></thead>
<tbody>${counted.map(row).join('')}</tbody>
<tbody class="cmp-others"><tr class="cmp-sep"><th scope="rowgroup" colspan="${cols.length + 1}">Listed, not counted as humanoid providers</th></tr>${others.map(row).join('')}</tbody>
</table></div>
</section>`;
}

// ---- named projects: one row per project, a shared project once
function projects(atlas, companyPath, casePath) {
  const name = (id) => atlas.providers.find((p) => p.id === id)?.display_name ?? id;
  const link = (id) => (companyPath(id) ? `<a href="${esc(companyPath(id))}">${esc(name(id))}</a>` : esc(name(id)));
  const items = atlas.projects.map((pr) => `<li class="pj" id="project-${esc(pr.id)}">
<p class="eyebrow">${esc(pr.type_label)}</p>
<h3>${esc(pr.name)}</h3>
<p>${esc(pr.summary)}</p>
<dl class="ip-kv"><dt>${pr.providers.length > 1 ? 'Providers and roles' : 'Provider and role'}</dt><dd>${pr.providers.map((x) => `${link(x.id)}: ${esc(x.role)}`).join('<br>')}</dd>
${pr.results.length ? `<dt>Figures as each source reports them</dt><dd>${pr.results.map((r) => `${esc(r.text)} <span class="dim">(${esc(name(r.id))} record)</span>`).join('<br>')}${pr.results_note ? `<br><span class="dim">${esc(pr.results_note)}</span>` : ''}</dd>` : ''}
${pr.deployment_case && casePath(pr.deployment_case) ? `<dt>Deployment case</dt><dd><a href="${esc(casePath(pr.deployment_case))}">The same pilot in Deployments</a></dd>` : ''}</dl>
</li>`).join('');
  const n = atlas.counts;
  return `<section class="atlas-sec" id="projects" aria-labelledby="projects-h">
<div class="sec-h"><h2 id="projects-h">Named projects and collaborations</h2><p>${n.corroborated_projects} named customer projects or pilots, ${n.projects - n.corroborated_projects} other named projects, programmes, operated robots and collaborations, and one announced partnership between two listed providers. A project shared by two providers is listed once, with each provider’s role. Pilot and proof-of-concept results are not production results.</p></div>
<ul class="pjs">${items}</ul>
</section>`;
}

function method(atlas) {
  return `<section class="atlas-sec" id="method" aria-labelledby="method-h">
<div class="sec-h"><h2 id="method-h">How to read this</h2></div>
<ul class="fine">
<li><b>Source.</b> The Integrators tab of the Why Humanoid? master workbook: ${atlas.source.rows} providers, ${atlas.source.columns} fields each, reviewed ${esc([...new Set(atlas.providers.map((p) => p.fields.reviewed_at))].join(', '))}. Values appear as the sheet states them; nothing is filled in or recalculated. Snapshot ${esc(String(atlas.snapshot ?? '').slice(0, 10))}.</li>
<li><b>Claims, not verified results.</b> Most records are provider or partner statements. Each profile shows its verification note and limitations next to the claims, with its sources.</li>
<li><b>Who counts.</b> ${atlas.counts.humanoid} providers show explicit humanoid work or a humanoid offering. That is not ${atlas.counts.humanoid} validated production integrators: the evidence chart shows what kind of evidence each record has. CA3 (requested specialist exception, simulated tests only) and three historical records with unconfirmed humanoid scope are listed but never counted.</li>
<li><b>Evidence groups.</b> ${atlas.groups.map((g) => `${esc(g.label)}: ${esc(g.explanation)}`).join(' ')} Each provider’s group cites a phrase of its own Evidence stage cell.</li>
<li><b>Tags.</b> Roles, services, platforms, sectors and service territory are read from the cells with fixed word lists. A term outside the lists is not tagged, and the full cell is always shown. Service territory comes only from the Service coverage cell, never from a headquarters or a project location.</li>
<li><b>Offered is not delivered.</b> A service in the Services cell is an offer. A delivered project appears only under Named project and in the projects list, with its evidence stage.</li>
<li><b>Contact.</b> Through each provider’s public website. Why Humanoid? publishes no personal contact details.</li>
<li><b>Free.</b> The whole category, every profile and every source are free, with no account.</li>
</ul>
</section>`;
}

export function renderIntegratorsCategory(atlas, { companyPath, casePath, index, total, badgeHtml }) {
  const n = atlas.counts;
  const st = Object.fromEntries(atlas.statuses.map((s) => [s.id, s]));
  return `<div class="atlas integrators">
<header class="atlas-head">
<p class="kicker">Category ${index} of ${total}${badgeHtml}</p>
<h1>Integrators</h1>
<p class="lede">Who can deliver humanoid integration, software, training and support, on which platforms, in which territory and with what evidence. Every provider with its sources and limitations, as the master workbook records them.</p>
<dl class="atlas-counts">
<div><dt>Providers listed</dt><dd>${n.providers}</dd></div>
<div><dt>Humanoid-specific</dt><dd>${n.humanoid}</dd></div>
<div><dt>Named customer projects</dt><dd>${n.corroborated_projects}</dd></div>
<div><dt>Project price published</dt><dd>${atlas.coverage.find((c) => c.field === 'pricing').established}<small> of ${n.providers}</small></dd></div>
</dl>
<p class="ip-caveat"><b>${n.humanoid} providers show explicit humanoid work or a humanoid offering, not ${n.humanoid} validated production integrators.</b> ${atlas.groups.find((g) => g.id === 'corroborated_project').count} have a named project corroborated by a customer or partner (${n.corroborated_projects} customer projects or pilots, as the Novares Seseña proof of concept is shared by two of them, plus one announced airport programme); the rest rely on provider-reported projects, partnerships, technical work or offerings. CA3 (${esc(st.exception.label.toLowerCase())}) and ${st.unconfirmed.count} records with unconfirmed humanoid scope are listed and labelled, not counted.</p>
<nav class="views" aria-label="Sections"><a href="#directory">Directory</a><a href="#compare">Compare capabilities</a><a href="#projects">Named projects</a><a href="#overview">Overview</a><a href="#method">How to read this</a></nav>
</header>
${directory(atlas, companyPath)}
${compare(atlas, companyPath)}
${projects(atlas, companyPath, casePath)}
${overview(atlas)}
${method(atlas)}
</div>`;
}

// ---- profile on the provider's company page
const PROFILE_BLOCKS = [
  ['Who they are', ['canonical_name', 'roles', 'evidenced_location', 'service_coverage']],
  ['What they deliver', ['services', 'humanoid_platforms', 'sectors', 'software_stack', 'teleoperation_and_data', 'support', 'delivery_model', 'pricing']],
  ['Humanoid evidence', ['humanoid_claim_status', 'evidence_stage', 'humanoid_project', 'verification', 'limitations']],
  ['Record', ['catalog_status', 'selection_basis', 'source_dates', 'reviewed_at', 'provider_id']],
];

export function renderIntegratorProfile(p, atlas, { companyPath, casePath, robotPath, makerPath }) {
  const label = (f) => atlas.vocab.fields.find((x) => x.id === f)?.label ?? f;
  const g = atlas.groups.find((x) => x.id === p.group);
  const st = atlas.statuses.find((s) => s.id === p.status);
  const extra = {
    roles: tagList(p.tags.roles, atlas.vocab.roles),
    service_coverage: p.tags.territories[0] === 'not-established' ? '' : `<p class="dim">Territory stated: ${esc(p.tags.territories.map((t) => labelOf(atlas.vocab.territories, t)).join(', '))}. A headquarters or project location is not a service territory.</p>`,
    services: tagList(p.tags.services, atlas.vocab.services),
    humanoid_platforms: [
      p.links.robots.length ? `<p class="dim">Robot pages: ${p.links.robots.map((r) => (robotPath(r.id) ? `<a href="${esc(robotPath(r.id))}">${esc(r.name)}</a>` : esc(r.name))).join(', ')}</p>` : '',
      p.links.makers.length ? `<p class="dim">Maker pages: ${p.links.makers.map((m) => (makerPath(m) ? `<a href="${esc(makerPath(m))}">${esc(m)}</a>` : esc(m))).join(', ')}</p>` : '',
    ].join(''),
    sectors: tagList(p.tags.sectors, atlas.vocab.sectors),
  };
  const blocks = PROFILE_BLOCKS.map(([h, fields]) => `<h3>${esc(h)}</h3><dl class="kv">${fields.map((f) => `<dt>${esc(label(f))}</dt><dd>${cellHtml(p, f)}${extra[f] ?? ''}</dd>`).join('')}</dl>`).join('');
  const projs = atlas.projects.filter((pr) => p.projects.includes(pr.id));
  const others = (pr) => pr.providers.filter((x) => x.id !== p.id);
  const pname = (id) => atlas.providers.find((x) => x.id === id)?.display_name ?? id;
  const projHtml = projs.length ? `<h3>Named projects and collaborations</h3><ul class="links">${projs.map((pr) => `<li><a href="/integrators/#project-${esc(pr.id)}">${esc(pr.name)}</a> <span class="dim">${esc(pr.type_label)}; role: ${esc(pr.providers.find((x) => x.id === p.id).role)}${others(pr).length ? `; shared with ${others(pr).map((x) => (companyPath(x.id) ? `<a href="${esc(companyPath(x.id))}">${esc(pname(x.id))}</a>` : esc(pname(x.id)))).join(', ')}, one project` : ''}${pr.deployment_case && casePath(pr.deployment_case) ? `; <a href="${esc(casePath(pr.deployment_case))}">deployment case</a>` : ''}</span></li>`).join('')}</ul>` : '';
  const sw = p.links.software ? `<p class="key">Also in <a href="/software/">Software</a> as ${esc(p.links.software.name)} (${ext(p.links.software.url)}): the same organisation in another category, not a second provider.</p>` : '';
  return `<section class="ip-profile" id="integrator" aria-labelledby="integrator-h">
<h2 id="integrator-h">Integrator profile</h2>
<p class="ip-ev"><span class="ip-g ip-g-${esc(p.status)}">${esc(st.label)}</span> <span class="ip-g ip-g-${esc(p.status)}">${esc(g?.label ?? '')}</span></p>
<p class="note">${p.status === 'humanoid' ? `${esc(st.note)} ` : ''}${esc(g?.explanation ?? '')}${p.status !== 'humanoid' ? ` ${esc(st.note)}` : ''} Evidence stage as recorded: “${esc(p.fields.evidence_stage)}”.</p>
<p>${esc(p.fields.description)}</p>
${blocks}
${projHtml}
${sw}
<h3>Sources for this profile</h3>
<ul class="sources">${p.sources.map((u) => `<li>${ext(u, u)}</li>`).join('')}</ul>
<p class="key">Website: ${ext(p.url)}. Contact the provider through its public website. Values as recorded in sheet row ${p.sheet_row} of the <a href="/integrators/">Integrators</a> category, reviewed ${esc(p.fields.reviewed_at)}; claims as stated by the sources, not independently verified. <a href="/integrators/#${esc(providerAnchor(p.id))}">Compare with other providers</a>.</p>
</section>`;
}

// ---- robot and maker pages: the providers whose platform cell names them
export function renderNamedBy(list, atlas, { companyPath, heading, intro }) {
  if (!list.length) return '';
  return `<section><h2>${esc(heading)}</h2><p>${esc(intro)}</p><ul class="links">${list.map((p) => `<li>${companyPath(p.id) ? `<a href="${esc(companyPath(p.id))}#integrator">${esc(p.display_name)}</a>` : esc(p.display_name)} <span class="dim">${esc(p.fields.humanoid_platforms)}${p.status !== 'humanoid' ? ` · ${esc(STATUS_BADGE[p.status])}` : ''}</span></li>`).join('')}</ul><p class="key">From the <a href="/integrators/">Integrators</a> category: a named platform is not a completed integration; each profile gives the evidence stage.</p></section>`;
}
