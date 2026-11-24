// x402 pay-per-query conformance (24 Nov 2026). The paid route is exercised with OFFICIAL x402 code on both sides:
// the official client (@x402/fetch with the official EVM "exact" client scheme) signs real EIP-3009 authorisations
// with a published development key, and the official facilitator (@x402/core/facilitator with the official EVM
// facilitator scheme) verifies those signatures; only the chain is simulated (test/x402-facilitator.js). The 402
// response is checked against the official v2 schema, and the Bazaar extension with the official validators.
//
// The key is Anvil/Hardhat development account #0, published in their documentation: it signs locally and never
// touches a real network or funds.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { decodePaymentRequiredHeader, decodePaymentResponseHeader, decodePaymentSignatureHeader, encodePaymentSignatureHeader } from '@x402/core/http';
import { PaymentRequiredV2Schema } from '@x402/core/schemas';
import { validateAndExtract, validateDiscoveryExtension } from '@x402/extensions/bazaar';
import { setup } from './helpers.js';
import { BASE_SEPOLIA, BASE_SEPOLIA_USDC, officialFacilitator, simulatedChain } from './x402-facilitator.js';
import { EVIDENCE_FIELDS, MAX_CASES } from '../src/x402/evidence.js';

const ANVIL_0 = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const PAY_TO = '0x1111111111111111111111111111111111111111';
const X = { enabled: true, network: BASE_SEPOLIA, payTo: PAY_TO, priceUsd: '0.05', facilitator: 'https://facilitator.example', stripeRecording: true, stripeApiVersion: '2026-05-27.preview', siteOrigin: 'https://whyhumanoid.com' };
const URL_OF = (q) => `https://api.test/v1/x402/deployment-evidence${q ? `?${q}` : ''}`;
// Paid detail of the subscription the x402 answer must never carry (fixture values are fx_<field>_<row>).
const NOT_SOLD = ['site_name', 'city', 'region', 'environment', 'relationship_type', 'commercial_status', 'task_description', 'workflow_from', 'workflow_to', 'integration_dependencies'];

async function world({ x = X, chain, recording = 'ok' } = {}) {
  const fac = officialFacilitator({ chain: chain ?? simulatedChain() });
  const ctx = await setup({ x402: x, x402Facilitator: fac.client });
  const stripe = [];
  ctx.gateway.recordCryptoPayment = async (args) => {
    stripe.push(args);
    if (recording === 'fail') throw new Error('stripe unavailable');
    return { id: `pi_test_${stripe.length}`, status: 'succeeded' };
  };
  const sent = [];
  const appFetch = async (input, init) => {
    const req = new Request(input, init);
    sent.push(req.headers.get('payment-signature'));
    return ctx.app(req);
  };
  const client = new x402Client().register(BASE_SEPOLIA, new ExactEvmScheme(privateKeyToAccount(ANVIL_0)));
  return { ctx, fac, stripe, sent, appFetch, pay: wrapFetchWithPayment(appFetch, client) };
}
const settledRows = (ctx) => ctx.db.prepare("SELECT * FROM x402_payments WHERE status = 'settled'").all().then((r) => r.results);

