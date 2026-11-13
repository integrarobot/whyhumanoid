// HTTP API. Web-standard Request -> Response, so it runs on Cloudflare Workers, Deno and Node.

import { HttpError, corsHeaders, json, privateJson, readJson, readText, withHeaders } from './http.js';
import {
  authenticate,
  createLoginToken,
  issueCredential,
  normaliseEmail,
  redeemLoginToken,
  revokeCredential,
} from './auth.js';
import { describeAccess, getEntitlement, hasAccess } from './entitlements.js';
import { DATASETS_BY_ID, PREVIEW_ROWS, publicDatasetList, queryDatasetRows, queryPreview } from './datasets.js';
import { checkoutReadiness, handleStripeWebhook, startCheckout } from './billing.js';
import { PLAN } from './pricing.js';
import { buildTaskPlan, validateInputs } from './agent/task-plan.js';
import { sha256Hex } from './crypto.js';

const MAX_API_KEYS = 5;

const clampInt = (raw, min, max, fallback) => {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function createApp({ db, config, gateway, mailer, importNow, clock = () => Math.floor(Date.now() / 1000), log = console }) {
  async function requireAuth(request, now) {
    const account = await authenticate(request, db, now);
    if (!account) throw new HttpError(401, 'authentication_required');
    return account;
  }

  // Checked on every premium request, for browser sessions and agent API keys alike.
  async function requireAccess(request, now) {
    const account = await requireAuth(request, now);
    if (!hasAccess(await getEntitlement(db, account.accountId), now)) throw new HttpError(403, 'subscription_required');
    return account;
  }

  const routes = [
    ['GET', /^\/health$/, async () => json(200, { ok: true })],

    ['GET', /^\/v1\/datasets$/, async () => json(200, { datasets: publicDatasetList() })],

    // Public preview: first PREVIEW_ROWS non-empty data rows of the tab in workbook order. No search.
    [
      'GET',
      /^\/v1\/datasets\/([a-z0-9-]+)\/preview$/,
      async (_request, _now, match) => {
        const spec = DATASETS_BY_ID.get(match[1]);
        if (!spec) throw new HttpError(404, 'unknown_dataset');
        const preview = await queryPreview(db, spec.id);
        return json(
          200,
          { dataset: { id: spec.id, title: spec.title, description: spec.description }, preview_rows: PREVIEW_ROWS, ...preview },
          { 'cache-control': 'public, max-age=300' },
        );
      },
    ],

    [
      'GET',
      /^\/v1\/billing\/plan$/,
      async () =>
        json(200, {
          plan: {
            id: PLAN.id,
            name: PLAN.name,
            description: PLAN.description,
            price: PLAN.display,
            currency: PLAN.currency.toUpperCase(),
            unit_amount: PLAN.unitAmount,
            interval: PLAN.interval,
          },
          checkout_available: checkoutReadiness({ config, gateway }) === 'ready',
        }),
    ],

    [
      'GET',
      /^\/v1\/datasets\/([a-z0-9-]+)$/,
      async (request, now, match, url) => {
        const spec = DATASETS_BY_ID.get(match[1]);
        if (!spec) throw new HttpError(404, 'unknown_dataset');
        await requireAccess(request, now);
        const limit = clampInt(url.searchParams.get('limit'), 1, 500, 100);
        const offset = clampInt(url.searchParams.get('offset'), 0, 1_000_000, 0);
        const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100) || null;
        const page = await queryDatasetRows(db, spec.id, { limit, offset, q });
        return privateJson(200, {
          dataset: { id: spec.id, title: spec.title, description: spec.description },
          ...page,
          limit,
          offset,
        });
      },
    ],

    [
      'GET',
      /^\/v1\/me$/,
      async (request, now) => {
        const account = await requireAuth(request, now);
        const entitlement = await getEntitlement(db, account.accountId);
        return privateJson(200, {
          email: account.email,
          credential: account.kind,
          access: describeAccess(entitlement, now),
          checkout_enabled: Boolean(config.checkoutEnabled),
        });
      },
    ],

    [
      'POST',
      /^\/v1\/auth\/magic-link$/,
      async (request, now) => {
        const email = normaliseEmail((await readJson(request)).email);
        if (!mailer.configured) throw new HttpError(503, 'email_not_configured');
        const token = await createLoginToken(db, email, now, {
          ttlSeconds: config.loginTtlSeconds,
          maxPerHour: config.loginMaxPerHour ?? 5,
        });
        await mailer.send({
          to: email,
          subject: 'Your Why Humanoid? sign-in link',
          text:
            `Sign in to Why Humanoid? Premium:\n\n${config.premiumUrl}#login=${token}\n\n` +
            'The link works once and expires in 15 minutes. If you did not ask for it, ignore this email.',
        });
        // Same answer whether or not the address has an account.
        return json(202, { sent: true });
      },
    ],

    [
      'POST',
      /^\/v1\/auth\/redeem$/,
      async (request, now) => {
        const { token } = await readJson(request);
        const { account, session } = await redeemLoginToken(db, token, now, {
          sessionTtlSeconds: config.sessionTtlSeconds,
        });
        return privateJson(200, { token: session.token, expires_at: session.expiresAt, email: account.email });
      },
    ],

    [
      'POST',
      /^\/v1\/auth\/logout$/,
      async (request, now) => {
        const account = await requireAuth(request, now);
        await revokeCredential(db, account.tokenHash, now);
        return json(200, { ok: true });
      },
    ],

    [
      'POST',
      /^\/v1\/api-keys$/,
      async (request, now) => {
        const account = await requireAccess(request, now);
        if (account.kind !== 'session') throw new HttpError(403, 'session_required');
        const active = await db
          .prepare("SELECT COUNT(*) AS n FROM credentials WHERE account_id = ? AND kind = 'api_key' AND revoked_at IS NULL")
          .bind(account.accountId)
          .first();
        if (Number(active?.n ?? 0) >= MAX_API_KEYS) throw new HttpError(409, 'api_key_limit_reached');
        const label = String((await readJson(request)).label ?? 'agent').slice(0, 60);
        const key = await issueCredential(db, account.accountId, 'api_key', now, { label });
        // Shown once; only its hash is stored.
        return privateJson(201, { api_key: key.token, label });
      },
    ],

    [
      'POST',
      /^\/v1\/billing\/checkout$/,
      async (request, now) => {
        const account = await requireAuth(request, now);
        if (account.kind !== 'session') throw new HttpError(403, 'session_required');
        if (hasAccess(await getEntitlement(db, account.accountId), now)) throw new HttpError(409, 'already_subscribed');
        return json(200, await startCheckout({ config, gateway, account, now, log }));
      },
    ],

    // Agent workflow: evidence-based task plan. Same entitlement check as every full-data request.
    [
      'POST',
      /^\/v1\/agent\/task-plan$/,
      async (request, now) => {
        await requireAccess(request, now);
        const body = await readJson(request);
        const taskId = String(body.task_id ?? '').trim();
        if (!/^[a-z0-9_]{3,80}$/.test(taskId)) throw new HttpError(400, 'invalid_task_id');
        const { inputs, error } = validateInputs(body.inputs);
        if (error) throw new HttpError(400, error);
        return privateJson(200, await buildTaskPlan(db, { taskId, inputs }));
      },
    ],

    // Operator-only: run the workbook import now. Needs the ADMIN_TOKEN secret.
    [
      'POST',
      /^\/v1\/admin\/import$/,
      async (request) => {
        const given = request.headers.get('x-admin-token') ?? '';
        if (!config.adminToken || !given || (await sha256Hex(given)) !== (await sha256Hex(config.adminToken))) {
          throw new HttpError(401, 'admin_token_required');
        }
        if (!importNow) throw new HttpError(503, 'import_not_configured');
        const accessToken = request.headers.get('x-google-access-token') || undefined;
        const result = await importNow(accessToken);
        return json(result.ok ? 200 : 422, { ok: result.ok, counts: result.counts, error: result.error, warnings: result.warnings?.length ?? 0 });
      },
    ],

    [
      'POST',
      /^\/v1\/stripe\/webhook$/,
      async (request, now) => {
        const rawBody = await readText(request, 1_000_000);
        const result = await handleStripeWebhook({
          db,
          gateway,
          config,
          rawBody,
          signature: request.headers.get('stripe-signature'),
          now,
        });
        return json(200, result);
      },
    ],
  ];

  return async function handle(request) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, config.allowedOrigins);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let response;
    try {
      const now = clock();
      const route = routes.find(([method, pattern]) => method === request.method && pattern.test(url.pathname));
      if (!route) {
        const known = routes.some(([, pattern]) => pattern.test(url.pathname));
        throw new HttpError(known ? 405 : 404, known ? 'method_not_allowed' : 'not_found');
      }
      response = await route[2](request, now, url.pathname.match(route[1]), url);
    } catch (error) {
      if (error instanceof HttpError) response = json(error.status, { error: error.code });
      else {
        log.error?.('unhandled error', error);
        response = json(500, { error: 'internal_error' });
      }
    }
    return Object.keys(cors).length ? withHeaders(response, cors) : response;
  };
}
