// MCP endpoint (25 Nov 2026), exercised with the official MCP client (@modelcontextprotocol/sdk, Streamable HTTP):
// the same credentials, entitlement, field boundary and fair-use limits as the HTTP API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { T0, sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';
import { PUBLIC_FIELDS } from '../src/access/fields.js';

async function connect(ctx, token) {
  // The client's HTTP goes straight into the app (no network).
  const fetchImpl = async (url, init = {}) => {
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    return ctx.call(init.method ?? 'GET', new URL(url).pathname, { body: init.body, headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) } });
  };
  const client = new Client({ name: 'test-agent', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('https://api.test/mcp'), { fetch: fetchImpl }));
  return client;
}
const parse = (result) => JSON.parse(result.content[0].text);

async function subscriberKey(ctx) {
  const { session, accountId } = await signIn(ctx);
  await sendWebhook(ctx, subscriptionEvent({ accountId }));
  const key = (await (await ctx.call('POST', '/v1/api-keys', { token: session, body: { label: 'mcp' } })).json()).api_key;
  return { session, key };
}

test('MCP: a real client lists the read-only tools and reads public values without a credential', async () => {
  const ctx = await setup();
  const client = await connect(ctx, null);
  const tools = (await client.listTools()).tools.map((t) => t.name).sort();
  assert.deepEqual(tools, ['account_status', 'get_atlas', 'get_relations', 'get_rows', 'list_categories', 'search_catalogue']);
  const status = parse(await client.callTool({ name: 'account_status', arguments: {} }));
  assert.equal(status.subscription_active, false);
  assert.equal(status.limits.perMinute, 60);
  const dep = parse(await client.callTool({ name: 'get_rows', arguments: { table: 'deployments', limit: 5 } }));
  assert.equal(dep.fields, 'public');
  const allowed = new Set(['id', ...PUBLIC_FIELDS.deployments]);
  assert.ok(dep.rows.length && dep.rows.every((r) => Object.keys(r).every((k) => allowed.has(k) || k === '_row')), 'public fields only');
  const counted = parse(await client.callTool({ name: 'get_rows', arguments: { table: 'evidence-links' } }));
  assert.equal(counted.fields, 'none');
  assert.equal(counted.rows, undefined);
  const free = parse(await client.callTool({ name: 'get_rows', arguments: { table: 'humanoids', limit: 2 } }));
  assert.equal(free.fields, 'public');
  assert.equal(free.rows.length, 2);
  await client.close();
});

test('MCP: a subscriber API key reads every field; a revoked key is refused; a non-subscriber key gets public fields', async () => {
  const ctx = await setup();
  const { session, key } = await subscriberKey(ctx);
  const client = await connect(ctx, key);
  const dep = parse(await client.callTool({ name: 'get_rows', arguments: { table: 'deployments', limit: 3 } }));
  assert.equal(dep.fields, 'all');
  assert.ok(Object.keys(dep.rows[0]).length > PUBLIC_FIELDS.deployments.length, 'more than the public fields');
  assert.equal(parse(await client.callTool({ name: 'account_status', arguments: {} })).subscription_active, true);
  await client.close();
  // Revoke the key: the MCP endpoint answers 401, like the API.
  const list = (await (await ctx.call('GET', '/v1/api-keys', { token: session })).json()).keys;
  assert.equal(list.length, 1);
  assert.equal((await ctx.call('POST', `/v1/api-keys/${list[0].id}/revoke`, { token: session })).status, 200);
  await assert.rejects(connect(ctx, key));
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments', { token: key })).status, 401);
  // Subscription ended: the same kind of key reads public values only.
  const ctx2 = await setup();
  const s2 = await subscriberKey(ctx2);
  await sendWebhook(ctx2, subscriptionEvent({ id: 'evt_end', type: 'customer.subscription.deleted', status: 'canceled', created: T0 + 10, accountId: (await ctx2.db.prepare('SELECT id FROM accounts').first()).id }));
  const c2 = await connect(ctx2, s2.key);
  assert.equal(parse(await c2.callTool({ name: 'get_rows', arguments: { table: 'deployments', limit: 3 } })).fields, 'public');
  await c2.close();
});

test('MCP: published atlases (Reports included) come from the public site files', async () => {
  const ctx = await setup();
  ctx.publicFiles.set('/data/reports/atlas.json', JSON.stringify({ title: 'Research Conclusions Atlas', findings: [] }));
  const client = await connect(ctx, null);
  const atlas = parse(await client.callTool({ name: 'get_atlas', arguments: { name: 'reports' } }));
  assert.equal(atlas.title, 'Research Conclusions Atlas');
  const cats = parse(await client.callTool({ name: 'list_categories', arguments: {} }));
  assert.deepEqual(cats.atlases.map((a) => a.id), ['datasets', 'benchmarks', 'reports', 'integrators', 'evolution']);
  await client.close();
});

test('fair use: an API key is limited to 60 requests a minute (429 with Retry-After), on the API and MCP alike', async () => {
  const ctx = await setup();
  const { key } = await subscriberKey(ctx);
  for (let i = 0; i < 60; i += 1) assert.equal((await ctx.call('GET', '/v1/datasets/humanoids?limit=1', { token: key })).status, 200);
  const over = await ctx.call('GET', '/v1/datasets/humanoids?limit=1', { token: key });
  assert.equal(over.status, 429);
  assert.ok(Number(over.headers.get('retry-after')) > 0);
  assert.match((await over.json()).detail, /60 requests a minute and 5,000 a day/);
  const mcp = await ctx.call('POST', '/mcp', { token: key, body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }, headers: { accept: 'application/json, text/event-stream' } });
  assert.equal(mcp.status, 429);
  // The next minute opens again; browser sessions are not metered.
  ctx.setNow(T0 + 60);
  assert.equal((await ctx.call('GET', '/v1/datasets/humanoids?limit=1', { token: key })).status, 200);
});
