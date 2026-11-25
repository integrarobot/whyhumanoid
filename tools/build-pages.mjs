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

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildData } from './build-site.mjs';
import { PAGE_FIELDS, catalogueIndex, previewGraph } from './relations.mjs';
import { robotPresentation } from './robot-presentation.mjs';
import { renderAtlas } from './atlas-view.mjs';
import { renderDataAtlas } from './data-atlas-view.mjs';
import { componentsModel, renderComponentsCategory, renderLockedPage, renderProductPage } from './components-view.mjs';
import { renderReportPage, renderReportsAtlas } from './reports-view.mjs';
import { casePath, casesHtml, renderCasePage, renderDeploymentsCategory } from './deployments-view.mjs';
import { offerHtml, offerLine } from './offer-view.mjs';
import { readIntegratorsAtlas, renderIntegratorProfile, renderIntegratorsCategory, renderNamedBy } from './integrators-view.mjs';
import { publicCases } from '../server/src/public/cases.js';
import { API_ORIGIN } from './build-app.mjs';
import { LIVE_SALES_OPEN, PLAN } from '../server/src/pricing.js';
import { CATEGORIES, CATEGORIES_BY_ID, SERVICES, SUBSCRIPTION } from '../server/src/access/matrix.js';
import { hostKey, urlKey } from '../server/src/import/identity.js';
import { renderEvolutionSection } from './evolution-view.mjs';

export const SITE = 'https://whyhumanoid.com';
const APP = `${SITE}/app/`;
const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const REGISTRY = 'tools/permalinks.json';
// Visit counts without cookies (approved split, phase 3): Cloudflare Web Analytics, free; the token is a public site id.
const ANALYTICS = `<!-- Cloudflare Web Analytics: visit counts without cookies (approved split, phase 3) --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "76de8d3b4a534b91bd808e724f9c1594"}'></script><!-- End Cloudflare Web Analytics -->`;
// The stylesheet URL carries a hash of its content, so a changed stylesheet is never served from a browser's cache.
const CSS_VERSION = createHash('sha256').update(readFileSync(new URL('assets/pages.css', root))).digest('hex').slice(0, 10);
// Robotics Evaluation Atlas assets, loaded on /benchmarks/ only (their own cache keys, so other pages do not change).
const assetVersion = (f) => createHash('sha256').update(readFileSync(new URL(f, root))).digest('hex').slice(0, 10);
const GENERATED_DIRS = ['robots', 'companies', 'reports', 'method', 'subscribe', ...CATEGORIES.map((c) => c.path.slice(1, -1))];

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

// Since 23 Nov 2026 a catalogue robot lives under its category, /humanoids/<slug>/; /robots/<slug>/ redirects there.
export const robotPath = (slug) => `/humanoids/${slug.replace(/^r-/, '')}/`;
export const legacyRobotPath = (slug) => `/robots/${slug.replace(/^r-/, '')}/`;
// URL slug from a display name: ASCII, lower case, hyphens. Stable addresses come from the registry, not from here.
export const slugify = (s) => String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '') || 'entry';
// Company identity across categories: the same name without legal-form suffixes, or the same website host.
const LEGAL = /\b(inc|ltd|limited|co|corp|corporation|plc|ag|sa|se|nv|llc|gmbh|kk)\b/g;
export const companyNameKey = (s) => String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').replace(LEGAL, ' ').replace(/\s+/g, ' ').trim();
// Shared platforms never identify a company.
const SHARED_HOSTS = /(^|\.)(github\.com|github\.io|huggingface\.co|linkedin\.com|x\.com|twitter\.com|youtube\.com|arxiv\.org|google\.com|medium\.com|notion\.site|wikipedia\.org|robotheca\.org|ycombinator\.com|crunchbase\.com)$/;
const companyHost = (u) => { const h = hostKey(u); return h && !SHARED_HOSTS.test(h) ? h : null; };
export const companySlug = (id) => id.replace(/^(mfr|org)_/, '').replace(/_/g, '-');

// ---------- model: what is public ----------
// English on every page (23 Nov 2026): snapshot values still in Spanish are shown as pending, countries in English.
const DISPLAY = read('tools/display-translations.json');
const PENDING = '<span class="na">English text pending</span>';
export function englishRows(datasetId, rows) {
  const pending = DISPLAY.pending[datasetId] ?? [];
  return rows.map((r) => {
    const o = { ...r, _pending: pending.filter((f) => nz(r[f])) };
    if (nz(o.country)) o.country = DISPLAY.countries[o.country] ?? o.country;
    return o;
  });
}
const shown = (r, f, fmt = text) => (r?._pending?.includes(f) ? PENDING : fmt(r?.[f]));

const readRegistry = () => (existsSync(new URL(REGISTRY, root)) ? read(REGISTRY) : { robots: {}, companies: {}, other_robots: {} });

