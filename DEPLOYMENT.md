# Deployment settings still to apply

Nothing here has been applied yet. Keys and secrets are entered by Javier in each service's own console or with
`wrangler secret put`, never in chat, tickets or Git. No real card is used for testing: Stripe test mode only,
with Stripe's test cards.

## 1. Repository

1. Install the Claude GitHub App on the `integrarobot` account, or push the branch yourself.
2. Push `feat/premium-preview` and open a PR to `main`. CI must pass (guard, export, build parity, headless render, API tests).
3. Do not push `feat/premium-foundation` (commit `5cc9262`): it carries the full 133-record export.
4. Merge only after step 4 below is live. Merging changes whyhumanoid.com to the 10-row preview.

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

`premium.whyhumanoid.com` as a Workers custom domain requires the `whyhumanoid.com` zone on Cloudflare: change the
nameservers at IONOS (registrar stays IONOS) after copying every existing record (GitHub Pages A records for `@`,
`www` CNAME to `integrarobot.github.io`, MX, SPF, DKIM, DMARC, Google verification). Until then, production can run
on its `workers.dev` URL.

Secrets, per environment (`wrangler secret put NAME --env test|production`):

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
   Test mode: done on 13 Nov 2026 in the Integrarobot account (`prod_VcaBEvd49gwki2`, `price_1UbL1PAcMngkWs5CH3IDosFb`),
   already set in `[env.test]`. Live mode: create it separately when Javier decides, and set it in `[env.production]`.
2. Webhook endpoint per mode: `<environment URL>/v1/stripe/webhook`, events `checkout.session.completed`,
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

1. Google Cloud: create a service account, enable the Sheets API, create a key, share the workbook with the
   service account as Viewer. Store its email and key as secrets.
2. Run the first import: `curl -X POST -H "x-admin-token: $ADMIN_TOKEN" <environment URL>/v1/admin/import`.
   The nightly cron (03:17 UTC) keeps it current. Imports are all-or-nothing; header drift keeps the last snapshot.
3. Resend: verify `whyhumanoid.com` as a sending domain (DNS records at the DNS host) and use
   `premium@whyhumanoid.com` as sender.

## 5. Close the workbook bypass

After step 4.2 succeeds, set the workbook's General access to Restricted (Share, General access, Restricted).
Named editors keep access; the service account keeps Viewer. Then repeat, without a Google session, the
anonymous gviz CSV request for `sheet=Deployments` used in the 13 Nov audit: it must return a sign-in page, not rows.
