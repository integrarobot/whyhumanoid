// Recent headlines of listed companies (26 Nov 2026): GET /v1/news reads Yahoo Finance's public RSS headline feed for
// allowlisted companies only, with the upstream URL built server-side, a timeout, a size limit, no redirects and a
// 30-minute cache. Only headline, link, date and domain are returned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { NEWS_SYMBOLS } from '../src/news/symbols.js';
import { NEWS_MAX_ITEMS, NEWS_TTL_SECONDS, NEWS_USER_AGENT, parseHeadlines } from '../src/news/yahoo.js';
import { T0, createTestDb } from './helpers.js';

const item = (title, link, date, extra = '') => `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate><guid>${link}</guid>${extra}</item>`;
const rss = (items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>Yahoo! Finance</title><copyright>All rights reserved.</copyright>${items.join('')}</channel></rss>`;

function memoryCache() {
  const store = new Map();
  return {
    store,
    async match(req) { const r = store.get(req.url); return r ? r.clone() : undefined; },
    async put(req, res) { store.set(req.url, res.clone()); },
  };
}

function harness({ respond }) {
  const calls = [];
  const cache = memoryCache();
  const newsFetch = async (url, init) => { calls.push({ url, init }); return respond(url, init); };
  const app = createApp({ db: createTestDb(), config: { allowedOrigins: ['https://whyhumanoid.com'] }, gateway: {}, mailer: {}, clock: () => T0, log: { error() {} }, newsFetch, newsCache: cache });
  const get = (q, headers = {}) => app(new Request(`https://api.test/v1/news${q}`, { headers }));
  return { calls, cache, get };
}

test('news: allowlist covers the listed companies with a mapped Yahoo symbol, and Tesla maps to TSLA', () => {
  assert.equal(NEWS_SYMBOLS['NASDAQ:TSLA'].yahoo, 'TSLA');
  assert.equal(NEWS_SYMBOLS['HKG:9880'].yahoo, '9880.HK');
  assert.equal(NEWS_SYMBOLS['TYO:6954'].yahoo, '6954.T');
  assert.equal(NEWS_SYMBOLS['ETR:SHA0'].yahoo, 'SHA0.DE');
  assert.ok(Object.keys(NEWS_SYMBOLS).length > 250);
  for (const [k, v] of Object.entries(NEWS_SYMBOLS)) assert.match(v.yahoo, /^[A-Z0-9.-]+$/, k);
});

test('news: newest first, deduplicated, https only, capped, no summaries', () => {
  const many = Array.from({ length: 14 }, (_, i) => item(`Story ${i}`, `https://finance.yahoo.com/news/s-${i}.html`, new Date(Date.UTC(2026, 10, 1 + i)).toUTCString(), '<description>Full summary text</description>'));
  const xml = rss([
    item('Old &amp; first', 'https://example.com/a', 'Mon, 02 Nov 2026 10:00:00 GMT'),
    item('<![CDATA[Newest <b>story</b>]]>', 'https://www.reuters.com/x', 'Wed, 25 Nov 2026 10:00:00 GMT'),
    item('Duplicate', 'https://www.reuters.com/x', 'Wed, 25 Nov 2026 11:00:00 GMT'),
    item('Insecure', 'http://example.com/b', 'Wed, 25 Nov 2026 12:00:00 GMT'),
    item('Script', 'javascript:alert(1)', 'Wed, 25 Nov 2026 12:00:00 GMT'),
    ...many,
  ]);
  const out = parseHeadlines(xml);
  assert.equal(out.length, NEWS_MAX_ITEMS);
  assert.deepEqual(out[0], { title: 'Newest story', url: 'https://www.reuters.com/x', domain: 'reuters.com', published: '2026-11-25T10:00:00.000Z' });
  assert.ok(out.every((x) => x.url.startsWith('https://')));
  assert.ok(out.every((x) => Object.keys(x).join() === 'title,url,domain,published'));
  for (let i = 1; i < out.length; i += 1) assert.ok(out[i - 1].published >= out[i].published);
});

test('news: one upstream request per 30 minutes, built server-side with a descriptive User-Agent and no redirects', async () => {
  const h = harness({ respond: () => new Response(rss([item('Tesla headline', 'https://finance.yahoo.com/news/t.html', 'Thu, 26 Nov 2026 08:00:00 GMT')]), { status: 200 }) });
  const res = await h.get('?security=NASDAQ:TSLA', { origin: 'https://whyhumanoid.com' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://whyhumanoid.com');
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.items[0].title, 'Tesla headline');
  assert.equal(body.yahoo_symbol, 'TSLA');
  assert.ok(body.fetched_at);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=TSLA&region=US&lang=en-US');
  assert.equal(h.calls[0].init.headers['user-agent'], NEWS_USER_AGENT);
  assert.equal(h.calls[0].init.redirect, 'manual');
  const stored = [...h.cache.store.values()][0];
  assert.equal(stored.headers.get('cache-control'), `public, max-age=${NEWS_TTL_SECONDS}`);
  await h.get('?security=NASDAQ:TSLA');
  assert.equal(h.calls.length, 1, 'second request served from the cache');
});

test('news: unknown or malformed securities never reach upstream', async () => {
  const h = harness({ respond: () => new Response('', { status: 200 }) });
  for (const q of ['?security=NASDAQ:EVIL', '?security=https://evil.example/', '?security=', '?s=TSLA', '?security=NASDAQ:TSLA%26s=X']) {
    const res = await h.get(q);
    assert.ok([400, 404].includes(res.status), q);
  }
  assert.equal(h.calls.length, 0);
});

test('news: 429, redirects, timeouts and oversized feeds give an unavailable state, cached briefly, never retried', async () => {
  let n = 0;
  const h = harness({ respond: () => { n += 1; return new Response('slow down', { status: 429 }); } });
  const body = await (await h.get('?security=HKG:9880')).json();
  assert.equal(body.status, 'unavailable');
  assert.equal(body.reason, 'rate_limited');
  assert.deepEqual(body.items, []);
  await h.get('?security=HKG:9880');
  assert.equal(n, 1);
  const r = harness({ respond: () => new Response(null, { status: 302, headers: { location: 'https://elsewhere.example/' } }) });
  assert.equal((await (await r.get('?security=TYO:6954')).json()).reason, 'upstream_302');
  const big = harness({ respond: () => new Response('x'.repeat(600 * 1024), { status: 200 }) });
  assert.equal((await (await big.get('?security=ETR:SHA0')).json()).reason, 'fetch_failed');
  const empty = harness({ respond: () => new Response(rss([]), { status: 200 }) });
  assert.equal((await (await empty.get('?security=ETR:SHA0')).json()).status, 'empty');
});