// A slug for a key: the registry's latest slug while the name still gives it, else a new one, never one in use.
function slugFor(key, name, previous, taken) {
  const last = previous?.at(-1);
  const base = slugify(name);
  if (last && (last === base || last.replace(/-\d+$/, '') === base) && !taken.has(last)) return last;
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

export function publicModel(registry = readRegistry()) {
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

  // Display name, image and order link come from tools/robot-presentation.json; the slug keeps the recorded name.
  const presentation = robotPresentation();
  const robots = index.map((ix) => ({
    id: ix.id, slug: ix.slug, path: robotPath(ix.slug), name: presentation.get(String(ix.id))?.name ?? ix.robot, lab: ix.lab,
    present: presentation.get(String(ix.id)) ?? null,
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

  // ---- Companies from the free directories (access matrix, 23 Nov 2026): every listed company (Investment) and
  // every integrator gets one canonical company page. A directory row joins an existing company when the name is the
  // same without legal-form suffixes or the website host is the same; otherwise it is a new company. Nothing is
  // inferred beyond that: groups and subsidiaries stay separate.
  const tabMeta = new Map(tabs.map((t) => [t.id, t]));
  const byName = new Map();
  const byHost = new Map();
  const remember = (c) => {
    byName.set(companyNameKey(c.name), c);
    for (const n of c.names || []) if (!byName.has(companyNameKey(n))) byName.set(companyNameKey(n), c);
    for (const h of c.hosts || []) if (!byHost.has(h)) byHost.set(h, c);
  };
  for (const c of companies) {
    c.hosts = [...new Set([...(c.robotList || []).map((rb) => companyHost(rb.record.Web)), companyHost(c.entity?.reference_url)].filter(Boolean))];
    c.listings = []; c.integrator = null; c.categories = new Set();
    if (c.robotList.length) c.categories.add('humanoids');
    if (c.as_organisation || c.as_maker) c.categories.add('deployments');
    remember(c);
  }
  const usedSlugs = new Set(companies.map((c) => c.slug));
  const join = (name, url, make, { slugName = name, aliases = [] } = {}) => {
    const h = companyHost(url);
    let c = [name, ...aliases].map((n) => byName.get(companyNameKey(n))).find(Boolean) ?? (h ? byHost.get(h) : null);
    if (!c) {
      c = make();
      c.slug = slugFor(c.id, slugName, registry.companies?.[c.id]?.slugs, usedSlugs);
      usedSlugs.add(c.slug);
      c.path = `/companies/${c.slug}/`;
      Object.assign(c, { names: [name], hosts: h ? [h] : [], robots: [], robotList: [], asMaker: [], asOrg: [], organization_ids: [], roles: {}, listings: [], integrator: null, categories: new Set(), directoryOnly: true });
      companies.push(c);
      remember(c);
    } else if (h && !c.hosts.includes(h)) { c.hosts.push(h); byHost.set(h, c); }
    return c;
  };
  const stocks = englishRows('stocks', read('data/preview/stocks.json').rows);
  for (const r of stocks) {
    const c = join(r.name, r.url, () => ({ id: `lst_${slugify(r.name)}`, name: r.name }));
    c.listings.push(r);
    c.categories.add('investment');
  }
  // Components (subscription; product catalogue since 23 Nov 2026): the organisations of the public products, as the
  // reviewed tools/components-makers.json names them (public products only). An organisation joins the company with
  // the same name or website; otherwise it is a company under the name as recorded. Roles are the record's own.
  const cm = componentsModel();
  const makerPath = new Map();
  for (const r of [...cm.products, ...cm.software]) {
    for (const m of cm.makers[r.component_id] ?? []) {
      const h = m.url ? companyHost(m.url) : null;
      const c = join(m.name, m.url, () => ({ id: `cmp_${h ?? slugify(m.name)}`, name: m.name }));
      (c.components ??= []).push({ id: r.component_id, name: r.name, role: m.role, software: cm.software.includes(r) });
      c.categories.add('components');
      makerPath.set(m.name, c);
    }
  }
  // Integrators (24 Nov 2026): every provider of the atlas (data/integrators/atlas.json) gets one company page, its
  // integrator profile. A provider joins the company with the same name (its sheet name or canonical display name) or
  // website. A new page keeps the address its sheet name gave it before (the registry entry whose slug that name
  // gives), even when the website changed (Syntech: now synergytech.es), and shows the canonical display name.
  const integrators = readIntegratorsAtlas();
  const providerCompany = new Map();
  for (const p of integrators.providers) {
    const legacy = Object.entries(registry.companies ?? {}).find(([id, v]) => id.startsWith('int_') && v.slugs.includes(slugify(p.name)))?.[0];
    const c = join(p.display_name, p.url, () => ({ id: legacy ?? `int_${companyHost(p.url) ?? slugify(p.name)}`, name: p.display_name }), { slugName: p.name, aliases: [p.name] });
    c.integrator = p;
    c.categories.add('integrators');
    providerCompany.set(p.id, c);
  }
  for (const c of companies) c.categories = CATEGORIES.filter((k) => c.categories.has(k.id)).map((k) => k.id);
  companies.sort((a, b) => a.name.localeCompare(b.name));
  for (const c of companies) if (!companyById.has(c.id)) companyById.set(c.id, c);

  // ---- Other Robots: one page per directory entry, keyed like the backend identity (list and URL), so a renamed
  // entry keeps its address history in the registry.
  const otherTaken = new Set();
  const seenKeys = new Map();
  const otherRobots = read('data/preview/other-robots.json').rows.map((r) => {
    let key = `${r.list}|${r.url ? urlKey(r.url) ?? r.url : `name:${slugify(r.name)}`}`;
    const n = (seenKeys.get(key) ?? 0) + 1;
    seenKeys.set(key, n);
    if (n > 1) key = `${key}#${n}`;
    const slug = slugFor(key, r.name, registry.other_robots?.[key], otherTaken);
    otherTaken.add(slug);
    return { key, slug, path: `/other-robots/${slug}/`, name: r.name, url: r.url, description: r.description, list: r.list, row: r._row };
  });
  // Entries that share a name are told apart by their website in titles and descriptions.
  const nameCount = new Map();
  for (const r of otherRobots) nameCount.set(r.name.toLowerCase(), (nameCount.get(r.name.toLowerCase()) ?? 0) + 1);
  for (const r of otherRobots) r.label = nameCount.get(r.name.toLowerCase()) > 1 ? `${r.name} (${hostKey(r.url) ? (urlKey(r.url) ?? r.url) : `row ${r.row}`})` : r.name;
  const directory = (id) => ({ meta: tabMeta.get(id), rows: englishRows(id, read(`data/preview/${id}.json`).rows) });

  // ---- Deployment cases (24 Nov 2026): every case, from the public rows only, linked to robot and company pages through
  // the public relations graph (record id -> catalogue robot, maker, organisation).
  const graphByRecord = new Map(graph.records.map((g) => [g.record_id, g]));
  const cases = publicCases(depPreview.rows);
  const caseLinks = {
    company: (id) => (id ? companyById.get(id)?.path ?? null : null),
    robots: (c) => {
      const seen = new Map();
      for (const id of c.record_ids) {
        const g = graphByRecord.get(id);
        const rb = g && g.robot !== null && g.robot !== undefined ? robotById.get(g.robot) : null;
        if (rb && !seen.has(rb.id)) seen.set(rb.id, { path: rb.path, name: `${rb.name} by ${rb.lab}`, family: g.level === 'family' });
      }
      return [...seen.values()];
    },
  };
  for (const rb of robots) rb.cases = cases.filter((c) => c.record_ids.some((id) => graphByRecord.get(id)?.robot === rb.id));
  for (const c of companies) {
    const ids = new Set([c.id, ...(c.organization_ids || [])]);
    c.cases = cases.filter((k) => k.record_ids.some((id) => { const g = graphByRecord.get(id); return g && (ids.has(g.operator) || ids.has(g.maker)); }));
  }

  const companyByName = (n) => byName.get(companyNameKey(n)) ?? null;
  return { cases, caseLinks, integrators, providerCompany, companyByName, robots, robotById, companies, companyById, otherRobots, directory, stocks, cm, makerPath, snapshot: exported.snapshot, depSnapshot: depPreview.snapshot, depTotal, depPreview: depPreview.rows, totals: projection.totals, aggregates: projection.aggregates, projSnapshot: projection.snapshot, previewSnapshot: read('data/preview/index.json').snapshot };
}

// ---------- layout ----------
// The ten categories, in the confirmed order, on every page.
const nav = (section) => CATEGORIES.map((c) => `<a href="${c.path}"${c.id === section ? ' aria-current="page"' : ''}>${esc(c.label)}${c.access === 'subscription' ? '<span class="nav-lock" aria-label=" (subscription)" title="Complete data with the subscription"></span>' : ''}</a>`).join('');
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300..600&display=swap';
const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%230B0C0E'/%3E%3Crect x='4' y='4' width='8' height='8' fill='%23F0A23B'/%3E%3C/svg%3E";
function page({ title, description, path, body, type = 'website', noindex = false, refresh = null, section = null, head = '', wide = false, tail = '' }) {
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
<link rel="stylesheet" href="/assets/pages.css?v=${CSS_VERSION}">
${head}</head>
<body>
<header class="top"><a class="brand" href="/"><span class="mark" aria-hidden="true"></span>Why Humanoid?</a><nav class="cats" aria-label="Categories">${nav(section)}</nav></header>
<main${wide ? ' class="wide"' : ''}>
${body}
</main>${tail}
${section ? "<script>(function(){var a=document.querySelector('nav.cats [aria-current]');if(a&&a.parentNode.scrollWidth>a.parentNode.clientWidth)a.parentNode.scrollLeft=a.offsetLeft-a.parentNode.offsetLeft-16;})();</script>" : ''}
<footer class="foot"><nav class="more" aria-label="More"><a href="/companies/">Companies</a><a href="/reports/deployment-records/">Deployment records</a><a href="/method/">Method</a><a href="/subscribe/">Subscription</a><a href="/app/">Subscriber app</a></nav><p>Why Humanoid? by Integrarobot. Public values as recorded in the database, with their sources. Data snapshot and method on <a href="/">whyhumanoid.com</a>.</p></footer>
${ANALYTICS}
</body>
</html>
`;
}
const kv = (pairs) => `<dl class="kv">${pairs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
// Links the integrator views need, from the page model.
const integratorLinks = (model) => {
  const cases = new Set(model.cases.map((k) => casePath(k)));
  return {
    companyPath: (id) => model.providerCompany.get(id)?.path ?? null,
    casePath: (slug) => (cases.has(`/deployments/${slug}/`) ? `/deployments/${slug}/` : null),
    robotPath: (id) => model.robotById.get(id)?.path ?? null,
    makerPath: (name) => model.companyByName(name)?.path ?? null,
  };
};
const crumbs = (items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([href, label]) => (href ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`)).join(' <span aria-hidden="true">/</span> ')}</nav>`;

const price = () => PLAN.display;
// Records are claims from named sources with a status as recorded; the page says so wherever it counts them.
const RECORDS_NOTE = '<p class="key">Each deployment record is a claim from a named source, with its status as recorded: In operation, Pilot or trial, Announced (planned or agreed, not evidence of work) or Unconfirmed (claimed by a vendor or unresolved). Counting records is not independent verification. Every case is listed below with its public summary and sources; sites, task descriptions, timelines, metrics, claims and evidence relations come with the data subscription.</p>';
const statusText = (st) => STATUS_KEYS_ORDER.filter((k) => st[k]).map((k) => `${st[k]} ${STATUS_LABEL[k].toLowerCase()}`).join(', ');
const STATUS_KEYS_ORDER = ['op', 'pilot', 'ann', 'unc'];
const yearsText = (y) => (y ? (y[0] === y[1] ? String(y[0]) : `${y[0]} to ${y[1]}`) : 'not recorded');
// One selected record per robot and company (approved split, phase 2), with the fields the projection allows.
function evidenceHtml(e) {
  if (!e) return '';
  const facts = [nz(e.verification_status) ? esc(human(e.verification_status)) : '', `${ext(e.source_url, `${e.source_publisher || 'Source'} ↗`)}${nz(e.publication_date) ? `, published ${esc(e.publication_date)}` : ''}`].filter(Boolean);
  return `<section><h2>Selected evidence</h2><article class="dep"><header><p><b>${esc(e.organization_name || 'Organisation not recorded')}</b> <span class="dim">· robot as recorded: ${esc(e.robot_recorded || 'not recorded')}${nz(e.country) ? ` · ${esc(e.country)}` : ''}</span></p></header><ul><li><span class="st ${e.status}">${STATUS_LABEL[e.status]}</span><p class="facts">${facts.join(' · ')}</p></li></ul></article>
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

// Heading block of a robot page. With a reviewed image (tools/robot-presentation.json) it is a two-column head: text
// and the maker's order link on one side, the full-body cutout on the other (one column on phones).
function robotHead(rb, m, summary) {
  const p = rb.present;
  const by = m ? `<a href="${m.path}">${esc(rb.lab)}</a>` : esc(rb.lab);
  const cls = classificationOf(rb);
  const text = `<p class="kicker">${cls ? `${esc(cls.label)} · listed in the Humanoids tab` : 'Humanoid robot'} · catalogue record ${rb.id}</p>${cls ? `\n<p class="note"><b>${esc(cls.label)}.</b> Its own record says so: ${cls.excerpts.map((e) => `${esc(e.field)}: “${esc(e.text)}”`).join('; ')}. It stays in the catalogue and at this address while its place in the workbook is reviewed; ${cls.kind === 'software' ? 'it is not counted as a humanoid robot' : 'it is not counted as a confirmed humanoid robot model'}.</p>` : ''}
<h1>${esc(rb.name)} <em>by ${by}</em></h1>
<p class="lede">${esc(summary)}</p>${p?.order ? orderLink(p.order, rb) : ''}`;
  if (!p?.image) return text;
  const im = p.image;
  return `<div class="robot-head"><div class="robot-head-text">${text}</div>
<figure class="robot-figure"><picture><source type="image/webp" srcset="${esc(im.src)}"><img src="${esc(im.fallback ?? im.src)}" width="${im.width}" height="${im.height}" alt="${esc(im.alt)}" decoding="async" fetchpriority="high"></picture><figcaption>${esc(im.credit)}</figcaption></figure></div>`;
}
// An outbound link to the maker's own order page: no purchase or payment happens on Why Humanoid?.
const orderLink = (o, rb) => `<p class="order"><a class="order-btn" href="${esc(o.url)}" target="_blank" rel="noopener noreferrer external">${esc(o.label)}<span class="sr"> on ${esc(rb.lab)}'s website (opens in a new tab)</span> <span aria-hidden="true">↗</span></a><span class="order-note">${esc(o.note ?? `On ${rb.lab}'s website.`)}</span></p>`;

function robotPage(rb, model) {
  const r = rb.record, chk = rb.facet.chk, m = rb.maker;
  const summary = robotSummary(rb);
  const links = LINK_FIELDS.filter(([, f]) => /^https?:\/\//.test(r[f] ?? '')).map(([l, f]) => ext(r[f], `${l} ↗`));
  const sources = chk.urls.map((u) => `<li>${ext(u, u)}</li>`).join('');
  const body = `${crumbs([['/', 'Why Humanoid?'], ['/humanoids/', 'Humanoids'], [null, rb.name]])}
<article class="entity">
${robotHead(rb, m, summary)}
${known(r['Buyer checks']) ? `<p class="note"><b>Before comparing:</b> ${text(r['Buyer checks'])}</p>` : ''}
<section><h2>Key facts</h2>${kv(SPEC_FIELDS.map(([l, f]) => [l, text(r[f])]))}</section>
<section><h2>Market</h2>${kv(MARKET_FIELDS.map(([l, f]) => [l, text(r[f])]))}</section>
<section><h2>Company</h2>${kv([['Maker', m ? `<a href="${m.path}">${esc(rb.lab)}</a>` : esc(rb.lab)], ...COMPANY_FIELDS.map(([l, f]) => [l, text(r[f])])])}${links.length ? `<p class="links">${links.join(' ')}</p>` : ''}</section>
<section><h2>Deployment records</h2>${rb.summary ? summaryHtml(rb.summary, model, { head: `${rb.summary.records} deployment record${rb.summary.records === 1 ? '' : 's'} in the database ${rb.summary.records === 1 ? 'names' : 'name'} ${rb.summary.model_line_only ? 'the model line of this robot, not necessarily this version' : 'this robot or its model line'}.`, otherLabel: 'Organisation' }) + RECORDS_NOTE : '<p>No deployment record in the database names this robot or its model line. The database records only deployments with a public source reviewed by Integrarobot, so this is not evidence that the robot has no deployments.</p>'}</section>
${evidenceHtml(rb.summary?.evidence)}
${casesHtml(rb.cases, model.caseLinks, { heading: 'Deployment cases that name this robot' })}
${renderNamedBy(model.integrators.providers.filter((p) => p.links.robots.some((x) => x.id === rb.id)), model.integrators, { ...integratorLinks(model), heading: 'Integrators that name this robot', intro: `Providers in the Integrators category whose platform cell names ${rb.name}.` })}${rb.cases.length ? `<p class="cta"><a href="${APP}#robot/${rb.id}">The detail of every case (sites, task descriptions, timelines, metrics, claims and evidence) comes with the data subscription, ${esc(price())} →</a></p>` : ''}
<section><h2>Sources and checks</h2>${kv([['Last checked', text(chk.date)], ['Checks recorded', chk.statements.length ? esc(chk.statements.join('; ')) : '<span class="na">Not recorded</span>'], ['Model identity', text(r['Model checked'])]])}${sources ? `<ul class="sources">${sources}</ul>` : '<p class="na">No linked sources.</p>'}</section>
<p class="meta">Values as recorded in row ${r.sheet_row} of the Humanoids tab, free catalogue snapshot ${esc(model.snapshot)}. Also on the <a href="/#${esc(rb.slug)}">catalogue page</a>.</p>
</article>`;
  return page({ title: `${rb.name} by ${rb.lab}: specifications and sources · Why Humanoid?`, description: clip(`${summary} Specifications, sources and deployment cases.`), path: rb.path, body, type: 'article', section: 'humanoids' });
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
  for (const l of c.listings || []) parts.push(`${c.name} is listed${nz(l.ticker) ? ` as ${l.ticker}` : ''}${nz(l.exchange) ? ` on ${l.exchange}` : ''}${nz(l.country) ? ` (${l.country})` : ''}.`);
  if (c.integrator) {
    const st = { humanoid: 'a humanoid-specific provider', exception: 'a requested specialist exception, not counted as a humanoid provider', unconfirmed: 'a record whose humanoid scope is unconfirmed' }[c.integrator.status];
    parts.push(`${c.name} is in the Integrators category as ${st}: ${c.integrator.fields.roles.toLowerCase()}.`);
  }
  if (c.components?.length) parts.push(`${c.name} is recorded for ${c.components.map((r) => `${r.name} (${r.role.toLowerCase()})`).join(', ')} in the Components category.`);
  if (!parts.length) parts.push(`${c.name} is in the Why Humanoid? database.`);
  return parts.join(' ');
}
// Key facts with their links. An integrator page whose company has no other public facts skips the empty section.
const keyFacts = (pairs, links, skipEmpty = false) => (pairs.length || links.length || !skipEmpty ? `<section><h2>Key facts</h2>${pairs.length || !skipEmpty ? kv(pairs) : ''}${links.length ? `<p class="links">${links.join(' ')}</p>` : ''}</section>` : '');
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
    ...(c.integrator?.sources ?? []),
    ...(c.listings || []).flatMap((l) => [l.source, ...String(l.etf_sources ?? '').split(/[\s|,;]+/)].filter((u) => /^https?:\/\//.test(u ?? ''))),
  ])];
  const roles = Object.entries(c.roles || {}).map(([k, n]) => `${ROLE[k] || human(k)} (${n} record${n === 1 ? '' : 's'})`);
  const body = `${crumbs([['/', 'Why Humanoid?'], ['/companies/', 'Companies'], [null, c.name]])}
<article class="entity">
<p class="kicker">Company${c.robotList.length ? ' · humanoid robot maker' : ''}${c.listings?.length ? ' · listed' : ''}${c.integrator ? ' · integrator' : ''}${c.components?.length ? ' · components' : ''}</p>
<h1>${esc(c.name)}</h1>
${c.categories?.length ? `<p class="meta">In ${c.categories.map((id) => { const k = CATEGORIES_BY_ID.get(id); return `<a href="${k.path}">${esc(k.label)}</a>`; }).join(' · ')}</p>` : ''}
<p class="lede">${esc(summary)}</p>
${keyFacts([
    ...(c.robotList.length ? [['Robots in the catalogue', c.robotList.map((rb) => `<a href="${rb.path}">${esc(rb.name)}</a>`).join('<br>')]] : []),
    ...(used.length ? [['Catalogue robots in its records', used.map((x) => { const rb = model.robotById.get(x.robot); return `<a href="${rb.path}">${esc(rb.name)} by ${esc(rb.lab)}</a> <span class="dim">${esc(statusText(x.status))}${x.level === 'family' ? ' · the records name its model line, not this version' : ''}</span>`; }).join('<br>')]] : []),
    ...(roles.length ? [['Roles in the records', esc(roles.join('; '))]] : []),
    ...(c.countries?.length && !c.robotList.length ? [['Country as recorded', esc(c.countries.join(', '))]] : []),
    ...facts,
    ...(e ? [['Identity record', `${esc(e.canonical_name || c.name)}${nz(e.entity_type) ? ` · ${esc(human(e.entity_type))}` : ''}${nz(e.reviewed_at) ? ` · reviewed ${esc(e.reviewed_at)}` : ''}`]] : []),
  ], links, Boolean(c.integrator))}
${c.listings?.length ? `<section><h2>Listing</h2>${c.listings.map((l) => kv([
    ['Ticker', text(l.ticker)], ['Exchange', text(l.exchange)], ['Country as recorded', text(l.country)],
    ...[['Segment', 'segment'], ['ISIN', 'isin'], ['Currency', 'currency'], ['ETF membership', 'etf_membership'], ['ETF membership as of', 'etf_as_of'], ['Verified', 'verified_at']].filter(([, f]) => nz(l[f])).map(([k, f]) => [k, shown(l, f)]),
    ...(nz(l.description) ? [['Description as recorded', shown(l, 'description')]] : []),
    ...(nz(l.url) ? [['Website', ext(l.url)]] : []),
  ])).join('')}<p class="key">From the Investment category (listed companies, snapshot ${esc(String(model.previewSnapshot).slice(0, 10))}). Market quotes are not published.</p></section>` : ''}
${c.components?.length ? `<section><h2>Components</h2><ul class="links">${c.components.map((r) => `<li><a href="/components/${esc(r.id.toLowerCase())}/">${esc(r.name)}</a> <span class="dim">${esc(r.role)}${r.software ? ' · related software' : ''}</span></li>`).join('')}</ul><p class="key">Public products of the <a href="/components/">Components</a> category, with the role their record states${c.directoryOnly ? '; the database records this name, not a legal name' : ''}.</p></section>` : ''}
${c.integrator ? renderIntegratorProfile(c.integrator, model.integrators, integratorLinks(model)) : ''}${renderNamedBy(model.integrators.providers.filter((p) => p.links.makers.some((m) => model.companyByName(m) === c)), model.integrators, { ...integratorLinks(model), heading: 'Integrators that name its robots', intro: `Providers in the Integrators category whose platform cell names ${c.name} robots.` })}
${c.robotList.length ? `<section><h2>Robots</h2><ul class="cards">${c.robotList.map((rb) => `<li><a href="${rb.path}"><b>${esc(rb.name)}</b></a><span>${esc(robotSummary(rb))}</span></li>`).join('')}</ul></section>` : ''}
<section><h2>Deployment records</h2>${c.directoryOnly ? '<p>No deployment record is linked to this company page. Records are linked to a company by the organisation id of the sheet or by the maker\'s name as recorded, so a record that names it differently is not linked here.</p>' : c.as_organisation || c.as_maker ? `${c.as_organisation ? summaryHtml(c.as_organisation, model, { head: `As organisation: ${c.as_organisation.records} record${c.as_organisation.records === 1 ? '' : 's'}.`, otherLabel: 'Maker' }) : ''}${c.as_maker ? summaryHtml(c.as_maker, model, { head: `As maker: ${c.as_maker.records} record${c.as_maker.records === 1 ? '' : 's'}.`, otherLabel: 'Organisation' }) : ''}${RECORDS_NOTE}` : '<p>No deployment record in the database names this company. The database records only deployments with a public source reviewed by Integrarobot, so this is not evidence that it has none.</p>'}</section>
${evidenceHtml(c.evidence)}
${casesHtml(c.cases ?? [], model.caseLinks, { heading: 'Deployment cases that name this company' })}
${c.cases?.length ? `<p class="cta"><a href="${APP}#company/${encodeURIComponent(c.id)}">The detail of every case (sites, task descriptions, timelines, metrics, claims and evidence) comes with the data subscription, ${esc(price())} →</a></p>` : ''}
<section><h2>Sources</h2>${sources.length ? `<ul class="sources">${sources.map((u) => `<li>${ext(u, u)}</li>`).join('')}</ul>` : '<p class="na">No linked sources.</p>'}</section>
<p class="meta">Only what the public data say: the free Humanoids catalogue (snapshot ${esc(model.snapshot)}), the public summary of every deployment case (snapshot ${esc(model.projSnapshot)}), the public identity register and the free Investment and Integrators categories${c.integrator ? ` (Integrators snapshot ${esc(String(model.integrators.snapshot ?? '').slice(0, 10))})` : ''}. No corporate data is added.</p>
</article>`;
  return page({ head: c.integrator ? `<link rel="stylesheet" href="/assets/integrators.css?v=${assetVersion('assets/integrators.css')}">\n` : '', title: `${c.name}: ${c.robotList.length ? 'humanoid robots, facts and sources' : c.integrator ? 'integrator profile, services and sources' : c.directoryOnly ? 'company facts and sources' : 'humanoid robot deployment records'} · Why Humanoid?`, description: clip(`${summary} Public facts and sources.`), path: c.path, body, type: 'article' });
}

// ---------- index pages, redirects, sitemap, 404 ----------
function companiesIndex(model) {
  const rows = [...model.companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) =>
    `<tr><td><a href="${c.path}">${esc(c.name)}</a></td><td>${[c.robotList.length ? `Maker of ${c.robotList.map((rb) => `<a href="${rb.path}">${esc(rb.name)}</a>`).join(', ')}` : '', esc(Object.keys(c.roles || {}).filter((k) => k !== 'maker' || !c.robotList.length).map((k) => ROLE[k] || human(k)).join(', '))].filter(Boolean).join('; ')}</td><td>${(c.as_organisation?.records ?? 0) + (c.as_maker?.records ?? 0)}</td><td>${esc([...new Set([...c.robotList.map((rb) => rb.record.Country).filter(known), ...(c.countries || [])])].join(', '))}</td></tr>`).join('');
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, 'Companies']])}<h1>Companies</h1><p class="lede">All ${model.companies.length} companies in Why Humanoid?, one page each: the listed companies of Investment, the integrators, the makers of the catalogue robots, the organisations named in deployment records and the makers those records name. Each page shows public facts and a summary of its deployment records; the records in full are with the Deployments subscription.</p>
<div class="scroll"><table><thead><tr><th scope="col">Company</th><th scope="col">Role</th><th scope="col">Deployment records</th><th scope="col">Country as recorded</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  return page({ title: 'Companies: humanoid robot makers and operators · Why Humanoid?', description: `All ${model.companies.length} companies in Why Humanoid?: humanoid robot makers and the organisations in deployment records, with public facts and record summaries.`, path: '/companies/', body });
}
function redirectPage(to, label) {
  const body = `<h1>This page has moved</h1><p class="lede">The page for ${esc(label)} is now at <a href="${to}">${esc(SITE + to)}</a>.</p>`;
  return page({ title: `Moved: ${label} · Why Humanoid?`, description: `The page for ${label} has moved.`, path: to, body, noindex: true, refresh: to });
}
function gonePage(path, kind) {
  const index = kind === 'robot' ? ['/humanoids/', 'humanoid robots'] : kind === 'other robot' ? ['/other-robots/', 'other robots'] : kind === 'report' ? ['/reports/', 'reports'] : kind === 'deployment case' ? ['/deployments/', 'deployment cases'] : ['/companies/', 'companies'];
  const body = `<h1>No longer in the public catalogue</h1><p class="lede">This ${kind} page is no longer published. See all <a href="${index[0]}">${index[1]}</a>.</p>`;
  return page({ title: `Not in the public catalogue · Why Humanoid?`, description: `This ${kind} is no longer in the public catalogue.`, path, body, noindex: true });
}
function movedRobotPage(mv, path) {
  const r = mv.record;
  const body = `${crumbs([['/', 'Why Humanoid?'], ['/humanoids/', 'Humanoids'], [null, r.Robot]])}
<article class="entity">
<p class="kicker">Moved out of the Humanoids catalogue · former catalogue record ${mv.id}</p>
<h1>${esc(r.Robot)} <em>by ${esc(r.Lab)}</em></h1>
<p class="note"><b>Now in ${esc(mv.to.label)}:</b> the research workbook moved this record out of the Humanoids tab; it is listed in <a href="${esc(mv.to.path)}">${esc(mv.to.label)}</a> as “${esc(mv.to.name)}”. It is not counted as a humanoid robot. This page keeps its last public values in the Humanoids catalogue, for reference.</p>
<section><h2>Last values in the Humanoids catalogue</h2>${kv(Object.keys(r).filter((f) => !['id', 'sheet_row'].includes(f) && known(r[f])).map((f) => [f, text(r[f])]))}</section>
<p class="meta">Historical record, kept at its address. Moved: ${esc(mv.evidence)}</p>
</article>`;
  return page({ title: `${r.Robot} (moved to ${mv.to.label}) · Why Humanoid?`, description: clip(`${r.Robot} by ${r.Lab} is no longer in the Humanoids catalogue: it is now listed in ${mv.to.label} as ${mv.to.name}.`), path, body, type: 'article', section: 'humanoids', noindex: true });
}
function notFound() {
  const body = `<h1>Page not found</h1><p class="lede">See the categories: ${CATEGORIES.map((c) => `<a href="${c.path}">${esc(c.label)}</a>`).join(', ')}; all <a href="/companies/">companies</a>; or the <a href="/">home page</a>.</p>
<script>
// A robot address with an unknown or old name but a known catalogue id goes to the current page.
(function () {
  var m = location.pathname.match(/^\\/(?:robots|humanoids)\\/[a-z0-9-]*?-?(\\d+)\\/?$/);
  if (!m) return;
  fetch('/data/pages.json').then(function (r) { return r.json(); }).then(function (p) { var to = p.robots && p.robots[m[1]]; if (to && to !== location.pathname) location.replace(to); }).catch(function () {});
})();
</script>`;
  return page({ title: 'Page not found · Why Humanoid?', description: 'Page not found.', path: '/404.html', body, noindex: true });
}
// ---------- category pages (access matrix, 23 Nov 2026) ----------
// One directly loadable page per confirmed category, in the HTML itself. Free categories list every public entry;
// Deployments and Components show their public preview and say what the subscription adds. Gaps in the master
// workbook are stated, never filled.
const accessBadge = (c) => (c.access === 'subscription' ? '<span class="badge sub">Subscription</span>' : '<span class="badge">Free</span>');
const subscriptionCta = (what) => `<p class="cta"><a href="/subscribe/">${esc(what)} comes with the data subscription, ${esc(price())} billed annually${LIVE_SALES_OPEN ? '' : ' (new subscriptions open soon)'} →</a></p>`;
function serviceHtml(id) {
  const sv = SERVICES.find((x) => x.id === id);
  if (!sv) return '';
  return `<aside class="service" id="report-${esc(sv.id)}" aria-label="Custom company report"><p class="kicker">Custom company report · not available to order yet</p><h3>${esc(sv.name)}</h3><p>${esc(sv.summary)}</p><p class="key">${esc(sv.price)} per report, separate from the data subscription and with no subscription needed. Not available to order yet: its scope and how it works are still being defined.</p></aside>`;
}
function categoryHead(c, model, extra = '') {
  return `${crumbs([['/', 'Why Humanoid?'], [null, c.label]])}
<article class="entity">
<p class="kicker">Category ${CATEGORIES.indexOf(c) + 1} of ${CATEGORIES.length}${accessBadge(c)}</p>
<h1>${esc(c.label)}</h1>
<p class="lede">${esc(c.summary)}</p>
${c.gap ? `<p class="gap"><b>Coverage:</b> ${esc(c.gap)}</p>` : ''}${extra}${EVOLUTION.has(c.id) ? `\n${renderEvolutionSection(EVOLUTION.get(c.id))}` : ''}`;
}
// Evolution charts (Javier, 24 Nov 2026): the large chart of each of the seven sections, first after the page header,
// from data/evolution/charts.json (tools/export-evolution.mjs). The same chart model feeds the home carousel.
const EVOLUTION = new Map(JSON.parse(readFileSync(new URL('data/evolution/charts.json', root), 'utf8')).charts.map((c) => [c.id, c]));
const evolutionHead = () => `<link rel="stylesheet" href="/assets/evolution.css?v=${assetVersion('assets/evolution.css')}">\n`;
const evolutionTail = () => `\n<script src="/assets/evolution.js?v=${assetVersion('assets/evolution.js')}" defer></script>`;
function withEvolution(c, body) {
  const evo = EVOLUTION.get(c.id);
  if (!evo || body.includes('id="evolution"')) return body;
  // A section can follow its chart with a second one (Benchmarks: the dated results after the publication chronology).
  const section = `${renderEvolutionSection(evo)}${evo.secondary ? `\n${renderEvolutionSection(evo.secondary, { anchor: 'evolution-results' })}` : ''}`;
  const at = body.indexOf('</header>');
  if (at < 0) throw new Error(`${c.id}: no page header to place the evolution chart after`);
  return `${body.slice(0, at + 9)}\n${section}${body.slice(at + 9)}`;
}
const catPage = (c, model, body, description, opts = {}) => (EVOLUTION.has(c.id) ? page({ title: opts.title ?? `${c.label}: ${c.summary.replace(/[.:].*$/, '').toLowerCase()} · Why Humanoid?`, description: clip(description), path: c.path, body: `${withEvolution(c, body)}\n</article>`, section: c.id, ...opts, head: `${opts.head ?? ''}${evolutionHead()}`, tail: `${opts.tail ?? ''}${evolutionTail()}` }) : page({ title: opts.title ?? `${c.label}: ${c.summary.replace(/[.:].*$/, '').toLowerCase()} · Why Humanoid?`, description: clip(description), path: c.path, body: `${body}\n</article>`, section: c.id, ...opts }));
const dirTable = (rows, cols) => `<div class="scroll"><table class="dir"><thead><tr>${cols.map(([h]) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map(([, f]) => `<td>${f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const nameLink = (r) => (nz(r.url) ? ext(r.url, r.name) : esc(r.name));
const descr = (r) => (r._pending?.includes('description') ? PENDING : nz(r.description) ? text(r.description) : '<span class="na">No description recorded</span>');
const counted = (meta) => { const n = meta.canonical_entries ?? meta.entries_total; return `${n} ${n === 1 ? 'entry' : 'entries'}`; };

function humanoidsCategory(model) {
  const c = CATEGORIES_BY_ID.get('humanoids');
  const sorted = [...model.robots].sort((a, b) => a.lab.localeCompare(b.lab) || a.name.localeCompare(b.name));
  const software = sorted.filter((rb) => classificationOf(rb)?.kind === 'software');
  const movedList = read('data/humanoids-catalogue.json').moved ?? [];
  const uncertain = sorted.filter((rb) => classificationOf(rb)?.kind === 'uncertain');
  const rows = sorted.filter((rb) => classificationOf(rb)?.kind !== 'software').map((rb) =>
    `<tr><td><a href="${rb.path}">${esc(rb.name)}</a>${classificationOf(rb) ? ` <span class="dim">(${esc(classificationOf(rb).label.toLowerCase())})</span>` : ''}</td><td>${rb.maker ? `<a href="${rb.maker.path}">${esc(rb.lab)}</a>` : esc(rb.lab)}</td><td>${esc(rb.facet.c.join(' / ') || '')}</td><td>${esc(rb.record['Platform / mobility'] || '')}</td></tr>`).join('');
  const body = `${categoryHead(c, model)}
<p>All ${model.robots.length} entries of the catalogue are free, each with its own page: specifications, maker, funding, sources and a summary of its deployment records. ${model.robots.length - software.length - uncertain.length} are humanoid robot models${uncertain.length ? `; ${uncertain.length} ${uncertain.length === 1 ? 'is' : 'are'} listed with an uncertain scope (${uncertain.map((rb) => `${esc(rb.name)} by ${esc(rb.lab)}: ${esc(classificationOf(rb).label.toLowerCase())}`).join('; ')})` : ''}${software.length ? `; ${software.length} are software or AI models recorded in the Humanoids tab, listed apart below and not counted as robots` : ''}. ${movedList.length} former entries were moved by the workbook to other categories and keep a page at their address (listed below). The <a href="/#humanoids">interactive catalogue</a> adds search, filters and charts.</p>
<div class="scroll"><table><thead><tr><th scope="col">Robot</th><th scope="col">Maker</th><th scope="col">Company country</th><th scope="col">Platform</th></tr></thead><tbody>${rows}</tbody></table></div>
${software.length ? `<section><h2>Software and AI models in the Humanoids tab <span class="dim">(${software.length})</span></h2><p>Recorded in the Humanoids tab of the workbook but, by their own records, software or AI models rather than robots. Their pages and addresses stay; they are not counted as humanoid robots.</p><div class="scroll"><table><thead><tr><th scope="col">Entry</th><th scope="col">Maker</th><th scope="col">What its record says</th></tr></thead><tbody>${software.map((rb) => `<tr><td><a href="${rb.path}">${esc(rb.name)}</a></td><td>${rb.maker ? `<a href="${rb.maker.path}">${esc(rb.lab)}</a>` : esc(rb.lab)}</td><td>${classificationOf(rb).excerpts.map((e) => `${esc(e.field)}: “${esc(e.text)}”`).join('; ')}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
<section><h2>Moved to other categories <span class="dim">(${movedList.length})</span></h2><p>Former catalogue entries that the research workbook moved out of the Humanoids tab. Their pages stay at the same address with their last values; they are not counted here.</p><ul>${movedList.map((m) => `<li><a href="/humanoids/${esc((read('tools/permalinks.json').robots[m.id] ?? [])[0] ?? '')}/">${esc(m.record.Robot)}</a> by ${esc(m.record.Lab)}: now in <a href="${esc(m.to.path)}">${esc(m.to.label)}</a> as “${esc(m.to.name)}”</li>`).join('')}</ul></section>
<p class="meta">Free catalogue snapshot ${esc(model.snapshot)}.</p>`;
  return catPage(c, model, body, `All ${model.robots.length} humanoid robots in the free Why Humanoid? catalogue, each with specifications, maker, funding, sources and a deployment summary.`);
}

// Deployments (Javier, 24 Nov 2026): every case public with its summary, filters and adoption views
// (tools/deployments-view.mjs); the detail of each case with the data subscription.
const deploymentsHead = () => `<link rel="stylesheet" href="/assets/deployments.css?v=${assetVersion('assets/deployments.css')}">\n`;
const deploymentsTail = () => `\n<script src="/assets/deployments.js?v=${assetVersion('assets/deployments.js')}" defer></script>`;
function deploymentsCategory(model) {
  const c = CATEGORIES_BY_ID.get('deployments');
  const body = renderDeploymentsCategory({
    cases: model.cases, records: model.depPreview.length, links: model.caseLinks, snapshot: model.depSnapshot,
    head: categoryHead(c, model), offer: offerHtml({ heading: 'Go further with Deployments', id: 'offer' }),
  });
  return catPage(c, model, `${body}\n${serviceHtml(c.service)}`, `All ${model.cases.length} humanoid robot deployment cases, free: who is testing or using humanoid robots, which robot, sector, country, task, status as recorded and sources. The detail of each case with the data subscription, US$100 per year.`, {
    title: 'Deployments: every humanoid robot deployment case, with status and sources · Why Humanoid?', head: deploymentsHead(), tail: deploymentsTail(),
  });
}
function casePages(model) {
  const out = new Map();
  for (const k of model.cases) {
    const name = `${k.organisations.map((o) => o.name).filter(Boolean).join(' and ') || 'Deployment case'}`;
    const body = `${crumbs([['/', 'Why Humanoid?'], ['/deployments/', 'Deployments'], [null, name]])}
<article class="entity">
${renderCasePage(k, model.caseLinks)}
${offerLine()}
<p class="meta">Public summary of ${k.records} Deployments record${k.records === 1 ? '' : 's'}, snapshot ${esc(String(model.depSnapshot).slice(0, 10))}. <a href="/deployments/">All cases</a>.</p>
</article>`;
    out.set(`${casePath(k).slice(1)}index.html`, page({ title: `${name}: humanoid robot deployment case · Why Humanoid?`, description: clip(`${name} and ${k.robots.map((r) => [r.manufacturer, r.model].filter(Boolean).join(' ')).join('; ') || 'a robot'}: ${k.status.detail}, ${k.sectors.join(', ').replace(/_/g, ' ')}, ${k.countries.join(', ')}. Public summary with sources.`), path: casePath(k), body, type: 'article', section: 'deployments', head: deploymentsHead() }));
  }
  return out;
}

// Components explorer (Javier, 23 Nov 2026): the public first product rows, coverage counts for every row, and the
// subscriber view rendered by assets/components.js after the API's entitlement check (tools/components-view.mjs).
function componentsCategory(model) {
  const c = CATEGORIES_BY_ID.get('components');
  const cm = model.cm;
  const companyPath = (name) => model.makerPath.get(name)?.path ?? null;
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, c.label]])}
<article class="entity atlas-page">
${renderComponentsCategory(cm, { index: CATEGORIES.indexOf(c) + 1, total: CATEGORIES.length, badge: accessBadge(c) }, companyPath, API_ORIGIN).replace('</header>', `</header>\n${offerHtml({ heading: 'Go further with Components', id: 'offer' })}`)}
<section class="atlas-sec"><h2>With the subscription</h2><p>The full technical passport of all ${cm.total} products with every field and its source, technical filters, the full side-by-side comparison, and the same view in the subscriber app.</p>${subscriptionCta('Complete Components')}</section>
${serviceHtml(c.service)}`;
  return catPage(c, model, body, `Components: the building blocks of embodied intelligence. All ${cm.total} tactile sensing products and related software listed free with maker, status, sensing approach, what they measure and main source; full technical passports with the data subscription.`, {
    title: 'Components: the building blocks of embodied intelligence · Why Humanoid?',
    head: componentsHead(),
    tail: componentsTail(),
    wide: true,
  });
}
const componentsHead = () => `<link rel="stylesheet" href="/assets/atlas.css?v=${assetVersion('assets/atlas.css')}">\n<link rel="stylesheet" href="/assets/components.css?v=${assetVersion('assets/components.css')}">\n${deploymentsHead()}`;
const componentsTail = () => `\n<script src="/assets/components-core.js?v=${assetVersion('assets/components-core.js')}" defer></script>\n<script src="/assets/components.js?v=${assetVersion('assets/components.js')}" defer></script>`;
function componentPages(model) {
  const cm = model.cm;
  const out = new Map();
  const companyPath = (name) => model.makerPath.get(name)?.path ?? null;
  const pub = new Set([...cm.products, ...cm.software].map((r) => r.component_id));
  const crumb = (name) => crumbs([['/', 'Why Humanoid?'], ['/components/', 'Components'], [null, name]]);
  for (const r of [...cm.products, ...cm.software]) {
    const path = `/components/${r.component_id.toLowerCase()}/`;
    const body = `${crumb(r.name)}\n<article class="entity atlas-page">\n${renderProductPage(cm, r, companyPath)}`;
    out.set(`components/${r.component_id.toLowerCase()}/index.html`, page({ title: `${r.name}: ${r.family ?? 'component'} passport · Why Humanoid?`, description: clip(`${r.name}: ${r.principle ?? ''} ${r.measured ?? ''}`), path, body: `${body}\n</article>`, section: 'components', head: componentsHead(), tail: componentsTail(), wide: true }));
  }
  for (const id of [...cm.coverage.ids.products, ...cm.coverage.ids.software].filter((x) => !pub.has(x))) {
    const path = `/components/${id.toLowerCase()}/`;
    const body = `${crumb(id)}\n<article class="entity atlas-page">\n${renderLockedPage(id, API_ORIGIN)}`;
    out.set(`components/${id.toLowerCase()}/index.html`, page({ title: `Component ${id} · Why Humanoid?`, description: `Component ${id}: a product passport of the complete Components category, for subscribers.`, path, body: `${body}\n</article>`, section: 'components', noindex: true, head: componentsHead(), tail: componentsTail(), wide: true }));
  }
  return out;
}

function directoryCategory(id, datasetId, model, { lists = null, intro = '', companyLinks = false } = {}) {
  const c = CATEGORIES_BY_ID.get(id);
  const { meta, rows } = model.directory(datasetId);
  const company = (r) => (companyLinks ? model.companies.find((x) => x.integrator && x.integrator._row === r._row && x.integrator.name === r.name) : null);
  // Canonical directory entries (server/src/catalogue/directory.js): other names, other descriptions, the group and the
  // other lists an entry also belongs to are shown with it; a membership row points to its canonical entry.
  const extra = (r) => [
    r.group ? `<span class="dim">Group: ${esc(r.group)}</span>` : '',
    r.other_groups?.length ? `<span class="dim">Also under: ${esc(r.other_groups.join(', '))}</span>` : '',
    r.other_names?.length ? `<span class="dim">Also recorded as: ${esc(r.other_names.join(', '))}</span>` : '',
    r.also_listed_as?.length ? `<span class="dim">Also listed as: ${esc(r.also_listed_as.map((l) => l.replace(/_/g, ' ')).join(', '))}</span>` : '',
    r.canonical === false ? `<span class="dim">Same entry as “${esc(r.canonical_name)}” (${esc(String(r.canonical_list).replace(/_/g, ' '))}): listed here, counted once</span>` : '',
  ].filter(Boolean).join('<br>');
  const cols = [['Name', (r) => { const co = company(r); const x = extra(r); return `${co ? `<a href="${co.path}">${esc(r.name)}</a>` : nameLink(r)}${x ? `<br>${x}` : ''}`; }], ['Description as recorded', (r) => `${descr(r)}${r.other_descriptions?.length ? r.other_descriptions.map((d) => `<br><span class="dim">Also described as: ${text(d)}</span>`).join('') : ''}`], ['Link', (r) => (nz(r.url) ? ext(r.url) : '<span class="na">Not recorded</span>')]];
  const sections = (lists ?? [[null, null]]).map(([list, label]) => {
    const sel = list ? rows.filter((r) => r.list === list) : rows;
    return `<section>${label ? `<h2>${esc(label)} <span class="dim">(${sel.length})</span></h2>` : ''}${dirTable(sel, cols)}</section>`;
  }).join('');
  const body = `${categoryHead(c, model)}
<p>${intro}All ${counted(meta)}, free.${meta.memberships ? ` ${meta.memberships} of the listed rows are the same entry in a second list (counted once).` : ''}${meta.reconciliation ? ` From ${meta.reconciliation.source_entries} rows of the workbook tab: ${meta.reconciliation.excluded.length} header or section rows are not entries and ${meta.reconciliation.merged.length} exact repeats are merged; ${meta.reconciliation.review.length} pairs with the same name or address are kept apart until reviewed.` : ''}</p>
${sections}
<p class="meta">Snapshot ${esc(String(model.previewSnapshot).slice(0, 10))}. Entries as recorded, with their links.</p>`;
  return catPage(c, model, body, `${c.summary} ${counted(meta)}, free.`);
}

// Integrators (Javier, 24 Nov 2026): the provider directory, capability comparison, named projects and overview, from
// data/integrators/atlas.json (tools/export-integrators.mjs). Free in full; every profile lives on its company page.
function integratorsCategory(model) {
  const c = CATEGORIES_BY_ID.get('integrators');
  const atlas = model.integrators;
  const n = atlas.counts;
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, c.label]])}
<article class="entity atlas-page">
${renderIntegratorsCategory(atlas, { ...integratorLinks(model), index: CATEGORIES.indexOf(c) + 1, total: CATEGORIES.length, badgeHtml: accessBadge(c) })}`;
  return catPage(c, model, body, `${n.providers} humanoid integrators and service providers (${n.humanoid} humanoid-specific): roles, services, platforms, stated territory, named projects and the evidence and limitations behind each claim. Free.`, {
    title: 'Integrators: who delivers humanoid integration, software, training and support · Why Humanoid?',
    head: `<link rel="stylesheet" href="/assets/atlas.css?v=${assetVersion('assets/atlas.css')}">\n<link rel="stylesheet" href="/assets/integrators.css?v=${assetVersion('assets/integrators.css')}">\n`,
    tail: `\n<script src="/assets/integrators.js?v=${assetVersion('assets/integrators.js')}" defer></script>`,
    wide: true,
  });
}

// Robot Learning Data Atlas (Javier, 23 Nov 2026): the Datasets catalogue and its reported quantities, from the public
// snapshot data/datasets/atlas.json (tools/export-datasets.mjs). Loads the Atlas styles shared with /benchmarks/.
function datasetsCategory() {
  const c = CATEGORIES_BY_ID.get('datasets');
  const atlas = read('data/datasets/atlas.json');
  const n = atlas.counts;
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, c.label]])}
<article class="entity atlas-page">
${renderDataAtlas(atlas, { index: CATEGORIES.indexOf(c) + 1, total: CATEGORIES.length, badge: accessBadge(c) })}`;
  return catPage(c, null, body, `Robot Learning Data Atlas: where ${n.resources} robot learning data resources come from, what they contain and how they can be used, with ${n.quantities} reported quantities from ${n.resources_with_quantities} of them. Free.`, {
    title: 'Robot Learning Data Atlas: where robot learning data comes from and how it can be used · Why Humanoid?',
    head: `<link rel="stylesheet" href="/assets/atlas.css?v=${assetVersion('assets/atlas.css')}">\n<link rel="stylesheet" href="/assets/datasets.css?v=${assetVersion('assets/datasets.css')}">\n`,
    tail: `\n<script src="/assets/datasets.js?v=${assetVersion('assets/datasets.js')}" defer></script>`,
    wide: true,
  });
}

// Robotics Evaluation Atlas (Javier, 23 Nov 2026): the Benchmarks catalogue and selected source-reported results, from
// the public snapshot data/benchmarks/atlas.json (tools/export-benchmarks.mjs). Task Evaluation is no longer shown here.
function benchmarksCategory() {
  const c = CATEGORIES_BY_ID.get('benchmarks');
  const atlas = read('data/benchmarks/atlas.json');
  const n = atlas.counts;
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, c.label]])}
<article class="entity atlas-page">
${renderAtlas(atlas, { index: CATEGORIES.indexOf(c) + 1, total: CATEGORIES.length, badge: accessBadge(c) })}`;
  return catPage(c, null, body, `Robotics Evaluation Atlas: what ${n.resources} robotics benchmark resources test, ${n.observations} source-reported model results from ${n.resources_with_results} of them, and where evidence is still missing. Free.`, {
    title: 'Robotics Evaluation Atlas: what robotics benchmarks test and what models achieve · Why Humanoid?',
    head: `<link rel="stylesheet" href="/assets/atlas.css?v=${assetVersion('assets/atlas.css')}">\n`,
    tail: `\n<script src="/assets/atlas.js?v=${assetVersion('assets/atlas.js')}" defer></script>`,
    wide: true,
  });
}

