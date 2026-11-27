// Browser check of the Components explorer (27 Nov 2026): node tools/verify-components-explorer.mjs [base] [shots dir]
// At 1366 x 900 and 390 x 844 (effective viewport recorded): the five area buttons each show their own panel and
// mark their drawing area; a drawing area selects its button; keyboard (Tab, Space) works; every family link opens
// the filtered catalogue with that family's products; counts equal data/components/coverage.json; no horizontal
// overflow; the evolution chart, the comparison and the passports' links are still on the page. Exit 1 on failure.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [base = 'https://whyhumanoid.com', out] = process.argv.slice(2);
const counts = JSON.parse(readFileSync(new URL('../data/components/coverage.json', import.meta.url), 'utf8')).counts.by_component_class;
const AREAS = ['perception', 'manipulation', 'motion', 'compute', 'energy'];
const problems = [];
const b = await chromium.launch();
for (const [label, vp] of [['desktop', { width: 1366, height: 900 }], ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${base}/components/`, { waitUntil: 'networkidle' });
  const eff = await p.evaluate(() => ({ width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth, evolutionFirst: document.getElementById('evolution')?.compareDocumentPosition(document.getElementById('explore')) === 4, compare: !!document.getElementById('cmp-out'), passports: document.querySelectorAll('a[href^="/components/cmp-"]').length }));
  if (eff.overflow > 0) problems.push(`${label}: horizontal overflow ${eff.overflow}px`);
  if (!eff.evolutionFirst) problems.push(`${label}: the evolution chart is not above the explorer`);
  if (!eff.compare || !eff.passports) problems.push(`${label}: comparison or passport links missing`);
  const links = [];
  for (const a of AREAS) {
    if (vp.hasTouch) await p.tap(`.hx-b[data-area="${a}"]`); else await p.click(`.hx-b[data-area="${a}"]`);
    const s = await p.evaluate((x) => ({ shown: [...document.querySelectorAll('.hx-p')].filter((q) => !q.hidden).map((q) => q.dataset.area), pressed: document.querySelector(`.hx-b[data-area="${x}"]`).getAttribute('aria-pressed'), zone: document.querySelector(`.hx-z[data-area="${x}"]`).classList.contains('on'), h: document.querySelector(`.hx-b[data-area="${x}"]`).getBoundingClientRect().height, fams: [...document.querySelectorAll(`#hx-p-${x} a`)].map((q) => [q.getAttribute('href'), Number(q.querySelector('b').textContent)]) }), a);
    if (s.shown.join() !== a || s.pressed !== 'true' || !s.zone) problems.push(`${label}: ${a} control did not select its panel and area`);
    if (s.h < 44) problems.push(`${label}: ${a} button only ${s.h}px tall`);
    for (const [href, n] of s.fams) { const fam = new URL(href, base).searchParams.get('fam'); if (counts[fam] !== n) problems.push(`${label}: ${fam} shows ${n}, coverage says ${counts[fam]}`); links.push([href, n]); }
  }
  await p.click('.hx-z[data-area="energy"] rect', { force: true });
  if ((await p.getAttribute('.hx-b[aria-pressed="true"]', 'data-area')) !== 'energy') problems.push(`${label}: drawing area did not select energy`);
  await p.focus('.hx-b[data-area="perception"]'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Space');
  if ((await p.getAttribute('.hx-b[aria-pressed="true"]', 'data-area')) !== 'motion') problems.push(`${label}: keyboard did not select motion`);
  if (out) await (await p.$('#explore')).screenshot({ path: `${out}/explore-${label}.png` });
  for (const [href, n] of links) {
    await p.goto(base + href, { waitUntil: 'networkidle' });
    const shown = await p.evaluate(() => [...document.querySelectorAll('.pc')].filter((x) => x.offsetParent !== null).length);
    if (shown !== n) problems.push(`${label}: ${href} shows ${shown} products, expected ${n}`);
  }
  if (errs.length) problems.push(`${label}: page errors ${errs.join(' | ')}`);
  console.log(`${label}: effective viewport ${eff.width} x ${eff.height}, overflow ${eff.overflow}px, ${links.length} family routes checked`);
  await ctx.close();
}
await b.close();
console.log(problems.length ? `PROBLEMS\n- ${problems.join('\n- ')}` : 'Components explorer passed at 1366 x 900 and 390 x 844.');
process.exit(problems.length ? 1 : 0);
