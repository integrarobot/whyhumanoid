#!/usr/bin/env node
// Checks of the permanent robot and company pages (tools/build-pages.mjs), read as a crawler or a reader without
// JavaScript would: parsed with scripts off. Run from tools/: node verify-pages.mjs
//   1. Every catalogue robot and every public company has its page, with a unique title and description, its own
//      canonical address, the name in the h1 and its main content (facts, sources, links) in the HTML.
//   2. Robot and company pages link to each other; every internal link resolves to a published page or file.
//   3. Values shown are the public values: robot facts equal the free catalogue; organisations come only from the
//      free preview rows; no record identifiers.
//   4. The sitemap lists exactly the current pages; retired addresses redirect (without JavaScript) and are not listed;
//      404.html sends an unknown robot slug with a known id to the current page.
import { JSDOM } from 'jsdom';
import { existsSync, readFileSync } from 'node:fs';
import { SITE, buildPages, publishedReports, reportPath, sitemapUrls } from './build-pages.mjs';
import { CATEGORIES, PREVIEW_ROWS } from '../server/src/access/matrix.js';
import { projectionProblems } from './export-public.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const failures = [];
const fail = (m) => failures.push(m);
const { files, model } = buildPages();
const doc = (path) => new JSDOM(read(`${path.slice(1)}index.html`)).window.document;
const exists = (href) => {
  const p = href.split('#')[0].split('?')[0];
  if (p === '/' || p === '/app/') return true;
  return existsSync(new URL(p.endsWith('/') ? `${p.slice(1)}index.html` : p.slice(1), root));
};

