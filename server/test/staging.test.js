// Staging site of the test Worker (server/src/staging/site.js): Pages semantics, staging changes, nothing private.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { siteResponse, PRODUCTION_API_ORIGIN } from '../src/staging/site.js';
import { API_ORIGIN } from '../../tools/build-app.mjs';

const root = new URL('../../', import.meta.url);
const ORIGIN = 'https://whyhumanoid-premium-test.javier-198.workers.dev';
// The repository at this checkout stands in for the public repository at the pinned commit.
const getFile = async (path) => {
  const u = new URL(path, root);
  const ok = existsSync(u) && statSync(u).isFile();
  return { ok, status: ok ? 200 : 404, text: async () => readFileSync(u, 'utf8'), arrayBuffer: async () => readFileSync(u) };
};
const get = (p) => siteResponse(new URL(p, ORIGIN), getFile);

test('staging serves the site like Pages: directories, redirects, 404', async () => {
  assert.equal(PRODUCTION_API_ORIGIN, API_ORIGIN);
  for (const p of ['/', '/humanoids/', '/deployments/', '/components/', '/investment/', '/other-robots/', '/companies/tesla/', '/humanoids/agibot-x1-4/', '/app/', '/data/preview/index.json', '/assets/pages.css']) {
    const r = await get(p);
    assert.equal(r.status, 200, p);
  }
  const slash = await get('/humanoids');
  assert.equal(slash.status, 307);
  assert.equal(slash.headers.get('location'), '/humanoids/');
  assert.equal((await get('/no-such-page/')).status, 404);
  assert.match(await (await get('/no-such-page/')).text(), /Page not found/);
});

test('staging never serves code, tooling, operations or docs, and asks robots to stay away', async () => {
  for (const p of ['/server/src/app.js', '/tools/build-pages.mjs', '/ops/brief.md', '/AGENTS.md', '/README.md', '/.github/workflows/ci.yml', '/_config.yml', '/CNAME', '/data/../server/wrangler.toml']) {
    assert.equal((await get(p)).status, 404, p);
  }
  assert.equal(await (await get('/robots.txt')).text(), 'User-agent: *\nDisallow: /\n');
  const home = await get('/');
  assert.equal(home.headers.get('x-robots-tag'), 'noindex, nofollow');
  const html = await home.text();
  assert.match(html, /Staging for review/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
});

test('the staging app calls the API on its own origin, never production', async () => {
  const app = await (await get('/app/')).text();
  assert.ok(!app.includes(PRODUCTION_API_ORIGIN));
  assert.ok(app.includes(`content="${ORIGIN}"`));
  const page = await (await get('/humanoids/agibot-x1-4/')).text();
  assert.ok(!page.includes('https://whyhumanoid.com/app/'), 'links to the production app become relative');
});
