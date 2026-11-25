// Stripe Checkout and webhook handling.
// Rules: checkout is off unless CHECKOUT_ENABLED=true; the key must match STRIPE_MODE (test and live
// credentials never mix); live also needs ALLOW_LIVE_CHECKOUT=true; the Stripe price must match the plan
// (USD 10000 per year) before any session is created; access comes only from signed webhook events of the
// same mode, each processed once, and never from a client redirect. A subscription grants access when its price is
// the current plan price or one of the legacy prices (EUR subscriptions bought before 24 Nov 2026).

import Stripe from 'stripe';
import { HttpError } from './http.js';
import { PRODUCT, upsertStripeEntitlement } from './entitlements.js';
import { LIVE_SALES_OPEN, checkStripePrice } from './pricing.js';
import { applyReportSession } from './orders/orders.js';

export function stripeKeyMode(secretKey) {
  if (!secretKey) return 'unconfigured';
  return /^(sk|rk)_live_/.test(secretKey) ? 'live' : 'test';
}

export function createStripeGateway({ secretKey, webhookSecret }) {
  // Constructing the client makes no network call; a placeholder key is only used for webhook verification.
  const stripe = new Stripe(secretKey || 'sk_test_unconfigured', { httpClient: Stripe.createFetchHttpClient() });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();
  return {
    mode: stripeKeyMode(secretKey),
    webhookConfigured: Boolean(webhookSecret),
    retrievePrice(priceId) {
      return stripe.prices.retrieve(priceId);
    },
    verifyWebhook(rawBody, signature) {
      return stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret, 300, cryptoProvider);
    },
    async createCheckoutSession({ priceId, accountId, email, customerId, successUrl, cancelUrl, idempotencyKey }) {
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          client_reference_id: accountId,
          // A returning subscriber keeps one Stripe customer; a new one is created from the account email.
          ...(customerId ? { customer: customerId } : { customer_email: email }),
          metadata: { wh_account_id: accountId },
          // No trial: the first year is paid at checkout.
          subscription_data: { metadata: { wh_account_id: accountId } },
          payment_method_collection: 'always',
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
        { idempotencyKey },
      );
      return { id: session.id, url: session.url };
    },
    // A custom report (25 Nov 2026): a one-off payment for one stored order. No subscription data, no customer link to
    // the data subscription, no tax settings (the charge is the price, as for the subscription).
    async createReportCheckoutSession({ priceId, orderId, accountId, service, email, customerId, expiresAt, successUrl, cancelUrl, idempotencyKey }) {
      const metadata = { wh_order_id: orderId, wh_account_id: accountId, wh_service: service };
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          line_items: [{ price: priceId, quantity: 1 }],
          client_reference_id: accountId,
          ...(customerId ? { customer: customerId } : { customer_email: email }),
          metadata,
          payment_intent_data: { metadata },
          // Fixed expiry: the server cancels an unpaid order only after this time (server/src/orders/orders.js).
          expires_at: expiresAt,
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
        { idempotencyKey },
      );
      return { id: session.id, url: session.url };
    },
    retrieveCheckoutSession(sessionId) {
      return stripe.checkout.sessions.retrieve(sessionId);
    },
    // Stripe customer portal: payment method, invoices and cancellation, hosted by Stripe.
    async createPortalSession({ customerId, returnUrl, configuration }) {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        ...(configuration ? { configuration } : {}),
      });
      return { url: session.url };
    },
  };
}

const verifiedPrices = new WeakMap(); // gateway -> Map(priceId -> verification expiry), per isolate

export async function verifyConfiguredPrice({ config, gateway, now, log = console }) {
  if (!verifiedPrices.has(gateway)) verifiedPrices.set(gateway, new Map());
  const cache = verifiedPrices.get(gateway);
  const cachedUntil = cache.get(config.stripePriceId);
  if (cachedUntil && cachedUntil > now) return [];
  let price;
  try {
    price = await gateway.retrievePrice(config.stripePriceId);
  } catch (error) {
    log.error?.('stripe price lookup failed', error?.message);
    return ['price lookup failed'];
  }
  const problems = checkStripePrice(price, { mode: gateway.mode });
  if (problems.length === 0) cache.set(config.stripePriceId, now + 600);
  else log.error?.('stripe price does not match the plan', problems);
  return problems;
}

