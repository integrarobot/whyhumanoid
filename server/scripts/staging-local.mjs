#!/usr/bin/env node
// Local staging (23 Nov 2026): serves the staging bundle (node tools/build-staging.mjs --origin http://localhost:8788)
// the way the test Worker would, with static-asset semantics (directory index, /dir -> /dir/, 404.html) and the real
// API (src/app.js) on the same origin, over synthetic fixture data. Payments are simulated with Stripe-shaped,
// signed test-mode events sent through the real webhook route, so duplicates, cancellation and expiry run the same
// code as in Stripe test mode. No network, no Stripe account, no real charge. Never deploy this file.
//
//   node tools/build-staging.mjs --origin http://localhost:8788 && node server/scripts/staging-local.mjs
//   POST /dev/event {"email","id","type","status","period_end","cancel_at_period_end","price"}  signed test-mode event
//                  (price: "price_local_legacy_eur" for a subscription at the former EUR price)
//   GET  /dev/magic?email=  the last sign-in link sent to that address (the mailer prints nothing elsewhere)

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { createStripeGateway } from '../src/billing.js';
import { hmacSha256Hex } from '../src/crypto.js';
import { runImport } from '../src/import/run.js';
import { createTestDb, fixtureWorkbook, VALID_PRICE } from '../test/helpers.js';

