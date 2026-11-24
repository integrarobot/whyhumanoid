// x402 pay-per-query (24 Nov 2026): GET /v1/x402/deployment-evidence, paid per request in USDC on Base through the
// official x402 resource server (@x402/core/server, the official "exact" EVM scheme and the Bazaar discovery
// extension). Signatures, verification and on-chain settlement belong to the facilitator (CDP in production, the
// public x402.org facilitator on Base Sepolia for testing); this file never handles keys or signatures.
//
// What this file adds around the official server:
// - Gates (x402Readiness): nothing is advertised or charged unless the route is enabled, the price is an approved
//   whole-cent amount, the payee is the configured Stripe deposit address, the facilitator is configured and the data
//   are imported. Base mainnet stays closed in code (X402_LIVE_OPEN) until the price and Stripe eligibility are
//   approved: a 503 is returned instead of a 402, so nothing can be paid.
// - Validation before payment: a malformed query is refused (400) without asking for money.
// - Retry safety (D1 table x402_payments): one row per payment authorisation. The same authorisation for the same
//   query gets the same answer again without a second settlement; for another query it is refused (409); while it
//   is settling, other requests wait (409, Retry-After).
// - No charge without an answer: a query error or an empty result is never settled.
// - After settlement, the payment is recorded in Stripe (when enabled) with the transaction hash as idempotency key.

import { HTTPFacilitatorClient, x402HTTPResourceServer, x402ResourceServer } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { bazaarResourceServerExtension, declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { createFacilitatorConfig } from '@coinbase/x402';
import { INPUT_EXAMPLE, INPUT_SCHEMA, OUTPUT_EXAMPLE, OUTPUT_SCHEMA, CAVEATS, FILTERS, MAX_CASES, QueryError, parseQuery, queryEvidence } from './evidence.js';

export const X402_PATH = '/v1/x402/deployment-evidence';

// Base mainnet charges real USDC. It opens only with an approved price and Stripe's approval of the account for
// machine payments (requested 24 Nov 2026, not yet granted). Test mode (Base Sepolia) is not affected.
export const X402_LIVE_OPEN = false;

export const NETWORKS = Object.freeze({
  'eip155:8453': { name: 'Base', live: true, stripeNetwork: 'base' },
  'eip155:84532': { name: 'Base Sepolia', live: false, stripeNetwork: 'base' },
});

export const SERVICE = Object.freeze({
  serviceName: 'Why Humanoid?',
  description: 'Deployment evidence for humanoid robots: which deployment cases match a robot, organisation, country, sector, task or status, with each claim, its operational status, evidence level, dates, sources and open questions, as recorded by Why Humanoid? (Integrarobot). Bounded: at most 10 cases and 50 records per answer.',
  tags: ['robotics', 'humanoid-robots', 'deployments', 'evidence', 'research'],
  iconUrl: 'https://whyhumanoid.com/assets/og/whyhumanoid-og-v1.png',
});

const PRICE = /^(0|[1-9]\d{0,3})(\.\d{1,2})?$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function x402ConfigFromEnv(env) {
  return {
    enabled: env.X402_ENABLED === 'true',
    network: env.X402_NETWORK || null,
    payTo: env.X402_PAY_TO || null,
    priceUsd: env.X402_PRICE_USD || null,
    facilitator: env.X402_FACILITATOR || null,
    cdpKeyId: env.CDP_API_KEY_ID || null,
    cdpKeySecret: env.CDP_API_KEY_SECRET || null,
    stripeRecording: env.X402_STRIPE_RECORDING === 'true',
    stripeApiVersion: env.X402_STRIPE_API_VERSION || null,
    siteOrigin: env.SITE_ORIGIN || 'https://whyhumanoid.com',
  };
}

// Why the route cannot take payments, or 'ready'. Checked before anything is advertised.
export async function x402Readiness(x, db) {
  if (!x?.enabled) return 'x402_disabled';
  const net = NETWORKS[x.network];
  if (!net) return 'x402_network_unsupported';
  if (net.live && !X402_LIVE_OPEN) return 'x402_live_closed';
  if (!x.priceUsd || !PRICE.test(x.priceUsd) || Number(x.priceUsd) < 0.01) return 'x402_price_not_set';
  if (!x.payTo || !ADDRESS.test(x.payTo)) return 'x402_pay_to_not_set';
  // 'cdp' (Coinbase CDP, authenticated) or an https facilitator URL; plain http only on the loopback (local checks).
  if (!x.facilitator || (x.facilitator === 'cdp' ? !(x.cdpKeyId && x.cdpKeySecret) : !/^(https:\/\/[^\s]+|http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/[^\s]*)?)$/.test(x.facilitator))) return 'x402_facilitator_not_configured';
  if (x.stripeRecording && !x.stripeApiVersion) return 'x402_stripe_recording_not_configured';
  const rows = await db.prepare("SELECT COUNT(*) AS n FROM premium_rows WHERE dataset = 'deployments' AND visibility = 'customer'").first();
  if (!Number(rows?.n)) return 'data_not_imported';
  return 'ready';
}

