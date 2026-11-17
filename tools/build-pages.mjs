#!/usr/bin/env node
// Permanent public pages (Javier, 17 Nov 2026): one static page per catalogue robot (/robots/<slug>/) and one per
// public company (/companies/<slug>/), with the main content in the HTML itself, readable without JavaScript.
//
// Built only from public inputs: the free Humanoids catalogue (data/humanoids-catalogue.json), the 10-row previews of
// Deployments and Entities (data/preview/), the public relations graph of those previews (tools/relations.mjs) and
// the public projection (data/public/projection.json: allowlisted counts and summaries of every record, written by
// tools/export-public.mjs with server/src/public/projection.js; approved split, phase 1, 17 Nov 2026). Every company
// in the database gets a page. Nothing is invented: every value is shown as recorded; records are claims as recorded,
// not verified facts.
//
// Addresses are stable. A robot's slug ends with its catalogue id; a company's slug is its id without the prefix.
// tools/permalinks.json records every slug ever published (append-only). When a name changes, the old address gets
// a small redirect page to the new one (it works without JavaScript); an address whose robot or company left the
// public catalogue gets a page saying so. 404.html sends any other /robots/<anything>-<id>/ to the current page.
//
//   node tools/build-pages.mjs          write robots/, companies/, sitemap.xml, 404.html, data/pages.json, registry
//   node tools/build-pages.mjs --check  fail if any of them differs from the build or a stale page is left behind

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildData } from './build-site.mjs';
import { PAGE_FIELDS, catalogueIndex, previewGraph } from './relations.mjs';
import { PLAN } from '../server/src/pricing.js';

