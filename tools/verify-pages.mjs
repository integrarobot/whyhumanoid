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
import { BEFORE_PAYMENT, REPORTS_LIVE_OPEN } from '../server/src/orders/services.js';
import { JSDOM } from 'jsdom';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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
      const expected = field === 'Valuation' && /^[\s\d.,~+-]+$/.test(String(v ?? '')) && /\d/.test(String(v)) ? 'Amount recorded without currency or date: not shown' : String(v ?? '').replace(/\s+/g, ' ').trim();
      if (field && (v ?? '').trim() && dt.nextElementSibling.textContent.replace(/\s+/g, ' ').trim() !== expected) fail(`${x.path}: ${dt.textContent} differs from the catalogue`);
    }
    for (const b of d.querySelectorAll('.dep header b')) if (b.textContent !== 'Organisation not recorded' && !cardOrgs.has(b.textContent)) fail(`${x.path}: organisation "${b.textContent}" is neither in the free preview nor a selected evidence`);
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
  // Benchmarks is the Robotics Evaluation Atlas (23 Nov 2026): its h1 is the atlas title and its kicker names the category.
  const h1 = { benchmarks: 'Robotics Evaluation Atlas', datasets: 'Robot Learning Data Atlas', reports: 'Research Conclusions Atlas' }[c.id] ?? c.label;
  if (d.querySelector('h1')?.textContent !== h1) fail(`${c.path}: h1 is not "${h1}"`);
  if (['benchmarks', 'reports'].includes(c.id) && !new RegExp(c.label).test(d.querySelector('.kicker')?.textContent ?? '')) fail(`${c.path}: kicker does not name the category`);
  const navLabels = [...d.querySelectorAll('nav.cats a')].map((a) => a.textContent.trim());
  if (JSON.stringify(navLabels) !== JSON.stringify(LABELS)) fail(`${c.path}: navigation is not the ten categories in order (${navLabels.join(', ')})`);
  if (d.querySelector('nav.cats a[aria-current="page"]')?.getAttribute('href') !== c.path) fail(`${c.path}: navigation does not mark the current category`);
  const badge = d.querySelector('.kicker .badge')?.textContent;
  if (badge !== (c.access === 'subscription' ? 'Subscription' : 'Free')) fail(`${c.path}: access badge ${badge}`);
  if (titles.has(d.title)) fail(`${c.path}: title also used by ${titles.get(d.title)}`); else titles.set(d.title, c.path);
  for (const a of d.querySelectorAll('a[href^="/"]')) if (!exists(a.getAttribute('href'))) fail(`${c.path}: broken link ${a.getAttribute('href')}`);
}
// Since 24 Nov 2026 every case and product is listed: no public page carries a paid Deployments field label.
if (doc('/deployments/').querySelectorAll('article.dep').length) fail('/deployments/: still renders full records');
// Every organisation of a public Components product has a company page (reviewed makers, tools/components-makers.json).
for (const card of doc('/components/').querySelectorAll('#pcs .pc')) if (!card.querySelector('.pc-m a[href^="/companies/"]')) fail(`/components/: ${card.dataset.id} has no company page`);
for (const id of ['investment', 'integrators']) for (const a of doc(`/${id}/`).querySelector('article section table').querySelectorAll('tbody tr td:first-child a')) if (!a.getAttribute('href').startsWith('/companies/')) fail(`/${id}/: ${a.textContent} does not link to its company page`);
if (doc('/humanoids/').querySelectorAll('tbody tr:not(.evo-tbl tr)').length !== model.robots.length) fail('/humanoids/: does not list every robot');
// Reports (Research Conclusions Atlas, 24 Nov 2026): the existing analysis stays at /reports/deployment-records/; every
// report has its page with a link to its public original and every finding's passport; every finding has a row in the
// table; every chart draws only checked findings, one mark per original estimate, and its table holds the same marks.
const reportsDoc = doc('/reports/');
const ratlas = JSON.parse(read('data/reports/atlas.json'));
if (!reportsDoc.querySelector('a[href="/reports/deployment-records/"]')) fail('/reports/: no link to the deployment records analysis');
if (reportsDoc.querySelectorAll('.rp-ft tbody tr').length !== ratlas.findings.length) fail('/reports/: the findings table does not list every finding');
if (reportsDoc.querySelectorAll('.rp-cov tbody tr').length !== ratlas.reports.length) fail('/reports/: the coverage matrix does not list every report');
for (const r of publishedReports()) {
  const d = doc(reportPath(r));
  if (!d.querySelector(`a[href="${r.url}"]`)) fail(`${reportPath(r)}: no link to the original`);
  if (!reportsDoc.querySelector(`.rp-reports a[href="${reportPath(r)}"]`)) fail(`/reports/: no card for ${r.id}`);
  for (const f of ratlas.findings.filter((x) => x.report === r.id)) if (!d.getElementById(`f-${f.id}`)) fail(`${reportPath(r)}: no passport for ${f.id}`);
}
const rfind = new Map(ratlas.findings.map((f) => [f.id, f]));
for (const fig of reportsDoc.querySelectorAll('figure.rp-fig')) {
  const svg = fig.querySelector('svg.rp-svg');
  if (!svg) continue;
  const marks = [...svg.querySelectorAll('a.mk')].map((a) => a.dataset.f);
  const rows = [...fig.querySelectorAll('.rp-tv tbody tr')].map((tr) => tr.dataset.f);
  if (marks.sort().join() !== rows.sort().join()) fail(`/reports/#${fig.id}: chart marks and table rows differ`);
  const origins = marks.map((id) => rfind.get(id)?.origin);
  if (new Set(origins).size !== origins.length) fail(`/reports/#${fig.id}: an original estimate is drawn twice`);
  for (const id of marks) if (rfind.get(id)?.check.status !== 'verified') fail(`/reports/#${fig.id}: draws ${id}, which is not checked`);
}
if (!reportsDoc.querySelector('#theme-market') || reportsDoc.querySelectorAll('.rp-theme').length !== ratlas.vocabulary.themes.length) fail('/reports/: a theme workspace is missing');
if (!doc('/reports/anthropic-what-work-can-robots-do-2026/').querySelector('h1')) fail('/reports/anthropic-what-work-can-robots-do-2026/: the existing address no longer has its page');
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
  const n = d.querySelectorAll('tbody tr:not(.evo-tbl tr)').length; // the evolution chart's data table aside
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
// A value recorded in English already (its reviewed translation in tools/investment-review.json is the value itself)
// is not pending: it may appear as it is.
const invReview = JSON.parse(read('tools/investment-review.json'));
const alreadyEnglish = new Set([...Object.entries(invReview.descriptions), ...Object.entries(invReview.segments)].filter(([k, v]) => k === v).map(([k]) => k));
const pendingValues = Object.entries(display.pending).flatMap(([id, fs]) => JSON.parse(read(`data/preview/${id}.json`)).rows.flatMap((r) => fs.map((f) => r[f]).filter((v) => typeof v === 'string' && v.length > 20 && !alreadyEnglish.has(v))));
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

