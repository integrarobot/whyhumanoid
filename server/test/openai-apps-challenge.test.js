// OpenAI Apps domain verification (26 Nov 2026): GET /.well-known/openai-apps-challenge answers the public challenge
// token as plain text, on the same Worker that serves /mcp, without reading the database, secrets or credentials.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.js';
import worker from '../src/worker.js';
import { OPENAI_APPS_CHALLENGE_PATH, OPENAI_APPS_CHALLENGE_TOKEN } from '../src/openai-apps-challenge.js';

// The literal the OpenAI portal expects, pinned here so a change to the module cannot pass unnoticed.
const EXPECTED = 'aFaAZIEpwgk7flron0F8ZuZ66IWE_4L9h-N2Lns_JHg';

test('challenge: GET answers exactly the token as text/plain, with no newline and no JSON', async () => {
  const ctx = await setup();
  assert.equal(OPENAI_APPS_CHALLENGE_PATH, '/.well-known/openai-apps-challenge');
  assert.equal(OPENAI_APPS_CHALLENGE_TOKEN, EXPECTED);
  const res = await ctx.call('GET', OPENAI_APPS_CHALLENGE_PATH);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  const body = await res.text();
  assert.equal(body, EXPECTED, 'body is the token byte for byte');
  assert.equal(res.headers.get('content-length'), String(body.length));
  // A query string (cache busting by a checker) does not change the answer.
  assert.equal(await (await ctx.call('GET', `${OPENAI_APPS_CHALLENGE_PATH}?ts=1`)).text(), EXPECTED);
});

test('challenge: HEAD answers the same headers with an empty body', async () => {
  const ctx = await setup();
  const res = await ctx.call('HEAD', OPENAI_APPS_CHALLENGE_PATH);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(res.headers.get('content-length'), String(EXPECTED.length));
  assert.equal(await res.text(), '');
});

test('challenge: needs no credential and ignores one; only GET and HEAD, only the exact path', async () => {
  const ctx = await setup();
  for (const headers of [{}, { authorization: 'Bearer not-a-real-key' }, { authorization: 'Basic x' }]) {
    const res = await ctx.call('GET', OPENAI_APPS_CHALLENGE_PATH, { headers });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), EXPECTED);
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const res = await ctx.call(method, OPENAI_APPS_CHALLENGE_PATH, { body: '{}' });
    assert.equal(res.status, 405, `${method} is not allowed`);
    assert.ok(!(await res.text()).includes(EXPECTED));
  }
  for (const path of [`${OPENAI_APPS_CHALLENGE_PATH}/`, '/.well-known/openai-apps-challenge.txt', '/.well-known/', '/openai-apps-challenge']) {
    assert.equal((await ctx.call('GET', path)).status, 404, `${path} is not the challenge`);
  }
});

test('challenge: the rest of the Worker is unchanged (MCP, health, HEAD elsewhere)', async () => {
  const ctx = await setup();
  assert.equal((await ctx.call('GET', '/mcp')).status, 405, 'GET /mcp still asks for POST');
  assert.equal((await ctx.call('HEAD', '/mcp')).status, 405, 'HEAD is added for the challenge only');
  assert.equal((await ctx.call('HEAD', '/health')).status, 405);
  assert.deepEqual(await (await ctx.call('GET', '/health')).json(), { ok: true });
});

test('challenge: the deployed entry point answers it without querying D1 or echoing any secret', async () => {
  // Any use of the database throws. The Worker builds its configuration from env on every request (as before this
  // route), so secrets get sentinel values; the answer must contain none of them.
  const forbidden = new Proxy({}, { get(_, key) { throw new Error(`the challenge used env.DB.${String(key)}`); } });
  const sentinels = {};
  const env = new Proxy({ DB: forbidden }, {
    get(target, key) {
      if (key === 'DB') return target.DB;
      if (typeof key === 'string' && /KEY|SECRET|TOKEN|PRIVATE|WORKBOOK/.test(key)) return (sentinels[key] = `sentinel-${key}`);
      return undefined;
    },
  });
  const res = await worker.fetch(new Request(`https://whyhumanoid-premium.javier-198.workers.dev${OPENAI_APPS_CHALLENGE_PATH}`), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  const body = await res.text();
  assert.equal(body, EXPECTED);
  const headers = JSON.stringify([...res.headers]);
  for (const value of Object.values(sentinels)) assert.ok(!body.includes(value) && !headers.includes(value), 'no env value in the answer');
});
