#!/usr/bin/env node
// Publishes the premium app at https://whyhumanoid.com/app/ (Javier, 17 Nov 2026: the paid area lives on the brand's
// own domain). GitHub Pages serves app/; the API stays on the Cloudflare Worker named in API_ORIGIN, called over CORS
// (the Worker allows https://whyhumanoid.com). The source of truth is server/public/: this copies it and adds the API
// origin, the canonical address and a Content-Security-Policy, because GitHub Pages cannot send headers.
// The app holds no data: rows come from the API after a server-side entitlement check.
//
//   node tools/build-app.mjs           write app/index.html and app/premium.js
//   node tools/build-app.mjs --check   fail if app/ differs from what would be written
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { PUBLIC_FIELDS } from '../server/src/access/fields.js';
import { createHash } from 'node:crypto';
import { pageLinks } from './build-pages.mjs';

export const APP_URL = 'https://whyhumanoid.com/app/';
// Until whyhumanoid.com's DNS moves to Cloudflare (DEPLOYMENT.md, section 0.1), the API keeps its workers.dev address.
export const API_ORIGIN = 'https://whyhumanoid-premium.javier-198.workers.dev';

const root = new URL('../', import.meta.url);
const src = (p) => readFileSync(new URL(`server/public/${p}`, root), 'utf8');

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  `connect-src ${API_ORIGIN}`,
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');

export function buildApp() {
  const html = src('index.html');
  const anchor = '<meta charset="utf-8">';
  if (!html.includes(anchor)) throw new Error('server/public/index.html: <meta charset="utf-8"> not found');
  const head = [
    anchor,
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
    '<meta name="referrer" content="no-referrer">',
    `<meta name="wh-api" content="${API_ORIGIN}">`,
    `<link rel="canonical" href="${APP_URL}">`,
    '<!-- Built by tools/build-app.mjs from server/public/index.html. Do not edit here. -->',
  ].join('\n');
  const js = `// Built by tools/build-app.mjs from server/public/premium.js. Do not edit here.\n${src('premium.js')}`;
  // The script URL carries a hash of its content, so a new version is never served from a browser's cached copy.
  const version = createHash('sha256').update(js).digest('hex').slice(0, 12);
  const tag = '<script src="premium.js"></script>';
  if (!html.includes(tag)) throw new Error(`server/public/index.html: ${tag} not found`);
  // Public company pages the app may link to (ids and paths only, all public). A JSON block is data, not script.
  // The public field contract (server/src/access/fields.js), so the app shows visitors the same fields as the site even
  // while an older API still answers with more (it never adds a field).
  const pages = JSON.stringify({ companies: pageLinks().companies, public_fields: PUBLIC_FIELDS }).replace(/</g, '\\u003c');
  return {
    'index.html': html.replace(anchor, head).replace(tag, `<script type="application/json" id="wh-pages">${pages}</script>\n<script src="premium.js?v=${version}"></script>`),
    'premium.js': js,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = buildApp();
  const dir = new URL('app/', root);
  if (process.argv.includes('--check')) {
    const stale = Object.entries(files).filter(([name, body]) => {
      const file = new URL(name, dir);
      return !existsSync(file) || readFileSync(file, 'utf8') !== body;
    });
    if (stale.length) {
      console.error(`app/ is out of date (${stale.map(([n]) => n).join(', ')}): run node tools/build-app.mjs`);
      process.exit(1);
    }
    console.log(`app/ is current: ${Object.keys(files).join(', ')} for ${APP_URL}, API ${API_ORIGIN}`);
  } else {
    mkdirSync(dir, { recursive: true });
    for (const [name, body] of Object.entries(files)) writeFileSync(new URL(name, dir), body);
    console.log(`wrote app/${Object.keys(files).join(', app/')} for ${APP_URL}`);
  }
}
