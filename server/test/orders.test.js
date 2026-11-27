// Custom report orders (25 Nov 2026): payment -> private questionnaire -> atomic submit with a fixed 24-hour deadline ->
// confirmation and operator notification through the durable outbox. All synthetic (example.com, Stripe test fixtures).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTIFY_EMAIL, OPERATOR_EMAIL, REPORT_PRICES, T0, sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';
import { QUESTIONNAIRES, validateAnswers } from '../src/orders/questionnaire.js';

const INTEGRATION = 'humanoid-adoption-assessment';
const DIVERSIFICATION = 'component-manufacturing-study';

// A complete, valid set of answers for a service: every required field, estimates and "Unknown" where allowed.
function completeAnswers(service) {
  const a = {};
  for (const f of QUESTIONNAIRES[service]) {
    if (!f.required) continue;
    if (f.kind === 'ack') a[f.id] = true;
    else if (f.kind === 'select') a[f.id] = f.options[0][0];
    else if (f.kind === 'tasks') a[f.id] = ['Pick totes from a conveyor and stack them; about 8 kg; unknown cycle time.'];
    else a[f.id] = f.unknown ? 'Unknown' : `Synthetic answer for ${f.id}`;
  }
  return a;
}

const sessionEvent = (ctx, sessionId, { id = `evt_${sessionId}`, type = 'checkout.session.completed', paid = true, override = {} } = {}) => {
  const s = ctx.reportSessions.get(sessionId);
  return { id, object: 'event', type, created: T0, livemode: false, data: { object: { ...s, status: type === 'checkout.session.expired' ? 'expired' : 'complete', payment_status: paid ? 'paid' : 'unpaid', payment_intent: 'pi_fixture', ...override } } };
};

async function paidOrder(ctx, { email = 'buyer@example.com', service = INTEGRATION } = {}) {
  const { session, accountId } = await signIn(ctx, email);
  const created = await (await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service } })).json();
  const sessionId = [...ctx.reportSessions.values()].find((s) => s.metadata.wh_order_id === created.order_id).id;
  const hook = await (await sendWebhook(ctx, sessionEvent(ctx, sessionId))).json();
  assert.equal(hook.outcome, 'order_paid');
  return { session, accountId, orderId: created.order_id, sessionId };
}

test('services expose separate prices, terms and availability without requiring a subscription', async () => {
  const ctx = await setup();
  const body = await (await ctx.call('GET', '/v1/reports/services')).json();
  assert.deepEqual(body.services.map((s) => [s.id, s.name, s.unit_amount, s.currency, s.subscription_required, s.included_in_subscription]), [
    [INTEGRATION, 'Robot integration diagnostic', 100000, 'USD', false, false],
    [DIVERSIFICATION, 'Industrial diversification report', 100000, 'USD', false, false],
    ['investment-thesis', 'Investment thesis on demand', 10000, 'USD', false, false],
  ]);
  assert.match(body.before_payment, /^US\$1,000 · one-off payment · no subscription required\. After payment, complete a private questionnaire about your company\. We will email your report within 24 hours of receiving your completed questionnaire\.$/);
  assert.equal(body.support_email, 'javier@integrarobot.com');
  assert.deepEqual(body.services.map((s) => s.checkout_available), [true, true, false]);
  assert.match(body.services[2].before_payment, /US\$100 · one-off.*within 72 hours/);
});

test('checkout: needs a session (not an API key or nothing), the exact one-off price, and is reused, not doubled', async () => {
  const ctx = await setup();
  assert.equal((await ctx.call('POST', '/v1/reports/orders', { body: { service: INTEGRATION } })).status, 401);
  const { session } = await signIn(ctx);
  assert.equal((await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: 'free-report' } })).status, 400);
  const first = await (await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } })).json();
  assert.match(first.url, /^https:\/\/checkout\.stripe\.com\//);
  const call = [...ctx.reportSessions.values()][0].args;
  assert.equal(call.priceId, REPORT_PRICES[INTEGRATION]);
  assert.match(call.successUrl, /^https:\/\/whyhumanoid\.com\/app\/\?report_checkout=success&order=ord_/);
  const again = await (await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION, amount: 1, success_url: 'https://evil.example/' } })).json();
  assert.equal(again.order_id, first.order_id, 'a second click reuses the unpaid order');
  assert.equal(ctx.reportSessions.size, 1);
  // A report payment never grants the data subscription.
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: session })).status, 403);
});

