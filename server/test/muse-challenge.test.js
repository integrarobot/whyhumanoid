// Muse connector domain verification (26 Nov 2026): GET /.well-known/muse-challenge/<token> answers
// "muse-challenge=<token>" as plain text, on the same Worker that serves /mcp, at that exact path only, without reading
// the database, secrets or credentials. The TEST entry passes that one path to the Worker as well.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setup } from './helpers.js';
import worker from '../src/worker.js';
import { MUSE_CHALLENGE_BODY, MUSE_CHALLENGE_PATH, MUSE_CHALLENGE_TOKEN } from '../src/muse-challenge.js';

// The literals Muse expects, pinned here so a change to the module cannot pass unnoticed.
const TOKEN = '0f4b178779974ebde7e015a3353e0c0167fbf88f0afa2ca08aa90379b8c09dcb';
const PATH = `/.well-known/muse-challenge/${TOKEN}`;
const EXPECTED = `muse-challenge=${TOKEN}`;

test('muse challenge: GET answers exactly muse-challenge=<token> as text/plain, no newline, no JSON', async () => {
  assert.deepEqual([MUSE_CHALLENGE_TOKEN, MUSE_CHALLENGE_PATH, MUSE_CHALLENGE_BODY], [TOKEN, PATH, EXPECTED]);
  const ctx = await setup();
  const res = await ctx.call('GET', PATH);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('location'), null, 'no redirect');
  const body = await res.text();
  assert.equal(body, EXPECTED, 'body is the challenge byte for byte');
  assert.equal(res.headers.get('content-length'), String(body.length));
  assert.equal(await (await ctx.call('GET', `${PATH}?ts=1`)).text(), EXPECTED, 'a query string does not change the answer');
});

test('muse challenge: HEAD answers the same headers with an empty body', async () => {
  const ctx = await setup();
  const res = await ctx.call('HEAD', PATH);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(res.headers.get('content-length'), String(EXPECTED.length));
  assert.equal(await res.text(), '');
});

test('muse challenge: no credential needed or used; only GET and HEAD; only the exact token path', async () => {
  const ctx = await setup();
  for (const headers of [{}, { authorization: 'Bearer not-a-real-key' }, { cookie: 'wh_session=x' }]) {
    const res = await ctx.call('GET', PATH, { headers });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), EXPECTED);
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const res = await ctx.call(method, PATH, { body: '{}' });
    assert.equal(res.status, 405, `${method} is not allowed`);
    assert.ok(!(await res.text()).includes(TOKEN));
  }
  const wrongToken = `${TOKEN.slice(0, -1)}${TOKEN.endsWith('0') ? '1' : '0'}`;
  for (const path of [
    `/.well-known/muse-challenge/${wrongToken}`, `${PATH}/`, `${PATH}.txt`, `${PATH}x`, '/.well-known/muse-challenge/',
    '/.well-known/muse-challenge', `/.well-known/muse-challenge/${TOKEN.toUpperCase()}`, `/muse-challenge/${TOKEN}`, `/.well-known/${TOKEN}`,
  ]) {
    const res = await ctx.call('GET', path);
    assert.equal(res.status, 404, `${path} is not the challenge`);
    assert.ok(!(await res.text()).includes(EXPECTED));
  }
});

test('muse challenge: the rest of the Worker is unchanged (MCP, health, access, OpenAI challenge)', async () => {
  const ctx = await setup();
  assert.equal((await ctx.call('GET', '/mcp')).status, 405, 'GET /mcp still asks for POST');
  assert.equal((await ctx.call('HEAD', '/mcp')).status, 405);
  assert.deepEqual(await (await ctx.call('GET', '/health')).json(), { ok: true });
  assert.equal((await ctx.call('GET', '/v1/access')).status, 200);
  assert.equal(await (await ctx.call('GET', '/.well-known/openai-apps-challenge')).text(), 'aFaAZIEpwgk7flron0F8ZuZ66IWE_4L9h-N2Lns_JHg');
});

test('muse challenge: the deployed entry answers it without querying D1 or echoing any secret', async () => {
  const forbidden = new Proxy({}, { get(_, key) { throw new Error(`the challenge used env.DB.${String(key)}`); } });
  const sentinels = {};
  const env = new Proxy({ DB: forbidden }, {
    get(target, key) {
      if (key === 'DB') return target.DB;
      if (typeof key === 'string' && /KEY|SECRET|TOKEN|PRIVATE|WORKBOOK/.test(key)) return (sentinels[key] = `sentinel-${key}`);
      return undefined;
    },
  });
  const res = await worker.fetch(new Request(`https://whyhumanoid-premium.javier-198.workers.dev${PATH}`), env, {});
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.equal(body, EXPECTED);
  const headers = JSON.stringify([...res.headers]);
  for (const value of Object.values(sentinels)) assert.ok(!body.includes(value) && !headers.includes(value), 'no env value in the answer');
});

test('muse challenge: the TEST entry passes exactly this path to the Worker; the dashboard entry passes everything', async () => {
  const staging = readFileSync(new URL('../scripts/staging-entry.js', import.meta.url), 'utf8');
  assert.match(staging, /url\.pathname === MUSE_CHALLENGE_PATH\) return worker\.fetch\(request, env, ctx\);/);
  assert.ok(!/startsWith\('\/\.well-known/.test(staging), 'no other .well-known path is passed through');
  const { default: entry } = await import('../scripts/staging-entry.js');
  const env = { STRIPE_MODE: 'test', STAGING_SITE_COMMIT: 'not-set' };
  const res = await entry.fetch(new Request(`https://whyhumanoid-premium-test.javier-198.workers.dev${PATH}`), env, {});
  assert.equal(res.status, 200, 'answered by the Worker, before the staging site checks');
  assert.equal(await res.text(), EXPECTED);
  const other = await entry.fetch(new Request(`https://whyhumanoid-premium-test.javier-198.workers.dev/.well-known/muse-challenge/${'0'.repeat(64)}`), env, {});
  assert.equal(other.status, 503, 'any other path still goes to the staging site (here unconfigured)');
  const dashboard = readFileSync(new URL('../scripts/dashboard-entry.js', import.meta.url), 'utf8');
  assert.match(dashboard, /return worker\.fetch\(request, env, ctx\);/, 'the production entry hands every other path to the Worker');
});
