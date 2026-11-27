# Deploying the Worker from a reviewed commit (27 Nov 2026)

Why: twice (26 Nov 2026) the dashboard editor did not accept a whole, verifiable bundle (native input, clipboard,
file picker and Explorer upload all failed). This is a supported path that uploads the reviewed bytes unchanged and
lets anyone check what was uploaded. It changes no credential, no binding, no secret and no dashboard var.

The bundles are the same single-file modules as before (`server/scripts/build-dashboard.mjs`): production
`dist/worker.dashboard.js` (backend plus embedded app), test `dist/worker.staging.js` (backend plus the pinned public
site). `server/deploy/prebuilt.toml` uploads them **as built** (`no_bundle`): Wrangler builds nothing.

## 1. Rebuild and check the bytes

From a clean checkout of the reviewed commit:

```bash
cd server && npm ci
```

Then build both bundles with esbuild 0.27.7, installed in a scratch folder:

```bash
mkdir -p /tmp/esb && (cd /tmp/esb && npm i esbuild@0.27.7) && node scripts/build-dashboard.mjs /tmp/esb/node_modules/.bin/esbuild && node scripts/build-dashboard.mjs /tmp/esb/node_modules/.bin/esbuild --staging
```

```bash
sha256sum dist/worker.dashboard.js dist/worker.staging.js && wc -c dist/worker.dashboard.js dist/worker.staging.js
```

The toolchain is esbuild 0.27.7, with stripe 23.1.0, @modelcontextprotocol/sdk 1.32.2 and zod 3.25.76 from
`server/package-lock.json`, on Node 22. The hashes must equal the ones recorded for that commit (table below). If
they differ, stop.

## 2. Check what Wrangler would upload (no network change)

```bash
npx -y wrangler@4.168.0 deploy --config deploy/prebuilt.toml --env production --keep-vars --dry-run --outdir /tmp/wr-prod
```

```bash
sha256sum /tmp/wr-prod/worker.dashboard.js
```

The file in `--outdir` is exactly what would be sent, and its SHA-256 must equal step 1's. The dry run must list one
binding, `env.DB (whyhumanoid-premium)`, a D1 database. Repeat with `--env test` (`/tmp/wr-test/worker.staging.js`,
binding `whyhumanoid-premium-test`).

Checked on 27 Nov 2026 with wrangler 4.168.0: the dry-run output equals both bundles byte for byte, with only the D1
binding listed.

## 3. Upload a version, inspect it, then send traffic

Run these from the operator's own machine, signed in with `npx -y wrangler@4.168.0 login` (browser OAuth with the
Cloudflare account). No API token is created or stored, and nothing is added to GitHub.

1. Create a version without traffic, TEST first:

   ```bash
   npx -y wrangler@4.168.0 versions upload --config deploy/prebuilt.toml --env test --keep-vars --tag "$(git rev-parse --short HEAD)" --message "reviewed head"
   ```

2. In the dashboard (Workers & Pages, the Worker, Deployments), compare the new version's bindings, vars, compatibility
   date and flags with the version in production. Only the code may differ. The vars that must survive are the ones
   set in the dashboard: `STAGING_SITE_COMMIT` on test, plus the vars and secrets of `server/wrangler.toml` and
   `DEPLOYMENT.md`.
3. Send traffic to it:

   ```bash
   npx -y wrangler@4.168.0 versions deploy <version-id>@100% --config deploy/prebuilt.toml --env test
   ```

4. Check TEST: `/health`, `/v1/datasets`, the MCP `tools/list`, and the Muse challenge path (step 4).
5. Repeat for `--env production`.

**Rollback.** `npx -y wrangler@4.168.0 rollback --config deploy/prebuilt.toml --env production` brings the previous
version back. On 26 Nov 2026, production ran 92fb9d9b and test 18f526d0.

**What is deliberately absent from `prebuilt.toml`:**
- static assets: the dashboard bundles embed the app;
- routes and custom domains;
- cron triggers;
- observability.

**Before the first upload:** check in the dashboard that a version uploaded without these keys keeps the Worker's
routes, triggers and log settings. If it does not, stop and record what differed.

## 4. Muse challenge after the production deploy

The route is in `server/src/app.js` (exact token only) and answers on the MCP host:

```bash
curl -sS -D - https://whyhumanoid-premium.javier-198.workers.dev/.well-known/muse-challenge/0f4b178779974ebde7e015a3353e0c0167fbf88f0afa2ca08aa90379b8c09dcb
```

It must answer 200, `content-type: text/plain; charset=utf-8`, and the body exactly
`muse-challenge=0f4b178779974ebde7e015a3353e0c0167fbf88f0afa2ca08aa90379b8c09dcb`, with no newline. It expires
3 Dec 2026 at 19:32 Europe/Madrid.

## Recorded bundles

| Commit | What it adds | PROD `worker.dashboard.js` | TEST `worker.staging.js` |
|---|---|---|---|
| main 1830a31 (server tree = 71cdac5: PR 172 scoped stocks-humanoids import, PR 175 Muse challenge) | reviewed | 930,151 bytes, `291b9f9747fa9699805f6c263383f32a07b56ec1e388d466e6def275f89e55f1` | 816,855 bytes, `92566467a2633dbabd09011fb9e17607ef1286c1aeffdd0667cdb494cfded666` |
| this branch (adds the `integrators` scope) | under review | 930,165 bytes, `39d0d4fc23154de72ecc87af09085cff1570ccd9158be9641305ec61c3f18942` | 816,869 bytes, `beda05c4f2413f58430d2305d37512700c12ad2e0e1e7c3176bb7cb184e5ad45` |

Later reviewed heads add their own row.
