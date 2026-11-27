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
// A subscription bought at the former EUR 100 per year price (before 24 Nov 2026): it keeps its access.
export const LEGACY_EUR_PRICE = 'price_legacy_eur_fixture';
export const T0 = 1_800_000_000;
// Custom reports (25 Nov 2026): one-off USD 1,000 test prices per service.
export const REPORT_PRICES = { 'humanoid-adoption-assessment': 'price_report_integration_fixture', 'component-manufacturing-study': 'price_report_diversification_fixture' };
export const VALID_REPORT_PRICE = { object: 'price', active: true, type: 'one_time', currency: 'usd', unit_amount: 100000, livemode: false };
export const OPERATOR_EMAIL = 'operator@example.com';
export const NOTIFY_EMAIL = 'orders@example.com';

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
  for (const m of ['0001_init.sql', '0002_relations.sql', '0003_search.sql', '0004_report_orders.sql', '0005_report_orders_one_pending.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
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
  currency: 'usd',
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

// Robotics Evaluation Atlas tabs: synthetic values that pass the atlas validation (server/src/benchmarks/atlas.js).
// First public dates (server/src/public-dates.js): odd rows dated as the source states a year, even rows undated.
const publicDate = (i, meaning, host) => (i % 2
  ? { public_date: '2024', public_date_precision: 'year', public_date_meaning: meaning, public_date_source_url: `https://${host}-${i}.example.com/news`, public_date_locator: 'Synthetic announcement', public_date_checked_at: '2026-11-25', public_date_note: '' }
  : { public_date: '', public_date_precision: '', public_date_meaning: '', public_date_source_url: '', public_date_locator: '', public_date_checked_at: '', public_date_note: '' });
function atlasFixtureValue(dataset, field, i, n) {
  if (dataset === 'benchmarks') {
    const v = { benchmark_id: `bm-example-${i}`, name: `Example benchmark ${i}`, url: `https://bench-${i}.example.com/`, environment: 'Simulation',
      capability_tags: 'manipulation; generalization', related_dataset_ids: '', checked_at: '2026-11-23', source_url: `https://bench-${i}.example.com/`, ...publicDate(i, 'benchmark_release', 'bench') };
    return field in v ? v[field] : `Synthetic ${field.replace(/_/g, ' ')} ${i}`;
  }
  const v = { result_id: `res-example-${i}`, benchmark_id: `bm-example-${((i - 1) % n) + 1}`, model: `Example model ${i}`, metric: 'Success',
    value: String((i % 90) + 5), unit: '%', direction: 'higher', n_evals: '', comparability_group: `example-group-${i}`, result_date: '2026-11-20',
    checked_at: '2026-11-23', source_url: `https://results-${i}.example.com/`, display_status: 'source_reported', date_meaning: 'Synthetic date' };
  return field in v ? v[field] : `Synthetic ${field.replace(/_/g, ' ')} ${i}`;
}

// Robot Learning Data Atlas tabs: synthetic values that pass the data atlas validation (server/src/data-atlas/atlas.js).
function dataAtlasFixtureValue(dataset, field, i, n) {
  if (dataset === 'datasets') {
    const v = { dataset_id: `ds-example-${i}`, name: `Example dataset ${i}`, url: `https://data-${i}.example.com/`, related_benchmark_ids: '',
      related_benchmark_url: '', checked_at: '2026-11-23', data_origin: 'real_robot', modalities: 'rgb; action', learning_uses: 'manipulation',
      access_status: 'dataset_link', source_url: `https://data-${i}.example.com/`, parent_dataset_ids: '', resource_class: 'corpus', included_in_atlas: 'true', ...publicDate(i, 'data_release', 'data') };
    return field in v ? v[field] : `Synthetic ${field.replace(/_/g, ' ')} ${i}`;
  }
  const v = { metric_id: `dm-example-${i}`, dataset_id: `ds-example-${((i - 1) % n) + 1}`, metric: 'trajectories', value: String(1000 + i), unit: 'trajectories',
    qualifier: 'reported', data_origin: 'real_robot', release_status: 'reported_release', source_url: `https://data-${i}.example.com/`, source_date: '',
    checked_at: '2026-11-23', comparison_group: `example_group_${i}`, display_status: 'source_reported' };
  return field in v ? v[field] : `Synthetic ${field.replace(/_/g, ' ')} ${i}`;
}

// Components tab (23 Nov 2026): one tab, two blocks. Synthetic products that pass server/src/components/catalogue.js,
// then the notes block and the related software block with its own header row.
function componentFixtureRow(spec, i, software = false) {
  const v = {
    no: String(i), name: software ? `Example simulator ${i}` : `Example sensor ${i}`, group: software ? 'Software (simulator)' : (i % 3 ? 'Commercial' : 'Research / open hardware'),
    component_id: `CMP-${software ? 'SWT' : 'TST'}-${String(i).padStart(3, '0')}`, family: software ? 'Tactile simulator (software)' : 'Tactile sensor',
    principle: 'Synthetic optical principle with a camera', list_price: i % 2 ? `${100 + i} USD (example.com, accessed 23 Nov 2026)` : 'Not available',
    weight: 'Not available', bom_cost: 'N/A', review_status: 'Imported from Grok workbook; original-source review pending',
    source_workbook: ['https://docs.google', '.com/spreadsheets/d/fixture/edit'].join(''),
    // Family-specific extension (26 Nov 2026): left empty here, as in a tab not yet extended; components.test.js
    // covers classified rows.
    component_class: '', applications: '', technical_specifications: '', integration_requirements: '', limitations: '', evidence_scope: '', checked_at: '',
    function: `Synthetic function ${i}`,
    sources: `Product page\nhttps://sensor-${i}.example.com/\nAccessed: 23 Nov 2026\nReview status: Imported reference; original-source review pending\n\nPaper\nhttps://paper-${i}.example.com/\nAccessed: 23 Nov 2026\nReview status: Imported reference; original-source review pending`,
  };
  return spec.fields.map((f) => (f in v ? v[f] : `Synthetic ${f.replace(/_/g, ' ')} ${i}`));
}
function componentsTab(spec, rowsPerTab) {
  const rows = [[...spec.headers]];
  for (let i = 1; i <= rowsPerTab; i += 1) rows.push(componentFixtureRow(spec, i));
  rows.push([], [], ['CATALOGUE NOTES', '', 'Source notes and import history'], ['Research date', '', '23 November 2026'], []);
  rows.push(['RELATED SOFTWARE — NOT A PHYSICAL COMPONENT'], [...spec.headers], componentFixtureRow(spec, 1, true));
  return rows;
}

// Synthetic workbook with the real header rows and fake values. An empty sheet row sits after the third data
// row of every tab: it must not count towards the 10-row preview.
// One synthetic Integrators row (26 columns, server/src/integrators/catalogue.js). Row 1 is the requested specialist
// exception, row 2 a record whose humanoid scope is unconfirmed; the rest are humanoid-specific providers.
export function integratorFixtureRow(i) {
  const status = i === 1 ? 'Requested specialist exception; exclude from validated humanoid-provider counts' : i === 2 ? 'Existing adjacent record; humanoid eligibility unconfirmed' : 'Humanoid-specific provider';
  const unknown = 'Not established in reviewed sources';
  return [
    `Example integrator ${i}`, `https://integrator-${i}.example.com/`, `Synthetic integrator ${i} description.`, `int_fx${i}`,
    `Example Integrator ${i} Group (fixture; legacy Example ${i})`, 'System integrator; distributor; training',
    i % 2 ? 'Madrid, Spain' : unknown, i % 2 ? 'Spain; Portugal' : unknown, i === 1 ? 'None validated' : 'Unitree G1; H1',
    'Site audit; integration; operator training; maintenance', 'Research; education', 'Explicit humanoid offering',
    'Commercial offering', unknown, 'ROS 2', unknown, 'Maintenance and spares', 'Robot supply and integration',
    'Humanoid integration project price not published in reviewed sources',
    `https://integrator-${i}.example.com/\nhttps://news.example.com/integrator-${i}`, 'Not stated on reviewed service pages',
    '2026-11-24', 'Primary-source claim checked', `Synthetic limitation ${i}.`, status, 'Fixture',
  ];
}

export function fixtureWorkbook({ rowsPerTab = 12 } = {}) {
  const values = {};
  for (const spec of DATASETS) {
    if (spec.tab === 'Components') { values.Components ??= componentsTab(spec, rowsPerTab); continue; }
    const rows = [[...spec.headers]];
    for (let i = 1; i <= rowsPerTab; i += 1) {
      if (i === 4) rows.push([]);
      if (spec.id === 'humanoids') {
        rows.push(humanoidRow(spec, i));
        // Rows the sheet itself excludes: kept as internal provenance, never served or counted.
        if (i === 2) rows.push(spec.headers.map((f) => (f === 'Lab' ? 'Example Labs 1' : f === 'Robot' ? 'Duplicate: see Example Robot 1' : '')));
        if (i === rowsPerTab) rows.push(spec.headers.map((f) => (f === 'Lab' ? 'Example Publisher' : f === 'Robot' ? 'Resource' : '')));
        continue;
      }
      if (spec.id === 'integrators') {
        rows.push(integratorFixtureRow(i));
      } else if (spec.kind === 'lists') {
        const row = new Array(spec.headers.length).fill('');
        for (const def of spec.lists) {
          row[def.columns.name] = `Example ${def.list} ${i}`;
          row[def.columns.url] = `https://${def.list.replace('_', '-')}-${i}.example.com/`;
          if (def.columns.description !== undefined) row[def.columns.description] = `Synthetic ${def.list} ${i}`;
        }
        rows.push(row);
      } else if (spec.id === 'benchmarks' || spec.id === 'benchmark-results') {
        rows.push((spec.fields ?? spec.headers).map((field) => atlasFixtureValue(spec.id, field, i, rowsPerTab)));
      } else if (spec.id === 'datasets' || spec.id === 'dataset-metrics') {
        rows.push((spec.fields ?? spec.headers).map((field) => dataAtlasFixtureValue(spec.id, field, i, rowsPerTab)));
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
  legacyPriceIds = [LEGACY_EUR_PRICE],
  price = VALID_PRICE,
  workbook = null,
  reportsCheckoutEnabled = true,
  reportPriceIds = REPORT_PRICES,
  reportPrice = VALID_REPORT_PRICE,
  investmentThesisCheckoutEnabled = false,
  investmentThesisPrice = { ...VALID_REPORT_PRICE, unit_amount: 10000 },
  adminToken = null,
} = {}) {
  const db = createTestDb();
  let now = T0;
  const mailer = createMemoryMailer();
  const gateway = createStripeGateway({ secretKey: stripeKey, webhookSecret: WEBHOOK_SECRET });
  const checkoutCalls = [];
  const priceLookups = [];
  gateway.retrievePrice = async (id) => {
    priceLookups.push(id);
    if (id === reportPriceIds['investment-thesis']) return { ...investmentThesisPrice, id };
    if (Object.values(REPORT_PRICES).includes(id)) return reportPrice ? { ...reportPrice, id } : Promise.reject(new Error('No such price'));
    return price ? { ...price, id } : Promise.reject(new Error('No such price'));
  };
  // Report Checkout Sessions: stored here, so tests can complete, expire or retrieve them like Stripe would.
  const reportSessions = new Map();
  let sessionSeq = 0;
  // Like Stripe: the same idempotency key returns the same session.
  const byKey = new Map();
  gateway.createReportCheckoutSession = async (args) => {
    if (byKey.has(args.idempotencyKey)) return byKey.get(args.idempotencyKey);
    sessionSeq += 1;
    const id = `cs_test_report_${sessionSeq}`;
    reportSessions.set(id, { id, object: 'checkout.session', mode: 'payment', status: 'open', payment_status: 'unpaid', amount_total: args.service === 'investment-thesis' ? 10000 : 100000, currency: 'usd', livemode: false, client_reference_id: args.accountId, metadata: { wh_order_id: args.orderId, wh_account_id: args.accountId, wh_service: args.service }, payment_intent: null, args });
    const result = { id, url: `https://checkout.stripe.com/c/pay/${id}` };
    byKey.set(args.idempotencyKey, result);
    return result;
  };
  gateway.retrieveCheckoutSession = async (id) => {
    const session = reportSessions.get(id);
    if (!session) throw new Error('No such session');
    return { ...session };
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
    stripeLegacyPriceIds: legacyPriceIds,
    loginTtlSeconds: 900,
    loginMaxPerHour: 5,
    sessionTtlSeconds: 30 * 24 * 3600,
    appUrl: 'https://whyhumanoid.com/app/',
    reportsCheckoutEnabled,
    investmentThesisCheckoutEnabled,
    reportPriceIds,
    operatorEmails: [OPERATOR_EMAIL],
    operatorNotifyEmail: NOTIFY_EMAIL,
    adminToken,
  };
  const publicFiles = new Map();
  const fetchPublic = async (path) => (publicFiles.has(path) ? new Response(publicFiles.get(path), { status: 200 }) : new Response('not found', { status: 404 }));
  const app = createApp({ db, config, gateway, mailer, clock: () => now, log: { error() {} }, fetchPublic });
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
  await runImport(db, workbook ?? fixtureWorkbook(), now);
  return {
    db,
    call,
    mailer,
    gateway,
    checkoutCalls,
    priceLookups,
    config,
    reportSessions,
    publicFiles,
    now: () => now,
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