// The official resource server for one configuration, kept per Worker isolate.
const servers = new Map();
async function resourceServer(x, resourceUrl, facilitatorClient) {
  // An injected facilitator (tests) is never cached, so each test gets its own server.
  const key = facilitatorClient ? null : JSON.stringify([x.network, x.payTo, x.priceUsd, x.facilitator, resourceUrl]);
  if (key && servers.has(key)) return servers.get(key);
  const facilitator = facilitatorClient ?? new HTTPFacilitatorClient(x.facilitator === 'cdp' ? createFacilitatorConfig(x.cdpKeyId, x.cdpKeySecret) : { url: x.facilitator });
  const server = new x402ResourceServer(facilitator).register(x.network, new ExactEvmScheme());
  server.registerExtension(bazaarResourceServerExtension);
  const http = new x402HTTPResourceServer(server, {
    [`GET ${X402_PATH}`]: {
      accepts: { scheme: 'exact', price: `$${x.priceUsd}`, network: x.network, payTo: x.payTo, maxTimeoutSeconds: 120 },
      resource: resourceUrl,
      description: SERVICE.description,
      mimeType: 'application/json',
      serviceName: SERVICE.serviceName,
      tags: SERVICE.tags,
      iconUrl: SERVICE.iconUrl,
      unpaidResponseBody: () => ({ contentType: 'application/json', body: { error: 'payment_required', description: SERVICE.description, documentation: resourceUrl.replace(/\/deployment-evidence$/, '') } }),
      extensions: declareDiscoveryExtension({ input: INPUT_EXAMPLE, inputSchema: INPUT_SCHEMA, output: { example: OUTPUT_EXAMPLE, schema: OUTPUT_SCHEMA } }),
    },
  });
  const ready = http.initialize().then(() => http);
  if (key) {
    servers.set(key, ready);
    ready.catch(() => servers.delete(key));
  }
  return ready;
}

const sha256 = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const jsonResponse = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

function adapterFor(request, url) {
  return {
    getHeader: (n) => request.headers.get(n) ?? undefined,
    getMethod: () => request.method,
    getPath: () => url.pathname,
    getUrl: () => request.url,
    getAcceptHeader: () => request.headers.get('accept') ?? '',
    getUserAgent: () => request.headers.get('user-agent') ?? '',
    getQueryParams: () => Object.fromEntries(url.searchParams),
    getQueryParam: (n) => url.searchParams.get(n) ?? undefined,
  };
}

// Records a settled payment in Stripe. Never blocks or undoes delivery: a failure is kept for reconciliation.
export async function recordInStripe({ db, gateway, x, row, now }) {
  if (!x.stripeRecording) {
    await db.prepare("UPDATE x402_payments SET stripe_status = 'disabled', updated_at = ? WHERE payment_key = ?").bind(now, row.payment_key).run();
    return { status: 'disabled' };
  }
  const atomic = BigInt(row.amount_atomic);
  if (atomic % 10000n !== 0n) throw new Error('amount is not a whole number of cents');
  try {
    const pi = await gateway.recordCryptoPayment({ amountCents: Number(atomic / 10000n), txHash: row.tx_hash, network: NETWORKS[row.network].stripeNetwork, apiVersion: x.stripeApiVersion, payTo: row.pay_to });
    await db.prepare("UPDATE x402_payments SET stripe_payment_intent = ?, stripe_status = 'recorded', updated_at = ? WHERE payment_key = ?").bind(pi.id, now, row.payment_key).run();
    return { status: 'recorded', id: pi.id };
  } catch (error) {
    await db.prepare("UPDATE x402_payments SET stripe_status = 'failed', error = ?, updated_at = ? WHERE payment_key = ?").bind(String(error?.message ?? error).slice(0, 300), now, row.payment_key).run();
    return { status: 'failed' };
  }
}

