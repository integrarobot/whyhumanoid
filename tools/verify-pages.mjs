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
import { SITE, buildPages } from './build-pages.mjs';

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
const pages = [...model.robots.map((r) => ['robot', r]), ...model.companies.map((c) => ['company', c])];
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
  if (!/Sources/.test(main)) fail(`${x.path}: no sources section`);
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
    for (const b of d.querySelectorAll('.dep header b')) if (!previewOrgs.has(b.textContent)) fail(`${x.path}: organisation "${b.textContent}" is not in the free preview`);
  } else {
    for (const rb of x.robotList) {
      if (!d.querySelector(`a[href="${rb.path}"]`)) fail(`${x.path}: no link to its robot ${rb.path}`);
      if (!doc(rb.path).querySelector(`a[href="${x.path}"]`)) fail(`${rb.path}: no link back to ${x.path}`);
    }
    if (!x.robotList.length && !previewOrgs.has(x.name) && !(x.names || []).some((n) => previewOrgs.has(n))) fail(`${x.path}: company is neither a catalogue maker nor in the free preview`);
  }
}
for (const idx of ['/robots/', '/companies/']) {
  const d = doc(idx);
  const n = d.querySelectorAll('tbody tr').length;
  const want = idx === '/robots/' ? model.robots.length : model.companies.length;
  if (n !== want) fail(`${idx}: lists ${n} of ${want}`);
  for (const a of d.querySelectorAll('a[href^="/"]')) if (!exists(a.getAttribute('href'))) fail(`${idx}: broken link ${a.getAttribute('href')}`);
}
const home = read('index.html');
if (!/href="\/robots\/"/.test(home) || !/href="\/companies\/"/.test(home)) fail('index.html: no static links to the robot and company pages');

// 4. Sitemap, redirects, 404.
const locs = new Set([...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const want = new Set([`${SITE}/`, `${SITE}/robots/`, `${SITE}/companies/`, ...pages.map(([, x]) => SITE + x.path)]);
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
console.log(`Public pages check passed: ${model.robots.length} robot and ${model.companies.length} company pages readable without JavaScript, unique titles, descriptions and canonical URLs, links both ways, public values only, sitemap of ${locs.size} URLs, retired addresses redirect, 404 resolves robot ids.`);