function investmentCategory(model) {
  const c = CATEGORIES_BY_ID.get('investment');
  const { meta } = model.directory('stocks');
  const company = new Map(model.companies.flatMap((co) => (co.listings || []).map((l) => [l, co])));
  const funded = model.robots.filter((rb) => known(rb.record.Valuation) || known(rb.record.Rounds) || known(rb.record.Investors));
  const body = `${categoryHead(c, model)}
<section><h2>Listed companies <span class="dim">(${meta.entries_total})</span></h2>${dirTable(model.stocks, [['Company', (r) => { const co = company.get(r); return co ? `<a href="${co.path}">${esc(r.name)}</a>` : esc(r.name); }], ['Ticker', (r) => esc(r.ticker ?? '')], ['Exchange', (r) => esc(r.exchange ?? '')], ['Country as recorded', (r) => esc(r.country ?? '')]])}
<p class="key">Every listed company has its own page. Market quotes are not published.${meta.snapshot_fields ? ` ${esc(meta.snapshot_fields)}` : ''}</p></section>
<section><h2>Funding recorded for humanoid makers <span class="dim">(${funded.length} robots)</span></h2>${dirTable(funded.sort((a, b) => a.lab.localeCompare(b.lab)), [['Robot', (rb) => `<a href="${rb.path}">${esc(rb.name)}</a> <span class="dim">by ${esc(rb.lab)}</span>`], ['Valuation', (rb) => text(rb.record.Valuation)], ['Rounds', (rb) => text(rb.record.Rounds)], ['Investors', (rb) => text(rb.record.Investors)]])}
<p class="key">From the free Humanoids catalogue, as recorded with its sources on each robot page.</p></section>
<p class="meta">Snapshots: Stocks ${esc(String(model.previewSnapshot).slice(0, 10))}, Humanoids ${esc(model.snapshot)}.</p>`;
  return catPage(c, model, body, `${meta.entries_total} listed companies exposed to humanoid robotics and the funding recorded for ${funded.length} humanoid robots, free.`);
}