const SETTLING_TIMEOUT = 180;

export async function handleEvidence({ request, url, now, db, gateway, x, facilitatorClient, waitUntil, log = console }) {
  const readiness = await x402Readiness(x, db);
  if (readiness !== 'ready') return jsonResponse(503, { error: readiness, documentation: `${url.origin}/v1/x402` });
  let query;
  try {
    query = parseQuery(url.searchParams);
  } catch (error) {
    if (error instanceof QueryError) return jsonResponse(400, { error: error.code, detail: error.detail });
    throw error;
  }
  const resourceUrl = `${url.origin}${X402_PATH}`;
  let http;
  try {
    http = await resourceServer(x, resourceUrl, facilitatorClient);
  } catch (error) {
    log.error?.('x402 facilitator unavailable', String(error?.message ?? error));
    return jsonResponse(503, { error: 'x402_facilitator_unavailable' });
  }
  const adapter = adapterFor(request, url);
  const paymentHeader = adapter.getHeader('payment-signature') || adapter.getHeader('x-payment');
  const context = { adapter, path: url.pathname, method: request.method, paymentHeader };
  const requestKey = await sha256(query.key);
  const paymentKey = paymentHeader ? await sha256(paymentHeader) : null;

  // Retry safety, checked before the facilitator sees the payment again: the exact authorisation bytes that were
  // already verified and settled for this query get the same answer, with no second verification or settlement.
  const existing = paymentKey ? await db.prepare('SELECT * FROM x402_payments WHERE payment_key = ?').bind(paymentKey).first() : null;
  if (existing && existing.request_key !== requestKey) return jsonResponse(409, { error: 'payment_already_used', detail: 'This payment authorisation was used for another query. Sign a new payment for this query.' });
  if (existing?.status === 'settled') {
    const body = await queryEvidence(db, query, { siteOrigin: x.siteOrigin });
    const headers = http.createSettlementHeaders({ success: true, transaction: existing.tx_hash, network: existing.network, payer: existing.payer ?? undefined });
    return jsonResponse(200, { ...body, payment: { charged: true, replayed: true, transaction: existing.tx_hash, network: existing.network } }, { ...headers, 'cache-control': 'private, no-store' });
  }
  if (existing?.status === 'settling' && existing.updated_at > now - SETTLING_TIMEOUT) return jsonResponse(409, { error: 'payment_in_progress' }, { 'retry-after': '5' });

  let result;
  try {
    result = await http.processHTTPRequest(context);
  } catch (error) {
    log.error?.('x402 verify failed', String(error?.message ?? error));
    return jsonResponse(503, { error: 'x402_facilitator_unavailable' });
  }
  if (result.type === 'payment-error') {
    const r = result.response;
    return new Response(r.isHtml ? String(r.body ?? '') : JSON.stringify(r.body ?? {}), { status: r.status, headers: { 'content-type': r.isHtml ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8', ...r.headers } });
  }
  if (result.type !== 'payment-verified') return jsonResponse(500, { error: 'internal_error' });

  // Claim the authorisation (one row per authorisation; a failed or stale attempt may be taken over).
  const { paymentPayload, paymentRequirements, declaredExtensions } = result;
  if (existing) {
    const claimed = await db.prepare("UPDATE x402_payments SET status = 'settling', error = NULL, updated_at = ? WHERE payment_key = ? AND (status = 'failed' OR (status = 'settling' AND updated_at <= ?))").bind(now, paymentKey, now - SETTLING_TIMEOUT).run();
    if (!claimed.meta?.changes) return jsonResponse(409, { error: 'payment_in_progress' }, { 'retry-after': '5' });
  } else {
    const inserted = await db.prepare("INSERT OR IGNORE INTO x402_payments (payment_key, request_key, status, network, amount_atomic, pay_to, created_at, updated_at) VALUES (?, ?, 'settling', ?, ?, ?, ?, ?)")
      .bind(paymentKey, requestKey, paymentRequirements.network, String(paymentRequirements.amount), paymentRequirements.payTo, now, now).run();
    if (!inserted.meta?.changes) return jsonResponse(409, { error: 'payment_in_progress' }, { 'retry-after': '5' });
  }
  const fail = (error) => db.prepare("UPDATE x402_payments SET status = 'failed', error = ?, updated_at = ? WHERE payment_key = ?").bind(String(error).slice(0, 300), now, paymentKey).run();

  let body;
  try {
    body = await queryEvidence(db, query, { siteOrigin: x.siteOrigin });
  } catch (error) {
    await fail('handler_failed');
    await result.cancellationDispatcher?.cancel?.({ reason: 'handler_threw', error }).catch(() => {});
    log.error?.('x402 query failed', String(error?.message ?? error));
    return jsonResponse(500, { error: 'internal_error', payment: { charged: false } });
  }
  if (body.cases_returned === 0) {
    // Nothing to sell: the authorisation is not settled and stays usable for another query.
    await db.prepare('DELETE FROM x402_payments WHERE payment_key = ?').bind(paymentKey).run();
    await result.cancellationDispatcher?.cancel?.({ reason: 'handler_failed', responseStatus: 200 }).catch(() => {});
    return jsonResponse(200, { ...body, payment: { charged: false, reason: 'no_matching_cases' } });
  }
  const answer = JSON.stringify(body);
  let settled;
  try {
    settled = await http.processSettlement(paymentPayload, paymentRequirements, declaredExtensions, { request: context, responseBody: new TextEncoder().encode(answer), responseHeaders: { 'content-type': 'application/json' } });
  } catch (error) {
    await fail(`settle_error: ${error?.message ?? error}`);
    log.error?.('x402 settle failed', String(error?.message ?? error));
    return jsonResponse(503, { error: 'x402_facilitator_unavailable', payment: { charged: false } });
  }
  if (!settled.success) {
    await fail(settled.errorReason ?? 'settlement_failed');
    const r = settled.response ?? { status: 402, headers: {}, body: { error: 'settlement_failed' } };
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 402, headers: { 'content-type': 'application/json; charset=utf-8', ...(r.headers ?? {}) } });
  }
  await db.prepare("UPDATE x402_payments SET status = 'settled', tx_hash = ?, payer = ?, network = ?, error = NULL, updated_at = ? WHERE payment_key = ?")
    .bind(settled.transaction, settled.payer ?? null, settled.network ?? paymentRequirements.network, now, paymentKey).run();
  const row = await db.prepare('SELECT * FROM x402_payments WHERE payment_key = ?').bind(paymentKey).first();
  const recording = recordInStripe({ db, gateway, x, row, now }).catch((e) => log.error?.('x402 stripe record failed', String(e?.message ?? e)));
  if (waitUntil) waitUntil(recording); else await recording;
  const paid = { ...body, payment: { charged: true, transaction: settled.transaction, network: settled.network ?? paymentRequirements.network } };
  return jsonResponse(200, paid, { ...settled.headers, 'cache-control': 'private, no-store' });
}

// Free description of the paid route (no data): what it answers, its inputs and outputs, its price and its state.
export async function describeX402({ url, db, x }) {
  const readiness = await x402Readiness(x, db);
  return {
    name: SERVICE.serviceName,
    endpoint: `${url.origin}${X402_PATH}`,
    method: 'GET',
    protocol: 'x402 v2 (exact scheme, USDC)',
    status: readiness === 'ready' ? 'available' : 'not_available',
    reason: readiness === 'ready' ? null : readiness,
    network: x?.network ?? null,
    network_name: NETWORKS[x?.network]?.name ?? null,
    price_usd: readiness === 'ready' ? x.priceUsd : null,
    description: SERVICE.description,
    parameters: Object.fromEntries([...Object.entries(FILTERS), ['limit', `Cases to return, 1 to ${MAX_CASES}.`]]),
    rules: [
      'A malformed query is refused (400) before any payment is requested.',
      'A query with no matching case returns an empty answer and is not charged.',
      'Retrying with the same payment for the same query returns the same answer without a second charge; the same payment cannot buy a different query.',
      ...CAVEATS,
    ],
    input_schema: INPUT_SCHEMA,
    output_schema: OUTPUT_SCHEMA,
    output_example: OUTPUT_EXAMPLE,
    subscription: 'Complete Deployments and Components data, with every record and field, is also available as a US$100 per year subscription at https://whyhumanoid.com/subscribe/.',
  };
}
