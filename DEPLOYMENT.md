# Deployment settings

Status on 13 Nov 2026: the PR is open (step 1). The test and production backends run without secrets (step 2),
production with checkout off and no data. The Stripe test product, price and webhook destination exist (steps 3.1
and 3.2). The staging read paths were verified on Cloudflare with synthetic data, since deleted. Still to apply:
the remaining secrets, the first import, and the go-live.

Verified on 13 Nov 2026 in the test environment: sign-in email delivered by Resend; sign-in links are redeemed
only after a click (a link was used up 26 seconds after delivery before this change); test Checkout session
created with the restricted key after the server's price check; access granted, kept after cancellation at
period end, and removed at period end, through signed Stripe webhooks from a test-clock subscription. Keys and secrets are entered by Javier in each service's own console or with
`wrangler secret put`, never in chat, tickets or Git. No real card is used for testing: Stripe test mode only,
with Stripe's test cards.

## 1. Repository

1. Done: the Claude GitHub App is installed on `integrarobot`.
2. Done: draft PR #1 from `feat/premium-preview` to `main`. CI must pass (guard, export, build parity, headless render, API tests).
3. Do not push `feat/premium-foundation` (commit `5cc9262`): it carries the full 133-record export.
4. Merge only at go-live, after step 4 below is live and the production checks pass. Merging changes
   whyhumanoid.com to the 10-row preview with the link to the full database.

## 2. Cloudflare (backend host)

| Setting | Test | Production |
|---|---|---|
| Worker | `whyhumanoid-premium-test` (`wrangler deploy --env test`) | `whyhumanoid-premium` (`wrangler deploy --env production`) |
| D1 | `wrangler d1 create whyhumanoid-premium-test`, id into `[env.test]` | `wrangler d1 create whyhumanoid-premium`, id into `[env.production]` |
| Schema | `wrangler d1 migrations apply whyhumanoid-premium-test --remote --env test` | same with `whyhumanoid-premium --env production` |
| URL | `https://whyhumanoid-premium-test.<account>.workers.dev` (fill `ALLOWED_ORIGINS`, `PREMIUM_URL`) | `https://premium.whyhumanoid.com` |
| `STRIPE_MODE` | `test` | `live` |
| `CHECKOUT_ENABLED` | `true` after step 3 passes | `false` until Javier enables it |
| `ALLOW_LIVE_CHECKOUT` | `false` | `true` only when Javier enables live checkout |
| `STRIPE_PRICE_ID` | test-mode price id | live-mode price id |

Test environment, applied on 13 Nov 2026 through the Cloudflare dashboard (no Wrangler token was created):

- D1 `whyhumanoid-premium-test`, id `4cadeb6e-56ca-48e9-9adf-e666c4d2befd`, schema from `migrations/0001_init.sql`
  applied in the D1 console (8 tables).
- Worker `whyhumanoid-premium-test` at `https://whyhumanoid-premium-test.javier-198.workers.dev`, binding `DB` to
  that database, plain-text variables as in `[env.test.vars]`. The code is `dist/worker.dashboard.js` built from
  commit `44982a2` (sha256 `b659a635…e2332`) and pasted into the dashboard editor.
- Verified on the live URL: `/health` 200; 13 datasets; plan "€100 per year", EUR 10000, yearly, checkout not
  available; previews 200 with 0 rows (D1 reachable, nothing imported yet); full data, `/v1/me`, checkout and task
  plan 401 without a session; webhook 503 until its secret exists; admin import 401 without the token; sign-in 503
  until the email key exists.
- Also set: cron `17 3 * * *`, `EMAIL_FROM` (Resend test sender) and the `WORKBOOK_ID` secret. Not set: the
  `nodejs_compat` flag (the bundle does not need it).
- Staging check with synthetic rows, account, session and entitlement inserted in the D1 console: preview 10 rows
  with preview values and no internal rows; 401 without session; 403 without entitlement; 200 with it (full
  values, search, paging); agent key 200; 403 for session and agent key after the period end; logout then 401.
  All synthetic rows were deleted afterwards.

Production environment, created on 13 Nov 2026 the same way, checkout off:

- D1 `whyhumanoid-premium`, EU jurisdiction, id `ba8ed181-22c6-40d4-b77d-f4bcbf238274`, same schema.
- Worker `whyhumanoid-premium` at `https://whyhumanoid-premium.javier-198.workers.dev`, same bundle, binding `DB`,
  variables as in `[env.production.vars]` except `STRIPE_PRICE_ID` (set when the live price exists), the
  `WORKBOOK_ID` secret, cron `17 3 * * *`. The catalogue links to this URL (`PREMIUM_APP_URL` in
  `tools/build-site.mjs`).

To redeploy from the dashboard: `node server/scripts/build-dashboard.mjs <esbuild>` (esbuild 0.27.7), then replace
`worker.js` in Edit code and Deploy. `wrangler deploy --env test` with a token Javier creates also works and uses
the same settings, because `[env.test]` matches the dashboard.