function otherRobotsCategory(model) {
  const c = CATEGORIES_BY_ID.get('other-robots');
  const { meta } = model.directory('other-robots');
  const cols = [['Name', (r) => `<a href="${r.path}">${esc(r.name)}</a>`], ['Description as recorded', descr]];
  const lists = [['other_robot', 'Other robots'], ['edubot', 'Educational robots']];
  const body = `${categoryHead(c, model)}
<p>All ${counted(meta)}, free, each with its own page.</p>
${lists.map(([l, label]) => { const sel = model.otherRobots.filter((r) => r.list === l); return `<section><h2>${label} <span class="dim">(${sel.length})</span></h2>${dirTable(sel, cols)}</section>`; }).join('')}
<p class="meta">Snapshot ${esc(String(model.previewSnapshot).slice(0, 10))}.</p>`;
  return catPage(c, model, body, `${counted(meta)} non-humanoid, service and educational robots tracked by Why Humanoid?, free, each with its own page.`);
}

function otherRobotPage(r, model) {
  const label = r.list === 'edubot' ? 'Educational robot' : 'Other robot';
  const summary = nz(r.description) ? `${r.label}: ${r.description}` : `${r.label} is in the Other Robots category of Why Humanoid?.`;
  const body = `${crumbs([['/', 'Why Humanoid?'], ['/other-robots/', 'Other Robots'], [null, r.name]])}
<article class="entity">
<p class="kicker">${label}</p>
<h1>${esc(r.name)}</h1>
<p class="lede">${nz(r.description) ? text(r.description) : '<span class="na">No description recorded.</span>'}</p>
<section><h2>Key facts</h2>${kv([['List', esc(label)], ['Website', nz(r.url) ? ext(r.url) : '<span class="na">Not recorded</span>']])}</section>
<p class="meta">As recorded in the Other Robots tab, snapshot ${esc(String(model.previewSnapshot).slice(0, 10))}. Free.</p>
</article>`;
  return page({ title: `${r.label}: ${label.toLowerCase()} · Why Humanoid?`, description: clip(summary), path: r.path, body, type: 'article', section: 'other-robots' });
}

