#!/usr/bin/env node
// Verified build: renders index.html headlessly (jsdom, no network) and checks what a visitor gets.
//   - the page runs without script errors
//   - every record of the free Humanoids catalogue is rendered, and the hero shows that total
//   - search and filters work on the visible rows
//   - the notice says the catalogue is free and the rest of the database is open (decision of 16 Nov 2026)
//   - paywall: the 12 other tabs show only their first 10 sheet rows (data/preview) and link to the full database;
//     every preview row's card (View all data) shows every field and value in full, with sources and dates
//   - 13 categories with their own URLs; a shared #db-<tab> URL restores the category
//   - deployment status filters count only what operational_status supports
// Usage: cd tools && npm ci && node verify-site.mjs

import { existsSync, readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('data/manifest.json', root), 'utf8'));
const errors = [];
const fetched = [];
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
    // The database section loads each tab's free preview from data/preview/<tab>.json; serve the committed files.
    window.fetch = async (url) => {
      fetched.push(String(url));
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
  Boolean(buyLink) && buyLink.getAttribute('href') === pageData.access.url && pageData.access.url === pageData.access.app_url && /^https:\/\//.test(pageData.access.url),
  'notice does not link to the full database in the premium app',
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
expect(pageData.access.open === false, 'page is not in paywall mode');
expect(/subscription adds complete Deployments and complete Components/i.test(text('#preview-note')) && document.querySelector('#preview-note a')?.getAttribute('href') === pageData.access.app_url, 'catalogue notice does not offer the subscription');
for (const t of dbIndex?.tabs ?? []) {
  const a = indexLinks.find((x) => x.dataset.id === t.id);
  expect(a?.getAttribute('href') === `#db-${t.id}` && a.querySelector('.n')?.textContent === String(t.entries_total), `${t.id}: index link or count wrong`);
  await go(`#db-${t.id}`);
  const shown = document.querySelectorAll('#db-rows tr.r').length;
  expect(shown === t.preview_entries && shown > 0, `${t.id}: ${shown} rows shown, preview has ${t.preview_entries}`);
  const lock = document.querySelector('#db-more a.db-buy');
  expect(t.entries_total > t.preview_entries ? t.access === 'subscription' && lock?.getAttribute('href') === '/subscribe/' : !lock, `${t.id}: link to the subscription missing or wrong`);
  expect(text('#db-title') === t.title, `${t.id}: panel title "${text('#db-title')}"`);
  expect(a?.getAttribute('aria-current') === 'true', `${t.id}: index does not mark the open category`);
}
// Deployment status: counts come only from operational_status.
await go('#db-deployments');
const dep = JSON.parse(readFileSync(new URL('data/preview/deployments.json', root), 'utf8')).rows;
const want = { op: 0, pilot: 0, ann: 0, unc: 0 };
for (const r of dep) want[{ operational: 'op', pilot: 'pilot', testing: 'pilot', planned: 'ann' }[String(r.operational_status ?? '').toLowerCase()] ?? 'unc']++;
for (const [k, n] of Object.entries(want)) {
  document.querySelector(`#db-status [data-st="${k}"]`)?.click();
  const rowsNow = [...document.querySelectorAll('#db-rows tr.r')];
  expect(rowsNow.length === n && rowsNow.every((tr) => tr.querySelector(`.dst.${k}`)), `deployments status ${k}: ${rowsNow.length} rows, expected ${n}`);
}
document.querySelector('#db-status [data-st="all"]')?.click();
// Record cards (View all data): for EVERY preview row of EVERY tab, the card lists every declared field once and shows
// each value in full, exactly as in data/preview; URLs are full links. Full rows are premium (premium app).
let cardsChecked = 0, valuesChecked = 0, linksChecked = 0;
for (const t of dbIndex.tabs) {
  await go(`#db-${t.id}`);
  const data = JSON.parse(readFileSync(new URL(`data/preview/${t.id}.json`, root), 'utf8')).rows;
  const trs = [...document.querySelectorAll('#db-rows tr.r')];
  expect(trs.length === data.length && trs.every((tr) => tr.querySelector('button.db-open')?.textContent === 'View all data'), `${t.id}: not every row has a View all data button`);
  for (let i = 0; i < trs.length; i++) {
    trs[i].querySelector('button.db-open').click();
    const card = document.getElementById('db-dlg');
    if (!card?.hasAttribute('open')) { failures.push(`${t.id} row ${i + 1}: View all data does not open the card`); break; }
    const r = data[+trs[i].dataset.i];
    const dds = [...card.querySelectorAll('#db-dlg-body dd[data-f]')];
    const fieldsShown = dds.map((d) => d.dataset.f);
    if (fieldsShown.length !== t.fields.length || new Set(fieldsShown).size !== t.fields.length || t.fields.some((f) => !fieldsShown.includes(f))) failures.push(`${t.id} row ${r._row}: card shows ${fieldsShown.length} of ${t.fields.length} fields`);
    for (const dd of dds) {
      const v = r[dd.dataset.f];
      const has = v !== null && v !== undefined && String(v).trim() !== '';
      // A field the row does not publish (listed companies beyond row 10, approved split phase 3) says where it is.
      const nil = dd.dataset.f in r ? 'Empty in the sheet' : t.access === 'free' ? 'Free, in the next public export' : 'With the subscription';
      if (has ? dd.textContent !== String(v) : !(dd.classList.contains('nil') && dd.textContent === nil)) failures.push(`${t.id} row ${r._row} ${dd.dataset.f}: card shows "${dd.textContent.slice(0, 60)}"`);
      if (has) valuesChecked++;
      for (const u of String(has ? v : '').match(/https?:\/\/[^\s<]+/g) ?? []) {
        const clean = u.replace(/(["]|[.,;:!?\]]|\))+$/, (m) => (m === ')' && u.includes('(') ? m : ''));
        if (![...dd.querySelectorAll('a')].some((a) => a.getAttribute('href') === clean && a.textContent === clean)) failures.push(`${t.id} row ${r._row} ${dd.dataset.f}: URL is not a full link: ${clean}`);
        linksChecked++;
      }
    }
    expect(Boolean(card.querySelector('.trace')) && /Export date: .*not a new check/.test(card.querySelector('.trace')?.textContent ?? ''), `${t.id} row ${r._row}: card lacks the sources and dates block`);
    card.querySelector('#db-dlg-close').click();
    cardsChecked++;
    if (failures.length > 40) break;
  }
}
const totalRows = dbIndex.tabs.reduce((n, t) => n + t.preview_entries, 0);
expect(cardsChecked === totalRows, `record cards checked: ${cardsChecked} of ${totalRows}`);
// Deployments: the summary table shows status, organization, task, site, result and source for business readers.
await go('#db-deployments');
const depHead = [...document.querySelectorAll('#db-panel thead th')].map((th) => th.textContent);
expect(JSON.stringify(depHead) === JSON.stringify(['Row', 'Status', 'Record', 'Organization and robot', 'Task', 'Site', 'Result or metric', 'Source']), `deployments table columns: ${depHead.join(', ')}`);
expect(/View all data/.test(text('#db-panel .db-hint')), 'deployments panel does not explain View all data');
const lastBtn = [...document.querySelectorAll('#db-rows button.db-open')].pop();
lastBtn?.click();
const depPreview = dbIndex.tabs.find((t) => t.id === 'deployments').preview_entries;
expect(document.getElementById('db-dlg-next')?.disabled === true && text('#db-dlg-pos') === `Record ${depPreview} of ${depPreview}`, 'last deployment card: navigation wrong');
document.getElementById('db-dlg-prev')?.click();
expect(text('#db-dlg-pos') === `Record ${depPreview - 1} of ${depPreview}`, 'previous record does not move back');
// Paywall: the page never asks for full rows.
expect(fetched.length > 0 && fetched.every((u) => /^data\/preview\/[a-z-]+\.json$/.test(u)), `page fetched something other than the previews: ${fetched.filter((u) => !/^data\/preview\//.test(u)).join(', ')}`);
document.getElementById('db-dlg-close')?.click();
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
expect(document.querySelector('#cta-h')?.getAttribute('href') === '#humanoids' && document.querySelector('#cta-db')?.getAttribute('href') === '#categories', 'hero calls to action missing');
expect(!document.querySelector('#db-buy, #db-panel .db-lock'), 'paywall elements still on the page');
// Adoption view (23 Nov 2026): replaces the Height × mass chart; built from the public projection only.
{
  const proj = JSON.parse(readFileSync(new URL('data/public/projection.json', root), 'utf8'));
  const cases = proj.cases;
  expect(!document.getElementById('cuerpos') && !document.getElementById('bc'), 'the Height × mass chart is still in the hero');
  expect(Boolean(document.querySelector('.hero .adopt-hero')), 'adoption view missing from the hero');
  const op = cases.filter((c) => c.stage === 'op').length;
  expect(new RegExp(`^${op} of ${cases.length} recorded deployment cases`).test(text('.adopt-lede')), `hero sentence does not match the projection (${op} of ${cases.length})`);
  const chips = [...document.querySelectorAll('#adoption .case')];
  expect(chips.length === cases.length && new Set(chips.map((a) => a.dataset.case)).size === cases.length, `explorer shows ${chips.length} marks for ${cases.length} cases`);
  for (const stage of ['op', 'pilot', 'unc', 'ann']) expect(document.querySelectorAll(`#adoption .r-${stage} .case`).length === cases.filter((c) => c.stage === stage).length, `stage ${stage}: marks differ from the projection`);
  for (const a of chips) { const h = a.getAttribute('href'); expect(h === '/deployments/' || existsSync(new URL(`${h.slice(1)}index.html`, root)), `case links to a missing page ${h}`); }
  const data = JSON.parse(document.getElementById('adoption-data').textContent);
  const KEYS = new Set(['stage', 'status', 'records', 'org', 'orgPath', 'maker', 'makerPath', 'robot', 'robotPath', 'family', 'sector', 'fam', 'countries', 'years']);
  expect(data.every((c) => Object.keys(c).every((k) => KEYS.has(k))), 'adoption data holds a key outside the public list');
  expect(!/site_name|task_description|claim_text|metric_value|source_url|verification_status|evidence_level|fx_|rec_|dep_/.test(JSON.stringify(data)), 'adoption data holds a reserved field or an id');
  expect(document.querySelectorAll('#adoption .adopt-table tbody tr').length === cases.length, 'adoption table view does not list every case');
  const doubled = data.filter((c) => c.robot && /\b([\w-]+) \1\b/i.test(c.robot)).map((c) => c.robot);
  expect(!doubled.length, `adoption: robot named with its maker twice: ${doubled.join(', ')}`);
}
// Navigation (23 Nov 2026): the nine confirmed categories, in order, each at its own address.
const { CATEGORIES } = await import('../server/src/access/matrix.js');
const navLinks = [...document.querySelectorAll('.hud-nav a')];
expect(JSON.stringify(navLinks.map((a) => [a.textContent.trim(), a.getAttribute('href')])) === JSON.stringify(CATEGORIES.map((c) => [c.label, c.path])), `navigation is not the nine categories in order: ${navLinks.map((a) => a.textContent.trim()).join(', ')}`);
expect([...document.querySelectorAll('#categories .catgrid a')].map((a) => a.getAttribute('href')).join() === CATEGORIES.map((c) => c.path).join(), 'home page categories block is not the nine categories in order');
expect([...document.querySelectorAll('a')].some((a) => a.getAttribute('href') === '#database'), 'no link to the database section');
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
const humanoidsLink = [...document.querySelectorAll('.hud-nav a')].find((a) => a.getAttribute('href') === '/humanoids/');
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
console.log(`Site verification passed: ${manifest.record_count} catalogue rows rendered, search and filters work on them, ${cardsChecked} preview cards with every field (${valuesChecked} values, ${linksChecked} links) match data/preview, only previews fetched, no script errors.`);
process.exit(0);
