> **24 Nov 2026, current state.** New data subscriptions: US$100 per year, billed annually, no free trial (server/src/pricing.js). Stripe products renamed "Why Humanoid? Deployments and Components" (live prod_VceC4S2gQeLhOT, test prod_VcaBEvd49gwki2). Current prices: live `price_1UfGNgAcMngkWs5CkdCMYC1j`, test `price_1UfGPQAcMngkWs5CeBWLrtsQ` (USD 100.00 / year, no trial). Legacy EUR prices, still active for existing subscriptions: live `price_1UbOtjAcMngkWs5CR8qXNPGn`, test `price_1UbL1PAcMngkWs5CH3IDosFb` (`STRIPE_LEGACY_PRICE_IDS`). New live sales open since 24 Nov 2026 (`LIVE_SALES_OPEN = true`, PR #86): `/v1/billing/plan` reports `checkout_available: true`. Production Worker: bundle sha256 a0727faf…dbe8 from main 33fae3c, code version b3fda34c, deployed by Codex on 24 Nov 2026 (before: 31060e45…21cc, version 6cbdd1f3); test Worker from main 834e595, code version 1431b567. Existing EUR subscriptions keep their contract. Every Deployments case and Components product is public at its public fields (server/src/access/fields.js); the detail is paid. Custom company reports (US$1,000) are not available to order. Checkout computes and collects no tax (no Stripe Tax, tax rates, address or tax ID collection): the charge is the price; the tax treatment is Javier's decision. The notes below are the history of earlier states.

# Deployment settings

## 0. Paywall go-live (Javier, 16 Nov 2026, d-0008)

Humanoids free; the other 12 tabs premium at €100 per year (Stripe live, no free trial). The site publishes only the
first 10 sheet rows of each premium tab (`data/preview/`); full rows live only in the production D1 and are served
by the Worker after a server-side subscription check. This replaces the open database of 16 Nov 2026.

Checkout is armed in code, not by a person remembering an order: `/v1/billing/checkout` refuses (503) unless the
Stripe key matches `STRIPE_MODE`, live is allowed, the webhook signing secret is set, sign-in email works and all 13
datasets hold imported rows. So `CHECKOUT_ENABLED=true` and `ALLOW_LIVE_CHECKOUT=true` can be set before the last
secrets: nothing can be charged until a payment can become access. Each session also re-checks the live price
(EUR 10000, yearly, no trial).

What only Javier (or Codex for Google) can do, in this order. Keys and secrets go straight into each service's
console, never into chat, tickets or Git:

| # | Where | Action |
|---|---|---|
| 1 | Google Cloud, provider `github-actions` and service account `whyhumanoid-importer` | Production identity, exact condition and binding in 4.1. Then Actions, "Import private workbook", Run workflow on `main`, target `production` Done 16 Nov 2026 with Javier's passkey. |
| 2 | Resend, domain `whyhumanoid.com` | IONOS Auto configure, approve in IONOS, Verify DNS records (section 4.3). Then a sending key restricted to `whyhumanoid.com` as Cloudflare secret `RESEND_API_KEY` on `whyhumanoid-premium` Done: domain Verified 16 Nov; key `whyhumanoid-premium-production` (sending, this domain only) added by Javier 17 Nov. |
| 3 | Stripe live, Developers, API keys, Create restricted key | Write: Checkout Sessions, Customer portal. Read: Prices. Cloudflare secret `STRIPE_SECRET_KEY` on `whyhumanoid-premium` Done 17 Nov: key `whyhumanoid-premium-production` created and stored by Javier. |
| 4 | Stripe live, webhook `we_1UbOuzAcMngkWs5CyMeDbKN3` | Reveal the signing secret; Cloudflare secret `STRIPE_WEBHOOK_SECRET` on `whyhumanoid-premium` Done 17 Nov (Javier). Signature proven on 17 Nov without a charge (see the state notes); the destination listens to its 4 original events. |
| 5 | Stripe live, Settings, Billing, Customer portal | Done 16 Nov 2026: default configuration `bpc_1UcVsIAcMngkWs5C9X4Xkwf0` saved (cancellation at period end, payment-method updates, invoices; no plan changes). `STRIPE_PORTAL_CONFIGURATION` stays unset, so the default is used |
| 6 | Google Drive | Master workbook and its April copy "... para Codex": General access, Restricted (section 5). Named editors and the importer keep access |
| 7 | GitHub, organisation `integrarobot` | Close the history exposure (below): make this repository private and serve the site from a public repository that holds only the built site, or from Cloudflare once DNS moves there |

After 1 to 4, `GET /v1/billing/plan` answers `checkout_available: true` without any other change. Production checks
then: import counts for the 13 tabs, a sign-in email from `premium@whyhumanoid.com` redeemed, previews and
401/403/200 boundaries, the live price check through one unpaid Checkout session (no card entered, no charge), and
the portal link for a paying account. No real card is used for testing.

### State on 16 Nov 2026, 20:35 Madrid

- whyhumanoid.com (commit `f4bd2db`, PR #18): previews only; the 13 old `/data/database/*.json` URLs answer 404.
- Production Worker `whyhumanoid-premium`: paywall code from `f4bd2db` (dashboard bundle sha256 `1659cea9…7d8b`),
  version `38f8d8ab`, then `CHECKOUT_ENABLED=true` and `ALLOW_LIVE_CHECKOUT=true`. Checked without a session:
  `/health` 200; previews 200 with 0 rows (empty D1); full rows, `/v1/me`, checkout and portal 401; sign-in 503
  `email_not_configured`; webhook 503 `webhook_not_configured`; `/v1/billing/plan` `checkout_available: false`.
  Secrets: only `WORKBOOK_ID`. Nothing can be charged yet.
- Test Worker `whyhumanoid-premium-test`: same build, version `7912c960`, staging data of 13 Nov. Without a session
  every premium tab previews at most its first 10 sheet rows (Software 19 and Other robots 20 entries), Humanoids
  133 in full, and full rows answer 401. `checkout_available: true` there (test keys, test email, data present),
  which shows the gate opening once the prerequisites exist.
- Production import, run `43940173562` (main, target production): Google answers `unauthorized_client`, "The given
  credential is rejected by the attribute condition". Claims presented: `sub`
  `repo:integrarobot@282541415/whyhumanoid@1456468940:environment:production`, `workflow_ref`
  `integrarobot/whyhumanoid/.github/workflows/import-workbook.yml@refs/heads/main`. Step 1 of the table (4.1) fixes it.
- 20:50 Madrid re-check: Cloudflare unchanged (secret `WORKBOOK_ID` only); import run `43943484249` rejected the same
  way; the Google Cloud console asks for Javier's passkey; Stripe live webhook active with the 4 handled events and the
  price at EUR 100 a year without trial; no live restricted key; Resend domain still Not Started. Handoff for Claude
  Code: `ops/relevo-claude-code.md`.
- 16 Nov, 21:30 to 21:40 Madrid, with Javier's approval and passkey: provider condition extended to the production
  subject on `main` only; `roles/iam.workloadIdentityUser` on `whyhumanoid-importer` for the production principal;
  Resend DNS added in IONOS (TXT `resend._domainkey`, MX and TXT on `send`). Import run `43951964181`: HTTP 200, the 13
  tabs (Deployments 119).
- 17 Nov, 06:50 Madrid: Resend domain Verified; production D1 matches the import of the audited export tab by tab
  (rows, fields per row, non-empty values, characters; Deployments 119 x 47, 4,817 values); the workbook is unchanged
  since 13 Nov 18:33 UTC. Still missing: the three secrets (steps 2 to 4), whose forms are prepared for Javier.
- 17 Nov, 07:40 to 07:52 Madrid, after Javier stored the three secrets: `/v1/billing/plan` `checkout_available: true`
  (live key reads the price: EUR 100 a year, no trial); webhook 400 without a signature or with a bad one; sign-in
  email to Resend's test address `delivered@resend.dev` sent from `premium@whyhumanoid.com` and Delivered; after the
  click-to-confirm sign-in: `/v1/me` 200 with no access, full rows 403 `subscription_required`, portal 409
  `no_billing_account`; Stripe Checkout live opened (`cs_live_…`, "100,00 € por año", no trial) and left without a card:
  back in the app "Checkout was cancelled. Nothing was charged."; price still 0 subscriptions, no new payment. Mobile
  375 px without horizontal overflow. Not tested by the agent on purpose: a completed purchase and the subscriber
  state in production (since covered by a real purchase made by a person, 08:24 note below).
- 17 Nov, 08:14 to 08:18 Madrid: webhook signature proven with the real secret and no charge. Expiring the abandoned
  checkout was not possible from the Dashboard (the live Workbench shell and API explorer are read-only) and the live
  key lives only in the Worker, so the destination temporarily listened to `product.updated` and a metadata key was
  added to and removed from the product "Why Humanoid? full database": two live signed deliveries, both HTTP 200,
  response `{"received": true, "outcome": "ignored_type"}`; `stripe_events` holds `evt_1UcgbVAcMngkWs5CK2RGe4t5`
  (`product.updated`, `ignored_type`); `entitlements` 0. Product metadata and the destination's 4 events restored.
- 17 Nov, 08:24 Madrid: completed purchase, a real purchase made and confirmed by a person, not by an agent: EUR 100
  paid and access unlocked; D1 recorded a premium entitlement from Stripe and the events `checkout.session.completed`
  (`customer_linked`) and `customer.subscription.created` (`entitlement_updated`) after the two signature-proof
  `product.updated` deliveries. Purchase, webhook and unlock work end to end in production. That subscription is not
  cancelled or refunded (account details removed on 23 Nov 2026: no customer account data in the repository).
- 17 Nov, 08:30 to 08:45 Madrid: premium app moved from the `workers.dev` URL to `https://whyhumanoid.com/app/`
  (same brand and domain; DNS and mail untouched). How: `app/` is the static build of `server/public`
  (`tools/build-app.mjs`, checked in CI) served by GitHub Pages with a CSP meta tag, `connect-src` limited to the API
  origin, no referrer and a frame-buster; the API stays on the Worker and answers the new origin over CORS. Production
  variables: `ALLOWED_ORIGINS` = `https://whyhumanoid.com,https://whyhumanoid-premium.javier-198.workers.dev` (old
  origin kept for the transition) and `PREMIUM_URL` = `https://whyhumanoid.com/app/`, which also sets the sign-in
  link, Checkout success and cancel URLs and the portal return. PR #24 (`48d4214`) published `app/` and the catalogue
  buttons; Worker version `7e8d9e1c` (bundle sha256 `b234b112…704c`, temporary commit `4a075ee` on
  `deploy/worker-bundle-f4bd2db`) redirects GET and HEAD of the old app page (`/`, `/index.html`) to the new URL with
  302, keeping the `#fragment` (old bookmarks, deep links and sign-in links still work); `/v1/*` is never redirected,
  so Stripe's POST to `/v1/stripe/webhook` still lands on the Worker (400 `missing_signature` without a signature,
  no redirect). Checked in production without any charge: TLS on whyhumanoid.com and `/app/`; canonical
  `https://whyhumanoid.com/app/`; anonymous Deployments 10 of 119 rows with the lock; catalogue buttons point to
  `/app/` and `/app/#deployments`; old URL `/#integrators` lands on `/app/#integrators`; sign-in email from
  `premium@whyhumanoid.com` to `delivered@resend.dev` with link `https://whyhumanoid.com/app/#login=…`, redeemed with
  the click: `/v1/me` 200 without access, full rows 403, portal 409; Checkout live opened ("100,00 € por año") with
  cancel URL `https://whyhumanoid.com/app/?checkout=cancelled`, left without a card: "Checkout was cancelled. Nothing
  was charged."; 375 px without overflow; test account signed out. D1 after the checks: the same single entitlement,
  4 Stripe events, no new payment. Sessions live in the browser per origin, so a subscriber signs
  in once more at `whyhumanoid.com/app/`; the subscription is unchanged. Not tested by the agent: the portal and the
  success return for a paying account (verified locally; Javier can open "Manage subscription").
- 17 Nov, 13:10 to 13:35 Madrid: relations between Deployments, catalogue robots and companies (PR #26 `576e4e0`,
  follow-up PR #27 `6f9c75e`). Javier had confirmed, through Codex, that signing in at whyhumanoid.com/app/ works.
  Production D1: tables `relation_graphs` and `relation_config` created in the console from
  `migrations/0002_relations.sql`. Worker version `d231b0f5` (bundle sha256 `f61289ce…d948`, temporary commit
  `68eb721` on `deploy/worker-bundle-f4bd2db`): `GET /v1/relations` after the entitlement check, `GET
  /v1/relations/preview` from the 10 public rows only, and the import accepting the relations config. Import run
  `44082503677` from `main` (12:22 UTC): the 13 tabs identical to the previous import (Deployments 119), relations
  `ok` with config `c116b189b4aa6dbf`. Coverage (119 records): 69 linked to a catalogue robot (46 name its model, 23
  its model line with another or an unstated version), 41 only at the maker (13 model not disclosed, 22 a model with
  no catalogue record of its own, 6 maker outside the catalogue), 9 without a resolvable maker (7 not disclosed, 2
  several makers); 113 organisations linked by sheet id, 6 without one; 14 catalogue robots and 68 companies with
  records; 4 organisations recognised as their maker by exact name. Public preview: the 10 rows, all linked to
  robot 6 at model-line level. Checked in production without any charge or account change: as a visitor, robot,
  company and record links, the free-preview lock, records outside the preview refused, back, forward and reload,
  375 px; the free robot pages (`#r-agility-digit-5-in-development-6` with 4 deployments and 10 records, Figure 03
  with the "not evidence of no deployments" text); as a subscriber with Javier's existing session, read-only: robot 6
  (16 records), 30 (3, plus 8 maker-only records not attributed), 88 (24), 64 and 76 without records, BMW Group (12),
  Toyota as maker and organisation, a Figure 02 record not attributed to Figure 03. Webhook POST still 400
  `missing_signature`. The workers.dev page in the bundle predates #27; it only redirects to the app.
- 17 Nov, afternoon (Madrid): Darwin Robotics update (PR #32, import `44092011587`: Humanoids 134 public, Entities
  26; relations config `6bbf2dc8095cd81d`). Then global search and common tags (PR #34 `d86f432`, follow-ups #35 and
  #36). Production D1: table `search_docs` created in the console from `migrations/0003_search.sql`. Worker version
  `26cc1be4` (bundle sha256 `59436492…d882`, temporary commit `8a4f190` on `deploy/worker-bundle-f4bd2db`):
  `GET /v1/search` with the scope decided by the entitlement check, and the import rebuilding the index. Import run
  `44096182826` from `main`: the 13 tabs unchanged, relations `ok`, search 1,363 documents (full) and 264 (preview),
  0 unknown vocabulary values. Webhook POST still 400 `missing_signature`.
- Branch `deploy/worker-bundle-f4bd2db` (the temporary bundle used by the dashboard editor; public server code, no
  data) could not be deleted through the agent proxy: delete it in GitHub, Branches.

### Proposal, phase 2: API under whyhumanoid.com (not executed, needs Javier)

Today the page is on whyhumanoid.com and only the API calls go to `whyhumanoid-premium.javier-198.workers.dev`
(visible in the browser's network panel and the CSP). Putting the API on the same origin (`whyhumanoid.com/v1/*`)
and sending real security headers (CSP, HSTS, `frame-ancestors`) needs a Worker route, and Cloudflare only runs
routes and custom domains on zones whose DNS it serves. A subdomain such as `api.whyhumanoid.com` would need the same
zone move, so it is no shortcut. IONOS stays the registrar and the mail provider; only the nameservers change.

1. Cloudflare, Add a site `whyhumanoid.com`, Free plan; import and then check record by record against the inventory
   (IONOS panel, 16 Nov 2026), all of them DNS only (grey) at first:
   - A `@` 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 (GitHub Pages); CNAME `www`
     `integrarobot.github.io`.
   - Mail: MX `@` `mx00.ionos.es` and `mx01.ionos.es` (same priorities as IONOS); TXT `@`
     `v=spf1 include:_spf-eu.ionos.com ~all`; CNAME `s1-ionos._domainkey` `s1.dkim.ionos.com`,
     `s2-ionos._domainkey` `s2.dkim.ionos.com`, `s42582890._domainkey` `s42582890.dkim.ionos.com`; CNAME `_dmarc`
     `dmarc.ionos.es`; CNAME `autodiscover` `adsredir.ionos.info`; CNAME `_domainconnect` `_domainconnect.ionos.com`.
   - Resend: TXT `resend._domainkey` (current DKIM value), MX `send` `feedback-smtp.eu-west-1.amazonses.com` priority
     10, TXT `send` `v=spf1 include:amazonses.com ~all`.
   - TXT `@` `google-site-verification=…` (current value).
2. IONOS: check DNSSEC (if on, turn it off before the change and enable Cloudflare's DS afterwards); domain protection
   is on, so Javier confirms the nameserver change there with the two Cloudflare nameservers.
3. During propagation both sets of nameservers answer the same records, so the site and mail keep working. Checks:
   MX, SPF, DKIM and DMARC by `dig` against the Cloudflare nameservers before switching and after; Resend still
   Verified; a test email to an IONOS mailbox; GitHub Pages certificate still valid.
4. Only then, Worker route `whyhumanoid.com/v1/*` to `whyhumanoid-premium` (that hostname proxied, SSL Full
   (strict)), `wh-api` set to the same origin and `connect-src 'self'`, and headers for `/app/*` from the Worker or a
   Transform Rule. Keep `ALLOWED_ORIGINS` and the old URL redirect during the transition. The Stripe webhook stays on
   `workers.dev` until a test delivery to the new path is verified; then edit the endpoint URL in Stripe (the signing
   secret does not change), never redirect Stripe's POST.

Risk: a missed record breaks mail or verification; the inventory and the `dig` comparison before the switch cover it.
GitHub Pages behind a proxied hostname must keep renewing its certificate; if it does not, keep `@` DNS only and
route only through a proxied path on a dedicated hostname. The app's URL does not change in phase 2, so no new
sign-in is needed.

### Exposure of the open-database period

- Repository `integrarobot/whyhumanoid` is public. The commits from PR #4 (open database, 16 Nov 2026) to `bf785ce`
  hold `data/database/*.json`: every row of the 12 premium tabs. They stay reachable by commit and raw URLs, in clones
  and in the Pages artifacts of those builds. The full Humanoids catalogue (free anyway) is in older commits.
- whyhumanoid.com served the same files at `/data/database/<tab>.json` until the paywall merge; they now return 404.
  Search engines and web archives may hold copies; data already published cannot be made secret again.
- The master workbook and its April copy are readable by anyone with the link; the link is in newsletter drafts,
  decks and a course sheet. This is the largest open path to the full data until step 6.
- No history is rewritten or deleted (irreversible). Recommended, reversible: make this repository private (history
  kept, nothing deleted) and publish the site from a new public repository `integrarobot/whyhumanoid-site` that holds
  only the built files (`index.html`, `CNAME`, `assets/`, `data/humanoids-catalogue.*`, `data/manifest.json`,
  `data/preview/`), deployed from here by CI; or from Cloudflare once `whyhumanoid.com` moves to Cloudflare DNS (also
  needed for `premium.whyhumanoid.com`). GitHub Pages from a private repository needs a paid GitHub plan.
- From the paywall on, no full row reaches Git or the site: `tools/check-public.mjs` (rule 6), the export tests and
  CI refuse `data/database/` and any preview row past sheet row 10.

## Earlier deployment record (13 Nov 2026)

Status on 13 Nov 2026: the PR is open (step 1). The test Worker runs the current code (step 2) with its Stripe test
and Resend secrets; production runs older code with checkout off and no data. The Stripe products, prices and
webhook destinations exist in both modes (step 3). The access rule was verified on the test Worker with synthetic
data, since deleted. The first live staging import succeeded on 13 Nov 2026 (run 43496288531): all 13 tabs,
1,361 customer rows and 1 internal row, one snapshot. Signed-in checks passed on that data. Production runs the
same build (version `f208b4bd`) with checkout off and no data. Still to apply: Javier's production approvals
(section 6), the production import and checks, then go-live.

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
| Schema without Wrangler | D1 console: `migrations/0001_init.sql`, then `0002_relations.sql` (two relation tables) and `0003_search.sql` (`search_docs`, the global search index); all `CREATE TABLE IF NOT EXISTS`, safe to rerun. Apply each before deploying a Worker that uses it. | same |
| URL | `https://whyhumanoid-premium-test.<account>.workers.dev` (fill `ALLOWED_ORIGINS`, `PREMIUM_URL`) | app `https://whyhumanoid.com/app/` (GitHub Pages), API `https://whyhumanoid-premium.javier-198.workers.dev` |
| `STRIPE_MODE` | `test` | `live` |
| `CHECKOUT_ENABLED` | `true` after step 3 passes | `false` until Javier enables it |
| `ALLOW_LIVE_CHECKOUT` | `false` | `true` only when Javier enables live checkout |
| `STRIPE_PRICE_ID` | test-mode price id | live-mode price id |

Test environment, applied on 13 Nov 2026 through the Cloudflare dashboard (no Wrangler token was created):

- D1 `whyhumanoid-premium-test`, id `4cadeb6e-56ca-48e9-9adf-e666c4d2befd`, schema from `migrations/0001_init.sql`
  applied in the D1 console (8 tables).
- Worker `whyhumanoid-premium-test` at `https://whyhumanoid-premium-test.javier-198.workers.dev`, binding `DB` to
  that database, plain-text variables as in `[env.test.vars]`. The code is `dist/worker.dashboard.js` built from
  commit `872dbe8` and pasted into the dashboard editor (version `4c649512`), with `IMPORT_ENVIRONMENT=test`.
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
- Signed-in checks on the imported data (13 Nov 2026, synthetic account, session and entitlement, deleted
  afterwards): without an entitlement every tab's preview stays public and full data, rows past 10, search, API
  keys and task plan return 403; with one, each of the 13 tabs returns exactly its imported customer row count from
  one snapshot (the internal Humanoids row is never returned), all 134 Humanoids records carry fuller values than
  the public ones, search 200, an agent key reads past row 10 (200); logout then 401.

Production environment, created on 13 Nov 2026 the same way, checkout off:

- D1 `whyhumanoid-premium`, EU jurisdiction, id `ba8ed181-22c6-40d4-b77d-f4bcbf238274`, same schema.
- Worker `whyhumanoid-premium` at `https://whyhumanoid-premium.javier-198.workers.dev`, binding `DB`, variables as in
  `[env.production.vars]` (`IMPORT_ENVIRONMENT=production`, checkout and live checkout `false`), the `WORKBOOK_ID`
  secret, no cron. Since 13 Nov 2026 it runs the verified staging build (bundle sha256 `60bf11d7…dd35`, commit
  `872dbe8`), version `f208b4bd`; the previous verified build ran as `94b763d3`. Verified then: `/health` 200; 13 datasets, every preview 0 rows; full data, rows
  past 10, search, `/v1/me`, checkout, API keys, task plan and admin import 401; plan €100 per year, checkout not
  available; webhook 503 until its secret exists. Since 17 Nov 2026 the app page is `https://whyhumanoid.com/app/`
  (`PREMIUM_APP_URL` in `tools/build-site.mjs`, `app/` built by `tools/build-app.mjs`); this URL serves the API and
  redirects its old page there.

To redeploy from the dashboard: `node server/scripts/build-dashboard.mjs <esbuild>` (esbuild 0.27.7), then replace
`worker.js` in Edit code and Deploy. `wrangler deploy --env test` with a token Javier creates also works and uses
the same settings, because `[env.test]` matches the dashboard.

`premium.whyhumanoid.com` as a Workers custom domain requires the `whyhumanoid.com` zone on Cloudflare: change the
nameservers at IONOS (registrar stays IONOS) after copying every existing record (GitHub Pages A records for `@`,
`www` CNAME to `integrarobot.github.io`, MX, SPF, DKIM, DMARC, Google verification). Until then, the API runs on
its `workers.dev` URL and the app on `whyhumanoid.com/app/`; the exact plan is "Proposal, phase 2" in section 0.

Secrets, per environment (`wrangler secret put NAME --env test|production`, or in the dashboard: Worker, Settings,
Variables and secrets, Add, type Secret). On the test Worker, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`RESEND_API_KEY` and `WORKBOOK_ID` are set:

| Secret | Test | Production |
|---|---|---|
| `STRIPE_SECRET_KEY` | restricted test key `rk_test_...` (write: Checkout Sessions, Customer portal; read: Prices) | restricted live key `rk_live_...`, same permissions |
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
   rejects the exchange ("rejected by the attribute condition"). Applied for staging on 13 Nov 2026: the provider
   condition accepts the numeric-id subject for this repository, workflow and branch, and maps it to the existing
   staging principal, so the binding was unchanged. The equivalent change with a new binding:

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

   For production (prepared 13 Nov 2026, to be applied by Javier or Codex): keep the attribute mapping and replace
   the condition with

   ```
   assertion.repository_id == '1456468940' && (
     (assertion.workflow_ref == 'integrarobot/whyhumanoid/.github/workflows/import-workbook.yml@refs/heads/feat/premium-preview'
       && assertion.sub == 'repo:integrarobot@282541415/whyhumanoid@1456468940:environment:test') ||
     (assertion.workflow_ref == 'integrarobot/whyhumanoid/.github/workflows/import-workbook.yml@refs/heads/main'
       && assertion.sub in ['repo:integrarobot@282541415/whyhumanoid@1456468940:environment:test',
                            'repo:integrarobot@282541415/whyhumanoid@1456468940:environment:production']))
   ```

   then grant `roles/iam.workloadIdentityUser` on `whyhumanoid-importer` to
   `principal://iam.googleapis.com/projects/186224274362/locations/global/workloadIdentityPools/why-humanoid-github/subject/repo:integrarobot@282541415/whyhumanoid@1456468940:environment:production`.
   The GitHub `production` environment exists (deployment branches: `main` only; variable
   `GOOGLE_WORKLOAD_IDENTITY_PROVIDER`).
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
   keeps the last snapshot. An import makes about 8 D1 calls whatever its size: a Worker invocation allows about
   1,000, and the first attempt stopped there when identity registration made two calls per row.

   Staging re-import after the duplicate-row fix (run 43507989819, snapshot 2026-11-13T21:08:39Z): humanoids 133
   (plus 2 internal: the Genesis duplicate at sheet row 38 and the editorial resource), the other 12 tabs unchanged.
   The free catalogue equals that preview: 133 records, same order, no field differences.

   First staging import, 13 Nov 2026, customer rows per tab: humanoids 134 (plus 1 internal), deployments 119,
   integrators 7, evidence-links 15, task-evaluations 4, container-handling 22, entities 24, stocks 276,
   software 144, datasets 28, hardware 11, other-robots 547, data-space 30; 39 warnings. Public previews: all
   134 Humanoids records; 10 rows elsewhere (fewer where the tab is shorter; Software and Other robots show the
   first 10 sheet rows, which hold two side-by-side lists, so 19 and 20 entries). Full data, rows past 10 and
   search return 401 without a session.
3. Resend: verify `whyhumanoid.com` as a sending domain (DNS records at the DNS host) and use
   `premium@whyhumanoid.com` as sender (the Worker's default `EMAIL_FROM`). The domain exists in Resend
   (eu-west-1, status Not Started). Records, all on subdomains, so the root MX and SPF stay untouched: TXT
   `resend._domainkey` (DKIM public key shown in Resend), MX `send` `feedback-smtp.eu-west-1.amazonses.com`
   priority 10, TXT `send` `v=spf1 include:amazonses.com ~all`. Resend's "IONOS Auto configure" adds them after
   Javier approves in IONOS. Then a sending key restricted to `whyhumanoid.com` goes into the production Worker as
   the `RESEND_API_KEY` secret.

## 5. Close the workbook bypass

After step 4.2 succeeds, set the workbook's General access to Restricted (Share, General access, Restricted).
Named editors keep access; the service account keeps Viewer. Then repeat, without a Google session, the
anonymous gviz CSV request for `sheet=Deployments` used in the 13 Nov audit: it must return a sign-in page, not rows.

## 6. Production approvals for Javier (prepared 13 Nov 2026)

Each screen is open in Chrome and stops before the action. Order matters only where noted.

1. Google, provider `github-actions`: replace the attribute condition with the production version in 4.1, Save.
2. Google, service account `whyhumanoid-importer`, Permissions, Grant access: the production principal in 4.1,
   role Workload Identity User, Save.
3. Done 13 Nov 2026 with Javier's approval: PR #2 merged (`0bb37c6`, only the dispatch-only workflow on `main`).
   After 1 and 2: Actions, Import private workbook, Run workflow, branch `main`, target `production`.
4. Resend, `whyhumanoid.com`: IONOS Auto configure, approve in IONOS, then Verify DNS records.
5. Resend, API keys: create a sending key for `whyhumanoid.com`; Cloudflare `whyhumanoid-premium`, Settings,
   Variables and secrets, Add, type Secret, `RESEND_API_KEY`.
6. Stripe live, Desarrolladores, Claves de API, Crear clave restringida: write Checkout Sessions, read Prices;
   Cloudflare secret `STRIPE_SECRET_KEY` on `whyhumanoid-premium`.
7. Stripe live, webhook `we_1UbOuzAcMngkWs5CyMeDbKN3`: reveal the signing secret; Cloudflare secret
   `STRIPE_WEBHOOK_SECRET` on `whyhumanoid-premium`.

After 1 to 7, the production checks: import counts for all 13 tabs, previews and 401/403/200 boundaries, a
sign-in email delivered from `premium@whyhumanoid.com` and redeemed, the live price check (one unpaid Checkout
session, no charge), and the workbook restricted with the anonymous link returning no data. Only then: live
checkout on and PR #1 merged.

## 7. x402 pay-per-query: activation (prepared 24 Nov 2026)

State (25 Nov 2026): the code is in pull request #93, reconciled with main (report orders, outbox cron, agent access);
it is NOT merged and nothing is deployed. Once merged it ships with every gate closed (`X402_ENABLED=false` in both
environments, `X402_LIVE_OPEN=false` in code): the route answers `503` and advertises no payment.

Approved pilot (Javier, 25 Nov 2026): USD 0.10 per deployment-evidence query, at most 10 cases and 50 records, with
claims, status, metrics, dates and sources; the full operational detail stays in the US$100/year subscription. The
price is set (`X402_PRICE_USD = "0.10"`) only when the pilot is activated, after the tests below.
Completion needs, verified separately: deployment, a real payment, Bazaar indexation and the Agentic Market listing.
A 402 response alone is not completion.

What exists:
- `GET /v1/x402` (free description) and `GET /v1/x402/deployment-evidence` (paid), server/src/x402/.
- Migration `server/migrations/0006_x402_payments.sql` (new table, additive; numbered after the report orders
  migrations 0004 and 0005; must be applied before enabling).
- Worker bundle with the official x402 server, the Bazaar extension and the CDP facilitator auth (about 1 MB minified).
  It imports Node's `url`, which the `nodejs_compat` flag provides: the Worker must keep `nodejs_compat`.

What is missing, and who provides it:
1. Javier: price approved (USD 0.10, 25 Nov 2026); activation only after the required tests.
2. Stripe: approval of the Spanish account for machine payments / x402 (requested by Codex on 24 Nov 2026 through
   Stripe's machine-payments channel; no reply as of 25 Nov 2026). Stripe's guide requires approval outside the US and
   the CDP facilitator on mainnet; sandbox uses Base Sepolia and the public test facilitator. Without approval there is
   no live deposit address.
3. Stripe sandbox: done on 25 Nov 2026. The deposit address `0x3b0b371ae3cb08f272b87319684f6518b3b313a0` (Base, USDC)
   was created with `Stripe-Version: 2026-07-29.preview` (request `req_s5ovPJs4F2ipkd`; evidence in
   `ops/x402/stripe-sandbox-2026-11-25.json`). It is the TEST `X402_PAY_TO` in `server/wrangler.toml`, with
   `X402_PRICE_USD=0.10` and `X402_STRIPE_API_VERSION=2026-07-29.preview`. Still to confirm: the PaymentIntent
   recording (`recordCryptoPayment`) with a real Base Sepolia transaction; `X402_STRIPE_RECORDING` stays false until then.
4. Codex (Cloudflare): apply migration 0006 to the test and production D1, deploy the Worker bundle, and for production
   the secrets `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` (CDP facilitator; never in Git).
5. Testnet payment: a test wallet with Base Sepolia USDC to pay once through the x402.org facilitator. No wallet is
   created by the agents; Javier or Codex decides who holds it.

Order:
1. Test: migration 0006, deploy, set test vars (`X402_ENABLED=true`, `X402_PAY_TO`, `X402_PRICE_USD=0.10`), check
   `GET /v1/x402` says `available`, pay once on Base Sepolia, confirm the row in `x402_payments` and, with recording
   on, the PaymentIntent in the Stripe sandbox.
2. Production, after Stripe's approval and the test above: set `X402_LIVE_OPEN = true` in code (PR), deploy, set the live
   vars and CDP secrets, make one real paid request (Javier's decision; real funds), then check Bazaar with the
   merchant lookup `GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/merchant?payTo=<address>`
   (CDP API reference, "Get merchant resources by payTo address"). Confirm in its answer the exact resource URL
   the 402 advertises (API origin + `/v1/x402/deployment-evidence`, today
   `https://whyhumanoid-premium.javier-198.workers.dev/v1/x402/deployment-evidence`), the price (USD 0.10, 100000 USDC
   atomic units), the network (Base, `eip155:8453`) and our `payTo`. Then check Agentic Market separately.
   Do not use `GET .../x402/discovery/resources?payTo=...`: that endpoint documents only `type`, `limit` and `offset`,
   may return the unfiltered catalogue, and is no proof of our indexation.

Operating it:
- Unknown settlement outcomes (`status=unknown`) need an operator. List them with `GET /v1/admin/x402/payments` and
  resolve each one from the chain or the Stripe deposit record with `POST /v1/admin/x402/payments/<key>/resolve`
  (README, x402 section). Never settle again by hand and never re-bill.
- The scheduled job marks settlements stuck for more than 3 minutes as unknown, and clears stored paid answers after
  their 24-hour replay window.

Unknowns to confirm against Stripe's documentation before production:
- whether the CDP facilitator settles to a Stripe deposit address unchanged;
- the PaymentIntent parameters for recording;
- the preview API version (2026-05-27.preview in the guide, 2026-07-29.preview in the sandbox example): unresolved
  until checked against the actual sandbox API.
- A synthetic payment or a 402 response is not Bazaar or Agentic Market indexation; that is checked separately after a
  real settled payment.