export const SITE = 'https://whyhumanoid.com';
const APP = `${SITE}/app/`;
const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const REGISTRY = 'tools/permalinks.json';
const GENERATED_DIRS = ['robots', 'companies', 'reports', 'method'];

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nz = (v) => v !== null && v !== undefined && String(v).trim() !== '';
const human = (v) => String(v ?? '').replace(/_/g, ' ');
const NA = /^(not\b|n\/a\b|unknown\b|undisclosed\b|none\b|no\b|tbd\b|to be\b|pending\b|unverified\b)/i;
const known = (v) => nz(v) && !NA.test(String(v).trim());
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
// Text with URLs as links that stop before trailing punctuation; line breaks kept.
function text(v) {
  if (!nz(v)) return '<span class="na">Not recorded</span>';
  return esc(v).replace(/https?:\/\/[^\s<]+/g, (u) => {
    let tail = '';
    for (let m; (m = u.match(/(&quot;|&#39;|[.,;:!?\]]|\))$/)) && !(m[1] === ')' && u.includes('('));) { tail = m[1] + tail; u = u.slice(0, -m[1].length); }
    return `<a href="${u}" rel="noopener noreferrer">${u}</a>${tail}`;
  }).replace(/\n/g, '<br>');
}
const ext = (u, label) => `<a href="${esc(u)}" rel="noopener noreferrer">${esc(label ?? host(u))}</a>`;
const clip = (s, n = 158) => { s = s.replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const cut = s.slice(0, n - 1); return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length).replace(/[,;:.\s]+$/, '')}…`; };
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const STATUS = (v) => { v = String(v || '').toLowerCase(); return v === 'operational' ? ['op', 'In operation'] : v === 'pilot' || v === 'testing' ? ['pilot', 'Pilot or trial'] : v === 'planned' ? ['ann', 'Announced'] : ['unc', 'Unconfirmed']; };
const RANK = { op: 0, pilot: 1, ann: 2, unc: 3 };
const STATUS_LABEL = { op: 'In operation', pilot: 'Pilot or trial', ann: 'Announced', unc: 'Unconfirmed' };
const ROLE = { maker: 'Maker', customer_operator: 'Operator or customer', customer_investor: 'Customer and investor', technology_partner: 'Technology partner or integrator' };
const firstUrl = (v) => String(v || '').match(/https?:\/\/[^\s|,;]+/)?.[0] ?? null;

export const robotPath = (slug) => `/robots/${slug.replace(/^r-/, '')}/`;
export const companySlug = (id) => id.replace(/^(mfr|org)_/, '').replace(/_/g, '-');

// ---------- model: what is public ----------
export function publicModel() {
  const exported = read('data/humanoids-catalogue.json');
  const overrides = read('tools/humanoids-facet-overrides.json').overrides;
  const { models } = buildData(exported, overrides, null);
  const facets = new Map(models.map((m) => [m.id, m]));
  const records = new Map(exported.records.map((r) => [r.id, r]));
  const index = catalogueIndex();
  const { graph } = previewGraph();
  const depPreview = read('data/preview/deployments.json');
  const rows = new Map(depPreview.rows.map((r) => [r.record_id, r]));
  const entities = new Map(read('data/preview/entities.json').rows.map((r) => [r.entity_id, r]));
  const tabs = read('data/preview/index.json').tabs;
  const depTotal = tabs.find((t) => t.id === 'deployments')?.entries_total ?? null;

  const projection = read('data/public/projection.json');
  const makerOf = new Map(graph.robots.map((r) => [r.id, r.maker]));
  const previewNames = new Map(graph.companies.map((c) => [c.id, c.names]));
  // Every company of the projection, with its slug from server/src/public/projection.js.
  const companies = projection.companies.map((c) => ({ ...c, names: previewNames.get(c.id) ?? [c.name] }));
  const companyById = new Map();
  for (const c of companies) { companyById.set(c.id, c); for (const o of c.organization_ids || []) if (!companyById.has(o)) companyById.set(o, c); }

  // Public preview records, in sheet order, with only the fields a page shows (no record identifiers).
  const groups = [...new Set(graph.records.map((r) => r.deployment_id ?? r.record_id))];
  const recs = graph.records.map((g) => {
    const row = rows.get(g.record_id);
    return {
      row: row._row, group: groups.indexOf(g.deployment_id ?? g.record_id), robot: g.robot, level: g.level,
      maker: g.maker, operator: g.operator, role: g.role,
      ...Object.fromEntries(PAGE_FIELDS.map((f) => [f, row[f] ?? null])),
    };
  }).sort((a, b) => a.row - b.row);

  const robots = index.map((ix) => ({
    id: ix.id, slug: ix.slug, path: robotPath(ix.slug), name: ix.robot, lab: ix.lab,
    record: records.get(ix.id), facet: facets.get(ix.id),
    maker: companyById.get(makerOf.get(ix.id)) ?? null,
    records: recs.filter((r) => r.robot === ix.id),
    summary: projection.robots[ix.id] ?? null,
  }));
  const robotById = new Map(robots.map((r) => [r.id, r]));
  for (const c of companies) {
    c.path = `/companies/${c.slug}/`;
    const ids = new Set([c.id, ...(c.organization_ids || [])]);
    c.robotList = (c.robots || []).map((id) => robotById.get(id)).filter(Boolean);
    c.asMaker = recs.filter((r) => r.maker === c.id);
    c.asOrg = recs.filter((r) => ids.has(r.operator) && r.maker !== c.id);
  }
  void entities;
  return { robots, robotById, companies, companyById, snapshot: exported.snapshot, depSnapshot: depPreview.snapshot, depTotal, totals: projection.totals, aggregates: projection.aggregates, projSnapshot: projection.snapshot };
}

// ---------- layout ----------
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300..600&display=swap';
const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%230B0C0E'/%3E%3Crect x='4' y='4' width='8' height='8' fill='%23F0A23B'/%3E%3C/svg%3E";
function page({ title, description, path, body, type = 'website', noindex = false, refresh = null }) {
  const url = SITE + path;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}${refresh ? `<meta http-equiv="refresh" content="0; url=${esc(refresh)}">\n` : ''}<meta name="theme-color" content="#0B0C0E">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Why Humanoid?">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/assets/og/whyhumanoid-og-v1.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${ICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/assets/pages.css">
</head>
<body>
<header class="top"><a class="brand" href="/"><span class="mark" aria-hidden="true"></span>Why Humanoid?</a><nav aria-label="Site"><a href="/robots/">Robots</a><a href="/companies/">Companies</a><a href="/reports/deployment-records/">Report</a><a href="/method/">Method</a><a href="/app/">Full database</a></nav></header>
<main>
${body}
</main>
<footer class="foot"><p>Why Humanoid? by Integrarobot. Public values as recorded in the database, with their sources. Data snapshot and method on <a href="/">whyhumanoid.com</a>.</p></footer>
</body>
</html>
`;
}
const kv = (pairs) => `<dl class="kv">${pairs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
const crumbs = (items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([href, label]) => (href ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`)).join(' <span aria-hidden="true">/</span> ')}</nav>`;

// The free preview records of a robot or company, grouped by deployment, as on the catalogue page.
function recordsHtml(items, model, { showRobot = true, showOrg = true } = {}) {
  const groups = new Map();
  for (const r of items) { if (!groups.has(r.group)) groups.set(r.group, []); groups.get(r.group).push(r); }
  return [...groups.values()].map((g) => {
    const r = g[0];
    const where = [r.site_name, [r.city, r.region, r.country].filter(nz).join(', ')].filter(nz).join(' · ');
    const head = [];
    if (showOrg) {
      const c = r.operator ? model.companyById.get(r.operator) : null;
      head.push(`<b>${c ? `<a href="${c.path}">${esc(r.organization_name || c.name)}</a>` : esc(r.organization_name || 'Organisation not recorded')}</b> <span class="dim">${esc((ROLE[r.organization_role] || human(r.organization_role || 'organisation')).toLowerCase())}</span>`);
    }
    if (showRobot) {
      const rb = r.robot !== null ? model.robotById.get(r.robot) : null;
      const recorded = [r.manufacturer, r.robot_model].filter(nz).join(' ') + (nz(r.robot_version) && !/^not disclosed$/i.test(r.robot_version) ? ` (version ${r.robot_version})` : '');
      head.push(`<span class="dim">Robot as recorded:</span> ${esc(recorded || 'not recorded')}${rb ? ` → <a href="${rb.path}">${esc(rb.name)} by ${esc(rb.lab)}</a>` : ''}`);
    }
    const line = g.some((x) => x.level === 'family');
    const claims = g.map((x) => {
      const [k, l] = STATUS(x.operational_status);
      const u = firstUrl(x.source_url);
      const metric = nz(x.metric_name) ? `${human(x.metric_name)}: ${nz(x.metric_operator) && x.metric_operator !== '=' ? `${x.metric_operator} ` : ''}${x.metric_value ?? ''}${nz(x.metric_unit) ? ` ${human(x.metric_unit)}` : ''}${nz(x.metric_period) ? ` (${human(x.metric_period)})` : ''}` : '';
      const facts = [
        metric && esc(metric),
        nz(x.evidence_level) ? `Evidence ${esc(x.evidence_level)}` : 'Evidence level not recorded',
        nz(x.verification_status) ? esc(human(x.verification_status)) : '',
        nz(x.observed_start) ? `Observed ${esc(x.observed_start)}${nz(x.observed_end) ? ` to ${esc(x.observed_end)}` : ''}` : '',
        `${u ? ext(u, `${x.source_publisher || x.source_title || 'Source'} ↗`) : `${esc(x.source_publisher || x.source_title || 'Source')} (no URL)`}${nz(x.publication_date) ? `, published ${esc(x.publication_date)}` : ', publication date not recorded'}`,
      ].filter(Boolean);
      return `<li><span class="st ${k}">${l}</span> ${esc(x.task_description || human(x.task_category || 'Task not described'))}<p class="facts">${facts.join(' · ')}</p></li>`;
    }).join('');
    return `<article class="dep"><header>${head.map((h) => `<p>${h}</p>`).join('')}${where ? `<p class="where">${esc(where)}</p>` : ''}${line ? '<p class="note">The record names the same model line, not necessarily the version described here.</p>' : ''}</header><ul>${claims}</ul></article>`;
  }).join('');
}
const STATUS_KEY = '<p class="key">Status as recorded: In operation · Pilot or trial · Announced (planned or agreed, not evidence of work) · Unconfirmed (claimed by a vendor or unresolved).</p>';
const price = () => PLAN.display || '€100 per year';
// Records are claims from named sources with a status as recorded; the page says so wherever it counts them.
const RECORDS_NOTE = '<p class="key">Each deployment record is a claim from a named source, with its status as recorded: In operation, Pilot or trial, Announced (planned or agreed, not evidence of work) or Unconfirmed (claimed by a vendor or unresolved). Counting records is not independent verification. Sites, tasks, metrics, claim texts, verification and sources are in the full database.</p>';
const statusText = (st) => STATUS_KEYS_ORDER.filter((k) => st[k]).map((k) => `${st[k]} ${STATUS_LABEL[k].toLowerCase()}`).join(', ');
const STATUS_KEYS_ORDER = ['op', 'pilot', 'ann', 'unc'];
const yearsText = (y) => (y ? (y[0] === y[1] ? String(y[0]) : `${y[0]} to ${y[1]}`) : 'not recorded');
// One selected record per robot and company (approved split, phase 2), with the fields the projection allows.
function evidenceHtml(e) {
  if (!e) return '';
  const where = [e.site_name, [e.city, e.region, e.country].filter(nz).join(', ')].filter(nz).join(' · ');
  const metric = nz(e.metric_name) ? `${human(e.metric_name)}: ${nz(e.metric_operator) && e.metric_operator !== '=' ? `${e.metric_operator} ` : ''}${e.metric_value ?? ''}${nz(e.metric_unit) ? ` ${human(e.metric_unit)}` : ''}${nz(e.metric_period) ? ` (${e.metric_period})` : ''}` : '';
  const facts = [metric && esc(metric), nz(e.evidence_level) ? `Evidence level ${esc(e.evidence_level)}` : '', nz(e.verification_status) ? esc(human(e.verification_status)) : '',
    nz(e.observed_start) ? `Observed ${esc(e.observed_start)}` : '', `${ext(e.source_url, `${e.source_publisher || 'Source'} ↗`)}${nz(e.publication_date) ? `, published ${esc(e.publication_date)}` : ''}`].filter(Boolean);
  return `<section><h2>Selected evidence</h2><article class="dep"><header><p><b>${esc(e.organization_name || 'Organisation not recorded')}</b> <span class="dim">· robot as recorded: ${esc(e.robot_recorded || 'not recorded')}</span></p>${where ? `<p class="where">${esc(where)}</p>` : ''}</header><ul><li><span class="st ${e.status}">${STATUS_LABEL[e.status]}</span> ${esc(e.task_description || 'Task not described')}<p class="facts">${facts.join(' · ')}</p></li></ul></article>
