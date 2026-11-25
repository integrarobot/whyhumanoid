// Headless checks of the premium app (server/public). Run from tools/: node verify-premium-app.mjs
//   1. A one-time sign-in link is redeemed only after a click, so mail scanners that open links cannot use it up.
//   2. Access (24 Nov 2026): without an active subscription the app asks only for the public rows (every record at its
//      public fields) and says the other fields come with the subscription; with one it asks for the full rows with the
//      session, and every card shows every field.
//   3. Global search.  4. Company pages list each linked robot with its best recorded status (plans are not use).
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../server/public/index.html', import.meta.url), 'utf8').replace(/<script[^>]*src="[^"]*premium.js"[^>]*><\/script>/, '');
const js = readFileSync(new URL('../server/public/premium.js', import.meta.url), 'utf8');
const failures = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FIELDS = ['record_id', 'organization_name', 'manufacturer', 'robot_model', 'operational_status', 'task_description', 'site_name', 'country', 'source_url', 'open_questions_notes'];
// The public fields of a Deployments record (server/src/access/fields.js), as the API serves them to visitors.
const PUBLIC = ['record_id', 'organization_id', 'organization_name', 'organization_role', 'organization_country', 'deployment_id', 'manufacturer', 'robot_model', 'robot_version', 'sector', 'country', 'task_category', 'operational_status', 'verification_status', 'source_title', 'source_url', 'source_publisher', 'publication_date'];
const publicRow = (i) => Object.fromEntries(Object.entries(row(i)).filter(([k]) => k === 'id' || PUBLIC.includes(k)));
const row = (i) => Object.fromEntries([['id', `fx_row_${i}`], ...FIELDS.map((f) => [f, f === 'source_url' ? `https://example.com/${i}` : f === 'operational_status' ? (i === 2 ? 'planned' : 'pilot') : `fx_${f}_${i}`])]);

// What the API answers to a search: 25 synthetic results for a subscriber, 3 public ones otherwise; none for "zzz".
function searchBody(p, isFull) {
  const total = p.get('q') === 'zzz' ? 0 : isFull ? 25 : 3;
  const page = Number(p.get('page') || 1);
  const n = Math.max(0, Math.min(20, total - (page - 1) * 20));
  const tags = (p.get('tags') || '').split(',').filter(Boolean);
  return {
    scope: isFull ? 'full' : 'preview', query: p.get('q'), terms: [], total, page, pages: Math.max(1, Math.ceil(total / 20)), page_size: 20,
    results: Array.from({ length: n }, (_, i) => ({ category: 'deployments', category_title: 'Deployments', id: `fx_${i}`, title: `Result ${(page - 1) * 20 + i + 1}`, subtitle: 'fx', link: `deployments/fx_${i}`, snippet: { label: 'task description', text: 'Move totes <b>', marks: [[5, 10]] } })),
    facets: total ? [{ id: 'sector', label: 'Sector', values: [{ id: 'sector:automotive', label: 'Automotive', count: 2, active: tags.includes('sector:automotive') }] }] : [],
    categories: total ? [{ id: 'deployments', title: 'Deployments', count: total, active: false }] : [],
    active: tags.map((t) => ({ id: t, label: 'Automotive', facet: 'Sector' })), category: null,
  };
}

// Relations graph: one company runs robot 1 in a pilot (row 1) and has only a planned record for robot 2 (row 2).
function relationsBody() {
  return {
    scope: 'full', snapshot: 'fx',
    robots: [{ id: 1, robot: 'FxBot One', lab: 'FxLab', maker: 'mfr_fx', slug: 'fx-1' }, { id: 2, robot: 'FxBot Two', lab: 'FxLab', maker: 'mfr_fx', slug: 'fx-2' }],
    companies: [{ id: 'org_fx_user', name: 'Fx User Co', roles: { customer_operator: 2 }, organization_ids: ['org_fx_user'], identity: 'sheet_organization_id' },
      { id: 'mfr_fx', name: 'FxLab', roles: { maker: 2 }, identity: 'catalogue_lab', robots: [1, 2] }],
    records: [1, 2].map((i) => ({ record_id: `fx_record_id_${i}`, deployment_id: `fx_dep_${i}`, robot: i, level: 'model', maker: 'mfr_fx', operator: 'org_fx_user', role: 'customer_operator' })),
    coverage: {},
  };
}

