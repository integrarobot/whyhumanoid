#!/usr/bin/env node
// End-to-end check of the custom report flow in a real browser (Playwright), against local staging
// (node server/scripts/staging-local.mjs: the real API and app, Stripe simulated with signed test events, nothing charged).
//   node tools/verify-orders.mjs [--base http://localhost:8788]
// Covers: the wording before payment; payment -> questionnaire; draft saved and restored after a reload and after the
// browser is closed and the buyer signs in again; review; submit with a fixed deadline; a repeated submit that changes
// nothing; the confirmation and operator emails (no answers in the operator email); a delayed webhook reconciled on
// return; the order help line only after payment; leaving the questionnaire right after typing, with a slow or failed draft save, loses nothing and throws nothing; a cancelled checkout; another account denied; the operator queue and delivery record; phones (375 and 390 px)
// without horizontal scroll and with the buttons reachable by keyboard.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { SUPPORT_EMAIL } from '../server/src/support.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', 'http://localhost:8788').replace(/\/$/, '');
const failures = [];
let passed = 0;
const check = (ok, msg) => { if (ok) passed += 1; else failures.push(msg); };
const BEFORE = 'US$1,000 · one-off payment · no subscription required. After payment, complete a private questionnaire about your company. We will email your report within 24 hours of receiving your completed questionnaire.';