// ---------- Reports (Javier, 23 Nov 2026): Why Humanoid? analyses and a reviewed catalogue of external reports ----------
// Research Conclusions Atlas (Javier, 24 Nov 2026): the reports, their findings and the coverage matrix, from the public
// snapshot data/reports/atlas.json (tools/export-reports.mjs, validated against the master and the originals). Every
// report keeps its address; its page id is the key of the permanent-address registry.
// Catalogue records that are not a physical humanoid robot by their own record (tools/catalogue-classification.json,
// 25 Nov 2026): labelled where they appear, page and address kept. Every quoted excerpt must still be in the record.
const CLASSIFICATION = new Map(read('tools/catalogue-classification.json').records.map((c) => [c.id, c]));
function classificationOf(rb) {
  const c = CLASSIFICATION.get(rb.id);
  if (!c) return null;
  for (const e of c.excerpts) if (!String(rb.record[e.field] ?? '').includes(e.text)) throw new Error(`tools/catalogue-classification.json: record ${rb.id} field "${e.field}" no longer contains "${e.text}"`);
  return c;
}
const REPORTS_ATLAS = read('data/reports/atlas.json');
const REPORTS = REPORTS_ATLAS.reports;
export const reportPath = (r) => `/reports/${r.slug}/`;
export const publishedReports = () => REPORTS;
const reportsHead = () => `<link rel="stylesheet" href="/assets/atlas.css?v=${assetVersion('assets/atlas.css')}">\n<link rel="stylesheet" href="/assets/reports.css?v=${assetVersion('assets/reports.css')}">\n`;
const reportsTail = () => `\n<script src="/assets/reports-core.js?v=${assetVersion('assets/reports-core.js')}" defer></script>\n<script src="/assets/reports.js?v=${assetVersion('assets/reports.js')}" defer></script>`;
function reportsCategory(model) {
  const c = CATEGORIES_BY_ID.get('reports');
  const n = REPORTS_ATLAS.counts;
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, c.label]])}
<article class="entity atlas-page">
${renderReportsAtlas(REPORTS_ATLAS, { index: CATEGORIES.indexOf(c) + 1, total: CATEGORIES.length, badge: accessBadge(c) })}`;
  return catPage(c, model, body, `Research Conclusions Atlas: what ${n.reports} research reports on humanoid robots agree on, where they diverge and which assumptions drive their numbers. ${n.findings} findings, ${n.findings_checked} checked against the originals. Free.`, {
    title: 'Research Conclusions Atlas: what humanoid robot reports agree on and where they diverge · Why Humanoid?',
    head: reportsHead(),
    tail: reportsTail(),
    wide: true,
  });
}
function externalReportPage(r) {
  const fs = REPORTS_ATLAS.findings.filter((f) => f.report === r.id);
  const body = `${crumbs([['/', 'Why Humanoid?'], ['/reports/', 'Reports'], [null, r.title]])}