// Checkout opens only when a payment can actually turn into access: the key matches the mode, live is allowed, and the
// signed webhook that grants access can be verified. Data and sign-in are checked in checkoutState (they need I/O).
export function checkoutReadiness({ config, gateway }) {
  if (!config.checkoutEnabled) return 'checkout_disabled';
  if (gateway.mode === 'unconfigured' || !config.stripePriceId) return 'checkout_not_configured';
  if (gateway.mode !== config.stripeMode) return 'stripe_mode_mismatch';
  if (gateway.mode === 'live' && !config.allowLiveCheckout) return 'live_checkout_disabled';
  if (gateway.mode === 'live' && !LIVE_SALES_OPEN) return 'offer_in_review';
  if (!gateway.webhookConfigured) return 'webhook_not_configured';
  return 'ready';
}

// Never charge for an empty product: every dataset must hold imported rows. Never sell what nobody can sign in to use.
export async function checkoutState({ config, gateway, db, mailer, datasetCount }) {
  const readiness = checkoutReadiness({ config, gateway });
  if (readiness !== 'ready') return readiness;
  if (!mailer?.configured) return 'email_not_configured';
  const loaded = await db.prepare("SELECT COUNT(DISTINCT dataset) AS n FROM premium_rows WHERE visibility = 'customer'").first();
  if (Number(loaded?.n ?? 0) < datasetCount) return 'data_not_imported';
  return 'ready';
}

export async function startCheckout({ config, gateway, account, now, log, db, mailer, datasetCount }) {
  const readiness = db ? await checkoutState({ config, gateway, db, mailer, datasetCount }) : checkoutReadiness({ config, gateway });
  if (readiness !== 'ready') throw new HttpError(503, readiness);
  if ((await verifyConfiguredPrice({ config, gateway, now, log })).length) throw new HttpError(503, 'price_mismatch');
  const session = await gateway.createCheckoutSession({
    priceId: config.stripePriceId,
    accountId: account.accountId,
    email: account.email,
    customerId: account.stripeCustomerId ?? null,
    successUrl: `${config.premiumUrl}?checkout=success`,
    cancelUrl: `${config.premiumUrl}?checkout=cancelled`,
    idempotencyKey: `checkout:${account.accountId}:${Math.floor(now / 600)}`,
  });
  return { url: session.url };
}

// Customer portal for an account that has paid at least once (it has a Stripe customer). Same key and mode rules as
// checkout, but it does not depend on CHECKOUT_ENABLED: a subscriber must always be able to manage or cancel.
export async function startPortal({ config, gateway, account }) {
  if (gateway.mode === 'unconfigured') throw new HttpError(503, 'billing_not_configured');
  if (gateway.mode !== config.stripeMode) throw new HttpError(503, 'stripe_mode_mismatch');
  if (!account.stripeCustomerId) throw new HttpError(409, 'no_billing_account');
  return gateway.createPortalSession({
    customerId: account.stripeCustomerId,
    returnUrl: `${config.premiumUrl}?billing=returned`,
    configuration: config.stripePortalConfiguration ?? null,
  });
}

export async function handleStripeWebhook({ db, gateway, config, rawBody, signature, now, notify }) {
  if (!gateway.webhookConfigured) throw new HttpError(503, 'webhook_not_configured');
  if (!signature) throw new HttpError(400, 'missing_signature');
  let event;
  try {
    event = await gateway.verifyWebhook(rawBody, signature);
  } catch {
    throw new HttpError(400, 'invalid_signature');
  }
  const seen = await db.prepare('SELECT outcome FROM stripe_events WHERE id = ?').bind(event.id).first();
  if (seen) return { received: true, duplicate: true, outcome: seen.outcome };
  const outcome = await applyEvent(db, event, config, now, notify);
  await db
    .prepare('INSERT OR IGNORE INTO stripe_events (id, type, created, outcome, processed_at) VALUES (?, ?, ?, ?, ?)')
    .bind(event.id, event.type, event.created, outcome, now)
    .run();
  return { received: true, outcome };
}

