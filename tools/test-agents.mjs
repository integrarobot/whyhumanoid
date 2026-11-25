// Agent access, tested with the real clients over HTTP (node --no-warnings --test tools/test-agents.mjs; in CI).
// One server: the API (createApp with synthetic data and the test Stripe fixtures) plus the site's public files. The CLI
// runs as a separate process, exactly as a user runs agents/whyhumanoid.mjs; the MCP client is the official SDK.
// Each integration has one real command: subscriber, no subscription, revoked key.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setup, signIn, sendWebhook, subscriptionEvent } from '../server/test/helpers.js';

const require = createRequire(new URL('../server/package.json', import.meta.url));
// File URLs, not bare paths: the checkout directory may contain spaces or '?' (Codex, 25 Nov 2026).
const { Client } = await import(pathToFileURL(require.resolve('@modelcontextprotocol/sdk/client/index.js')).href);
const { StreamableHTTPClientTransport } = await import(pathToFileURL(require.resolve('@modelcontextprotocol/sdk/client/streamableHttp.js')).href);
const root = new URL('../', import.meta.url);
const CLI = fileURLToPath(new URL('agents/whyhumanoid.mjs', root));

const ctx = await setup();
for (const name of ['reports', 'datasets', 'benchmarks', 'integrators']) ctx.publicFiles.set(`/data/${name}/atlas.json`, await readFile(new URL(`data/${name}/atlas.json`, root), 'utf8'));
const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const url = new URL(req.url, 'http://local');
  if (url.pathname.startsWith('/data/')) {
    try { return res.writeHead(200, { 'content-type': 'application/json' }).end(await readFile(new URL(url.pathname.slice(1), root))); } catch { return res.writeHead(404).end(); }
  }
  const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => !['host', 'content-length', 'connection'].includes(k)));
  const r = await ctx.call(req.method, url.pathname + url.search, { headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks).toString() });
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const cli = (args, key) => new Promise((ok) => execFile(process.execPath, [CLI, ...args, '--api', BASE, '--site', BASE], { env: { ...process.env, WHYHUMANOID_API_KEY: key ?? '' } }, (error, stdout, stderr) => ok({ code: error?.code ?? 0, out: stdout, err: stderr })));
async function mcp(key) {
  const client = new Client({ name: 'test-agent', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', BASE), { requestInit: key ? { headers: { authorization: `Bearer ${key}` } } : {} }));
  return client;
}
const json = (r) => JSON.parse(r.content[0].text);

const buyer = await signIn(ctx, 'agent-owner@example.com');
await sendWebhook(ctx, subscriptionEvent({ accountId: buyer.accountId }));
const key = (await (await ctx.call('POST', '/v1/api-keys', { token: buyer.session, body: { label: 'cli' } })).json()).api_key;

test('CLI: a subscriber key reads every field of Deployments; without a key, the public fields; help and errors are plain', async () => {
  const full = await cli(['rows', 'deployments', '--limit', '2'], key);
  assert.equal(full.code, 0, full.err);
  const rows = JSON.parse(full.out).rows;
  assert.equal(rows.length, 2);
  assert.ok(Object.keys(rows[0]).includes('task_description'), 'a paid field is there for a subscriber');
  const pub = await cli(['rows', 'deployments', '--limit', '2']);
  assert.equal(pub.code, 0, pub.err);
  assert.ok(!Object.keys(JSON.parse(pub.out).rows[0]).includes('task_description'), 'no paid field without a key');
  const account = JSON.parse((await cli(['account'], key)).out);
  assert.equal(account.access.active, true);
  const help = await cli(['--help']);
  assert.match(help.out, /60 requests a minute and 5,000 a day/);
  const atlas = await cli(['atlas', 'reports']);
  assert.equal(atlas.code, 0, atlas.err);
  assert.ok(JSON.parse(atlas.out).title, 'the Reports atlas is read from the published file');
});

test('MCP over HTTP with the official client: subscriber, visitor, then the same key revoked', async () => {
  const sub = await mcp(key);
  assert.equal(json(await sub.callTool({ name: 'get_rows', arguments: { table: 'deployments', limit: 1 } })).fields, 'all');
  await sub.close();
  const visitor = await mcp(null);
  assert.equal(json(await visitor.callTool({ name: 'get_rows', arguments: { table: 'deployments', limit: 1 } })).fields, 'public');
  const reports = json(await visitor.callTool({ name: 'get_atlas', arguments: { name: 'reports' } }));
  assert.ok(reports.title);
  await visitor.close();
  const id = (await (await ctx.call('GET', '/v1/api-keys', { token: buyer.session })).json()).keys[0].id;
  await ctx.call('POST', `/v1/api-keys/${id}/revoke`, { token: buyer.session });
  await assert.rejects(mcp(key));
  const revoked = await cli(['rows', 'deployments'], key);
  assert.equal(revoked.code, 1);
  assert.match(revoked.err, /refused \(unknown, revoked or expired\)/);
});
