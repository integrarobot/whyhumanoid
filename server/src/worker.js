// Cloudflare Workers entry point. Serves the premium app (static assets in public/) and the API on the same
// origin. Secrets come from the Workers secret store (wrangler secret put --env <test|production>), never from
// wrangler.toml or Git. Test and production are separate environments with separate databases and keys.

import { createApp } from './app.js';
import { createStripeGateway } from './billing.js';
import { createResendMailer, disabledMailer } from './mailer.js';
import { DATASETS } from './datasets.js';
import { fetchWorkbookValues } from './import/google-sheets.js';
import { runImport } from './import/run.js';
import { SCOPED_DATASETS, runScopedImport } from './import/scoped.js';
import { deliverOutbox } from './orders/orders.js';

export function configFromEnv(env) {
  return {
    allowedOrigins: String(env.ALLOWED_ORIGINS ?? 'https://whyhumanoid.com')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    premiumUrl: env.PREMIUM_URL ?? 'https://whyhumanoid.com/premium/',
    // The app address used in order emails and Checkout returns (the site's /app/).
    appUrl: env.APP_URL ?? 'https://whyhumanoid.com/app/',
    // Published site files read by the MCP atlas tool (public JSON only).
    siteOrigin: env.SITE_ORIGIN ?? 'https://whyhumanoid.com',
    stripeMode: env.STRIPE_MODE === 'live' ? 'live' : 'test',
    checkoutEnabled: env.CHECKOUT_ENABLED === 'true',
    allowLiveCheckout: env.ALLOW_LIVE_CHECKOUT === 'true',
    stripePriceId: env.STRIPE_PRICE_ID || null,
    // Former EUR prices whose subscriptions keep their access (comma-separated price ids).
    stripeLegacyPriceIds: String(env.STRIPE_LEGACY_PRICE_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    stripePortalConfiguration: env.STRIPE_PORTAL_CONFIGURATION || null,
    adminToken: env.ADMIN_TOKEN || null,
    // Custom reports (25 Nov 2026): one-off USD 1,000 prices per service, checked before every Checkout Session; never
    // replaced by the subscription price. Report checkout needs REPORTS_CHECKOUT_ENABLED=true, and live mode also
    // REPORTS_LIVE_OPEN in server/src/orders/services.js.
    reportsCheckoutEnabled: env.REPORTS_CHECKOUT_ENABLED === 'true',
    reportPriceIds: {
      'humanoid-adoption-assessment': env.REPORT_PRICE_ID_INTEGRATION || null,
      'component-manufacturing-study': env.REPORT_PRICE_ID_DIVERSIFICATION || null,
    },
    // Operators of the report queue (signed-in emails) and where order notifications go. Secrets or variables of the
    // Worker, never in Git.
    operatorEmails: String(env.OPERATOR_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    operatorNotifyEmail: env.OPERATOR_NOTIFY_EMAIL || null,
    // GitHub environment whose import workflow may run imports here: 'test' or 'production'.
    importEnvironment: ['test', 'production'].includes(env.IMPORT_ENVIRONMENT) ? env.IMPORT_ENVIRONMENT : null,
    loginTtlSeconds: 900,
    loginMaxPerHour: 5,
    sessionTtlSeconds: 30 * 24 * 3600,
  };
}

export async function importFromWorkbook(env, now = Math.floor(Date.now() / 1000), accessToken, relationsConfig = null, scoped = null) {
  if (!env.WORKBOOK_ID || (!accessToken && (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_PRIVATE_KEY))) {
    return { ok: false, error: 'import_not_configured' };
  }
  if (scoped) {
    // Scoped import: reads only the tabs in scope and writes only what changed (server/src/import/scoped.js).
    const specs = scoped.datasets.map((id) => DATASETS.find((d) => d.id === id));
    if (specs.some((s) => !s) || scoped.datasets.some((id) => !SCOPED_DATASETS.includes(id))) return { ok: false, error: 'invalid_scope' };
    const values = await fetchWorkbookValues({ sheetId: env.WORKBOOK_ID, tabs: specs.map((d) => d.tab), clientEmail: env.GOOGLE_SA_EMAIL, privateKeyPem: env.GOOGLE_SA_PRIVATE_KEY, now, accessToken });
    return runScopedImport(env.DB, values, now, { datasets: scoped.datasets, relationsConfig, dryRun: scoped.dryRun });
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

const mailerFor = (env) => (env.RESEND_API_KEY
  ? createResendMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM ?? 'Why Humanoid? <premium@whyhumanoid.com>' })
  : disabledMailer);

export default {
  async fetch(request, env, ctx) {
    const config = configFromEnv(env);
    const app = createApp({
      db: env.DB,
      config,
      gateway: createStripeGateway({
        secretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      }),
      mailer: mailerFor(env),
      importNow: (accessToken, relationsConfig, scoped) => importFromWorkbook(env, undefined, accessToken, relationsConfig, scoped),
      waitUntil: ctx?.waitUntil ? (p) => ctx.waitUntil(p) : null,
      fetchPublic: (path) => fetch(new URL(path, config.siteOrigin)),
      newsFetch: (url, init) => fetch(url, init),
      newsCache: typeof caches !== 'undefined' ? caches.default : null,
    });
    return app(request);
  },

  // Scheduled work. Every trigger retries due order emails from the outbox. The workbook import runs only on the cron
  // named in IMPORT_CRON (none is configured: imports run from GitHub Actions), so adding an outbox cron never starts an
  // import.
  async scheduled(event, env, ctx) {
    const now = Math.floor(Date.now() / 1000);
    ctx.waitUntil(deliverOutbox({ db: env.DB, mailer: mailerFor(env), now, limit: 50 }).catch((e) => console.error('outbox retry failed', e?.message)));
    if (env.IMPORT_CRON && event?.cron === env.IMPORT_CRON) {
      ctx.waitUntil(
        importFromWorkbook(env).then((result) => {
          if (!result.ok) console.error('premium import failed', result.error);
        }),
      );
    }
  },
};
