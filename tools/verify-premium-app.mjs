// Headless checks of the premium app (server/public). Run from tools/: node verify-premium-app.mjs
//   1. A one-time sign-in link is redeemed only after a click, so mail scanners that open links cannot use it up.
//   2. Paywall (16 Nov 2026): without an active subscription the app asks only for the public preview and shows the
//      locked remainder; with one it asks for the full rows with the session, and every card shows every field.
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../server/public/index.html', import.meta.url), 'utf8').replace(/<script[^>]*src="[^"]*premium.js"[^>]*><\/script>/, '');
const js = readFileSync(new URL('../server/public/premium.js', import.meta.url), 'utf8');
const failures = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FIELDS = ['record_id', 'organization_name', 'manufacturer', 'robot_model', 'operational_status', 'task_description', 'site_name', 'country', 'source_url', 'open_questions_notes'];
const row = (i) => Object.fromEntries([['id', `fx_row_${i}`], ...FIELDS.map((f) => [f, f === 'source_url' ? `https://example.com/${i}` : f === 'operational_status' ? 'pilot' : `fx_${f}_${i}`])]);

function app({ url, active, session }) {
  const calls = [];
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  const w = dom.window;
  if (session) w.localStorage.setItem('wh_session', session);
  w.fetch = async (path, opts = {}) => {
    calls.push({ path, method: opts.method ?? 'GET', auth: opts.headers?.authorization ?? null });
    const datasets = [{ id: 'deployments', title: 'Deployments', description: 'fx' }, { id: 'humanoids', title: 'Humanoid robots' }];
    const body = path === '/v1/datasets' ? { datasets }
      : path === '/v1/billing/plan' ? { plan: { price: '€100 per year' }, checkout_available: true }
      : path === '/v1/auth/redeem' ? { token: 'whs_fake' }
      : path === '/v1/me' ? { email: 'a@example.com', access: active ? { active: true, status: 'active', current_period_end: 1893456000 } : { active: false, status: 'none' }, checkout_available: true, billing_portal: Boolean(active) }
      : path.startsWith('/v1/datasets/deployments/preview') ? { rows: Array.from({ length: 10 }, (_, i) => row(i + 1)), total_rows: 119, preview_rows: 10, dataset: datasets[0] }
      : path.startsWith('/v1/datasets/deployments?') ? { rows: Array.from({ length: 119 }, (_, i) => row(i + 1)), total: 119, dataset: datasets[0] }
      : { rows: [], total_rows: 0, dataset: datasets[1] };
    return { status: 200, json: async () => body };
  };
  w.HTMLDialogElement && (w.HTMLDialogElement.prototype.showModal ??= function () { this.setAttribute('open', ''); });
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

// 2a. Signed in without a subscription: preview only, locked remainder, subscribe offered.
{
  const { d, calls, dom } = app({ url: 'https://test.example/#deployments', session: 'whs_fake', active: false });
  await wait(300);
  const rows = d.querySelectorAll('#db-rows tr.r').length;
  if (rows !== 10) failures.push(`unpaid: ${rows} rows shown, expected the 10-row preview`);
  if (!/109 more entries/.test(d.querySelector('#db-rows tr.lock')?.textContent ?? '')) failures.push('unpaid: locked remainder not shown');
  if (calls.some((c) => /^\/v1\/datasets\/deployments\?/.test(c.path))) failures.push('unpaid: full rows requested');
  if (d.getElementById('checkout').hidden || d.getElementById('checkout').disabled) failures.push('unpaid: subscribe button not offered');
  dom.window.close();
}

// 2b. Subscriber: full rows with the session, every card complete, portal offered, no locked row.
{
  const { d, calls, dom } = app({ url: 'https://test.example/#deployments', session: 'whs_fake', active: true });
  await wait(300);
  const trs = [...d.querySelectorAll('#db-rows tr.r')];
  if (trs.length !== 119) failures.push(`subscriber: ${trs.length} rows shown, expected 119`);
  if (!calls.some((c) => /^\/v1\/datasets\/deployments\?limit=/.test(c.path) && c.auth === 'Bearer whs_fake')) failures.push('subscriber: full rows not requested with the session');
  if (d.querySelector('#db-rows tr.lock')) failures.push('subscriber: locked row shown');
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

if (failures.length) {
  console.error(`Premium app check FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Premium app check passed: sign-in links are redeemed only on click; previews for non-subscribers, full rows and complete cards for subscribers.');
process.exit(0);
