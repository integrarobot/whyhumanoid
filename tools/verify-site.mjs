#!/usr/bin/env node
// Verified build: renders index.html headlessly (jsdom, no network) and checks what a visitor gets.
//   - the page runs without script errors
//   - exactly the preview rows are rendered (10), and the hero shows the full-database total
//   - search and filters work on the visible rows
//   - the preview notice states the price and links to the premium app
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
expect(rows() === manifest.preview_record_count, `rendered rows ${rows()} != preview ${manifest.preview_record_count}`);
expect(text('#h-n') === String(manifest.full_database.humanoid_records), `hero total "${text('#h-n')}"`);
expect(/€100 per year/.test(text('#preview-note')), 'preview notice missing the price');
const buyLink = document.querySelector('#preview-note a');
const pageData = JSON.parse(document.getElementById('data').textContent);
expect(Boolean(buyLink) && buyLink.getAttribute('href') === pageData.preview.url && /^https:\/\//.test(pageData.preview.url), 'preview notice has no link to the premium app');
expect(/free preview/i.test(text('#a-rows')), 'FAQ does not explain the preview');

const search = document.querySelector('input[type="search"]');
expect(Boolean(search), 'no search box');
if (search) {
  const data = JSON.parse(document.getElementById('data').textContent);
  const target = data.models[1].robot;
  search.value = target;
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  const shown = rows();
  expect(shown >= 1 && shown < manifest.preview_record_count, `search "${target}" shows ${shown} rows`);
  search.value = 'zzzz-no-such-robot';
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  expect(rows() === 0, 'search for a missing robot still shows rows');
  search.value = '';
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  expect(rows() === manifest.preview_record_count, 'clearing search does not restore the preview rows');
}

const filters = [...document.querySelectorAll('select')];
if (filters.length) {
  const select = filters[0];
  const option = [...select.options].find((o, i) => i > 0);
  if (option) {
    select.value = option.value;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    expect(rows() <= manifest.preview_record_count, 'filter shows more than the preview');
  }
}

dom.window.close();
if (failures.length) {
  console.error(`Site verification FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Site verification passed: ${manifest.preview_record_count} preview rows rendered, search and filters work on them, no script errors.`);
process.exit(0);