// Robotics Evaluation Atlas (23 Nov 2026): /benchmarks/ shows the public snapshot, readable without JavaScript: every
// resource with its anchor, every observation with its value, source and stable id, counts computed from the rows, and
// nothing of Task Evaluation or of private links.
{
  const atlas = JSON.parse(read('data/benchmarks/atlas.json'));
  const d = doc('/benchmarks/');
  const p = '/benchmarks/';
  const c = atlas.counts;
  const counts = [...d.querySelectorAll('.atlas-counts dd')].map((x) => Number(x.textContent));
  if (JSON.stringify(counts) !== JSON.stringify([c.resources, c.resources_with_results, c.observations, c.resources_awaiting_results])) fail(`${p}: headline counts ${counts} differ from the snapshot`);
  if (d.querySelectorAll('#matrix tbody tr').length !== atlas.benchmarks.length) fail(`${p}: the landscape does not list every resource`);
  for (const b of atlas.benchmarks) {
    const card = d.getElementById(b.id);
    if (!card || card.tagName !== 'DETAILS') fail(`${p}: no resource card #${b.id}`);
    const row = d.getElementById(`row-${b.id}`);
    const marks = row ? [...row.querySelectorAll('td.cv .g.on')].length : -1;
    if (marks !== b.capabilities.length) fail(`${p}: ${b.id} shows ${marks} capability marks for ${b.capabilities.length} groups`);
  }
  if (d.querySelectorAll('#obs tbody tr').length !== atlas.results.length) fail(`${p}: the table does not list every observation`);
  for (const r of atlas.results) {
    const tr = d.getElementById(r.id);
    if (!tr) { fail(`${p}: no table row #${r.id}`); continue; }
    const val = r.value === null ? 'Not reported' : `${r.value}${r.unit === '%' ? '%' : ''}`;
    if (!tr.querySelector('td.num')?.textContent.startsWith(val)) fail(`${p}: ${r.id} does not show ${val}`);
    if (r.source_url && !tr.querySelector(`a[href="${r.source_url}"]`)) fail(`${p}: ${r.id} has no source link`);
    if (r.value !== null && r.unit === '%' && !d.querySelector(`.panels .dot[data-res="${r.id}"], #cmp-out .dot[data-res="${r.id}"], template`)) fail(`${p}: ${r.id} is not drawn`);
  }
  for (const r of atlas.results) if (r.benchmark_id === 'bm-paw' || r.benchmark_id === 'bm-physics-iq') if (r.value !== null && !d.querySelector(`.panels [data-res="${r.id}"]`)) fail(`${p}: ${r.id} missing from its results panel`);
  const html = read('benchmarks/index.html');
  if (/eligible_task_evidence|Task evaluations? of humanoid/i.test(html)) fail(`${p}: still shows Task Evaluation`);
  if (/docs\.google\.com|drive\.google\.com/.test(html)) fail(`${p}: links a private Google file`);
  if (/class="[^"]*\b(err|whisker)\b/.test(html)) fail(`${p}: draws error bars the data does not have`);
  if (!d.querySelector('script[src^="/assets/atlas.js?v="]') || !d.querySelector('link[href^="/assets/atlas.css?v="]')) fail(`${p}: atlas assets missing`);
}
// Components (23 Nov 2026; complete public listing since 24 Nov 2026): /components/ shows every product at its public
// fields and the coverage counts; every component id has its address with the public summary; every paid field of a
// public summary says "With the subscription", never that the source lacks it; no paid value is in the HTML.
{
  const cov = JSON.parse(read('data/components/coverage.json'));
  const hw = JSON.parse(read('data/preview/hardware.json')).rows;
  const sw = JSON.parse(read('data/preview/component-software.json')).rows;
  const d = doc('/components/');
  const p = '/components/';
  const counts = [...d.querySelectorAll('.cx-counts dd')].map((x) => Number(x.textContent));
  if (counts[0] !== cov.counts.products || counts.at(-1) !== cov.counts.references) fail(`${p}: counts ${counts} differ from the coverage file`);
  if (d.querySelectorAll('#pcs .pc').length !== hw.length) fail(`${p}: the catalogue does not list every public product`);
  for (const r of hw) if (!d.querySelector(`#pcs .pc[data-id="${r.component_id}"] a[href="/components/${r.component_id.toLowerCase()}/"]`)) fail(`${p}: ${r.component_id} has no card linking its passport`);
  if (!d.querySelector('#cmp-out table.cmp')) fail(`${p}: no default comparison`);
  for (const id of [...cov.ids.products, ...cov.ids.software]) {
    const path = `/components/${id.toLowerCase()}/`;
    const pd = doc(path);
    const pub = [...hw, ...sw].find((r) => r.component_id === id);
    if (!pub) { fail(`${path}: ${id} is not public at its public fields`); continue; }
    if (pd.querySelector('h1')?.textContent !== pub.name) fail(`${path}: h1 is not ${pub.name}`);
    if (!pd.querySelector('.pp.pp-summary') || !pd.querySelector('.pp-lockbox a[href="/subscribe/"]')) fail(`${path}: no public summary with the subscription offer`);
    for (const dd of pd.querySelectorAll('.pp-kv dd[data-f]')) {
      const f = dd.dataset.f;
      if (!(f in pub) && dd.textContent !== 'With the subscription') fail(`${path}: paid field ${f} shows "${dd.textContent.slice(0, 40)}"`);
    }
    if (pub.main_source_url && !pd.querySelector(`a[href="${pub.main_source_url}"]`)) fail(`${path}: the main source is not linked`);
    if (pd.querySelector('meta[name="robots"][content="noindex"]')) fail(`${path}: a public product page is not indexable`);
  }
  const html = read('components/index.html');
  if (/docs\.google\.com|drive\.google\.com|spreadsheets\/d\//.test(html)) fail(`${p}: links a private Google file`);
  if (!d.querySelector('script[src^="/assets/components.js?v="]') || !d.querySelector('script[src^="/assets/components-core.js?v="]')) fail(`${p}: explorer scripts missing`);
}
// Deployments (24 Nov 2026): every case listed with its public summary and sources; every case has its page; the
// two paths are on the category page; no paid field is named as missing.
{
  const depRows = JSON.parse(read('data/preview/deployments.json')).rows;
  const ids = [...new Set(depRows.map((r) => r.deployment_id))];
  const d = doc('/deployments/');
  const cards = [...d.querySelectorAll('#dcs > li.dc')];
  if (cards.length !== ids.length) fail(`/deployments/: ${cards.length} cases listed, ${ids.length} expected`);
  const reg = JSON.parse(read('tools/permalinks.json')).deployments ?? {};
  for (const id of ids) {
    const slug = reg[id]?.at(-1);
    if (!slug) { fail(`/deployments/: ${id} has no registered address`); continue; }
    const card = d.getElementById(slug);
    if (!card?.querySelector(`a[href="/deployments/${slug}/"]`)) fail(`/deployments/: ${id} has no card linking its page`);
    const pd = doc(`/deployments/${slug}/`);
    for (const r of depRows.filter((x) => x.deployment_id === id)) {
      const u = String(r.source_url ?? '').match(/https?:\/\/[^\s|,;]+/)?.[0];
      if (u && !pd.querySelector(`a[href="${u}"]`)) fail(`/deployments/${slug}/: source of ${r.record_id} not linked`);
    }
    if (!/not facts verified/.test(pd.body.textContent)) fail(`/deployments/${slug}/: no caveat`);
  }
  const offer = d.getElementById('offer');
  if (!offer || !/US\$100/.test(offer.textContent) || !offer.textContent.includes(BEFORE_PAYMENT) || !(REPORTS_LIVE_OPEN ? offer.querySelector('a[href="/app/#reports"]') : /Not available to order yet/.test(offer.textContent))) fail('/deployments/: the two paths are missing or do not match the report sales state');
  if (!d.querySelector('script[src^="/assets/deployments.js?v="]')) fail('/deployments/: filter script missing');
  if (/No task description in the sheet|No metric in the sheet/.test(d.body.textContent)) fail('/deployments/: a paid field is shown as missing');
  const sub = doc('/subscribe/');
  if (!/US\$100 per year/.test(sub.body.textContent) || !sub.getElementById('reports') || /€/.test(sub.body.textContent)) fail('/subscribe/: USD price or reports section missing, or a euro price left');
}
// Robot Learning Data Atlas (23 Nov 2026): /datasets/ shows the public snapshot, readable without JavaScript: every
// resource in its lane and with its passport card (stable anchor), every quantity with its value, unit and scope, the
// set-apart figures outside the default scale view, counts computed from the rows, and no private link or editorial note.
{
  const atlas = JSON.parse(read('data/datasets/atlas.json'));
  const d = doc('/datasets/');
  const p = '/datasets/';
  const c = atlas.counts;
  const counts = [...d.querySelectorAll('.atlas-counts dd')].map((x) => Number(x.textContent));
  if (JSON.stringify(counts) !== JSON.stringify([c.resources, c.corpora, c.resources_with_quantities, c.quantities, c.resources_awaiting_quantities])) fail(`${p}: headline counts ${counts} differ from the snapshot`);
  if (d.querySelectorAll('.lanes .dtile').length !== atlas.resources.length) fail(`${p}: the origins map does not show every resource`);
  if (d.querySelectorAll('.mx tbody tr[data-ds]').length !== atlas.resources.length) fail(`${p}: the modality matrix does not list every resource`);
  for (const r of atlas.resources) {
    const card = d.getElementById(r.id);
    if (!card || card.tagName !== 'DETAILS') fail(`${p}: no passport card #${r.id}`);
    const tile = d.querySelector(`.dtile[data-ds="${r.id}"]`);
    if (!tile || tile.closest('.lane')?.dataset.lane !== r.lane) fail(`${p}: ${r.id} is not in its ${r.lane} lane`);
    if (r.source_url && !card?.querySelector(`a[href="${r.source_url}"]`)) fail(`${p}: ${r.id} has no source link`);
    for (const b of r.related_benchmarks) if (!card?.querySelector(`a[href="/benchmarks/#${b.id}"]`)) fail(`${p}: ${r.id} does not link ${b.id}`);
  }
  const fmt = (q) => `${{ approximate: 'about ', more_than: 'more than ' }[q.qualifier] ?? ''}${Number(q.value).toLocaleString('en-GB', { maximumFractionDigits: 2 })} ${q.unit}`;
  for (const q of atlas.quantities) {
    const card = d.getElementById(q.dataset_id);
    if (q.value !== null && !card?.textContent.includes(fmt(q))) fail(`${p}: ${q.id} (${fmt(q)}) is not in the ${q.dataset_id} passport`);
    if (q.scale && !q.part && q.value !== null) {
      const inApart = Boolean(d.querySelector(`#set-apart .sr-row[data-ds="${q.dataset_id}"]`)) && Boolean(d.querySelector(`#set-apart [data-group="${q.comparison_group}"]`));
      const inMain = Boolean(d.querySelector(`#scale .slane [data-group="${q.comparison_group}"] .sr-row[data-ds="${q.dataset_id}"]`));
      if (q.set_apart ? !inApart || inMain : !inMain) fail(`${p}: ${q.id} is drawn in the wrong place (set apart: ${q.set_apart ?? 'no'})`);
    }
  }
  const html = read('datasets/index.html');
  if (/docs\.google\.com|drive\.google\.com|spreadsheets\/d\//.test(html)) fail(`${p}: links a private Google file`);
  if (/\battachment\b|matrix row|classification_note|attachment_ref/i.test(html)) fail(`${p}: shows an internal editorial note`);
  if (!d.querySelector('script[src^="/assets/datasets.js?v="]') || !d.querySelector('link[href^="/assets/datasets.css?v="]') || !d.querySelector('link[href^="/assets/atlas.css?v="]')) fail(`${p}: atlas assets missing`);
}
if (failures.length) {
  console.error(`Public pages check FAILED (${failures.length}):\n- ${failures.slice(0, 40).join('\n- ')}`);
  process.exit(1);
}
console.log(`Public pages check passed: ${CATEGORIES.length} category pages, ${model.robots.length} humanoid, ${model.otherRobots.length} other-robot and ${model.companies.length} company pages readable without JavaScript, unique titles, descriptions and canonical URLs, links both ways, public values only, sitemap of ${locs.size} URLs, retired addresses redirect, 404 resolves robot ids.`);
// Attribute history, identity joins, comparison filtering and live freshness are part of page verification.
execFileSync(process.execPath,['--test','tools/test-verification-ui.mjs'],{cwd:root,stdio:'inherit'});
