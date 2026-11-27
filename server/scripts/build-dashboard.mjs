#!/usr/bin/env node
// Builds dist/worker.dashboard.js: the whole backend plus the premium app in one ES module, for deploying through
// the Cloudflare dashboard editor (no Wrangler token needed). Usage: node scripts/build-dashboard.mjs <esbuild path>
// With --staging it builds dist/worker.staging.js instead, for the TEST Worker only: the backend plus the public site
// of a pinned commit (scripts/staging-entry.js, variable STAGING_SITE_COMMIT).
// The test deployment was built with esbuild 0.27.7 and stripe 23.1.0; the same versions reproduce the same bytes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = new URL('./', import.meta.url);
// Filesystem paths, not URL paths: a checkout under "Why Humanoid?" or any folder with spaces or non-ASCII letters
// would otherwise reach esbuild percent-encoded (Why%20Humanoid%3F) and fail (27 Nov 2026).
const path = (p) => fileURLToPath(new URL(p, here));
const read = (p) => readFileSync(new URL(p, here), 'utf8');
writeFileSync(
  new URL('.dashboard-assets.js', here),
  `export const indexHtml = ${JSON.stringify(read('../public/index.html'))};\nexport const premiumJs = ${JSON.stringify(read('../public/premium.js'))};\n`,
);
mkdirSync(new URL('../dist/', here), { recursive: true });
const staging = process.argv.includes('--staging');
const esbuild = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'esbuild';
const out = staging ? 'worker.staging.js' : 'worker.dashboard.js';
execFileSync(esbuild, [
  path(staging ? 'staging-entry.js' : 'dashboard-entry.js'),
  '--bundle', '--format=esm', '--platform=browser', '--conditions=worker,browser', '--minify',
  `--outfile=${path(`../dist/${out}`)}`, '--log-level=warning',
], { stdio: 'inherit' });
console.log(`built dist/${out}`);
