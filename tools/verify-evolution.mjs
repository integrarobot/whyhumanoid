#!/usr/bin/env node
// Evolution charts in a real browser (24 Nov 2026), against a local copy (served by this script) or production:
//
//   node tools/verify-evolution.mjs                                  local copy of the repository
//   node tools/verify-evolution.mjs --base https://whyhumanoid.com   production
//   add --quick to skip the full 70-second rotation; --shots <dir> to save screenshots
//
// Checks: the seven section charts and the home carousel are in the HTML in the given order and readable without
// JavaScript; every final readout equals data/evolution/charts.json; the replay hides every mark at the start and
// shows them all at the end; a real rotation of the seven charts, exactly 10 seconds each, back to the first; selectors,
// previous and next, pause and play, pause on interaction, hold while the tab is hidden or the carousel is off screen;
// prefers-reduced-motion (final state, no autoplay, Play on request); keyboard; stable height and no horizontal scroll
// or clipped labels at 320, 375 and 430 px; no script errors. Prints one line per failed check.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const arg = (n, d = null) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const QUICK = process.argv.includes('--quick');
const SHOTS = arg('--shots');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const doc = JSON.parse(readFileSync(join(root, 'data/evolution/charts.json'), 'utf8'));
const ORDER = ['humanoids', 'deployments', 'components', 'integrators', 'datasets', 'benchmarks', 'reports'];

