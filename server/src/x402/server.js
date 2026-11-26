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
import { decodePaymentSignatureHeader } from '@x402/core/http';
import { SettleError } from '@x402/core/types';
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

// The official server turns any exception from the facilitator's settle into success: false. Only a structured refusal
// from the facilitator (SettleError, or a success: false response) proves that nothing moved; a timeout or a broken
// connection may follow a broadcast transfer. Those are re-thrown with a marker so the outcome is recorded as unknown.
export const UNKNOWN_SETTLEMENT = 'x402_settlement_outcome_unknown';
function withUnknownSettlement(facilitator) {
  return new Proxy(facilitator, {
    get(target, prop) {
      if (prop === 'settle') {
        return async (...args) => {
          try {
            return await target.settle(...args);
          } catch (error) {
            if (error instanceof SettleError) throw error;
            throw new Error(`${UNKNOWN_SETTLEMENT}: ${error?.message ?? error}`);
          }
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

// The official resource server for one configuration, kept per Worker isolate.
const servers = new Map();
async function resourceServer(x, resourceUrl, facilitatorClient) {
  // An injected facilitator (tests) is never cached, so each test gets its own server.
  const key = facilitatorClient ? null : JSON.stringify([x.network, x.payTo, x.priceUsd, x.facilitator, resourceUrl]);
  if (key && servers.has(key)) return servers.get(key);
  const facilitator = withUnknownSettlement(facilitatorClient ?? new HTTPFacilitatorClient(x.facilitator === 'cdp' ? createFacilitatorConfig(x.cdpKeyId, x.cdpKeySecret) : { url: x.facilitator }));
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

export const SETTLING_TIMEOUT = 180;      // a settlement still "settling" after this is treated as unknown, never retried
export const REPLAY_SECONDS = 86400;      // a settled payment replays its stored answer for 24 hours, then 410

// Deterministic payment identity: the EIP-3009 authorisation (network, asset, payer, nonce) whatever the header bytes,
// so a re-encoded header is recognised as the same payment. Other schemes fall back to the header itself.
async function paymentIdentity(paymentHeader) {
  let p = null;
  try { p = decodePaymentSignatureHeader(paymentHeader); } catch { return null; }
  const auth = p?.payload?.authorization;
  const sig = p?.payload?.signature;
  if (auth?.from && auth?.nonce && p?.accepted?.network && p?.accepted?.asset) {
    return {
      key: await sha256(['exact-eip3009', p.accepted.network, String(p.accepted.asset).toLowerCase(), String(auth.from).toLowerCase(), String(auth.nonce).toLowerCase()].join('|')),
      signatureHash: await sha256(String(sig ?? '')),
      payer: String(auth.from),
      nonce: String(auth.nonce),
    };
  }
  return { key: await sha256(`header|${paymentHeader}`), signatureHash: await sha256(paymentHeader), payer: null, nonce: null };
}

// A settle result that does not prove the money did not move: treated as unknown, never as "not charged".
const AMBIGUOUS = /timeout|timed out|unknown|pending|network|unavailable|rpc|receipt/i;
const RECOVERY = 'The settlement outcome is not known yet. Nothing more will be charged for this payment. Retry later with the same payment authorisation: once the payment is reconciled you receive the paid answer, or, if it did not settle, the request is processed normally.';

// The stored paid answer, unchanged, plus this response's payment block.
const paidResponse = (answer, extra, headers) => new Response(JSON.stringify({ ...JSON.parse(answer), payment: extra }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', ...headers, 'cache-control': 'private, no-store' } });

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
  const identity = paymentHeader ? await paymentIdentity(paymentHeader) : null;

  // Known payment: decided from our own record, before the facilitator sees it again.
  const existing = identity ? await db.prepare('SELECT * FROM x402_payments WHERE payment_key = ?').bind(identity.key).first() : null;
  if (existing && existing.status !== 'failed') {
    if (existing.request_key !== requestKey) return jsonResponse(409, { error: 'payment_already_used', detail: 'This payment authorisation belongs to another query. Sign a new payment for this query.' });
    if (existing.signature_hash !== identity.signatureHash) return jsonResponse(409, { error: 'payment_signature_mismatch' });
    if (existing.status === 'settled') {
      if (!existing.answer || now > Number(existing.replay_until ?? 0)) return jsonResponse(410, { error: 'payment_replay_expired', detail: `A paid answer is replayed for ${REPLAY_SECONDS / 3600} hours after settlement. Sign a new payment for fresh results.` });
      const headers = http.createSettlementHeaders({ success: true, transaction: existing.tx_hash, network: existing.network, payer: existing.payer ?? undefined });
      return paidResponse(existing.answer, { charged: true, replayed: true, transaction: existing.tx_hash, network: existing.network, replay_until: new Date(existing.replay_until * 1000).toISOString() }, headers);
    }
    if (existing.status === 'settling' && existing.updated_at > now - SETTLING_TIMEOUT) return jsonResponse(409, { error: 'payment_in_progress' }, { 'retry-after': '5' });
    if (existing.status === 'settling') await db.prepare("UPDATE x402_payments SET status = 'unknown', error = 'settling_timed_out', updated_at = ? WHERE payment_key = ? AND status = 'settling'").bind(now, identity.key).run();
    return jsonResponse(202, { error: 'payment_under_review', payment: { charged: 'unknown' }, recovery: RECOVERY }, { 'retry-after': '300' });
  }

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
  if (result.type !== 'payment-verified' || !identity) return jsonResponse(500, { error: 'internal_error' });

  // Claim the payment: a new row, or a definitively failed one taken over.
  const { paymentPayload, paymentRequirements, declaredExtensions } = result;
  const claimed = existing
    ? await db.prepare("UPDATE x402_payments SET status = 'settling', request_key = ?, signature_hash = ?, error = NULL, answer = NULL, updated_at = ? WHERE payment_key = ? AND status = 'failed'").bind(requestKey, identity.signatureHash, now, identity.key).run()
    : await db.prepare("INSERT OR IGNORE INTO x402_payments (payment_key, signature_hash, request_key, status, network, asset, amount_atomic, pay_to, payer, nonce, created_at, updated_at) VALUES (?, ?, ?, 'settling', ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(identity.key, identity.signatureHash, requestKey, paymentRequirements.network, paymentRequirements.asset, String(paymentRequirements.amount), paymentRequirements.payTo, identity.payer, identity.nonce, now, now).run();
  if (!claimed.meta?.changes) return jsonResponse(409, { error: 'payment_in_progress' }, { 'retry-after': '5' });
  const setStatus = (status, error) => db.prepare('UPDATE x402_payments SET status = ?, error = ?, updated_at = ? WHERE payment_key = ?').bind(status, error ? String(error).slice(0, 300) : null, now, identity.key).run();

  // The answer, computed and stored BEFORE any settlement: a replay returns exactly this.
  let body;
  try {
    body = await queryEvidence(db, query, { siteOrigin: x.siteOrigin });
  } catch (error) {
    await setStatus('failed', 'query_failed').catch(() => {});
    log.error?.('x402 query failed', String(error?.message ?? error));
    return jsonResponse(500, { error: 'internal_error', payment: { charged: false } });
  }
  if (body.cases_returned === 0) {
    // Nothing to sell: never settled; the authorisation stays usable for another query.
    await db.prepare('DELETE FROM x402_payments WHERE payment_key = ?').bind(identity.key).run().catch(() => {});
    return jsonResponse(200, { ...body, payment: { charged: false, reason: 'no_matching_cases' } });
  }
  const answer = JSON.stringify(body);
  try {
    await db.prepare('UPDATE x402_payments SET answer = ?, updated_at = ? WHERE payment_key = ?').bind(answer, now, identity.key).run();
  } catch (error) {
    await setStatus('failed', 'answer_not_stored').catch(() => {});
    log.error?.('x402 answer not stored', String(error?.message ?? error));
    return jsonResponse(503, { error: 'x402_storage_unavailable', payment: { charged: false } });
  }

  // Settlement. Only a definitive refusal counts as "not charged"; anything ambiguous goes to reconciliation.
  let settled;
  try {
    settled = await http.processSettlement(paymentPayload, paymentRequirements, declaredExtensions, { request: context, responseBody: new TextEncoder().encode(answer), responseHeaders: { 'content-type': 'application/json' } });
  } catch (error) {
    await setStatus('unknown', `settle_threw: ${error?.message ?? error}`).catch((e) => log.error?.('x402 unknown not recorded', identity.key, String(e)));
    log.error?.('x402 settlement outcome unknown', identity.key, String(error?.message ?? error));
    return jsonResponse(503, { error: 'settlement_unknown', payment: { charged: 'unknown' }, recovery: RECOVERY }, { 'retry-after': '300' });
  }
  if (!settled.success) {
    const reason = settled.errorReason ?? 'settlement_failed';
    if (String(reason).startsWith(UNKNOWN_SETTLEMENT) || AMBIGUOUS.test(`${reason} ${settled.errorMessage ?? ''}`)) {
      await setStatus('unknown', reason).catch(() => {});
      return jsonResponse(503, { error: 'settlement_unknown', payment: { charged: 'unknown' }, recovery: RECOVERY }, { 'retry-after': '300' });
    }
    await setStatus('failed', reason).catch(() => {});
    const r = settled.response ?? { status: 402, headers: {}, body: { error: 'settlement_failed' } };
    return new Response(JSON.stringify({ ...(r.body ?? {}), payment: { charged: false, reason } }), { status: r.status ?? 402, headers: { 'content-type': 'application/json; charset=utf-8', ...(r.headers ?? {}) } });
  }

  // Paid. The buyer gets the answer even if the record below cannot be written; the row then stays "settling", turns
  // "unknown" after SETTLING_TIMEOUT and is reconciled by an operator from the transaction hash logged here.
  const network = settled.network ?? paymentRequirements.network;
  try {
    await db.prepare("UPDATE x402_payments SET status = 'settled', tx_hash = ?, payer = COALESCE(?, payer), network = ?, error = NULL, replay_until = ?, updated_at = ? WHERE payment_key = ?")
      .bind(settled.transaction, settled.payer ?? null, network, now + REPLAY_SECONDS, now, identity.key).run();
    const row = await db.prepare('SELECT * FROM x402_payments WHERE payment_key = ?').bind(identity.key).first();
    const recording = recordInStripe({ db, gateway, x, row, now }).catch((e) => log.error?.('x402 stripe record failed', String(e?.message ?? e)));
    if (waitUntil) waitUntil(recording); else await recording;
  } catch (error) {
    log.error?.('x402 settled but not recorded', JSON.stringify({ payment_key: identity.key, tx: settled.transaction, network }), String(error?.message ?? error));
  }
  return paidResponse(answer, { charged: true, transaction: settled.transaction, network, replay_until: new Date((now + REPLAY_SECONDS) * 1000).toISOString() }, settled.headers);
}

// ---- Operator reconciliation (admin token): list payments needing attention, and resolve an unknown outcome from the
// chain (block explorer or the Stripe deposit record). Resolving never charges anyone: "settled" makes the stored answer
// replayable to the buyer; "not_settled" lets the buyer's retry go through the normal verify-and-settle path.
export async function listPayments(db, status) {
  const rows = await db.prepare("SELECT payment_key, status, network, asset, amount_atomic, pay_to, payer, nonce, tx_hash, error, stripe_status, resolved_by, created_at, updated_at FROM x402_payments WHERE status = ? ORDER BY updated_at LIMIT 200").bind(status).all();
  return rows.results;
}

export async function resolvePayment({ db, gateway, x, key, outcome, txHash, now }) {
  const row = await db.prepare('SELECT * FROM x402_payments WHERE payment_key = ?').bind(key).first();
  if (!row) return { status: 404, error: 'payment_not_found' };
  const stuck = row.status === 'unknown' || (row.status === 'settling' && row.updated_at <= now - SETTLING_TIMEOUT);
  if (!stuck) return { status: 409, error: 'payment_not_unknown' };
  if (outcome === 'settled') {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash ?? '')) return { status: 400, error: 'tx_hash_required' };
    await db.prepare("UPDATE x402_payments SET status = 'settled', tx_hash = ?, error = NULL, replay_until = ?, resolved_by = 'operator', updated_at = ? WHERE payment_key = ?").bind(txHash, now + REPLAY_SECONDS, now, key).run();
    const fresh = await db.prepare('SELECT * FROM x402_payments WHERE payment_key = ?').bind(key).first();
    const stripe = await recordInStripe({ db, gateway, x, row: fresh, now });
    return { status: 200, payment_key: key, outcome, stripe: stripe.status };
  }
  if (outcome === 'not_settled') {
    await db.prepare("UPDATE x402_payments SET status = 'failed', error = 'reconciled_not_settled', answer = NULL, resolved_by = 'operator', updated_at = ? WHERE payment_key = ?").bind(now, key).run();
    return { status: 200, payment_key: key, outcome };
  }
  return { status: 400, error: 'outcome_must_be_settled_or_not_settled' };
}

// Scheduled clean-up: settling rows that never finished become unknown (for reconciliation, never retried), and paid
// answers past their replay window are cleared (the payment record stays).
export async function cleanupPayments(db, now) {
  const stale = await db.prepare("UPDATE x402_payments SET status = 'unknown', error = 'settling_timed_out', updated_at = ? WHERE status = 'settling' AND updated_at <= ?").bind(now, now - SETTLING_TIMEOUT).run();
  const cleared = await db.prepare("UPDATE x402_payments SET answer = NULL WHERE answer IS NOT NULL AND ((status = 'settled' AND replay_until < ?) OR status = 'failed')").bind(now).run();
  return { unknown: stale.meta?.changes ?? 0, cleared: cleared.meta?.changes ?? 0 };
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
      `Retrying with the same payment for the same query returns the same stored answer, without a second charge, for ${REPLAY_SECONDS / 3600} hours after settlement (then 410); the same payment cannot buy a different query. The payment authorisation works as a bearer receipt during that window.`,
      'If the settlement outcome is not known (for example a facilitator timeout), the answer says charged: "unknown", nothing more is charged, and the payment is reconciled; retry later with the same payment.',
      ...CAVEATS,
    ],
    input_schema: INPUT_SCHEMA,
    output_schema: OUTPUT_SCHEMA,
    output_example: OUTPUT_EXAMPLE,
    subscription: 'Complete Deployments and Components data, with every record and field, is also available as a US$100 per year subscription at https://whyhumanoid.com/subscribe/.',
  };
}
