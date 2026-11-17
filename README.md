# Why Humanoid?

Source of [whyhumanoid.com](https://whyhumanoid.com): a sourced database of humanoid robotics for people and
agents preparing enterprise deployment plans.

## Access model: paywall (Javier, 16 Nov 2026)

Decision of 16 Nov 2026 (d-0008), replacing the temporary open database: Humanoids is free; the other 12 tabs are
premium at €100 per year through Stripe, with no free trial. The site shows the first 10 sheet rows of each premium
tab; full rows exist only in the backend database (Cloudflare D1) and are served after a server-side subscription
check on every request. Never publish full rows of a premium tab in Git, the site or any public file again: the
guard (`tools/check-public.mjs`), the export tests and CI fail if one comes back.

| What | Who | Where |
|---|---|---|
| Humanoids: every robot row the sheet publishes, 32 fields, public values | Anyone | `index.html`, `data/humanoids-catalogue.*` |
| The 12 other tabs: first 10 sheet rows of each, every field; counts and field names | Anyone | `data/preview/<tab>.json`, Database section of `index.html` |
| The 12 other tabs in full (all rows and fields), Humanoids with full values, search, agent API keys | Active subscribers | premium app at `https://whyhumanoid.com/app/` (static, holds no data), API on the Cloudflare Worker, data in D1 |
| Left out everywhere | Nobody | rows the sheet marks as duplicates or not for publication; private links (workbook, Drive, mailto:, local addresses), personal contacts and internal editor notes; the backend row key, raw sheet-row pointers (`source_rows`) and importer bookkeeping; third-party GOOGLEFINANCE quote columns of Stocks |

Refresh: the site preview with `node --no-warnings tools/export-database.mjs --from <private export>`, then
`tools/sync-humanoids.mjs`, `tools/export-humanoids.mjs` and `tools/build-site.mjs`; the full data with the
`Import private workbook` workflow (target `production`). The private export stays outside Git.

The full rows published between 16 Nov 2026 (open database) and the paywall stay in this repository's history and in
copies made then; they cannot be made secret again. See DEPLOYMENT.md, "Exposure of the open-database period".

## Layout

```
index.html, CNAME          public catalogue page, built from data/ (complete free Humanoids catalogue)
data/                      humanoids-catalogue.json, humanoids-catalogue.csv, manifest.json, preview/ (10-row previews)
tools/                     export-humanoids.mjs, build-site.mjs, verify-site.mjs, check-public.mjs
app/                       premium app served at whyhumanoid.com/app/, built from server/public by tools/build-app.mjs
server/public/             full-database app source (holds no data; calls the API on the Worker over CORS)
server/src/                API: sign-in, sessions, API keys, entitlements, Stripe, previews, full data
server/src/import/         13-tab import (service account, read-only), cleaning, persistent ids
server/migrations/         D1 / SQLite schema
server/test/               tests, synthetic fixtures only
DEPLOYMENT.md              exact remaining settings for test and production
AGENTS.md, CLAUDE.md       agent instructions (Spanish), including the mandatory close of every delivery
ops/entregas/              delivery register: one immutable close per piece of work, read by Codex (README inside)
```

## Commands

```
node tools/entregas.mjs --check             # delivery register is valid (ops/entregas)
node tools/audit-deployments.mjs --from <export.json>   # Deployments sheet vs published data, cell by cell
node tools/export-humanoids.mjs --check     # free catalogue export is current
node tools/build-site.mjs --check           # index.html is the build of data/, parity with the legacy page
node tools/build-app.mjs --check            # app/ is the build of server/public (premium app at whyhumanoid.com/app/)
(cd tools && npm ci && node verify-site.mjs) # headless render: the whole free catalogue, search and filters work
node tools/check-public.mjs                 # public data guard
(cd server && npm ci && npm test)           # API tests
node server/scripts/dev.mjs                 # local app and catalogue with synthetic data, port 8787
```

## API

| Method | Path | Access |
|---|---|---|
| GET | `/v1/datasets` | public: the 13 datasets, no rows |
| GET | `/v1/datasets/{id}/preview` | public: the whole Humanoids catalogue (public values), or the first 10 data rows of another tab in workbook order; no search |
| GET | `/v1/datasets/{id}?limit&offset&q` | active subscription, checked on every request |
| GET | `/v1/billing/plan` | public: €100 per year, whether checkout is available |
| POST | `/v1/billing/checkout` | browser session; Stripe price verified as EUR 10000 / year, no trial, first; refused while a payment is pending |
| POST | `/v1/billing/portal` | browser session of a paying account: Stripe customer portal (card, invoices, cancellation) |
| POST | `/v1/stripe/webhook` | Stripe signature, same mode (test or live) as the environment |
| GET / POST | `/v1/me`, `/v1/auth/*`, `/v1/api-keys` | sign-in flow, agent keys |
| POST | `/v1/agent/task-plan` | active subscription: candidates, dated source-linked claims with stage and conditions, missing measurements, pilot checks, evidence gaps |
| POST | `/v1/admin/import` | `x-admin-token` |