test('checkout refuses a wrong price, a disabled switch or a missing price; never falls back to the subscription price', async () => {
  for (const [opts, code] of [
    [{ reportPrice: { object: 'price', active: true, type: 'recurring', currency: 'usd', unit_amount: 100000, livemode: false } }, 'price_mismatch'],
    [{ reportPrice: { object: 'price', active: true, type: 'one_time', currency: 'eur', unit_amount: 100000, livemode: false } }, 'price_mismatch'],
    [{ reportPrice: { object: 'price', active: true, type: 'one_time', currency: 'usd', unit_amount: 10000, livemode: false } }, 'price_mismatch'],
    [{ reportsCheckoutEnabled: false }, 'reports_checkout_disabled'],
    [{ reportPriceIds: {} }, 'report_price_not_configured'],
    [{ stripeKey: 'sk_live_fixture', stripeMode: 'live', allowLiveCheckout: false }, 'reports_live_closed'],
  ]) {
    const ctx = await setup(opts);
    const { session } = await signIn(ctx);
    const r = await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } });
    assert.equal(r.status, 503, JSON.stringify(opts));
    assert.equal((await r.json()).error, code);
    assert.equal(ctx.reportSessions.size, 0);
  }
});

test('payment: only a signed, matching, paid session opens the questionnaire; forged or mismatched events change nothing', async () => {
  const ctx = await setup();
  const { session } = await signIn(ctx);
  const { order_id: orderId } = await (await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } })).json();
  const sid = [...ctx.reportSessions.keys()][0];
  const status = async () => (await (await ctx.call('GET', `/v1/reports/orders/${orderId}`, { token: session })).json()).order.status;
  assert.equal(await status(), 'pending_payment');
  // A draft cannot be saved before payment.
  assert.equal((await ctx.call('POST', `/v1/reports/orders/${orderId}/draft`, { token: session, body: { answers: {} } })).status, 409);
  assert.equal((await sendWebhook(ctx, sessionEvent(ctx, sid), { secret: 'whsec_forged' })).status, 400);
  for (const [override, why] of [[{ amount_total: 10000 }, 'amount'], [{ currency: 'eur' }, 'currency'], [{ id: 'cs_other' }, 'session id'], [{ client_reference_id: 'acct_other' }, 'account'], [{ metadata: { wh_order_id: orderId, wh_account_id: 'x', wh_service: DIVERSIFICATION } }, 'service'], [{ livemode: true }, 'mode']]) {
    const out = await (await sendWebhook(ctx, sessionEvent(ctx, sid, { id: `evt_bad_${why.replace(' ', '_')}`, override }))).json();
    assert.notEqual(out.outcome, 'order_paid', why);
  }
  assert.equal((await (await sendWebhook(ctx, sessionEvent(ctx, sid, { id: 'evt_unpaid', paid: false }))).json()).outcome, 'not_paid');
  assert.equal(await status(), 'pending_payment');
  assert.equal((await (await sendWebhook(ctx, sessionEvent(ctx, sid, { id: 'evt_paid' }))).json()).outcome, 'order_paid');
  assert.equal(await status(), 'awaiting_questionnaire');
  // Redelivery and a late, out-of-order expiry change nothing.
  assert.equal((await (await sendWebhook(ctx, sessionEvent(ctx, sid, { id: 'evt_paid' }))).json()).duplicate, true);
  assert.equal((await (await sendWebhook(ctx, sessionEvent(ctx, sid, { id: 'evt_late_expired', type: 'checkout.session.expired', paid: false }))).json()).outcome, 'ignored_state');
  assert.equal(await status(), 'awaiting_questionnaire');
  // The buyer and the operator are told; the operator email carries no answers.
  const mails = ctx.mailer.outbox.filter((m) => /Payment received|Paid order/.test(m.subject));
  assert.deepEqual(mails.map((m) => m.to).sort(), ['buyer@example.com', NOTIFY_EMAIL].sort());
  assert.match(mails.find((m) => m.to === 'buyer@example.com').text, /24 hours start when you submit it, not at payment/);
  assert.match(mails.find((m) => m.to === 'buyer@example.com').text, /javier@integrarobot\.com/);
});