test('nothing is advertised or charged until every gate passes, and a bad query never asks for money', async () => {
  for (const [x, reason] of [
    [null, 'x402_disabled'],
    [{ ...X, enabled: false }, 'x402_disabled'],
    [{ ...X, network: 'eip155:8453' }, 'x402_live_closed'],
    [{ ...X, network: 'eip155:1' }, 'x402_network_unsupported'],
    [{ ...X, priceUsd: null }, 'x402_price_not_set'],
    [{ ...X, priceUsd: '0.005' }, 'x402_price_not_set'],
    [{ ...X, payTo: null }, 'x402_pay_to_not_set'],
    [{ ...X, facilitator: 'cdp' }, 'x402_facilitator_not_configured'],
    [{ ...X, stripeApiVersion: null }, 'x402_stripe_recording_not_configured'],
  ]) {
    const { ctx } = await world({ x });
    const res = await ctx.call('GET', '/v1/x402/deployment-evidence?robot=Digit');
    assert.equal(res.status, 503, reason);
    assert.equal((await res.json()).error, reason);
    assert.equal(res.headers.get('payment-required'), null, `${reason}: no payment advertised`);
    const about = await (await ctx.call('GET', '/v1/x402')).json();
    assert.equal(about.status, 'not_available');
    assert.equal(about.reason, reason);
    assert.equal(about.price_usd, null);
  }
  const { ctx } = await world();
  for (const q of ['colour=red', 'robot=', `robot=${'x'.repeat(81)}`, 'limit=0', `limit=${MAX_CASES + 1}`, 'limit=abc', 'robot=a&robot=b']) {
    const res = await ctx.call('GET', `/v1/x402/deployment-evidence?${q}`);
    assert.equal(res.status, 400, q);
    assert.equal(res.headers.get('payment-required'), null, `${q}: no payment for a bad query`);
  }
});

test('an unpaid request gets an official x402 v2 PaymentRequired with Bazaar discovery, and no data', async () => {
  const { ctx } = await world();
  const res = await ctx.call('GET', '/v1/x402/deployment-evidence?robot=fx_manufacturer_3');
  assert.equal(res.status, 402);
  const text = await res.text();
  const header = res.headers.get('payment-required');
  const pr = decodePaymentRequiredHeader(header);
  assert.ok(PaymentRequiredV2Schema.safeParse(pr).success, 'official v2 schema');
  assert.equal(pr.x402Version, 2);
  assert.deepEqual(pr.accepts.map((a) => [a.scheme, a.network, a.asset, a.amount, a.payTo]), [['exact', BASE_SEPOLIA, BASE_SEPOLIA_USDC, '50000', PAY_TO]]);
  assert.equal(pr.resource.url, 'https://api.test/v1/x402/deployment-evidence');
  assert.equal(pr.resource.serviceName, 'Why Humanoid?');
  assert.ok(pr.resource.tags.length <= 5);
  const bazaar = pr.extensions.bazaar;
  assert.equal(validateDiscoveryExtension(bazaar).valid, true, 'official Bazaar validator');
  assert.equal(bazaar.info.input.type, 'http');
  assert.equal(bazaar.info.input.method, 'GET');
  assert.equal(bazaar.info.output.type, 'json');
  const leaked = (s) => /fx_(claim_text|site_name|metric_value|open_questions_notes|source_url)_/.test(s);
  assert.ok(!leaked(text) && !leaked(Buffer.from(header, 'base64').toString()), 'no record value before payment');
});

test('the official client pays once and gets the bounded, sourced evidence; the payment is recorded in Stripe once', async () => {
  const { ctx, fac, stripe, pay } = await world();
  const res = await pay(URL_OF('robot=fx_manufacturer_3&limit=2'));
  assert.equal(res.status, 200);
  const body = await res.json();
  const receipt = decodePaymentResponseHeader(res.headers.get('payment-response'));
  assert.equal(receipt.success, true);
  assert.equal(receipt.network, BASE_SEPOLIA);
  assert.equal(body.payment.charged, true);
  assert.equal(body.payment.transaction, receipt.transaction);
  assert.equal(fac.chain.state.settled.length, 1, 'settled once on the (simulated) chain');
  assert.equal(fac.chain.state.settled[0].value, 50000n);
  assert.equal(fac.chain.state.settled[0].to.toLowerCase(), PAY_TO);
  assert.equal(body.cases_returned, 1);
  assert.ok(body.results.length <= 2);
  const rec = body.results[0].records[0];
  assert.equal(rec.claim.text, 'fx_claim_text_3');
  assert.equal(rec.source.url, 'fx_source_url_3');
  assert.equal(rec.source.publication_date, 'fx_publication_date_3');
  assert.equal(rec.operational_status, 'fx_operational_status_3');
  assert.equal(rec.open_questions, 'fx_open_questions_notes_3');
  assert.ok(body.caveats.length >= 3);
  const raw = JSON.stringify(body);
  for (const f of NOT_SOLD) assert.ok(!raw.includes(`fx_${f}_`), `${f} is subscription detail, not sold per query`);
  assert.ok(!EVIDENCE_FIELDS.some((f) => NOT_SOLD.includes(f)));
  // Settlement and Stripe recording.
  const [row] = await settledRows(ctx);
  assert.equal(row.tx_hash, receipt.transaction);
  assert.equal(row.amount_atomic, '50000');
  assert.equal(row.stripe_status, 'recorded');
  assert.deepEqual(stripe, [{ amountCents: 5, txHash: receipt.transaction, network: 'base', apiVersion: '2026-05-27.preview', payTo: PAY_TO }]);
  // The facilitator received the Bazaar extension echoed by the official client, valid for cataloguing.
  const settled = fac.calls.find((c) => c.op === 'settle').payload;
  assert.equal(validateAndExtract(settled.extensions.bazaar).valid, true);
});

