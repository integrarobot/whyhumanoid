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
import { DATASETS, DATASETS_BY_ID, publicDatasetList, publicRowLimit, queryDatasetRows, queryPreview } from './datasets.js';
import { checkoutState, handleStripeWebhook, startCheckout, startPortal } from './billing.js';
import { PLAN } from './pricing.js';
import { canReadFull, publicMatrix } from './access/matrix.js';
import { buildTaskPlan, validateInputs } from './agent/task-plan.js';
import { sha256Hex } from './crypto.js';
import { verifyImportToken } from './import/github-oidc.js';
import { readGraph } from './relations/store.js';
import { search } from './search/index.js';
import { SUPPORT_EMAIL } from './support.js';
import { BEFORE_PAYMENT, REPORT_LIMITS, REPORT_PRICE, REPORT_SERVICES } from './orders/services.js';
import { questionnaireFor } from './orders/questionnaire.js';
import {
  deliverOutbox, getOrder, listOrders, operatorOrder, operatorQueue, operatorUpdate, reconcileOrder, reportCheckoutState,
  saveDraft, startReportCheckout, submitQuestionnaire,
} from './orders/orders.js';
import { meterCredential } from './usage.js';
import { handleMcp } from './mcp.js';

const MAX_API_KEYS = 5;

const clampInt = (raw, min, max, fallback) => {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function createApp({ db, config, gateway, mailer, importNow, importAuth = verifyImportToken, clock = () => Math.floor(Date.now() / 1000), log = console, waitUntil = null, fetchPublic = null }) {
  // Every credential check goes through here: agent API keys are metered (fair use, server/src/usage.js).
  async function authed(request, now) {
    const account = await authenticate(request, db, now);
    if (account?.kind === 'api_key') await meterCredential(db, account.tokenHash, now);
    return account;
  }
  async function requireAuth(request, now) {
    const account = await authed(request, now);
    if (!account) throw new HttpError(401, 'authentication_required');
    return account;
  }
  async function requireSession(request, now) {
    const account = await requireAuth(request, now);
    if (account.kind !== 'session') throw new HttpError(403, 'session_required');
    return account;
  }
  // Operators: the existing ADMIN_TOKEN, or a signed-in session whose email is listed in OPERATOR_EMAILS. A
  // subscription alone never opens the queue.
  async function requireOperator(request, now) {
    const given = request.headers.get('x-admin-token') ?? '';
    if (given && config.adminToken && (await sha256Hex(given)) === (await sha256Hex(config.adminToken))) return { operator: 'admin_token' };
    const account = await authenticate(request, db, now);
    if (account?.kind === 'session' && (config.operatorEmails ?? []).includes(account.email)) return { operator: account.email };
    throw new HttpError(account ? 403 : 401, 'operator_only');
  }
  // Sends due emails now (in the background on Workers); failures stay in the outbox for the scheduled retry.
  async function flushOutbox() {
    const job = deliverOutbox({ db, mailer, now: clock() }).catch((e) => log.error?.('outbox delivery failed', e?.message));
    if (waitUntil) waitUntil(job);
    else await job;
  }
  const checkoutStatus = () => checkoutState({ config, gateway, db, mailer, datasetCount: DATASETS.length });
  const customerOf = async (accountId) =>
    (await db.prepare('SELECT stripe_customer_id FROM accounts WHERE id = ?').bind(accountId).first())?.stripe_customer_id ?? null;

  // Checked on every premium request, for browser sessions and agent API keys alike.
  async function requireAccess(request, now) {
    const account = await requireAuth(request, now);
    if (!hasAccess(await getEntitlement(db, account.accountId), now)) throw new HttpError(403, 'subscription_required');
    return account;
  }

  // Search scope from the server-side entitlement check, decided before anything is searched: 'full' only for an
  // active subscription (browser session or agent API key), the public preview for everyone else.
  async function searchScope(request, now) {
    return (await isEntitled(request, now)) ? 'full' : 'preview';
  }

  // Entitlement of an optional credential: false for visitors and for a missing, expired or revoked credential.
  async function isEntitled(request, now) {
    if (!request.headers.get('authorization')) return false;
    const account = await authed(request, now).catch((e) => { if (e instanceof HttpError && e.status === 429) throw e; return null; });
    return Boolean(account && hasAccess(await getEntitlement(db, account.accountId), now));
  }

  const routes = [
    ['GET', /^\/health$/, async () => json(200, { ok: true })],

    // The central access matrix (server/src/access/matrix.js): rules only, no data.
    ['GET', /^\/v1\/access$/, async () => json(200, publicMatrix(), { 'cache-control': 'public, max-age=300' })],

    // Global search over the 13 categories with common tags (Javier, 17 Nov 2026). Visitors and accounts without a
    // subscription search the public values only (free tabs in full, Deployments and Components at their public
    // fields): results, snippets, tags and counts all come from that set.
    [
      'GET',
      /^\/v1\/search$/,
      async (request, now, _match, url) => {
        const scope = await searchScope(request, now);
        const p = url.searchParams;
        const result = await search(db, { scope, q: (p.get('q') ?? '').slice(0, 200), tags: p.get('tags') ?? '', category: p.get('category') ?? '', page: p.get('page') ?? '1' });
        const headers = scope === 'full'
          ? { 'cache-control': 'private, no-store', vary: 'Authorization' }
          : { 'cache-control': 'public, max-age=60', vary: 'Authorization' };
        return json(200, result, headers);
      },
    ],

    ['GET', /^\/v1\/datasets$/, async () => json(200, { datasets: publicDatasetList() })],

    // Public rows: every row of a free tab with all its values; every row of Deployments and Components at the public
    // fields of server/src/access/fields.js; none of a counted-only tab. Workbook order, no search.
    [
      'GET',
      /^\/v1\/datasets\/([a-z0-9-]+)\/preview$/,
      async (_request, _now, match) => {
        const spec = DATASETS_BY_ID.get(match[1]);
        if (!spec) throw new HttpError(404, 'unknown_dataset');
        const preview = await queryPreview(db, spec);
        return json(
          200,
          { dataset: { id: spec.id, title: spec.title, description: spec.description }, preview_rows: publicRowLimit(spec) === 0 ? 'none' : 'all', public_fields: spec.publicFields ?? null, ...preview },
          { 'cache-control': 'public, max-age=300' },
        );
      },
    ],

    // Relations between Deployments records, catalogue robots and companies. The public graph is built only from the
    // public values of Deployments and Entities (server/src/access/fields.js) and the free catalogue.
    [
      'GET',
      /^\/v1\/relations\/preview$/,
      async () => {
        const data = await readGraph(db, 'preview');
        if (!data) throw new HttpError(503, 'relations_not_ready');
        return new Response(data, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' } });
      },
    ],
    [
      'GET',
      /^\/v1\/relations$/,
      async (request, now) => {
        await requireAccess(request, now);
        const data = await readGraph(db, 'full');
        if (!data) throw new HttpError(503, 'relations_not_ready');
        return new Response(data, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', vary: 'Authorization', 'x-content-type-options': 'nosniff' } });
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
          checkout_available: (await checkoutStatus()) === 'ready',
        }),
    ],

    [
      'GET',
      /^\/v1\/datasets\/([a-z0-9-]+)$/,
      async (request, now, match, url) => {
        const spec = DATASETS_BY_ID.get(match[1]);
        if (!spec) throw new HttpError(404, 'unknown_dataset');
        // Access matrix: a free category is read by anyone with its public values; a subscription category only
        // after the entitlement check (401 without a credential, 403 without an active subscription).
        const entitled = canReadFull(spec.id, { entitled: false }) ? await isEntitled(request, now) : (await requireAccess(request, now), true);
        const limit = clampInt(url.searchParams.get('limit'), 1, 500, 100);
        const offset = clampInt(url.searchParams.get('offset'), 0, 1_000_000, 0);
        const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100) || null;
        const page = await queryDatasetRows(db, spec.id, { limit, offset, q, publicValues: !entitled });
        const body = { dataset: { id: spec.id, title: spec.title, description: spec.description }, access: spec.access, ...page, limit, offset };
        return entitled ? privateJson(200, body) : json(200, body, { 'cache-control': 'public, max-age=60', vary: 'Authorization' });
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
          checkout_available: (await checkoutStatus()) === 'ready',
          billing_portal: Boolean(await customerOf(account.accountId)),
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
        const entitlement = await getEntitlement(db, account.accountId);
        if (hasAccess(entitlement, now)) throw new HttpError(409, 'already_subscribed');
        // A subscription waiting for payment is fixed in the customer portal, never doubled by a second checkout.
        if (entitlement && ['past_due', 'unpaid', 'incomplete'].includes(entitlement.status) && Number(entitlement.current_period_end) > now) {
          throw new HttpError(409, 'payment_pending');
        }
        return json(200, await startCheckout({ config, gateway, account: { ...account, stripeCustomerId: await customerOf(account.accountId) }, now, log, db, mailer, datasetCount: DATASETS.length }));
      },
    ],

    // Stripe customer portal: update the card, see invoices, cancel at period end. Sessions only.
    [
      'POST',
      /^\/v1\/billing\/portal$/,
      async (request, now) => {
        const account = await requireAuth(request, now);
        if (account.kind !== 'session') throw new HttpError(403, 'session_required');
        return json(200, await startPortal({ config, gateway, account: { ...account, stripeCustomerId: await customerOf(account.accountId) } }));
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

    // Operator-only: run the workbook import now. Accepted credentials: the GitHub Actions OIDC token of
    // .github/workflows/import-workbook.yml for this Worker's environment (no shared secret), or the optional
    // ADMIN_TOKEN secret for a manual run.
    [
      'POST',
      /^\/v1\/admin\/import$/,
      async (request, now) => {
        const bearer = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
        const given = request.headers.get('x-admin-token') ?? '';
        if (bearer && config.importEnvironment) {
          const verdict = await importAuth(bearer, { environment: config.importEnvironment, now });
          if (!verdict.ok) {
            log.warn?.('import token rejected', verdict.reason);
            throw new HttpError(401, 'import_token_rejected');
          }
        } else if (!config.adminToken || !given || (await sha256Hex(given)) !== (await sha256Hex(config.adminToken))) {
          throw new HttpError(401, 'admin_token_required');
        }
        if (!importNow) throw new HttpError(503, 'import_not_configured');
        const accessToken = request.headers.get('x-google-access-token') || undefined;
        // Optional body: the reviewed relations config (node tools/relations.mjs --config). Counts only come back.
        const body = await readJson(request, 512_000);
        const result = await importNow(accessToken, body.relations_config ?? null);
        return json(result.ok ? 200 : 422, {
          ok: result.ok,
          counts: result.counts,
          error: result.error,
          warnings: result.warnings?.length ?? 0,
          relations: result.relations ? { ok: result.relations.ok, error: result.relations.error, config_version: result.relations.config_version, coverage: result.relations.coverage } : undefined,
          search: result.search,
        });
      },
    ],

    // ---- Agent API keys (sessions only): create (above), list, revoke. The key itself is shown once at creation;
    // a key is identified afterwards by the first 12 characters of its hash.
    [
      'GET',
      /^\/v1\/api-keys$/,
      async (request, now) => {
        const account = await requireSession(request, now);
        const { results } = await db
          .prepare("SELECT token_hash, label, created_at, last_used_at, revoked_at FROM credentials WHERE account_id = ? AND kind = 'api_key' ORDER BY created_at DESC")
          .bind(account.accountId)
          .all();
        return privateJson(200, { keys: results.map((k) => ({ id: k.token_hash.slice(0, 12), label: k.label, created_at: k.created_at, last_used_at: k.last_used_at, revoked_at: k.revoked_at })), limit: MAX_API_KEYS });
      },
    ],
    [
      'POST',
      /^\/v1\/api-keys\/([0-9a-f]{12})\/revoke$/,
      async (request, now, match) => {
        const account = await requireSession(request, now);
        const row = await db
          .prepare("SELECT token_hash FROM credentials WHERE account_id = ? AND kind = 'api_key' AND substr(token_hash, 1, 12) = ?")
          .bind(account.accountId, match[1])
          .first();
        if (!row) throw new HttpError(404, 'api_key_not_found');
        await db.prepare('UPDATE credentials SET revoked_at = COALESCE(revoked_at, ?) WHERE token_hash = ?').bind(now, row.token_hash).run();
        return privateJson(200, { revoked: true, id: match[1] });
      },
    ],

    // ---- Custom reports (25 Nov 2026): two one-off US$1,000 services, no subscription needed or granted.
    [
      'GET',
      /^\/v1\/reports\/services$/,
      async () => {
        const state = reportCheckoutState({ config, gateway });
        return json(200, {
          services: REPORT_SERVICES.map((s) => ({ ...s, price: REPORT_PRICE.display, currency: 'USD', unit_amount: REPORT_PRICE.unitAmount, included_in_subscription: false, subscription_required: false, checkout_available: state === 'ready' && Boolean(config.reportPriceIds?.[s.id]) })),
          before_payment: BEFORE_PAYMENT,
          limits: REPORT_LIMITS,
          checkout_state: state,
          support_email: SUPPORT_EMAIL,
        });
      },
    ],
    [
      'GET',
      /^\/v1\/reports\/questionnaire\/([a-z0-9-]+)$/,
      async (_request, _now, match) => {
        const q = questionnaireFor(match[1]);
        if (!q) throw new HttpError(404, 'unknown_service');
        return json(200, q, { 'cache-control': 'public, max-age=300' });
      },
    ],
    [
      'POST',
      /^\/v1\/reports\/orders$/,
      async (request, now) => {
        const account = await requireSession(request, now);
        const body = await readJson(request);
        return privateJson(200, await startReportCheckout({ db, config, gateway, account: { ...account, stripeCustomerId: await customerOf(account.accountId) }, service: String(body.service ?? ''), now, appUrl: config.appUrl }));
      },
    ],
    [
      'GET',
      /^\/v1\/reports\/orders$/,
      async (request, now) => {
        const account = await requireSession(request, now);
        return privateJson(200, { orders: await listOrders(db, account.accountId), support_email: SUPPORT_EMAIL });
      },
    ],
    [
      'GET',
      /^\/v1\/reports\/orders\/(ord_[A-Za-z0-9_-]{6,64})$/,
      async (request, now, match) => {
        const account = await requireSession(request, now);
        return privateJson(200, { order: await getOrder(db, account.accountId, match[1]) });
      },
    ],
    [
      'POST',
      /^\/v1\/reports\/orders\/(ord_[A-Za-z0-9_-]{6,64})\/reconcile$/,
      async (request, now, match) => {
        const account = await requireSession(request, now);
        const order = await reconcileOrder({ db, config, gateway, accountId: account.accountId, orderId: match[1], now, notify: flushOutbox });
        return privateJson(200, { order });
      },
    ],
    [
      'POST',
      /^\/v1\/reports\/orders\/(ord_[A-Za-z0-9_-]{6,64})\/draft$/,
      async (request, now, match) => {
        const account = await requireSession(request, now);
        const body = await readJson(request, 200_000);
        return privateJson(200, await saveDraft({ db, accountId: account.accountId, orderId: match[1], answers: body.answers, now }));
      },
    ],
    [
      'POST',
      /^\/v1\/reports\/orders\/(ord_[A-Za-z0-9_-]{6,64})\/submit$/,
      async (request, now, match) => {
        const account = await requireSession(request, now);
        const body = await readJson(request, 200_000);
        const result = await submitQuestionnaire({ db, config, accountId: account.accountId, orderId: match[1], answers: body.answers, now, notify: flushOutbox });
        return privateJson(result.submitted ? 200 : 422, result);
      },
    ],

    // ---- Operator queue: orders, the submitted briefs, work state, delivery records and the email outbox.
    [
      'GET',
      /^\/v1\/ops\/orders$/,
      async (request, now) => {
        await requireOperator(request, now);
        return privateJson(200, await operatorQueue(db, now));
      },
    ],
    [
      'GET',
      /^\/v1\/ops\/orders\/(ord_[A-Za-z0-9_-]{6,64})$/,
      async (request, now, match) => {
        await requireOperator(request, now);
        return privateJson(200, { order: await operatorOrder(db, match[1]) });
      },
    ],
    [
      'POST',
      /^\/v1\/ops\/orders\/(ord_[A-Za-z0-9_-]{6,64})$/,
      async (request, now, match) => {
        await requireOperator(request, now);
        const body = await readJson(request);
        return privateJson(200, { order: await operatorUpdate(db, match[1], { status: body.status, note: body.note }, now) });
      },
    ],
    [
      'POST',
      /^\/v1\/ops\/outbox\/retry$/,
      async (request, now) => {
        await requireOperator(request, now);
        const body = await readJson(request);
        const ids = Array.isArray(body.ids) ? body.ids.filter((x) => /^ntf_[A-Za-z0-9_-]{6,64}$/.test(x)).slice(0, 50) : null;
        return privateJson(200, await deliverOutbox({ db, mailer, now, ids: ids?.length ? ids : null, limit: 50 }));
      },
    ],

    // ---- MCP (Model Context Protocol, Streamable HTTP, official SDK): the same catalogue, credentials, entitlement
    // and fair-use limits as the HTTP API. Read-only tools.
    [
      'POST',
      /^\/mcp$/,
      async (request, now) => handleMcp(request, { db, now, authed, isEntitledAccount: async (account) => Boolean(account && hasAccess(await getEntitlement(db, account.accountId), now)), fetchPublic, config }),
    ],
    [
      'GET',
      /^\/mcp$/,
      async () => json(405, { error: 'method_not_allowed', detail: 'POST JSON-RPC messages to /mcp (stateless Streamable HTTP).' }, { allow: 'POST' }),
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
          notify: flushOutbox,
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
      if (error instanceof HttpError) response = json(error.status, { error: error.code, ...(error.status === 429 ? { detail: 'Fair-use limit for this API key: 60 requests a minute and 5,000 a day.', support: SUPPORT_EMAIL } : error.status >= 500 ? { support: SUPPORT_EMAIL } : {}) }, error.retryAfter ? { 'retry-after': String(error.retryAfter) } : {});
      else {
        log.error?.('unhandled error', error);
        response = json(500, { error: 'internal_error' });
      }
    }
    return Object.keys(cors).length ? withHeaders(response, cors) : response;
  };
}
