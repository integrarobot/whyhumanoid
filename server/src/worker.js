// Cloudflare Workers entry point. Serves the premium app (static assets in public/) and the API on the same
// origin. Secrets come from the Workers secret store (wrangler secret put --env <test|production>), never from
// wrangler.toml or Git. Test and production are separate environments with separate databases and keys.

import { createApp } from './app.js';
import { createStripeGateway } from './billing.js';
import { createResendMailer, disabledMailer } from './mailer.js';
import { DATASETS } from './datasets.js';
import { fetchWorkbookValues } from './import/google-sheets.js';
import { runImport } from './import/run.js';

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
    adminToken: env.ADMIN_TOKEN || null,
    loginTtlSeconds: 900,
    loginMaxPerHour: 5,
    sessionTtlSeconds: 30 * 24 * 3600,
  };
}

export async function importFromWorkbook(env, now = Math.floor(Date.now() / 1000)) {
  if (!env.WORKBOOK_ID || !env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_PRIVATE_KEY) {
    return { ok: false, error: 'import_not_configured' };
  }
  const values = await fetchWorkbookValues({
    sheetId: env.WORKBOOK_ID,
    tabs: DATASETS.map((d) => d.tab),
    clientEmail: env.GOOGLE_SA_EMAIL,
    privateKeyPem: env.GOOGLE_SA_PRIVATE_KEY,
    now,
  });
  return runImport(env.DB, values, now);
}

export default {
  async fetch(request, env) {
    const app = createApp({
      db: env.DB,
      config: configFromEnv(env),
      gateway: createStripeGateway({
        secretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      }),
      mailer: env.RESEND_API_KEY
        ? createResendMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM ?? 'Why Humanoid? <premium@whyhumanoid.com>' })
        : disabledMailer,
      importNow: () => importFromWorkbook(env),
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
