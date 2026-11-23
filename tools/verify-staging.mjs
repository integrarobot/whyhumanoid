#!/usr/bin/env node
// Browser check of a staging (or production) deployment of the category structure and access matrix (23 Nov 2026).
//
//   node tools/verify-staging.mjs --base http://localhost:8788 [--local] [--shots <dir>]
//
// Checks, with a real browser (Playwright, Chromium), at desktop and phone width:
//   1. The nine categories load directly and on reload, in order in the navigation, with no horizontal scroll;
//      /humanoids (no slash) reaches /humanoids/; representative robot, company and other-robot pages load.
//   2. Old links: /robots/<slug>/ and /robots/ lead to /humanoids/...; old #db-<tab> links still open the panel.
//   3. Canonical URLs point at whyhumanoid.com; the sitemap lists the categories and no /robots/ address.
//   4. Exposure: no data/database files; Deployments and Components previews hold at most 10 rows; their API rows
//      answer 401 without a session; visitor search stays in the public scope.
//   5. With --local (server/scripts/staging-local.mjs): account states through the real API and signed test-mode
//      events: signed in without paying (403), active (200 for both), duplicate event (no change), cancelled at
//      period end (still 200), period ended (403), deletion (403).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { CATEGORIES } from '../server/src/access/matrix.js';

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
const SAMPLE = ['/humanoids/agibot-x1-4/', '/companies/tesla/', '/companies/agility-robotics/', '/other-robots/realtime/', '/subscribe/', '/companies/', '/method/', '/reports/deployment-records/'];
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
  check(JSON.stringify(homeNav) === JSON.stringify(CATEGORIES.map((x) => x.path)), `${label} home: navigation is the nine categories`);
  check((await page.$$('#categories .catgrid li')).length === 9, `${label} home: categories block has nine entries`);
  const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(homeOverflow <= 1, `${label} home: no horizontal page scroll (${homeOverflow}px)`);
  if (SHOTS) {
    await page.screenshot({ path: `${SHOTS}/${label}_home.png` });
    await page.locator('#categories').screenshot({ path: `${SHOTS}/${label}_home_categories.png` });
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
const get = (p, init) => fetch(BASE + p, init);
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
