#!/usr/bin/env node
// Builds dist/worker.dashboard.js: the whole backend plus the premium app in one ES module, for deploying through
// the Cloudflare dashboard editor (no Wrangler token needed). Usage: node scripts/build-dashboard.mjs <esbuild path>
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
const esbuild = process.argv[2] ?? 'esbuild';
execFileSync(esbuild, [
  new URL('dashboard-entry.js', here).pathname,
  '--bundle', '--format=esm', '--platform=browser', '--conditions=worker,browser', '--minify',
  `--outfile=${new URL('../dist/worker.dashboard.js', here).pathname}`, '--log-level=warning',
], { stdio: 'inherit' });
console.log('built dist/worker.dashboard.js');