const softwareRows = () => Array.from({ length: 141 }, (_, i) => ({ id: `sw_${i}`, list: i < 121 ? 'software' : 'world_model', name: i === 0 || i === 121 ? 'Lightwheel' : `Fx tool ${i}`, url: `https://example.com/sw${i}`, canonical: !(i >= 121 && i < 124) }));

function app({ url, active, session, oldApi = false }) {
  const calls = [];
  // As built by tools/build-app.mjs: the page embeds the public field contract next to the page links.
  const page = oldApi ? html.replace('</body>', `<script type="application/json" id="wh-pages">${JSON.stringify({ companies: {}, public_fields: { deployments: PUBLIC } })}</script></body>`) : html;
  const dom = new JSDOM(page, { url, runScripts: 'outside-only' });
  const w = dom.window;
  if (session) w.localStorage.setItem('wh_session', session);
  w.fetch = async (path, opts = {}) => {
    calls.push({ path, method: opts.method ?? 'GET', auth: opts.headers?.authorization ?? null });
    const datasets = [{ id: 'deployments', title: 'Deployments', description: 'fx' }, { id: 'humanoids', title: 'Humanoid robots' }, { id: 'software', title: 'Software and world models', description: 'fx' }];
    const body = path === '/v1/datasets' ? { datasets }
      : path === '/v1/billing/plan' ? { plan: { price: 'US$100 per year' }, checkout_available: true }
      : path === '/v1/auth/redeem' ? { token: 'whs_fake' }
      : path === '/v1/me' ? { email: 'a@example.com', access: active ? { active: true, status: 'active', current_period_end: 1893456000 } : { active: false, status: 'none' }, checkout_available: true, billing_portal: Boolean(active) }
      : path.startsWith('/v1/datasets/deployments/preview') ? (oldApi ? { rows: Array.from({ length: 10 }, (_, i) => row(i + 1)), total_rows: 119, preview_rows: 10, dataset: datasets[0] } : { rows: Array.from({ length: 119 }, (_, i) => publicRow(i + 1)), total_rows: 119, preview_rows: 'all', public_fields: PUBLIC, dataset: datasets[0] })
      : path.startsWith('/v1/datasets/deployments?') ? { rows: Array.from({ length: 119 }, (_, i) => row(i + 1)), total: 119, dataset: datasets[0] }
      // A directory tab: 141 rows, 138 canonical entries (3 world-model rows are memberships of software entries).
      : path.startsWith('/v1/datasets/software/preview') ? { rows: softwareRows(), total_rows: 141, entries: 138, preview_rows: 'all', public_fields: null, dataset: datasets[2] }
      : path.startsWith('/v1/datasets/software?') ? { rows: softwareRows(), total: 141, entries: 138, dataset: datasets[2] }
      : path === '/v1/relations' ? relationsBody()
      : path.startsWith('/v1/search?') ? searchBody(new URLSearchParams(path.split('?')[1]), Boolean(opts.headers?.authorization) && active)
      : { rows: [], total_rows: 0, dataset: datasets[1] };
    return { status: 200, json: async () => body };
  };
  w.HTMLDialogElement && (w.HTMLDialogElement.prototype.showModal ??= function () { this.setAttribute('open', ''); });
  w.Element.prototype.scrollIntoView ??= function () {}; // jsdom has no layout
  w.eval(js);
  return { w, d: w.document, calls, dom };
}

// 1. Sign-in link redeemed only on click.
{
  const { w, d, calls, dom } = app({ url: 'https://test.example/#login=whl_fake' });
  await wait(250);
  const before = { confirmVisible: !d.getElementById('confirm-login').hidden, anonHidden: d.getElementById('acc-anon').hidden, userHidden: d.getElementById('acc-user').hidden, redeemCalled: calls.some((c) => c.path.includes('redeem')), tokenGone: !w.location.hash.includes('login=') };
  d.getElementById('confirm-login-btn').click();
  await wait(250);
  const after = { redeemCalled: calls.filter((c) => c.path.includes('redeem')).length, confirmHidden: d.getElementById('confirm-login').hidden, sessionStored: w.localStorage.getItem('wh_session') === 'whs_fake', who: d.getElementById('who').textContent };
  if (!before.confirmVisible) failures.push('confirm panel not shown');
  if (!before.anonHidden) failures.push('sign-in form shown while a link is pending');
  if (!before.userHidden) failures.push('account panel shown before sign-in');
  if (before.redeemCalled) failures.push('link redeemed without a click');
  if (!before.tokenGone) failures.push('token left in the address bar');
  if (after.redeemCalled !== 1 || !after.sessionStored || !after.confirmHidden || after.who !== 'a@example.com') failures.push(`click did not sign in: ${JSON.stringify(after)}`);
  dom.window.close();
}

