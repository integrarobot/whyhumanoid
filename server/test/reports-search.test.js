// Reports in the global search and the MCP search tool (27 Nov 2026), from the reviewed public atlas
// (data/reports/atlas.json). Real public report metadata and checked findings; synthetic database rows otherwise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { T0, setup, signIn } from './helpers.js';
import { upsertStripeEntitlement } from '../src/entitlements.js';
import { reportSearchDocs } from '../src/reports/search.js';

const atlas = JSON.parse(readFileSync(new URL('../../data/reports/atlas.json', import.meta.url), 'utf8'));
const GS = atlas.reports.find((r) => r.publisher.startsWith('Goldman Sachs'));
const PLAYGROUND = atlas.reports.find((r) => r.publisher === 'Playground');

async function ctxWithSubscriber() {
  const ctx = await setup();
  const { session, accountId } = await signIn(ctx);
  await upsertStripeEntitlement(ctx.db, { accountId, subscriptionId: 'sub_fx', status: 'active', currentPeriodEnd: T0 + 365 * 86400, cancelAtPeriodEnd: false, eventCreated: T0, now: T0 });
  const get = async (qs, token) => { const r = await ctx.call('GET', `/v1/search?${qs}`, { token }); assert.equal(r.status, 200); return r.json(); };
  return { ctx, session, get };
}

test('Goldman Sachs finds its report first and its checked findings, with canonical links; never Playground', async () => {
  const { get } = await ctxWithSubscriber();
  const body = await get('q=Goldman+Sachs');
  assert.equal(body.scope, 'preview');
  const top = body.results[0];
  assert.deepEqual([top.category, top.category_title, top.id, top.link], ['reports', 'Reports', GS.id, `/reports/${GS.slug}/`]);
  assert.equal(top.title, GS.title);
  assert.match(top.subtitle, /^Goldman Sachs Equity Research · 2024-01-08/);
  const findings = body.results.filter((r) => r.category === 'reports' && r.id !== GS.id);
  assert.ok(findings.length >= 5, `findings found: ${findings.length}`);
  for (const f of findings) assert.match(f.link, new RegExp(`^/reports/[a-z0-9-]+/#f-${f.id}$`));
  assert.ok(findings.some((f) => f.link.startsWith(`/reports/${GS.slug}/#f-gs-`)), 'Goldman’s own findings');
  const own = body.results.findIndex((r) => r.link.startsWith(`/reports/${GS.slug}/#f-`));
  const citing = body.results.findIndex((r) => r.category === 'reports' && !r.link.startsWith(`/reports/${GS.slug}/`));
  assert.ok(own === 1 && (citing === -1 || citing > own), `own findings right after the report (${own}), citations after (${citing})`);
  // A finding another report cites says so in its source label.
  const cited = findings.find((f) => f.id === 'fayd-gs-ship-2035');
  assert.ok(cited && /citing Goldman Sachs/.test(cited.subtitle), cited?.subtitle);
  assert.ok(!body.results.some((r) => r.id === PLAYGROUND.id || r.link.includes(PLAYGROUND.slug)), 'no false match to Playground');
  assert.ok(body.categories.find((c) => c.id === 'reports').count >= findings.length + 1, 'the category count includes the report and its findings');
});

test('a report is found by its title, its authors and its topic; Playground by its own name', async () => {
  const { get } = await ctxWithSubscriber();
  const first = async (q) => (await get(`q=${encodeURIComponent(q)}&category=reports`)).results[0];
  assert.equal((await first('Rise of the machines')).link, '/reports/bluebay-physical-ai-rise-of-the-machines-2026/');
  assert.equal((await first('Massenkoff')).link, '/reports/anthropic-what-work-can-robots-do-2026/');
  assert.equal((await first('Berg Insight')).id, 'RPT-011');
  assert.equal((await first('Playground')).id, PLAYGROUND.id);
  const topic = await get('q=bill+of+materials&category=reports');
  assert.ok(topic.total > 0 && topic.results.every((r) => r.category === 'reports'), 'a topic finds findings');
  // A report still being checked is listed with that status; unchecked findings are not published, so not indexed.
  const pending = atlas.reports.find((r) => r.check?.status !== 'verified');
  const p = await first(pending.publisher.split(' ')[0]);
  assert.equal(p.id, pending.id);
  assert.match(p.subtitle, /not yet checked against the original/);
  const unpublished = atlas.findings.filter((f) => f.check?.status !== 'verified').map((f) => f.id);
  assert.ok(unpublished.length > 0);
  assert.ok(!reportSearchDocs().some((d) => unpublished.includes(d.row_id)));
  assert.equal(reportSearchDocs().length, atlas.reports.length + atlas.findings.filter((f) => f.check?.status === 'verified').length);
});

test('Reports: a visitor and a subscriber get identical results, counts and pages; the category browses and pages', async () => {
  const { session, get } = await ctxWithSubscriber();
  const strip = ({ scope, ...rest }) => rest;
  for (const qs of ['q=goldman', 'q=humanoid&category=reports', 'category=reports&page=2', 'q=china&category=reports']) {
    const visitor = await get(qs);
    const subscriber = await get(qs, session);
    assert.equal(subscriber.scope, 'full');
    const pick = (b) => ({ ...strip(b), results: b.results.filter((r) => r.category === 'reports'), categories: b.categories.filter((c) => c.id === 'reports'), facets: [] });
    assert.deepEqual(pick(visitor), pick(subscriber), qs);
  }
  const browse = await get('category=reports');
  assert.equal(browse.total, reportSearchDocs().length);
  assert.equal(browse.pages, Math.ceil(browse.total / 20));
  assert.equal(browse.results.length, 20);
  assert.ok(browse.categories.some((c) => c.id === 'reports' && c.active));
});

test('every Reports link points to a published page and anchor', () => {
  const root = new URL('../../', import.meta.url);
  for (const d of reportSearchDocs()) {
    const [, slug, anchor] = d.link.match(/^\/reports\/([a-z0-9-]+)\/(?:#(f-[a-z0-9-]+))?$/) ?? [];
    assert.ok(slug, d.link);
    const file = new URL(`reports/${slug}/index.html`, root);
    assert.ok(existsSync(file), `${d.link}: page exists`);
    if (anchor) assert.ok(readFileSync(file, 'utf8').includes(`id="${anchor}"`), `${d.link}: anchor exists`);
  }
});

test('MCP search_catalogue finds Goldman Sachs in Reports; get_atlas is unchanged', async () => {
  const ctx = await setup();
  const fetchImpl = async (url, init = {}) => ctx.call(init.method ?? 'GET', new URL(url).pathname, { body: init.body, headers: Object.fromEntries(new Headers(init.headers).entries()) });
  const client = new Client({ name: 'test-agent', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('https://api.test/mcp'), { fetch: fetchImpl }));
  const out = JSON.parse((await client.callTool({ name: 'search_catalogue', arguments: { query: 'Goldman Sachs' } })).content[0].text);
  assert.equal(out.results[0].category, 'reports');
  assert.equal(out.results[0].link, `/reports/${GS.slug}/`);
  const tools = (await client.listTools()).tools.map((t) => t.name);
  assert.ok(tools.includes('get_atlas'));
  await client.close();
});