<article class="entity rp-page">
${renderReportPage(REPORTS_ATLAS, r)}
</article>`;
  return page({ title: `${r.title} (${r.publisher}, ${String(r.published).slice(0, 4)}): findings · Why Humanoid?`, description: clip(`${r.title}, by ${r.publisher}: scope, access and ${fs.length} findings, each with its page in the original, units, years and check. ${r.scope}`), path: reportPath(r), body, type: 'article', section: 'reports', head: reportsHead(), tail: reportsTail() });
}

function subscribePage(model) {
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, 'Subscription and reports']])}
<article class="entity">
<p class="kicker">Two ways to go further</p>
<h1>Data subscription and custom company reports</h1>
<p class="lede">Every category is free to browse, including every Deployments case and every Components product with its public summary. Two separate paths go further: the data, to decide for yourself, or a report where we apply our judgement to your company.</p>
${offerHtml({ heading: 'Choose a path', id: 'offer' })}
<section id="data"><h2>Full data access</h2>${kv([
    ['Price', `${esc(price())}, billed annually. No free trial.`],
    ['Deployments', `Every one of the ${model.cases.length} cases in detail: site, city, region and environment; commercial relationship where documented; the full task description and workflow; integration dependencies; the detailed timeline and every source claim; metrics with operator, value, unit, period and conditions; claim and evidence relations; confidence and review notes; discrepancies and open questions.`],
    ['Components', `The full technical passport of all ${model.cm.total} products: measured quantities, taxels or pixels and resolution, force range and resolution, internal and output rates, size, mass and surface, interface, SDK and ROS, durability, documented users, prices with configuration, currency, date and source, separate BOM estimates, licence, repository, design and paper detail, advantages, drawbacks and uncertainties, and the source of every field; full side-by-side comparison and technical filters.`],
    ['Search and agents', 'Detailed search across both categories, and the existing API keys for agents over them.'],
    ['What it is not', 'Access to research and data. It does not include a personalised recommendation, and missing information stays missing.'],
    ['Renewal and cancellation', 'Renews each year at the price of your subscription until you cancel; cancel at any time in the billing portal and keep access until the end of the paid year. Existing subscriptions keep their contract, currency and renewal price.'],
  ])}
${LIVE_SALES_OPEN ? '<p class="cta"><a href="/app/#subscribe">Sign in and subscribe →</a></p>' : '<p class="note"><b>New subscriptions open soon.</b> The new format is being published and checked before new payments open. Existing subscribers keep full access and manage their subscription in the <a href="/app/">subscriber app</a>.</p>'}</section>
<section id="reports"><h2>Custom company reports</h2><p>A report is written for one company: Integrarobot provides the analysis and judgement, using the research behind Why Humanoid?. Each costs US$1,000, is separate from the data subscription and needs no subscription.</p>
${SERVICES.map((sv) => serviceHtml(sv.id)).join('')}
<p class="note"><b>Not available to order yet.</b> Their scope, how they work and how they are delivered are still being defined. There is no order form and nothing can be paid for them on this site.</p></section>
<section><h2>Free for everyone</h2><p>${CATEGORIES.filter((c) => c.access === 'free').map((c) => `<a href="${c.path}">${esc(c.label)}</a>`).join(', ')} in full; every <a href="/deployments/">Deployments case</a> and every <a href="/components/">Components product</a> with its public summary and sources; a page for every robot, company, case and product.</p></section>
</article>`;
  return page({ title: 'Data subscription and custom company reports · Why Humanoid?', description: `Two paths: full data access to Deployments and Components, ${price()} billed annually; or custom company reports, US$1,000 each, not available to order yet.`, path: '/subscribe/', body });
}

