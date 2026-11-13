#!/usr/bin/env node
// Local preview of the full-database app and API (as served by the backend host) plus the public catalogue,
// using synthetic fixture data only. Magic links are printed to the console instead of emailed; checkout is off.
// Never deploy this file.
//
//   node server/scripts/dev.mjs            app: http://localhost:8787/   catalogue: http://localhost:8787/catalogue/
//   POST /dev/grant {"email": "..."}        simulates a verified Stripe subscription for that account

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { createStripeGateway } from '../src/billing.js';
import { upsertStripeEntitlement } from '../src/entitlements.js';
import { createTestDb, fixtureWorkbook } from '../test/helpers.js';
import { runImport } from '../src/import/run.js';

const PORT = Number(process.env.PORT ?? 8787);
const ORIGIN = `http://localhost:${PORT}`;
const appRoot = fileURLToPath(new URL('../public/', import.meta.url));
const siteRoot = fileURLToPath(new URL('../../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.csv': 'text/csv' };

const db = createTestDb();
await runImport(db, fixtureWorkbook({ rowsPerTab: 12 }), Math.floor(Date.now() / 1000));
const mailer = { configured: true, async send({ to, text }) { console.log(`\n[magic link for ${to}]\n${text.split('\n')[2]}\n`); } };
const app = createApp({
  db,
  mailer,
  gateway: createStripeGateway({ secretKey: '', webhookSecret: 'whsec_dev_only' }),
  config: {
    allowedOrigins: [ORIGIN],
    premiumUrl: `${ORIGIN}/`,
    stripeMode: 'test',
    checkoutEnabled: false,
    allowLiveCheckout: false,
    stripePriceId: 'price_dev',
    loginTtlSeconds: 900,
    sessionTtlSeconds: 86400,
  },
});

createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);

  if (url.pathname === '/dev/grant' && req.method === 'POST') {
    const { email } = JSON.parse(body.toString() || '{}');
    const account = await db.prepare('SELECT id FROM accounts WHERE email = ?').bind(String(email).toLowerCase()).first();
    if (!account) return res.writeHead(404).end('sign in first');
    const now = Math.floor(Date.now() / 1000);
    await upsertStripeEntitlement(db, { accountId: account.id, subscriptionId: 'sub_dev', status: 'active', currentPeriodEnd: now + 86400, cancelAtPeriodEnd: false, eventCreated: now, now });
    return res.writeHead(200, { 'content-type': 'application/json' }).end('{"granted":true}');
  }

  if (url.pathname === '/health' || url.pathname.startsWith('/v1/')) {
    const response = await app(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return res.end(Buffer.from(await response.arrayBuffer()));
  }

  const catalogue = url.pathname.startsWith('/catalogue/');
  const base = catalogue ? siteRoot : appRoot;
  const rel = catalogue ? url.pathname.slice('/catalogue'.length) : url.pathname;
  const path = normalize(join(base, rel.endsWith('/') ? `${rel}index.html` : rel));
  if (!path.startsWith(base) || /\/(server|tools)\//.test(path.slice(base.length - 1))) return res.writeHead(404).end();
  try {
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(await readFile(path));
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`Why Humanoid? dev preview: app ${ORIGIN}/ , catalogue ${ORIGIN}/catalogue/ (synthetic data)`));
