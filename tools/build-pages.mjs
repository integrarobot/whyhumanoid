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
import { BEFORE_PAYMENT, REPORT_LIMITS, REPORTS_LIVE_OPEN, SUPPORT_EMAIL, offerHtml, offerLine } from './offer-view.mjs';
import { USAGE_LIMITS } from '../server/src/usage.js';
import { readIntegratorsAtlas, renderIntegratorProfile, renderIntegratorsCategory, renderNamedBy } from './integrators-view.mjs';
import { publicCases } from '../server/src/public/cases.js';
import { API_ORIGIN } from './build-app.mjs';
import { LIVE_SALES_OPEN, PLAN } from '../server/src/pricing.js';
import { CATEGORIES, CATEGORIES_BY_ID, SERVICES, SUBSCRIPTION } from '../server/src/access/matrix.js';
import { hostKey, urlKey } from '../server/src/import/identity.js';
import { renderEvolutionSection } from './evolution-view.mjs';
import { deskIndex, readDesk, renderInvestmentDesk, renderListingResearch, renderTheses } from './investment-view.mjs';
import { FOOTER_CSS, renderSiteFooterNav } from './footer-view.mjs';

export const SITE = 'https://whyhumanoid.com';
const APP = `${SITE}/app/`;
const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const REGISTRY = 'tools/permalinks.json';
// Visit counts without cookies (approved split, phase 3): Cloudflare Web Analytics, free; the token is a public site id.
const ANALYTICS = `<!-- Cloudflare Web Analytics: visit counts without cookies (approved split, phase 3) --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "76de8d3b4a534b91bd808e724f9c1594"}'></script><!-- End Cloudflare Web Analytics -->`;
// The stylesheet URL carries a hash of its content, so a changed stylesheet is never served from a browser's cache.
const CSS_VERSION = createHash('sha256').update(readFileSync(new URL('assets/pages.css', root))).digest('hex').slice(0, 10);
// The shared footer's rule lives in pages.css exactly as tools/footer-view.mjs defines it (no second copy to drift).
if (!readFileSync(new URL('assets/pages.css', root), 'utf8').includes(FOOTER_CSS)) throw new Error('assets/pages.css lacks the shared footer rule (FOOTER_CSS in tools/footer-view.mjs)');
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
<header class="top"><a class="brand" href="/"><span class="mark" aria-hidden="true"></span>Why Humanoid?</a><button class="cat-toggle" id="cat-toggle" type="button" aria-expanded="false" aria-controls="cat-menu" hidden>Categories<span class="chev" aria-hidden="true"></span></button><nav class="cats" id="cat-menu" aria-label="Categories">${nav(section)}</nav></header>
<main${wide ? ' class="wide"' : ''}>
${body}
</main>${tail}
<script src="/assets/nav.js?v=${assetVersion('assets/nav.js')}" defer></script>
${section ? "<script>(function(){var a=document.querySelector('nav.cats [aria-current]');if(a&&a.parentNode.scrollWidth>a.parentNode.clientWidth)a.parentNode.scrollLeft=a.offsetLeft-a.parentNode.offsetLeft-16;})();</script>" : ''}
<footer class="foot">${renderSiteFooterNav()}<nav class="more" aria-label="More"><a href="/companies/">Companies</a><a href="/reports/deployment-records/">Deployment records</a><a href="/subscribe/">Subscription and reports</a><a href="/app/">Subscriber app</a><a href="/privacy/">Privacy</a></nav><p>Why Humanoid? by Integrarobot. Public values as recorded in the database, with their sources. Data snapshot and method on <a href="/">whyhumanoid.com</a>.</p></footer>
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
// Funding values recorded as a bare number (old market-data snapshots: no currency, no date) are not shown as amounts.
export const BARE_AMOUNT = /^[\s\d.,~+-]+$/;
export const BARE_AMOUNT_TEXT = 'Amount recorded without currency or date: not shown';
const fundingValue = (v) => (nz(v) && BARE_AMOUNT.test(String(v)) && /\d/.test(String(v)) ? `<span class="na">${BARE_AMOUNT_TEXT}</span>` : text(v));
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
  const text = `<p class="kicker">${cls ? `${esc(cls.label)} · listed in the Humanoids catalogue` : 'Humanoid robot'} · catalogue record ${rb.id}</p>${cls ? `\n<p class="note"><b>${esc(cls.label)}.</b> Its own record says so: ${cls.excerpts.map((e) => `${esc(e.field)}: “${esc(e.text)}”`).join('; ')}. It stays in the catalogue and at this address while its place in the workbook is reviewed; ${cls.kind === 'software' ? 'it is not counted as a humanoid robot' : 'it is not counted as a confirmed humanoid robot model'}.</p>` : ''}
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
<section><h2>Company</h2>${kv([['Maker', m ? `<a href="${m.path}">${esc(rb.lab)}</a>` : esc(rb.lab)], ...COMPANY_FIELDS.map(([l, f]) => [l, f === 'Valuation' ? fundingValue(r[f]) : text(r[f])])])}${links.length ? `<p class="links">${links.join(' ')}</p>` : ''}</section>
<section><h2>Deployment records</h2>${rb.summary ? summaryHtml(rb.summary, model, { head: `${rb.summary.records} deployment record${rb.summary.records === 1 ? '' : 's'} in the database ${rb.summary.records === 1 ? 'names' : 'name'} ${rb.summary.model_line_only ? 'the model line of this robot, not necessarily this version' : 'this robot or its model line'}.`, otherLabel: 'Organisation' }) + RECORDS_NOTE : '<p>No deployment record in the database names this robot or its model line. The database records only deployments with a public source reviewed by Integrarobot, so this is not evidence that the robot has no deployments.</p>'}</section>
${evidenceHtml(rb.summary?.evidence)}
${casesHtml(rb.cases, model.caseLinks, { heading: 'Deployment cases that name this robot' })}
${renderNamedBy(model.integrators.providers.filter((p) => p.links.robots.some((x) => x.id === rb.id)), model.integrators, { ...integratorLinks(model), heading: 'Integrators that name this robot', intro: `Providers in the Integrators category whose platform cell names ${rb.name}.` })}${rb.cases.length ? `<p class="cta"><a href="${APP}#robot/${rb.id}">The detail of every case (sites, task descriptions, timelines, metrics, claims and evidence) comes with the data subscription, ${esc(price())} →</a></p>` : ''}
<section><h2>Sources and checks</h2>${kv([['Last checked', text(chk.date)], ['Checks recorded', chk.statements.length ? esc(chk.statements.join('; ')) : '<span class="na">Not recorded</span>'], ['Model identity', text(r['Model checked'])]])}${sources ? `<ul class="sources">${sources}</ul>` : '<p class="na">No linked sources.</p>'}</section>
<p class="meta">Values as recorded in the free Humanoids catalogue, data as of ${esc(String(model.snapshot).slice(0, 10))}. Also on the <a href="/#${esc(rb.slug)}">catalogue page</a>.</p>
</article>`;
  return page({ title: `${rb.name} by ${rb.lab}: specifications and sources · Why Humanoid?`, description: clip(`${summary} Specifications, sources and deployment cases.`), path: rb.path, body, type: 'article', section: 'humanoids' });
}