// 1 and 2: every page, as HTML only.
const titles = new Map(), descs = new Map();
const previewOrgs = new Set(JSON.parse(read('data/preview/deployments.json')).rows.map((r) => r.organization_name));
// Organisations a page may name in a record card: the free preview's and those of the selected evidence (projection).
const proj = JSON.parse(read('data/public/projection.json'));
const cardOrgs = new Set([...previewOrgs, ...proj.companies.map((c) => c.evidence?.organization_name), ...Object.values(proj.robots).map((r) => r.evidence?.organization_name)].filter(Boolean));
const pages = [...model.robots.map((r) => ['robot', r]), ...model.companies.map((c) => ['company', c]), ...model.otherRobots.map((r) => ['other', r]), ...publishedReports().map((r) => ['report', { ...r, name: r.title, path: reportPath(r) }])];
for (const [kind, x] of pages) {
  const d = doc(x.path);
  const title = d.title, desc = d.querySelector('meta[name=description]')?.content ?? '';
  const canonical = d.querySelector('link[rel=canonical]')?.href;
  if (canonical !== SITE + x.path) fail(`${x.path}: canonical ${canonical}`);
  if (d.querySelector('meta[property="og:url"]')?.content !== SITE + x.path) fail(`${x.path}: og:url differs from canonical`);
  if (d.querySelector('meta[name=robots]')) fail(`${x.path}: current page marked noindex`);
  if (!desc || desc.length > 160) fail(`${x.path}: description missing or longer than 160 characters`);
  if (titles.has(title)) fail(`${x.path}: title also used by ${titles.get(title)}`); else titles.set(title, x.path);
  if (descs.has(desc)) fail(`${x.path}: description also used by ${descs.get(desc)}`); else descs.set(desc, x.path);
  const h1 = d.querySelector('h1')?.textContent ?? '';
  const main = d.querySelector('main')?.textContent ?? '';
  if (!h1.includes(x.name)) fail(`${x.path}: h1 lacks the name`);
  if (!/\S/.test(d.querySelector('.lede')?.textContent ?? '')) fail(`${x.path}: no summary`);
  if (kind !== 'other' && !/Sources/.test(main)) fail(`${x.path}: no sources section`);
  if (kind === 'other' && x.url && !d.querySelector(`main a[href="${x.url.replace(/"/g, '&quot;')}"]`)) fail(`${x.path}: no link to the entry's website`);
  for (const a of d.querySelectorAll('a[href^="/"]')) if (!exists(a.getAttribute('href'))) fail(`${x.path}: broken link ${a.getAttribute('href')}`);
  if (/\b(?:rec|clm|dep|lnk|src|mdl|res)_[a-z0-9]+_[a-z0-9_]+\b/.test(d.documentElement.outerHTML)) fail(`${x.path}: contains a record identifier`);
  if (kind === 'robot') {
    if (!h1.includes(x.lab)) fail(`${x.path}: h1 lacks the maker`);
    if (x.maker && !d.querySelector(`a[href="${x.maker.path}"]`)) fail(`${x.path}: no link to its maker's page`);
    for (const dt of d.querySelectorAll('section dl.kv dt')) {
      const field = { 'Height (cm)': 'Height (cm)', 'Weight (kg)': 'Weight (kg)', Listing: 'Stock', Valuation: 'Valuation', 'B2B clients': 'B2B Client' }[dt.textContent];
      const v = x.record[field];
      if (field && (v ?? '').trim() && dt.nextElementSibling.textContent.replace(/\s+/g, ' ').trim() !== String(v).replace(/\s+/g, ' ').trim()) fail(`${x.path}: ${dt.textContent} differs from the catalogue`);
    }
    for (const b of d.querySelectorAll('.dep header b')) if (!cardOrgs.has(b.textContent)) fail(`${x.path}: organisation "${b.textContent}" is neither in the free preview nor a selected evidence`);
  } else if (kind === 'company') {
    for (const rb of x.robotList) {
      if (!d.querySelector(`a[href="${rb.path}"]`)) fail(`${x.path}: no link to its robot ${rb.path}`);
      if (!doc(rb.path).querySelector(`a[href="${x.path}"]`)) fail(`${rb.path}: no link back to ${x.path}`);
    }
    if ((x.as_organisation || x.as_maker) && !/Counting records is not independent verification/.test(main)) fail(`${x.path}: records counted without saying they are claims as recorded`);
    for (const reserved of ['site_name', 'task_description', 'claim_text', 'source_url', 'open_questions_notes']) if (d.querySelector('main').outerHTML.includes(reserved)) fail(`${x.path}: names the reserved field ${reserved}`);
  }
}
// The ten categories (access matrix, 23 Nov 2026): directly loadable, in the confirmed order in every page's
// navigation, labelled free or subscription as the matrix says; subscription categories never show more than the
// public preview in their HTML.
const LABELS = CATEGORIES.map((c) => c.label);
for (const c of CATEGORIES) {
  const d = doc(c.path);
  if (d.querySelector('link[rel=canonical]')?.href !== SITE + c.path) fail(`${c.path}: canonical`);
  if (d.querySelector('meta[name=robots]')) fail(`${c.path}: category page marked noindex`);
  if (d.querySelector('h1')?.textContent !== c.label) fail(`${c.path}: h1 is not "${c.label}"`);
  const navLabels = [...d.querySelectorAll('nav.cats a')].map((a) => a.textContent.trim());
  if (JSON.stringify(navLabels) !== JSON.stringify(LABELS)) fail(`${c.path}: navigation is not the ten categories in order (${navLabels.join(', ')})`);
  if (d.querySelector('nav.cats a[aria-current="page"]')?.getAttribute('href') !== c.path) fail(`${c.path}: navigation does not mark the current category`);
  const badge = d.querySelector('.kicker .badge')?.textContent;
  if (badge !== (c.access === 'subscription' ? 'Subscription' : 'Free')) fail(`${c.path}: access badge ${badge}`);
  if (titles.has(d.title)) fail(`${c.path}: title also used by ${titles.get(d.title)}`); else titles.set(d.title, c.path);
  for (const a of d.querySelectorAll('a[href^="/"]')) if (!exists(a.getAttribute('href'))) fail(`${c.path}: broken link ${a.getAttribute('href')}`);
}
if (doc('/deployments/').querySelectorAll('article.dep li').length > PREVIEW_ROWS) fail('/deployments/: more records than the public preview');
if (doc('/components/').querySelectorAll('tbody tr').length > PREVIEW_ROWS) fail('/components/: more entries than the public preview');
// Every company in the public data has a page: each public Components entry links to one (maker or company as recorded).
for (const tr of doc('/components/').querySelectorAll('tbody tr')) if (!tr.querySelector('a[href^="/companies/"]')) fail(`/components/: ${tr.textContent.trim().slice(0, 40)} has no company page`);
for (const id of ['investment', 'integrators']) for (const a of doc(`/${id}/`).querySelector('article section table').querySelectorAll('tbody tr td:first-child a')) if (!a.getAttribute('href').startsWith('/companies/')) fail(`/${id}/: ${a.textContent} does not link to its company page`);
if (doc('/humanoids/').querySelectorAll('tbody tr').length !== model.robots.length) fail('/humanoids/: does not list every robot');
// Reports: the existing analysis stays at /reports/deployment-records/; each verified external report has its page and a
// link to its public original; nothing links a private sheet, Drive or Docs file.
const reportsDoc = doc('/reports/');
if (!reportsDoc.querySelector('a[href="/reports/deployment-records/"]')) fail('/reports/: no link to the deployment records analysis');
if (reportsDoc.querySelectorAll('tbody tr').length !== publishedReports().length) fail('/reports/: does not list every verified report');
for (const r of publishedReports()) if (!doc(reportPath(r)).querySelector(`a[href="${r.original_url}"]`)) fail(`${reportPath(r)}: no link to the original`);
if (doc('/reports/deployment-records/').querySelector('nav.cats a[aria-current="page"]')?.getAttribute('href') !== '/reports/') fail('/reports/deployment-records/: not shown under Reports');
for (const [f, html] of files) if (/docs\.google\.com|drive\.google\.com|\/spreadsheets\/d\//.test(html)) fail(`${f}: links a private Google file`);
if (doc('/other-robots/').querySelectorAll('tbody tr').length !== model.otherRobots.length) fail('/other-robots/: does not list every entry');
for (const rbx of model.robots) {
  const legacy = files.get(`robots/${rbx.path.split('/')[2]}/index.html`) ?? '';
  if (!legacy.includes(`content="0; url=${rbx.path}"`)) fail(`/robots/${rbx.path.split('/')[2]}/ does not redirect to ${rbx.path}`);
}
if (!(files.get('robots/index.html') ?? '').includes('content="0; url=/humanoids/"')) fail('/robots/ does not redirect to /humanoids/');
// Reviewed presentation (tools/robot-presentation.json): display name, full-body cutout and the maker's order link appear
// on exactly the robots that have them; the image is a real file of its stated size; the link is the reviewed URL.
const { robotPresentation, presentationProblems } = await import('./robot-presentation.mjs');
for (const problem of presentationProblems()) fail(`tools/robot-presentation.json: ${problem}`);
const presented = robotPresentation();
for (const rbx of model.robots) {
  const d = doc(rbx.path), pr = presented.get(String(rbx.id));
  const img = d.querySelector('.robot-figure img'), buy = d.querySelector('a.order-btn');
  if (!pr) { if (img || buy) fail(`${rbx.path}: has an image or order link without a reviewed entry`); continue; }
  if (pr.name && d.querySelector('h1')?.firstChild?.textContent.trim() !== pr.name) fail(`${rbx.path}: heading is not the display name ${pr.name}`);
  if (pr.name && d.querySelector('.crumbs [aria-current]')?.textContent !== pr.name) fail(`${rbx.path}: breadcrumb is not the display name`);
  if (pr.image) {
    if (!img) fail(`${rbx.path}: reviewed image missing`);
    else {
      if (img.getAttribute('alt') !== pr.image.alt) fail(`${rbx.path}: image alt differs`);
      if (+img.getAttribute('width') !== pr.image.width || +img.getAttribute('height') !== pr.image.height) fail(`${rbx.path}: image width/height attributes differ`);
      if (!exists(img.getAttribute('src')) && !existsSync(new URL(img.getAttribute('src').slice(1), root))) fail(`${rbx.path}: image file missing`);
      if (d.querySelector('.robot-figure source')?.getAttribute('srcset') !== pr.image.src) fail(`${rbx.path}: WebP source missing`);
    }
  }
  if (pr.order) {
    if (!buy || buy.getAttribute('href') !== pr.order.url) fail(`${rbx.path}: order link is not ${pr.order.url}`);
    else if (buy.getAttribute('target') !== '_blank' || !/noopener/.test(buy.getAttribute('rel') ?? '') || !buy.textContent.includes(pr.order.label)) fail(`${rbx.path}: order link attributes or label`);
  }
}
for (const idx of ['/humanoids/', '/companies/']) {
  const d = doc(idx);
  const n = d.querySelectorAll('tbody tr').length;
  const want = idx === '/humanoids/' ? model.robots.length : model.companies.length;
  if (n !== want) fail(`${idx}: lists ${n} of ${want}`);
  for (const a of d.querySelectorAll('a[href^="/"]')) if (!exists(a.getAttribute('href'))) fail(`${idx}: broken link ${a.getAttribute('href')}`);
}
for (const pth of ['/reports/deployment-records/', '/method/']) {
  const d = doc(pth);
  if (d.querySelector('link[rel=canonical]')?.href !== SITE + pth) fail(`${pth}: canonical`);
  for (const a of d.querySelectorAll('a[href^="/"]')) if (!exists(a.getAttribute('href'))) fail(`${pth}: broken link ${a.getAttribute('href')}`);
  if (!/not verified facts|a record is a claim/.test(d.querySelector('main').textContent)) fail(`${pth}: does not say records are claims`);
}
const rep = doc('/reports/deployment-records/');
for (const td of rep.querySelectorAll('table.bars td:last-child')) if (Number(td.textContent.trim()) < 3) fail(`report: a cell under 3 records (${td.textContent.trim()})`);
const home = read('index.html');
for (const c of CATEGORIES) if (!home.includes(`href="${c.path}"`)) fail(`index.html: no static link to ${c.path}`);
if (!/href="\/companies\/"/.test(home)) fail('index.html: no static link to the company pages');

for (const problem of projectionProblems(JSON.parse(read('data/public/projection.json')))) fail(`data/public/projection.json: ${problem}`);
const withPage = new Set(model.companies.map((c) => c.id));
if (JSON.parse(read('data/public/projection.json')).companies.some((c) => !withPage.has(c.id))) fail('not every company of the projection has a page');
// English only: no Spanish country label of the snapshot, and no value of a field still pending translation, on any page.
const display = JSON.parse(read('tools/display-translations.json'));
const pendingValues = Object.entries(display.pending).flatMap(([id, fs]) => JSON.parse(read(`data/preview/${id}.json`)).rows.flatMap((r) => fs.map((f) => r[f]).filter((v) => typeof v === 'string' && v.length > 20)));
for (const f of [...files.keys()].filter((x) => x.endsWith('.html'))) {
  const html = files.get(f);
  for (const label of Object.keys(display.countries)) if (html.includes(`>${label}<`) || html.includes(`(${label})`)) { fail(`${f}: Spanish country label ${label}`); break; }
  for (const v of pendingValues) if (html.includes(v.replace(/&/g, '&amp;').slice(0, 60))) { fail(`${f}: shows a value still pending English`); break; }
}
// One canonical page per company: no two company pages for the same name.
const seenNames = new Map();
for (const c of model.companies) { const k = c.name.toLowerCase(); if (seenNames.has(k)) fail(`two company pages named ${c.name}: ${seenNames.get(k)} and ${c.path}`); else seenNames.set(k, c.path); }

// 4. Sitemap, redirects, 404.
const locs = new Set([...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const want = new Set(sitemapUrls(model).map((u) => SITE + u));
for (const [, x] of pages) if (!want.has(SITE + x.path)) fail(`sitemap.xml: ${x.path} not listed`);
if ([...locs].some((u) => u.startsWith(`${SITE}/robots/`))) fail('sitemap.xml: lists a /robots/ redirect address');
if (locs.size !== want.size || [...want].some((u) => !locs.has(u))) fail(`sitemap.xml: ${locs.size} URLs, expected ${want.size}`);
if (!/^Sitemap: https:\/\/whyhumanoid\.com\/sitemap\.xml$/m.test(read('robots.txt'))) fail('robots.txt: no Sitemap line');
const rb = model.robotById.get(16) ?? model.robots[0];
const co = rb.maker;
const old = buildPages({ robots: { [rb.id]: ['old-name-' + rb.id], 99999: ['gone-robot-99999'] }, companies: { mfr_old_name: { slugs: ['old-name'], robots: [rb.id], organization_ids: [] }, mfr_gone: { slugs: ['gone-co'], robots: [], organization_ids: [] } } }).files;
const moved = (f, to) => { const h = old.get(f) ?? ''; return h.includes(`content="0; url=${to}"`) && h.includes('name="robots" content="noindex"') && h.includes(`href="${to}"`); };
if (!moved(`robots/old-name-${rb.id}/index.html`, rb.path)) fail('a retired robot slug does not redirect to the current page');
if (co && !moved('companies/old-name/index.html', co.path)) fail('a renamed company (same robots) does not redirect to its current page');
if (!/No longer in the public catalogue/.test(old.get('robots/gone-robot-99999/index.html') ?? '') || !/No longer/.test(old.get('companies/gone-co/index.html') ?? '')) fail('a removed robot or company address does not say so');
const script = /<script>([\s\S]*?)<\/script>/.exec(read('404.html'))?.[1] ?? '';
let went = null;
await new Function('location', 'fetch', script)(
  { pathname: `/robots/any-old-name-${rb.id}/`, replace: (u) => { went = u; } },
  async () => ({ json: async () => JSON.parse(read('data/pages.json')) }),
);
await new Promise((r) => setTimeout(r, 20));
if (went !== rb.path) fail(`404.html: /robots/any-old-name-${rb.id}/ went to ${went}`);

if (failures.length) {
  console.error(`Public pages check FAILED (${failures.length}):\n- ${failures.slice(0, 40).join('\n- ')}`);
  process.exit(1);
}
console.log(`Public pages check passed: ${CATEGORIES.length} category pages, ${model.robots.length} humanoid, ${model.otherRobots.length} other-robot and ${model.companies.length} company pages readable without JavaScript, unique titles, descriptions and canonical URLs, links both ways, public values only, sitemap of ${locs.size} URLs, retired addresses redirect, 404 resolves robot ids.`);
