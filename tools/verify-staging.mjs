#!/usr/bin/env node
// Browser check of a staging (or production) deployment of the category structure and access matrix (23 Nov 2026).
//
//   node tools/verify-staging.mjs --base http://localhost:8788 [--local] [--shots <dir>]
//
// Checks, with a real browser (Playwright, Chromium), at desktop and phone width:
//   1. The ten categories load directly and on reload, in order in the navigation, with no horizontal scroll;
//      /humanoids (no slash) reaches /humanoids/; representative robot, company and other-robot pages load.
//   2. Old links: /robots/<slug>/ and /robots/ lead to /humanoids/...; old #db-<tab> links still open the panel.
//   3. Canonical URLs point at whyhumanoid.com; the sitemap lists the categories and no /robots/ address.
//   4. Exposure: no data/database files; Deployments and Components previews hold at most 10 rows; their API rows
//      answer 401 without a session; visitor search stays in the public scope.
//   5. With --local (server/scripts/staging-local.mjs): account states through the real API and signed test-mode
//      events: signed in without paying (403), active (200 for both), duplicate event (no change), cancelled at
//      period end (still 200), period ended (403), deletion (403).
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { CATEGORIES } from '../server/src/access/matrix.js';
import { robotPresentation } from './robot-presentation.mjs';

// Playwright from the project if installed, else the machine's preinstalled copy (NODE_PATH).
const { chromium } = createRequire(import.meta.url)('playwright');

