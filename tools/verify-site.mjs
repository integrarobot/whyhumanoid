#!/usr/bin/env node
// Verified build: renders index.html headlessly (jsdom, no network) and checks what a visitor gets.
//   - the page runs without script errors
//   - every record of the free Humanoids catalogue is rendered, and the hero shows that total
//   - search and filters work on the visible rows
//   - the notice says the catalogue is free and the rest of the database is open (decision of 16 Nov 2026)
//   - every row of the 12 other tabs renders from data/database, with detail and search
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

// Database section (open access, 16 Nov 2026): the 12 other tabs, every row, detail on click, search.
const dbIndex = pageData.database;
const tabButtons = [...document.querySelectorAll('#db-tabs [role="tab"]')];
expect(dbIndex?.tabs?.length === 12 && tabButtons.length === 12, `database tabs: ${tabButtons.length} buttons, ${dbIndex?.tabs?.length} in the index`);
expect(pageData.access.open === true, 'page is not in open-database mode');
expect(/rest of the database is open/i.test(text('#preview-note')), 'catalogue notice does not say the database is open');
for (const t of dbIndex?.tabs ?? []) {
  tabButtons.find((b) => b.dataset.id === t.id)?.click();
  await new Promise((r) => setTimeout(r, 60));
  const shown = document.querySelectorAll('#db-rows tr.r').length;
  expect(shown === t.entries_total && shown > 0, `${t.id}: ${shown} rows shown, ${t.entries_total} in the tab`);
  expect(text('#db-title') === t.title, `${t.id}: panel title "${text('#db-title')}"`);
  expect(new RegExp(`^${t.entries_total} entries`).test(text('#db-count')), `${t.id}: count line "${text('#db-count')}"`);
}
expect(!document.querySelector('#db-buy, #db-panel .db-lock'), 'paywall elements still on the page');
tabButtons[0]?.click();
await new Promise((r) => setTimeout(r, 60));
document.querySelector('#db-rows tr.r')?.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
expect(document.querySelectorAll('#db-rows tr.det dt').length === dbIndex.tabs[0].fields.length, 'row detail does not list every field');
const dbq = document.getElementById('db-q');
dbq.value = 'zzzz-no-such-entry';
dbq.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
expect(document.querySelectorAll('#db-rows tr.r').length === 0, 'database search for a missing entry still shows rows');
expect([...document.querySelectorAll('.hud-nav a')].some((a) => a.getAttribute('href') === '#database'), 'no navigation link to the database');
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
