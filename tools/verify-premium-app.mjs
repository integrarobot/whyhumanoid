// Headless check of the premium app's sign-in: a one-time link is redeemed only after a click, so mail
// scanners that open links cannot use it up. Run from tools/: node verify-premium-app.mjs
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../server/public/index.html', import.meta.url), 'utf8').replace(/<script[^>]*src="\/premium.js"[^>]*><\/script>/, '');
const js = readFileSync(new URL('../server/public/premium.js', import.meta.url), 'utf8');
const calls = [];
const dom = new JSDOM(html, { url: 'https://test.example/#login=whl_fake', runScripts: 'outside-only' });
const w = dom.window;
w.fetch = async (path, opts = {}) => {
  calls.push(`${opts.method ?? 'GET'} ${path}`);
  const body = path === '/v1/datasets' ? { datasets: [{ id: 'humanoids', title: 'Humanoid robots' }] }
    : path === '/v1/billing/plan' ? { plan: { price: '€100 per year' }, checkout_available: false }
    : path === '/v1/auth/redeem' ? { token: 'whs_fake' }
    : path === '/v1/me' ? { email: 'a@b.c', access: { active: false } }
    : { rows: [], total_rows: 0, dataset: { id: 'humanoids', title: 'Humanoid robots' } };
  return { status: 200, json: async () => body };
};
w.eval(js);
await new Promise((r) => setTimeout(r, 200));
const d = w.document;
const before = { confirmVisible: !d.getElementById('confirm-login').hidden, signinHidden: d.getElementById('signin').hidden, subscribeHidden: d.getElementById('subscribe').hidden, redeemCalled: calls.some((c) => c.includes('redeem')), hashCleared: !w.location.hash };
d.getElementById('confirm-login-btn').click();
await new Promise((r) => setTimeout(r, 200));
const after = { redeemCalled: calls.filter((c) => c.includes('redeem')).length, confirmHidden: d.getElementById('confirm-login').hidden, sessionStored: w.sessionStorage.getItem('wh_session') === 'whs_fake', who: d.getElementById('who').textContent };
const failures = [];
if (!before.confirmVisible) failures.push('confirm panel not shown');
if (!before.signinHidden) failures.push('sign-in form shown while a link is pending');
if (!before.subscribeHidden) failures.push('subscribe panel shown before sign-in');
if (before.redeemCalled) failures.push('link redeemed without a click');
if (!before.hashCleared) failures.push('token left in the address bar');
if (after.redeemCalled !== 1 || !after.sessionStored || !after.confirmHidden) failures.push(`click did not sign in: ${JSON.stringify(after)}`);
dom.window.close();
if (failures.length) { console.error(`Premium app check FAILED:\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log('Premium app check passed: sign-in links are redeemed only on click.');
process.exit(0);