// ---------- method and report (approved split, phase 2) ----------
const SECTOR = (k) => (k === 'other' ? 'Other (sectors with fewer than 3 records)' : human(k).replace(/^./, (c) => c.toUpperCase()));
function bars(rows, label) {
  const max = Math.max(1, ...rows.map((r) => r.records));
  return `<div class="scroll"><table class="bars"><thead><tr><th scope="col">${esc(label)}</th><th scope="col">Records</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.label)}</td><td><span class="bar" style="width:${Math.round((r.records / max) * 75)}%"></span> ${r.records}</td></tr>`).join('')}</tbody></table></div>`;
}
function reportPage(model) {
  const a = model.aggregates;
  const other = (k, what) => (k === 'other' ? `Other (${what} with fewer than ${a.min_cell} records, or not recorded)` : k);
  const body = `${crumbs([['/', 'Why Humanoid?'], ['/reports/', 'Reports'], [null, 'Deployment records']])}
<article class="entity">
<p class="kicker">Report · snapshot ${esc(String(model.projSnapshot).slice(0, 10))}</p>
<h1>Humanoid robot deployment records</h1>
<p class="lede">The database holds ${model.totals.records} deployment records about ${model.totals.deployments} deployments: ${a.by_status.op} recorded as in operation, ${a.by_status.pilot} as pilots or trials, ${a.by_status.ann} as announced and ${a.by_status.unc} unconfirmed. Records are claims from named sources with their status as recorded, not verified facts, and one deployment can have several records.</p>
<section><h2>By status as recorded</h2>${bars(STATUS_KEYS_ORDER.map((k) => ({ label: STATUS_LABEL[k], records: a.by_status[k] })), 'Status as recorded')}<p class="key">Announced means planned or agreed, not evidence of work. Unconfirmed means claimed by a vendor or unresolved.</p></section>
<section><h2>By sector</h2>${bars(a.by_sector.map((r) => ({ label: SECTOR(r.key), records: r.records })), 'Sector')}</section>
<section><h2>By deployment country</h2>${bars(a.by_country.map((r) => ({ label: other(r.key, 'countries'), records: r.records })), 'Country')}</section>
<section><h2>By year</h2>${bars(a.by_year.map((r) => ({ label: other(r.key, 'years'), records: r.records })), 'Year observed or published')}</section>
<section><h2>How to read it</h2><p>Counts are of records, not of robots or sites. Every group with fewer than ${a.min_cell} records is added to «Other», so no number points at a single record. The year is the year the record was observed or, if that is missing, published. How records are collected and labelled is in the <a href="/method/">method</a>; who and where, record by record, is on each <a href="/companies/">company</a> and <a href="/robots/">robot</a> page; the records in full are in the <a href="/subscribe/">Deployments subscription</a> (${esc(price())}).</p></section>
</article>`;
  return page({ title: 'Humanoid robot deployment records: status, sectors, countries and years · Why Humanoid?', description: clip(`${model.totals.records} humanoid robot deployment records by status as recorded, sector, country and year. Records are claims from named sources, not verified facts.`), path: '/reports/deployment-records/', body, type: 'article', section: 'reports' });
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
<p>Verification labels say who reported the claim, as recorded: customer confirmed, partner reported, vendor reported, media reported or unresolved. The evidence level is a code from E0 to E5, shown as recorded. The research workbook does not define these codes, so Why Humanoid? does not explain or rank them: what each level means is unknown until its definitions are documented.</p></section>
<section><h2>Selected evidence</h2><p>Each robot and company page shows one of its records with its site, task, status, metric, evidence level, verification label and source. The record is chosen by a fixed rule among those with a source link and a verification other than unresolved: the most advanced status as recorded (in operation, then pilot or trial, then a vendor's claim of operation, then announced), then a primary source (customer, maker or partner) before the press, then customer confirmation, then the latest publication, then a record with a metric. The claim text, notes and the other records stay with the Deployments subscription.</p></section>
<section><h2>Robots, companies and records</h2><p>A record is linked to a catalogue robot only when it names that model or its model line, never because it names the maker alone. When it names the model line, the page says the record may concern another version. Companies are identified by the organisation id of the sheet or by the maker's name; no corporate data is added.</p></section>
<section><h2>Updates</h2><p>The database is updated every week from the Integrarobot newsletter, checked against primary sources. Each page shows the snapshot date of its data.</p></section>
<section><h2>Visits</h2><p>The public pages count visits with Cloudflare Web Analytics, which sets no cookies and does not track individual visitors.</p></section>
<section><h2>What is public and what is for subscribers</h2>${kv([
    ['Public', `${CATEGORIES.filter((c) => c.access === 'free').map((c) => c.label).join(', ')} in full; every Deployments case with its public summary (organisation and role, robot as recorded, sector, country, task category, latest status as recorded, who reports it, and its sources with dates); every Components product with its public summary (maker or laboratory, country, family, year, status, sensing principle, what it measures, main source and review state, and the licence and repository of open hardware); a page for every robot, company, case, product and other robot; this report and method.`],
    ['Data subscription', `Complete Deployments and complete Components, ${esc(price())} billed annually: each case's site, commercial relationship, task description, workflow, integration, timeline, every claim, metrics, evidence relations, confidence, review notes and open questions; each product's full technical passport with the source of every field; detailed search and comparisons. Research and data, not a personalised recommendation.`],
  ])}<p>Public counts never reveal a single record: the report groups anything under ${model.aggregates.min_cell} records.</p></section>
</article>`;
  return page({ title: 'Method and sources · Why Humanoid?', description: 'How Why Humanoid? records humanoid robots and deployment records: statuses as recorded, verification labels, links between robots and companies, updates and public data.', path: '/method/', body, type: 'article' });
}

