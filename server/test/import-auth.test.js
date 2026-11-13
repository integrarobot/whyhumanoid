// Import authentication with the GitHub Actions OIDC token: only this repository's import workflow, for the
// Worker's own GitHub environment and an allowed branch, can trigger an import. No shared secret exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { base64url } from '../src/crypto.js';
import { createApp } from '../src/app.js';
import {
  IMPORT_AUDIENCE,
  IMPORT_REPOSITORY_ID,
  IMPORT_WORKFLOW,
  resetJwksCache,
  verifyImportToken,
} from '../src/import/github-oidc.js';
import { createTestDb, T0 } from './helpers.js';

const enc = new TextEncoder();
const keyPair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const otherPair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const publicJwk = { ...(await crypto.subtle.exportKey('jwk', keyPair.publicKey)), kid: 'github-fixture', alg: 'RS256', use: 'sig' };
const jwksFetch = async (url) => {
  assert.equal(url, 'https://token.actions.githubusercontent.com/.well-known/jwks');
  return new Response(JSON.stringify({ keys: [publicJwk] }));
};

function claims(overrides = {}) {
  return {
    iss: 'https://token.actions.githubusercontent.com',
    aud: IMPORT_AUDIENCE,
    sub: 'repo:integrarobot/whyhumanoid:environment:test',
    repository: 'integrarobot/whyhumanoid',
    repository_id: IMPORT_REPOSITORY_ID,
    environment: 'test',
    ref: 'refs/heads/feat/premium-preview',
    job_workflow_ref: `${IMPORT_WORKFLOW}@refs/heads/feat/premium-preview`,
    iat: T0 - 10,
    nbf: T0 - 10,
    exp: T0 + 300,
    ...overrides,
  };
}

async function sign(payload, { key = keyPair.privateKey, kid = 'github-fixture' } = {}) {
  const head = base64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })));
  const body = base64url(enc.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${head}.${body}`));
  return `${head}.${body}.${base64url(new Uint8Array(signature))}`;
}

const verify = (token, environment = 'test') => verifyImportToken(token, { environment, now: T0, fetchImpl: jwksFetch });

test('the import workflow token for the test environment on the PR branch is accepted', async () => {
  resetJwksCache();
  const verdict = await verify(await sign(claims()));
  assert.equal(verdict.ok, true);
  assert.equal(verdict.claims.environment, 'test');
});

test('tokens from anywhere else are rejected, each for its own reason', async () => {
  resetJwksCache();
  const cases = [
    [claims({ aud: 'https://github.com/integrarobot' }), 'wrong_audience'],
    [claims({ iss: 'https://example.com' }), 'wrong_issuer'],
    [claims({ exp: T0 - 120 }), 'expired'],
    [claims({ repository_id: '1' }), 'wrong_repository'],
    [claims({ environment: 'production' }), 'wrong_environment'],
    [claims({ ref: 'refs/heads/other', job_workflow_ref: `${IMPORT_WORKFLOW}@refs/heads/other` }), 'ref_not_allowed'],
    [claims({ job_workflow_ref: 'integrarobot/whyhumanoid/.github/workflows/ci.yml@refs/heads/feat/premium-preview' }), 'wrong_workflow'],
  ];
  for (const [payload, reason] of cases) {
    const verdict = await verify(await sign(payload));
    assert.deepEqual(verdict, { ok: false, reason }, reason);
  }
  assert.equal((await verify(await sign(claims(), { key: otherPair.privateKey }))).reason, 'bad_signature');
  assert.equal((await verify(await sign(claims(), { kid: 'unknown' }))).reason, 'unknown_signing_key');
  assert.equal((await verify('not.a.jwt')).reason, 'malformed_token');
});

test('production accepts only main, and a test token never works on production', async () => {
  resetJwksCache();
  const branchToken = await sign(claims({ environment: 'production', sub: 'repo:integrarobot/whyhumanoid:environment:production' }));
  assert.equal((await verify(branchToken, 'production')).reason, 'ref_not_allowed');
  const mainToken = await sign(
    claims({ environment: 'production', ref: 'refs/heads/main', job_workflow_ref: `${IMPORT_WORKFLOW}@refs/heads/main` }),
  );
  assert.equal((await verify(mainToken, 'production')).ok, true);
  assert.equal((await verify(await sign(claims()), 'production')).reason, 'wrong_environment');
});

test('the admin import route runs the import with the Google token only for an accepted workflow token', async () => {
  const calls = [];
  const app = createApp({
    db: createTestDb(),
    config: { allowedOrigins: [], importEnvironment: 'test', adminToken: null },
    gateway: {},
    mailer: {},
    importNow: async (googleToken) => {
      calls.push(googleToken);
      return { ok: true, counts: { humanoids: 3 }, warnings: [] };
    },
    importAuth: (token, opts) => verifyImportToken(token, { ...opts, fetchImpl: jwksFetch }),
    clock: () => T0,
    log: { error() {}, warn() {} },
  });
  const post = (headers) => app(new Request('https://api.test/v1/admin/import', { method: 'POST', headers }));

  const ok = await post({ authorization: `Bearer ${await sign(claims())}`, 'x-google-access-token': 'google-fixture' });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true, counts: { humanoids: 3 }, warnings: 0 });
  assert.deepEqual(calls, ['google-fixture']);

  const wrongEnv = await post({ authorization: `Bearer ${await sign(claims({ environment: 'production' }))}` });
  assert.equal(wrongEnv.status, 401);
  assert.equal((await post({})).status, 401);
  assert.equal((await post({ 'x-admin-token': 'guess' })).status, 401);
  assert.equal(calls.length, 1);
});