test('a forged, altered or unfunded payment is refused with no data and no settlement', async () => {
  const { ctx, fac, pay, sent, appFetch } = await world();
  await pay(URL_OF('robot=fx_manufacturer_3'));
  const good = decodePaymentSignatureHeader(sent.find(Boolean));
  const variants = {
    'payee changed after signing': (p) => { p.payload.authorization.to = '0x2222222222222222222222222222222222222222'; },
    'amount changed after signing': (p) => { p.payload.authorization.value = '1'; },
    'signature from another payload': (p) => { p.payload.signature = `0x${'1b'.padStart(130, '0')}`; },
    'requirements not offered (other payee)': (p) => { p.accepted.payTo = '0x2222222222222222222222222222222222222222'; },
    'requirements not offered (lower price)': (p) => { p.accepted.amount = '1'; },
  };
  for (const [label, mutate] of Object.entries(variants)) {
    const p = structuredClone(good);
    p.payload.authorization.nonce = `0x${String(Object.keys(variants).indexOf(label) + 1).padStart(64, '0')}`;
    mutate(p);
    const res = await appFetch(URL_OF('robot=fx_manufacturer_3'), { headers: { 'payment-signature': encodePaymentSignatureHeader(p) } });
    assert.equal(res.status, 402, label);
    assert.ok(!(await res.text()).includes('fx_claim_text'), `${label}: no data`);
  }
  assert.equal(fac.chain.state.settled.length, 1, 'only the genuine payment ever settled');
  // A payer without funds: the official facilitator refuses it at verification.
  const poor = await world({ chain: simulatedChain({ balance: 0n }) });
  const res = await poor.pay(URL_OF('robot=fx_manufacturer_3'));
  assert.equal(res.status, 402);
  assert.ok(!(await res.text()).includes('fx_claim_text'));
  assert.equal(poor.fac.chain.state.settled.length, 0);
  assert.equal((await settledRows(poor.ctx)).length, 0);
  void ctx;
});