test('cancel and failure: an expired session cancels the unpaid order; an async failure marks it; neither grants anything', async () => {
  const ctx = await setup();
  const { session } = await signIn(ctx);
  const a = await (await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } })).json();
  const b = await (await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: DIVERSIFICATION } })).json();
  const [sa, sb] = [...ctx.reportSessions.keys()];
  assert.equal((await (await sendWebhook(ctx, sessionEvent(ctx, sa, { type: 'checkout.session.expired', paid: false }))).json()).outcome, 'order_cancelled');
  assert.equal((await (await sendWebhook(ctx, sessionEvent(ctx, sb, { type: 'checkout.session.async_payment_failed', paid: false }))).json()).outcome, 'payment_failed');
  const list = (await (await ctx.call('GET', '/v1/reports/orders', { token: session })).json()).orders;
  assert.deepEqual(list.map((o) => [o.id, o.status]).sort(), [[a.order_id, 'cancelled'], [b.order_id, 'payment_failed']].sort());
});

test('delayed webhook: the buyer reconciles; the server asks Stripe and applies the same checks', async () => {
  const ctx = await setup();
  const { session } = await signIn(ctx);
  const { order_id: orderId } = await (await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } })).json();
  const sid = [...ctx.reportSessions.keys()][0];
  let order = (await (await ctx.call('POST', `/v1/reports/orders/${orderId}/reconcile`, { token: session })).json()).order;
  assert.equal(order.status, 'pending_payment', 'still unpaid at Stripe');
  ctx.reportSessions.set(sid, { ...ctx.reportSessions.get(sid), status: 'complete', payment_status: 'paid' });
  order = (await (await ctx.call('POST', `/v1/reports/orders/${orderId}/reconcile`, { token: session })).json()).order;
  assert.equal(order.status, 'awaiting_questionnaire');
  // The webhook arriving afterwards is harmless.
  assert.equal((await (await sendWebhook(ctx, sessionEvent(ctx, sid))).json()).outcome, 'already_paid');
});

test('questionnaire: drafts persist across sign-ins; server validation; submit fixes submitted_at and due_at once', async () => {
  const ctx = await setup();
  const { orderId, session } = await paidOrder(ctx);
  const draft = { company_name: 'Example Manufacturing', process_problem: 'Manual tote handling at the end of a line.' };
  const saved = await (await ctx.call('POST', `/v1/reports/orders/${orderId}/draft`, { token: session, body: { answers: { ...draft, unknown_key: 'dropped' } } })).json();
  assert.equal(saved.saved, true);
  // Browser closed: a new sign-in (new session) finds the order and the draft.
  const again = await signIn(ctx);
  const order = (await (await ctx.call('GET', `/v1/reports/orders/${orderId}`, { token: again.session })).json()).order;
  assert.deepEqual(order.answers, draft);
  assert.equal(order.status, 'awaiting_questionnaire');
  // Over-long text is refused, not cut.
  const long = await (await ctx.call('POST', `/v1/reports/orders/${orderId}/draft`, { token: session, body: { answers: { activity: 'x'.repeat(4001) } } })).json();
  assert.equal(long.saved, false);
  assert.deepEqual(long.problems, [{ field: 'activity', problem: 'too_long' }]);
  // An incomplete submit is refused with the missing fields; the clock has not started.
  const incomplete = await ctx.call('POST', `/v1/reports/orders/${orderId}/submit`, { token: session, body: { answers: draft } });
  assert.equal(incomplete.status, 422);
  assert.ok((await incomplete.json()).problems.some((p) => p.field === 'acknowledgement' && p.problem === 'required'));
  ctx.setNow(T0 + 3600);
  const done = await (await ctx.call('POST', `/v1/reports/orders/${orderId}/submit`, { token: session, body: { answers: completeAnswers(INTEGRATION) } })).json();
  assert.equal(done.submitted, true);
  assert.equal(done.order.status, 'awaiting_report');
  assert.equal(done.order.submitted_at, T0 + 3600);
  assert.equal(done.order.due_at, T0 + 3600 + 24 * 3600);
  assert.match(done.order.due_utc, /UTC$/);
  // A second submit, later and with other answers, changes nothing and does not re-notify.
  const before = ctx.mailer.outbox.length;
  ctx.setNow(T0 + 7200);
  const repeat = await (await ctx.call('POST', `/v1/reports/orders/${orderId}/submit`, { token: session, body: { answers: { ...completeAnswers(INTEGRATION), company_name: 'Changed' } } })).json();
  assert.equal(repeat.already, true);
  assert.equal(repeat.order.due_at, T0 + 3600 + 24 * 3600);
  assert.equal(repeat.order.answers.company_name, 'Synthetic answer for company_name');
  assert.equal(ctx.mailer.outbox.length, before);
  assert.equal((await ctx.call('POST', `/v1/reports/orders/${orderId}/draft`, { token: session, body: { answers: draft } })).status, 409, 'a submitted brief is not edited silently');
  // Confirmation to the buyer with the exact deadline; notification to the operator without the answers.
  const confirm = ctx.mailer.outbox.find((m) => m.to === 'buyer@example.com' && /Questionnaire received/.test(m.subject));
  assert.match(confirm.text, /by \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC \(.* \(Madrid time\)\)/);
  const op = ctx.mailer.outbox.find((m) => m.to === NOTIFY_EMAIL && /Questionnaire submitted/.test(m.subject));
  assert.ok(op && !op.text.includes('Pick totes') && !op.text.includes('Synthetic answer'));
});

