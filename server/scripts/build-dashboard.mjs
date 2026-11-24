#!/usr/bin/env node
// Builds dist/worker.dashboard.js: the whole backend plus the premium app in one ES module, for deploying through
// the Cloudflare dashboard editor (no Wrangler token needed). Usage: node scripts/build-dashboard.mjs <esbuild path>
// With --staging it builds dist/worker.staging.js instead, for the TEST Worker only: the backend plus the public site
// of a pinned commit (scripts/staging-entry.js, variable STAGING_SITE_COMMIT).
// The test deployment was built with esbuild 0.27.7 and stripe 23.1.0; the same versions reproduce the same bytes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const here = new URL('./', import.meta.url);
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
  new URL(staging ? 'staging-entry.js' : 'dashboard-entry.js', here).pathname,
  // x402 (24 Nov 2026): @x402/extensions imports Node's "url" (domainToASCII); the Worker's nodejs_compat flag provides it.
  '--bundle', '--format=esm', '--platform=browser', '--conditions=worker,browser', '--minify', '--external:url', '--external:node:*',
  `--outfile=${new URL(`../dist/${out}`, here).pathname}`, '--log-level=warning',
], { stdio: 'inherit' });
console.log(`built dist/${out}`);
