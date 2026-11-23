# Why Humanoid? implementation brief

Updated: 23 Nov 2026 (Claude Code, branch `claude/stoic-maxwell-432hsy`). Decides: Javier. Builds and publishes the
website: Claude. Coordinates and verifies: Codex. Content research and enrichment: Grok.

This brief carries the current requirements in the repository, because the project wiki
(`wiki/proyecto/cola-claude.md` in Javier's local folder) is not reachable from cloud sessions. When the two differ,
Javier's latest instruction wins; record it here.

## Sources of truth

- Master workbook: Google Sheets file "Why Humanoid?" (same file id as before; link only in private channels, never
  in Git or on the site). Translated to English on 20 Nov 2026.
- Repository: `integrarobot/whyhumanoid` (not `why-humanoid`). GitHub Pages serves `main` at https://whyhumanoid.com.
- Backend: Cloudflare Worker `whyhumanoid-premium` (production, Stripe live) and `whyhumanoid-premium-test` (test,
  Stripe test mode), each with its own D1. Deploys need Javier's Cloudflare access (no token in agent sessions).
- No new work in "Espacio de datos robótica" / Data space.

## Commercial decision (Javier, 23 Nov 2026)

Supersedes the 10-row paywall of 16 Nov 2026 (d-0008) and the USD pricing.

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

## Confirmed categories (order and labels confirmed by Javier)

| # | Category | URL | Workbook tab | Access | Gap |
|---|---|---|---|---|---|
| 1 | Humanoids | /humanoids/ | Humanoids | Free | |
| 2 | Deployments | /deployments/ | Deployments (+ Evidence Relations, Clean Entities as supporting tabs) | Subscription; first 10 rows public, plus counts and summaries | |
| 3 | Components | /components/ | Hardware | Subscription; first 10 rows public | No dedicated components table: 11 rows, name, link and description only |
| 4 | Integrators | /integrators/ | Integrators | Free | 7 rows |
| 5 | Software | /software/ | Software | Free | |
| 6 | Datasets | /datasets/ | Datasets | Free | |
| 7 | Benchmarks | /benchmarks/ | Task Evaluation | Free | No dedicated benchmarks table: 4 task evaluations |
| 8 | Investment | /investment/ | Stocks (+ Valuation, Investors, Rounds of Humanoids) | Free (quote columns withheld for licensing) | No private-investment table |
| 9 | Other Robots | /other-robots/ | Other Robots | Free | |

Tabs outside the nine: Product - Container Handling (first 10 rows public, unchanged pending a decision) and Data
Space (out of the offer, unchanged).

Entity URLs: `/humanoids/<slug>/` (old `/robots/<slug>/` redirect), `/other-robots/<slug>/`, `/companies/<slug>/`
(one canonical page per company across categories). Stable addresses live in `tools/permalinks.json`
(append-only); renamed entries redirect.

## Baseline found on 23 Nov 2026

- `main` at #57 (18 Nov). No open PRs. The stopped claude.ai chat left no commits after #57.
- Production site: hash sections on `/` (`#humanoids`, `#database`, `#db-<tab>`), `/robots/<slug>/` (134),
  `/companies/<slug>/` (181), `/reports/deployment-records/`, `/method/`, `/app/`. `/humanoids`, `/deployments/` and
  the other category paths answered 404.
- Production API: Stripe live checkout open (`checkout_available: true`) under the old plan "Why Humanoid? full
  database, all 13 datasets". Javier's own subscription is active until 17 Nov 2027.
- Production data: last import 17 Nov 2026 22:16 UTC (Humanoids 134, Deployments 130, Other Robots 547, Stocks 276).
- Master workbook, last modified 20 Nov 2026 11:08 UTC: Humanoids 217 rows (215 public), Deployments 184, Software 128
  rows (146 entries), Other Robots 488 rows (559 entries), Datasets 29, Clean Entities 32. Four tabs were renamed and
  values translated to English. The importer on `main` rejects this workbook (tab names). Fixed on the branch.
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
  services as proposals, 547 Other Robots pages, 452 company pages, redirects for `/robots/`, sitemap of 1,147 URLs.
- Wording on the site, app and method: the subscription covers Deployments and Components.
- Checks: `server` tests (86), `tools/verify-pages.mjs`, `tools/verify-site.mjs`, `tools/verify-premium-app.mjs`,
  `tools/verify-staging.mjs --local` (184 checks: routes, reloads, mobile, old links, exposure, the five account
  states with signed test-mode events).

Not done: staging deployment on Cloudflare (needs Javier's Cloudflare access), content refresh to the 20 Nov workbook,
live billing changes.

### Staging deploy (Javier or Codex, with Wrangler logged in to Javier's account)

```sh
git checkout claude/stoic-maxwell-432hsy
node tools/build-staging.mjs
cd server && npm ci
npx wrangler d1 migrations apply whyhumanoid-premium-test --remote --env test
npx wrangler deploy --env test --assets .staging
```

Then run "Import private workbook" from `main` with target `test` (the Worker on the branch code imports the 20 Nov
workbook), and `node tools/verify-staging.mjs --base https://whyhumanoid-premium-test.javier-198.workers.dev`.
Payment events in staging: Stripe test mode only, with test cards and the test webhook; never live keys.

### Local staging (no credentials)

```sh
node tools/build-staging.mjs --origin http://localhost:8788
node server/scripts/staging-local.mjs
node tools/verify-staging.mjs --base http://localhost:8788 --local --shots /tmp/shots
```

## Decisions pending (Javier)

1. Components content: the Hardware tab has 11 rows with names and links and no descriptions in the 10 public rows.
   Selling it inside the subscription needs real component data (a schema in the master, filled by Grok) or a
   change to what the subscription promises. Making it premium also hides 1 entry that is public today.
2. Previews of the two premium categories: keep the first 10 rows, or choose another rule.
3. Live billing: the Stripe live product is still "Why Humanoid? full database"; rename, update the description,
   tax presentation (VAT shown, B2B), purchase terms and refund policy before the new offer is sold live.
4. Existing subscribers: keep full access to what stays premium (current code does this; nothing else changes).
5. Container Handling tab: keep it with Deployments (10-row preview) or make it public with Benchmarks.
6. Service names, scope and order flow for the two EUR 1,000 services.
7. Content refresh to the 20 Nov workbook (Humanoids 215, Deployments 184): who reviews the two renamed robots and
   the new rows before publication.

## Next milestones

2. Content refresh from the 20 Nov workbook and live verification of the staging.
3. Live billing switch for the new offer after decisions 3 to 4.
4. Service purchase and delivery flow.
