# Why Humanoid?

Source of [whyhumanoid.com](https://whyhumanoid.com): a sourced database of humanoid robotics for people and
agents preparing enterprise deployment plans.

## Access model: open database (Javier, 16 Nov 2026)

Decision of 16 Nov 2026: the whole database is open to every visitor on whyhumanoid.com, without payment or
sign-in, until the paywall phase. This replaces the 10-row previews of 13 Nov; do not go back to them unless Javier
decides to start the paywall. Stripe and the subscription stay prepared in the backend, with checkout closed.

| What | Who | Where |
|---|---|---|
| Humanoids: every robot row the sheet publishes, 32 fields, the values the paid product shows | Anyone | `index.html`, `data/humanoids-catalogue.*` |
| The 12 other tabs: every row and content field, with record ids | Anyone | `data/database/<tab>.json`, loaded by the Database section of `index.html` |
| Left out everywhere | Nobody | rows the sheet marks as duplicates or not for publication; private links (workbook, Drive, mailto:, local addresses), personal contacts and internal editor notes; the backend row key, raw sheet-row pointers (`source_rows`) and importer bookkeeping; third-party GOOGLEFINANCE quote columns of Stocks |
| Backend (`server/`): same data behind sign-in and a €100/year subscription, checkout closed | Prepared for the paywall phase | Cloudflare Worker |

Refresh: `node --no-warnings tools/export-database.mjs --from <private export>` and `tools/sync-humanoids.mjs`
(see the scripts' headers), then `tools/export-humanoids.mjs` and `tools/build-site.mjs`. The private export
stays outside Git.

## Layout

```
index.html, CNAME          public catalogue page, built from data/ (complete free Humanoids catalogue)
data/                      humanoids-catalogue.json, humanoids-catalogue.csv, manifest.json
tools/                     export-humanoids.mjs, build-site.mjs, verify-site.mjs, check-public.mjs
server/public/             full-database app (served by the backend, holds no data)
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
| POST | `/v1/billing/checkout` | browser session; Stripe price verified as EUR 10000 / year first |
| POST | `/v1/stripe/webhook` | Stripe signature, same mode (test or live) as the environment |
| GET / POST | `/v1/me`, `/v1/auth/*`, `/v1/api-keys` | sign-in flow, agent keys |
| POST | `/v1/agent/task-plan` | active subscription: candidates, dated source-linked claims with stage and conditions, missing measurements, pilot checks, evidence gaps |
| POST | `/v1/admin/import` | `x-admin-token` |