test('privacy: another account can neither read nor edit nor submit an order; responses are private and uncached', async () => {
  const ctx = await setup();
  const { orderId, session } = await paidOrder(ctx);
  const other = await signIn(ctx, 'other@example.com');
  for (const [method, path, body] of [['GET', `/v1/reports/orders/${orderId}`], ['POST', `/v1/reports/orders/${orderId}/draft`, { answers: {} }], ['POST', `/v1/reports/orders/${orderId}/submit`, { answers: completeAnswers(INTEGRATION) }], ['POST', `/v1/reports/orders/${orderId}/reconcile`]]) {
    const r = await ctx.call(method, path, { token: other.session, body });
    assert.equal(r.status, 404, `${method} ${path}`);
  }
  assert.deepEqual((await (await ctx.call('GET', '/v1/reports/orders', { token: other.session })).json()).orders, []);
  const own = await ctx.call('GET', `/v1/reports/orders/${orderId}`, { token: session });
  assert.match(own.headers.get('cache-control'), /private, no-store/);
  // An API key (even a subscriber's) cannot reach orders: they need a signed-in session.
  await sendWebhook(ctx, subscriptionEvent({ accountId: (await ctx.db.prepare("SELECT id FROM accounts WHERE email = 'buyer@example.com'").first()).id }));
  const key = (await (await ctx.call('POST', '/v1/api-keys', { token: session, body: { label: 'agent' } })).json()).api_key;
  assert.equal((await ctx.call('GET', `/v1/reports/orders/${orderId}`, { token: key })).status, 403);
});

test('operator queue: operators only (not subscribers); brief, work state, delivery record, outbox retries', async () => {
  const ctx = await setup({ adminToken: 'admin-fixture-token' });
  const { orderId, session } = await paidOrder(ctx);
  await ctx.call('POST', `/v1/reports/orders/${orderId}/submit`, { token: session, body: { answers: completeAnswers(INTEGRATION) } });
  assert.equal((await ctx.call('GET', '/v1/ops/orders')).status, 401);
  assert.equal((await ctx.call('GET', '/v1/ops/orders', { token: session })).status, 403, 'the buyer is not an operator');
  const op = await signIn(ctx, OPERATOR_EMAIL);
  const queue = await (await ctx.call('GET', '/v1/ops/orders', { token: op.session })).json();
  assert.equal(queue.orders[0].id, orderId);
  assert.equal(queue.orders[0].status, 'awaiting_report');
  assert.equal((await ctx.call('GET', '/v1/ops/orders', { headers: { 'x-admin-token': 'admin-fixture-token' } })).status, 200);
  const detail = (await (await ctx.call('GET', `/v1/ops/orders/${orderId}`, { token: op.session })).json()).order;
  assert.equal(detail.answers.acknowledgement, true);
  assert.ok(detail.outbox.every((m) => m.status === 'sent'));
  assert.equal((await ctx.call('POST', `/v1/ops/orders/${orderId}`, { token: op.session, body: { status: 'delivered' } })).status, 400, 'delivery needs a note');
  await ctx.call('POST', `/v1/ops/orders/${orderId}`, { token: op.session, body: { status: 'in_progress' } });
  const delivered = (await (await ctx.call('POST', `/v1/ops/orders/${orderId}`, { token: op.session, body: { status: 'delivered', note: 'PDF emailed by Javier to the buyer address' } })).json()).order;
  assert.equal(delivered.status, 'delivered');
  assert.equal(delivered.due_at, detail.due_at, 'delivery never moves the deadline');
  // The buyer sees the state.
  assert.equal((await (await ctx.call('GET', `/v1/reports/orders/${orderId}`, { token: session })).json()).order.status, 'delivered');
});

