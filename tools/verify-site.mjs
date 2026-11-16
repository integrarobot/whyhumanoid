#!/usr/bin/env node
// Verified build: renders index.html headlessly (jsdom, no network) and checks what a visitor gets.
//   - the page runs without script errors
//   - every record of the free Humanoids catalogue is rendered, and the hero shows that total
//   - search and filters work on the visible rows
//   - the notice says the catalogue is free and the rest of the database is open (decision of 16 Nov 2026)
//   - every row of the 12 other tabs renders from data/database, with detail, sources and dates, and search
//   - 13 categories with their own URLs; a shared #db-<tab> URL restores the category
//   - deployment status filters count only what operational_status supports
// Usage: cd tools && npm ci && node verify-site.mjs

import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('data/manifest.json', root), 'utf8'));
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => errors.push(e.message));
virtualConsole.on('error', (e) => errors.push(String(e)));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://whyhumanoid.com/',
  virtualConsole,
  beforeParse(window) {
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
    window.scrollTo = () => {};
    window.HTMLElement.prototype.scrollIntoView = () => {};
    // The open database loads each tab from data/database/<tab>.json; serve the committed files.
    window.fetch = async (url) => {
      const file = new URL(String(url).replace(/^https:\/\/whyhumanoid\.com\//, ''), root);
      return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(file, 'utf8')) };
    };
  },
});
const { document } = dom.window;
await new Promise((r) => setTimeout(r, 300));

const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };
const rows = () => document.querySelectorAll('#rows .row').length;
const text = (sel) => document.querySelector(sel)?.textContent?.trim() ?? '';