// ---------- company page ----------
// Company facts come from its robots' catalogue rows; when they differ between robots, each value names its robot.
function companyFacts(c) {
  const out = [];
  for (const [l, f] of COMPANY_FIELDS) {
    // A listed company's page leaves out a bare-number valuation: its market data comes from the provider widgets.
    const bare = (v) => f === 'Valuation' && BARE_AMOUNT.test(String(v)) && /\d/.test(String(v));
    const vals = c.robotList.map((rb) => [rb, rb.record[f]]).filter(([, v]) => nz(v) && !(c.listings?.length && bare(v)));
    const distinct = [...new Set(vals.map(([, v]) => v))];
    if (!vals.length) continue;
    const show = (v) => (f === 'Valuation' ? fundingValue(v) : text(v));
    out.push([l, distinct.length === 1 ? show(distinct[0]) : vals.map(([rb, v]) => `${show(v)} <span class="dim">(row for ${esc(rb.name)})</span>`).join('<br>')]);
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
${(c.listings || []).map((l) => { const x = DESK_INDEX.byKey.get(l.gf_symbol); return `<section><h2>Listing</h2>${kv([
    ['Ticker', text(l.ticker)], ['Exchange', text(l.exchange)], ['Country as recorded', text(l.country)],
    ...(x?.segment ? [['Segment as recorded', esc(x.segment)]] : []),
    ...[['ETF membership', 'etf_membership'], ['ETF membership as of', 'etf_as_of'], ['Verified', 'verified_at']].filter(([, f]) => nz(l[f])).map(([k, f]) => [k, shown(l, f)]),
    ...(x?.description ? [['Business description (our research, translated)', esc(x.description)]] : nz(l.description) ? [['Business description', shown(l, 'description')]] : []),
    ...(nz(l.url) ? [['Website', ext(l.url)]] : []),
  ])}<p class="key">From the Investment category (listed companies, snapshot ${esc(String(model.previewSnapshot).slice(0, 10))}). The business description is our research note, translated into English; the theses below are publishers' opinions; deployment records are claims from public sources, with those sources.</p></section>
${x ? `${renderListingResearch(l, x, DESK_INDEX.thesesOf(l.gf_symbol), { apiOrigin: API_ORIGIN, snapshot: model.previewSnapshot })}\n${renderTheses(l.name, DESK_INDEX.thesesOf(l.gf_symbol), DESK)}` : ''}`; }).join('\n')}
${c.components?.length ? `<section><h2>Components</h2><ul class="links">${c.components.map((r) => `<li><a href="/components/${esc(r.id.toLowerCase())}/">${esc(r.name)}</a> <span class="dim">${esc(r.role)}${r.software ? ' · related software' : ''}</span></li>`).join('')}</ul><p class="key">Public products of the <a href="/components/">Components</a> category, with the role their record states${c.directoryOnly ? '; the database records this name, not a legal name' : ''}.</p></section>` : ''}
${c.integrator ? renderIntegratorProfile(c.integrator, model.integrators, integratorLinks(model)) : ''}${renderNamedBy(model.integrators.providers.filter((p) => p.links.makers.some((m) => model.companyByName(m) === c)), model.integrators, { ...integratorLinks(model), heading: 'Integrators that name its robots', intro: `Providers in the Integrators category whose platform cell names ${c.name} robots.` })}
${c.robotList.length ? `<section><h2>Robots</h2><ul class="cards">${c.robotList.map((rb) => `<li><a href="${rb.path}"><b>${esc(rb.name)}</b></a><span>${esc(robotSummary(rb))}</span></li>`).join('')}</ul></section>` : ''}
<section id="deployment-records"><h2>Deployment records</h2>${c.directoryOnly ? '<p>No deployment record is linked to this company page. Records are linked to a company by the organisation identifier in our research or by the maker\'s name as recorded, so a record that names it differently is not linked here.</p>' : c.as_organisation || c.as_maker ? `${c.as_organisation ? summaryHtml(c.as_organisation, model, { head: `As organisation: ${c.as_organisation.records} record${c.as_organisation.records === 1 ? '' : 's'}.`, otherLabel: 'Maker' }) : ''}${c.as_maker ? summaryHtml(c.as_maker, model, { head: `As maker: ${c.as_maker.records} record${c.as_maker.records === 1 ? '' : 's'}.`, otherLabel: 'Organisation' }) : ''}${RECORDS_NOTE}` : '<p>No deployment record in the database names this company. The database records only deployments with a public source reviewed by Integrarobot, so this is not evidence that it has none.</p>'}</section>
${evidenceHtml(c.evidence)}
${casesHtml(c.cases ?? [], model.caseLinks, { heading: 'Deployment cases that name this company' })}
${c.cases?.length ? `<p class="cta"><a href="${APP}#company/${encodeURIComponent(c.id)}">The detail of every case (sites, task descriptions, timelines, metrics, claims and evidence) comes with the data subscription, ${esc(price())} →</a></p>` : ''}
<section><h2>Sources</h2>${sources.length ? `<ul class="sources">${sources.map((u) => `<li>${ext(u, u)}</li>`).join('')}</ul>` : '<p class="na">No linked sources.</p>'}</section>
<p class="meta">Only what the public data say: the free Humanoids catalogue (snapshot ${esc(model.snapshot)}), the public summary of every deployment case (snapshot ${esc(model.projSnapshot)}), the public identity register and the free Investment and Integrators categories${c.integrator ? ` (Integrators snapshot ${esc(String(model.integrators.snapshot ?? '').slice(0, 10))})` : ''}. No corporate data is added.</p>
</article>`;
  return page({ head: `${c.integrator ? `<link rel="stylesheet" href="/assets/integrators.css?v=${assetVersion('assets/integrators.css')}">\n` : ''}${c.listings?.length ? investmentHead() : ''}`, tail: c.listings?.length ? investmentTail(true) : '', title: `${c.name}: ${c.robotList.length ? 'humanoid robots, facts and sources' : c.integrator ? 'integrator profile, services and sources' : c.directoryOnly ? 'company facts and sources' : 'robot deployment records'} · Why Humanoid?`, description: clip(`${summary} Public facts and sources.`), path: c.path, body, type: 'article' });
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
<p class="kicker">Reclassified as ${esc(mv.to.label)} · historical Humanoids record</p>
<h1>${esc(r.Robot)} <em>by ${esc(r.Lab)}</em></h1>
<p class="note"><b>Reclassified as ${esc(mv.to.label)}:</b> this entry is now listed in <a href="${esc(mv.to.path)}">${esc(mv.to.label)}</a> as “${esc(mv.to.name)}”. It is not counted as a humanoid robot. This page is kept at its address as a historical record, with its last public values in the Humanoids catalogue.</p>
<section><h2>Last values in the Humanoids catalogue</h2>${kv(Object.keys(r).filter((f) => !['id', 'sheet_row'].includes(f) && known(r[f])).map((f) => [f, text(r[f])]))}</section>
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
  return `<aside class="service" id="report-${esc(sv.id)}" aria-label="Custom company report"><p class="kicker">Custom company report${REPORTS_LIVE_OPEN ? '' : ' · not available to order yet'}</p><h3>${esc(sv.name)}</h3><p>${esc(sv.summary)}</p><p class="key"><b>${esc(BEFORE_PAYMENT)}</b> ${esc(REPORT_LIMITS)}</p>${REPORTS_LIVE_OPEN ? '<p class="cta"><a href="/app/#reports">Order this report →</a></p>' : '<p class="key">Not available to order yet: ordering opens once the payment and questionnaire flow has been tested end to end.</p>'}</aside>`;
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
// Investment research desk (26 Nov 2026): data/investment/desk.json (tools/export-investment.mjs).
const DESK = readDesk();
const DESK_INDEX = deskIndex(DESK);
const investmentHead = () => `<link rel="stylesheet" href="/assets/investment.css?v=${assetVersion('assets/investment.css')}">\n`;
const investmentTail = (company) => (company
  ? `\n<script src="/assets/market.js?v=${assetVersion('assets/market.js')}" defer></script>\n<script src="/assets/news.js?v=${assetVersion('assets/news.js')}" defer></script>`
  : `\n<script src="/assets/investment.js?v=${assetVersion('assets/investment.js')}" defer></script>`);
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
<p>All ${model.robots.length} entries of the catalogue are free, each with its own page: specifications, maker, funding, sources and a summary of its deployment records. ${model.robots.length - software.length - uncertain.length} are humanoid robot models${uncertain.length ? `; ${uncertain.length} ${uncertain.length === 1 ? 'is' : 'are'} listed with an uncertain scope (${uncertain.map((rb) => `${esc(rb.name)} by ${esc(rb.lab)}: ${esc(classificationOf(rb).label.toLowerCase())}`).join('; ')})` : ''}${software.length ? `; ${software.length} are software or AI models recorded in the Humanoids catalogue, listed apart below and not counted as robots` : ''}. ${movedList.length} former entries were reclassified into other categories and keep a page at their address (listed below). The <a href="/#humanoids">interactive catalogue</a> adds search, filters and charts.</p>
<div class="scroll"><table><thead><tr><th scope="col">Robot</th><th scope="col">Maker</th><th scope="col">Company country</th><th scope="col">Platform</th></tr></thead><tbody>${rows}</tbody></table></div>
${software.length ? `<section><h2>Software and AI models in the Humanoids catalogue <span class="dim">(${software.length})</span></h2><p>Recorded in the Humanoids catalogue but, by their own records, software or AI models rather than robots. Their pages and addresses stay; they are not counted as humanoid robots.</p><div class="scroll"><table><thead><tr><th scope="col">Entry</th><th scope="col">Maker</th><th scope="col">What its record says</th></tr></thead><tbody>${software.map((rb) => `<tr><td><a href="${rb.path}">${esc(rb.name)}</a></td><td>${rb.maker ? `<a href="${rb.maker.path}">${esc(rb.lab)}</a>` : esc(rb.lab)}</td><td>${classificationOf(rb).excerpts.map((e) => `${esc(e.field)}: “${esc(e.text)}”`).join('; ')}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
<section><h2>Moved to other categories <span class="dim">(${movedList.length})</span></h2><p>Former catalogue entries now reclassified in another category. Their pages stay at the same address as historical records with their last values; they are not counted here.</p><ul>${movedList.map((m) => `<li><a href="/humanoids/${esc((read('tools/permalinks.json').robots[m.id] ?? [])[0] ?? '')}/">${esc(m.record.Robot)}</a> by ${esc(m.record.Lab)}: now in <a href="${esc(m.to.path)}">${esc(m.to.label)}</a> as “${esc(m.to.name)}”</li>`).join('')}</ul></section>
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
    cases: model.cases, records: model.depPreview.length, organisations: model.totals.organisations, links: model.caseLinks, snapshot: model.depSnapshot,
    head: categoryHead(c, model), offer: offerHtml({ heading: 'Go further with Deployments', id: 'offer' }),
  });
  return catPage(c, model, `${body}\n${serviceHtml(c.service)}`, `All ${model.cases.length} robot deployment cases, free: who is testing or using humanoid robots and adjacent platforms, as each source names them; which robot, sector, country, task, status as recorded and sources. The detail of each case with the data subscription, US$100 per year.`, {
    title: 'Deployments: every robot deployment case, with status and sources · Why Humanoid?', head: deploymentsHead(), tail: deploymentsTail(),
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
    out.set(`${casePath(k).slice(1)}index.html`, page({ title: `${name}: robot deployment case · Why Humanoid?`, description: clip(`${name} and ${k.robots.map((r) => [r.manufacturer, r.model].filter(Boolean).join(' ')).join('; ') || 'a robot'}: ${k.status.detail}, ${k.sectors.join(', ').replace(/_/g, ' ')}, ${k.countries.join(', ')}. Public summary with sources.`), path: casePath(k), body, type: 'article', section: 'deployments', head: deploymentsHead() }));
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
    const body = `${crumb(r.name)}\n<article class="entity atlas-page">\n${renderProductPage(cm, r, companyPath, API_ORIGIN)}`;
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
<p>${intro}All ${counted(meta)}, free, each with its link.${meta.memberships ? ` Some entries appear in two lists (for example a world model that is also robotics software); each is counted once.` : ''} How the list is kept: <a href="/method/#directories">method</a>.</p>
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
${renderInvestmentDesk(DESK, { rows: model.stocks, companyOf: (r) => company.get(r) })}
<section id="funding"><h2>Funding recorded for humanoid makers <span class="dim">(${funded.length} robots)</span></h2>${dirTable(funded.sort((a, b) => a.lab.localeCompare(b.lab)), [['Robot', (rb) => `<a href="${rb.path}">${esc(rb.name)}</a> <span class="dim">by ${esc(rb.lab)}</span>`], ['Valuation', (rb) => fundingValue(rb.record.Valuation)], ['Rounds', (rb) => text(rb.record.Rounds)], ['Investors', (rb) => text(rb.record.Investors)]])}
<p class="key">From the free Humanoids catalogue, as recorded with its sources on each robot page.</p></section>
<p class="meta">Snapshots: Stocks ${esc(String(model.previewSnapshot).slice(0, 10))}, Humanoids ${esc(model.snapshot)}.</p>`;
  return catPage(c, model, body, `${meta.entries_total} listed companies exposed to humanoid robotics, ${DESK.theses.length} dated investment theses from their publishers, market data and the funding recorded for ${funded.length} humanoid robots, free.`, { head: investmentHead(), tail: investmentTail(false), wide: true });
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
<p class="meta">As recorded in the Other Robots list, data as of ${esc(String(model.previewSnapshot).slice(0, 10))}. Free.</p>
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
<p class="kicker">Subscription and custom reports</p>
<h1>One subscription. The full catalogue, for you and your agents.</h1>
<p class="lede">Most of Why Humanoid? is free. The data subscription opens the detail behind every deployment case and every component, for you on the web and for your software agents. A custom report is something else: our analysis applied to one decision of your company.</p>
${offerHtml({ heading: 'Two ways to go further', id: 'offer' })}
<section id="data"><h2>What the subscription includes</h2>${kv([
    ['Price', `${esc(price())}, billed annually. No free trial. Taxes are not added at checkout: the charge is the price shown.`],
    ['Deployments', `All ${model.cases.length} cases in detail: where the robot works, the commercial relationship where documented, the task and workflow, integration, the timeline and every source claim, reported results with their conditions, how the evidence connects, confidence and open questions.`],
    ['Components', `The full technical passport of all ${model.cm.total} products, with the source of every value, side-by-side comparison and technical filters.`],
    ['Everything else', 'The other categories stay free for everyone, in full.'],
    ['What it is not', 'Research and data, not a personalised recommendation. Missing information stays missing. Custom reports are not included.'],
  ])}</section>
<section id="access"><h2>Four ways to use it</h2><p>The same subscription and the same account work everywhere. There is no extra charge for agents.</p>${kv([
    ['On the web', '<a href="/app/">The app</a>: browse, search and compare, with every field.'],
    ['HTTP API', 'Your agents call the same API as the app, with an API key from your account. <a href="/agents/#api">Setup</a>'],
    ['MCP', 'An MCP server for AI assistants and agent frameworks that support remote MCP servers. <a href="/agents/#mcp">Setup</a>'],
    ['Command line', 'A single-file tool for scripts and terminals (Node.js). <a href="/agents/#cli">Setup</a>'],
  ])}<p>Fair use: ${USAGE_LIMITS.perMinute} requests a minute and ${USAGE_LIMITS.perDay.toLocaleString('en-GB')} a day per API key. Up to five active keys per account; revoke any of them at any time.</p></section>
<section id="cancel"><h2>Renewal and cancellation</h2><p>The subscription renews each year at its own price until you cancel. Cancel at any time from your account, in the Stripe billing portal, and keep access until the end of the paid year. Subscriptions bought earlier keep their contract, currency and renewal price.</p>
${LIVE_SALES_OPEN ? '<p class="cta"><a href="/app/#subscribe">Sign in and subscribe →</a></p>' : '<p class="note"><b>New subscriptions open soon.</b> Existing subscribers keep full access and manage their subscription in the <a href="/app/">app</a>.</p>'}</section>
<section id="reports"><h2>Custom company reports</h2><p>A report answers one question for one company, with our analysis and judgement, drawing on the research behind Why Humanoid?. It is a one-off payment, separate from the subscription: you do not need a subscription to order one, and a report does not include one.</p>
${SERVICES.map((sv) => serviceHtml(sv.id)).join('')}
<h3>How it works</h3><ol><li>Pay US$1,000 for the report you choose (Stripe Checkout).</li><li>A private questionnaire about your company opens in your account. Your answers are saved as you go; estimates and "Unknown" are fine.</li><li>When you submit the completed questionnaire, we confirm the exact deadline: your report arrives by email, as a PDF, within 24 hours. Payment alone does not start the clock.</li></ol>
<p>Questions before or after ordering: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. How we handle your answers: <a href="/privacy/">privacy</a>.</p></section>
<section><h2>Free for everyone</h2><p>${CATEGORIES.filter((c) => c.access === 'free').map((c) => `<a href="${c.path}">${esc(c.label)}</a>`).join(', ')} in full; every <a href="/deployments/">Deployments case</a> and every <a href="/components/">Components product</a> with its public summary and sources; a page for every robot, company, case and product.</p></section>
</article>`;
  return page({ title: 'Subscription and custom reports · Why Humanoid?', description: `One subscription, ${price()} billed annually: the full catalogue for you and your agents (web, API, MCP, command line). Custom company reports: US$1,000 each, one-off, no subscription needed.`, path: '/subscribe/', body });
}

// ---------- agents (25 Nov 2026): the same subscription through the API, MCP and the command-line tool ----------
const code = (s) => `<pre class="code"><code>${esc(s)}</code></pre>`;
function agentsPage() {
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, 'Agents']])}
<article class="entity">
<p class="kicker">For your software agents</p>
<h1>Use the catalogue from your agents</h1>
<p class="lede">Your agents can read Why Humanoid? the way you do: the free catalogue without any key, and complete Deployments and Components with your subscription. Same account, same access, no extra charge.</p>
<section id="start"><h2>Before you start</h2><ol><li>Free data needs nothing: the API, the MCP server and the command-line tool all work without a key, with public values.</li><li>For complete Deployments and Components, <a href="/subscribe/">subscribe</a> (${esc(price())}), then create an API key in <a href="/app/#keys">the app, under Agent access</a>. The key is shown once; keep it like a password.</li><li>Revoke a key there at any time; it stops working at once. When the subscription ends, the paid data stops: the HTTP API and the command-line tool answer 403 on Deployments and Components rows, and MCP returns their public fields. Every public endpoint keeps working, with or without a key.</li></ol>
${kv([['Fair use', `${USAGE_LIMITS.perMinute} requests a minute and ${USAGE_LIMITS.perDay.toLocaleString('en-GB')} a day per key. Over the limit, requests get HTTP 429 with a Retry-After header; nothing is charged.`], ['What agents can read', 'The published catalogue: every category, and with a subscription every field of Deployments and Components. Not accounts, orders, custom reports or internal tables.'], ['Help', `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`]])}</section>
<section id="api"><h2>HTTP API</h2><p>JSON over HTTPS at <code>${esc(API_ORIGIN)}</code>. Send the key as a Bearer token.</p>
${code(`# Tables and what your access reads from each\ncurl ${API_ORIGIN}/v1/datasets\n\n# Search across categories\ncurl "${API_ORIGIN}/v1/search?q=pallet&category=deployments" -H "Authorization: Bearer YOUR_API_KEY"\n\n# Rows of one table (every field with a subscription)\ncurl "${API_ORIGIN}/v1/datasets/deployments?limit=25&offset=0" -H "Authorization: Bearer YOUR_API_KEY"\n\n# Without a key: the public rows of Deployments\ncurl ${API_ORIGIN}/v1/datasets/deployments/preview`)}
<p>Published atlases (Datasets, Benchmarks, Reports, Integrators and the evolution charts) are public JSON files on this site, for example <code>https://whyhumanoid.com/data/reports/atlas.json</code>.</p></section>
<section id="mcp"><h2>MCP server</h2><p>A remote MCP server (Streamable HTTP) at <code>${esc(API_ORIGIN)}/mcp</code>, with read-only tools: <code>list_categories</code>, <code>search_catalogue</code>, <code>get_rows</code>, <code>get_atlas</code>, <code>get_relations</code> and <code>account_status</code>. Add it to any client that supports remote MCP servers with a custom header, for example in a JSON configuration:</p>
${code(`{\n  "mcpServers": {\n    "whyhumanoid": {\n      "type": "http",\n      "url": "${API_ORIGIN}/mcp",\n      "headers": { "Authorization": "Bearer YOUR_API_KEY" }\n    }\n  }\n}`)}
<p>Leave out the header to use the public catalogue only. The exact place for this configuration depends on your client; check its documentation for "remote MCP server" or "HTTP transport". Using the MCP connection is subject to its <a href="/terms/">terms of use</a>.</p></section>
<section id="cli"><h2>Command-line tool</h2><p>One JavaScript file with no dependencies (Node.js 18 or later). Read it before you run it: <a href="/agents/whyhumanoid.mjs">whyhumanoid.mjs</a>.</p>
${code(`curl -fsSLO https://whyhumanoid.com/agents/whyhumanoid.mjs\nexport WHYHUMANOID_API_KEY=YOUR_API_KEY   # optional: public data needs no key\nnode whyhumanoid.mjs categories\nnode whyhumanoid.mjs search pallet --category deployments\nnode whyhumanoid.mjs rows deployments --limit 5\nnode whyhumanoid.mjs atlas reports\nnode whyhumanoid.mjs account`)}
<p>Output is JSON. Run <code>node whyhumanoid.mjs --help</code> for every option.</p></section>
<section><h2>Good to know</h2><p>Records are claims as their sources state them, not verified facts; missing values stay missing. Custom company reports are ordered by people, in <a href="/subscribe/#reports">the app</a>, not through these tools.</p></section>
</article>`;
  return page({ title: 'Agents: API, MCP and command line · Why Humanoid?', description: `Use the Why Humanoid? catalogue from your agents: HTTP API, an MCP server and a command-line tool, with the same subscription (${price()}) and no extra charge. Fair use: ${USAGE_LIMITS.perMinute} requests a minute per key.`, path: '/agents/', body });
}

// ---------- about (Javier, 25 Nov 2026): who makes the catalogue and what a record is; no counts or prices ----------
function aboutPage() {
  const cats = CATEGORIES.map((c) => `<a href="${c.path}">${esc(c.label.charAt(0) + c.label.slice(1).toLowerCase())}</a>`);
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, 'About']])}
<article class="entity">
<p class="kicker">About</p>
<h1>About Why Humanoid?</h1>
<p class="lede">Why Humanoid? is Integrarobot's research catalogue of humanoid robots and the ecosystem around them. It helps people and their software agents explore source-linked evidence and work through business questions about these robots.</p>
<section id="covers"><h2>What it covers</h2><p>${cats.slice(0, -1).join(', ')} and ${cats.at(-1)}.</p></section>
<section id="records"><h2>What a record is</h2><p>Each record compiles claims made in public sources, with a link to the source. Where the evidence allows, records tell demonstrations, trials and pilots, announcements and operations apart.</p><p>A record states what its source says. It is not an independent verification: manufacturer claims are shown as claims, not as verified capabilities, and a missing value stays missing. The <a href="/method/">Method</a> explains the definitions and how records are kept.</p></section>
<section id="who"><h2>Who makes it</h2><p>Why Humanoid? is made by <a href="https://integrarobot.com">Integrarobot</a>, founded by Javier Martín, an entrepreneur and AI educator in Spain. Integrarobot helps companies understand the value of integrating AI-driven robotics.</p></section>
<section id="use"><h2>Using it</h2><p>The public catalogue is free to browse. Complete Deployments and Components, and custom company reports, are described on <a href="/subscribe/">Subscription and reports</a>. Software agents can use the same catalogue through the API, the MCP server and the command-line tool: see <a href="/agents/">For agents</a> and the MCP connection's <a href="/terms/">terms of use</a>.</p></section>
<section id="contact"><h2>Contact</h2><p>Questions and corrections: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p></section>
</article>`;
  return page({ title: 'About Why Humanoid?', description: "Why Humanoid? is Integrarobot's research catalogue of humanoid robots and their ecosystem: source-linked records for people and software agents, with what each record does and does not establish.", path: '/about/', body });
}

// ---------- terms of use for the public MCP connection (Javier, 26 Nov 2026) ----------
// Only what the service does today (server/src/mcp.js, server/src/usage.js, the access matrix). No company registration,
// service level, retention period, refund policy, governing law, liability cap or data licence is stated here: none
// has been decided, and inventing one would be wrong.
const MCP_TOOLS = ['list_categories', 'search_catalogue', 'get_rows', 'get_atlas', 'get_relations', 'account_status'];
function termsPage() {
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, 'Terms of use']])}
<article class="entity">
<p class="kicker">Terms of use</p>
<h1>Terms of use for the Why Humanoid? MCP connection</h1>
<p class="lede">These terms cover the public, read-only connection to Why Humanoid? through the Model Context Protocol (MCP). By connecting a client or an agent to it, you accept them. Last updated: 26 November 2026.</p>
<section id="provider"><h2>Who provides it</h2><p>Why Humanoid? and this connection are provided by <a href="https://integrarobot.com">Integrarobot</a>, founded by Javier Martín (see <a href="/about/">About</a>). Questions about these terms: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p></section>
<section id="what"><h2>What the connection does</h2><p>A remote MCP server at <code>${esc(API_ORIGIN)}/mcp</code> with ${MCP_TOOLS.length} read-only tools: ${MCP_TOOLS.map((t) => `<code>${t}</code>`).join(', ')}. They read the Why Humanoid? research catalogue of humanoid robots and their ecosystem, and its published atlases.</p><p>The tools only read. They do not control or send commands to any robot, do not create, change or delete records, do not place orders or make payments, and do not manage accounts, access custom report questionnaires or expose internal operational tables.</p></section>
<section id="access"><h2>Public access and the separate subscription</h2><p>No account or key is needed. Without a key, the connection reads the public catalogue: the free categories in full, and Deployments and Components at their public fields.</p><p>The complete Deployments and Components are a separate paid subscription, described on <a href="/subscribe/">Subscription and reports</a>. Connecting without a key does not unlock them; they are read only with an API key of an active subscription, as explained on <a href="/agents/">For agents</a>.</p></section>
<section id="data"><h2>What the data is, and its limits</h2><p>Catalogue records compile claims from public sources, with source links where available. Sources, dates or values may be missing. A record is not independent verification; manufacturer claims remain claims, and missing values are not filled in. Records may be incomplete or out of date. How records are kept is explained in the <a href="/method/">Method</a>.</p><p>The catalogue is research and data, not a personalised recommendation. Check the original sources before you rely on a record for a decision.</p></section>
<section id="sources"><h2>Sources</h2><p>The rights in the source material stay with its owners. Using the connection does not transfer any rights in it. When you use a record, link the original source it cites.</p></section>
<section id="fair-use"><h2>Fair use</h2><p>Requests made with an API key are limited to ${USAGE_LIMITS.perMinute} a minute and ${USAGE_LIMITS.perDay.toLocaleString('en-GB')} a day per key; over the limit, requests get HTTP 429 with a Retry-After header, and nothing is charged. Keep automated use of the public connection within the same limits. Do not try to reach data the connection does not offer, or to get around these limits or the access rules.</p></section>
<section id="changes"><h2>Availability and changes</h2><p>There is no service level commitment. The connection, its tools and the catalogue may change, be interrupted or be withdrawn. These terms may change; the date above shows the last update.</p></section>
<section id="privacy"><h2>Privacy</h2><p>The public connection needs no account. How Why Humanoid? handles information is described on <a href="/privacy/">Privacy</a>.</p></section>
<section id="contact"><h2>Contact</h2><p><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p></section>
</article>`;
  return page({ title: 'Terms of use for the MCP connection · Why Humanoid?', description: 'Terms of use for the public, read-only Why Humanoid? MCP connection: what its tools do, public scope, the separate subscription, data limits, sources and fair use.', path: '/terms/', body });
}

// ---------- privacy (25 Nov 2026): what the site and the app actually do, nothing more ----------
function privacyPage() {
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, 'Privacy']])}
<article class="entity">
<p class="kicker">Privacy</p>
<h1>How we handle your information</h1>
<p class="lede">Why Humanoid? is run by Integrarobot. This page says what we collect, why, and who processes it for us. Questions or requests about your data: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
${kv([
    ['Visiting the site', 'The public pages count visits with Cloudflare Web Analytics, which sets no cookies and does not track individual visitors.'],
    ['Your account', 'Your email address, to send sign-in links and to identify your account. Sign-in links work once and expire after 15 minutes. Your browser keeps a sign-in token until you sign out.'],
    ['Subscription and payments', 'Payments are processed by Stripe. We do not see or store card details. We keep the subscription state Stripe reports, to open your access.'],
    ['API keys', 'We store a fingerprint of each key, never the key itself, with its label and when it was created, last used or revoked; and request counts per key for the fair-use limits.'],
    ['The MCP connection', 'Your client sends the name of the tool it calls and the arguments that tool needs, such as search words or a table name. The server does not need the conversation around the request. The public connection needs no account. The application does not maintain a conversation or catalogue-query history in its database; with an API key, it counts requests per key and records when the key was last used, as described above. Requests are processed on Cloudflare. If a request fails with an unexpected error, the error is written to the service log, and error logs may contain request-related information. Send only the search words you need, and do not put credentials or personal data in tool arguments.'],
    ['Market data and headlines on company pages', 'On the page of a listed company, quotes, charts, financials, profiles and optional stories are TradingView widgets: when you scroll to them, your browser loads them from TradingView, which receives that request (such as your IP address and browser) under its own privacy policy. Recent headlines: your browser asks our API for the headlines of that company only; our server reads them from Yahoo Finance and keeps a shared copy for 30 minutes, and does not store who asked. The links to Google Finance, Yahoo Finance and Google News open those sites.'],
    ['Custom report questionnaires', 'Your answers are stored in your account, visible only to you and to the people preparing your report. We use them only to prepare and deliver your report and to answer you about it. They are not published, not used for the public catalogue and not used for marketing.'],
    ['Emails', 'Emails about your account and orders are sent through Resend. We do not send marketing emails from this service.'],
    ['Where data is kept', 'The app and its database run on Cloudflare. Payment data stays with Stripe.'],
    ['Your choices', `Ask us at ${SUPPORT_EMAIL} for a copy of your information or to delete it. Deleting an account does not delete payment records that Stripe or we must keep.`],
  ])}
</article>`;
  return page({ title: 'Privacy · Why Humanoid?', description: 'What Why Humanoid? collects, why, and who processes it: sign-in email, Stripe payments, API key fingerprints, custom report questionnaires and emails.', path: '/privacy/', body });
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
<h1>Robot deployment records</h1>
<p class="lede">The database holds ${model.totals.records} deployment records about ${model.totals.deployments} deployments: ${a.by_status.op} recorded as in operation, ${a.by_status.pilot} as pilots or trials, ${a.by_status.ann} as announced and ${a.by_status.unc} unconfirmed. Records are claims from named sources with their status as recorded, not verified facts, and one deployment can have several records.</p>
<section><h2>By status as recorded</h2>${bars(STATUS_KEYS_ORDER.map((k) => ({ label: STATUS_LABEL[k], records: a.by_status[k] })), 'Status as recorded')}<p class="key">Announced means planned or agreed, not evidence of work. Unconfirmed means claimed by a vendor or unresolved.</p></section>
<section><h2>By sector</h2>${bars(a.by_sector.map((r) => ({ label: SECTOR(r.key), records: r.records })), 'Sector')}</section>
<section><h2>By deployment country</h2>${bars(a.by_country.map((r) => ({ label: other(r.key, 'countries'), records: r.records })), 'Country')}</section>
<section><h2>By year</h2>${bars(a.by_year.map((r) => ({ label: other(r.key, 'years'), records: r.records })), 'Year observed or published')}</section>
<section><h2>How to read it</h2><p>Counts are of records, not of robots or sites. Every group with fewer than ${a.min_cell} records is added to «Other», so no number points at a single record. The year is the year the record was observed or, if that is missing, published. How records are collected and labelled is in the <a href="/method/">method</a>; who and where, record by record, is on each <a href="/companies/">company</a> and <a href="/robots/">robot</a> page; the records in full are in the <a href="/subscribe/">Deployments subscription</a> (${esc(price())}).</p></section>
</article>`;
  return page({ title: 'Robot deployment records: status, sectors, countries and years · Why Humanoid?', description: clip(`${model.totals.records} robot deployment records (humanoid and adjacent platforms, as each source names them) by status as recorded, sector, country and year. Records are claims from named sources, not verified facts.`), path: '/reports/deployment-records/', body, type: 'article', section: 'reports' });
}
function methodPage(model) {
  const body = `${crumbs([['/', 'Why Humanoid?'], [null, 'Method']])}
