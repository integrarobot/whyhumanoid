// Headless check of the Components product pages (26 Nov 2026). Run from tools/: node verify-components.mjs
//   1. Every product and software page names the API it asks for the full passport (data-api = API_ORIGIN): without it the
//      browser would ask this static site, which has no API, and a subscriber's passport would stay locked.
//   2. On a product page, a subscriber's session (the app's wh_session) fetches the complete rows from that API with the
//      session as Bearer, and the public summary is replaced by the full passport: specifications, sources, no lock.
//   3. Without a session nothing is fetched and the public summary stays.
//   4. /components/ shows the evolution chart, then the explorer, then the offer.
import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { API_ORIGIN } from './build-app.mjs';

const root = new URL('../', import.meta.url);
const failures = [];
const fail = (m) => failures.push(m);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const pages = readdirSync(new URL('components/', root)).filter((d) => /^cmp-[a-z]{3}-\d{3,}$/.test(d)).map((d) => new URL(`components/${d}/index.html`, root)).filter((u) => existsSync(u));
if (!pages.length) fail('no component pages found');
for (const u of pages) {
  const html = readFileSync(u, 'utf8');
  const m = html.match(/<div class="cx cx-prod[^"]*" id="cx"[^>]*>/);
  if (!m) { fail(`${u.pathname}: no product root`); continue; }
  if (!m[0].includes(`data-api="${API_ORIGIN}"`)) fail(`${u.pathname}: product root does not name the API (${m[0]})`);
}

// 4. The category page keeps its order (27 Nov 2026): evolution chart, then the explorer, then the offer.
{
  const html = readFileSync(new URL('components/index.html', root), 'utf8');
  const at = (id) => html.indexOf(`id="${id}"`);
  const [evo, exp, off] = ['evolution', 'explore', 'offer'].map(at);
  if (evo < 0 || exp < 0 || off < 0 || !(evo < exp && exp < off)) fail(`components/index.html: order must be evolution < explore < offer (${evo}, ${exp}, ${off})`);
}

const core = readFileSync(new URL('assets/components-core.js', root), 'utf8');
const app = readFileSync(new URL('assets/components.js', root), 'utf8');
const SPEC = 'peak_torque | 22 | N·m | peak, not continuous | https://maker.example.com/sheet.pdf | p. 1 | 2026-11-26';

async function open(id, session) {
  const html = readFileSync(new URL(`components/${id.toLowerCase()}/index.html`, root), 'utf8').replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { url: `https://whyhumanoid.com/components/${id.toLowerCase()}/`, runScripts: 'outside-only' });
  const w = dom.window;
  const calls = [];
  w.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), auth: init.headers?.authorization ?? null });
    if (!String(url).startsWith(`${API_ORIGIN}/v1/datasets/`)) return { status: 404, json: async () => ({ error: 'not_found' }) };
    const ds = String(url).includes('/component-software') ? 'component-software' : 'hardware';
    const rows = ds === 'hardware' ? [{ component_id: id, name: 'Full row', group: 'Commercial', family: 'Actuator', component_class: 'actuator', function: 'Drives a joint.', technical_specifications: SPEC, sources: 'Datasheet\nhttps://maker.example.com/sheet.pdf\nAccessed: 26 Nov 2026', review_status: 'Original sources checked 2026-11-26', evidence_scope: 'manufacturer_datasheet', checked_at: '2026-11-26' }] : [];
    return { status: 200, json: async () => ({ rows }) };
  };
  if (session) w.localStorage.setItem('wh_session', session);
  w.eval(core);
  w.eval(app);
  await wait(50);
  return { w, d: w.document, calls };
}

const id = 'CMP-ACT-001';
if (existsSync(new URL(`components/${id.toLowerCase()}/index.html`, root))) {
  const sub = await open(id, 'whs_fake');
  const hw = sub.calls.find((c) => c.url.includes('/v1/datasets/hardware'));
  if (!hw) fail('subscriber: the complete rows were not requested');
  else {
    if (!hw.url.startsWith(`${API_ORIGIN}/v1/datasets/hardware`)) fail(`subscriber: rows requested from ${hw.url}, not the API`);
    if (hw.auth !== 'Bearer whs_fake') fail('subscriber: the session was not sent as Bearer');
  }
  const pp = sub.d.querySelector('.pp');
  if (!pp || pp.classList.contains('pp-summary')) fail('subscriber: the public summary was not replaced by the full passport');
  if (!sub.d.querySelector('table.specs') || !/22<\/b> N·m/.test(sub.d.querySelector('table.specs')?.innerHTML ?? '')) fail('subscriber: specifications are not shown');
  if (sub.d.querySelector('.pp-lockbox') && !sub.d.querySelector('.pp-lockbox').hidden) fail('subscriber: the lock box is still shown');
  const visitor = await open(id, null);
  if (visitor.calls.length) fail('visitor: something was fetched without a session');
  if (!visitor.d.querySelector('.pp.pp-summary')) fail('visitor: the public summary is missing');
} else fail(`${id}: page missing`);

if (failures.length) {
  console.error(`Components page check FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Components page check passed: ${pages.length} product and software pages name the API; a subscriber's session upgrades a product page to the full passport; visitors fetch nothing.`);
