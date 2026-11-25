#!/usr/bin/env node
// The shared site footer and the About page in a real browser (Javier, 25 Nov 2026). Read-only: it only loads pages.
//   node tools/verify-footer.mjs [--base https://whyhumanoid.com]
// On the home page, a category, a robot page, a company page, Method, For agents, About and the subscriber app, at 320,
// 390 and 1366 px: the five footer links in order (About, For agents, Method, Contact, Integrarobot) with their exact
// targets, reachable by keyboard, inside the screen, and no horizontal scroll. Every internal footer target answers 200;
// About has its title, canonical address and description, links back home and to Method, For agents and the offers,
// and holds no counts or prices. No footer shows an email address; Contact leads to About's contact section.
import { createRequire } from 'node:module';
import { FOOTER_LINKS } from './footer-view.mjs';
import { SUPPORT_EMAIL } from '../server/src/support.js';
const { chromium } = createRequire(import.meta.url)('playwright');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', 'http://localhost:8791').replace(/\/$/, '');
const PAGES = ['/', '/deployments/', '/robots/1x-neo-home-robot-1/', '/companies/abb/', '/method/', '/agents/', '/about/', '/app/'];
const WIDTHS = [320, 390, 1366];
const failures = [];
let passed = 0;
const check = (ok, msg) => { if (ok) passed += 1; else failures.push(msg); };

const browser = await chromium.launch();
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const path of PAGES) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    check(res?.status() === 200, `${width}px ${path}: status ${res?.status()}`);
    const links = await page.$$eval('nav.site-foot a', (as) => as.map((a) => {
      const r = a.getBoundingClientRect();
      return { text: a.textContent.trim(), href: a.getAttribute('href'), left: r.left, right: r.right, h: r.height };
    }));
    check(links.length === FOOTER_LINKS.length && FOOTER_LINKS.every(([t, h], i) => links[i]?.text === t && links[i]?.href === h), `${width}px ${path}: footer links ${JSON.stringify(links.map((l) => l.text))}`);
    // No email address in any footer (Javier, 25 Nov 2026): no mailto link and no address text.
    check(await page.$$eval('footer', (fs) => fs.every((f) => !f.querySelector('a[href^="mailto:"]') && !/@/.test(f.textContent))), `${width}px ${path}: no email address in the footer`);
    check(links.every((l) => l.left >= 0 && l.right <= width + 1 && l.h >= 24), `${width}px ${path}: footer links inside the screen and at least 24 px tall`);
    // The footer itself never widens the page. The app's own header is wider than 320 px phones (in production before
    // this footer; server/public/index.html, outside this change), so on /app/ only the footer is measured.
    check(await page.$$eval('footer', (fs) => fs.every((f) => f.scrollWidth <= f.clientWidth + 1 && f.getBoundingClientRect().right <= innerWidth + 1)), `${width}px ${path}: the footer fits the screen`);
    if (path !== '/app/') check(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, `${width}px ${path}: no horizontal scroll`);
    // Keyboard: focusing each footer link works and shows it.
    const focusable = await page.$$eval('nav.site-foot a', (as) => as.every((a) => { a.focus(); return document.activeElement === a; }));
    check(focusable, `${width}px ${path}: every footer link takes keyboard focus`);
  }
  check(!errors.length, `${width}px: no script errors (${errors.slice(0, 3).join('; ')})`);
  await ctx.close();
}

// Footer targets answer, and About reads as specified.
const page = await browser.newPage();
for (const [label, href] of FOOTER_LINKS.filter(([, h]) => h.startsWith('/'))) {
  const r = await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });
  check(r?.status() === 200, `target ${label} ${href}: status ${r?.status()}`);
}
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.click('nav.site-foot a[href="/about/"]');
await page.waitForURL(/\/about\/$/);
check((await page.textContent('h1')).trim() === 'About Why Humanoid?', 'about: reached from the home footer, with its heading');
check((await page.title()) === 'About Why Humanoid?', `about: title (${await page.title()})`);
check(await page.getAttribute('link[rel="canonical"]', 'href') === 'https://whyhumanoid.com/about/', 'about: canonical /about/');
check(((await page.getAttribute('meta[name="description"]', 'content')) || '').length > 60, 'about: meta description');
const hrefs = await page.$$eval('main a', (as) => as.map((a) => a.getAttribute('href')));
for (const need of ['/', '/method/', '/agents/', '/subscribe/', 'https://integrarobot.com', `mailto:${SUPPORT_EMAIL}`]) check(hrefs.includes(need), `about: links to ${need}`);
check(Boolean(await page.$('#contact')), 'about: the #contact section the footer Contact link targets');
const text = await page.textContent('main');
check(!/\$|US\$|USD|€|\d{2,}/.test(text), `about: no prices or counts (${(text.match(/\$|US\$|USD|€|\d{2,}/) || [''])[0]})`);
for (const word of ['Humanoids', 'Deployments', 'Components', 'Integrators', 'Software', 'Datasets', 'Benchmarks', 'Investment', 'Other robots', 'Reports']) check(text.includes(word), `about: covers ${word}`);
await page.click('nav.crumbs a[href="/"]');
await page.waitForURL(`${BASE}/`);
check(true, 'about: the breadcrumb returns home');
await browser.close();

if (failures.length) { console.error(`Footer check FAILED: ${passed} passed, ${failures.length} failed\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`Footer check passed: ${passed} checks (${BASE}): ${PAGES.length} pages at ${WIDTHS.join(', ')} px, footer targets, About.`);
