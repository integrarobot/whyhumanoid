# Deploying the Worker from a reviewed commit (27 Nov 2026)

The Worker runs from two single-file bundles built by `server/scripts/build-dashboard.mjs`:
- production: `dist/worker.dashboard.js`, the backend with the app embedded;
- test: `dist/worker.staging.js`, the backend with the pinned public site.

A deployment is correct only when the bytes that reach Cloudflare are the reviewed bytes, and someone has read them
back to show it.

## 1. Rebuild and check the bytes

Start from a clean checkout of the reviewed commit. Any path works, including one with spaces, non-ASCII letters or
`?`: since 27 Nov 2026 the script hands esbuild real filesystem paths, and `server/test/build-dashboard.test.js`
covers that case.

```bash
cd server && npm ci
```

```bash
mkdir -p /tmp/esb && (cd /tmp/esb && npm i esbuild@0.27.7) && node scripts/build-dashboard.mjs /tmp/esb/node_modules/.bin/esbuild && node scripts/build-dashboard.mjs /tmp/esb/node_modules/.bin/esbuild --staging
```

```bash
sha256sum dist/worker.dashboard.js dist/worker.staging.js && wc -c dist/worker.dashboard.js dist/worker.staging.js
```

Toolchain:
- esbuild 0.27.7, on Node 22;
- from `server/package-lock.json`: stripe 23.1.0, @modelcontextprotocol/sdk 1.32.2, zod 3.25.76.

The hashes must equal the row for that commit in the table at the end. If they differ, stop.

## 2. Proven path: dashboard editor, with a full read-back (Codex, 27 Nov 2026)

This is how the reviewed bundles were deployed on 27 Nov 2026: TEST as version 1ac00a70 and PROD as version 8171c73c.

1. Open the bundle in a native text editor (TextEdit on macOS), select all and copy.
2. In the Cloudflare dashboard (Workers & Pages, the Worker, Edit code), replace the whole file with the clipboard.
3. **Read back before deploying.** Copy the editor's entire contents back out and compare them byte for byte with
   the local bundle: same length and same SHA-256. If anything differs, do not deploy.
4. Deploy. Do TEST first, then PROD.
5. Check:
   - `/health`, `/v1/datasets` and `/v1/billing/plan`;
   - the report services;
   - an anonymous paid-detail request answers 401;
   - the MCP `tools/list`;
   - the Muse challenge (step 4).

Earlier attempts failed through the dashboard's file picker, its Explorer upload and pasting straight from another
app (26 Nov 2026). The full read-back in step 3 is what makes this path verifiable.

## 3. Alternative, unproven for live use: Wrangler

`server/deploy/prebuilt.toml` describes the same bundles for Wrangler. It uploads them as built (`no_bundle`),
declares the D1 binding and keeps dashboard vars (`--keep-vars`). It has assets, routes, crons and observability
deliberately absent.

**Only a dry run has been checked.** On 27 Nov 2026, with wrangler 4.168.0, the file Wrangler would upload was
byte-identical to each bundle, and the only binding it listed was the D1 database:

```bash
npx -y wrangler@4.168.0 deploy --config deploy/prebuilt.toml --env production --keep-vars --dry-run --outdir /tmp/wr-prod
```

```bash
sha256sum /tmp/wr-prod/worker.dashboard.js
```

**A live upload has never been tried**, so it is not a supported path yet. A live upload would also need:
- Wrangler authentication: `wrangler login` is an OAuth sign-in, and Wrangler stores its credentials on that machine
  until `wrangler logout`;
- a check that a version uploaded without assets, routes, crons and observability keeps the Worker's existing
  settings.

Neither is needed while the editor path works.

## 4. Muse challenge

```bash
curl -sS -D - https://whyhumanoid-premium.javier-198.workers.dev/.well-known/muse-challenge/0f4b178779974ebde7e015a3353e0c0167fbf88f0afa2ca08aa90379b8c09dcb
```

Expected:
- status 200;
- `content-type: text/plain; charset=utf-8`;
- body exactly `muse-challenge=0f4b178779974ebde7e015a3353e0c0167fbf88f0afa2ca08aa90379b8c09dcb`, with no newline.

Observed by Codex on 27 Nov 2026: 200 with that body, on TEST and on PROD. Muse then showed the challenge as Verified.
The challenge expires on 3 Dec 2026 at 19:32 Europe/Madrid.

## Recorded bundles

| Commit | Content | PROD `worker.dashboard.js` | TEST `worker.staging.js` |
|---|---|---|---|
| main 1830a31 (server identical to 71cdac5) | PR 172 scoped stocks-humanoids import, PR 175 Muse challenge. **Deployed 27 Nov 2026** (PROD 8171c73c, TEST 1ac00a70) | 930,151 bytes, `291b9f9747fa9699805f6c263383f32a07b56ec1e388d466e6def275f89e55f1` | 816,855 bytes, `92566467a2633dbabd09011fb9e17607ef1286c1aeffdd0667cdb494cfded666` |
| PR 185 head 4692a58 (adds the `integrators` scope) | reviewed; merged into main 8353f73 | 930,165 bytes, `39d0d4fc23154de72ecc87af09085cff1570ccd9158be9641305ec61c3f18942` | 816,869 bytes, `beda05c4f2413f58430d2305d37512700c12ad2e0e1e7c3176bb7cb184e5ad45` |
| main 8353f73d53c8eb30d9d9779ffd57f110decae306 (PR 187 Reports search, PR 185 integrators scope and build paths, PR 186 docs) | built independently by Claude and by Codex on 27 Nov 2026, same bytes; for the TEST and PROD deployment of 27 Nov 2026 | 1,150,751 bytes, `effa25de68a1bc399bd900455ae5565624632e3643edf22222b39218e81161f7` | 1,036,910 bytes, `c28dcf31023624833bb16e588d42baa0b7fe31a87aeeea03fb1a1a58903e349f` |

On 27 Nov 2026 both rows were rebuilt, with the corrected script, from a folder named `Why Humanoid? Ñandú`. Every
hash matched the table. Later reviewed heads add their own row.