async function applyEvent(db, event, config, now, notify) {
  // Test and live never mix: events must come from the configured mode, and live needs explicit permission.
  if (Boolean(event.livemode) !== (config.stripeMode === 'live')) return 'ignored_mode_mismatch';
  if (event.livemode && !config.allowLiveCheckout) return 'ignored_livemode';
  const object = event.data?.object ?? {};
  // Custom report payments (one-off): checked against the stored order; they never touch the subscription entitlement.
  if (event.type.startsWith('checkout.session.') && object.mode === 'payment') {
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'].includes(event.type)) return 'ignored_type';
    return applyReportSession({ db, config, session: object, now, notify, eventType: event.type });
  }
  switch (event.type) {
    case 'checkout.session.completed': {
      if (object.mode !== 'subscription') return 'ignored_mode';
      const accountId = object.client_reference_id ?? object.metadata?.wh_account_id;
      const account = accountId
        ? await db.prepare('SELECT id FROM accounts WHERE id = ?').bind(accountId).first()
        : null;
      if (!account) return 'unmapped';
      if (object.customer) return (await linkCustomer(db, account.id, object.customer)) ? 'customer_linked' : 'customer_conflict';
      return 'no_customer';
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const accountId = await resolveAccount(db, object);
      if (!accountId) return 'unmapped';
      const items = object.items?.data ?? [];
      const entitled = entitledPriceIds(config);
      if (!entitled.size || !items.some((item) => entitled.has(item.price?.id))) return 'ignored_price';
      // Newer Stripe API versions report the period end per subscription item.
      const periodEnd = Number(
        object.current_period_end ?? Math.max(0, ...items.map((item) => Number(item.current_period_end ?? 0))),
      );
      if (object.customer && !(await linkCustomer(db, accountId, object.customer))) return 'customer_conflict';
      const applied = await upsertStripeEntitlement(db, {
        accountId,
        product: PRODUCT,
        subscriptionId: object.id,
        status: event.type === 'customer.subscription.deleted' ? 'canceled' : object.status,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
        eventCreated: event.created,
        now,
      });
      return applied ? 'entitlement_updated' : 'ignored_stale';
    }
    default:
      return 'ignored_type';
  }
}

// Prices whose subscriptions carry the data subscription: the price new checkouts use, plus legacy prices of existing
// subscriptions (EUR, before 24 Nov 2026), so their renewals, cancellations and deletions keep updating access.
export function entitledPriceIds(config) {
  return new Set([config.stripePriceId, ...(config.stripeLegacyPriceIds ?? [])].filter(Boolean));
}

async function resolveAccount(db, subscription) {
  const fromMetadata = subscription.metadata?.wh_account_id;
  if (fromMetadata) {
    const account = await db.prepare('SELECT id FROM accounts WHERE id = ?').bind(fromMetadata).first();
    if (account) return account.id;
  }
  if (subscription.customer) {
    const account = await db
      .prepare('SELECT id FROM accounts WHERE stripe_customer_id = ?')
      .bind(subscription.customer)
      .first();
    if (account) return account.id;
  }
  return null;
}

// Links a Stripe customer to an account once. Never moves a customer to a different account.
async function linkCustomer(db, accountId, customerId) {
  await db
    .prepare(
      `UPDATE accounts SET stripe_customer_id = ?
        WHERE id = ? AND stripe_customer_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM accounts WHERE stripe_customer_id = ?)`,
    )
    .bind(customerId, accountId, customerId)
    .run();
  const row = await db.prepare('SELECT stripe_customer_id FROM accounts WHERE id = ?').bind(accountId).first();
  return row?.stripe_customer_id === customerId;
}