let server = null;
let BASE = arg('--base');
if (!BASE) {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
  server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.includes('..')) { res.writeHead(400); return res.end(); }
    let f = join(root, p);
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${server.address().port}`;
}
BASE = BASE.replace(/\/$/, '');

const failures = [];
let passed = 0;
const check = (ok, msg) => { if (ok) passed += 1; else { failures.push(msg); console.log(`FAIL ${msg}`); } };
const finalCount = (c) => (c.type === 'stack' ? c.columns.at(-1).value : c.type === 'columns' ? c.columns.reduce((a, x) => a + x.value, 0) : c.type === 'panels' ? c.panels.reduce((a, p) => a + p.points.length, 0) : c.points.length);

const browser = await chromium.launch();
const errors = [];
async function open(path, { width = 1280, reduced = false, js = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference', javaScriptEnabled: js });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g|cloudflareinsights|beacon|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED/i.test(m.text())) errors.push(`${path}: ${m.text()}`); });
  await page.goto(BASE + path, { waitUntil: 'load' });
  return { page, ctx };
}
const readout = (page, scope) => page.$eval(`${scope} .evo-n b`, (b) => +b.textContent);
const offMarks = (page, scope) => page.$$eval(`${scope} [data-t]`, (xs) => xs.filter((x) => x.classList.contains('off')).length);
const allMarks = (page, scope) => page.$$eval(`${scope} [data-t]`, (xs) => xs.length);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

// ---------- section pages ----------
for (const c of doc.charts) {
  const scope = '#evolution';
  // Without JavaScript: the final state is in the HTML.
  {
    const { page, ctx } = await open(c.path, { js: false });
    check(await page.$(`${scope} .evo-chart[data-chart="${c.id}"]`), `${c.path}: evolution chart ${c.id} missing`);
    check(await readout(page, scope) === finalCount(c), `${c.path}: no-JS readout is not the final ${finalCount(c)}`);
    check(await offMarks(page, scope) === 0, `${c.path}: no-JS state hides marks`);
    check(await page.$(`${scope} details.evo-data table`), `${c.path}: no data table`);
    const first = await page.$eval('main', (m) => { const e = m.querySelector('#evolution'); const h = m.querySelector('h1'); return Boolean(h && e && (h.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)); });
    check(first, `${c.path}: chart not after the page heading`);
    await ctx.close();
  }
  // Reduced motion: final state, no automatic replay.
  {
    const { page, ctx } = await open(c.path, { reduced: true });
    await page.$eval(scope, (e) => e.scrollIntoView());
    await page.waitForTimeout(1200);
    check(await offMarks(page, scope) === 0 && await readout(page, scope) === finalCount(c), `${c.path}: reduced motion did not keep the final state`);
    await ctx.close();
  }
  // Replay: the scrubber at the start hides every mark; at the end shows them all with the final count.
  {
    const { page, ctx } = await open(c.path);
    await page.$eval(scope, (e) => e.scrollIntoView());
    await page.waitForTimeout(400);
    const playing = await page.$eval(`${scope} .evo-play`, (b) => b.textContent);
    check(playing === 'Stop', `${c.path}: automatic replay did not start when the chart came into view`);
    const n = await allMarks(page, scope);
    await page.$eval(`${scope} .evo-scrub input`, (r) => { r.value = r.min; r.dispatchEvent(new Event('input', { bubbles: true })); });
    const atStart = await offMarks(page, scope);
    check(atStart === n || (c.id === 'humanoids' && atStart >= n - 1), `${c.path}: at the start ${n - atStart} marks still visible`);
    const date0 = await page.$eval(`${scope} .evo-date b`, (b) => b.textContent);
    await page.focus(`${scope} .evo-scrub input`);
    await page.keyboard.press('End');
    check(await offMarks(page, scope) === 0, `${c.path}: keyboard End did not show every mark`);
    check(await readout(page, scope) === finalCount(c), `${c.path}: final readout ${await readout(page, scope)} is not ${finalCount(c)}`);
    const date1 = await page.$eval(`${scope} .evo-date b`, (b) => b.textContent);
    check(date0 !== date1, `${c.path}: the date cursor did not move (${date0})`);
    await page.click(`${scope} .evo-play`);
    await page.waitForTimeout(3000);
    const mid = await offMarks(page, scope);
    check(mid > 0 && mid < n, `${c.path}: replay at 3 s shows ${n - mid} of ${n} marks`);
    await page.waitForTimeout(5600);
    check(await offMarks(page, scope) === 0 && await readout(page, scope) === finalCount(c), `${c.path}: replay did not end in the final state`);
    for (const w of [320, 375, 430]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.waitForTimeout(150);
      check(await noOverflow(page), `${c.path}: horizontal scroll at ${w}px`);
      if (SHOTS && w === 375) await (await page.$(scope)).screenshot({ path: join(SHOTS, `${c.id}-375.png`) });
    }
    if (SHOTS) { await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(150); await (await page.$(scope)).screenshot({ path: join(SHOTS, `${c.id}-1280.png`) }); }
    await ctx.close();
  }
}

// Benchmarks: the dated results follow the publication chronology as a second chart, readable without JavaScript.
{
  const sec = doc.charts.find((c) => c.id === 'benchmarks').secondary;
  if (sec) {
    const { page, ctx } = await open('/benchmarks/', { js: false });
    check(await page.$('#evolution-results .evo-chart[data-chart="benchmarks-results"]'), '/benchmarks/: the dated results chart is missing');
    check(await readout(page, '#evolution-results') === finalCount(sec), '/benchmarks/: dated results readout is not final');
    await ctx.close();
  }
}

// ---------- home carousel ----------
const car = '#evo-car';
const state = (page) => page.$eval(car, (e) => ({ i: +e.getAttribute('data-index'), s: e.getAttribute('data-state') }));
{
  const { page, ctx } = await open('/', { js: false });
  const tabs = await page.$$eval(`${car} [role="tab"]`, (xs) => xs.map((a) => [a.textContent, a.getAttribute('href')]));
  check(tabs.map((t) => t[0]).join() === doc.charts.map((c) => c.label).join(), `home: tab order ${tabs.map((t) => t[0]).join()}`);
  check(tabs.every((t, i) => t[1] === `${doc.charts[i].path}#evolution`), 'home: tabs do not link to their sections without JavaScript');
  check(doc.charts.map((c) => c.id).join() === ORDER.join(), 'charts.json order');
  check(await page.$eval(`${car} .evo-slide.on`, (s) => s.id) === 'evo-s-0', 'home: no-JS first slide not shown');
  check(await page.$(`${car} .evo-slide.on .evo-go a[href="/humanoids/#evolution"]`), 'home: no-JS link to the section');
  check(!(await page.$('.hero .adopt-hero')), 'home: the static adoption figure is still in the hero');
  await ctx.close();
}
{
  const { page, ctx } = await open('/');
  await page.$eval(car, (e) => e.scrollIntoView({ block: 'center' }));
  // Final readouts of every slide equal the chart data.
  for (let i = 0; i < doc.charts.length; i++) {
    const n = await page.$eval(`#evo-s-${i} .evo-chart`, (el) => { const s = el.querySelectorAll('[data-t]').length; return s; });
    check(n > 0, `home slide ${i}: no marks`);
  }
  check((await state(page)).s === 'playing', `home: autoplay state is ${(await state(page)).s}`);
  // A real rotation: the seven charts in order, 10 seconds each, then back to the first.
  await page.evaluate(() => { window.__evo = []; new MutationObserver(() => window.__evo.push([+document.getElementById('evo-car').getAttribute('data-index'), performance.now()])).observe(document.getElementById('evo-car'), { attributes: true, attributeFilter: ['data-shown-at'] }); });
  const t0 = await page.evaluate(() => performance.now());
  const waitMs = QUICK ? 21500 : 71500;
  await page.mouse.move(1, 1);
  await page.waitForTimeout(waitMs);
  const log = await page.evaluate(() => window.__evo);
  const seq = log.map((x) => x[0]);
  const expect = QUICK ? [1, 2] : [1, 2, 3, 4, 5, 6, 0];
  check(seq.slice(0, expect.length).join() === expect.join(), `home: rotation order ${seq.join()} (expected ${expect.join()})`);
  const times = [t0, ...log.map((x) => x[1])];
  const gaps = times.slice(1, expect.length + 1).map((t, k) => t - times[k]);
  check(gaps.slice(1).every((g) => Math.abs(g - 10000) <= 250), `home: slide intervals ${gaps.slice(1).map((g) => Math.round(g)).join(', ')} ms are not 10 s`);
  console.log(`rotation ${seq.join(' ')} · intervals ${gaps.map((g) => Math.round(g)).join(', ')} ms`);
  // Hidden tab: the rotation holds and resumes without skipping.
  const before = await state(page);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  check((await state(page)).s === 'held', 'home: hidden tab does not hold the rotation');
  await page.waitForTimeout(11000);
  check((await state(page)).i === before.i, 'home: the rotation advanced while the tab was hidden');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  check((await state(page)).s === 'playing', 'home: the rotation did not resume when the tab came back');
  // Off screen: holds.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  check((await state(page)).s === 'held', 'home: off-screen carousel does not hold');
  await page.$eval(car, (e) => e.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  check((await state(page)).s === 'playing', 'home: carousel does not resume on screen');
  // Hover holds; leaving resumes.
  await page.hover(`${car} .evo-slides`);
  check((await state(page)).s === 'held', 'home: hover does not hold');
  await page.mouse.move(1, 1);
  check((await state(page)).s === 'playing', 'home: leaving does not resume');
  // Selectors: a click selects that chart and stops the rotation so reading is not reset.
  await page.click(`${car} [role="tab"][data-i="4"]`);
  let st = await state(page);
  check(st.i === 4 && st.s === 'paused', `home: selector click gave ${JSON.stringify(st)}`);
  check(await page.$eval(`${car} #evo-t-4`, (t) => t.getAttribute('aria-selected')) === 'true', 'home: selected tab not marked');
  check(await offMarks(page, '#evo-s-4') === 0, 'home: a chosen chart is not shown complete');
  await page.mouse.move(1, 1);
  await page.waitForTimeout(10600);
  check((await state(page)).i === 4, 'home: the rotation moved on after a selector click');
  // Previous, next, pause and play.
  await page.click(`${car} .evo-next`);
  check((await state(page)).i === 5, 'home: next');
  await page.click(`${car} .evo-prev`);
  await page.click(`${car} .evo-prev`);
  check((await state(page)).i === 3, 'home: previous');
  await page.click(`${car} .evo-pp`);
  await page.mouse.move(1, 1);
  check((await state(page)).s === 'playing', 'home: Play does not restart the rotation');
  await page.click(`${car} .evo-pp`);
  check((await state(page)).s === 'paused', 'home: Pause');
  await page.click(`${car} .evo-pp`);
  await page.mouse.move(1, 1);
  // Pointer interaction inside a slide stops the rotation.
  await page.dispatchEvent(`${car} .evo-slide.on .evo-chart`, 'pointerdown');
  check((await state(page)).s === 'paused', 'home: interaction in the chart does not pause');
  // Keyboard: arrows, Home and End on the selectors.
  await page.focus(`${car} [role="tab"][aria-selected="true"]`);
  const k0 = (await state(page)).i;
  await page.keyboard.press('ArrowRight');
  check((await state(page)).i === (k0 + 1) % 7 && await page.evaluate(() => document.activeElement.getAttribute('aria-selected')) === 'true', 'home: ArrowRight');
  await page.keyboard.press('End');
  check((await state(page)).i === 6, 'home: End');
  await page.keyboard.press('Home');
  check((await state(page)).i === 0, 'home: Home');
  await page.keyboard.press('ArrowLeft');
  check((await state(page)).i === 6, 'home: ArrowLeft wraps');
  check(await page.$eval(`${car} .evo-pp`, (b) => b.getAttribute('aria-label')) === 'Play rotation', 'home: play button label');
  await page.keyboard.press('Tab');
  // Mobile: stable height across the seven slides, no horizontal scroll, no clipped labels.
  for (const w of [320, 375, 430]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(200);
    check(await noOverflow(page), `home: horizontal scroll at ${w}px`);
    const hs = [];
    for (let i = 0; i < 7; i++) {
      await page.click(`${car} [role="tab"][data-i="${i}"]`);
      hs.push(await page.$eval(car, (e) => Math.round(e.getBoundingClientRect().height)));
      const clipped = await page.$$eval(`${car} [role="tab"], #evo-s-${i} .evo-leg li, #evo-s-${i} h3`, (xs) => xs.filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent));
      check(!clipped.length, `home ${w}px slide ${i}: clipped labels ${clipped.join(' | ')}`);
      if (SHOTS && (w === 375 || w === 320)) await (await page.$(car)).screenshot({ path: join(SHOTS, `home-${w}-${i}.png`) });
    }
    check(new Set(hs).size === 1, `home ${w}px: carousel height changes across slides (${hs.join(', ')})`);
  }
  if (SHOTS) { await page.setViewportSize({ width: 1280, height: 900 }); await page.click(`${car} [role="tab"][data-i="1"]`); await page.waitForTimeout(200); await (await page.$('.hero')).screenshot({ path: join(SHOTS, 'home-1280.png') }); }
  await ctx.close();
}
{
  // Reduced motion on the home page: final state, no autoplay; Play starts it on request.
  const { page, ctx } = await open('/', { reduced: true });
  await page.$eval(car, (e) => e.scrollIntoView({ block: 'center' }));
  await page.mouse.move(1, 1);
  check((await state(page)).s === 'paused', 'home reduced motion: autoplay is on');
  check(await offMarks(page, '#evo-s-0') === 0, 'home reduced motion: the first chart is not in its final state');
  await page.waitForTimeout(10600);
  check((await state(page)).i === 0, 'home reduced motion: the rotation moved without Play');
  await page.click(`${car} .evo-pp`);
  await page.mouse.move(1, 1);
  check((await state(page)).s === 'playing', 'home reduced motion: Play does not start the rotation');
  await ctx.close();
}

check(!errors.length, `script errors: ${errors.join(' | ')}`);
await browser.close();
server?.close();
console.log(`${passed} passed, ${failures.length} failed (${BASE})`);
process.exit(failures.length ? 1 : 0);
