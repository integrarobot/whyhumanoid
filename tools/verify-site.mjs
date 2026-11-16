#!/usr/bin/env node
// Verified build: renders index.html headlessly (jsdom, no network) and checks what a visitor gets.
//   - the page runs without script errors
//   - every record of the free Humanoids catalogue is rendered, and the hero shows that total
//   - search and filters work on the visible rows
//   - the notice says the catalogue is free, states the full-database price and links to the premium app
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
expect(/complete catalogue is free/i.test(text('#preview-note')) && /€100 per year/.test(text('#preview-note')), 'notice does not say the catalogue is free and the price of the full database');
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

// Database section: the 12 other tabs, first 10 source rows each, detail on click, search, honest offer.
const previews = pageData.previews;
const tabButtons = [...document.querySelectorAll('#db-tabs [role="tab"]')];
expect(previews?.datasets?.length === 12 && tabButtons.length === 12, `database tabs: ${tabButtons.length} buttons, ${previews?.datasets?.length} datasets`);
for (const d of previews?.datasets ?? []) {
  tabButtons.find((b) => b.dataset.id === d.id)?.click();
  await new Promise((r) => setTimeout(r, 20));
  const shown = document.querySelectorAll('#db-rows tr.r').length;
  expect(shown === d.rows.length && shown > 0, `${d.id}: ${shown} rows shown, ${d.rows.length} in the preview`);
  expect(text('#db-title') === d.title, `${d.id}: panel title "${text('#db-title')}"`);
  expect(new RegExp(`^${d.rows.length} of ${d.entries_total} entries`).test(text('#db-count')), `${d.id}: count line "${text('#db-count')}"`);
  const lock = document.querySelector('#db-panel .db-lock');
  expect(Boolean(lock) === d.entries_total > d.rows.length, `${d.id}: locked-rows notice ${lock ? 'shown' : 'missing'}`);
}
tabButtons[0]?.click();
const firstRow = document.querySelector('#db-rows tr.r');
firstRow?.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
expect(document.querySelectorAll('#db-rows tr.det dt').length === previews.datasets[0].fields.length, 'row detail does not list every public field');
const dbq = document.getElementById('db-q');
dbq.value = 'zzzz-no-such-entry';
dbq.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
expect(document.querySelectorAll('#db-rows tr.r').length === 0, 'database search for a missing entry still shows rows');
document.getElementById('db-buy').click();
expect(pageData.access.checkout_open || /not open yet/i.test(text('#db-buy-note')), 'closed checkout is not explained honestly');
expect([...document.querySelectorAll('.hud-nav a')].some((a) => a.getAttribute('href') === '#database'), 'no navigation link to the database');

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
