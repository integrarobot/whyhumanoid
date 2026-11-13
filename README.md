# Why Humanoid?

Source of [whyhumanoid.com](https://whyhumanoid.com): a sourced database of humanoid robotics for people and
agents preparing enterprise deployment plans.

## Access model (decided by Javier, 13 Nov 2026)

| What | Who | Where |
|---|---|---|
| Preview: the first 10 non-empty data rows of each of the 13 workbook tabs, in workbook order | Anyone | Humanoids preview on GitHub Pages (`index.html`, `data/`); all 13 previews from `GET /v1/datasets/{id}/preview` on the backend |
| Full database: all rows of all 13 tabs, full search, agent API keys | Subscribers, €100 per year (one recurring Stripe price, EUR 10000 minor units, yearly) | Backend only (`server/`), at `premium.whyhumanoid.com` |

Nothing beyond the previews may reach this repository, the Pages build, page source, downloadable files or any
anonymous URL. `tools/check-public.mjs` enforces it in CI.

## Layout

```
index.html, CNAME          public catalogue page, built from data/ (10-row Humanoids preview)
data/                      humanoids-preview.json, humanoids-preview.csv, manifest.json
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
node tools/export-humanoids.mjs --check     # preview export is current
node tools/build-site.mjs --check           # index.html is the build of data/, parity with the legacy page
(cd tools && npm ci && node verify-site.mjs) # headless render: 10 rows, search and filters work
node tools/check-public.mjs                 # public data guard
(cd server && npm ci && npm test)           # API tests
node server/scripts/dev.mjs                 # local app and catalogue with synthetic data, port 8787
```

## API

| Method | Path | Access |
|---|---|---|
| GET | `/v1/datasets` | public: the 13 datasets, no rows |
| GET | `/v1/datasets/{id}/preview` | public: first 10 data rows in workbook order, no search |
| GET | `/v1/datasets/{id}?limit&offset&q` | active subscription, checked on every request |
| GET | `/v1/billing/plan` | public: €100 per year, whether checkout is available |
| POST | `/v1/billing/checkout` | browser session; Stripe price verified as EUR 10000 / year first |
| POST | `/v1/stripe/webhook` | Stripe signature, same mode (test or live) as the environment |
| GET / POST | `/v1/me`, `/v1/auth/*`, `/v1/api-keys` | sign-in flow, agent keys |
| POST | `/v1/admin/import` | `x-admin-token` |
