// Test harness: the production SQL runs on Node's built-in SQLite through a minimal D1-compatible shim.
// All data here is synthetic (example.com, fx_ ids). No real premium rows belong in this repository.

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { createStripeGateway } from '../src/billing.js';
import { createMemoryMailer } from '../src/mailer.js';
import { hmacSha256Hex } from '../src/crypto.js';
import { DATASETS } from '../src/datasets.js';
import { runImport } from '../src/import/run.js';

export const WEBHOOK_SECRET = 'whsec_test_fixture_secret';
export const TEST_PRICE = 'price_test_fixture';
export const T0 = 1_800_000_000;

class Statement {
  constructor(sqlite, sql, params = []) {
    this.sqlite = sqlite;
    this.sql = sql;
    this.params = params;
  }
  bind(...params) {
    return new Statement(
      this.sqlite,
      this.sql,
      params.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v)),
    );
  }
  async first() {
    const row = this.sqlite.prepare(this.sql).get(...this.params);
    return row ? { ...row } : null;
  }
  async all() {
    return { results: this.sqlite.prepare(this.sql).all(...this.params).map((r) => ({ ...r })) };
  }
  runSync() {
    const result = this.sqlite.prepare(this.sql).run(...this.params);
    return { meta: { changes: Number(result.changes) } };
  }
  async run() {
    return this.runSync();
  }
}

export function createTestDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  return {
    prepare: (sql) => new Statement(sqlite, sql),
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map((s) => s.runSync());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

export const VALID_PRICE = {
  id: 'price_test_fixture',
  object: 'price',
  active: true,
  type: 'recurring',
  currency: 'eur',
  unit_amount: 10000,
  recurring: { interval: 'year', interval_count: 1, usage_type: 'licensed' },
  livemode: false,
};

function humanoidRow(spec, i) {
  return spec.headers.map((field) => {
    if (field === 'Lab') return `Example Labs ${i}`;
    if (field === 'Robot') return `Example Robot ${i}`;
    if (field === 'Web') return `https://example.com/robots/${i}`;
    if (field === 'Buyer checks' && i === 2) return 'Keep R2 separate from R3; Measure interventions per hour; do not infer runtime';
    return `fx ${field} ${i}`;
  });
}

// Synthetic workbook with the real header rows and fake values. An empty sheet row sits after the third data
// row of every tab: it must not count towards the 10-row preview.
export function fixtureWorkbook({ rowsPerTab = 12 } = {}) {
  const values = {};
  for (const spec of DATASETS) {
    const rows = [[...spec.headers]];
    for (let i = 1; i <= rowsPerTab; i += 1) {
      if (i === 4) rows.push([]);
      if (spec.id === 'humanoids') {
        rows.push(humanoidRow(spec, i));
        continue;
      }
      if (spec.kind === 'lists') {
        const row = new Array(spec.headers.length).fill('');
        for (const def of spec.lists) {
          row[def.columns.name] = `Example ${def.list} ${i}`;
          row[def.columns.url] = `https://${def.list.replace('_', '-')}-${i}.example.com/`;
          if (def.columns.description !== undefined) row[def.columns.description] = `Synthetic ${def.list} ${i}`;
        }
        rows.push(row);
      } else {
        rows.push((spec.fields ?? spec.headers).map((field) => `fx_${field}_${i}`));
      }
    }
    rows.push([]); // empty sheet row, must be skipped
    values[spec.tab] = rows;
  }
  return values;
}

export async function setup({
  checkoutEnabled = false,
  stripeKey = 'sk_test_fixture',
  stripeMode = 'test',
  allowLiveCheckout = false,
  priceId = TEST_PRICE,
  price = VALID_PRICE,
} = {}) {
  const db = createTestDb();
  let now = T0;
  const mailer = createMemoryMailer();
  const gateway = createStripeGateway({ secretKey: stripeKey, webhookSecret: WEBHOOK_SECRET });
  const checkoutCalls = [];
  const priceLookups = [];
  gateway.retrievePrice = async (id) => {
    priceLookups.push(id);
    return price ? { ...price, id } : Promise.reject(new Error('No such price'));
  };
  gateway.createCheckoutSession = async (args) => {
    checkoutCalls.push(args);
    return { id: 'cs_test_fixture', url: 'https://checkout.stripe.com/c/pay/cs_test_fixture' };
  };
  const config = {
    allowedOrigins: ['https://whyhumanoid.com'],
    premiumUrl: 'https://whyhumanoid.com/premium/',
    stripeMode,
    checkoutEnabled,
    allowLiveCheckout,
    stripePriceId: priceId,
    loginTtlSeconds: 900,
    loginMaxPerHour: 5,
    sessionTtlSeconds: 30 * 24 * 3600,
  };
  const app = createApp({ db, config, gateway, mailer, clock: () => now, log: { error() {} } });
  const call = (method, path, { token, body, headers = {} } = {}) =>
    app(
      new Request(`https://api.test${path}`, {
        method,
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      }),
    );
  await runImport(db, fixtureWorkbook(), now);
  return {
    db,
    call,
    mailer,
    gateway,
    checkoutCalls,
    priceLookups,
    config,
    setNow: (t) => {
      now = t;
    },
  };
}

export async function signIn(ctx, email = 'buyer@example.com') {
  const sent = await ctx.call('POST', '/v1/auth/magic-link', { body: { email } });
  if (sent.status !== 202) throw new Error(`magic link failed: ${sent.status}`);
  const token = /#login=(\S+)/.exec(ctx.mailer.outbox.at(-1).text)[1];
  const redeemed = await ctx.call('POST', '/v1/auth/redeem', { body: { token } });
  const body = await redeemed.json();
  const account = await ctx.db.prepare('SELECT id FROM accounts WHERE email = ?').bind(email).first();
  return { session: body.token, accountId: account.id, loginToken: token };
}

export async function sendWebhook(ctx, event, { secret = WEBHOOK_SECRET, tamper = false } = {}) {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  const body = tamper ? payload.replace('"active"', '"trialing"') : payload;
  return ctx.call('POST', '/v1/stripe/webhook', {
    body,
    headers: { 'stripe-signature': `t=${timestamp},v1=${signature}`, 'content-type': 'application/json' },
  });
}

export function subscriptionEvent({
  id = 'evt_fixture_1',
  type = 'customer.subscription.updated',
  created = T0,
  accountId,
  status = 'active',
  periodEnd = T0 + 30 * 24 * 3600,
  cancelAtPeriodEnd = false,
  priceId = TEST_PRICE,
  customer = 'cus_fixture_1',
  subscriptionId = 'sub_fixture_1',
  livemode = false,
  metadata,
}) {
  return {
    id,
    object: 'event',
    type,
    created,
    livemode,
    data: {
      object: {
        id: subscriptionId,
        object: 'subscription',
        customer,
        status,
        cancel_at_period_end: cancelAtPeriodEnd,
        metadata: metadata ?? (accountId ? { wh_account_id: accountId } : {}),
        items: { object: 'list', data: [{ id: 'si_fixture', price: { id: priceId }, current_period_end: periodEnd }] },
      },
    },
  };
}