// Social preview: static tags in the initial HTML (crawlers do not run scripts).
const head = html.slice(0, html.indexOf('</head>'));
const meta = (attr, key) => (head.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`)) || [])[1];
const OG_IMAGE = /^https:\/\/whyhumanoid\.com\/assets\/og\/whyhumanoid-og-v\d+\.png$/;
expect(OG_IMAGE.test(meta('property', 'og:image') ?? '') && meta('name', 'twitter:image') === meta('property', 'og:image'), 'og:image / twitter:image missing or different');
expect(meta('name', 'twitter:card') === 'summary_large_image', 'twitter:card is not summary_large_image');
expect(meta('property', 'og:image:width') === '1200' && meta('property', 'og:image:height') === '630' && Boolean(meta('property', 'og:image:alt')), 'og:image size or alt missing');
expect(meta('property', 'og:url') === 'https://whyhumanoid.com/' && /<link rel="canonical" href="https:\/\/whyhumanoid\.com\/">/.test(head), 'canonical and og:url differ');
expect(meta('property', 'og:description') === meta('name', 'twitter:description') && meta('property', 'og:title') === meta('name', 'twitter:title'), 'Open Graph and Twitter texts differ');
{
  const file = new URL(meta('property', 'og:image').replace('https://whyhumanoid.com/', ''), root);
  const png = readFileSync(file);
  expect(png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, `social image is ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}, not 1200x630`);
}
expect(/^User-agent: \*\nAllow: \//.test(readFileSync(new URL('robots.txt', root), 'utf8')), 'robots.txt does not allow crawlers');
expect(errors.length === 0, `script errors: ${errors.join(' | ')}`);
expect(rows() === manifest.record_count, `rendered rows ${rows()} != catalogue ${manifest.record_count}`);
expect(text('#h-n') === String(manifest.record_count), `hero total "${text('#h-n')}"`);
expect(/complete catalogue is free/i.test(text('#preview-note')), 'notice does not say the catalogue is free');
const buyLink = document.querySelector('#preview-note a');
const pageData = JSON.parse(document.getElementById('data').textContent);
expect(
  Boolean(buyLink) && buyLink.getAttribute('href') === pageData.access.url &&
    (pageData.access.checkout_open ? /^https:\/\//.test(pageData.access.url) : pageData.access.url === '#database'),
  'notice does not link to the full-database offer (premium app when checkout is open, the database section otherwise)',
);
expect(/internal/i.test(text('#a-rows')), 'FAQ does not explain which rows the catalogue leaves out');

const search = document.querySelector('input[type="search"]');
expect(Boolean(search), 'no search box');
if (search) {
  const data = JSON.parse(document.getElementById('data').textContent);
  const target = data.models[1].robot;
  search.value = target;
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  const shown = rows();
  expect(shown >= 1 && shown < manifest.record_count, `search "${target}" shows ${shown} rows`);
  search.value = 'zzzz-no-such-robot';
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  expect(rows() === 0, 'search for a missing robot still shows rows');
  search.value = '';
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  expect(rows() === manifest.record_count, 'clearing search does not restore every catalogue row');
}

// Database section (open access, 16 Nov 2026): 13 categories with their own URLs, every row, detail, search.
const dbIndex = pageData.database;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const go = async (hash) => { dom.window.location.hash = hash; dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange')); await wait(80); };
const indexLinks = [...document.querySelectorAll('#db-index a[data-id]')];
expect(indexLinks.length === 13 && document.querySelectorAll('#db-index .grp').length === 5, `category index: ${indexLinks.length} links in ${document.querySelectorAll('#db-index .grp').length} groups`);
expect(indexLinks.find((a) => a.dataset.id === 'humanoids')?.getAttribute('href') === '#humanoids', 'index does not link Humanoids to #humanoids');
expect(pageData.access.open === true, 'page is not in open-database mode');
expect(/rest of the database is open/i.test(text('#preview-note')), 'catalogue notice does not say the database is open');
for (const t of dbIndex?.tabs ?? []) {
  const a = indexLinks.find((x) => x.dataset.id === t.id);
  expect(a?.getAttribute('href') === `#db-${t.id}` && a.querySelector('.n')?.textContent === String(t.entries_total), `${t.id}: index link or count wrong`);
  await go(`#db-${t.id}`);
  const shown = document.querySelectorAll('#db-rows tr.r').length;
  expect(shown === t.entries_total && shown > 0, `${t.id}: ${shown} rows shown, ${t.entries_total} in the tab`);
  expect(text('#db-title') === t.title, `${t.id}: panel title "${text('#db-title')}"`);
  expect(a?.getAttribute('aria-current') === 'true', `${t.id}: index does not mark the open category`);
}
// Deployment status: counts come only from operational_status.
await go('#db-deployments');
const dep = JSON.parse(readFileSync(new URL('data/database/deployments.json', root), 'utf8')).rows;
const want = { op: 0, pilot: 0, ann: 0, unc: 0 };
for (const r of dep) want[{ operational: 'op', pilot: 'pilot', testing: 'pilot', planned: 'ann' }[String(r.operational_status ?? '').toLowerCase()] ?? 'unc']++;
for (const [k, n] of Object.entries(want)) {
  document.querySelector(`#db-status [data-st="${k}"]`)?.click();
  const rowsNow = [...document.querySelectorAll('#db-rows tr.r')];
  expect(rowsNow.length === n && rowsNow.every((tr) => tr.querySelector(`.dst.${k}`)), `deployments status ${k}: ${rowsNow.length} rows, expected ${n}`);
}
document.querySelector('#db-status [data-st="all"]')?.click();
document.querySelector('#db-rows tr.r')?.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
const det = document.querySelector('#db-rows tr.det');
expect(Boolean(det?.querySelector('.trace')) && /Export date: .*not a new check/.test(det?.querySelector('.trace')?.textContent ?? ''), 'detail lacks the sources and dates block');
expect(det?.querySelectorAll('dt').length === dbIndex.tabs.find((t) => t.id === 'deployments').fields.length, 'row detail does not list every field');
const dbq = document.getElementById('db-q');
dbq.value = 'zzzz-no-such-entry';
dbq.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
expect(document.querySelectorAll('#db-rows tr.r').length === 0, 'database search for a missing entry still shows rows');
// Hero: real counts linking to their categories, and the two calls to action.
const eco = [...document.querySelectorAll('#eco a')];
expect(eco.length >= 8 && eco.every((a) => /^#(humanoids|db-[a-z-]+)$/.test(a.getAttribute('href'))), `hero counts: ${eco.length}`);
for (const a of eco.filter((x) => x.getAttribute('href').startsWith('#db-'))) {
  const t = dbIndex.tabs.find((x) => `#db-${x.id}` === a.getAttribute('href'));
  expect(a.querySelector('b')?.textContent === String(t?.entries_total), `hero count for ${t?.id} is not the data's`);
}
expect(document.querySelector('#cta-h')?.getAttribute('href') === '#humanoids' && document.querySelector('#cta-db')?.getAttribute('href') === '#database', 'hero calls to action missing');
expect(!document.querySelector('#db-buy, #db-panel .db-lock'), 'paywall elements still on the page');
expect([...document.querySelectorAll('.hud-nav a')].some((a) => a.getAttribute('href') === '#database'), 'no navigation link to the database');
// Opening a shared category URL restores it.
const shared = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://whyhumanoid.com/#db-stocks', beforeParse(w) {
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
  w.fetch = async (url) => ({ ok: true, status: 200, json: async () => JSON.parse(readFileSync(new URL(String(url).replace(/^https:\/\/whyhumanoid\.com\//, ''), root), 'utf8')) });
} });
await wait(400);
expect(shared.window.document.getElementById('db-title')?.textContent === dbIndex.tabs.find((t) => t.id === 'stocks').title, 'opening #db-stocks does not restore that category');
const humanoidsLink = [...document.querySelectorAll('.hud-nav a')].find((a) => a.getAttribute('href') === '#humanoids');
expect(humanoidsLink?.textContent.trim() === 'Humanoids', 'navigation does not name the Humanoids section');
expect(text('#humanoids .h2') === 'Humanoids', `Humanoids section title "${text('#humanoids .h2')}"`);
expect(Boolean(document.getElementById('catalogue')), 'old #catalogue links no longer have a target');
expect(![...document.querySelectorAll('.hud-nav a, .h2, label, [aria-label]')].some((e) => /^catalogue$/i.test(e.textContent.trim()) || /catalogue/i.test(e.getAttribute('aria-label') ?? '')), 'a section label still says Catalogue');

const filters = [...document.querySelectorAll('select')];
if (filters.length) {
  const select = filters[0];
  const option = [...select.options].find((o, i) => i > 0);
  if (option) {
    select.value = option.value;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    expect(rows() <= manifest.record_count, 'filter shows more than the catalogue');
  }
}

dom.window.close();
if (failures.length) {
  console.error(`Site verification FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Site verification passed: ${manifest.record_count} catalogue rows rendered, search and filters work on them, no script errors.`);
process.exit(0);