export function sitemapUrls(model) {
  return ['/', ...CATEGORIES.map((c) => c.path), '/companies/', '/subscribe/', '/reports/deployment-records/', '/method/', ...model.robots.map((r) => r.path), ...model.companies.map((c) => c.path), ...model.otherRobots.map((r) => r.path), ...REPORTS.map(reportPath), ...[...model.cm.products, ...model.cm.software].map((r) => `/components/${r.component_id.toLowerCase()}/`), ...model.cases.map(casePath)];
}
function sitemap(model) {
  const lastmod = String(model.snapshot).slice(0, 10);
  const urls = sitemapUrls(model);
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

export function buildPages(registry = readRegistry()) {
  const model = publicModel(registry);
  const files = new Map();
  for (const rb of model.robots) files.set(`${rb.path.slice(1)}index.html`, robotPage(rb, model));
  for (const c of model.companies) files.set(`${c.path.slice(1)}index.html`, companyPage(c, model));
  for (const r of model.otherRobots) files.set(`${r.path.slice(1)}index.html`, otherRobotPage(r, model));
  // The ten categories, in the confirmed order (access matrix, 23 Nov 2026).
  files.set('humanoids/index.html', humanoidsCategory(model));
  files.set('deployments/index.html', deploymentsCategory(model));
  for (const [f, html] of casePages(model)) files.set(f, html);
  files.set('components/index.html', componentsCategory(model));
  for (const [f, html] of componentPages(model)) files.set(f, html);
  files.set('integrators/index.html', integratorsCategory(model));
  files.set('software/index.html', directoryCategory('software', 'software', model, { lists: [['software', 'Software and robot foundation models'], ['world_model', 'World models']] }));
  files.set('datasets/index.html', datasetsCategory());
  files.set('benchmarks/index.html', benchmarksCategory(model));
  files.set('investment/index.html', investmentCategory(model));
  files.set('other-robots/index.html', otherRobotsCategory(model));
  files.set('reports/index.html', reportsCategory(model));
  for (const r of REPORTS) files.set(`${reportPath(r).slice(1)}index.html`, externalReportPage(r));
  files.set('subscribe/index.html', subscribePage(model));
  // /robots/ was the index of robot pages until 23 Nov 2026: it now points to the Humanoids category.
  files.set('robots/index.html', redirectPage('/humanoids/', 'the humanoid robots'));
  files.set('companies/index.html', companiesIndex(model));
  files.set('reports/deployment-records/index.html', reportPage(model));
  files.set('method/index.html', methodPage(model));
  files.set('sitemap.xml', sitemap(model));
  files.set('404.html', notFound());
  files.set('data/pages.json', `${JSON.stringify(pageLinks(model))}\n`);

  // Registry: every slug ever published stays reachable.
  const nextReports = {};
  for (const [id, slugs] of Object.entries(registry.reports ?? {})) nextReports[id] = [...slugs];
  for (const r of REPORTS) { (nextReports[r.page_id] ??= []).includes(r.slug) || nextReports[r.page_id].push(r.slug); }
  const next = { note: 'Every public page address ever published (tools/build-pages.mjs). Append-only: retired slugs become redirects. Robots are served at /humanoids/<slug>/ since 23 Nov 2026; every robot slug also answers at /robots/<slug>/ with a redirect. Deployment cases (/deployments/<slug>/, since 24 Nov 2026) are keyed by the deployment id of the Deployments tab.', robots: {}, companies: {}, other_robots: {}, reports: nextReports, deployments: {} };
  for (const [id, slugs] of Object.entries(registry.deployments ?? {})) next.deployments[id] = [...slugs];
  for (const k of model.cases) { (next.deployments[k.id] ??= []).includes(k.slug) || next.deployments[k.id].push(k.slug); }
  for (const [id, slugs] of Object.entries(registry.robots ?? {})) next.robots[id] = [...slugs];
  for (const [id, v] of Object.entries(registry.companies ?? {})) next.companies[id] = { slugs: [...v.slugs], robots: [...(v.robots ?? [])], organization_ids: [...(v.organization_ids ?? [])] };
  for (const [key, slugs] of Object.entries(registry.other_robots ?? {})) next.other_robots[key] = [...slugs];
  for (const r of model.otherRobots) { (next.other_robots[r.key] ??= []).includes(r.slug) || next.other_robots[r.key].push(r.slug); }
  for (const rb of model.robots) { const s = rb.path.split('/')[2]; (next.robots[rb.id] ??= []).includes(s) || next.robots[rb.id].push(s); }
  for (const c of model.companies) {
    const e = (next.companies[c.id] ??= { slugs: [], robots: [], organization_ids: [] });
    if (!e.slugs.includes(c.slug)) e.slugs.push(c.slug);
    for (const id of c.robots || []) if (!e.robots.includes(id)) e.robots.push(id);
    for (const o of c.organization_ids || []) if (!e.organization_ids.includes(o)) e.organization_ids.push(o);
  }
  const current = new Set([...files.keys()].filter((f) => /^(humanoids|companies)\/[^/]+\/index\.html$/.test(f)).map((f) => f.split('/')[1]));
  const add = (file, html) => { if (files.has(file)) throw new Error(`retired address clashes with a current page: ${file}`); files.set(file, html); };
  // Records moved out of the Humanoids tab (tools/humanoids-identity.json, 25 Nov 2026): their address keeps a labelled
  // historical page with their last public values, pointing to where the record now lives; never counted as robots.
  const movedById = new Map((read('data/humanoids-catalogue.json').moved ?? []).map((m) => [m.id, m]));
  for (const [id, slugs] of Object.entries(next.robots)) {
    const rb = model.robotById.get(Number(id));
    const mv = movedById.get(Number(id));
    if (!rb && mv) {
      for (const s of slugs) {
        add(`humanoids/${s}/index.html`, movedRobotPage(mv, `/humanoids/${s}/`));
        add(`robots/${s}/index.html`, redirectPage(`/humanoids/${s}/`, mv.record.Robot));
      }
      continue;
    }
    for (const s of slugs) {
      // Every robot slug ever published answers at /robots/<slug>/ (the address until 23 Nov 2026).
      add(`robots/${s}/index.html`, rb ? redirectPage(rb.path, `${rb.name} by ${rb.lab}`) : gonePage(`/robots/${s}/`, 'robot'));
      if (rb && rb.path === `/humanoids/${s}/`) continue;
      if (current.has(s) && files.has(`humanoids/${s}/index.html`)) throw new Error(`retired robot slug ${s} is now another robot's page`);
      add(`humanoids/${s}/index.html`, rb ? redirectPage(rb.path, `${rb.name} by ${rb.lab}`) : gonePage(`/humanoids/${s}/`, 'robot'));
    }
  }
  for (const [id, v] of Object.entries(next.companies)) {
    let c = model.companies.find((x) => x.id === id);
    // A renamed company keeps its robots or organisation ids: its old addresses follow it.
    c ??= model.companies.find((x) => (x.robots || []).some((r) => v.robots.includes(r)) || (x.organization_ids || []).some((o) => v.organization_ids.includes(o)));
    // A listed company that a fuller export now joins to another company (same web address, e.g. Hexagon AB with
    // Hexagon Robotics, 25 Nov 2026) follows it: its old address redirects there.
    c ??= /^lst_/.test(id) ? model.companies.find((x) => (x.listings || []).some((l) => `lst_${slugify(l.name)}` === id)) : undefined;
    for (const s of v.slugs) {
      if (c && c.slug === s) continue;
      // A listed or directory company that the deployment records now name joins that company: its address still
      // serves the same company, so it is kept as the current page, not retired (24 Nov 2026).
      if (!c && files.has(`companies/${s}/index.html`) && /^(lst|int|cmp)_/.test(id)) continue;
      add(`companies/${s}/index.html`, c ? redirectPage(c.path, c.name) : gonePage(`/companies/${s}/`, 'company'));
    }
  }
  const reportById = new Map(REPORTS.map((r) => [r.page_id, r]));
  for (const [id, slugs] of Object.entries(next.reports)) {
    const r = reportById.get(id);
    for (const s of slugs) {
      if (r && r.slug === s) continue;
      add(`reports/${s}/index.html`, r ? redirectPage(reportPath(r), r.title) : gonePage(`/reports/${s}/`, 'report'));
    }
  }
  // A case whose deployment id is gone, or whose slug changed, keeps answering: a redirect to its page or to all cases.
  const caseById = new Map(model.cases.map((k) => [k.id, k]));
  for (const [id, slugs] of Object.entries(next.deployments)) {
    const k = caseById.get(id);
    for (const s of slugs) {
      if (k && k.slug === s) continue;
      add(`deployments/${s}/index.html`, k ? redirectPage(casePath(k), 'this deployment case') : gonePage(`/deployments/${s}/`, 'deployment case'));
    }
  }
  const otherByKey = new Map(model.otherRobots.map((r) => [r.key, r]));
  for (const [key, slugs] of Object.entries(next.other_robots)) {
    const r = otherByKey.get(key);
    for (const s of slugs) {
      if (r && r.slug === s) continue;
      add(`other-robots/${s}/index.html`, r ? redirectPage(r.path, r.name) : gonePage(`/other-robots/${s}/`, 'other robot'));
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
  const entityPages = [...files.keys()].filter((f) => /^(robots|humanoids|companies|other-robots)\/[^/]+\/index\.html$/.test(f)).length;
  const redirects = entityPages - model.robots.length - model.companies.length - model.otherRobots.length;
  console.log(`Public pages ${process.argv.includes('--check') ? 'are current' : 'written'}: ${CATEGORIES.length} categories, ${model.robots.length} humanoid robots, ${model.otherRobots.length} other robots, ${model.companies.length} companies, ${redirects} redirect or retired addresses, sitemap with ${sitemapUrls(model).length} URLs.`);
}
