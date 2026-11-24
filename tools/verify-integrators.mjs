#!/usr/bin/env node
// Integrators in a real browser (24 Nov 2026), against a local copy or production:
//
//   node tools/verify-integrators.mjs --base https://whyhumanoid.com [--api https://<worker>]
//
// Anonymous access; filters (each one, combinations, search, clear, empty state, address state, back button); the
// comparison table following the filters; keyboard reach; no horizontal scroll at 320/375/390/430 px; every profile
// page and every earlier address; with --api, the backend serving the same 28 providers and 26 fields (a site release
// is not proof that the Worker and its data import are fresh). Prints one line per failed check.

import { createRequire } from 'node:module';

// Playwright from the environment (NODE_PATH), as tools/verify-staging.mjs loads it.
const { chromium } = createRequire(import.meta.url)('playwright');

const arg = (n, d = null) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const BASE = arg('--base', 'http://127.0.0.1:8799').replace(/\/$/, '');
const API = arg('--api');
let passed = 0;
const failed = [];
const check = (ok, label) => { if (ok) passed += 1; else failed.push(label); };

const atlas = await (await fetch(`${BASE}/data/integrators/atlas.json`)).json();
const N = atlas.providers.length;
const expect = (f) => atlas.providers.filter((p) => (!f.counted || p.status === 'humanoid') && Object.entries(f).every(([k, v]) => {
  if (k === 'counted' || k === 'q') return true;
  if (k === 'evidence') return p.group === v;
  return p.tags[{ role: 'roles', service: 'services', platform: 'platforms', sector: 'sectors', territory: 'territories' }[k]].includes(v);
})).length;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const res = await page.goto(`${BASE}/integrators/`, { waitUntil: 'load' });
check(res.status() === 200, '/integrators/ answers 200 without an account');
check(await page.isVisible('#if'), 'the filter form shows once the script runs');
const countText = () => page.textContent('#if-count');
const visible = () => page.$$eval('.ip[data-id]', (els) => els.filter((e) => !e.hidden).length);
const visibleRows = () => page.$$eval('.cmp-t tr[data-id]', (els) => els.filter((e) => !e.hidden).length);
check((await countText()).trim() === `${N} providers`, `count shows ${N} providers`);
check(await visible() === N, 'every provider card is shown');

const apply = async (f) => {
  await page.click('#if-clear');
  for (const [k, v] of Object.entries(f)) {
    if (k === 'q') await page.fill('#if-q', v);
    else if (k === 'counted') await page.check('#if-counted');
    else await page.selectOption(`#if-${k}`, v);
  }
  await page.waitForTimeout(250);
};
const combos = [
  { role: 'integration' }, { role: 'training' }, { service: 'teleoperation' }, { platform: 'unitree-g1' },
  { platform: 'agility', territory: 'north-america' }, { sector: 'manufacturing', territory: 'spain' },
  { evidence: 'corroborated_project' }, { evidence: 'simulation' }, { counted: true }, { counted: true, role: 'software' },
  { service: 'safety', platform: 'unitree' },
];
for (const f of combos) {
  await apply(f);
  const want = expect(f);
  const got = await visible();
  check(got === want, `filter ${JSON.stringify(f)}: ${got} shown, ${want} expected`);
  check(await visibleRows() === want, `comparison table follows ${JSON.stringify(f)}`);
  check((await countText()).includes(`Showing ${want} of ${N}`), `count text for ${JSON.stringify(f)}`);
}
await apply({ evidence: 'simulation' });
check(await page.isHidden('ul[data-list="counted"]') && await page.isVisible('#p-ca3'), 'CA3 alone, under "not counted"');
await apply({ q: 'Seseña' });
const ses = await page.$$eval('.ip[data-id]', (els) => els.filter((e) => !e.hidden).map((e) => e.dataset.id).sort());
check(JSON.stringify(ses) === JSON.stringify(['int_bleu', 'int_innov8']), `search "Seseña" finds Bleu and Innov8 (${ses})`);
await apply({ q: 'synergy tech' });
check((await visible()) === 1 && await page.isVisible('#p-syntech'), 'search by canonical name');

// Empty state and clear.
await apply({ platform: 'nao', territory: 'japan' });
check(await visible() === 0 && await page.isVisible('#if-empty'), 'empty state when nothing matches');
await page.click('#if-empty button');
await page.waitForTimeout(200);
check(await visible() === N && await page.isHidden('#if-empty'), 'clear from the empty state shows everything');

