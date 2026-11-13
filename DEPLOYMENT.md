# Deployment settings

Status on 13 Nov 2026: the PR is open (step 1). The test Worker runs the current code (step 2) with its Stripe test
and Resend secrets; production runs older code with checkout off and no data. The Stripe products, prices and
webhook destinations exist in both modes (step 3). The access rule was verified on the test Worker with synthetic
data, since deleted. The first live import is blocked at Google Workload Identity Federation: GitHub now issues
the immutable subject format, which the provider condition and the service-account binding do not yet accept
(step 4.1 gives the exact change). Still to apply after that: the staging import, then production and go-live.

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
   whyhumanoid.com to the cleaned free catalogue (all 133 records) with the link to the full database.

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
  commit `8ab1a69` and pasted into the dashboard editor (version `b5e48b11`), with `IMPORT_ENVIRONMENT=test`.
- Verified on the live URL: `/health` 200; 13 datasets; plan "€100 per year", EUR 10000, yearly, checkout not
  available; previews 200 with 0 rows (D1 reachable, nothing imported yet); full data, `/v1/me`, checkout and task
  plan 401 without a session; webhook 503 until its secret exists; admin import 401 without the token; sign-in 503
  until the email key exists.
- Also set: `EMAIL_FROM` (Resend test sender) and the `WORKBOOK_ID` secret. The `17 3 * * *` cron was removed with
  version `b5e48b11` (imports run from GitHub Actions). Not set: the `nodejs_compat` flag (the bundle does not need it).
- Staging check with synthetic rows, account, session and entitlement inserted in the D1 console: preview 10 rows
  with preview values and no internal rows; 401 without session; 403 without entitlement; 200 with it (full
  values, search, paging); agent key 200; 403 for session and agent key after the period end; logout then 401.
  All synthetic rows were deleted afterwards.
- Re-checked on version `b5e48b11` with synthetic rows (14 per dataset, 2 of them internal): anonymous Humanoids
  preview returns all 12 customer rows with public values only and `preview_rows: "all"`; Deployments returns 10
  of 12; full data, rows past 10 and search 401 without a session and 403 with a session but no entitlement, while
  the free catalogue stays public; with an entitlement, full values for all 12 rows of both datasets and search 200;
  internal rows never returned; logout then 401. All synthetic rows, the account and its session were deleted.

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
Variables and secrets, Add, type Secret). On the test Worker, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`RESEND_API_KEY` and `WORKBOOK_ID` are set:

| Secret | Test | Production |
|---|---|---|
| `STRIPE_SECRET_KEY` | restricted test key `rk_test_...` (write: Checkout Sessions; read: Prices) | restricted live key `rk_live_...`, same permissions |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` of the test endpoint | `whsec_...` of the live endpoint |
| `RESEND_API_KEY` | Resend key | separate Resend key |
| `ADMIN_TOKEN` | optional: only for a manual import; the workflow uses its OIDC token | optional |
| `WORKBOOK_ID` | master workbook id | same |
| `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY` | not used: organisation policy blocks keys; the workflow sends a short-lived token | not used |

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
   to the exact subjects of each GitHub environment.

   GitHub issues the immutable subject format (owner and repository ids included), seen in the job log of run
   `43491305616`: `repo:integrarobot@282541415/whyhumanoid@1456468940:environment:test`. The provider condition
   and binding applied on 13 Nov 2026 name the older `repo:integrarobot/whyhumanoid:environment:test`, so Google
   rejects the exchange ("rejected by the attribute condition"). The change, in project `why-humanoid`:

   ```sh
   gcloud iam workload-identity-pools providers update-oidc github-actions \
     --project=why-humanoid --location=global --workload-identity-pool=why-humanoid-github \
     --attribute-condition="assertion.repository_id == '1456468940' && assertion.workflow_ref == 'integrarobot/whyhumanoid/.github/workflows/import-workbook.yml@refs/heads/feat/premium-preview' && assertion.sub == 'repo:integrarobot@282541415/whyhumanoid@1456468940:environment:test'"

   POOL=principal://iam.googleapis.com/projects/186224274362/locations/global/workloadIdentityPools/why-humanoid-github/subject
   gcloud iam service-accounts add-iam-policy-binding whyhumanoid-importer@why-humanoid.iam.gserviceaccount.com \
     --project=why-humanoid --role=roles/iam.workloadIdentityUser \
     --member="$POOL/repo:integrarobot@282541415/whyhumanoid@1456468940:environment:test"
   gcloud iam service-accounts remove-iam-policy-binding whyhumanoid-importer@why-humanoid.iam.gserviceaccount.com \
     --project=why-humanoid --role=roles/iam.workloadIdentityUser \
     --member="$POOL/repo:integrarobot/whyhumanoid:environment:test"
   ```

   For production, after merge: the condition's workflow_ref becomes `@refs/heads/main` (or accepts both refs)
   and the subject `...@1456468940:environment:production` gets its own binding.
2. `.github/workflows/import-workbook.yml` gets a read-only Google access token through that provider, then calls
   `POST /v1/admin/import` on the Worker of its GitHub environment with its own GitHub OIDC token (audience
   `whyhumanoid-premium-import`). The Worker verifies GitHub's signature and requires repository ID `1456468940`,
   that workflow, the GitHub environment named in its `IMPORT_ENVIRONMENT` variable (`test` or `production`) and
   an allowed branch (`test`: main or feat/premium-preview; `production`: main). No shared secret exists;
   `ADMIN_TOKEN` stays optional for a manual run. Each GitHub environment needs only the variable
   `GOOGLE_WORKLOAD_IDENTITY_PROVIDER`. The job log shows the HTTP status and row counts only.
   `workflow_dispatch` works only for workflows present on the default branch, and `main` does not carry this
   one yet. Before merge, a staging import runs on any push to `feat/premium-preview` that changes
   `.github/import-requests/test` (the push event uses the branch's own workflow file and the `test`
   environment). PR #2 adds a dispatch-only copy to `main` (no schedule, no site change) if manual dispatch is
   wanted before go-live; it needs a reviewer to merge. When PR #1 merges, the branch file with the 03:17 UTC
   schedule takes over and the nightly production import starts, so the production binding must exist first.
   The Worker crons are removed: a Worker cannot import without a key. Imports are all-or-nothing; header drift
   keeps the last snapshot.
3. Resend: verify `whyhumanoid.com` as a sending domain (DNS records at the DNS host) and use
   `premium@whyhumanoid.com` as sender.

## 5. Close the workbook bypass

After step 4.2 succeeds, set the workbook's General access to Restricted (Share, General access, Restricted).
Named editors keep access; the service account keeps Viewer. Then repeat, without a Google session, the
anonymous gviz CSV request for `sheet=Deployments` used in the 13 Nov audit: it must return a sign-in page, not rows.