// 2a. Signed in without a subscription: every record at its public fields, the rest named as paid, subscribe offered.
{
  const { d, calls, dom } = app({ url: 'https://test.example/#deployments', session: 'whs_fake', active: false });
  await wait(300);
  const rows = d.querySelectorAll('#db-rows tr.r').length;
  if (rows !== 119) failures.push(`unpaid: ${rows} rows shown, expected every public record`);
  if (!/Every field.*119 entries.*data subscription/.test(d.querySelector('#db-more:not([hidden])')?.textContent ?? '')) failures.push('unpaid: the paid fields are not named');
  if (/No task description in the sheet|No metric in the sheet/.test(d.getElementById('db-rows')?.textContent ?? '')) failures.push('unpaid: a paid field is shown as missing from the sheet');
  if (/fx_(claim_text|site_name|task_description)_/.test(d.body.textContent)) failures.push('unpaid: a paid value is on the page');
  if (d.querySelector('#db-more')?.closest('.db-scroll, table')) failures.push('unpaid: subscription notice inside the table scroll');
  if (calls.some((c) => /^\/v1\/datasets\/deployments\?/.test(c.path))) failures.push('unpaid: full rows requested');
  if (d.getElementById('checkout').hidden || d.getElementById('checkout').disabled) failures.push('unpaid: subscribe button not offered');
  dom.window.close();
}

// 2a'. An API older than 24 Nov 2026 (first 10 rows in full, no field contract): visitors still see public fields only.
{
  const { d, dom } = app({ url: 'https://test.example/#deployments', session: 'whs_fake', active: false, oldApi: true });
  await wait(300);
  if (d.querySelectorAll('#db-rows tr.r').length !== 10) failures.push('old API: rows not shown');
  if (/fx_(claim_text|site_name|task_description|metric_value)_/.test(d.body.textContent)) failures.push('old API: a paid value reaches the visitor view');
  dom.window.close();
}

// 2b. Subscriber: full rows with the session, every card complete, portal offered, no locked row.
{
  const { d, calls, dom } = app({ url: 'https://test.example/#deployments', session: 'whs_fake', active: true });
  await wait(300);
  const trs = [...d.querySelectorAll('#db-rows tr.r')];
  if (trs.length !== 119) failures.push(`subscriber: ${trs.length} rows shown, expected 119`);
  if (!calls.some((c) => /^\/v1\/datasets\/deployments\?limit=/.test(c.path) && c.auth === 'Bearer whs_fake')) failures.push('subscriber: full rows not requested with the session');
  if (d.querySelector('#db-more:not([hidden])')) failures.push('subscriber: subscription notice shown');
  if (d.getElementById('portal').hidden) failures.push('subscriber: manage subscription not offered');
  let bad = 0;
  for (const tr of [trs[0], trs[118]]) {
    tr.querySelector('button.db-open').click();
    const dds = [...d.querySelectorAll('#db-dlg-body dd[data-f]')];
    const r = row(+tr.dataset.i + 1);
    if (dds.length !== FIELDS.length || dds.some((dd) => dd.textContent !== String(r[dd.dataset.f]))) bad++;
    d.getElementById('db-dlg-close').click();
  }
  if (bad) failures.push('subscriber: a card does not show every field in full');
  dom.window.close();
}