<article class="entity">
<p class="kicker">Method and sources</p>
<h1>How Why Humanoid? records robots and deployments</h1>
<p class="lede">Why Humanoid? records what named sources say about humanoid robots and the robots around them, the companies that make them and the organisations that test or use them. Every value is shown as recorded, with its source; a record is a claim, not a verified fact.</p>
<section><h2>Robots</h2><p>The catalogue holds ${model.robots.length} humanoid robots with their specifications, company and market fields, links and the date their sources were last checked. All of it is free. A value the sources do not give is shown as not published or not disclosed, never estimated.</p></section>
<section id="deployments"><h2>Deployment records and cases</h2><p>A deployment record is one claim from one source about an organisation, a robot and a task. One deployment, a <b>case</b>, can have several records: an announcement, a pilot, a later report. Each record keeps who made the claim and when, its status as recorded, a verification label and an evidence level. Most cases concern humanoid robots; some concern adjacent platforms (for example legged or wheeled robots) where the source names them, and none is reclassified by guesswork.</p>
<p><b>Current status of a case.</b> The status recorded by its most recent dated source. A source date is a period: a day is itself, a month or a year covers the whole period, and an impossible date is not a date. When the latest sources cannot be ordered (a year and a day inside it) or share the same day and disagree, the most advanced of their statuses is shown and the case says so: a tie-break, not new evidence. The order is in operation, then pilot or trial, then a vendor's unconfirmed claim of operation, then announced. A later source that records less, such as a planned expansion or a paused pilot, is what the case shows now. A case whose sources are all undated is grouped apart, with the most advanced status its records state.</p>
<p><b>The evolution chart</b> follows a different rule on purpose: by each date, the most advanced status documented so far. It shows the history of the evidence, so its totals differ from today's status.</p>
${kv([['In operation', 'The source says the robot is working in operation.'], ['Pilot or trial', 'The source describes a pilot, trial or test.'], ['Announced', 'Planned or agreed, not evidence of work.'], ['Unconfirmed', 'Claimed by a vendor, or unresolved.']])}
<p>Verification labels say who reported the claim, as recorded: customer confirmed, partner reported, vendor reported, media reported or unresolved. The evidence level is a code from E0 to E5, shown as recorded. The research workbook does not define these codes, so Why Humanoid? does not explain or rank them: what each level means is unknown until its definitions are documented.</p></section>
<section><h2>Selected evidence</h2><p>Each robot and company page shows one of its records with its site, task, status, metric, evidence level, verification label and source. The record is chosen by a fixed rule among those with a source link and a verification other than unresolved: the most advanced status as recorded (in operation, then pilot or trial, then a vendor's claim of operation, then announced), then a primary source (customer, maker or partner) before the press, then customer confirmation, then the latest publication, then a record with a metric. The claim text, notes and the other records stay with the Deployments subscription.</p></section>
<section><h2>Robots, companies and records</h2><p>A record is linked to a catalogue robot only when it names that model or its model line, never because it names the maker alone. When it names the model line, the page says the record may concern another version. Companies are identified by the organisation identifier in our research or by the maker's name; no corporate data is added.</p></section>
<section id="directories"><h2>Directory lists (Software and Other Robots)</h2><p>Each list follows the research workbook. Section headings and repeated header rows are not entries. An exact repeat in the same list (the same address and the same name) is merged into one entry, keeping any other description. An entry listed in a second list, such as a world model that is also robotics software, appears in both and is counted once. Entries with the same name at different addresses, or the same address under different names, stay separate until a review decides they are the same.${(() => { const sw = JSON.parse(readFileSync(new URL('data/preview/index.json', root), 'utf8')).tabs.find((t) => t.id === 'software')?.reconciliation; return sw ? ` Software today: ${sw.source_entries} rows in the workbook, ${sw.excluded.length} headings or header rows, ${sw.merged.length} exact repeats merged, ${sw.rows} listed rows and ${sw.entries} entries; ${sw.review.length} pairs wait for review.` : ''; })()}</p></section>
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
  return ['/', ...CATEGORIES.map((c) => c.path), '/companies/', '/subscribe/', '/agents/', '/about/', '/terms/', '/privacy/', '/reports/deployment-records/', '/method/', ...model.robots.map((r) => r.path), ...model.companies.map((c) => c.path), ...model.otherRobots.map((r) => r.path), ...REPORTS.map(reportPath), ...[...model.cm.products, ...model.cm.software].map((r) => `/components/${r.component_id.toLowerCase()}/`), ...model.cases.map(casePath)];
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
  files.set('agents/index.html', agentsPage());
  files.set('privacy/index.html', privacyPage());
  files.set('about/index.html', aboutPage());
  files.set('terms/index.html', termsPage());
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