test('outbox: a failed email stays queued and is retried later; it is sent once', async () => {
  const ctx = await setup();
  let fail = true;
  const send = ctx.mailer.send.bind(ctx.mailer);
  ctx.mailer.send = async (m) => { if (fail && /Payment received/.test(m.subject)) throw new Error('provider down'); return send(m); };
  const { orderId } = await paidOrder(ctx);
  const op = await signIn(ctx, OPERATOR_EMAIL);
  let row = (await (await ctx.call('GET', `/v1/ops/orders/${orderId}`, { token: op.session })).json()).order.outbox.find((m) => m.kind === 'customer_paid');
  assert.equal(row.status, 'failed');
  assert.equal(row.attempts, 1);
  fail = false;
  // Not due yet: the retry waits for its backoff, unless the operator asks for it.
  await ctx.call('POST', '/v1/ops/outbox/retry', { token: op.session, body: {} });
  row = (await (await ctx.call('GET', `/v1/ops/orders/${orderId}`, { token: op.session })).json()).order.outbox.find((m) => m.kind === 'customer_paid');
  assert.equal(row.status, 'failed');
  await ctx.call('POST', '/v1/ops/outbox/retry', { token: op.session, body: { ids: [row.id] } });
  row = (await (await ctx.call('GET', `/v1/ops/orders/${orderId}`, { token: op.session })).json()).order.outbox.find((m) => m.kind === 'customer_paid');
  assert.equal(row.status, 'sent');
  assert.equal(ctx.mailer.outbox.filter((m) => /Payment received/.test(m.subject)).length, 1);
});

test('validation: estimates and Unknown answer a required field; options and limits are enforced; ack must be true', () => {
  const ok = validateAnswers(DIVERSIFICATION, completeAnswers(DIVERSIFICATION), { final: true });
  assert.equal(ok.error, undefined);
  assert.equal(ok.answers.investment, 'Unknown');
  const bad = validateAnswers(DIVERSIFICATION, { ...completeAnswers(DIVERSIFICATION), employees: '5000', report_language: 'fr', website: 'not a url', offer_types: ['robots'], acknowledgement: 'yes' }, { final: true });
  assert.deepEqual(bad.problems.map((p) => p.field).sort(), ['acknowledgement', 'employees', 'offer_types', 'report_language', 'website'].sort());
  const tasks = validateAnswers(INTEGRATION, { ...completeAnswers(INTEGRATION), tasks: ['a', 'b', 'c', 'd'] }, { final: true });
  assert.ok(tasks.problems.some((p) => p.field === 'tasks'));
  // No field asks for a balance sheet or forces a figure; no sector or company example in the definitions.
  const text = JSON.stringify(QUESTIONNAIRES);
  assert.doesNotMatch(text, /balance sheet|automotive|OEM|Tier ?1|Tier ?2/i);
});

// Durability (Codex review, 25 Nov 2026): the state change and its emails are one transaction, and a missing email is
// repaired from the stored order. A write that fails between them must never lose a notification.
function failNextOutboxWrite(ctx) {
  const batch = ctx.db.batch.bind(ctx.db);
  let armed = true;
  ctx.db.batch = async (statements) => {
    if (armed && statements.some((s) => /notification_outbox/.test(s.sql))) {
      armed = false;
      // The order update runs, then the first email write fails inside the same transaction.
      return batch([...statements.slice(0, 1), { runSync() { throw new Error('injected outbox failure'); } }]);
    }
    return batch(statements);
  };
}
const outboxKinds = async (ctx, orderId) => (await ctx.db.prepare('SELECT kind FROM notification_outbox WHERE order_id = ? ORDER BY kind').bind(orderId).all()).results.map((r) => r.kind);

test('payment: a failure writing the emails rolls the payment back; Stripe redelivery then records it with both emails', async () => {
  const ctx = await setup();
  const { session } = await signIn(ctx);
  const { order_id: orderId } = await (await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } })).json();
  const sid = [...ctx.reportSessions.keys()][0];
  failNextOutboxWrite(ctx);
  const first = await sendWebhook(ctx, sessionEvent(ctx, sid, { id: 'evt_flaky' }));
  assert.equal(first.status, 500, 'Stripe sees a failure and will redeliver');
  const row = await ctx.db.prepare('SELECT status, paid_at FROM report_orders WHERE id = ?').bind(orderId).first();
  assert.deepEqual([row.status, row.paid_at], ['pending_payment', null], 'nothing half-done');
  assert.deepEqual(await outboxKinds(ctx, orderId), []);
  const again = await (await sendWebhook(ctx, sessionEvent(ctx, sid, { id: 'evt_flaky' }))).json();
  assert.equal(again.outcome, 'order_paid');
  assert.deepEqual(await outboxKinds(ctx, orderId), ['customer_paid', 'operator_paid']);
});