test('retries are safe: the same payment replays the same answer without a second charge, and cannot buy another query', async () => {
  const { ctx, fac, pay, sent, appFetch, stripe } = await world();
  const first = await pay(URL_OF('robot=fx_manufacturer_4'));
  const firstBody = await first.json();
  const header = sent.find(Boolean);
  const again = await appFetch(URL_OF('robot=fx_manufacturer_4'), { headers: { 'payment-signature': header } });
  assert.equal(again.status, 200);
  const againBody = await again.json();
  assert.deepEqual(againBody.results, firstBody.results);
  assert.equal(againBody.payment.replayed, true);
  assert.equal(decodePaymentResponseHeader(again.headers.get('payment-response')).transaction, firstBody.payment.transaction);
  assert.equal(fac.chain.state.settled.length, 1, 'no second settlement');
  assert.equal(stripe.length, 1, 'recorded in Stripe once');
  const other = await appFetch(URL_OF('robot=fx_manufacturer_5'), { headers: { 'payment-signature': header } });
  assert.equal(other.status, 409);
  assert.equal((await other.json()).error, 'payment_already_used');
  // While a payment is settling, a concurrent request with it waits.
  const p = structuredClone(decodePaymentSignatureHeader(header));
  p.payload.authorization.nonce = `0x${'ab'.repeat(32)}`;
  const busyHeader = encodePaymentSignatureHeader(p);
  const key = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(busyHeader)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const reqKey = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([[['robot', 'fx manufacturer 4']], 5]))))].map((b) => b.toString(16).padStart(2, '0')).join('');
  await ctx.db.prepare("INSERT INTO x402_payments (payment_key, request_key, status, network, amount_atomic, pay_to, created_at, updated_at) VALUES (?, ?, 'settling', ?, '50000', ?, 1, 9999999999)").bind(key, reqKey, BASE_SEPOLIA, PAY_TO).run();
  const busy = await appFetch(URL_OF('robot=fx_manufacturer_4'), { headers: { 'payment-signature': busyHeader } });
  assert.equal(busy.status, 409);
  assert.equal(busy.headers.get('retry-after'), '5');
});

test('no answer, no charge: an empty result or a failed settlement never takes money or returns data', async () => {
  const { fac, pay, ctx } = await world();
  const empty = await pay(URL_OF('robot=NoSuchRobotEver'));
  assert.equal(empty.status, 200);
  const body = await empty.json();
  assert.equal(body.cases_returned, 0);
  assert.deepEqual(body.payment, { charged: false, reason: 'no_matching_cases' });
  assert.equal(empty.headers.get('payment-response'), null);
  assert.equal(fac.chain.state.settled.length, 0);
  assert.equal((await ctx.db.prepare('SELECT COUNT(*) AS n FROM x402_payments').first()).n, 0, 'the authorisation stays usable');
  fac.control.failSettle = true;
  const failed = await pay(URL_OF('robot=fx_manufacturer_6'));
  assert.equal(failed.status, 402);
  assert.ok(!(await failed.text()).includes('fx_claim_text'));
  assert.equal((await settledRows(ctx)).length, 0);
  assert.equal((await ctx.db.prepare("SELECT COUNT(*) AS n FROM x402_payments WHERE status = 'failed'").first()).n, 1);
});

test('an unreachable facilitator is a 503, and a Stripe recording failure never blocks the paid answer', async () => {
  const down = await world();
  down.fac.control.down = true;
  const res = await down.ctx.call('GET', '/v1/x402/deployment-evidence?robot=Digit');
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'x402_facilitator_unavailable');
  const { ctx, pay } = await world({ recording: 'fail' });
  const paid = await pay(URL_OF('robot=fx_manufacturer_7'));
  assert.equal(paid.status, 200);
  const [row] = await settledRows(ctx);
  assert.equal(row.stripe_status, 'failed', 'kept for reconciliation');
  const off = await world({ x: { ...X, stripeRecording: false } });
  assert.equal((await off.pay(URL_OF('robot=fx_manufacturer_8'))).status, 200);
  assert.equal((await settledRows(off.ctx))[0].stripe_status, 'disabled');
  assert.equal(off.stripe.length, 0);
});

test('the free description states the route, its schemas, its rules and its state, and holds no data', async () => {
  const { ctx } = await world();
  const about = await (await ctx.call('GET', '/v1/x402')).json();
  assert.equal(about.status, 'available');
  assert.equal(about.price_usd, '0.05');
  assert.equal(about.network_name, 'Base Sepolia');
  assert.equal(about.method, 'GET');
  assert.ok(about.rules.some((r) => /not charged/.test(r)));
  assert.ok(!JSON.stringify(about).includes('fx_'));
});
