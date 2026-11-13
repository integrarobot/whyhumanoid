# Why Humanoid?

Source of [whyhumanoid.com](https://whyhumanoid.com): a sourced database of humanoid robotics for people and
agents preparing enterprise deployment plans.

## Access model (Javier, 13 Nov 2026; Humanoids catalogue kept free in full)

| What | Who | Where |
|---|---|---|
| The complete Humanoids catalogue: every robot row, 32 public fields, public (cleaned) values | Anyone | GitHub Pages (`index.html`, `data/humanoids-catalogue.*`); `GET /v1/datasets/humanoids/preview` on the backend |
| The first 10 non-empty source sheet rows of each of the 12 other workbook tabs, in workbook order (tabs with side-by-side lists show every entry in those rows: 19 for Software, 20 for Other robots) | Anyone | `GET /v1/datasets/{id}/preview` on the backend |
| Full database: full values, all rows of all 13 tabs, full search, agent API keys | Subscribers, €100 per year (one recurring Stripe price, EUR 10000 minor units, yearly) | Backend only (`server/`) |

Nothing else may reach this repository, the Pages build, page source, downloadable files or any anonymous URL:
no paid values, no rows the sheet marks as internal, no rows of the other tabs. `tools/check-public.mjs`
enforces it in CI.

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
```

## Commands

```
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
