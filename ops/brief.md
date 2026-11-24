# Why Humanoid? implementation brief

Updated: 24 Nov 2026 (Claude Code, branch `claude/stoic-maxwell-432hsy`). The offer in force is the section
"Two-path offer and complete public listings (Javier, 24 Nov 2026)"; dated sections before it are history. Decides: Javier. Builds and publishes the
website: Claude. Coordinates and verifies: Codex. Content research and enrichment: Grok.

This brief carries the current requirements in the repository, because the project wiki
(`wiki/proyecto/cola-claude.md` in Javier's local folder) is not reachable from cloud sessions. When the two differ,
Javier's latest instruction wins; record it here.

## Sources of truth

- Master workbook: Google Sheets file "Why Humanoid?" (same file id as before; link only in private channels, never
  in Git or on the site). Partly translated to English on 20 Nov 2026 (see the baseline). Sheet titles on 23 Nov 2026
  (Codex, title-only renames, same sheets and gids): Hardware is now Components, Stocks is now Investment; the
  native tables keep their names (HardwareCatalog, StocksCatalog). Dataset ids in code stay `hardware` and `stocks`.
- Repository: `integrarobot/whyhumanoid` (not `why-humanoid`). GitHub Pages serves `main` at https://whyhumanoid.com.
- Backend: Cloudflare Worker `whyhumanoid-premium` (production, Stripe live) and `whyhumanoid-premium-test` (test,
  Stripe test mode), each with its own D1. Deploys need Javier's Cloudflare access (no token in agent sessions).
- No new work in "Espacio de datos robótica" / Data space.

## Commercial decision (Javier, 23 Nov 2026)

Supersedes the 10-row paywall of 16 Nov 2026 (d-0008). Itself superseded on 24 Nov 2026 by the two-path offer below
(US$100 per year, public summaries of every case and product, reports at US$1,000 not orderable).

- Humanoids: entirely free.
- One subscription, EUR 100 per year, unlocks both complete Deployments and complete Components.
- Every other content category: free for now.
- Two services at EUR 1,000 each, not included in the subscription: a humanoid adoption assessment (with
  Deployments) and a component-manufacturing study (with Components). Names are proposals. Service automation is a
  later milestone.
- Premium previews, tax presentation and purchase terms need a concrete review before new live sales are enabled.
  Existing customer contracts are not changed; tests never make real charges.

Code: `server/src/access/matrix.js` is the only place that decides access. The Worker, the exporters, search, the
page generator and the catalogue page read it.

## Categories (nine confirmed by Javier in this order, plus Reports added on 23 Nov 2026)

| # | Category | URL | Workbook tab | Access | Gap |
|---|---|---|---|---|---|
| 1 | Humanoids | /humanoids/ | Humanoids | Free | |
| 2 | Deployments | /deployments/ | Deployments (+ Evidence Relations, Clean Entities as supporting tabs) | Subscription; every case public at its public fields (fields.js), detail paid | |
| 3 | Components | /components/ | Components (renamed from Hardware on 23 Nov 2026; dataset id `hardware`) | Subscription; every product public at its public fields, full passport paid | Sparse directory (23 Nov; 19 products since the native table): 11 entries with name, link and, in the live master, an English description each; no component-maker capability data |
| 4 | Integrators | /integrators/ | Integrators | Free | 7 rows |
| 5 | Software | /software/ | Software | Free | |
| 6 | Datasets | /datasets/ | Datasets | Free | |
| 7 | Benchmarks | /benchmarks/ | Task Evaluation | Free | No dedicated benchmarks table: 4 task evaluations |
| 8 | Investment | /investment/ | Investment (renamed from Stocks on 23 Nov 2026; dataset id `stocks`) + Valuation, Investors, Rounds of Humanoids | Free (quote columns withheld for licensing) | No private-investment table; descriptions and segments still in Spanish in the master |
| 9 | Other Robots | /other-robots/ | Other Robots | Free | |
| 10 | Reports | /reports/ | Reports tab of the master (not imported into D1) plus the reviewed mapping `tools/reports-findings.json`, published as `data/reports/atlas.json`; Why Humanoid? analyses (`/reports/deployment-records/`) | Free | Research Conclusions Atlas: 12 editions, 151 findings, 116 checked against 10 originals; Morgan Stanley and Intel originals unreachable |

Tabs outside the nine: Product - Container Handling and Data Space (out of the offer; counted, not listed, since
24 Nov 2026).

Entity URLs: `/humanoids/<slug>/` (old `/robots/<slug>/` redirect), `/other-robots/<slug>/`, `/companies/<slug>/`
(one canonical page per company across categories). Stable addresses live in `tools/permalinks.json`
(append-only); renamed entries redirect.

## Baseline found on 23 Nov 2026

- `main` at #57 (18 Nov). No open PRs. The stopped claude.ai chat left no commits after #57.
- Production site: hash sections on `/` (`#humanoids`, `#database`, `#db-<tab>`), `/robots/<slug>/` (134),
  `/companies/<slug>/` (181), `/reports/deployment-records/`, `/method/`, `/app/`. `/humanoids`, `/deployments/` and
  the other category paths answered 404.
- Production API: Stripe live checkout open (`checkout_available: true`) under the old plan "Why Humanoid? full
  database, all 13 datasets". At least one live subscription exists; account data stays out of the repository.
- Production data: last import 17 Nov 2026 22:16 UTC (Humanoids 134, Deployments 130, Other Robots 547, Stocks 276).
- Master workbook, last modified 20 Nov 2026 11:08 UTC: Humanoids 217 rows (215 public), Deployments 184, Software 128
  rows (146 entries), Other Robots 488 rows (559 entries), Datasets 29, Clean Entities 32. Four tabs were renamed and
  many values are in English, but not all: on 23 Nov the live master still has Spanish in Investment (DESCRIPTION
  276 rows, SEGMENT about 260), Integrators (DESCRIPTION 6), Clean Entities notes and some Humanoids and Deployments
  fields (`tools/check-workbook.mjs` lists them). Components has an English description for all 11 entries in the
  master (the published 17 Nov snapshot has none). The importer on `main` rejects this workbook (tab titles). Fixed on
  the branch; `tools/check-workbook.mjs --from <export>` passes on the master of 23 Nov 2026 after the two renames.
- HIRO Industries Origin: one master row (Humanoids row 140), no duplicate; not published (it arrived after the 17
  Nov import).
- A content refresh is not mechanical: two published robots were renamed in the master (Kepler "Forerunner" to
  "Forerunner K1", Xpeng "Iron" to "Next-Gen IRON"), and `tools/sync-humanoids.mjs` stops for review. Other Robots
  row 26 "Agilex" links to agile-robots.com (likely a content error for Grok).

## Milestone 1 (branch `claude/stoic-maxwell-432hsy`)

Done on the branch, on the published 17 Nov snapshot:

- Access matrix and API: free categories readable by anyone through `GET /v1/datasets/{id}` with public values;
  Deployments and Components 401 without a session, 403 without an active subscription; `GET /v1/access`.
- Importer accepts the 20 Nov workbook (current and former tab names).
- Nine category pages, nine-category navigation on every page and on the home page, `/subscribe/` with the two
  services as proposals, 547 Other Robots pages, 459 company pages (robot makers, organisations in records, listed
  companies, integrators and the companies of the public Components entries), redirects for `/robots/`, sitemap of
  1,154 URLs.
- Wording on the site, app and method: the subscription covers Deployments and Components; Components is described
  as what it is today, a sparse hardware directory, not yet a directory of component makers and their capabilities.
- New live sales of the new offer closed in code (`LIVE_SALES_OPEN = false`) until its terms are final; Stripe test
  mode, existing subscriptions and the portal unaffected. Search applies the matrix at query time as well.
- Staging for the dashboard path: `server/scripts/staging-entry.js` (test Worker only).

Not done: hosted staging on Cloudflare (Javier deploys; agents hold no Cloudflare credential), the sandbox purchase
through Stripe test Checkout, the content refresh to the 20 Nov workbook, live billing changes. The milestone is not
complete until hosted staging is verified.

### Deployment paths (checked on 23 Nov 2026)

No workflow deploys a Worker. `ci.yml` only tests; `import-workbook.yml` authenticates with GitHub OIDC and Google
Workload Identity (repository variable `GOOGLE_WORKLOAD_IDENTITY_PROVIDER`; no secret is referenced) and calls
`POST /v1/admin/import` on the Worker of the chosen environment. Agent sessions hold no Cloudflare credential and must
not request one (Codex, 23 Nov 2026). The authorised path is the Cloudflare dashboard, operated by Javier or Codex
from the Mac, as for every earlier Worker deploy. Wrangler with Javier's own login is an equivalent alternative.

State found on 23 Nov 2026: the test Worker runs the 13 Nov build (no `/v1/search`, `/v1/relations`, `/v1/access`),
so its D1 most likely lacks migrations 0002 and 0003. The production Worker runs the 17 Nov build.

### Runbook: hosted staging on the test Worker (dashboard)

Artifacts are pinned in the branch at the commit named in the PR (folder `server/dist/`, removed again before merge)
and are reproducible with `node server/scripts/build-dashboard.mjs [--staging] <esbuild 0.27.7>`; check the sha256
the PR states before pasting.

1. D1, database `whyhumanoid-premium-test`, Console: paste `server/migrations/0002_relations.sql`, run; paste
   `server/migrations/0003_search.sql`, run (both are `CREATE TABLE IF NOT EXISTS`).
2. Workers, `whyhumanoid-premium-test`, Edit code: replace the whole script with `server/dist/worker.staging.js`,
   Deploy. It is the regular API plus the public site of one commit, read from this public repository.
3. Same Worker, Settings, Variables and secrets, plain-text variables (leave every secret as it is):
   `STAGING_SITE_COMMIT` = the full commit id the PR states; `PREMIUM_URL` =
   `https://whyhumanoid-premium-test.javier-198.workers.dev/app/`; check `STRIPE_MODE=test`,
   `CHECKOUT_ENABLED=true`, `IMPORT_ENVIRONMENT=test`, `ALLOWED_ORIGINS` =
   `https://whyhumanoid-premium-test.javier-198.workers.dev`. Deploy.
4. Tell the Claude session. It runs "Import private workbook" from `main` with target `test` (imports the master as it
   is now into the test D1 only) and `node tools/verify-staging.mjs --base https://whyhumanoid-premium-test.javier-198.workers.dev`.
5. Sandbox purchase by a person, Stripe test mode only, at https://whyhumanoid-premium-test.javier-198.workers.dev/app/:
   sign in with an address the test sender can deliver to (the test Worker sends from Resend's test sender, which
   reaches only the Resend account owner), subscribe with card 4242 4242 4242 4242 (any future date, any CVC), back in
   the app check "Active" and that complete Deployments and Components open; in Stripe (test mode) Developers,
   Webhooks, check the deliveries for that session answered 200; cancel in the billing portal and check access stays
   until the period end. Report the test session id, never card data.

Staging serves the 23 Nov master through its API (test D1) but the 17 Nov public snapshot as its site files: counts
differ between them on purpose. Staging is noindex and carries a banner; it is a review copy, not a publication.

### Runbook: release after staging is verified

Order, compatible in both directions: the new API accepts the old site and the new site works with the old API.

1. Production API first (dashboard, Workers, `whyhumanoid-premium`, Edit code): replace the script with
   `server/dist/worker.dashboard.js` from the same commit, Deploy. Do not change variables or secrets. New live sales
   stay closed in code (`LIVE_SALES_OPEN = false`: checkout answers 503 `offer_in_review`); existing subscriptions,
   renewals, the webhook and the billing portal keep working.
2. Do NOT run a production import: the 20 Nov master has unreviewed changes (renamed robots, new rows); production D1
   keeps the 17 Nov data until the content review. Production D1 already has migrations 0002 and 0003.
3. Merge PR #58 (squash) after the pinned bundles are removed; GitHub Pages publishes the site.
4. Checks: `node tools/verify-staging.mjs --base https://whyhumanoid.com` (routes, reloads, mobile, old links, sitemap,
   exposure); `/v1/access` 200; `/v1/billing/plan` shows the new plan with `checkout_available: false`;
   `/v1/datasets/hardware` 401 and `/v1/datasets/stocks` 200 without a session; an existing subscriber still sees
   "Active" and complete Deployments (a person checks with their own session; no account data is written down).
5. Closing record in `main`.

Opening live sales later is one change (`LIVE_SALES_OPEN = true`) after Javier settles the Stripe live product name,
tax presentation and purchase terms.

### Evidence, by kind

| Kind | Status |
|---|---|
| API tests over synthetic fixtures (93) and every CI step | Passed locally; CI green on the PR |
| Local staging: built bundle, real API code, synthetic data, simulated signed test-mode events (`verify-staging --local`) | Passed |
| Dashboard bundles: build from the branch and Node smoke test (site from a mocked pinned commit, API routes, live refusal) | Passed |
| Hosted staging on the test Worker, test import, `verify-staging` against it | Not done: waits for the dashboard runbook |
| Sandbox purchase through Stripe test Checkout and the test webhook | Not done: needs hosted staging and a person |
| Production | Unchanged |

### Local staging (no credentials)

```sh
node tools/build-staging.mjs --origin http://localhost:8788
node server/scripts/staging-local.mjs
node tools/verify-staging.mjs --base http://localhost:8788 --local --shots /tmp/shots
```

## Reports: Research Conclusions Atlas (Javier, 24 Nov 2026)

Source: the Reports tab of the master (ReportsCatalog, 21 columns, RPT-001 to RPT-012), an automatic extraction marked
for review. It is read, never edited, and not imported into the backend. The reviewed mapping
`tools/reports-findings.json` turns it into 151 normalised findings, each citing its master cell (report id, column and an
excerpt that must be literally in that cell) and, when checked, the page of the public original and a phrase of at most
30 words found there.

- Snapshot: `node --no-warnings tools/export-reports.mjs --from <export> --exported-at <ISO> [--originals <dir>]` writes
  `data/reports/atlas.json` (allowlisted fields only; `server/src/reports/atlas.js` holds the contract and the rules).
  With `--originals` (private text of the originals, outside Git) every checked phrase is checked on its page. CI runs
  `--check`, the public data guard and `tools/test-reports.mjs` (semantic invariants on the data and the rendered page).
- Rules: only checked findings are drawn; a figure repeated by several reports is one original estimate (series, year
  and kind) drawn once; shipments, installed base, revenue and wider opportunities are separate; every percentage keeps
  its denominator; surveys are answers, not adoption; BOM, production cost, selling price, list price and cost per
  hour are marked apart; stacks only when exhaustive; flows and valuations apart; constraint mentions are not ranked;
  nothing averaged, interpolated, converted or extended to a common year. The ambiguous Morgan Stanley China figures
  are withheld.
- Pages: `/reports/` (themes, coverage matrix, seven theme workspaces with charts and a cited synthesis, all findings,
  report cards, method; state in `?theme`, `?report`, `?check`, `?kind`, `?f`) and one page per report with every
  passport (`#f-<id>`). `/reports/deployment-records/` and `/reports/anthropic-what-work-can-robots-do-2026/` keep
  their addresses; the permanent-address registry is keyed by `page_id`.
- Originals checked on 24 Nov 2026: 10 of 12. Morgan Stanley (adviser-hosted copy) and Intel (blocked) could not be
  reached; their findings are listed as extracted and not drawn.

## Decisions pending (Javier)

1. Components content: today a sparse hardware directory (11 entries: name, link and, in the live master, a short
   English description), not the component-maker capability directory the offer implies. Selling it needs real component data (a
   schema in the master, filled by Grok) or a change to what the subscription promises. Making it premium also hides
   1 entry that was public until now.
2. Resolved 24 Nov 2026: every case and product is public at its public fields; the detail is paid.
3. Live billing: resolved 24 Nov 2026 except tax. Products renamed "Why Humanoid? Deployments and Components",
   USD 100 / year prices live and test, new live sales open. Still Javier's decision, with his tax adviser: whether
   the subscription must charge VAT (for example to EU consumers of digital services, through OSS) and how prices
   show it. Today checkout computes and collects no tax; nothing has been reviewed legally or in Stripe Tax.
4. Existing subscribers: keep full access to what stays premium (current code does this; nothing else changes).
5. Container Handling tab: counted, not listed, since 24 Nov 2026; making it public with Benchmarks is still open.
6. Reports (Robot integration diagnostic, Industrial diversification report, US$1,000 each): named and shown, not
   orderable. Order flow, payment and delivery terms are a separate decision.
7. Content refresh to the 20 Nov workbook (Humanoids 215, Deployments 184): who reviews the two renamed robots and
   the new rows before publication.

## Next milestones

2. Content refresh from the 20 Nov workbook and live verification of the staging.
3. Live billing switch for the new offer: done 24 Nov 2026 (tax treatment pending, decision 3).
4. Service purchase and delivery flow.

## Two-path offer and complete public listings (Javier, 24 Nov 2026)

- Two paths, in English, at the top of the home page and on Deployments, Components and /subscribe/
  (tools/offer-view.mjs, tools/build-site.mjs):
  - Full data access: US$100 per year, billed annually, no free trial.
  - Custom company reports: Robot integration diagnostic and Industrial diversification report, US$1,000 each,
    separate from the subscription and not available to order (no form, checkout or delivery promise).
- Field contract: server/src/access/fields.js holds the public and paid fields of every subscription tab. It is
  applied by the importer (`preview_data` for every row), the API's public rows, the visitor search and its snippets,
  the public relations graph, data/preview/, the pages and the app. Claim-to-evidence links and the tabs outside the
  offer are counted, not listed.
- Deployments: all cases public, grouped by deployment id (server/src/public/cases.js), with filters, adoption views and
  one page per case (/deployments/<slug>/, registered in tools/permalinks.json).
- Components: every product public as a summary. Paid fields say "With the subscription", and the full passport loads
  for subscribers from the API.
- Billing: the plan is USD 10000 per year (pricing.js). EUR subscriptions keep their price; their ids are in
  STRIPE_LEGACY_PRICE_IDS, so the webhook still applies their renewals and cancellations. Live prices: USD
  price_1UfGNgAcMngkWs5CkdCMYC1j, legacy EUR price_1UbOtjAcMngkWs5CR8qXNPGn (server/wrangler.toml).
- New live sales opened on 24 Nov 2026 (LIVE_SALES_OPEN = true) after the format was published and verified, the
  production import ran and the live USD price was configured; test-mode checkout verified with the USD test price.
  Production Worker version b3fda34c (bundle a0727faf…dbe8, main 33fae3c) runs it: `/v1/billing/plan` reports
  `checkout_available: true`. Checkout computes and collects no
  tax (no Stripe Tax, no address or tax ID): the charge is the price. Custom company reports stay not orderable.
- Private leak check before publishing: `node --no-warnings tools/check-reserved.mjs --from <export>` (paid values of
  Deployments and Components never in published files).

## Integrators: provider catalogue (Javier, 24 Nov 2026)

- Source: the Integrators tab of the master (native table IntegratorsCatalog, 28 providers, 26 columns), keyed by
  PROVIDER ID. It supersedes the 7-row, 3-field directory; the hidden dated archive tabs are history and never read.
- Free in full: /integrators/ (directory with filters, capability comparison, named projects, overview, method) and
  one profile per provider on its company page. No subscription, no report order, no change to billing.
- Counting: 24 humanoid-specific providers (explicit humanoid work or offering, not validated production integrators);
  CA3 is a requested specialist exception (simulated tests only); Bumerania, Amerevo and RH Bots have unconfirmed
  humanoid scope. Novares Seseña is one shared project (Innov8 integration, Bleu Robotics software).
- Code: server/src/integrators/catalogue.js (import contract and vocabularies), tools/integrators-review.json (reviewed
  evidence groups and projects, each citing its cell), tools/export-integrators.mjs (data/integrators/atlas.json),
  tools/integrators-view.mjs, assets/integrators.{css,js}. Checks: tools/test-integrators.mjs (CI) and
  tools/verify-integrators.mjs (browser, local or production, with --api for backend freshness).
- The Worker must run this code before the next production import: the old Worker rejects the new Integrators header.
