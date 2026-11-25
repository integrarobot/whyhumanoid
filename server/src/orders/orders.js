// Custom report orders (25 Nov 2026). The order exists on the server before checkout, bound to one signed-in account
// and one service; payment is accepted only from a verified Stripe Checkout Session that matches the stored order
// (session id, account, service, mode, amount and currency, paid). The questionnaire is private to the account; the
// final submit is atomic and fixes submitted_at and due_at once. Every email goes through the durable outbox.

import { HttpError } from '../http.js';
import { newId } from '../crypto.js';
import { REPORT_DEADLINE_SECONDS, REPORT_PRICE, REPORT_SERVICES_BY_ID, REPORTS_LIVE_OPEN, checkReportPrice } from './services.js';
import { QUESTIONNAIRE_VERSION, progress, validateAnswers } from './questionnaire.js';
import { SUPPORT_EMAIL } from '../support.js';

const OPEN_STATUSES = ['awaiting_questionnaire'];
const MAX_ANSWERS_BYTES = 120_000;

// Report checkout state for a service: 'ready' or the reason it is closed. Never falls back to another price.
// Fulfilment and recovery must work before anyone can pay (Codex review, 25 Nov 2026): email delivery, signed webhooks,
// an operator notification address and an operator who can open the queue.
export function reportCheckoutState({ config, gateway, mailer }) {
  if (!config.reportsCheckoutEnabled) return 'reports_checkout_disabled';
  if (!mailer?.configured) return 'email_not_configured';
  if (!gateway.webhookConfigured) return 'webhook_not_configured';
  if (!config.operatorNotifyEmail) return 'operator_notify_not_configured';
  if (!(config.operatorEmails?.length || config.adminToken)) return 'operator_queue_not_configured';
  if (gateway.mode === 'unconfigured') return 'checkout_not_configured';
  if (gateway.mode !== config.stripeMode) return 'stripe_mode_mismatch';
  if (gateway.mode === 'live' && (!config.allowLiveCheckout || !REPORTS_LIVE_OPEN)) return 'reports_live_closed';
  return 'ready';
}
const priceIdFor = (config, service) => config.reportPriceIds?.[service] ?? null;