// 3. Search: visitors ask without a session and see the free-data note; subscribers ask with it. The hash keeps the
// query, tags and page; chips toggle filters; snippets are escaped; no results says so; Back restores the search.
{
  const { w, d, calls, dom } = app({ url: 'https://test.example/app/?q=totes', active: false });
  await wait(300);
  const sc = calls.filter((c) => c.path.startsWith('/v1/search?'));
  if (!w.location.hash.startsWith('#search?q=totes')) failures.push(`search: ?q= did not open the search (${w.location.hash})`);
  if (!sc.length || sc.some((c) => c.auth)) failures.push('search: visitor search missing or sent with a session');
  if (d.querySelectorAll('.gs-res li').length !== 3) failures.push('search: visitor results not shown');
  if (!/Free search covers/.test(d.getElementById('db-panel').textContent)) failures.push('search: free-data note missing for visitors');
  if (d.getElementById('gs-jump').hidden || !/^3 results below/.test(d.getElementById('gs-jump').textContent)) failures.push('search: result count under the search box missing');
  if (d.querySelector('.gs-snip mark')?.textContent !== 'totes' || d.querySelector('.gs-snip b')) failures.push('search: snippet not highlighted or not escaped');
  d.querySelector('[data-tag="sector:automotive"]').click();
  await wait(200);
  if (!decodeURIComponent(w.location.hash).includes('tags=sector:automotive')) failures.push('search: tag chip did not update the address');
  if (!d.querySelector('[data-rm-tag="sector:automotive"]')) failures.push('search: active chip missing');
  d.querySelector('[data-clear]').click();
  await wait(200);
  if (w.location.hash.includes('tags=')) failures.push('search: clear all did not remove the filters');
  d.getElementById('gs-q').value = 'zzz';
  d.getElementById('gs-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await wait(200);
  if (!d.querySelector('.gs-none')) failures.push('search: no-results state missing');
  w.history.back();
  await wait(300);
  if (!w.location.hash.startsWith('#search?q=totes') || d.querySelectorAll('.gs-res li').length !== 3) failures.push(`search: Back did not restore the previous search (${w.location.hash})`);
  dom.window.close();
}
{
  const { d, calls, dom } = app({ url: 'https://test.example/#search?q=totes&page=2', session: 'whs_fake', active: true });
  await wait(300);
  const sc = calls.filter((c) => c.path.startsWith('/v1/search?'));
  if (!sc.length || sc.some((c) => c.auth !== 'Bearer whs_fake') || !sc.at(-1).path.includes('page=2')) failures.push('search: subscriber search not sent with the session and page');
  if (d.querySelectorAll('.gs-res li').length !== 5 || !d.querySelector('.gs-pager')) failures.push('search: subscriber page 2 not shown with its pager');
  if (/Free search covers/.test(d.getElementById('db-panel').textContent)) failures.push('search: free-data note shown to a subscriber');
  dom.window.close();
}

// 4. Company view (17 Nov 2026): a robot linked only by a planned record is listed with that status, never as in use.
{
  const { d, dom } = app({ url: 'https://test.example/#company/org_fx_user', session: 'whs_fake', active: true });
  await wait(400);
  const kv = [...d.querySelectorAll('#db-panel .rel-kv dt')].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent ?? '']);
  const robots = kv.find(([k]) => k === 'Robots in its records')?.[1] ?? '';
  if (kv.some(([k]) => /it uses/i.test(k))) failures.push('company: robots still labelled as in use');
  if (!/FxBot One by FxLab Pilot or trial/.test(robots) || !/FxBot Two by FxLab Announced/.test(robots)) failures.push(`company: robots not shown with their recorded status: ${robots}`);
  dom.window.close();
}


// 5. Directory counts (Codex, 25 Nov 2026, live check): the category list and the panel count canonical entries, for a
// visitor and a subscriber, after opening the tab, filtering it, and leaving and coming back. The rows note appears once.
for (const [label, opts] of [['visitor', {}], ['subscriber', { active: true, session: 'whs_fake' }]]) {
  const { w, d } = app({ url: 'https://test.example/#software', ...opts });
  await wait(400);
  const nav = () => d.querySelector('[data-n="software"]')?.textContent;
  const count = () => d.getElementById('db-count')?.textContent ?? '';
  const note = '138 entries (141 rows: 3 are the same entry in a second list)';
  if (nav() !== '138') failures.push(`${label}: software list count after opening is ${nav()}, not 138`);
  if (!count().startsWith(note) || count().split('141 rows').length !== 2) failures.push(`${label}: count line "${count()}" does not give the entries and the rows note once`);
  const q = d.getElementById('db-q');
  q.value = 'lightwheel'; q.dispatchEvent(new w.Event('input'));
  await wait(50);
  if (nav() !== '138') failures.push(`${label}: software list count after filtering is ${nav()}`);
  if (!/^1 of 138 entries \(2 rows: 1 is the same entry in a second list\) shown/.test(count())) failures.push(`${label}: filtered count line "${count()}"`);
  w.location.hash = '#deployments'; await wait(300);
  w.location.hash = '#software'; await wait(300);
  if (nav() !== '138') failures.push(`${label}: software list count after leaving and coming back is ${nav()}`);
  if (!count().startsWith(note)) failures.push(`${label}: count line after coming back "${count()}"`);
}

if (failures.length) {
  console.error(`Premium app check FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Premium app check passed: sign-in links are redeemed only on click; previews for non-subscribers, full rows and complete cards for subscribers; search sends the session only when there is one, keeps its state in the address and restores it on Back; company pages show each robot with its recorded status.');
process.exit(0);
