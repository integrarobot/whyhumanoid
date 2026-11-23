#!/usr/bin/env node
// Local staging (23 Nov 2026): serves the staging bundle (node tools/build-staging.mjs --origin http://localhost:8788)
// the way the test Worker would, with static-asset semantics (directory index, /dir -> /dir/, 404.html) and the real
// API (src/app.js) on the same origin, over synthetic fixture data. Payments are simulated with Stripe-shaped,
// signed test-mode events sent through the real webhook route, so duplicates, cancellation and expiry run the same
// code as in Stripe test mode. No network, no Stripe account, no real charge. Never deploy this file.
//
//   node tools/build-staging.mjs --origin http://localhost:8788 && node server/scripts/staging-local.mjs
//   POST /dev/event {"email","id","type","status","period_end","cancel_at_period_end"}  signed test-mode event
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
const site = fileURLToPath(new URL('../.staging/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.csv': 'text/csv', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain', '.png': 'image/png' };

const db = createTestDb();
await runImport(db, fixtureWorkbook({ rowsPerTab: 12 }), Math.floor(Date.now() / 1000));
const links = new Map();
const mailer = { configured: true, async send({ to, text }) { links.set(to, text.split('\n')[2]); } };
const gateway = createStripeGateway({ secretKey: 'sk_test_local_staging', webhookSecret: SECRET });
gateway.retrievePrice = async (id) => ({ ...VALID_PRICE, id });
gateway.createCheckoutSession = async () => ({ id: 'cs_test_local', url: `${ORIGIN}/dev/checkout` });
gateway.createPortalSession = async () => ({ url: `${ORIGIN}/dev/portal` });
const app = createApp({
  db, mailer, gateway,
  config: { allowedOrigins: [ORIGIN], premiumUrl: `${ORIGIN}/app/`, stripeMode: 'test', checkoutEnabled: true, allowLiveCheckout: false, stripePriceId: PRICE, loginTtlSeconds: 900, loginMaxPerHour: 50, sessionTtlSeconds: 86400 },
});

async function signedEvent({ email, id, type = 'customer.subscription.updated', status = 'active', period_end, cancel_at_period_end = false }) {
  const account = await db.prepare('SELECT id FROM accounts WHERE email = ?').bind(String(email).toLowerCase()).first();
  if (!account) return { status: 404, body: 'sign in first' };
  const now = Math.floor(Date.now() / 1000);
  const event = {
    id, object: 'event', type, created: now, livemode: false,
    data: { object: { id: `sub_${account.id}`, object: 'subscription', customer: `cus_${account.id}`, status, cancel_at_period_end, metadata: { wh_account_id: account.id }, items: { object: 'list', data: [{ id: 'si_local', price: { id: PRICE }, current_period_end: period_end ?? now + 365 * 86400 }] } } },
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
  if (url.pathname === '/dev/magic') return res.writeHead(200, { 'content-type': 'text/plain' }).end(links.get(url.searchParams.get('email')) ?? '');
  if (url.pathname === '/dev/checkout' || url.pathname === '/dev/portal') return res.writeHead(200, { 'content-type': 'text/html' }).end(`<!doctype html><p>Simulated Stripe ${url.pathname.slice(5)} (test mode, nothing charged). <a href="/app/">Back</a></p>`);
  if (url.pathname === '/health' || url.pathname.startsWith('/v1/')) {
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