// Address state, reload and back.
await apply({ role: 'support' });
await page.selectOption('#if-territory', 'japan');
await page.waitForTimeout(200);
const url = page.url();
check(/role=support/.test(url) && /territory=japan/.test(url), 'filters live in the address');
await page.reload({ waitUntil: 'load' });
check(await page.inputValue('#if-role') === 'support' && await page.inputValue('#if-territory') === 'japan', 'a reload keeps the filters');
check(await visible() === expect({ role: 'support', territory: 'japan' }), 'a reload shows the same providers');
await page.goBack();
await page.waitForTimeout(250);
check(await page.inputValue('#if-territory') === '', 'back restores the previous filters');

// Keyboard: every control reachable in order.
await page.goto(`${BASE}/integrators/`, { waitUntil: 'load' });
await page.focus('#if-q');
const order = [];
for (let i = 0; i < 9; i += 1) { order.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.name)); await page.keyboard.press('Tab'); }
check(['if-q', 'if-role', 'if-service', 'if-platform', 'if-sector', 'if-territory', 'if-evidence', 'if-counted', 'if-clear'].every((id) => order.includes(id)), `keyboard reaches every control (${order.join(', ')})`);
check(errors.length === 0, `no script errors (${errors.join('; ')})`);

// Narrow screens: no horizontal page scroll.
for (const w of [320, 375, 390, 430]) {
  for (const path of ['/integrators/', '/companies/innov8-robotics/', '/companies/ca3/']) {
    const m = await browser.newPage({ viewport: { width: w, height: 800 } });
    await m.goto(`${BASE}${path}`, { waitUntil: 'load' });
    const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(over <= 0, `${path} at ${w}px: no horizontal scroll (${over}px)`);
    await m.close();
  }
}
await browser.close();

// Every profile and every earlier address, anonymously.
const category = await (await fetch(`${BASE}/integrators/`)).text();
for (const p of atlas.providers) {
  const anchor = `p-${p.id.replace(/^int_/, '').replace(/_/g, '-')}`;
  const path = category.match(new RegExp(`id="${anchor}"[\\s\\S]*?<h3><a href="(/companies/[^"]+/)">`))?.[1];
  check(Boolean(path), `${p.id} linked from /integrators/`);
  if (!path) continue;
  const r = await fetch(`${BASE}${path}`);
  const html = await r.text();
  check(r.status === 200 && html.includes('Integrator profile') && html.includes(p.display_name.replace(/&/g, '&amp;')), `${p.id}: profile at ${path}`);
}
for (const slug of ['syntech', 'mine', 'bravo', 'intec', 'bumerania', 'amerevo', 'rh-bots']) {
  const r = await fetch(`${BASE}/companies/${slug}/`);
  check(r.status === 200 && (await r.text()).includes('Integrator profile'), `earlier address /companies/${slug}/ still serves its profile`);
}

// Backend freshness, separately from the site.
if (API) {
  const prev = await (await fetch(`${API}/v1/datasets/integrators/preview`)).json();
  check(prev.total_rows === N && prev.rows?.length === N, `API serves ${N} providers to visitors (${prev.total_rows})`);
  check(Object.keys(prev.rows?.[0] ?? {}).filter((k) => !k.startsWith('_') && k !== 'id').length >= 26, 'API rows carry the 26 fields');
  const ids = new Set((prev.rows ?? []).map((r) => r.provider_id));
  check(atlas.providers.every((p) => ids.has(p.id)), 'API provider ids match the site');
  const full = await fetch(`${API}/v1/datasets/integrators`);
  check(full.status === 200, 'API full rows are free without a session');
  const s = await (await fetch(`${API}/v1/search?q=${encodeURIComponent('Synergy Tech')}`)).json();
  check((s.results ?? []).some((x) => x.category === 'integrators' && /Synergy Tech/.test(x.title)), 'API search finds Synergy Tech by its canonical name');
}

if (failed.length) {
  console.error(`Integrators check FAILED (${failed.length} of ${passed + failed.length}):\n- ${failed.join('\n- ')}`);
  process.exit(1);
}
console.log(`Integrators check passed: ${passed} checks (${BASE}${API ? `, API ${API}` : ''}).`);