const fmtUtc = (t) => new Date(t * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const fmtMadrid = (t) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', dateStyle: 'long', timeStyle: 'short' }).format(new Date(t * 1000)) + ' (Madrid time)';

// What the customer sees of an order. Answers only for the owner, through private responses.
export function publicOrder(row, { withAnswers = false } = {}) {
  const service = REPORT_SERVICES_BY_ID.get(row.service);
  const draft = row.draft_json ? JSON.parse(row.draft_json) : {};
  const submitted = row.submitted_json ? JSON.parse(row.submitted_json) : null;
  return {
    id: row.id,
    service: row.service,
    service_name: service?.name ?? row.service,
    status: row.status,
    amount: row.amount,
    currency: row.currency.toUpperCase(),
    created_at: row.created_at,
    paid_at: row.paid_at,
    draft_saved_at: row.draft_saved_at,
    submitted_at: row.submitted_at,
    due_at: row.due_at,
    due_utc: row.due_at ? fmtUtc(row.due_at) : null,
    due_madrid: row.due_at ? fmtMadrid(row.due_at) : null,
    delivered_at: row.delivered_at,
    progress: progress(row.service, submitted ?? draft),
    ...(withAnswers ? { form_version: row.form_version, answers: submitted ?? draft, submitted: Boolean(submitted) } : {}),
  };
}

async function ownOrder(db, accountId, orderId) {
  const row = await db.prepare('SELECT * FROM report_orders WHERE id = ?').bind(orderId).first();
  // Another account's order answers exactly like a missing one.
  if (!row || row.account_id !== accountId) throw new HttpError(404, 'order_not_found');
  return row;
}

export async function listOrders(db, accountId) {
  const { results } = await db.prepare('SELECT * FROM report_orders WHERE account_id = ? ORDER BY created_at DESC LIMIT 50').bind(accountId).all();
  return results.map((r) => publicOrder(r));
}

export async function getOrder(db, accountId, orderId) {
  return publicOrder(await ownOrder(db, accountId, orderId), { withAnswers: true });
}

// Creates (or reuses) the order and its Checkout Session. The amount, currency and return addresses come from the
// server; the client sends only the service id.
export async function startReportCheckout({ db, config, gateway, mailer, account, service, now, appUrl }) {
  if (!REPORT_SERVICES_BY_ID.has(service)) throw new HttpError(400, 'unknown_service');
  const state = reportCheckoutState({ config, gateway, mailer });
  if (state !== 'ready') throw new HttpError(503, state);
  const priceId = priceIdFor(config, service);
  if (!priceId) throw new HttpError(503, 'report_price_not_configured');
  let price;
  try { price = await gateway.retrievePrice(priceId); } catch { throw new HttpError(503, 'price_lookup_failed'); }
  if (checkReportPrice(price, { mode: gateway.mode }).length) throw new HttpError(503, 'price_mismatch');

  // An unpaid order of the same service from the last 23 hours is reused with its open Checkout Session, so a double
  // click or a returning browser never creates a second order.
  const open = await db
    .prepare("SELECT * FROM report_orders WHERE account_id = ? AND service = ? AND status = 'pending_payment' AND created_at > ? ORDER BY created_at DESC LIMIT 1")
    .bind(account.accountId, service, now - 23 * 3600)
    .first();
  if (open?.checkout_session_id && open.checkout_url) return { order_id: open.id, url: open.checkout_url };

  const orderId = open?.id ?? newId('ord');
  if (!open) {
    await db
      .prepare(`INSERT INTO report_orders (id, account_id, service, status, mode, price_id, amount, currency, created_at, updated_at)
                VALUES (?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?)`)
      .bind(orderId, account.accountId, service, gateway.mode, priceId, REPORT_PRICE.unitAmount, REPORT_PRICE.currency, now, now)
      .run();
  }
  const session = await gateway.createReportCheckoutSession({
    priceId,
    orderId,
    accountId: account.accountId,
    service,
    email: account.email,
    customerId: account.stripeCustomerId ?? null,
    successUrl: `${appUrl}?report_checkout=success&order=${orderId}#reports`,
    cancelUrl: `${appUrl}?report_checkout=cancelled&order=${orderId}#reports`,
    idempotencyKey: `report-checkout-${orderId}`,
  });
  await db.prepare('UPDATE report_orders SET checkout_session_id = ?, checkout_url = ?, updated_at = ? WHERE id = ? AND checkout_session_id IS NULL').bind(session.id, session.url, now, orderId).run();
  return { order_id: orderId, url: session.url };
}

// A Checkout Session (from a signed webhook or retrieved server-side from Stripe) is checked against the stored order.
// Returns the outcome; changes the order only from pending_payment, once.
export async function applyReportSession({ db, config, session, now, notify, eventType = null }) {
  if (session?.mode !== 'payment') return 'ignored_mode';
  const orderId = session.metadata?.wh_order_id;
  if (!orderId) return 'unmapped';
  const order = await db.prepare('SELECT * FROM report_orders WHERE id = ?').bind(orderId).first();
  if (!order) return 'unmapped';
  const mismatch =
    order.checkout_session_id !== session.id ||
    (session.client_reference_id ?? session.metadata?.wh_account_id) !== order.account_id ||
    session.metadata?.wh_service !== order.service ||
    Boolean(session.livemode) !== (order.mode === 'live') ||
    session.amount_total !== order.amount ||
    String(session.currency ?? '').toLowerCase() !== order.currency;
  if (mismatch) return 'order_mismatch';
  if (session.status === 'expired') {
    const r = await db.prepare("UPDATE report_orders SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ? AND status = 'pending_payment'").bind(now, now, order.id).run();
    return r.meta.changes ? 'order_cancelled' : 'ignored_state';
  }
  if (eventType === 'checkout.session.async_payment_failed') {
    const r = await db.prepare("UPDATE report_orders SET status = 'payment_failed', updated_at = ? WHERE id = ? AND status = 'pending_payment'").bind(now, order.id).run();
    return r.meta.changes ? 'payment_failed' : 'ignored_state';
  }
  // Delayed payment methods complete the session unpaid first; the order waits for async_payment_succeeded.
  if (session.payment_status !== 'paid') return 'not_paid';
  // The state change and its emails are one transaction (D1 batch): if writing an email fails, the order stays unpaid
  // here, the webhook answers 500 and Stripe redelivers. An order already paid gets any missing email repaired.
  const account = await db.prepare('SELECT email FROM accounts WHERE id = ?').bind(order.account_id).first();
  const results = await db.batch([
    db.prepare("UPDATE report_orders SET status = 'awaiting_questionnaire', paid_at = ?, payment_intent_id = ?, updated_at = ? WHERE id = ? AND status IN ('pending_payment', 'payment_failed')")
      .bind(now, typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null, now, order.id),
    ...paidMessages(order, account.email, config).map((m) => outboxStatement(db, now, m, 'paid_at IS NOT NULL')),
  ]);
  const repaired = results.slice(1).some((x) => x?.meta?.changes);
  if (results[0].meta.changes || repaired) notify?.();
  return results[0].meta.changes ? 'order_paid' : repaired ? 'already_paid_repaired' : 'already_paid';
}

// The emails of each step, from the stored order (so a repair writes what the original step would have written).
function paidMessages(order, email, config) {
  const service = REPORT_SERVICES_BY_ID.get(order.service);
  return [
    { orderId: order.id, kind: 'customer_paid', to: email,
      subject: `Payment received: your ${service.name} questionnaire is open`,
      body:
        `Thank you. Your payment for the ${service.name} (US$1,000) has been received.\n\n` +
        `Next step: complete the private questionnaire about your company. Sign in with this email address at ${config.appUrl}#reports to open it. Your answers are saved as you go.\n\n` +
        'We will email your report within 24 hours of receiving your completed questionnaire. The 24 hours start when you submit it, not at payment.\n\n' +
        `Questions: ${SUPPORT_EMAIL}\nOrder reference: ${order.id}` },
    ...(config.operatorNotifyEmail ? [{ orderId: order.id, kind: 'operator_paid', to: config.operatorNotifyEmail,
      subject: `[Why Humanoid?] Paid order ${order.id}: ${service.name}`,
      body: `A ${service.name} order was paid (${order.mode} mode). The questionnaire is open; the 24-hour clock starts when it is submitted.\n\nQueue: ${config.appUrl}#ops` }] : []),
  ];
}
function submittedMessages(order, email, config) {
  const service = REPORT_SERVICES_BY_ID.get(order.service);
  const [at, due] = [order.submitted_at, order.due_at];
  return [
    { orderId: order.id, kind: 'customer_submitted', to: email,
      subject: `Questionnaire received: your ${service.name} is due by ${fmtUtc(due)}`,
      body:
        `We received your completed questionnaire on ${fmtUtc(at)}.\n\n` +
        `We will email your report (PDF) to this address by ${fmtUtc(due)} (${fmtMadrid(due)}).\n\n` +
        `You can review what you sent at ${config.appUrl}#reports. If something needs correcting, reply to ${SUPPORT_EMAIL}; the deadline stays as above.\n\nOrder reference: ${order.id}` },
    ...(config.operatorNotifyEmail ? [{ orderId: order.id, kind: 'operator_submitted', to: config.operatorNotifyEmail,
      subject: `[Why Humanoid?] Questionnaire submitted ${order.id}: due ${fmtUtc(due)}`,
      body: `${service.name} questionnaire submitted at ${fmtUtc(at)}. Report due by ${fmtUtc(due)} (${fmtMadrid(due)}).\n\nThe answers are in the queue (sign in as an operator): ${config.appUrl}#ops` }] : []),
  ];
}
// One outbox row, written only if the order is in the state the email belongs to (`condition`, SQL on report_orders),
// and only once per order and kind (UNIQUE (order_id, kind) with INSERT OR IGNORE).
function outboxStatement(db, now, m, condition, params = []) {
  return db
    .prepare(`INSERT OR IGNORE INTO notification_outbox (id, order_id, kind, to_email, subject, body, status, attempts, next_attempt_at, created_at)
              SELECT ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ? WHERE EXISTS (SELECT 1 FROM report_orders WHERE id = ? AND ${condition})`)
    .bind(newId('ntf'), m.orderId, m.kind, m.to, m.subject, m.body, now, now, m.orderId, ...params);
}

// Writes any missing email of the steps an order has passed (payment, submission), from its stored timestamps.
// Never changes the order. Returns true when something was missing.
export async function repairOrderNotifications({ db, config, order, now }) {
  const account = await db.prepare('SELECT email FROM accounts WHERE id = ?').bind(order.account_id).first();
  const statements = [
    ...(order.paid_at ? paidMessages(order, account.email, config).map((m) => outboxStatement(db, now, m, 'paid_at IS NOT NULL')) : []),
    ...(order.submitted_at ? submittedMessages(order, account.email, config).map((m) => outboxStatement(db, now, m, 'submitted_at IS NOT NULL')) : []),
  ];
  if (!statements.length) return false;
  return (await db.batch(statements)).some((x) => x?.meta?.changes);
}

// Server-side reconciliation for a delayed webhook: the owner asks, the server retrieves the session from Stripe.
export async function reconcileOrder({ db, config, gateway, accountId, orderId, now, notify }) {
  const order = await ownOrder(db, accountId, orderId);
  if (order.status !== 'pending_payment' || !order.checkout_session_id) {
    if (await repairOrderNotifications({ db, config, order, now })) notify?.();
    return publicOrder(order, { withAnswers: true });
  }
  let session;
  try { session = await gateway.retrieveCheckoutSession(order.checkout_session_id); } catch { throw new HttpError(503, 'stripe_unavailable'); }
  await applyReportSession({ db, config, session, now, notify });
  return getOrder(db, accountId, orderId);
}

export async function saveDraft({ db, accountId, orderId, answers, now }) {
  const order = await ownOrder(db, accountId, orderId);
  if (!OPEN_STATUSES.includes(order.status)) throw new HttpError(409, order.status === 'pending_payment' ? 'payment_not_confirmed' : 'questionnaire_closed');
  const result = validateAnswers(order.service, answers, { final: false });
  if (result.error === 'unknown_service' || result.error === 'invalid_answers' && !result.answers) throw new HttpError(400, result.error);
  if (result.problems?.length) return { saved: false, problems: result.problems };
  const json = JSON.stringify(result.answers);
  if (json.length > MAX_ANSWERS_BYTES) throw new HttpError(413, 'answers_too_large');
  await db.prepare("UPDATE report_orders SET draft_json = ?, draft_saved_at = ?, updated_at = ? WHERE id = ? AND status = 'awaiting_questionnaire'").bind(json, now, now, orderId).run();
  return { saved: true, draft_saved_at: now, progress: progress(order.service, result.answers) };
}

// The final submit. Validates everything on the server, then one conditional UPDATE moves the order from
// awaiting_questionnaire to awaiting_report with the answer snapshot, the form version, submitted_at and due_at.
// A repeated submit finds the order already submitted and returns it unchanged: the deadline never moves.
export async function submitQuestionnaire({ db, config, accountId, orderId, answers, now, notify }) {
  const order = await ownOrder(db, accountId, orderId);
  if (order.submitted_at) {
    // Already submitted: nothing changes, but a missing confirmation or operator email is written now.
    if (await repairOrderNotifications({ db, config, order, now })) notify?.();
    return { submitted: true, already: true, order: publicOrder(order, { withAnswers: true }) };
  }
  if (order.status !== 'awaiting_questionnaire') throw new HttpError(409, order.status === 'pending_payment' ? 'payment_not_confirmed' : 'questionnaire_closed');
  const result = validateAnswers(order.service, answers, { final: true });
  if (result.error) return { submitted: false, problems: result.problems ?? [{ field: null, problem: result.error }] };
  const json = JSON.stringify(result.answers);
  if (json.length > MAX_ANSWERS_BYTES) throw new HttpError(413, 'answers_too_large');
  const due = now + REPORT_DEADLINE_SECONDS;
  const account = await db.prepare('SELECT email FROM accounts WHERE id = ?').bind(accountId).first();
  // One transaction: the submission (answers, form version, submitted_at, due_at) and its two emails. The emails are
  // written only by the request whose submission won (submitted_at = this request's time).
  const results = await db.batch([
    db.prepare(`UPDATE report_orders SET status = 'awaiting_report', submitted_json = ?, form_version = ?, submitted_at = ?, due_at = ?, draft_json = ?, draft_saved_at = ?, updated_at = ?
                 WHERE id = ? AND status = 'awaiting_questionnaire' AND submitted_at IS NULL`)
      .bind(json, QUESTIONNAIRE_VERSION, now, due, json, now, now, orderId),
    ...submittedMessages({ ...order, submitted_at: now, due_at: due }, account.email, config).map((m) => outboxStatement(db, now, m, 'submitted_at = ?', [now])),
  ]);
  const row = await db.prepare('SELECT * FROM report_orders WHERE id = ?').bind(orderId).first();
  if (!results[0].meta.changes) return { submitted: true, already: true, order: publicOrder(row, { withAnswers: true }) };
  notify?.();
  return { submitted: true, already: false, order: publicOrder(row, { withAnswers: true }) };
}

// ---- Outbox ---------------------------------------------------------------------------------------------------


const BACKOFF = [60, 300, 900, 3600, 3 * 3600, 6 * 3600, 12 * 3600];
// Sends due messages; a failure is retried with backoff and stays visible in the queue. Returns counts.
export async function deliverOutbox({ db, mailer, now, limit = 20, ids = null }) {
  if (!mailer?.configured) return { sent: 0, failed: 0, skipped: 'email_not_configured' };
  const { results } = ids
    ? await db.prepare(`SELECT * FROM notification_outbox WHERE status != 'sent' AND id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()
    : await db.prepare("SELECT * FROM notification_outbox WHERE status != 'sent' AND next_attempt_at <= ? ORDER BY next_attempt_at LIMIT ?").bind(now, limit).all();
  let sent = 0;
  let failed = 0;
  for (const m of results) {
    try {
      await mailer.send({ to: m.to_email, subject: m.subject, text: m.body });
      await db.prepare("UPDATE notification_outbox SET status = 'sent', sent_at = ?, attempts = attempts + 1, last_error = NULL WHERE id = ? AND status != 'sent'").bind(now, m.id).run();
      sent += 1;
    } catch (error) {
      const wait = BACKOFF[Math.min(m.attempts, BACKOFF.length - 1)];
      await db.prepare("UPDATE notification_outbox SET status = 'failed', attempts = attempts + 1, next_attempt_at = ?, last_error = ? WHERE id = ?").bind(now + wait, String(error?.message ?? error).slice(0, 300), m.id).run();
      failed += 1;
    }
  }
  return { sent, failed };
}

// ---- Operator queue ------------------------------------------------------------------------------------------

export async function operatorQueue(db, now) {
  // Every paid order, and unpaid ones from the last 7 days; work first (submitted, by deadline), then open questionnaires.
  const { results } = await db.prepare("SELECT * FROM report_orders WHERE status != 'pending_payment' OR created_at > ? ORDER BY CASE status WHEN 'awaiting_report' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'awaiting_questionnaire' THEN 2 ELSE 3 END, due_at, created_at DESC LIMIT 200").bind(now - 7 * 86400).all();
  const { results: outbox } = await db.prepare("SELECT id, order_id, kind, to_email, status, attempts, next_attempt_at, last_error, created_at, sent_at FROM notification_outbox ORDER BY created_at DESC LIMIT 200").all();
  const emails = new Map();
  for (const r of results) if (!emails.has(r.account_id)) emails.set(r.account_id, (await db.prepare('SELECT email FROM accounts WHERE id = ?').bind(r.account_id).first())?.email);
  return {
    orders: results.map((r) => ({ ...publicOrder(r), mode: r.mode, account_email: emails.get(r.account_id), operator_note: r.operator_note, started_at: r.started_at, delivery_note: r.delivery_note })),
    outbox,
  };
}

export async function operatorOrder(db, orderId) {
  const row = await db.prepare('SELECT * FROM report_orders WHERE id = ?').bind(orderId).first();
  if (!row) throw new HttpError(404, 'order_not_found');
  const account = await db.prepare('SELECT email FROM accounts WHERE id = ?').bind(row.account_id).first();
  const { results: outbox } = await db.prepare('SELECT id, kind, to_email, status, attempts, next_attempt_at, last_error, sent_at FROM notification_outbox WHERE order_id = ? ORDER BY created_at').bind(orderId).all();
  return { ...publicOrder(row, { withAnswers: true }), mode: row.mode, account_email: account?.email, operator_note: row.operator_note, started_at: row.started_at, delivery_note: row.delivery_note, outbox };
}

// The operator records the work state. "delivered" is a record that the PDF was emailed by the operator, with a note
// (for example the date and address it was sent to); the system does not send the PDF itself.
export async function operatorUpdate(db, orderId, { status, note }, now) {
  const row = await db.prepare('SELECT * FROM report_orders WHERE id = ?').bind(orderId).first();
  if (!row) throw new HttpError(404, 'order_not_found');
  const text = String(note ?? '').trim().slice(0, 2000) || null;
  if (status === 'in_progress') {
    if (row.status !== 'awaiting_report') throw new HttpError(409, 'not_awaiting_report');
    await db.prepare("UPDATE report_orders SET status = 'in_progress', started_at = ?, operator_note = COALESCE(?, operator_note), updated_at = ? WHERE id = ?").bind(now, text, now, orderId).run();
  } else if (status === 'delivered') {
    if (!['awaiting_report', 'in_progress'].includes(row.status)) throw new HttpError(409, 'not_submitted');
    if (!text) throw new HttpError(400, 'delivery_note_required');
    await db.prepare("UPDATE report_orders SET status = 'delivered', delivered_at = ?, delivery_note = ?, updated_at = ? WHERE id = ?").bind(now, text, now, orderId).run();
  } else if (status === 'note') {
    await db.prepare('UPDATE report_orders SET operator_note = ?, updated_at = ? WHERE id = ?').bind(text, now, orderId).run();
  } else {
    throw new HttpError(400, 'invalid_status');
  }
  return operatorOrder(db, orderId);
}