test('submit: a failure writing the emails leaves the questionnaire open; the next submit records it with both emails and one deadline', async () => {
  const ctx = await setup();
  const { orderId, session } = await paidOrder(ctx);
  failNextOutboxWrite(ctx);
  ctx.setNow(T0 + 100);
  assert.equal((await ctx.call('POST', `/v1/reports/orders/${orderId}/submit`, { token: session, body: { answers: completeAnswers(INTEGRATION) } })).status, 500);
  const open = await ctx.db.prepare('SELECT status, submitted_at, due_at FROM report_orders WHERE id = ?').bind(orderId).first();
  assert.deepEqual([open.status, open.submitted_at, open.due_at], ['awaiting_questionnaire', null, null], 'the clock has not started');
  ctx.setNow(T0 + 200);
  const done = await (await ctx.call('POST', `/v1/reports/orders/${orderId}/submit`, { token: session, body: { answers: completeAnswers(INTEGRATION) } })).json();
  assert.equal(done.order.submitted_at, T0 + 200);
  assert.equal(done.order.due_at, T0 + 200 + 24 * 3600);
  assert.deepEqual(await outboxKinds(ctx, orderId), ['customer_paid', 'customer_submitted', 'operator_paid', 'operator_submitted']);
});

test('repair: emails missing after a state change are rewritten from the stored order, once, with the original deadline', async () => {
  const ctx = await setup();
  const { orderId, session, sessionId } = await paidOrder(ctx);
  ctx.setNow(T0 + 300);
  const done = await (await ctx.call('POST', `/v1/reports/orders/${orderId}/submit`, { token: session, body: { answers: completeAnswers(INTEGRATION) } })).json();
  const due = done.order.due_at;
  // Simulate notifications lost by an older, non-atomic write.
  await ctx.db.prepare('DELETE FROM notification_outbox WHERE order_id = ?').bind(orderId).run();
  ctx.setNow(T0 + 5000);
  // A repeated final submit repairs the submission emails (deadline unchanged) and the payment emails.
  const repeat = await (await ctx.call('POST', `/v1/reports/orders/${orderId}/submit`, { token: session, body: { answers: completeAnswers(INTEGRATION) } })).json();
  assert.equal(repeat.already, true);
  assert.equal(repeat.order.due_at, due);
  assert.deepEqual(await outboxKinds(ctx, orderId), ['customer_paid', 'customer_submitted', 'operator_paid', 'operator_submitted']);
  const confirm = await ctx.db.prepare("SELECT body FROM notification_outbox WHERE order_id = ? AND kind = 'customer_submitted'").bind(orderId).first();
  assert.ok(confirm.body.includes(new Date(due * 1000).toISOString().slice(0, 16).replace('T', ' ')), 'the repaired email names the original deadline');
  // A later webhook for the same paid session repairs nothing more and duplicates nothing.
  const late = await (await sendWebhook(ctx, sessionEvent(ctx, sessionId, { id: 'evt_late_paid' }))).json();
  assert.equal(late.outcome, 'already_paid');
  assert.equal((await outboxKinds(ctx, orderId)).length, 4);
  // A paid-but-missing email is also repaired by a redelivered paid event.
  await ctx.db.prepare("DELETE FROM notification_outbox WHERE order_id = ? AND kind = 'operator_paid'").bind(orderId).run();
  assert.equal((await (await sendWebhook(ctx, sessionEvent(ctx, sessionId, { id: 'evt_late_paid_2' }))).json()).outcome, 'already_paid_repaired');
  assert.equal((await outboxKinds(ctx, orderId)).length, 4);
});

test('checkout refuses to sell a report when fulfilment or recovery is not set up', async () => {
  const cases = [
    [(ctx) => { ctx.mailer.configured = false; }, 'email_not_configured'],
    [(ctx) => { ctx.gateway.webhookConfigured = false; }, 'webhook_not_configured'],
    [(ctx) => { ctx.config.operatorNotifyEmail = null; }, 'operator_notify_not_configured'],
    [(ctx) => { ctx.config.operatorEmails = []; ctx.config.adminToken = null; }, 'operator_queue_not_configured'],
  ];
  for (const [breakIt, code] of cases) {
    const ctx = await setup();
    const { session } = await signIn(ctx);
    breakIt(ctx);
    const r = await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } });
    assert.equal(r.status, 503, code);
    assert.equal((await r.json()).error, code);
    assert.equal(ctx.reportSessions.size, 0, `${code}: no Checkout Session`);
    const svc = await (await ctx.call('GET', '/v1/reports/services')).json();
    assert.equal(svc.checkout_state, code);
    assert.ok(svc.services.every((s) => !s.checkout_available));
  }
});