const browser = await chromium.launch();
async function signIn(ctx, email) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app/#reports`, { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.click('#signin-form button');
  await page.waitForTimeout(400);
  const link = await (await fetch(`${BASE}/dev/magic?email=${encodeURIComponent(email)}`)).text();
  // A fresh load (not a hash change on the open page), as when the email link is clicked.
  await page.goto('about:blank');
  await page.goto(link.trim().replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'networkidle' });
  await page.click('#confirm-login-btn');
  await page.waitForSelector('#who:not([hidden])');
  return page;
}
const token = (page) => page.evaluate(() => localStorage.getItem('wh_session'));
const apiAs = async (page, path, method = 'GET', body) => {
  const t = await token(page);
  const r = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${t}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const noScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

const buyerEmail = `buyer-${Date.now()}@example.com`;
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
let page = await signIn(ctxA, buyerEmail);
await page.goto(`${BASE}/app/#reports`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ord-card');
check((await page.textContent('#db-panel')).includes(BEFORE), 'reports: the wording before payment is shown exactly');
check((await page.$$('.ord-card')).length === 2, 'reports: two services');
// The order help line appears only after payment (Javier, 25 Nov 2026): not on the catalogue nor while payment is pending.
const HELP = 'Questions about an order:';
check(!(await page.textContent('#db-panel')).includes(HELP), 'help: no order help line on the catalogue before payment');

// 1. Pay for the Robot integration diagnostic.
await page.click('.ord-buy[data-service="humanoid-adoption-assessment"]');
await page.waitForURL(/dev\/report-checkout/);
await page.click('#pay');
await page.waitForSelector('#q-form', { timeout: 20000 });
check(/Payment confirmed/.test(await page.textContent('#status')), 'return: payment confirmed notice');
const orderId = /#reports\/(ord_[\w-]+)/.exec(page.url())?.[1];
check(Boolean(orderId), 'return: lands on the order');
check(/24 hours start when you submit it/.test(await page.textContent('#db-panel')), 'questionnaire: the clock is explained');
check((await page.textContent('#db-panel')).includes(HELP) && Boolean(await page.$(`#db-panel a[href="mailto:${SUPPORT_EMAIL}"]`)), 'help: the order help line, with the customer-support address, is on the paid questionnaire');

// 2. Draft saved, restored after reload.
await page.fill('#q-company_name', 'Example Manufacturing Ltd');
await page.fill('#q-process_problem', 'Manual tote handling at the end of the packing line.');
await page.waitForFunction(() => /^saved /.test(document.getElementById('q-saved')?.textContent || ''), null, { timeout: 10000 });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#q-form');
check(await page.inputValue('#q-company_name') === 'Example Manufacturing Ltd', 'draft: restored after reload');

// 3. Browser closed: a new browser, a new sign-in, the order and draft are there.
await ctxA.close();
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
page = await signIn(ctxB, buyerEmail);
await page.goto(`${BASE}/app/#reports`, { waitUntil: 'networkidle' });
await page.waitForSelector(`a[href="#reports/${orderId}"]`);
await page.click(`a[href="#reports/${orderId}"]`);
await page.waitForSelector('#q-form');
check(await page.inputValue('#q-process_problem') === 'Manual tote handling at the end of the packing line.', 'recovery: the draft survives a closed browser');

// 4. Review with missing answers, then complete every required answer and submit.
await page.click('#q-review');
await page.waitForSelector('#q-back');
check(/required answers? (is|are) missing/.test(await page.textContent('#db-panel')), 'review: missing answers are listed');
check(!(await page.$('#q-submit')), 'review: no submit while answers are missing');
await page.click('#q-back');
await page.waitForSelector('#q-form');
const form = (await apiAs(page, '/v1/reports/questionnaire/humanoid-adoption-assessment')).data;
for (const f of form.fields) {
  if (!f.required || ['company_name', 'process_problem'].includes(f.id)) continue;
  if (f.kind === 'select') await page.selectOption(`#q-${f.id}`, f.options[0][0]);
  else if (f.kind === 'tasks') await page.fill('#q-tasks-0', 'Pick 8 kg totes from a conveyor and stack them on a pallet; about 300 an hour; cycle time unknown.');
  else if (f.kind === 'ack') await page.check(`#q-${f.id}`);
  else if (f.unknown) await page.click(`.q-unknown[data-for="q-${f.id}"]`);
  else await page.fill(`#q-${f.id}`, `Synthetic answer for ${f.label}`);
}
await page.click('#q-review');
await page.waitForSelector('#q-submit');
check((await page.textContent('#db-panel')).includes(HELP), 'help: the order help line is on the review screen');
const t0 = Math.floor(Date.now() / 1000);
await page.focus('#q-submit');
await page.keyboard.press('Enter');
await page.waitForSelector('.notice >> text=We received your completed questionnaire');
const submitted = (await apiAs(page, `/v1/reports/orders/${orderId}`)).data.order;
check(submitted.status === 'awaiting_report', `submit: status ${submitted.status}`);
check(submitted.due_at - submitted.submitted_at === 86400 && submitted.submitted_at >= t0 - 5, 'submit: due 24 hours after submission');
check((await page.textContent('#db-panel')).includes(submitted.due_utc), 'submit: the exact deadline is shown');
check((await page.textContent('#db-panel')).includes(HELP), 'help: the order help line is on the submitted order');
const again = await apiAs(page, `/v1/reports/orders/${orderId}/submit`, 'POST', { answers: { company_name: 'Changed' } });
check(again.data.already === true && again.data.order.due_at === submitted.due_at, 'repeat submit: nothing changes');
const mails = await (await fetch(`${BASE}/dev/mails`)).json();
const confirm = mails.find((m) => m.to === buyerEmail && /Questionnaire received/.test(m.subject));
check(Boolean(confirm) && confirm.text.includes(submitted.due_utc), 'email: confirmation with the deadline');
const opMail = mails.find((m) => m.to === 'orders@example.com' && m.subject.includes(orderId) && /submitted/.test(m.subject));
check(Boolean(opMail) && !opMail.text.includes('Example Manufacturing') && !opMail.text.includes('Pick 8 kg'), 'email: operator notified, without the answers');

// 4b. Leaving an order while it is still loading (Codex, TEST, 25 Nov 2026): a late response must not repaint the order
// over the newer view.
await page.route(/\/v1\/reports\/orders\/ord_[^/]+$/, async (route) => { await new Promise((r) => setTimeout(r, 900)); await route.continue(); });
await page.evaluate(() => { location.hash = '#reports'; });
await page.waitForFunction(() => document.getElementById('db-title')?.textContent.trim() === 'Custom reports');
await page.evaluate((id) => { location.hash = `#reports/${id}`; }, orderId);
await page.waitForTimeout(150);
await page.click('header a[href="#reports"]');
await page.waitForTimeout(1500);
check(new URL(page.url()).hash === '#reports' && (await page.textContent('#db-title')).trim() === 'Custom reports', `navigation: a late order response does not repaint over Custom reports (${new URL(page.url()).hash}, "${(await page.textContent('#db-title')).trim()}")`);
await page.unroute(/\/v1\/reports\/orders\/ord_[^/]+$/);

// 5. Delayed webhook: paid at Stripe, no event yet; the app reconciles on return.
await page.goto(`${BASE}/app/#reports`, { waitUntil: 'networkidle' });
await page.click('.ord-buy[data-service="component-manufacturing-study"]');
await page.waitForURL(/dev\/report-checkout/);
await page.click('#pay-silent');
await page.waitForSelector('#q-form', { timeout: 30000 });
check(/Payment confirmed/.test(await page.textContent('#status')), 'delayed webhook: confirmed by reconciliation');

// 5b. Leaving the questionnaire right after typing (Codex, 25 Nov 2026): the last answer is kept, and a draft response
// that arrives after leaving changes nothing on screen and throws nothing.
const order2 = /#reports\/(ord_[\w-]+)/.exec(page.url())?.[1];
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
// Errors inside async handlers surface as unhandled rejections, which the page records here (same document throughout).
await page.evaluate(() => {
  window.__errs = [];
  addEventListener('error', (e) => window.__errs.push(String(e.message)));
  addEventListener('unhandledrejection', (e) => window.__errs.push(String(e.reason?.message || e.reason)));
});
const scriptErrors = async () => [...pageErrors, ...(await page.evaluate(() => window.__errs))];
// Leaves at once, in the same task as the last action (a click through Playwright may wait for the link to settle).
const leave = async (before = '') => {
  await page.evaluate((sel) => { if (sel) document.querySelector(sel).click(); location.hash = '#reports'; }, before);
  await page.waitForFunction(() => document.getElementById('db-title')?.textContent.trim() === 'Custom reports');
};
const reopen = async () => {
  await page.evaluate((id) => { location.hash = `#reports/${id}`; }, order2);
  await page.waitForSelector('#q-form');
  return page.inputValue('#q-company_name');
};
// Typed, then left at once (before the 1.5 s autosave): the answer is sent on leaving and is there on return.
await page.fill('#q-company_name', 'Typed then left Ltd');
await leave();
check(await reopen() === 'Typed then left Ltd', 'draft: typing then leaving at once keeps the last answer');
// A slow draft response arriving after the visitor has left: no error, the newer view stays.
await page.route(/\/v1\/reports\/orders\/ord_[^/]+\/draft$/, async (route) => { await new Promise((r) => setTimeout(r, 900)); await route.continue(); });
await page.fill('#q-company_name', 'Slow save Ltd');
await leave('#q-save');
await page.waitForTimeout(1500);
const errs1 = await scriptErrors();
check(!errs1.length && (await page.textContent('#db-title')).trim() === 'Custom reports', `draft: a slow save after leaving throws nothing and repaints nothing (${errs1.join('; ') || 'no errors'})`);
await page.unroute(/\/v1\/reports\/orders\/ord_[^/]+\/draft$/);
check(await reopen() === 'Slow save Ltd', 'draft: the slow save landed');
// The connection drops while leaving: the answer is kept in the page and sent with the next save.
await page.route(/\/v1\/reports\/orders\/ord_[^/]+\/draft$/, (route) => route.abort());
await page.fill('#q-company_name', 'Offline Ltd');
await leave();
await page.unroute(/\/v1\/reports\/orders\/ord_[^/]+\/draft$/);
check(await reopen() === 'Offline Ltd', 'draft: an answer that could not be sent on leaving is still there on return');
await page.click('#q-save');
await page.waitForFunction(() => /^saved /.test(document.getElementById('q-saved')?.textContent || ''), null, { timeout: 10000 });
const saved2 = (await apiAs(page, `/v1/reports/orders/${order2}`)).data.order;
check(saved2.answers?.company_name === 'Offline Ltd', 'draft: the kept answer reaches the server with the next save');
const errs2 = await scriptErrors();
check(!errs2.length, `draft: no script errors (${errs2.join('; ')})`);

// 6. Cancelled checkout: nothing charged, said plainly.
const before = (await apiAs(page, '/v1/reports/orders')).data.orders.length;
await page.goto(`${BASE}/app/#reports`, { waitUntil: 'networkidle' });
const pending = await apiAs(page, '/v1/reports/orders', 'POST', { service: 'component-manufacturing-study' });
// The normal pending-payment screen: no order help line, no support link.
await page.goto(`${BASE}/app/#reports/${pending.data.order_id}`, { waitUntil: 'networkidle' });
await page.waitForSelector('#ord-check');
check(!(await page.textContent('#db-panel')).includes(HELP) && !(await page.$('#db-panel a[href^="mailto:"]')), 'help: no order help line while payment is pending');
await page.goto(`${BASE}/app/#reports`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ord-card');
check(!(await page.textContent('#db-panel')).includes(HELP), 'help: no order help line on the catalogue with orders listed');
await page.goto(pending.data.url.replace(/^https?:\/\/[^/]+/, BASE));
await page.click('#cancel');
await page.waitForSelector('#status:not([hidden])');
check(/Checkout was cancelled\. Nothing was charged/.test(await page.textContent('#status')), 'cancel: nothing charged');
check((await apiAs(page, '/v1/reports/orders')).data.orders.length === before + 1, 'cancel: the unpaid order is listed, not lost');

// 7. Another account cannot see the order.
const ctxC = await browser.newContext();
const other = await signIn(ctxC, `other-${Date.now()}@example.com`);
check((await apiAs(other, `/v1/reports/orders/${orderId}`)).status === 404, 'privacy: another account gets 404');
check((await apiAs(other, '/v1/ops/orders')).status === 403, 'privacy: a buyer is not an operator');
await other.goto(`${BASE}/app/#reports/${orderId}`, { waitUntil: 'networkidle' });
await other.waitForTimeout(800);
const otherText = await other.textContent('#db-panel');
check(/Order not found/.test(otherText) && !otherText.includes('Example Manufacturing'), `privacy: the page says not found (${otherText.slice(0, 80)})`);
await ctxC.close();

// 8. Operator queue: sees the order, records the delivery; the buyer sees it.
const ctxO = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const op = await signIn(ctxO, 'operator@example.com');
await op.goto(`${BASE}/app/#ops`, { waitUntil: 'networkidle' });
await op.waitForSelector(`a[href="#ops/${orderId}"]`);
await op.click(`a[href="#ops/${orderId}"]`);
await op.waitForSelector('#ops-note');
check((await op.textContent('#db-panel')).includes('Example Manufacturing Ltd'), 'operator: the submitted brief is visible');
await op.click('[data-st="delivered"]');
await op.waitForTimeout(500);
check((await apiAs(page, `/v1/reports/orders/${orderId}`)).data.order.status === 'awaiting_report', 'operator: delivery without a note is refused');
await op.fill('#ops-note', 'PDF emailed by the operator to the buyer address (test).');
await op.click('[data-st="delivered"]');
await op.waitForSelector('text=Delivery record');
const delivered = (await apiAs(page, `/v1/reports/orders/${orderId}`)).data.order;
check(delivered.status === 'delivered' && delivered.due_at === submitted.due_at, 'operator: delivered, deadline unchanged');
await ctxO.close();

// 9. Phones: no horizontal scroll, buttons reachable.
for (const width of [375, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true });
  const p = await signIn(ctx, buyerEmail);
  for (const hash of ['#reports', `#reports/${orderId}`]) {
    await p.goto(`${BASE}/app/${hash}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    check(await noScroll(p) <= 1, `${width}px ${hash}: no horizontal scroll`);
  }
  // An open questionnaire on a phone (the second order).
  const open = (await apiAs(p, '/v1/reports/orders')).data.orders.find((o) => o.status === 'awaiting_questionnaire');
  await p.goto(`${BASE}/app/#reports/${open.id}`, { waitUntil: 'networkidle' });
  await p.waitForSelector('#q-form');
  check(await noScroll(p) <= 1, `${width}px questionnaire: no horizontal scroll`);
  const btn = await p.$eval('#q-review', (b) => { const r = b.getBoundingClientRect(); return { w: r.width, right: r.right, inside: r.right <= innerWidth + 1 && r.left >= 0 }; });
  check(btn.inside && btn.w >= 44, `${width}px questionnaire: the review button fits`);
  await ctx.close();
}
await browser.close();
if (failures.length) { console.error(`Orders check FAILED: ${passed} passed, ${failures.length} failed\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`Orders check passed: ${passed} checks (${BASE}).`);