<p class="key">One record chosen by a fixed rule (<a href="/method/">method</a>): the most advanced status as recorded, then a primary source, then customer confirmation, then the latest publication. It is one claim as recorded, not verification.</p></section>`;
}

// A summary of the projection (counts and counterparts only) and its table of counterparts.
function summaryHtml(sum, model, { head, otherLabel }) {
  if (!sum) return '';
  const rows = sum.counterparts.map((x) => {
    const c = x.company ? model.companyById.get(x.company) : null;
    const rb = x.robot !== null && x.robot !== undefined ? model.robotById.get(x.robot) : null;
    return `<tr><td>${c ? `<a href="${c.path}">${esc(x.name)}</a>` : esc(x.name || 'Not recorded')}</td><td>${esc(x.robot_recorded || 'Not recorded')}${rb ? `<br><a href="${rb.path}">${esc(rb.name)} by ${esc(rb.lab)}</a>${x.level === 'family' ? ' <span class="dim">(model line, not this version)</span>' : ''}` : ''}</td><td>${x.records}</td><td>${esc(statusText(x.status))}</td><td>${esc(yearsText(x.years))}</td></tr>`;
  }).join('');
  return `<p>${head} Status as recorded: ${esc(statusText(sum.status))}. Sectors: ${esc(sum.sectors.map(human).join(', ') || 'not recorded')}. Deployment countries: ${esc(sum.site_countries.join(', ') || 'not recorded')}. Years: ${esc(yearsText(sum.years))}.</p>
<div class="scroll"><table><thead><tr><th scope="col">${esc(otherLabel)}</th><th scope="col">Robot as recorded</th><th scope="col">Records</th><th scope="col">Status as recorded</th><th scope="col">Years</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function previewNote(model, n, what) {
  const total = model.depTotal ? `the first 10 of ${model.depTotal} Deployments records` : 'the first 10 Deployments records';
  return n
    ? `<p>${n} of the 10 free preview records (${total}) ${n === 1 ? 'names' : 'name'} ${what}.</p>`
    : `<p>None of the 10 free preview records (${total}) names ${what}. That is not evidence that there are no deployments.</p>`;
}

// ---------- robot page ----------
const SPEC_FIELDS = [
  ['Height (cm)', 'Height (cm)'], ['Weight (kg)', 'Weight (kg)'], ['Payload or carry (kg)', 'Payload/carry (kg)'], ['Runtime (hours)', 'Power (hours)'],
  ['Walking speed (km/h)', 'Walk (km/h)'], ['Running speed (km/h)', 'Run (km/h)'], ['Unveiled', 'Release'], ['Platform and mobility', 'Platform / mobility'],
  ['Degrees of freedom and grippers', 'DoF / grippers'], ['Sensors and compute', 'Sensors / compute'], ['Battery and charging', 'Battery / charging'],
  ['Software', 'Software'], ['Voice', 'Voice'], ['Clothed', 'Clothed?'], ['Autonomy and supervision', 'Autonomy / supervision'],
];
const MARKET_FIELDS = [['Price and availability', 'Price / availability'], ['B2B clients', 'B2B Client']];
const COMPANY_FIELDS = [['Company country', 'Country'], ['Listing', 'Stock'], ['Valuation', 'Valuation'], ['Rounds', 'Rounds'], ['Investors', 'Investors'], ['Careers', 'Careers']];
const LINK_FIELDS = [['Website', 'Web'], ['X', 'X'], ['LinkedIn', 'Linkedin'], ['YouTube', 'Youtube']];