`premium.whyhumanoid.com` as a Workers custom domain requires the `whyhumanoid.com` zone on Cloudflare: change the
nameservers at IONOS (registrar stays IONOS) after copying every existing record (GitHub Pages A records for `@`,
`www` CNAME to `integrarobot.github.io`, MX, SPF, DKIM, DMARC, Google verification). Until then, production can run
on its `workers.dev` URL.

Secrets, per environment (`wrangler secret put NAME --env test|production`, or in the dashboard: Worker, Settings,
Variables and secrets, Add, type Secret). None is set yet on the test Worker:

| Secret | Test | Production |
|---|---|---|
| `STRIPE_SECRET_KEY` | restricted test key `rk_test_...` (write: Checkout Sessions; read: Prices) | restricted live key `rk_live_...`, same permissions |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` of the test endpoint | `whsec_...` of the live endpoint |
| `RESEND_API_KEY` | Resend key | separate Resend key |
| `ADMIN_TOKEN` | random 32+ bytes | different random value |
| `WORKBOOK_ID` | master workbook id | same |
| `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY` | read-only service account | same or a separate one |

The API refuses a live key in the test environment and a test key in production (`stripe_mode_mismatch`), and
ignores webhook events from the other mode.

## 3. Stripe

1. Product "Why Humanoid? full database", one recurring price: EUR, 10000 minor units, yearly, licensed, active.
   Test mode: `prod_VcaBEvd49gwki2`, `price_1UbL1PAcMngkWs5CH3IDosFb`. Live mode (13 Nov 2026):
   `prod_VceC4S2gQeLhOT`, `price_1UbOtjAcMngkWs5CR8qXNPGn`, set on the production Worker.
2. Webhook endpoint per mode: `<environment URL>/v1/stripe/webhook`. Test mode: done, destination
   `whyhumanoid-premium-test` (`we_1UbMQ0AcMngkWs5CsEPdvkXG`), snapshot payloads. Live mode: after the test
   lifecycle passes. Live mode: destination `whyhumanoid-premium` (`we_1UbOuzAcMngkWs5CyMeDbKN3`) to the
   production Worker; its signing secret goes into the production Worker. Events `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Before each checkout, the API retrieves the price and refuses (`price_mismatch`) unless it is active, recurring,
   EUR, 10000, yearly, interval count 1, and in the same mode as the key.
4. Test lifecycle on the test environment, with test card 4242 4242 4242 4242:
   sign in, preview only, checkout, access granted after the webhook, renewal with a Stripe test clock
   (advance one year), cancel at period end, access until the period ends, no access after.
   The same lifecycle passes in `server/test/lifecycle.test.js` with signed synthetic events.
5. Production: same price check passes in live mode, then Javier sets `CHECKOUT_ENABLED=true` and
   `ALLOW_LIVE_CHECKOUT=true` on production.

## 4. Data and identity

1. Google Cloud: enable the Sheets, Security Token Service and IAM Service Account Credentials APIs. Share the workbook
   with `whyhumanoid-importer@why-humanoid.iam.gserviceaccount.com` as Viewer. Configure a Workload Identity
   Federation provider for `https://token.actions.githubusercontent.com` and map `google.subject=assertion.sub`.
   Restrict admission to repository ID `1456468940` and workflow `.github/workflows/import-workbook.yml`.
   Allow the `production` job only on `refs/heads/main` and the `test` job only on `refs/heads/main` or
   `refs/heads/feat/premium-preview`. Bind `roles/iam.workloadIdentityUser` on the importer service account
   to the exact subjects `repo:integrarobot/whyhumanoid:environment:test` and
   `repo:integrarobot/whyhumanoid:environment:production`.
2. Install `server/scripts/import-workbook.workflow.yml` as `.github/workflows/import-workbook.yml` using GitHub
   access with workflow write permission. Configure the `test` and `production` GitHub environments with the provider resource name in
   `GOOGLE_WORKLOAD_IDENTITY_PROVIDER` and the matching Worker's `ADMIN_TOKEN` as the environment secret
   `IMPORT_ADMIN_TOKEN`. Deploy the updated Worker and run **Import private workbook** for `test` first.
   Check the latest `import_runs` record and the public preview counts. Once production is ready and the
   workflow is on `main`, the automatic run targets production at 03:17 UTC. Remove the old Worker cron
   in environments using federation. Imports are all-or-nothing; header drift keeps the last snapshot.
3. Resend: verify `whyhumanoid.com` as a sending domain (DNS records at the DNS host) and use
   `premium@whyhumanoid.com` as sender.

## 5. Close the workbook bypass

After step 4.2 succeeds, set the workbook's General access to Restricted (Share, General access, Restricted).
Named editors keep access; the service account keeps Viewer. Then repeat, without a Google session, the
anonymous gviz CSV request for `sheet=Deployments` used in the 13 Nov audit: it must return a sign-in page, not rows.