// Concurrency (Codex review, 25 Nov 2026): two simultaneous starts for the same account and service, both reading "no
// unpaid order" before either writes, must still produce one order and one payable Checkout Session.
test('concurrent checkout starts: one order and one Checkout Session, even when both reads miss the other', async () => {
  const ctx = await setup();
  const { session } = await signIn(ctx);
  // A barrier: the first two "unpaid order?" reads wait for each other, so both see none before either inserts.
  const prepare = ctx.db.prepare;
  let waiting = [];
  let armed = 2;
  ctx.db.prepare = (sql) => {
    const st = prepare(sql);
    if (!/status = 'pending_payment'.*LIMIT 1/s.test(sql)) return st;
    const wrap = (s) => ({ ...s, sql: s.sql, bind: (...a) => wrap(s.bind(...a)), all: () => s.all(), run: () => s.run(), runSync: () => s.runSync(),
      first: async () => {
        if (armed > 0) {
          armed -= 1;
          const row = await s.first();
          await new Promise((resolve) => { waiting.push(resolve); if (waiting.length === 2) waiting.forEach((r) => r()); });
          return row;
        }
        return s.first();
      } });
    return wrap(st);
  };
  const [a, b] = await Promise.all([
    ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } }),
    ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } }),
  ]);
  const [ja, jb] = [await a.json(), await b.json()];
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(ja.order_id, jb.order_id, 'the same order');
  assert.equal(ja.url, jb.url, 'the same Checkout Session');
  assert.equal(ctx.reportSessions.size, 1);
  assert.equal(Number((await ctx.db.prepare('SELECT COUNT(*) AS n FROM report_orders').first()).n), 1);
  ctx.db.prepare = prepare;
  // The database itself refuses a second unpaid order for the same account and service.
  const row = await ctx.db.prepare('SELECT * FROM report_orders').first();
  assert.throws(() => ctx.db.prepare(`INSERT INTO report_orders (id, account_id, service, status, mode, price_id, amount, currency, created_at, updated_at) VALUES ('ord_dup_fixture1', ?, ?, 'pending_payment', 'test', 'p', 100000, 'usd', 1, 1)`).bind(row.account_id, row.service).runSync(), /UNIQUE/);
});

test('an unpaid order is reused while its session can still be paid, refused near its expiry, replaced only after it', async () => {
  const ctx = await setup();
  const { session } = await signIn(ctx);
  const start = () => ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } });
  const first = await (await start()).json();
  assert.equal([...ctx.reportSessions.values()][0].args.expiresAt, T0 + 2 * 3600, 'the session expires at a fixed time');
  ctx.setNow(T0 + 3600);
  assert.equal((await (await start()).json()).order_id, first.order_id, 'reused within the window');
  ctx.setNow(T0 + 2 * 3600 - 60);
  const near = await start();
  assert.equal(near.status, 409);
  assert.equal((await near.json()).error, 'checkout_expiring_retry_shortly');
  ctx.setNow(T0 + 2 * 3600 + 11 * 60);
  // Stripe has expired the unpaid session: only then is the order replaced.
  const sid = [...ctx.reportSessions.keys()][0];
  ctx.reportSessions.set(sid, { ...ctx.reportSessions.get(sid), status: 'expired' });
  const next = await (await start()).json();
  assert.notEqual(next.order_id, first.order_id, 'a new order once the old session has expired');
  const old = await ctx.db.prepare('SELECT status FROM report_orders WHERE id = ?').bind(first.order_id).first();
  assert.equal(old.status, 'cancelled');
  assert.equal(ctx.reportSessions.size, 2);
});

