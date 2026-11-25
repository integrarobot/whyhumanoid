// The prepared x402 recording call, as the REAL Stripe SDK sends it (Codex review, 25 Nov 2026). A local fetch transport
// captures the outgoing request: no real key, no network, no payment. It checks the contract of the "Create a
// PaymentIntent" section of Stripe's x402 guide (docs.stripe.com/payments/machine/x402): allowed_payment_method_types
// ['crypto'], and network and transaction hash nested in crypto.transaction_verification_options next to mode. This is
// source alignment only: X402_STRIPE_RECORDING stays off until the actual preview API accepts the call in a sandbox.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { createStripeGateway } from '../src/billing.js';

test('recordCryptoPayment sends the documented transaction-verification PaymentIntent through the real Stripe SDK', async () => {
  const sent = [];
  const fakeFetch = async (url, init) => {
    sent.push({ url: String(url), method: init.method, headers: new Headers(init.headers), body: String(init.body ?? '') });
    return new Response(JSON.stringify({ id: 'pi_local_1', object: 'payment_intent', status: 'succeeded' }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'request-id': 'req_local_1' },
    });
  };
  const gateway = createStripeGateway({ secretKey: 'sk_test_local_only', webhookSecret: null, httpClient: Stripe.createFetchHttpClient(fakeFetch) });
  const txHash = `0x${'ab'.repeat(32)}`;
  const r = await gateway.recordCryptoPayment({ amountCents: 10, txHash, network: 'base', apiVersion: '2026-07-29.preview' });

  assert.deepEqual(r, { id: 'pi_local_1', status: 'succeeded' });
  assert.equal(sent.length, 1, 'one request, no retry');
  const req = sent[0];
  assert.equal(req.method, 'POST');
  assert.equal(new URL(req.url).pathname, '/v1/payment_intents');
  assert.equal(req.headers.get('idempotency-key'), txHash, 'keyed by the transaction hash: a retry never records twice');
  assert.equal(req.headers.get('stripe-version'), '2026-07-29.preview', 'the preview API version is sent per request');

  const form = new URLSearchParams(req.body);
  const fields = Object.fromEntries(form);
  assert.equal(fields.amount, '10');
  assert.equal(fields.currency, 'usd');
  assert.equal(fields['allowed_payment_method_types[0]'], 'crypto');
  assert.equal(fields['payment_method_data[type]'], 'crypto');
  assert.equal(fields['payment_method_options[crypto][mode]'], 'transaction_verification');
  assert.equal(fields['payment_method_options[crypto][transaction_verification_options][network]'], 'base');
  assert.equal(fields['payment_method_options[crypto][transaction_verification_options][transaction_hash]'], txHash);
  assert.equal(fields.confirm, 'true');
  assert.equal(fields['metadata[source]'], 'x402');
  // The undocumented flat placement and the old field name are gone.
  assert.ok(!('payment_method_options[crypto][network]' in fields));
  assert.ok(!('payment_method_options[crypto][transaction_hash]' in fields));
  assert.ok(![...form.keys()].some((k) => k.startsWith('payment_method_types')));
});
