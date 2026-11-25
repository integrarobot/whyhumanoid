#!/usr/bin/env node
// Mobile and responsive check in a real browser (Playwright), read-only: it only loads public pages.
//   node tools/verify-mobile.mjs [--base https://whyhumanoid.com] [--shots <dir>]
// Find first (Javier, 23 and 25 Nov 2026):
//   - home: title, intro, search, the primary browse action, search-all and quick picks come before the two paths and
//     the statistics; on phones the search field and the primary action sit in the first viewport (320 x 640: the
//     search field at least);
//   - every page header (home and generated pages): all ten categories in order, inline when they fit, otherwise behind
//     an explicit Categories button (aria-expanded, aria-controls) that opens all ten with 44 px targets; keyboard
//     (Enter, Tab, Escape returns focus), click outside, focus leaving and choosing a link close it;
//   - no horizontal page overflow at any size, with the menu open or closed;
//   - journeys: menu -> Deployments -> Back; local search "Atlas"; NEO dossier -> permanent page -> Back; the evolution
//     carousel is not covered by the closed header; the two offers keep the full width.
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', 'http://localhost:8790').replace(/\/$/, '');
const SHOTS = arg('--shots', null);
const CATS = ['/humanoids/', '/deployments/', '/components/', '/integrators/', '/software/', '/datasets/', '/benchmarks/', '/investment/', '/other-robots/', '/reports/'];
const VIEWPORTS = [[320, 640], [375, 667], [390, 844], [430, 932], [768, 1024], [1366, 900], [1600, 900]];
// Each sample page with the h1 that proves it is the real page (not a 404 or a redirect stub).
const PAGES = [
  ['/humanoids/', /^Humanoids$/], ['/deployments/', /^Deployments$/], ['/components/', /^Components$/], ['/integrators/', /^Integrators$/],
  ['/software/', /^Software$/], ['/datasets/', /^Robot Learning Data Atlas$/], ['/benchmarks/', /^Robotics Evaluation Atlas$/], ['/investment/', /^Investment$/],
  ['/other-robots/', /^Other Robots$/], ['/reports/', /^Research Conclusions Atlas$/],
  ['/humanoids/1x-neo-home-robot-1/', /NEO/], ['/companies/agility-robotics/', /^Agility Robotics$/], ['/deployments/agility-digit-gxo-spanx/', /GXO Logistics/],
  ['/components/cmp-tac-001/', /^DIGIT/], ['/method/', /^How Why Humanoid\? records/], ['/subscribe/', /subscription/i],
];
const failures = [];
let passed = 0;
const check = (ok, msg) => { if (ok) passed += 1; else failures.push(msg); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

// The header of a page: links in order, inline or behind the button; opens and closes as specified.
async function header(p, tag, { home }) {
  const sel = home ? { nav: '#cat-menu', btn: '#cat-toggle' } : { nav: 'header.top #cat-menu', btn: 'header.top #cat-toggle' };
  const st = await p.evaluate(({ nav, btn }) => {
    const n = document.querySelector(nav), b = document.querySelector(btn);
    const links = [...n.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    const nr = n.getBoundingClientRect();
    const inline = getComputedStyle(n).display !== 'none' && [...n.querySelectorAll('a')].every((a) => { const r = a.getBoundingClientRect(); return r.width > 0 && r.left >= nr.left - 1 && r.right <= nr.right + 1 && r.right <= innerWidth + 1; });
    return { links, inline, button: b && !b.hidden, aria: b && b.getAttribute('aria-controls') === n.id && b.hasAttribute('aria-expanded') };
  }, sel);
  check(JSON.stringify(st.links) === JSON.stringify(CATS), `${tag}: the ten categories in order`);
  check(st.inline || st.button, `${tag}: all ten inline, or behind the Categories button`);
  check(st.aria, `${tag}: the button has aria-expanded and aria-controls`);
  if (!st.button) return st;
  await p.focus(sel.btn);
  await p.keyboard.press('Enter');
  const open = await p.evaluate(({ nav, btn }) => ({
    expanded: document.querySelector(btn).getAttribute('aria-expanded'),
    links: [...document.querySelectorAll(`${nav} a`)].filter((a) => { const r = a.getBoundingClientRect(); return r.height >= 44 && r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }).length,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }), sel);
  check(open.expanded === 'true' && open.links === 10, `${tag}: the menu opens by keyboard with all ten links, 44 px or taller, on screen (${open.links})`);
  check(open.overflow <= 1, `${tag}: no horizontal overflow with the menu open (${open.overflow}px)`);
  if (SHOTS && /home|deployments/.test(tag)) await p.screenshot({ path: `${SHOTS}/${tag.replace(/[^\w]+/g, '_')}_menu.png` });
  await p.keyboard.press('Tab');
  check(await p.evaluate(() => document.activeElement.getAttribute('href')) === CATS[0], `${tag}: Tab moves into the first category`);
  await p.keyboard.press('Escape');
  check(await p.evaluate(({ btn }) => document.querySelector(btn).getAttribute('aria-expanded') === 'false' && document.activeElement === document.querySelector(btn), sel), `${tag}: Escape closes and returns focus to the button`);
  // Focus leaving the header closes it (keyboard users tabbing on into the page).
  await p.click(sel.btn);
  await p.evaluate(() => { const t = document.querySelector('main a[href], main button, main input'); t.focus(); });
  check(await p.evaluate(({ btn }) => document.querySelector(btn).getAttribute('aria-expanded') === 'false', sel), `${tag}: focus leaving the header closes the menu`);
  // A click outside closes it.
  await p.click(sel.btn);
  await p.mouse.click(5, (await p.evaluate(() => innerHeight)) - 5);
  check(await p.evaluate(({ btn }) => document.querySelector(btn).getAttribute('aria-expanded') === 'false', sel), `${tag}: a click outside closes the menu`);
  return st;
}

const browser = await chromium.launch();
for (const [w, h] of VIEWPORTS) {
  const phone = w <= 430;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: phone, isMobile: phone && w <= 430 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  const hero = await p.evaluate(() => {
    const r = (s) => document.querySelector(s)?.getBoundingClientRect();
    const order = ['.search .field', '#cta-h', '#quick', '.hero-paths', '#eco'].map((s) => r(s).top);
    return { field: r('.search .field'), primary: r('#cta-h'), order, vh: innerHeight, header: r('.hud').bottom };
  });
  const tag = `${w}x${h} home`;
  check(hero.order.every((y, i) => i === 0 || y > hero.order[i - 1]), `${tag}: search, primary action, quick picks, then the two paths and the statistics`);
  if (phone) {
    check(hero.field.bottom <= hero.vh, `${tag}: the search field is in the first viewport (${Math.round(hero.field.bottom)} of ${hero.vh})`);
    if (w > 320) check(hero.primary.bottom <= hero.vh, `${tag}: the primary browse action is in the first viewport (${Math.round(hero.primary.bottom)} of ${hero.vh})`);
  }
  check(await overflow(p) <= 1, `${tag}: no horizontal page overflow`);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/home_${w}.png` });
  const st = await header(p, tag, { home: true });
  if (w >= 1366) check(st.inline, `${tag}: on a wide desktop the ten categories fit inline`);
  // Inline links never sit under the clock.
  if (st.inline) {
    const clash = await p.evaluate(() => { const c = document.querySelector('.hud-r'); if (!c || getComputedStyle(c).display === 'none') return false; const cr = c.getBoundingClientRect(); return [...document.querySelectorAll('#cat-menu a')].some((a) => { const r = a.getBoundingClientRect(); return r.right > cr.left && r.left < cr.right && r.bottom > cr.top && r.top < cr.bottom; }); });
    check(!clash, `${tag}: no category link overlaps the clock`);
  }
  // The two offers keep the panel width; the evolution carousel is not covered by the header.
  const offers = await p.evaluate(() => { const g = document.querySelector('.op-grid'); return g ? Math.round(g.getBoundingClientRect().width / g.parentElement.getBoundingClientRect().width * 100) : 100; });
  check(offers >= 95, `${tag}: the two offers use the full width (${offers}%)`);
  // The chart can be taller than a phone screen: bring its top just under the sticky header and sample a visible point.
  const covered = await p.evaluate(() => {
    const c = document.getElementById('evo-car'); if (!c) return 'missing';
    const hud = document.querySelector('.hud').getBoundingClientRect().bottom;
    window.scrollBy(0, c.getBoundingClientRect().top - hud - 12);
    const r = c.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + 30, innerHeight - 5));
    return c.contains(el) ? '' : (el ? el.tagName + '.' + el.className : 'nothing');
  });
  check(!covered, `${tag}: the evolution chart is not covered by the header (${covered})`);
  // Every generated page header at this size.
  for (const [path, h1] of PAGES) {
    const res = await p.goto(`${BASE}${path}`, { waitUntil: 'load' });
    await p.waitForTimeout(150);
    const title = (await p.textContent('h1').catch(() => '') ?? '').trim();
    check(res.status() === 200 && h1.test(title) && !/not found/i.test(title), `${w}x${h} ${path}: status ${res.status()} and its own h1 ("${title.slice(0, 40)}")`);
    check(await overflow(p) <= 1, `${w}x${h} ${path}: no horizontal page overflow`);
    if ((phone || w === 768) && [CATS[1], '/humanoids/1x-neo-home-robot-1/', '/method/', '/subscribe/'].includes(path) || w === 390) await header(p, `${w}x${h} ${path}`, { home: false });
    else {
      const ok = await p.evaluate(() => { const n = document.querySelector('header.top #cat-menu'), b = document.querySelector('header.top #cat-toggle'); return n.querySelectorAll('a').length === 10 && (!b.hidden || n.scrollWidth <= n.clientWidth + 1); });
      check(ok, `${w}x${h} ${path}: all ten categories inline or behind the button`);
    }
  }
  await ctx.close();
}

// Without JavaScript: no menu button, the ten links stay in the scrolling bar, and nothing widens the page.
for (const [w, h] of [[320, 640], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: false });
  const p = await ctx.newPage();
  for (const [path, nav, btn] of [['/', '#cat-menu', '#cat-toggle'], ['/deployments/', 'header.top #cat-menu', 'header.top #cat-toggle'], ['/method/', 'header.top #cat-menu', 'header.top #cat-toggle']]) {
    await p.goto(`${BASE}${path}`, { waitUntil: 'load' });
    const st = await p.evaluate(({ nav, btn }) => { const n = document.querySelector(nav), b = document.querySelector(btn);
      return { links: n.querySelectorAll('a').length, shown: getComputedStyle(n).display !== 'none', scroll: ['auto', 'scroll'].includes(getComputedStyle(n).overflowX), button: b ? getComputedStyle(b).display : 'none', overflow: document.documentElement.scrollWidth - innerWidth }; }, { nav, btn });
    check(st.links === 10 && st.shown && st.scroll && st.button === 'none' && st.overflow <= 1, `${w}x${h} ${path} without JavaScript: the bar shows the ten links and scrolls; no button; no overflow (${JSON.stringify(st)})`);
    const reach = await p.evaluate(({ nav }) => { const n = document.querySelector(nav); n.scrollLeft = n.scrollWidth; const a = [...n.querySelectorAll('a')].at(-1).getBoundingClientRect(); return a.right <= innerWidth + 1 && a.left >= 0; }, { nav });
    check(reach, `${w}x${h} ${path} without JavaScript: the last category is reachable by scrolling the bar`);
  }
  await ctx.close();
}

// Journeys on a phone (390 x 844, touch) and a desktop.
for (const [w, h] of [[390, 844], [1366, 900]]) {
  const phone = w < 1000;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: phone, isMobile: phone });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  if (phone) {
    await p.tap('#cat-toggle');
    await p.tap('#cat-menu a[href="/deployments/"]');
    await p.waitForURL(/\/deployments\/$/);
    check(/Deployments/.test(await p.textContent('h1')), `${w}: menu -> Deployments`);
    await p.goBack({ waitUntil: 'networkidle' });
    check(new URL(p.url()).pathname === '/' && await p.evaluate(() => document.getElementById('cat-toggle').getAttribute('aria-expanded')) === 'false', `${w}: Back returns home with the menu closed`);
    // The generated header: menu -> Reports -> Back.
    await p.goto(`${BASE}/method/`, { waitUntil: 'load' });
    await p.tap('header.top #cat-toggle');
    await p.tap('header.top #cat-menu a[href="/reports/"]');
    await p.waitForURL(/\/reports\/$/);
    await p.goBack({ waitUntil: 'load' });
    check(new URL(p.url()).pathname === '/method/', `${w}: generated header menu -> Reports -> Back to Method`);
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  }
  // Local search.
  await p.fill('#q', 'Atlas');
  await p.waitForTimeout(400);
  const rows = await p.evaluate(() => [...document.querySelectorAll('#humanoids .row, .rows .row')].filter((r) => r.offsetParent !== null).length);
  check(rows >= 1 && rows < 50, `${w}: search "Atlas" filters the catalogue (${rows} rows)`);
  await p.fill('#q', '');
  // NEO dossier -> permanent page -> Back.
  await p.click('.chip[data-pick="NEO"]');
  await p.waitForTimeout(500);
  const dossierOpen = await p.evaluate(() => /NEO/.test(document.querySelector('.dossier')?.textContent || ''));
  check(dossierOpen, `${w}: the NEO quick pick opens its dossier`);
  const perma = await p.$('.dossier a[href^="/robots/"], .dossier a[href^="/humanoids/"]');
  if (perma) {
    await perma.click();
    await p.waitForLoadState('load');
    check(/NEO/.test(await p.textContent('h1')), `${w}: the dossier links to the permanent NEO page`);
    await p.goBack({ waitUntil: 'networkidle' });
    await p.waitForTimeout(400);
    check(new URL(p.url()).pathname === '/' && /NEO/.test(await p.evaluate(() => document.querySelector('.dossier')?.textContent || '')), `${w}: Back returns to the dossier`);
  } else check(false, `${w}: the dossier has a link to the permanent page`);
  // Anchors still resolve.
  for (const id of ['humanoids', 'database', 'categories', 'adoption', 'method']) check(await p.$(`#${id}`) !== null, `${w}: #${id} exists`);
  await ctx.close();
}
await browser.close();
if (failures.length) { console.error(`Mobile check FAILED: ${passed} passed, ${failures.length} failed (${BASE})\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`Mobile check passed: ${passed} checks (${BASE}).`);