test('a session paid while its webhook is delayed past the expiry is recorded on the original order, never replaced', async () => {
  const ctx = await setup();
  const { session } = await signIn(ctx);
  const start = () => ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } });
  const first = await (await start()).json();
  const sid = [...ctx.reportSessions.keys()][0];
  // Paid at Stripe; the webhook has not arrived.
  ctx.reportSessions.set(sid, { ...ctx.reportSessions.get(sid), status: 'complete', payment_status: 'paid', payment_intent: 'pi_late' });
  ctx.setNow(T0 + 2 * 3600 + 11 * 60);
  const again = await start();
  assert.equal(again.status, 200);
  const body = await again.json();
  assert.equal(body.order_id, first.order_id, 'the original order');
  assert.equal(body.already_paid, true);
  assert.match(body.url, new RegExp(`#reports/${first.order_id}$`), 'sent to its questionnaire, not to a new payment');
  assert.equal(ctx.reportSessions.size, 1, 'no new payable session');
  const row = await ctx.db.prepare('SELECT status, paid_at, submitted_at, due_at FROM report_orders WHERE id = ?').bind(first.order_id).first();
  assert.deepEqual([row.status, row.submitted_at, row.due_at], ['awaiting_questionnaire', null, null], 'paid; the 24-hour clock has not started');
  assert.deepEqual(await outboxKinds(ctx, first.order_id), ['customer_paid', 'operator_paid']);
  assert.equal(Number((await ctx.db.prepare('SELECT COUNT(*) AS n FROM report_orders').first()).n), 1);
  // The webhook arriving later changes nothing.
  assert.equal((await (await sendWebhook(ctx, sessionEvent(ctx, sid, { id: 'evt_very_late' }))).json()).outcome, 'already_paid');
});

test('when Stripe cannot be asked, or a payment is still processing, nothing is replaced or cancelled', async () => {
  const ctx = await setup();
  const { session } = await signIn(ctx);
  const start = () => ctx.call('POST', '/v1/reports/orders', { token: session, body: { service: INTEGRATION } });
  const first = await (await start()).json();
  const sid = [...ctx.reportSessions.keys()][0];
  ctx.setNow(T0 + 3 * 3600);
  const retrieve = ctx.gateway.retrieveCheckoutSession;
  ctx.gateway.retrieveCheckoutSession = async () => { throw new Error('Stripe unavailable'); };
  const down = await start();
  assert.equal(down.status, 503);
  assert.equal((await down.json()).error, 'checkout_status_unknown_retry');
  ctx.gateway.retrieveCheckoutSession = retrieve;
  // A delayed payment method: the session is complete but not yet paid.
  ctx.reportSessions.set(sid, { ...ctx.reportSessions.get(sid), status: 'complete', payment_status: 'unpaid' });
  const processing = await start();
  assert.equal(processing.status, 409);
  assert.equal((await processing.json()).error, 'payment_processing');
  const row = await ctx.db.prepare('SELECT status FROM report_orders WHERE id = ?').bind(first.order_id).first();
  assert.equal(row.status, 'pending_payment', 'the order is untouched');
  assert.equal(ctx.reportSessions.size, 1, 'no second session');
});

test('investment thesis: a wrong Stripe price is rejected before creating an order', async () => {
  const service = 'investment-thesis';
  const ctx = await setup({ investmentThesisCheckoutEnabled: true, reportPriceIds: { ...REPORT_PRICES, [service]: 'price_thesis_fixture' }, investmentThesisPrice: { active: true, type: 'one_time', unit_amount: 100000, currency: 'usd', livemode: false } });
  const { session } = await signIn(ctx);
  const r = await ctx.call('POST', '/v1/reports/orders', { token: session, body: { service } });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, 'price_mismatch');
  assert.equal(ctx.reportSessions.size, 0);
});

test('investment thesis: verified payment opens the company brief and a repeat submit preserves its 72-hour deadline', async () => {
  const service = 'investment-thesis';
  const ctx = await setup({ investmentThesisCheckoutEnabled: true, reportPriceIds: { ...REPORT_PRICES, [service]: 'price_thesis_fixture' } });
  const { session, orderId } = await paidOrder(ctx, { service });
  const route = `/v1/reports/orders/${orderId}`;
  const { order } = await (await ctx.call('GET', route, { token: session })).json();
  assert.deepEqual([order.status, order.amount, order.due_at, order.delivery_hours], ['awaiting_questionnaire', 10000, null, 72]);
  const answers = { company_name: 'Agility Robotics', security: 'NASDAQ:AGLT', report_language: 'en', research_question: 'What would make Digit profitable?', acknowledgement: true };
  const submitted = await (await ctx.call('POST', route + '/submit', { token: session, body: { answers } })).json();
  assert.equal(submitted.order.due_at - submitted.order.submitted_at, 72 * 3600);
  assert.deepEqual(submitted.order.answers, answers);
  const repeated = await (await ctx.call('POST', route + '/submit', { token: session, body: { answers } })).json();
  assert.equal(repeated.already, true);
  assert.equal(repeated.order.due_at, submitted.order.due_at);
});