const PORT = Number(process.env.PORT ?? 8788);
const ORIGIN = `http://localhost:${PORT}`;
const SECRET = 'whsec_local_staging_only';
const PRICE = 'price_local_staging';
const LEGACY = 'price_local_legacy_eur'; // a subscription bought at the former EUR price keeps its access
const site = fileURLToPath(new URL('../.staging/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.csv': 'text/csv', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain', '.png': 'image/png' };

const db = createTestDb();
await runImport(db, fixtureWorkbook({ rowsPerTab: 12 }), Math.floor(Date.now() / 1000));
const links = new Map();
const mails = [];
const mailer = { configured: true, async send({ to, subject, text }) { mails.push({ to, subject, text, at: Date.now() }); if (/sign-in link/i.test(subject)) links.set(to, text.split('\n')[2]); } };
const gateway = createStripeGateway({ secretKey: 'sk_test_local_staging', webhookSecret: SECRET });
gateway.retrievePrice = async (id) => ({ ...VALID_PRICE, id });
gateway.createCheckoutSession = async () => ({ id: 'cs_test_local', url: `${ORIGIN}/dev/checkout` });
gateway.createPortalSession = async () => ({ url: `${ORIGIN}/dev/portal` });
// Custom reports (25 Nov 2026): one-off sessions kept here; /dev/report-checkout plays Stripe's hosted page and sends
// the signed event for the outcome chosen (paid, expired, failed, or nothing, to test a delayed webhook).
const REPORT_PRICES = { 'humanoid-adoption-assessment': 'price_local_report_integration', 'component-manufacturing-study': 'price_local_report_diversification' };
const sessions = new Map();
let seq = 0;
gateway.retrievePrice = async (id) => (Object.values(REPORT_PRICES).includes(id) ? { id, object: 'price', active: true, type: 'one_time', currency: 'usd', unit_amount: 100000, livemode: false } : { ...VALID_PRICE, id });
const byKey = new Map();
gateway.createReportCheckoutSession = async (args) => {
  if (byKey.has(args.idempotencyKey)) return byKey.get(args.idempotencyKey);
  const id = `cs_test_local_report_${++seq}`;
  sessions.set(id, { id, object: 'checkout.session', mode: 'payment', status: 'open', payment_status: 'unpaid', amount_total: 100000, currency: 'usd', livemode: false, client_reference_id: args.accountId, metadata: { wh_order_id: args.orderId, wh_account_id: args.accountId, wh_service: args.service }, success_url: args.successUrl, cancel_url: args.cancelUrl });
  const result = { id, url: `${ORIGIN}/dev/report-checkout?session=${id}` };
  byKey.set(args.idempotencyKey, result);
  return result;
};
gateway.retrieveCheckoutSession = async (id) => ({ ...sessions.get(id) });
const app = createApp({
  db, mailer, gateway,
  config: { allowedOrigins: [ORIGIN], premiumUrl: `${ORIGIN}/app/`, appUrl: `${ORIGIN}/app/`, stripeMode: 'test', checkoutEnabled: true, allowLiveCheckout: false, stripePriceId: PRICE, stripeLegacyPriceIds: [LEGACY], loginTtlSeconds: 900, loginMaxPerHour: 50, sessionTtlSeconds: 86400,
    reportsCheckoutEnabled: true, reportPriceIds: REPORT_PRICES, operatorEmails: ['operator@example.com'], operatorNotifyEmail: 'orders@example.com' },
  fetchPublic: async (path) => { try { return new Response(await readFile(join(site, path)), { status: 200 }); } catch { return new Response('not found', { status: 404 }); } },
});

async function signedReportEvent(sessionId, outcome) {
  const s = sessions.get(sessionId);
  if (!s) return { status: 404, body: 'no session' };
  const now = Math.floor(Date.now() / 1000);
  const type = outcome === 'expired' ? 'checkout.session.expired' : outcome === 'failed' ? 'checkout.session.async_payment_failed' : 'checkout.session.completed';
  Object.assign(s, outcome === 'expired' ? { status: 'expired' } : outcome === 'failed' ? { status: 'complete', payment_status: 'unpaid' } : { status: 'complete', payment_status: 'paid', payment_intent: 'pi_local' });
  const event = { id: `evt_${sessionId}_${outcome}`, object: 'event', type, created: now, livemode: false, data: { object: { ...s } } };
  const payload = JSON.stringify(event);
  const sig = await hmacSha256Hex(SECRET, `${now}.${payload}`);
  const r = await app(new Request(`${ORIGIN}/v1/stripe/webhook`, { method: 'POST', body: payload, headers: { 'stripe-signature': `t=${now},v1=${sig}`, 'content-type': 'application/json' } }));
  return { status: r.status, body: await r.text() };
}

async function signedEvent({ email, id, type = 'customer.subscription.updated', status = 'active', period_end, cancel_at_period_end = false, price = null }) {
  const account = await db.prepare('SELECT id FROM accounts WHERE email = ?').bind(String(email).toLowerCase()).first();
  if (!account) return { status: 404, body: 'sign in first' };
  const now = Math.floor(Date.now() / 1000);
  const event = {
    id, object: 'event', type, created: now, livemode: false,
    data: { object: { id: `sub_${account.id}`, object: 'subscription', customer: `cus_${account.id}`, status, cancel_at_period_end, metadata: { wh_account_id: account.id }, items: { object: 'list', data: [{ id: 'si_local', price: { id: price ?? PRICE }, current_period_end: period_end ?? now + 365 * 86400 }] } } },
  };
  const payload = JSON.stringify(event);
  const sig = await hmacSha256Hex(SECRET, `${now}.${payload}`);
  const r = await app(new Request(`${ORIGIN}/v1/stripe/webhook`, { method: 'POST', body: payload, headers: { 'stripe-signature': `t=${now},v1=${sig}`, 'content-type': 'application/json' } }));
  return { status: r.status, body: await r.text() };
}

createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  if (url.pathname === '/dev/event' && req.method === 'POST') {
    const r = await signedEvent(JSON.parse(body.toString() || '{}'));
    return res.writeHead(r.status, { 'content-type': 'application/json' }).end(r.body);
  }
  if (url.pathname === '/dev/report-checkout') {
    const s = sessions.get(url.searchParams.get('session'));
    if (!s) return res.writeHead(404).end('no session');
    return res.writeHead(200, { 'content-type': 'text/html' }).end(`<!doctype html><meta name="viewport" content="width=device-width"><p>Simulated Stripe Checkout (test mode, nothing charged): US$1,000.00 one-off.</p>
      <p><a id="pay" href="/dev/report-pay?session=${s.id}&outcome=paid">Pay (signed webhook)</a> · <a id="pay-silent" href="/dev/report-pay?session=${s.id}&outcome=silent">Pay, webhook delayed</a> · <a id="cancel" href="${s.cancel_url}">Cancel</a></p>`);
  }
  if (url.pathname === '/dev/report-pay') {
    const id = url.searchParams.get('session');
    const outcome = url.searchParams.get('outcome') ?? 'paid';
    const s = sessions.get(id);
    if (!s) return res.writeHead(404).end('no session');
    // "silent": Stripe has the payment but the webhook has not arrived; the app must reconcile on return.
    if (outcome === 'silent') Object.assign(s, { status: 'complete', payment_status: 'paid' });
    else await signedReportEvent(id, outcome);
    if (['expired', 'failed'].includes(outcome)) return res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
    return res.writeHead(302, { location: s.success_url }).end();
  }
  if (url.pathname === '/dev/mails') return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(mails.filter((m) => !url.searchParams.get('to') || m.to === url.searchParams.get('to'))));
  if (url.pathname === '/dev/magic') return res.writeHead(200, { 'content-type': 'text/plain' }).end(links.get(url.searchParams.get('email')) ?? '');
  if (url.pathname === '/dev/checkout' || url.pathname === '/dev/portal') return res.writeHead(200, { 'content-type': 'text/html' }).end(`<!doctype html><p>Simulated Stripe ${url.pathname.slice(5)} (test mode, nothing charged). <a href="/app/">Back</a></p>`);
  if (url.pathname === '/health' || url.pathname === '/mcp' || url.pathname.startsWith('/v1/')) {
    const response = await app(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return res.end(Buffer.from(await response.arrayBuffer()));
  }
  // Static assets as the Worker serves them: /dir/ -> dir/index.html, /dir -> 307 /dir/, else 404.html with 404.
  const path = normalize(join(site, decodeURIComponent(url.pathname)));
  if (!path.startsWith(site)) return res.writeHead(404).end();
  const isFile = async (p) => (await stat(p).catch(() => null))?.isFile();
  if (url.pathname.endsWith('/') && await isFile(join(path, 'index.html'))) return res.writeHead(200, { 'content-type': types['.html'] }).end(await readFile(join(path, 'index.html')));
  if (!url.pathname.endsWith('/') && await isFile(path)) return res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(await readFile(path));
  if (!url.pathname.endsWith('/') && await isFile(join(path, 'index.html'))) return res.writeHead(307, { location: `${url.pathname}/${url.search}` }).end();
  res.writeHead(404, { 'content-type': types['.html'] }).end(await readFile(join(site, '404.html')));
}).listen(PORT, () => console.log(`Local staging: ${ORIGIN}/ (synthetic API data, simulated test-mode payments)`));