const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const BASE = (arg('--base') ?? 'http://localhost:8788').replace(/\/$/, '');
const SHOTS = arg('--shots');
const LOCAL = process.argv.includes('--local');
const failures = [];
const ok = [];
const check = (cond, msg) => (cond ? ok.push(msg) : failures.push(msg));
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const SAMPLE = ['/reports/deployment-records/', '/reports/anthropic-what-work-can-robots-do-2026/', '/humanoids/agibot-x1-4/', '/companies/tesla/', '/companies/agility-robotics/', '/other-robots/realtime/', '/subscribe/', '/companies/', '/method/', '/reports/deployment-records/'];
for (const [label, viewport] of [['desktop', { width: 1366, height: 900 }], ['phone', { width: 375, height: 812 }]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const c of CATEGORIES) {
    const res = await page.goto(BASE + c.path, { waitUntil: 'domcontentloaded' });
    check(res.status() === 200, `${label} ${c.path}: direct load ${res.status()}`);
    const again = await page.reload({ waitUntil: 'domcontentloaded' });
    check(again.status() === 200, `${label} ${c.path}: reload ${again.status()}`);
    check((await page.textContent('h1'))?.trim() === c.label, `${label} ${c.path}: h1 is ${c.label}`);
    const nav = await page.$$eval('nav.cats a', (as) => as.map((a) => [a.textContent.trim(), a.getAttribute('href')]));
    check(JSON.stringify(nav) === JSON.stringify(CATEGORIES.map((x) => [x.label, x.path])), `${label} ${c.path}: navigation is the nine categories in order`);
    check((await page.$eval('link[rel=canonical]', (l) => l.href)) === `https://whyhumanoid.com${c.path}`, `${label} ${c.path}: canonical`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, `${label} ${c.path}: no horizontal page scroll (${overflow}px)`);
    if (SHOTS && ['/humanoids/', '/deployments/', '/components/', '/investment/'].includes(c.path)) await page.screenshot({ path: `${SHOTS}/${label}${c.path.replace(/\//g, '_')}.png` });
  }
  for (const p of SAMPLE) {
    const res = await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
    check(res.status() === 200, `${label} ${p}: ${res.status()}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, `${label} ${p}: no horizontal page scroll (${overflow}px)`);
  }
  const home = await page.goto(`${BASE}/`, { waitUntil: 'load' });
  check(home.status() === 200, `${label} home ${home.status()}`);
  const homeNav = await page.$$eval('.hud-nav a', (as) => as.map((a) => a.getAttribute('href')));
  check(JSON.stringify(homeNav) === JSON.stringify(CATEGORIES.map((x) => x.path)), `${label} home: navigation is the ten categories`);
  // Find first (23 Nov 2026): search and the primary action come before the statistics and sit in the first viewport
  // on phones; every category is reachable without sideways discovery: inline when the bar fits, else an explicit menu.
  const hero = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const nav = document.getElementById('cat-menu'), btn = document.getElementById('cat-toggle');
    return { search: r('.search .field').bottom, primary: r('#cta-h').bottom, eco: r('#eco').top, vh: innerHeight,
      menu: !btn.hidden, fits: nav.scrollWidth <= nav.clientWidth + 1 };
  });
  check(hero.search < hero.eco && hero.primary < hero.eco, `${label} home: search and the primary action come before the statistics`);
  if (label === 'phone') check(hero.search <= hero.vh && hero.primary <= hero.vh, `${label} home: search and the primary action are in the first viewport (${Math.round(hero.search)}, ${Math.round(hero.primary)} of ${hero.vh}px)`);
  check(hero.menu || hero.fits, `${label} home: all ten categories fit the bar or sit behind the Categories menu`);
  if (hero.menu) {
    await page.focus('#cat-toggle');
    await page.keyboard.press('Enter');
    const open = await page.evaluate(() => ({ expanded: document.getElementById('cat-toggle').getAttribute('aria-expanded'),
      links: [...document.querySelectorAll('#cat-menu a')].filter((a) => { const b = a.getBoundingClientRect(); return b.height >= 44 && b.left >= 0 && b.right <= innerWidth + 1; }).map((a) => a.getAttribute('href')) }));
    check(open.expanded === 'true' && JSON.stringify(open.links) === JSON.stringify(CATEGORIES.map((x) => x.path)), `${label} home: the Categories menu opens by keyboard and shows all ten links, 44px or taller`);
    await page.keyboard.press('Tab');
    check(await page.evaluate(() => document.activeElement.getAttribute('href')) === CATEGORIES[0].path, `${label} home: Tab moves from the menu button into the first category`);
    await page.keyboard.press('Escape');
    check(await page.evaluate(() => document.getElementById('cat-toggle').getAttribute('aria-expanded') === 'false' && document.activeElement.id === 'cat-toggle'), `${label} home: Escape closes the menu and returns focus to its button`);
    if (SHOTS) { await page.click('#cat-toggle'); await page.screenshot({ path: `${SHOTS}/${label}_home_menu.png` }); await page.keyboard.press('Escape'); }
  }
  check((await page.$$('#categories .catgrid li')).length === CATEGORIES.length, `${label} home: categories block has ${CATEGORIES.length} entries`);
  const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(homeOverflow <= 1, `${label} home: no horizontal page scroll (${homeOverflow}px)`);
  if (SHOTS) {
    await page.screenshot({ path: `${SHOTS}/${label}_home.png` });
    await page.locator('#categories').screenshot({ path: `${SHOTS}/${label}_home_categories.png` });
  }
  // NEO (23 Nov 2026), the first robot with a reviewed presentation: display name, full-body cutout shown whole with its
  // proportions (contain), and the outbound order link to 1X.
  await page.goto(`${BASE}/humanoids/1x-neo-home-robot-1/`, { waitUntil: 'networkidle' });
  const neo = await page.evaluate(() => {
    const img = document.querySelector('.robot-figure img'), a = document.querySelector('a.order-btn');
    if (!img || !a) return null;
    const r = img.getBoundingClientRect(), ar = a.getBoundingClientRect();
    return { h1: document.querySelector('h1').firstChild.textContent.trim(), loaded: img.complete && img.naturalWidth > 0, webp: /\.webp$/.test(img.currentSrc),
      ratio: r.width / r.height, natural: img.naturalWidth / img.naturalHeight, inside: r.left >= 0 && r.right <= innerWidth + 1, h: r.height,
      href: a.getAttribute('href'), target: a.target, rel: a.rel, ah: ar.height, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  check(Boolean(neo), `${label} NEO page: image and order link present`);
  if (neo) {
    check(neo.h1 === 'NEO', `${label} NEO page: heading is the display name (${neo.h1})`);
    check(neo.loaded && neo.webp, `${label} NEO page: the WebP cutout loads`);
    check(Math.abs(neo.ratio - neo.natural) < 0.01 && neo.inside && neo.h >= 300, `${label} NEO page: full body shown whole, proportions kept (${neo.ratio.toFixed(3)} vs ${neo.natural.toFixed(3)}, ${Math.round(neo.h)}px tall)`);
    check(neo.href === 'https://www.1x.tech/order' && neo.target === '_blank' && /noopener/.test(neo.rel) && neo.ah >= 44, `${label} NEO page: Buy NEO links to 1X's order page, 44px tall`);
    check(neo.overflow <= 1, `${label} NEO page: no horizontal page scroll (${neo.overflow}px)`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}_neo.png` });
  }
  // Every robot with a reviewed full-body image (tools/robot-presentation.json): it loads, is shown whole at its own
  // proportions (contain) inside the viewport, and the page does not scroll sideways.
  const robotPaths = JSON.parse(readFileSync(new URL('../data/pages.json', import.meta.url), 'utf8')).robots;
  for (const [id, pr] of robotPresentation()) {
    if (!pr.image) continue;
    await page.goto(`${BASE}${robotPaths[id]}`, { waitUntil: 'networkidle' });
    const r = await page.evaluate(() => {
      const img = document.querySelector('.robot-figure img'); if (!img) return null;
      const b = img.getBoundingClientRect();
      return { loaded: img.complete && img.naturalWidth > 0, ratio: b.width / b.height, natural: img.naturalWidth / img.naturalHeight, inside: b.left >= 0 && b.right <= innerWidth + 1, h: b.height, alt: img.alt, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    check(r && r.loaded && r.alt === pr.image.alt, `${label} robot ${id}: full-body image loads with its alt text`);
    if (r) check(Math.abs(r.ratio - r.natural) < 0.01 && r.inside && r.h >= 300 && r.overflow <= 1, `${label} robot ${id}: shown whole, proportions kept, no sideways scroll (${r.ratio.toFixed(3)} vs ${r.natural.toFixed(3)}, ${Math.round(r.h)}px)`);
  }
  // Adoption view (23 Nov 2026): the hero answers at a glance; the explorer filters and opens a case.
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  check(await page.isVisible('.hero .adopt-hero .stage-bars'), `${label} home: adoption view in the hero`);
  // Spacing Javier asked for (23 Nov 2026): the hero breathes; measured, not eyeballed.
  const sp = await page.$eval('.hero .adopt-hero', (hero) => {
    const r = (s) => hero.querySelector(s).getBoundingClientRect();
    const pad = (s, side) => parseFloat(getComputedStyle(hero.querySelector(s))[`padding${side}`]);
    const li = [...hero.querySelectorAll('.stage-bars li')].map((e) => e.getBoundingClientRect());
    const cs = [...hero.querySelectorAll('.case')].map((e) => e.getBoundingClientRect());
    const rowGap = Math.min(...li.slice(1).map((x, i) => x.top - li[i].bottom));
    const sameRow = cs.slice(1).map((x, i) => [cs[i], x]).filter(([a, b]) => Math.abs(a.top - b.top) < 2);
    const nextRow = cs.slice(1).map((x, i) => [cs[i], x]).filter(([a, b]) => b.top > a.bottom - 1);
    const clipped = [...hero.querySelectorAll('.case .o, .case .r')].filter((e) => e.scrollHeight > e.clientHeight + 1).length;
    return {
      side: pad('.adopt-lede', 'Left'), barsTop: pad('.stage-bars', 'Top'), opTop: pad('.adopt-op', 'Top'), goTop: pad('.adopt-go', 'Top'), goBottom: pad('.adopt-go', 'Bottom'),
      rowGap, caseGapX: sameRow.length ? Math.min(...sameRow.map(([a, b]) => b.left - a.right)) : 99, caseGapY: nextRow.length ? Math.min(...nextRow.map(([a, b]) => b.top - a.bottom)) : 99,
      casePad: pad('.case', 'Top'), casePadL: pad('.case', 'Left'), caseInner: parseFloat(getComputedStyle(hero.querySelector('.case')).rowGap), clipped,
    };
  });
  check(sp.side >= 20 && sp.barsTop >= 20 && sp.opTop >= 24 && sp.goTop >= 20 && sp.goBottom >= 20, `${label} home: adoption hero spacing between summary, bars, cases, button and note (${JSON.stringify([sp.side, sp.barsTop, sp.opTop, sp.goTop, sp.goBottom])})`);
  check(sp.rowGap >= 12, `${label} home: adoption bar rows are apart (${sp.rowGap}px)`);
  check(sp.caseGapX >= 8 && sp.caseGapY >= 8 && sp.casePad >= 8 && sp.casePadL >= 12 && sp.caseInner >= 4, `${label} home: adoption case cards have room (${JSON.stringify([sp.caseGapX, sp.caseGapY, sp.casePad, sp.casePadL, sp.caseInner])})`);
  check(sp.clipped === 0, `${label} home: no organisation or maker name is cut short in the hero (${sp.clipped})`);
  const auto = await page.$('#adoption .adopt-filters button[data-fam="automotive"]');
  if (auto) {
    await auto.click();
    const n = await page.$$eval('#adoption .case:not(.off)', (xs) => xs.length);
    check(n > 0 && n < 71, `${label} home: sector filter narrows the cases (${n})`);
    const first = await page.$('#adoption .rung[open] .case:not(.off)');
    if (first) {
      await first.click();
      check(await page.isVisible('#adopt-detail'), `${label} home: choosing a case opens its details`);
      const d = await page.$eval('#adopt-detail', (el) => {
        const dt = [...el.querySelectorAll('dt')].find((x) => /robot as recorded/i.test(x.textContent));
        return { pad: parseFloat(getComputedStyle(el).paddingLeft), robot: dt?.nextElementSibling?.textContent ?? '' };
      });
      check(d.pad >= 16, `${label} home: the case details keep their inner padding (${d.pad}px)`);
      check(d.robot && !/\b([\w-]+) \1\b/i.test(d.robot), `${label} home: the robot is not named with its maker twice ("${d.robot}")`);
    }
  } else check(false, `${label} home: adoption filters missing`);
  // Paywall notice of the database panel (regression of 23 Nov 2026: a bare .lock rule shrank it to a 28 px column).
  // For every tab with a subscription remainder: below the table and outside its horizontal scroll, at least 90% of
  // the panel's width, the call to action on one line with a 44 px touch target.
  for (const tab of ['deployments', 'hardware', 'evidence-links', 'entities', 'container-handling', 'data-space']) {
    await page.goto(`${BASE}/#db-${tab}`, { waitUntil: 'load' });
    await page.waitForSelector('#db-more .db-buy', { timeout: 5000 }).catch(() => {});
    const m = await page.evaluate(() => {
      const more = document.getElementById('db-more'); const panel = document.getElementById('db-panel'); const a = more?.querySelector('.db-buy');
      if (!more || !a) return null;
      const r = more.getBoundingClientRect(), pr = panel.getBoundingClientRect(), ar = a.getBoundingClientRect();
      return { ratio: r.width / pr.width, h: r.height, inScroll: Boolean(more.closest('.db-scroll')), aw: ar.width, ah: ar.height, aLines: a.scrollWidth <= a.clientWidth + 1 && ar.height < 64, inTable: Boolean(document.querySelector('#db-rows tr.lock')) };
    });
    check(m && m.ratio >= 0.9 && !m.inScroll && !m.inTable, `${label} #db-${tab}: notice spans the panel outside the table scroll (${m && m.ratio.toFixed(2)})`);
    check(m && m.ah >= 44 && m.aw >= 44 && m.aLines, `${label} #db-${tab}: call to action on one line, touch target ${m && Math.round(m.aw)}x${m && Math.round(m.ah)}`);
    check(m && m.h < 400, `${label} #db-${tab}: notice height ${m && Math.round(m.h)} px`);
  }
  // Old links.
  await page.goto(`${BASE}/robots/agibot-x1-4/`, { waitUntil: 'load' });
  await page.waitForURL(/\/humanoids\/agibot-x1-4\/$/, { timeout: 5000 }).catch(() => {});
  check(page.url().endsWith('/humanoids/agibot-x1-4/'), `${label} /robots/agibot-x1-4/ redirects to /humanoids/agibot-x1-4/ (${page.url()})`);
  await page.goto(`${BASE}/robots/`, { waitUntil: 'load' });
  await page.waitForURL(/\/humanoids\/$/, { timeout: 5000 }).catch(() => {});
  check(page.url().endsWith('/humanoids/'), `${label} /robots/ redirects to /humanoids/`);
  await page.goto(`${BASE}/#db-stocks`, { waitUntil: 'load' });
  await page.waitForSelector('#db-title', { timeout: 5000 }).catch(() => {});
  check(/Investment/.test((await page.textContent('#db-title').catch(() => '')) ?? ''), `${label} old link /#db-stocks still opens the panel`);
  const noslash = await page.goto(`${BASE}/humanoids`, { waitUntil: 'domcontentloaded' });
  check(noslash.status() === 200 && page.url().endsWith('/humanoids/'), `${label} /humanoids reaches /humanoids/`);
  check(errors.length === 0, `${label}: no script errors (${errors.slice(0, 2).join(' | ')})`);
  await ctx.close();
}
await browser.close();

// Exposure and sitemap over HTTP.
// The API is on the same origin in staging; in production it is the Worker (--api https://whyhumanoid-premium.javier-198.workers.dev).
const API = (arg('--api') ?? BASE).replace(/\/$/, '');
const get = (p, init) => fetch((p.startsWith('/v1/') || p.startsWith('/dev/') ? API : BASE) + p, init);
const sitemap = await (await get('/sitemap.xml')).text();
for (const c of CATEGORIES) check(sitemap.includes(`<loc>https://whyhumanoid.com${c.path}</loc>`), `sitemap lists ${c.path}`);
check(!sitemap.includes('https://whyhumanoid.com/robots/'), 'sitemap lists no /robots/ redirect');
check((await get('/data/database/deployments.json')).status === 404, 'no data/database files');
for (const id of ['deployments', 'hardware']) {
  const rows = (await (await get(`/data/preview/${id}.json`)).json()).rows;
  check(rows.every((r) => r._row <= 10) && rows.length <= 10, `${id}: public file holds at most the first 10 rows`);
  check((await get(`/v1/datasets/${id}`)).status === 401, `${id}: full rows 401 without a session`);
}
check((await get('/v1/datasets/stocks')).status === 200, 'investment: free rows answer without a session');
check((await (await get('/v1/search?q=hardware')).json()).scope === 'preview', 'visitor search stays in the public scope');

if (LOCAL) {
  const RUN = Date.now();
  const email = `review-${RUN}@example.com`;
  await get('/v1/auth/magic-link', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
  const token = (await (await get(`/dev/magic?email=${encodeURIComponent(email)}`)).text()).split('#login=')[1];
  const session = (await (await get('/v1/auth/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })).json()).token;
  const auth = { headers: { authorization: `Bearer ${session}` } };
  const state = async () => [(await get('/v1/datasets/deployments', auth)).status, (await get('/v1/datasets/hardware', auth)).status];
  const event = (b) => get('/dev/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, ...b }) }).then((r) => r.json());
  check(JSON.stringify(await state()) === '[403,403]', 'signed in, not paid: Deployments and Components 403');
  check((await get('/v1/billing/checkout', { method: 'POST', ...auth })).status === 200, 'checkout session created (simulated test mode, nothing charged)');
  const now = Math.floor(Date.now() / 1000);
  check((await event({ id: `evt_${RUN}_s1`, type: 'customer.subscription.created', status: 'active', period_end: now + 365 * 86400 })).outcome === 'entitlement_updated', 'signed test-mode event: subscription active');
  check(JSON.stringify(await state()) === '[200,200]', 'active: Deployments and Components 200 with one subscription');
  check((await event({ id: `evt_${RUN}_s1`, type: 'customer.subscription.created', status: 'active', period_end: now + 365 * 86400 })).duplicate === true, 'duplicate delivery recognised and not applied twice');
  await event({ id: `evt_${RUN}_s2`, status: 'active', cancel_at_period_end: true, period_end: now + 365 * 86400 });
  check(JSON.stringify(await state()) === '[200,200]', 'cancelled at period end: still open until the paid year ends');
  await event({ id: `evt_${RUN}_s3`, status: 'active', cancel_at_period_end: true, period_end: now - 1 });
  check(JSON.stringify(await state()) === '[403,403]', 'paid period ended: closed before any deletion event');
  await event({ id: `evt_${RUN}_s4`, type: 'customer.subscription.deleted', status: 'canceled', period_end: now - 1 });
  check(JSON.stringify(await state()) === '[403,403]', 'deletion: closed');
  check((await get('/v1/datasets/humanoids', auth)).status === 200, 'Humanoids stays free for the same account');
}

for (const m of failures) console.error(`FAIL ${m}`);
console.log(`${failures.length ? 'Staging check FAILED' : 'Staging check passed'}: ${ok.length} passed, ${failures.length} failed (${BASE})`);
process.exit(failures.length ? 1 : 0);
