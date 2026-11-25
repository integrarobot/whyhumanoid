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
//   4. Exposure: no data/database files; Deployments and Components public files hold public fields only; their API rows
//      answer 401 without a session; visitor search stays in the public scope.
//   5. With --local (server/scripts/staging-local.mjs): account states through the real API and signed test-mode
//      events: signed in without paying (403), active (200 for both), duplicate event (no change), cancelled at
//      period end (still 200), period ended (403), deletion (403).
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { CATEGORIES } from '../server/src/access/matrix.js';
import { robotPresentation } from './robot-presentation.mjs';
const DATA_ATLAS = JSON.parse(readFileSync(new URL('../data/datasets/atlas.json', import.meta.url), 'utf8'));
const COMPONENTS = JSON.parse(readFileSync(new URL('../data/components/coverage.json', import.meta.url), 'utf8'));
const COMPONENT_ROWS = JSON.parse(readFileSync(new URL('../data/preview/hardware.json', import.meta.url), 'utf8')).rows;
const REPORTS = JSON.parse(readFileSync(new URL('../data/reports/atlas.json', import.meta.url), 'utf8'));
const DEP_PUBLIC = JSON.parse(readFileSync(new URL('../data/preview/deployments.json', import.meta.url), 'utf8')).rows;
const DEP_CASES = new Set(DEP_PUBLIC.map((r) => r.deployment_id)).size;
const { PUBLIC_FIELDS } = await import('../server/src/access/fields.js');

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
const SAMPLE = ['/agents/', '/privacy/', '/reports/deployment-records/', '/reports/anthropic-what-work-can-robots-do-2026/', '/humanoids/agibot-x1-4/', '/companies/tesla/', '/companies/agility-robotics/', '/other-robots/realtime/', '/subscribe/', '/companies/', '/method/', '/reports/deployment-records/'];
for (const [label, viewport] of [['desktop', { width: 1366, height: 900 }], ['phone', { width: 375, height: 812 }]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: label === 'phone' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const c of CATEGORIES) {
    const res = await page.goto(BASE + c.path, { waitUntil: 'domcontentloaded' });
    check(res.status() === 200, `${label} ${c.path}: direct load ${res.status()}`);
    const again = await page.reload({ waitUntil: 'domcontentloaded' });
    check(again.status() === 200, `${label} ${c.path}: reload ${again.status()}`);
    const h1 = { benchmarks: 'Robotics Evaluation Atlas', datasets: 'Robot Learning Data Atlas', reports: 'Research Conclusions Atlas' }[c.id] ?? c.label; // atlases (23-24 Nov 2026)
    check((await page.textContent('h1'))?.trim() === h1, `${label} ${c.path}: h1 is ${h1}`);
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
  // Robotics Evaluation Atlas (23 Nov 2026): evidence near the top, the same detail for pointer and keyboard, honest
  // controls, shareable state and no sideways page scroll.
  await page.goto(`${BASE}/benchmarks/`, { waitUntil: 'networkidle' });
  const at = await page.evaluate(() => ({ js: document.getElementById('atlas')?.classList.contains('js'), results: document.getElementById('results').getBoundingClientRect().top - ([...document.querySelectorAll('.evo-sec')].at(-1)?.getBoundingClientRect().bottom ?? 0), overflow: document.documentElement.scrollWidth - innerWidth, counts: [...document.querySelectorAll('.atlas-counts dd')].map((d) => d.textContent).join('/') }));
  check(at.js && at.counts === '22/2/34/20', `${label} benchmarks: the atlas starts and shows 22 resources, 2 with results, 34 observations, 20 awaiting (${at.counts})`);
  check(at.results < (label === 'phone' ? 1100 : 900), `${label} benchmarks: results start near the top of the atlas, after the evolution charts (${Math.round(at.results)}px)`);
  check(at.overflow <= 1, `${label} benchmarks: no horizontal page scroll (${at.overflow}px)`);
  await page.focus('#panel-paw .dot.ext');
  await page.keyboard.press('Enter');
  const det = await page.evaluate(() => ({ open: !document.getElementById('res-detail').hidden, text: document.getElementById('res-detail').textContent, url: location.search }));
  check(det.open && /Extrapolation/.test(det.text) && /pokeandwiggle\.com/.test(det.text) && /not a replication/.test(det.text) && /res=res-paw-agentic-d10-/.test(det.url), `${label} benchmarks: a mark opens by keyboard with conditions, source, check date and a shareable link`);
  await page.keyboard.press('Escape');
  check(await page.evaluate(() => document.getElementById('res-detail').hidden && !location.search.includes('res=')), `${label} benchmarks: Escape closes the detail and clears it from the address`);
  await page.click('#panel-piq label:has(input[value="verified"])');
  const piq = await page.$$eval('#panel-piq .facet', (fs) => fs.filter((f) => !f.hidden).map((f) => `${f.dataset.variant}/${f.dataset.mode}:${f.querySelectorAll('.dot').length}`).join(' '));
  check(piq === 'verified/i2v:0 verified/v2v:2', `${label} benchmarks: Verified is shown apart from Original, with its empty i2v state (${piq})`);
  await page.click('.cap-f[data-cap="whole-body"]');
  const wb = await page.$$eval('#matrix tbody tr', (trs) => trs.filter((t) => !t.hidden).map((t) => t.dataset.bm).join(','));
  check(wb === 'bm-maniskill3,bm-humanoidbench', `${label} benchmarks: the whole-body filter keeps the two whole-body resources (${wb})`);
  await page.goto(`${BASE}/benchmarks/?res=res-physics-verified-1&grp=physics-original-v2v-base#results`, { waitUntil: 'networkidle' });
  const dl = await page.evaluate(() => ({ t: document.querySelector('#res-detail .d-t')?.textContent, grp: document.getElementById('cmp-group').value, pm: document.getElementById('res-detail').textContent.includes('± 2.2 as published') }));
  check(dl.t === 'Cosmos3-Super · multiframe (v2v)' && dl.grp === 'physics-original-v2v-base' && dl.pm, `${label} benchmarks: a deep link restores the observation, its published ± text and the comparison`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}_benchmarks.png` });
  // Components (23 Nov 2026): the public first products, coverage counts, filters and comparison in the address, every
  // product address, and no product data on a subscriber-only address without a session.
  {
    await page.goto(`${BASE}/components/`, { waitUntil: 'networkidle' });
    const cx = await page.evaluate(() => ({ ready: !document.getElementById('cx-filters').hidden && document.getElementById('cx-error').hidden, cards: document.querySelectorAll('#pcs .pc').length, first: document.querySelector('.cx-counts dd')?.textContent, overflow: document.documentElement.scrollWidth - innerWidth }));
    check(cx.ready && cx.cards === COMPONENT_ROWS.length && cx.first === String(COMPONENTS.counts.products), `${label} components: the explorer starts with ${COMPONENT_ROWS.length} public products of ${COMPONENTS.counts.products} (${JSON.stringify(cx)})`);
    check(cx.overflow <= 1, `${label} components: no horizontal page scroll (${cx.overflow}px)`);
    await page.selectOption('#f-principle', 'magnetic');
    const mag = await page.evaluate(() => ({ shown: [...document.querySelectorAll('#pcs .pc')].filter((c) => !c.hidden).map((c) => c.dataset.id), url: location.search }));
    check(mag.shown.includes('CMP-TAC-004') && mag.shown.includes('CMP-TAC-011') && /principle=magnetic/.test(mag.url), `${label} components: the magnetic filter keeps uSkin and ReSkin and is in the address (${mag.shown})`);
    await page.click('#f-clear');
    await page.focus('.pc[data-id="CMP-TAC-003"] .pc-cmp');
    await page.keyboard.press('Enter');
    const cmp = await page.evaluate(() => ({ cols: [...document.querySelectorAll('#cmp-out thead th')].map((t) => t.textContent), url: location.search, care: document.querySelector('#cmp-out .cmp-cautions')?.textContent ?? '' }));
    check(cmp.cols.length === 4 && /DIGIT 360/.test(cmp.cols.join('|')) && /cmp=.*CMP-TAC-003/.test(decodeURIComponent(cmp.url)) && /Early access is not open sale/.test(cmp.care), `${label} components: a product joins the comparison by keyboard, with its public caution and a shareable address`);
    await page.goto(`${BASE}/components/?cmp=CMP-TAC-005,CMP-TAC-010&q=hall#compare`, { waitUntil: 'networkidle' });
    const back = await page.evaluate(() => ({ cols: [...document.querySelectorAll('#cmp-out thead th')].map((t) => t.textContent).slice(1).map((x) => x.split('Commercial')[0].split('Discontinued')[0]), q: document.getElementById('f-q').value, shown: [...document.querySelectorAll('#pcs .pc')].filter((c) => !c.hidden).length }));
    check(back.cols.length === 2 && back.q === 'hall' && back.shown >= 1, `${label} components: a shared address restores the comparison and the search (${JSON.stringify(back)})`);
    for (const id of [...COMPONENTS.ids.products, ...COMPONENTS.ids.software]) {
      const res = await fetch(`${BASE}/components/${id.toLowerCase()}/`);
      if (res.status !== 200) check(false, `${label} components: /components/${id.toLowerCase()}/ answers ${res.status}`);
    }
    check(true, `${label} components: all ${COMPONENTS.ids.products.length + COMPONENTS.ids.software.length} product addresses answer`);
    check(COMPONENT_ROWS.length === COMPONENTS.counts.products, `${label} components: every product is public at its public fields`);
    await page.goto(`${BASE}/components/cmp-tac-001/`, { waitUntil: 'networkidle' });
    const pp = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, secs: document.querySelectorAll('.pp-sec').length, summary: !!document.querySelector('.pp.pp-summary'), locked: [...document.querySelectorAll('.pp-kv dd')].filter((d) => d.textContent === 'With the subscription').length, src: document.querySelectorAll('.srcs li').length, box: !!document.querySelector('.pp-lockbox a[href="/subscribe/"]'), maker: !!document.querySelector('.pc-m a[href="/companies/gelsight-inc/"]'), overflow: document.documentElement.scrollWidth - innerWidth }));
    check(pp.h1 === 'DIGIT' && pp.secs >= 9 && pp.summary && pp.locked >= 10 && pp.src === 0 && pp.box && pp.maker && pp.overflow <= 1, `${label} components: DIGIT's public summary names its paid fields, offers the passport and links its maker (${JSON.stringify(pp)})`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}_components_digit.png` });
  }
  // Deployments (24 Nov 2026): every case listed publicly, filters in the address that survive reload and back, a case
  // page with its sources and caveat, and the two paths near the top.
  {
    await page.goto(`${BASE}/deployments/`, { waitUntil: 'networkidle' });
    const dv = await page.evaluate(() => ({ cases: document.querySelectorAll('#dcs > li.dc').length, filters: !document.getElementById('dc-filters').hidden, offer: /US\$100/.test(document.getElementById('offer')?.textContent ?? '') && /Not available to order yet/.test(document.getElementById('offer')?.textContent ?? ''), offerY: Math.round(document.getElementById('offer').getBoundingClientRect().top + scrollY), overflow: document.documentElement.scrollWidth - innerWidth }));
    check(dv.cases === DEP_CASES && dv.filters && dv.offer && dv.overflow <= 1, `${label} deployments: all ${DEP_CASES} cases listed, filters on, two paths shown, no horizontal scroll (${JSON.stringify(dv)})`);
    await page.selectOption('select[name="status"]', 'op');
    await page.fill('input[name="q"]', 'agility');
    const f1 = await page.evaluate(() => ({ shown: [...document.querySelectorAll('#dcs > li.dc')].filter((x) => !x.hidden).map((x) => x.dataset.status), url: location.search }));
    check(f1.shown.length >= 1 && f1.shown.every((s) => s === 'op') && /status=op/.test(f1.url) && /q=agility/.test(f1.url), `${label} deployments: filters narrow the cases and stay in the address (${f1.shown.length} cases)`);
    await page.reload({ waitUntil: 'networkidle' });
    const f2 = await page.evaluate(() => ({ shown: [...document.querySelectorAll('#dcs > li.dc')].filter((x) => !x.hidden).length, q: document.querySelector('input[name="q"]').value }));
    check(f2.shown === f1.shown.length && f2.q === 'agility', `${label} deployments: a reload keeps the filtered view`);
    const href = await page.evaluate(() => [...document.querySelectorAll('#dcs > li.dc')].find((x) => !x.hidden)?.querySelector('h3 a')?.getAttribute('href'));
    await page.goto(BASE + href, { waitUntil: 'networkidle' });
    const cp = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent ?? '', src: document.querySelectorAll('.dc-src a[href^="http"]').length, caveat: /not facts verified/.test(document.body.textContent), paid: /With the data subscription/.test(document.body.textContent), overflow: document.documentElement.scrollWidth - innerWidth }));
    check(cp.h1 && cp.src >= 1 && cp.caveat && cp.paid && cp.overflow <= 1, `${label} deployments: a case page shows its summary, sources, caveat and what is paid (${JSON.stringify(cp)})`);
    await page.goBack({ waitUntil: 'networkidle' });
    check(/status=op/.test(await page.evaluate(() => location.search)), `${label} deployments: back returns to the filtered list`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}_deployments.png` });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const hp = await page.evaluate(() => ({ mini: Math.round(document.querySelector('.hero-paths')?.getBoundingClientRect().top + scrollY), h: innerHeight, paths: !!document.getElementById('paths'), euro: /€/.test(document.body.textContent) }));
    check(hp.paths && hp.mini < hp.h * 1.5 && !hp.euro, `${label} home: the two paths are near the top and no euro price is shown (${JSON.stringify(hp)})`);
    await page.goto(`${BASE}/subscribe/`, { waitUntil: 'networkidle' });
    const sp = await page.evaluate(() => ({ usd: /US\$100 per year, billed annually/.test(document.body.textContent), reports: /Not available to order yet/.test(document.getElementById('reports')?.textContent ?? ''), orderLinks: [...document.querySelectorAll('#reports a')].filter((a) => /checkout|order/i.test(a.getAttribute('href') ?? '')).length, overflow: document.documentElement.scrollWidth - innerWidth }));
    check(sp.usd && sp.reports && sp.orderLinks === 0 && sp.overflow <= 1, `${label} subscribe: USD price, reports not orderable, no order link (${JSON.stringify(sp)})`);
  }
  // Research Conclusions Atlas (24 Nov 2026): every finding in the table, a chart mark opens its passport by keyboard
  // or touch with a shareable address, Escape returns focus, a coverage cell filters the table, a shared address
  // reopens the passport, and every report page answers with its passports.
  {
    await page.goto(`${BASE}/reports/`, { waitUntil: 'networkidle' });
    const rs = await page.evaluate(() => ({ rows: document.querySelectorAll('.rp-ft tbody tr').length, filters: !document.getElementById('rp-filters').hidden, themes: document.querySelectorAll('.rp-theme').length, marks: document.querySelectorAll('svg.rp-svg a.mk').length, overflow: document.documentElement.scrollWidth - window.innerWidth }));
    check(rs.rows === REPORTS.findings.length && rs.filters && rs.themes === REPORTS.vocabulary.themes.length && rs.marks > 20 && rs.overflow <= 1, `${label} reports: ${REPORTS.findings.length} findings, ${REPORTS.vocabulary.themes.length} themes, charts drawn, filters on, no horizontal scroll (${JSON.stringify(rs)})`);
    const mark = page.locator('#chart-shipments a.mk[data-f="bofa-ship-2035"]');
    if (label === 'phone') await mark.tap(); else { await mark.focus(); await page.keyboard.press('Enter'); }
    await page.waitForSelector('#rp-panel:not([hidden]) .fp');
    const pp = await page.evaluate(() => ({ v: document.querySelector('#rp-panel .fp-v')?.textContent, rep: /appears in 3 reports/.test(document.querySelector('#rp-panel').textContent), url: location.search }));
    check(pp.v === '10 million units' && pp.rep && pp.url === '?f=bofa-ship-2035', `${label} reports: a chart mark opens its passport with the repeat count and a shareable address (${JSON.stringify(pp)})`);
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => ({ hidden: document.getElementById('rp-panel').hidden, focus: document.activeElement?.getAttribute('data-f'), url: location.search }));
    check(closed.hidden && closed.url === '' && (label === 'phone' || closed.focus === 'bofa-ship-2035'), `${label} reports: Escape closes the passport and returns focus (${JSON.stringify(closed)})`);
    await page.click('.rp-cov a[data-report="RPT-006"][data-theme="work"]');
    const fl = await page.evaluate(() => ({ shown: [...document.querySelectorAll('.rp-ft tbody tr')].filter((tr) => !tr.hidden).map((tr) => tr.dataset.report + '/' + tr.dataset.theme), url: location.search }));
    check(fl.shown.length === REPORTS.findings.filter((f) => f.report === 'RPT-006' && f.theme === 'work').length && fl.shown.every((x) => x === 'RPT-006/work') && /report=RPT-006/.test(fl.url), `${label} reports: a coverage cell filters the table to its report and theme (${fl.shown.length} rows)`);
    await page.goto(`${BASE}/reports/?f=ms-china-ambiguous`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#rp-panel:not([hidden]) .fp');
    check(/Withheld/.test(await page.textContent('#rp-panel')), `${label} reports: a shared address reopens a passport; the ambiguous figure says it is withheld`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}_reports_passport.png` });
    for (const r of REPORTS.reports) {
      const res = await fetch(`${BASE}/reports/${r.slug}/`);
      const html = res.status === 200 ? await res.text() : '';
      const missing = REPORTS.findings.filter((f) => f.report === r.id && !html.includes(`id="f-${f.id}"`)).length;
      if (res.status !== 200 || missing) check(false, `${label} reports: /reports/${r.slug}/ answers ${res.status} with ${missing} passports missing`);
    }
    check(true, `${label} reports: all ${REPORTS.reports.length} report pages answer with every passport`);
  }
  // Robot Learning Data Atlas (23 Nov 2026): counts from the snapshot, a question answered with known, partial and
  // unknown matches kept apart, the same detail for keyboard and pointer, Escape, set-apart figures, shareable state.
  {
    const dc = DATA_ATLAS.counts;
    await page.goto(`${BASE}/datasets/`, { waitUntil: 'networkidle' });
    const da = await page.evaluate(() => ({ ready: !document.getElementById('filters').hidden && document.getElementById('atlas-error').hidden, overflow: document.documentElement.scrollWidth - innerWidth, counts: [...document.querySelectorAll('.atlas-counts dd')].map((d) => d.textContent).join('/'), tiles: document.querySelectorAll('.dtile').length }));
    const want = [dc.resources, dc.corpora, dc.resources_with_quantities, dc.quantities, dc.resources_awaiting_quantities].join('/');
    check(da.ready && da.counts === want && da.tiles === dc.resources, `${label} datasets: the data atlas starts with the snapshot counts ${want} (${da.counts}) and every resource in a lane`);
    check(da.overflow <= 1, `${label} datasets: no horizontal page scroll (${da.overflow}px)`);
    await page.click('button.preset[data-q^="body=dual_arm"]');
    const qa = await page.evaluate(() => ({ url: location.search, cols: [...document.querySelectorAll('#q-out > div')].map((d) => d.querySelector('h4').firstChild.textContent.trim() + ':' + [...d.querySelectorAll('.sn')].map((x) => x.dataset.ds).join(',')) }));
    check(/mod=tactile/.test(qa.url) && qa.cols.includes('Known matches:') && qa.cols.includes('Partial matches:ds-robomind2'), `${label} datasets: "bimanual with tactile data" keeps partial and unknown matches apart, with no score (${qa.cols.join(' | ')})`);
    await page.selectOption('#f-mod', 'rgb');
    await page.selectOption('#f-body', '');
    check(await page.evaluate(() => [...document.querySelectorAll('#q-out h4')].some((h) => /^Evaluation data/.test(h.textContent)) && ![...document.querySelectorAll('#q-out > div')].slice(0, 3).some((d) => d.querySelector('[data-ds="ds-physics-iq"]'))), `${label} datasets: evaluation data is listed apart from training data`);
    await page.click('#f-clear');
    await page.focus('.dtile[data-ds="ds-bridgedata-v2"]');
    await page.keyboard.press('Enter');
    const dd = await page.evaluate(() => ({ t: document.querySelector('#ds-detail .d-t')?.textContent, url: location.search, text: document.getElementById('ds-detail').textContent }));
    check(dd.t === 'BridgeData V2' && /ds=ds-bridgedata-v2/.test(dd.url) && /60,096 trajectories/.test(dd.text) && /Lineage is incomplete/.test(dd.text), `${label} datasets: a resource opens by keyboard with its passport and a shareable link`);
    await page.keyboard.press('Escape');
    check(await page.evaluate(() => !location.search.includes('ds=') && document.activeElement?.dataset?.ds === 'ds-bridgedata-v2'), `${label} datasets: Escape closes the passport, clears it from the address and returns focus`);
    const apart = await page.evaluate(() => ({ open: document.getElementById('set-apart').open, main: [...document.querySelectorAll('#scale .slane [data-group]')].map((e) => e.dataset.group), apart: [...document.querySelectorAll('#set-apart [data-group]')].map((e) => e.dataset.group) }));
    check(!apart.open && !apart.main.some((g) => /aggregate|commercial|training/.test(g)) && apart.apart.length === 4, `${label} datasets: aggregates, provider claims and training mixtures are set apart and closed by default (${apart.apart.join(', ')})`);
    await page.goto(`${BASE}/datasets/?scale=log&cmp=ds-egodex,ds-ego4d&ds=ds-hubego-100k#scale`, { waitUntil: 'networkidle' });
    const dl = await page.evaluate(() => ({ scale: document.getElementById('scale').dataset.scale, cmp: [...document.querySelectorAll('#pp-out thead th')].map((t) => t.textContent).join(','), t: document.querySelector('#ds-detail .d-t')?.textContent }));
    check(dl.scale === 'log' && dl.cmp === 'Field,EgoDex,Ego4D' && dl.t === 'HubEgo-100K', `${label} datasets: a shared address restores the log axis, the comparison and the open passport (${JSON.stringify(dl)})`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}_datasets.png` });
  }
  // Adoption view (23 Nov 2026): the hero answers at a glance; the explorer filters and opens a case.
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  // The hero's featured chart (24 Nov 2026): the seven evolution charts in rotation (tools/verify-evolution.mjs tests
  // the rotation itself); the adoption explorer below keeps its filters and case panel.
  check(await page.isVisible('.hero #evo-car .evo-slide.on .evo-chart'), `${label} home: evolution carousel in the hero`);
  check((await page.$$eval('.hero #evo-car [role="tab"]', (xs) => xs.map((x) => x.textContent))).join() === 'Humanoids,Deployments,Components,Integrators,Datasets,Benchmarks,Reports', `${label} home: the seven evolution charts in order`);
  check(!(await page.$('.hero .adopt-hero')), `${label} home: the static adoption figure is gone from the hero`);
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
  check(rows.every((r) => Object.keys(r).every((k) => k === '_row' || PUBLIC_FIELDS[id].includes(k))), `${id}: public file holds public fields only`);
  check((await get(`/v1/datasets/${id}`)).status === 401, `${id}: full rows 401 without a session`);
  // The API's public rows are the same contract (a Worker older than 24 Nov 2026 still serves its first 10 rows).
  const api = await get(`/v1/datasets/${id}/preview`);
  if (api.status === 200) {
    const body = await api.json();
    const contract = body.rows.every((r) => Object.keys(r).every((k) => k === 'id' || PUBLIC_FIELDS[id].includes(k)));
    check(contract && body.rows.length === body.total_rows, `${id}: the API serves every row at its public fields to visitors (${body.rows.length} of ${body.total_rows})`);
  }
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
  {
    // The subscriber's own session (as the app stores it) upgrades /components/ to every product of the API.
    const total = (await (await get('/v1/datasets/hardware?limit=500', auth)).json()).rows.length;
    const sub = await chromium.launch();
    const sp = await (await sub.newContext()).newPage();
    await sp.goto(`${BASE}/components/`, { waitUntil: 'domcontentloaded' });
    await sp.evaluate((t) => localStorage.setItem('wh_session', t), session);
    await sp.goto(`${BASE}/components/`, { waitUntil: 'networkidle' });
    await sp.waitForFunction(() => /Subscriber view/.test(document.getElementById('cx-access')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => null);
    const v = await sp.evaluate(() => ({ cards: document.querySelectorAll('#pcs .pc').length, access: document.getElementById('cx-access').textContent, lock: document.getElementById('pc-lock')?.hidden, opts: document.querySelectorAll('.cmp-s')[0].options.length - 1 }));
    check(v.cards === total && /Subscriber view/.test(v.access) && v.lock !== false && v.opts === total, `subscriber: /components/ lists all ${total} products from the API with the subscription (${JSON.stringify(v)})`);
    // A product address upgrades from the public summary to the full passport, with its field-level sources.
    // (Only where the API serves the same products as the pages: production, not the synthetic local fixture.)
    const pid = (await (await get('/v1/datasets/hardware?limit=500', auth)).json()).rows[0].component_id;
    if ((await fetch(`${BASE}/components/${pid.toLowerCase()}/`)).status === 200) {
    await sp.goto(`${BASE}/components/${pid.toLowerCase()}/`, { waitUntil: 'networkidle' });
    await sp.waitForFunction(() => document.querySelector('.pp') && !document.querySelector('.pp-summary'), null, { timeout: 10000 }).catch(() => null);
    const full = await sp.evaluate(() => ({ summary: !!document.querySelector('.pp-summary'), srcs: document.querySelectorAll('.srcs li').length, locked: [...document.querySelectorAll('.pp-kv dd')].filter((d) => d.textContent === 'With the subscription').length, box: document.querySelector('.pp-lockbox')?.hidden }));
    check(!full.summary && full.srcs >= 1 && full.locked === 0 && full.box === true, `subscriber: a product address shows the full passport (${JSON.stringify(full)})`);
    }
    // Rows that are not the product contract (an API still serving the former directory) never replace the public view.
    const stale = await (await chromium.launch()).newContext();
    await stale.addInitScript((t) => localStorage.setItem('wh_session', t), session);
    await stale.route((u) => u.pathname.startsWith('/v1/datasets/'), (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rows: [{ id: 'hw_x', list: 'hardware', name: 'Former entry', url: 'https://x.example.com', description: null }] }) }));
    const stp = await stale.newPage();
    await stp.goto(`${BASE}/components/`, { waitUntil: 'networkidle' });
    const sv = await stp.evaluate(() => ({ cards: document.querySelectorAll('#pcs .pc').length, access: document.getElementById('cx-access').textContent }));
    check(sv.cards === COMPONENT_ROWS.length && !/Subscriber view/.test(sv.access), `subscriber: rows of the former directory never replace the public products (${JSON.stringify(sv)})`);
    await stale.browser().close();
    // A shared comparison that names subscriber-only products keeps them once the complete rows arrive.
    const ids = (await (await get('/v1/datasets/hardware?limit=500', auth)).json()).rows.slice(-2).map((r) => r.component_id);
    await sp.goto(`${BASE}/components/?cmp=${ids.join(',')}#compare`, { waitUntil: 'networkidle' });
    await sp.waitForFunction(() => /Subscriber view/.test(document.getElementById('cx-access')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => null);
    const cols = await sp.evaluate(() => document.querySelectorAll('#cmp-out thead th').length - 1);
    check(cols === 2, `subscriber: a shared comparison of subscriber-only products is restored (${cols} columns)`);
    await sub.close();
  }
  check((await event({ id: `evt_${RUN}_s1`, type: 'customer.subscription.created', status: 'active', period_end: now + 365 * 86400 })).duplicate === true, 'duplicate delivery recognised and not applied twice');
  await event({ id: `evt_${RUN}_s2`, status: 'active', cancel_at_period_end: true, period_end: now + 365 * 86400 });
  check(JSON.stringify(await state()) === '[200,200]', 'cancelled at period end: still open until the paid year ends');
  await event({ id: `evt_${RUN}_s3`, status: 'active', cancel_at_period_end: true, period_end: now - 1 });
  check(JSON.stringify(await state()) === '[403,403]', 'paid period ended: closed before any deletion event');
  await event({ id: `evt_${RUN}_s4`, type: 'customer.subscription.deleted', status: 'canceled', period_end: now - 1 });
  check(JSON.stringify(await state()) === '[403,403]', 'deletion: closed');
  check((await get('/v1/datasets/humanoids', auth)).status === 200, 'Humanoids stays free for the same account');
  // A legacy EUR subscription (sandbox events, nothing charged): its renewals keep the access; a second checkout is refused.
  if (process.env.LEGACY_PRICE) {
    const lemail = `legacy-${RUN}@example.com`;
    await get('/v1/auth/magic-link', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: lemail }) });
    const ltoken = (await (await get(`/dev/magic?email=${encodeURIComponent(lemail)}`)).text()).split('#login=')[1];
    const lsession = (await (await get('/v1/auth/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: ltoken }) })).json()).token;
    const lauth = { headers: { authorization: `Bearer ${lsession}` } };
    const ev = (b) => get('/dev/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: lemail, price: process.env.LEGACY_PRICE, ...b }) }).then((r) => r.json());
    check((await ev({ id: `evt_${RUN}_l1`, type: 'customer.subscription.created', status: 'active', period_end: now + 365 * 86400 })).outcome === 'entitlement_updated', 'legacy EUR subscription: access granted by its signed event');
    check((await get('/v1/datasets/deployments', lauth)).status === 200, 'legacy EUR subscription: Deployments 200');
    check((await get('/v1/billing/checkout', { method: 'POST', ...lauth })).status === 409, 'legacy EUR subscription: a second checkout is refused (409)');
    await ev({ id: `evt_${RUN}_l2`, status: 'active', period_end: now + 730 * 86400 });
    check((await get('/v1/datasets/hardware', lauth)).status === 200, 'legacy EUR subscription: renewal keeps the access');
  }
}

for (const m of failures) console.error(`FAIL ${m}`);
console.log(`${failures.length ? 'Staging check FAILED' : 'Staging check passed'}: ${ok.length} passed, ${failures.length} failed (${BASE})`);
process.exit(failures.length ? 1 : 0);
