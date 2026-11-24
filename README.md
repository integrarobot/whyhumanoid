# Why Humanoid?

Source of [whyhumanoid.com](https://whyhumanoid.com): a sourced database of humanoid robotics for people and
agents preparing enterprise deployment plans.

## Access model: two paths (Javier, 24 Nov 2026)

The offer of 24 Nov 2026 replaces the 16 Nov paywall of 12 premium tabs (d-0008) and its 10-row previews. Access is
decided only by `server/src/access/matrix.js`, with the public field allowlist of `server/src/access/fields.js`.

- A. Full data access: one data subscription, US$100 per year billed annually, no free trial (`server/src/pricing.js`),
  for complete Deployments and complete Components. New live sales open since 24 Nov 2026 (`LIVE_SALES_OPEN`).
  Subscriptions bought at the former EUR 100 per year price keep their contract, currency and renewal
  (`STRIPE_LEGACY_PRICE_IDS`). Checkout computes and collects no tax; any tax change is Javier's decision.
- B. Custom company reports (Robot integration diagnostic, Industrial diversification report), US$1,000 each, separate
  from the subscription: not available to order yet (no form, checkout or delivery promise).
- Every other category is free.

Full rows of the subscription tabs exist only in the backend database (Cloudflare D1) and are served after a
server-side subscription check on every request. Never publish a paid field in Git, the site or any public file: the
guard (`tools/check-public.mjs`), the export checks, CI and `tools/check-reserved.mjs --from <export>` fail if one appears.

| What | Who | Where |
|---|---|---|
| Humanoids: every robot row the sheet publishes, 32 fields, public values | Anyone | `index.html`, `data/humanoids-catalogue.*` |
| Integrators (since 24 Nov 2026): every provider with its 26 fields, a directory with filters, a capability comparison, named projects and a free profile per provider on its company page (`data/integrators/atlas.json`, `tools/export-integrators.mjs`); free tabs Software, Other robots and Task evaluations, every row and field; Investment, every listed company (name, ticker, exchange and country beyond row 10 until the next full export; GOOGLEFINANCE quote columns left out); the Reports, Benchmarks and Datasets atlases | Anyone | `data/preview/<tab>.json`, `data/reports/`, `data/benchmarks/`, `data/datasets/` |
| Deployments and Components: every case and product at its public fields, with sources and caveats; a permanent page per case (`/deployments/<slug>/`) and product; claim-to-evidence links and tabs outside the offer counted, not listed; global search over these public values | Anyone | `data/preview/<tab>.json`, `data/public/projection.json`, pages, Database section of `index.html` |
| Deployments and Components in full (every row and field, technical passports, comparison and filters), full search, agent API keys | Active subscribers | premium app at `https://whyhumanoid.com/app/` (static, holds no data), API on the Cloudflare Worker, data in D1 |
| Left out everywhere | Nobody | rows the sheet marks as duplicates or not for publication; private links (workbook, Drive, mailto:, local addresses), personal contacts and internal editor notes; the backend row key, raw sheet-row pointers (`source_rows`) and importer bookkeeping; Source workbook and row numbers of Components |

Refresh: the site preview with `node --no-warnings tools/export-database.mjs --from <private export>`, then
`tools/sync-humanoids.mjs`, `tools/export-humanoids.mjs`, `tools/export-public.mjs --from`, `tools/build-pages.mjs`, `tools/build-site.mjs` and
`tools/build-app.mjs`; the full data with the
`Import private workbook` workflow (target `production`). The private export stays outside Git.

The full rows published between 16 Nov 2026 (open database) and the paywall stay in this repository's history and in
copies made then; they cannot be made secret again. See DEPLOYMENT.md, "Exposure of the open-database period".

## Layout

```
index.html, CNAME          public catalogue page, built from data/ (complete free Humanoids catalogue)
robots/, companies/        permanent public pages, one per catalogue robot and per company in the database,
                           readable without JavaScript; with sitemap.xml, 404.html and data/pages.json, built by
                           tools/build-pages.mjs from public inputs only (tools/permalinks.json keeps old addresses)
data/public/projection.json  public projection: counts and summaries of every record through the allowlist of
                           server/src/public/projection.js (tools/export-public.mjs; also used by the visitor search)
data/                      humanoids-catalogue.json, humanoids-catalogue.csv, manifest.json, preview/ (10-row previews)
tools/                     export-humanoids.mjs, build-site.mjs, verify-site.mjs, check-public.mjs
app/                       premium app served at whyhumanoid.com/app/, built from server/public by tools/build-app.mjs
server/src/relations/      Deployments-robot-company relations, rebuilt by every import (graph.js)
server/src/search/         global search and common tags, rebuilt by every import (index.js, vocabulary.js)
data/evolution/charts.json the seven evolution charts (section pages and home carousel), from public snapshots and
                           the reviewed dates of tools/evolution-review.json (tools/export-evolution.mjs)
tools/relations-aliases.json  reviewed aliases: public maker and robot model names only
server/public/             full-database app source (holds no data; calls the API on the Worker over CORS)
server/src/                API: sign-in, sessions, API keys, entitlements, Stripe, previews, full data
server/src/import/         13-tab import (service account, read-only), cleaning, persistent ids
server/migrations/         D1 / SQLite schema
server/test/               tests, synthetic fixtures only
DEPLOYMENT.md              exact remaining settings for test and production
AGENTS.md, CLAUDE.md       agent instructions (Spanish), including the mandatory close of every delivery
ops/entregas/              delivery register: one immutable close per piece of work, read by Codex (README inside)
ops/weekly-update/         state and public run records of the update; ejemplo-darwin.md is the worked example
```

## Commands

```
node tools/entregas.mjs --check             # delivery register is valid (ops/entregas)
node tools/audit-deployments.mjs --from <export.json>   # Deployments sheet vs published data, cell by cell
node tools/export-humanoids.mjs --check     # free catalogue export is current
node tools/build-site.mjs --check           # index.html is the build of data/, parity with the legacy page
node tools/build-app.mjs --check            # app/ is the build of server/public (premium app at whyhumanoid.com/app/)
node tools/build-pages.mjs --check          # robot and company pages, sitemap and 404 are the build of public inputs
(cd tools && node verify-pages.mjs)         # pages read without JavaScript: titles, canonicals, links, redirects
node --no-warnings tools/export-public.mjs --from <export>   # public projection (allowlisted counts and summaries)
node --no-warnings tools/check-reserved.mjs --from <export>  # private: no reserved value in what the site publishes
node tools/relations.mjs --check            # aliases match the catalogue; robot pages link only public preview rows
node tools/relations.mjs --from <export>    # private review report of the relations (stdout only)
node --no-warnings tools/search-tags.mjs --from <export>   # private review of search tags (stdout only)
python3 -I tools/workbook-xlsx-to-json.py <book.xlsx> <export.json> [--compare <old export>]
                                            # private export from the workbook's .xlsx download (needs openpyxl)
(cd tools && npm ci && node verify-site.mjs) # headless render: the whole free catalogue, search and filters work
node tools/check-public.mjs                 # public data guard
node tools/export-evolution.mjs --check     # evolution charts (data/evolution/charts.json) are the build of public snapshots
node --no-warnings --test tools/test-evolution.mjs   # each evolution series recomputed from its source; no paid field
node tools/verify-evolution.mjs [--base <url>] [--quick]   # browser: 10-second rotation, controls, keyboard, mobile
(cd server && npm ci && npm test)           # API tests
node server/scripts/dev.mjs                 # local app and catalogue with synthetic data, port 8787
```

## API

| Method | Path | Access |
|---|---|---|
| GET | `/v1/datasets` | public: the 13 datasets, no rows |
| GET | `/v1/datasets/{id}/preview` | public: every row of a free tab; every row of Deployments and Components at its public fields (`public_fields`); counted-only tabs return no rows; no search |
| GET | `/v1/datasets/{id}?limit&offset&q` | active subscription, checked on every request |
| GET | `/v1/billing/plan` | public: US$100 per year, whether checkout is available |
| POST | `/v1/billing/checkout` | browser session; Stripe price verified as USD 10000 / year, no trial, first; refused while a payment is pending |
| POST | `/v1/billing/portal` | browser session of a paying account: Stripe customer portal (card, invoices, cancellation) |
| POST | `/v1/stripe/webhook` | Stripe signature, same mode (test or live) as the environment |
| GET / POST | `/v1/me`, `/v1/auth/*`, `/v1/api-keys` | sign-in flow, agent keys |
| POST | `/v1/agent/task-plan` | active subscription: candidates, dated source-linked claims with stage and conditions, missing measurements, pilot checks, evidence gaps |
| POST | `/v1/admin/import` | `x-admin-token` |