function robotSummary(rb) {
  const r = rb.record;
  const parts = [`${rb.name} is a humanoid robot by ${rb.lab}${known(r.Country) ? ` (${r.Country})` : ''}.`];
  if (known(r['Platform / mobility'])) parts.push(`Platform: ${r['Platform / mobility']}.`);
  // Only plain numbers go into the summary sentence; every value, as recorded, is in Key facts.
  const nums = [['height', 'Height (cm)', 'cm'], ['weight', 'Weight (kg)', 'kg'], ['payload', 'Payload/carry (kg)', 'kg'], ['runtime', 'Power (hours)', 'h']]
    .filter(([, f]) => /^~?\d+(\.\d+)?$/.test(String(r[f] ?? '').trim())).map(([l, f, u]) => `${l} ${String(r[f]).trim()} ${u}`);
  if (nums.length) parts.push(`Recorded ${list(nums)}.`);
  if (known(r['Price / availability'])) parts.push(`Price and availability: ${r['Price / availability']}.`);
  return parts.join(' ');
}

function robotPage(rb, model) {
  const r = rb.record, chk = rb.facet.chk, m = rb.maker;
  const summary = robotSummary(rb);
  const links = LINK_FIELDS.filter(([, f]) => /^https?:\/\//.test(r[f] ?? '')).map(([l, f]) => ext(r[f], `${l} ↗`));
  const sources = chk.urls.map((u) => `<li>${ext(u, u)}</li>`).join('');
  const body = `${crumbs([['/', 'Why Humanoid?'], ['/robots/', 'Robots'], [null, rb.name]])}
<article class="entity">
<p class="kicker">Humanoid robot · catalogue record ${rb.id}</p>
<h1>${esc(rb.name)} <em>by ${m ? `<a href="${m.path}">${esc(rb.lab)}</a>` : esc(rb.lab)}</em></h1>
<p class="lede">${esc(summary)}</p>
${known(r['Buyer checks']) ? `<p class="note"><b>Before comparing:</b> ${text(r['Buyer checks'])}</p>` : ''}
<section><h2>Key facts</h2>${kv(SPEC_FIELDS.map(([l, f]) => [l, text(r[f])]))}</section>
<section><h2>Market</h2>${kv(MARKET_FIELDS.map(([l, f]) => [l, text(r[f])]))}</section>
<section><h2>Company</h2>${kv([['Maker', m ? `<a href="${m.path}">${esc(rb.lab)}</a>` : esc(rb.lab)], ...COMPANY_FIELDS.map(([l, f]) => [l, text(r[f])])])}${links.length ? `<p class="links">${links.join(' ')}</p>` : ''}</section>
<section><h2>Deployment records</h2>${rb.summary ? summaryHtml(rb.summary, model, { head: `${rb.summary.records} deployment record${rb.summary.records === 1 ? '' : 's'} in the database ${rb.summary.records === 1 ? 'names' : 'name'} ${rb.summary.model_line_only ? 'the model line of this robot, not necessarily this version' : 'this robot or its model line'}.`, otherLabel: 'Organisation' }) + RECORDS_NOTE : '<p>No deployment record in the database names this robot or its model line. The database records only deployments with a public source reviewed by Integrarobot, so this is not evidence that the robot has no deployments.</p>'}</section>
${evidenceHtml(rb.summary?.evidence)}
<section><h2>Free preview records</h2>${previewNote(model, rb.records.length, 'this robot or its model line')}${recordsHtml(rb.records, model, { showRobot: false })}${rb.records.length ? STATUS_KEY : ''}
<p class="cta"><a href="${APP}#robot/${rb.id}">Every record for this robot in full, with sites, tasks, claims, verification and sources, is in the full database (${esc(price())}) →</a></p></section>
<section><h2>Sources and checks</h2>${kv([['Last checked', text(chk.date)], ['Checks recorded', chk.statements.length ? esc(chk.statements.join('; ')) : '<span class="na">Not recorded</span>'], ['Model identity', text(r['Model checked'])]])}${sources ? `<ul class="sources">${sources}</ul>` : '<p class="na">No linked sources.</p>'}</section>
<p class="meta">Values as recorded in row ${r.sheet_row} of the Humanoids tab, free catalogue snapshot ${esc(model.snapshot)}. Also on the <a href="/#${esc(rb.slug)}">catalogue page</a>.</p>
</article>`;
  return page({ title: `${rb.name} by ${rb.lab}: specifications and sources · Why Humanoid?`, description: clip(`${summary} Specifications, sources and deployment preview.`), path: rb.path, body, type: 'article' });
}

// ---------- company page ----------
// Company facts come from its robots' catalogue rows; when they differ between robots, each value names its robot.
function companyFacts(c) {
  const out = [];
  for (const [l, f] of COMPANY_FIELDS) {
    const vals = c.robotList.map((rb) => [rb, rb.record[f]]).filter(([, v]) => nz(v));
    const distinct = [...new Set(vals.map(([, v]) => v))];
    if (!vals.length) continue;
    out.push([l, distinct.length === 1 ? text(distinct[0]) : vals.map(([rb, v]) => `${text(v)} <span class="dim">(row for ${esc(rb.name)})</span>`).join('<br>')]);
  }
  return out;
}
function companySummary(c) {
  const parts = [];
  if (c.robotList.length) {
    const country = [...new Set(c.robotList.map((rb) => rb.record.Country).filter(known))];
    parts.push(`${c.name} makes ${list(c.robotList.map((rb) => rb.name))}, ${c.robotList.length === 1 ? 'a humanoid robot' : 'humanoid robots'} in the Why Humanoid? catalogue${country.length ? `; company country as recorded: ${country.join(', ')}` : ''}.`);
  }
  const o = c.as_organisation, m = c.as_maker;
  if (o) {
    const roles = Object.keys(c.roles || {}).filter((k) => k !== 'maker').map((k) => (ROLE[k] || human(k)).toLowerCase());
    parts.push(`${c.name}${c.countries?.length ? ` (${c.countries.join(', ')})` : ''} appears as ${list(roles.length ? roles : ['organisation'])} in ${o.records} deployment record${o.records === 1 ? '' : 's'}; status as recorded: ${statusText(o.status)}.`);
  }
  if (m) parts.push(`${m.records} deployment record${m.records === 1 ? '' : 's'} name ${c.name} as the maker; status as recorded: ${statusText(m.status)}.`);
  if (!parts.length) parts.push(`${c.name} is in the Why Humanoid? database.`);
  return parts.join(' ');
}
function companyPage(c, model) {
  const summary = companySummary(c);
  const facts = companyFacts(c);
  const link = (f) => [...new Set(c.robotList.map((rb) => rb.record[f]).filter((u) => /^https?:\/\//.test(u ?? '')))];
  const links = LINK_FIELDS.flatMap(([l, f]) => link(f).map((u) => ext(u, `${l} ↗`)));
  // Robots in its records, from the projection: each with its statuses as recorded, never as robots "in use".
  const used = (c.as_organisation?.counterparts ?? []).filter((x) => x.robot !== null && x.robot !== undefined && model.robotById.get(x.robot));
  const e = c.entity;
  const sources = [...new Set([
    ...c.robotList.flatMap((rb) => rb.facet.chk.urls),
    ...[...c.asOrg, ...c.asMaker].map((r) => firstUrl(r.source_url)).filter(Boolean),
    ...(e?.reference_url ? [e.reference_url] : []),
    ...(c.evidence?.source_url ? [c.evidence.source_url] : []),
  ])];
  const roles = Object.entries(c.roles || {}).map(([k, n]) => `${ROLE[k] || human(k)} (${n} record${n === 1 ? '' : 's'})`);
  const preview = c.asOrg.length + c.asMaker.length;
  const body = `${crumbs([['/', 'Why Humanoid?'], ['/companies/', 'Companies'], [null, c.name]])}
<article class="entity">
<p class="kicker">Company${c.robotList.length ? ' · humanoid robot maker' : ''}</p>
<h1>${esc(c.name)}</h1>
<p class="lede">${esc(summary)}</p>
<section><h2>Key facts</h2>${kv([
    ...(c.robotList.length ? [['Robots in the catalogue', c.robotList.map((rb) => `<a href="${rb.path}">${esc(rb.name)}</a>`).join('<br>')]] : []),
    ...(used.length ? [['Catalogue robots in its records', used.map((x) => { const rb = model.robotById.get(x.robot); return `<a href="${rb.path}">${esc(rb.name)} by ${esc(rb.lab)}</a> <span class="dim">${esc(statusText(x.status))}${x.level === 'family' ? ' · the records name its model line, not this version' : ''}</span>`; }).join('<br>')]] : []),
    ...(roles.length ? [['Roles in the records', esc(roles.join('; '))]] : []),
    ...(c.countries?.length && !c.robotList.length ? [['Country as recorded', esc(c.countries.join(', '))]] : []),
    ...facts,
    ...(e ? [['Identity record', `${esc(e.canonical_name || c.name)}${nz(e.entity_type) ? ` · ${esc(human(e.entity_type))}` : ''}${nz(e.reviewed_at) ? ` · reviewed ${esc(e.reviewed_at)}` : ''}`]] : []),
  ])}${links.length ? `<p class="links">${links.join(' ')}</p>` : ''}</section>
${c.robotList.length ? `<section><h2>Robots</h2><ul class="cards">${c.robotList.map((rb) => `<li><a href="${rb.path}"><b>${esc(rb.name)}</b></a><span>${esc(robotSummary(rb))}</span></li>`).join('')}</ul></section>` : ''}
<section><h2>Deployment records</h2>${c.as_organisation || c.as_maker ? `${c.as_organisation ? summaryHtml(c.as_organisation, model, { head: `As organisation: ${c.as_organisation.records} record${c.as_organisation.records === 1 ? '' : 's'}.`, otherLabel: 'Maker' }) : ''}${c.as_maker ? summaryHtml(c.as_maker, model, { head: `As maker: ${c.as_maker.records} record${c.as_maker.records === 1 ? '' : 's'}.`, otherLabel: 'Organisation' }) : ''}${RECORDS_NOTE}` : '<p>No deployment record in the database names this company. The database records only deployments with a public source reviewed by Integrarobot, so this is not evidence that it has none.</p>'}</section>
${evidenceHtml(c.evidence)}
${preview ? `<section><h2>Free preview records</h2>${previewNote(model, preview, 'this company')}
${c.asMaker.length ? `<h3>As maker</h3>${recordsHtml(c.asMaker, model, { showRobot: true, showOrg: true })}` : ''}
${c.asOrg.length ? `<h3>As organisation</h3>${recordsHtml(c.asOrg, model, { showRobot: true, showOrg: false })}` : ''}
${STATUS_KEY}</section>` : ''}
<p class="cta"><a href="${APP}#company/${encodeURIComponent(c.id)}">Every record that names this company in full, with sites, tasks, claims, verification and sources, is in the full database (${esc(price())}) →</a></p>
<section><h2>Sources</h2>${sources.length ? `<ul class="sources">${sources.map((u) => `<li>${ext(u, u)}</li>`).join('')}</ul>` : ''}${c.as_organisation || c.as_maker ? '<p class="na">The source of each deployment record is in the full database.</p>' : sources.length ? '' : '<p class="na">No linked sources.</p>'}</section>
<p class="meta">Only what the public data say: the free Humanoids catalogue (snapshot ${esc(model.snapshot)}), counts and summaries of every deployment record (snapshot ${esc(model.projSnapshot)}) and the free previews of Deployments and Entities. No corporate data is added.</p>
</article>`;
  return page({ title: `${c.name}: ${c.robotList.length ? 'humanoid robots, facts and sources' : 'humanoid robot deployment records'} · Why Humanoid?`, description: clip(`${summary} Public facts and sources.`), path: c.path, body, type: 'article' });
}

// ---------- index pages, redirects, sitemap, 404 ----------
function robotsIndex(model) {
  const rows = [...model.robots].sort((a, b) => a.lab.localeCompare(b.lab) || a.name.localeCompare(b.name)).map((rb) =>
    `<tr><td><a href="${rb.path}">${esc(rb.name)}</a></td><td>${rb.maker ? `<a href="${rb.maker.path}">${esc(rb.lab)}</a>` : esc(rb.lab)}</td><td>${esc(rb.facet.c.join(' / ') || '')}</td><td>${esc(rb.record['Platform / mobility'] || '')}</td></tr>`).join('');
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, 'Robots']])}<h1>Humanoid robots</h1><p class="lede">All ${model.robots.length} robots in the free Why Humanoid? catalogue, each with its own page: specifications, maker, sources and the free preview of deployments.</p>
<div class="scroll"><table><thead><tr><th scope="col">Robot</th><th scope="col">Maker</th><th scope="col">Company country</th><th scope="col">Platform</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  return page({ title: 'Humanoid robots: all catalogue pages · Why Humanoid?', description: `All ${model.robots.length} humanoid robots in the free Why Humanoid? catalogue, each with specifications, maker, sources and a deployment preview.`, path: '/robots/', body });
}
function companiesIndex(model) {
  const rows = [...model.companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) =>
    `<tr><td><a href="${c.path}">${esc(c.name)}</a></td><td>${[c.robotList.length ? `Maker of ${c.robotList.map((rb) => `<a href="${rb.path}">${esc(rb.name)}</a>`).join(', ')}` : '', esc(Object.keys(c.roles || {}).filter((k) => k !== 'maker' || !c.robotList.length).map((k) => ROLE[k] || human(k)).join(', '))].filter(Boolean).join('; ')}</td><td>${(c.as_organisation?.records ?? 0) + (c.as_maker?.records ?? 0)}</td><td>${esc([...new Set([...c.robotList.map((rb) => rb.record.Country).filter(known), ...(c.countries || [])])].join(', '))}</td></tr>`).join('');
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, 'Companies']])}<h1>Companies</h1><p class="lede">All ${model.companies.length} companies in Why Humanoid?: the makers of the catalogue robots, the organisations named in deployment records and the makers those records name. Each page shows public facts and a summary of its deployment records; the records in full are in the full database.</p>
<div class="scroll"><table><thead><tr><th scope="col">Company</th><th scope="col">Role</th><th scope="col">Deployment records</th><th scope="col">Country as recorded</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  return page({ title: 'Companies: humanoid robot makers and operators · Why Humanoid?', description: `All ${model.companies.length} companies in Why Humanoid?: humanoid robot makers and the organisations in deployment records, with public facts and record summaries.`, path: '/companies/', body });
}
function redirectPage(to, label) {
  const body = `<h1>This page has moved</h1><p class="lede">The page for ${esc(label)} is now at <a href="${to}">${esc(SITE + to)}</a>.</p>`;
  return page({ title: `Moved: ${label} · Why Humanoid?`, description: `The page for ${label} has moved.`, path: to, body, noindex: true, refresh: to });
}
function gonePage(path, kind) {
  const body = `<h1>No longer in the public catalogue</h1><p class="lede">This ${kind} page is no longer published. See all <a href="/${kind === 'robot' ? 'robots' : 'companies'}/">${kind === 'robot' ? 'robots' : 'companies'}</a>.</p>`;
  return page({ title: `Not in the public catalogue · Why Humanoid?`, description: `This ${kind} is no longer in the public catalogue.`, path, body, noindex: true });
}
function notFound() {
  const body = `<h1>Page not found</h1><p class="lede">See all <a href="/robots/">robots</a>, all <a href="/companies/">companies</a> or the <a href="/">catalogue</a>.</p>
<script>
// A robot address with an unknown or old name but a known catalogue id goes to the current page.
(function () {
  var m = location.pathname.match(/^\\/robots\\/[a-z0-9-]*?-?(\\d+)\\/?$/);
  if (!m) return;
  fetch('/data/pages.json').then(function (r) { return r.json(); }).then(function (p) { var to = p.robots && p.robots[m[1]]; if (to && to !== location.pathname) location.replace(to); }).catch(function () {});
})();
</script>`;
  return page({ title: 'Page not found · Why Humanoid?', description: 'Page not found.', path: '/404.html', body, noindex: true });
}
// ---------- method and report (approved split, phase 2) ----------
const SECTOR = (k) => (k === 'other' ? 'Other (sectors with fewer than 3 records)' : human(k).replace(/^./, (c) => c.toUpperCase()));
function bars(rows, label) {
  const max = Math.max(1, ...rows.map((r) => r.records));
  return `<div class="scroll"><table class="bars"><thead><tr><th scope="col">${esc(label)}</th><th scope="col">Records</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.label)}</td><td><span class="bar" style="width:${Math.round((r.records / max) * 100)}%"></span> ${r.records}</td></tr>`).join('')}</tbody></table></div>`;
}
function reportPage(model) {
  const a = model.aggregates;
  const other = (k, what) => (k === 'other' ? `Other (${what} with fewer than ${a.min_cell} records, or not recorded)` : k);
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, 'Report: deployment records']])}
<article class="entity">
<p class="kicker">Report · snapshot ${esc(String(model.projSnapshot).slice(0, 10))}</p>
<h1>Humanoid robot deployment records</h1>
<p class="lede">The database holds ${model.totals.records} deployment records about ${model.totals.deployments} deployments: ${a.by_status.op} recorded as in operation, ${a.by_status.pilot} as pilots or trials, ${a.by_status.ann} as announced and ${a.by_status.unc} unconfirmed. Records are claims from named sources with their status as recorded, not verified facts, and one deployment can have several records.</p>
<section><h2>By status as recorded</h2>${bars(STATUS_KEYS_ORDER.map((k) => ({ label: STATUS_LABEL[k], records: a.by_status[k] })), 'Status as recorded')}<p class="key">Announced means planned or agreed, not evidence of work. Unconfirmed means claimed by a vendor or unresolved.</p></section>
<section><h2>By sector</h2>${bars(a.by_sector.map((r) => ({ label: SECTOR(r.key), records: r.records })), 'Sector')}</section>
<section><h2>By deployment country</h2>${bars(a.by_country.map((r) => ({ label: other(r.key, 'countries'), records: r.records })), 'Country')}</section>
<section><h2>By year</h2>${bars(a.by_year.map((r) => ({ label: other(r.key, 'years'), records: r.records })), 'Year observed or published')}</section>
<section><h2>How to read it</h2><p>Counts are of records, not of robots or sites. Every group with fewer than ${a.min_cell} records is added to «Other», so no number points at a single record. The year is the year the record was observed or, if that is missing, published. How records are collected and labelled is in the <a href="/method/">method</a>; who and where, record by record, is on each <a href="/companies/">company</a> and <a href="/robots/">robot</a> page; the records in full are in the <a href="/app/">full database</a> (${esc(price())}).</p></section>
</article>`;
  return page({ title: 'Humanoid robot deployment records: status, sectors, countries and years · Why Humanoid?', description: clip(`${model.totals.records} humanoid robot deployment records by status as recorded, sector, country and year. Records are claims from named sources, not verified facts.`), path: '/reports/deployment-records/', body, type: 'article' });
}
function methodPage(model) {
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, 'Method']])}
<article class="entity">
<p class="kicker">Method and sources</p>
<h1>How Why Humanoid? records robots and deployments</h1>
<p class="lede">Why Humanoid? records what named sources say about humanoid robots, the companies that make them and the organisations that test or use them. Every value is shown as recorded, with its source; a record is a claim, not a verified fact.</p>
<section><h2>Robots</h2><p>The catalogue holds ${model.robots.length} humanoid robots with their specifications, company and market fields, links and the date their sources were last checked. All of it is free. A value the sources do not give is shown as not published or not disclosed, never estimated.</p></section>
<section><h2>Deployment records</h2><p>A deployment record is one claim from one source about an organisation, a robot and a task. One deployment can have several records: an announcement, a pilot, a later report. Each record keeps who made the claim and when, its status as recorded, a verification label and an evidence level.</p>
${kv([['In operation', 'The source says the robot is working in operation.'], ['Pilot or trial', 'The source describes a pilot, trial or test.'], ['Announced', 'Planned or agreed, not evidence of work.'], ['Unconfirmed', 'Claimed by a vendor, or unresolved.']])}
<p>Verification labels say who reported the claim, as recorded: customer confirmed, partner reported, vendor reported, media reported or unresolved. The evidence level is a code from E0 to E5, shown as recorded; its definitions are not published.</p></section>
<section><h2>Selected evidence</h2><p>Each robot and company page shows one of its records with its site, task, status, metric, evidence level, verification label and source. The record is chosen by a fixed rule among those with a source link and a verification other than unresolved: the most advanced status as recorded (in operation, then pilot or trial, then a vendor's claim of operation, then announced), then a primary source (customer, maker or partner) before the press, then customer confirmation, then the latest publication, then a record with a metric. The claim text, notes and the other records stay in the full database.</p></section>
<section><h2>Robots, companies and records</h2><p>A record is linked to a catalogue robot only when it names that model or its model line, never because it names the maker alone. When it names the model line, the page says the record may concern another version. Companies are identified by the organisation id of the sheet or by the maker's name; no corporate data is added.</p></section>
<section><h2>Updates</h2><p>The database is updated every week from the Integrarobot newsletter, checked against primary sources. Each page shows the snapshot date of its data.</p></section>
<section><h2>What is public and what is for subscribers</h2>${kv([
    ['Public', 'The robot catalogue in full; a page for every robot and company; counts and summaries of deployment records (organisation, robot as recorded, country, sector, status and year); one selected record per robot and company; the first 10 rows of each other category; this report and method.'],
    ['Full database', `Every record in full: site, task, metrics, claim text, verification, evidence level, sources and notes; search with tags over every category; relations between robots, companies and records (${esc(price())}).`],
  ])}<p>Public counts never reveal a single record: the report groups anything under ${model.aggregates.min_cell} records.</p></section>
</article>`;
  return page({ title: 'Method and sources · Why Humanoid?', description: 'How Why Humanoid? records humanoid robots and deployment records: statuses as recorded, verification labels, links between robots and companies, updates and public data.', path: '/method/', body, type: 'article' });
}

function sitemap(model) {
  const lastmod = String(model.snapshot).slice(0, 10);
  const urls = ['/', '/robots/', '/companies/', '/reports/deployment-records/', '/method/', ...model.robots.map((r) => r.path), ...model.companies.map((c) => c.path)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
}

// ---------- build ----------
// Public map of current addresses: robot id -> path; company id (and its organisation ids) -> path.
export function pageLinks(model = publicModel()) {
  const companies = {};
  for (const c of model.companies) { companies[c.id] = c.path; for (const o of c.organization_ids || []) companies[o] ??= c.path; }
  return {
    robots: Object.fromEntries(model.robots.map((r) => [r.id, r.path])),
    makers: Object.fromEntries(model.robots.filter((r) => r.maker).map((r) => [r.id, r.maker.path])),
    companies,
  };
}

export function buildPages(registry = existsSync(new URL(REGISTRY, root)) ? read(REGISTRY) : { robots: {}, companies: {} }) {
  const model = publicModel();
  const files = new Map();
  for (const rb of model.robots) files.set(`${rb.path.slice(1)}index.html`, robotPage(rb, model));
  for (const c of model.companies) files.set(`${c.path.slice(1)}index.html`, companyPage(c, model));
  files.set('robots/index.html', robotsIndex(model));
  files.set('companies/index.html', companiesIndex(model));
  files.set('reports/deployment-records/index.html', reportPage(model));
  files.set('method/index.html', methodPage(model));
  files.set('sitemap.xml', sitemap(model));
  files.set('404.html', notFound());
  files.set('data/pages.json', `${JSON.stringify(pageLinks(model))}\n`);

  // Registry: every slug ever published stays reachable.
  const next = { note: registry.note ?? 'Every public page address ever published (tools/build-pages.mjs). Append-only: retired slugs become redirects.', robots: {}, companies: {} };
  for (const [id, slugs] of Object.entries(registry.robots ?? {})) next.robots[id] = [...slugs];
  for (const [id, v] of Object.entries(registry.companies ?? {})) next.companies[id] = { slugs: [...v.slugs], robots: [...(v.robots ?? [])], organization_ids: [...(v.organization_ids ?? [])] };
  for (const rb of model.robots) { const s = rb.path.split('/')[2]; (next.robots[rb.id] ??= []).includes(s) || next.robots[rb.id].push(s); }
  for (const c of model.companies) {
    const e = (next.companies[c.id] ??= { slugs: [], robots: [], organization_ids: [] });
    if (!e.slugs.includes(c.slug)) e.slugs.push(c.slug);
    for (const id of c.robots || []) if (!e.robots.includes(id)) e.robots.push(id);
    for (const o of c.organization_ids || []) if (!e.organization_ids.includes(o)) e.organization_ids.push(o);
  }
  const current = new Set([...files.keys()].filter((f) => /^(robots|companies)\/[^/]+\/index\.html$/.test(f)).map((f) => f.split('/')[1]));
  const add = (file, html) => { if (files.has(file)) throw new Error(`retired address clashes with a current page: ${file}`); files.set(file, html); };
  for (const [id, slugs] of Object.entries(next.robots)) {
    const rb = model.robotById.get(Number(id));
    for (const s of slugs) {
      if (rb && rb.path === `/robots/${s}/`) continue;
      if (current.has(s) && files.has(`robots/${s}/index.html`)) throw new Error(`retired robot slug ${s} is now another robot's page`);
      add(`robots/${s}/index.html`, rb ? redirectPage(rb.path, `${rb.name} by ${rb.lab}`) : gonePage(`/robots/${s}/`, 'robot'));
    }
  }
  for (const [id, v] of Object.entries(next.companies)) {
    let c = model.companies.find((x) => x.id === id);
    // A renamed company keeps its robots or organisation ids: its old addresses follow it.
    c ??= model.companies.find((x) => (x.robots || []).some((r) => v.robots.includes(r)) || (x.organization_ids || []).some((o) => v.organization_ids.includes(o)));
    for (const s of v.slugs) {
      if (c && c.slug === s) continue;
      add(`companies/${s}/index.html`, c ? redirectPage(c.path, c.name) : gonePage(`/companies/${s}/`, 'company'));
    }
  }
  return { files, registry: next, model };
}

