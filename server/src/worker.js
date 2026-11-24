// Cloudflare Workers entry point. Serves the premium app (static assets in public/) and the API on the same
// origin. Secrets come from the Workers secret store (wrangler secret put --env <test|production>), never from
// wrangler.toml or Git. Test and production are separate environments with separate databases and keys.

import { createApp } from './app.js';
import { createStripeGateway } from './billing.js';
import { createResendMailer, disabledMailer } from './mailer.js';
import { DATASETS } from './datasets.js';
import { fetchWorkbookValues } from './import/google-sheets.js';
import { runImport } from './import/run.js';
import { x402ConfigFromEnv } from './x402/server.js';

export function configFromEnv(env) {
  return {
    allowedOrigins: String(env.ALLOWED_ORIGINS ?? 'https://whyhumanoid.com')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    premiumUrl: env.PREMIUM_URL ?? 'https://whyhumanoid.com/premium/',
    stripeMode: env.STRIPE_MODE === 'live' ? 'live' : 'test',
    checkoutEnabled: env.CHECKOUT_ENABLED === 'true',
    allowLiveCheckout: env.ALLOW_LIVE_CHECKOUT === 'true',
    stripePriceId: env.STRIPE_PRICE_ID || null,
    // Former EUR prices whose subscriptions keep their access (comma-separated price ids).
    stripeLegacyPriceIds: String(env.STRIPE_LEGACY_PRICE_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    stripePortalConfiguration: env.STRIPE_PORTAL_CONFIGURATION || null,
    adminToken: env.ADMIN_TOKEN || null,
    // GitHub environment whose import workflow may run imports here: 'test' or 'production'.
    importEnvironment: ['test', 'production'].includes(env.IMPORT_ENVIRONMENT) ? env.IMPORT_ENVIRONMENT : null,
    loginTtlSeconds: 900,
    loginMaxPerHour: 5,
    sessionTtlSeconds: 30 * 24 * 3600,
    // x402 pay-per-query (server/src/x402/server.js): off unless X402_ENABLED and every gate passes.
    x402: x402ConfigFromEnv(env),
  };
}

export async function importFromWorkbook(env, now = Math.floor(Date.now() / 1000), accessToken, relationsConfig = null) {
  if (!env.WORKBOOK_ID || (!accessToken && (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_PRIVATE_KEY))) {
    return { ok: false, error: 'import_not_configured' };
  }
  const values = await fetchWorkbookValues({
    sheetId: env.WORKBOOK_ID,
    tabs: DATASETS.map((d) => d.tab),
    clientEmail: env.GOOGLE_SA_EMAIL,
    privateKeyPem: env.GOOGLE_SA_PRIVATE_KEY,
    now,
    accessToken,
  });
  return runImport(env.DB, values, now, { relationsConfig });
}

export default {
  async fetch(request, env, ctx) {
    const app = createApp({
      waitUntil: ctx?.waitUntil ? (p) => ctx.waitUntil(p) : null,
      db: env.DB,
      config: configFromEnv(env),
      gateway: createStripeGateway({
        secretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      }),
      mailer: env.RESEND_API_KEY
        ? createResendMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM ?? 'Why Humanoid? <premium@whyhumanoid.com>' })
        : disabledMailer,
      importNow: (accessToken, relationsConfig) => importFromWorkbook(env, undefined, accessToken, relationsConfig),
    });
    return app(request);
  },

  // Nightly server-side import of the thirteen workbook tabs.
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      importFromWorkbook(env).then((result) => {
        if (!result.ok) console.error('premium import failed', result.error);
      }),
    );
  },
};
