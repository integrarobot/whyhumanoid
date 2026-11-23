#!/usr/bin/env node
// Staging bundle (23 Nov 2026): the public site exactly as GitHub Pages would serve it from this branch, plus the
// subscriber app wired to the same-origin test API, for the test Worker (whyhumanoid-premium-test) to serve as
// static assets next to its API and Stripe test mode. One origin, real directory URLs, nothing live.
//
//   node tools/build-staging.mjs [--origin https://whyhumanoid-premium-test.javier-198.workers.dev]
//   cd server && npx wrangler deploy --env test --assets .staging
//
// Writes server/.staging/ (ignored by Git). It copies only files the public site already publishes (the paths the
// Pages build would serve, minus everything _config.yml excludes); premium rows never exist outside D1. Every page
// gets a visible staging banner, robots are told not to index, and links to the production app become relative.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_ORIGIN } from './build-app.mjs';
import { PRODUCTION_API_ORIGIN, STAGING_ROBOTS, stagingText } from '../server/src/staging/site.js';

if (API_ORIGIN !== PRODUCTION_API_ORIGIN) throw new Error('server/src/staging/site.js must name the API origin of tools/build-app.mjs');

const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const ORIGIN = (arg('--origin') ?? 'https://whyhumanoid-premium-test.javier-198.workers.dev').replace(/\/$/, '');
const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'server/.staging');

// What GitHub Pages publishes: the repository root minus _config.yml's exclusions and dotfiles.
const EXCLUDE = new Set(['server', 'tools', 'ops', 'README.md', 'SECURITY.md', 'DEPLOYMENT.md', 'AGENTS.md', 'CLAUDE.md', '_config.yml', 'CNAME', 'node_modules']);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const name of readdirSync(root)) {
  if (name.startsWith('.') || EXCLUDE.has(name)) continue;
  cpSync(join(root, name), join(out, name), { recursive: true });
}
if (existsSync(join(out, 'data/database'))) throw new Error('data/database must not exist (paywall)');

let pages = 0;
const walk = (dir) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(html|js)$/.test(e)) continue;
    const before = readFileSync(p, 'utf8');
    // Same changes as the dashboard staging entry (server/src/staging/site.js).
    const s = stagingText(before, e, ORIGIN);
    if (e.endsWith('.html')) pages += 1;
    if (s !== before) writeFileSync(p, s);
  }
};
walk(out);
writeFileSync(join(out, 'robots.txt'), STAGING_ROBOTS);
// Workers static assets read _headers: no indexing anywhere on staging; the app keeps its own CSP.
writeFileSync(join(out, '_headers'), [
  '/*', '  X-Robots-Tag: noindex, nofollow', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin', '',
  '/app/*', `  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`, '',
].join('\n'));
console.log(`server/.staging: ${pages} HTML pages for ${ORIGIN} (app and API on the same origin, noindex, staging banner)`);