function listGenerated() {
  const out = [];
  for (const dir of GENERATED_DIRS) {
    const base = new URL(`${dir}/`, root);
    if (!existsSync(base)) continue;
    const walk = (rel) => { for (const e of readdirSync(new URL(rel, base), { withFileTypes: true })) { const p = `${rel}${e.name}`; if (e.isDirectory()) walk(`${p}/`); else out.push(`${dir}/${p}`); } };
    walk('');
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { files, registry, model } = buildPages();
  const regText = `${JSON.stringify(registry, null, 2)}\n`;
  const stale = listGenerated().filter((f) => !files.has(f));
  if (process.argv.includes('--check')) {
    const problems = [];
    for (const [f, body] of files) if (!existsSync(new URL(f, root)) || readFileSync(new URL(f, root), 'utf8') !== body) problems.push(`${f} is not the build`);
    if (!existsSync(new URL(REGISTRY, root)) || readFileSync(new URL(REGISTRY, root), 'utf8') !== regText) problems.push(`${REGISTRY} lacks addresses of the current build`);
    for (const f of stale) problems.push(`${f} is not produced by the build`);
    if (problems.length) {
      console.error(`Public pages check FAILED (${problems.length}): run node tools/build-pages.mjs\n- ${problems.slice(0, 20).join('\n- ')}`);
      process.exit(1);
    }
  } else {
    for (const f of stale) rmSync(new URL(f, root));
    for (const [f, body] of files) { mkdirSync(dirname(fileURLToPath(new URL(f, root))), { recursive: true }); writeFileSync(new URL(f, root), body); }
    writeFileSync(new URL(REGISTRY, root), regText);
  }
  const redirects = [...files.keys()].filter((f) => /^(robots|companies)\/[^/]+\/index\.html$/.test(f)).length - model.robots.length - model.companies.length;
  console.log(`Public pages ${process.argv.includes('--check') ? 'are current' : 'written'}: ${model.robots.length} robots, ${model.companies.length} companies, ${redirects} retired addresses, sitemap with ${model.robots.length + model.companies.length + 5} URLs.`);
}
