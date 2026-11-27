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

## 2. Proven path: Wrangler versions (Codex, 27 Nov 2026)

On 27 Nov 2026 the dashboard editor failed repeatedly to take the bundles of about 1.1 MB built after PR 187 embedded
the Reports atlas. That is what was observed on this upload; no general Cloudflare size limit has been established.
With Javier's authorization, Codex deployed main 64ccd65 this way:
- TEST version 9e507e1b, deployment 14e71f5d at 08:16:41 UTC;
- PROD version ff0eb084, deployment 3e75ccf0 at 08:19:43 UTC.

**Authentication.** `wrangler login` is an OAuth sign-in, and Wrangler stores its credentials on that machine (Codex
used `--use-keyring`). The scopes granted were User Read, Account Read, Workers Scripts Write and background access.
Billing and D1 write were not granted.

**Steps.** Do TEST first, then PROD, with wrangler 4.168.0.

1. **Read the active version.** Use the CLI to read its runtime (compatibility date, flags, usage model) and its
   bindings. Make `server/deploy/prebuilt.toml` match it. On 27 Nov 2026 both Workers ran with
   `compatibility_date` 2026-11-13, no flags and usage model standard.
2. **Check the bytes, then upload a version without traffic.** The dry run writes the exact file Wrangler would
   send:

   ```bash
   npx -y wrangler@4.168.0 deploy --config deploy/prebuilt.toml --env test --keep-vars --dry-run --outdir /tmp/wr-test
   ```

   Compare that file byte for byte with the reviewed local bundle from section 1: same length and same SHA-256. Then
   upload the same file; `no_bundle` sends it as built:

   ```bash
   npx -y wrangler@4.168.0 versions upload --config deploy/prebuilt.toml --env test --keep-vars --strict
   ```

   Wrangler 4.168.0 keeps secrets and sends no observability change on a version upload. It does not touch triggers.
3. **Compare before activating.** Check that the new version's bindings, vars and runtime are identical to the
   active version. Wrangler should report "No non-versioned settings to sync".

   The script tag or etag that `versions view` shows is Cloudflare's own identifier, not the SHA-256 of the file. This
   path does not download or hash the remote code: the byte check is the dry-run file against the local bundle, before
   the upload.
4. **Activate.** `npx -y wrangler@4.168.0 versions deploy <version-id>@100% --config deploy/prebuilt.toml --env test`
5. **Check.** Use the same checks as for the editor path, listed below.

**Rollback.** `npx -y wrangler@4.168.0 rollback --config deploy/prebuilt.toml --env <env>`.

## 3. Earlier path: dashboard editor, with a full read-back

Codex deployed TEST 1ac00a70 and PROD 8171c73c this way on 27 Nov 2026.

1. Open the bundle in a native text editor (TextEdit on macOS), select all and copy.
2. In the Cloudflare dashboard (Workers & Pages, the Worker, Edit code), replace the whole file with the clipboard.
3. **Read back before deploying.** Copy the editor's entire contents back out and compare them byte for byte with the
   local bundle: same length and same SHA-256. If anything differs, do not deploy.
4. Deploy, TEST first, then PROD.

Checks after either path:
- `/health`, `/v1/datasets`, `/v1/billing/plan` and the report services;
- an anonymous paid-detail request answers 401;
- MCP `tools/list`;
- Reports search;
- the Muse challenge (section 4).

`/app/` on the PROD Worker answers 404 by design: the production app is served from whyhumanoid.com/app/. The TEST Worker
serves its app on purpose.

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
| main 64ccd65 (adds PR 188 countries and E0-E5) | deployed with Wrangler versions on 27 Nov 2026 (TEST 9e507e1b, PROD ff0eb084) | 1,150,891 bytes, `047622e339507ab0f504f95bac4f8a9bd7b01b8136bd170bf1c923c9793b936d` | 1,036,845 bytes, `af83093b180e4f1937fea1d1a6aa18f0c2058f76341c1cf2e254f446a87487a8` |
| PR 185 head 4692a58 (adds the `integrators` scope) | reviewed; merged into main 8353f73 | 930,165 bytes, `39d0d4fc23154de72ecc87af09085cff1570ccd9158be9641305ec61c3f18942` | 816,869 bytes, `beda05c4f2413f58430d2305d37512700c12ad2e0e1e7c3176bb7cb184e5ad45` |
| main 8353f73d53c8eb30d9d9779ffd57f110decae306 (PR 187 Reports search, PR 185 integrators scope and build paths, PR 186 docs) | built independently by Claude and by Codex on 27 Nov 2026, same bytes; superseded before deployment by main 64ccd65 | 1,150,751 bytes, `effa25de68a1bc399bd900455ae5565624632e3643edf22222b39218e81161f7` | 1,036,910 bytes, `c28dcf31023624833bb16e588d42baa0b7fe31a87aeeea03fb1a1a58903e349f` |

On 27 Nov 2026 both rows were rebuilt, with the corrected script, from a folder named `Why Humanoid? Ñandú`. Every
hash matched the table. Later reviewed heads add their own row.
