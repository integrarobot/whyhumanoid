// Investment research desk (26 Nov 2026): the public snapshot, its joins and caveats, and the generated pages.
//   node --no-warnings --test tools/test-investment.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { CAPABILITIES, THESIS_KEYS, snapshotProblems, yahooSymbol } from './export-investment.mjs';
import { NEWS_SYMBOLS } from '../server/src/news/symbols.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const desk = JSON.parse(read('data/investment/desk.json'));
const stocks = JSON.parse(read('data/preview/stocks.json'));
const review = JSON.parse(read('tools/investment-review.json'));
const byId = new Map(desk.theses.map((t) => [t.id, t]));
const bySec = new Map(desk.securities.map((x) => [x.key, x]));

test('snapshot: 98 thesis records on 68 companies, every listed company present, allowlisted fields only', () => {
  assert.deepEqual(snapshotProblems(desk, stocks), []);
  assert.equal(desk.theses.length, 98);
  assert.equal(byId.size, 98);
  assert.equal(new Set(desk.theses.map((t) => t.security)).size, 68);
  assert.equal(desk.securities.length, 276);
  for (const t of desk.theses) {
    assert.deepEqual(Object.keys(t), THESIS_KEYS);
    assert.match(t.source_url, /^https:\/\//);
    assert.ok(bySec.get(t.security).theses.includes(t.id));
  }
});

test('snapshot: nothing private, no workflow wording, no quotes', () => {
  const raw = read('data/investment/desk.json');
  assert.doesNotMatch(raw, /docs\.google|drive\.google|spreadsheets\/d\/|THESIS_RECORDS|Source catalogue|Imported at|_row/);
  assert.doesNotMatch(JSON.stringify(desk.theses), /\bStocks\b|web reader|\b403\b|PDF metadata/);
  assert.doesNotMatch(raw, /"(price|change_pct|market_cap|last_trade|quote_status)"/);
});

test('caveats: catalogue coverage, semiconductors and publishers are stated', () => {
  const c = desk.caveats.join(' ');
  assert.match(c, /No thesis in this catalogue does not mean that no thesis exists/);
  assert.match(c, /not evidence of revenue from humanoid robots/);
  assert.match(c, /not a number of independent firms/);
  assert.ok(desk.theses.filter((t) => t.semiconductor).length >= 10);
  assert.ok(desk.theses.filter((t) => /^(NVIDIA|Teradyne|Advantest)/.test(t.company)).every((t) => t.semiconductor));
});

test('Hyundai: the SKAGEN thesis keeps its preference-share distinction', () => {
  const h = desk.theses.filter((t) => t.company === 'Hyundai Motor');
  assert.equal(h.length, 2);
  const skagen = h.find((t) => /SKAGEN/.test(t.publisher));
  assert.match(skagen.limits, /preference shares, not the ordinary shares/);
  assert.equal(skagen.period, '2017-01');
});

test('ARK Tesla: three models with their own dates, horizons and currencies', () => {
  const ark = desk.theses.filter((t) => t.company === 'Tesla' && /^ARK/.test(t.publisher)).sort((a, b) => a.published.localeCompare(b.published));
  assert.deepEqual(ark.map((t) => t.published), ['2023-04-21', '2024-06-12', '2026-10-19']);
  assert.deepEqual(ark.map((t) => t.period.slice(0, 4)), ['2027', '2029', '2031']);
  assert.match(ark[0].rationale, /USD2,000/);
  assert.match(ark[1].rationale, /\$2,600/);
  assert.match(ark[2].rationale, /USD4,400/);
});

test('market data: statuses per capability, unavailable with a reason, Codex browser checks kept', () => {
  for (const x of desk.securities) for (const c of CAPABILITIES) {
    const cap = x.tradingview[c];
    assert.ok(['verified', 'unverified', 'unavailable'].includes(cap.status), `${x.key} ${c}`);
    if (cap.status === 'unavailable') assert.ok(cap.reason, `${x.key} ${c}`);
  }
  assert.equal(bySec.get('TYO:6954').tradingview.chart.status, 'unavailable');
  assert.equal(bySec.get('TYO:6954').tradingview.financials.status, 'verified');
  assert.equal(bySec.get('HKG:9880').tradingview.symbol, 'HKEX:9880');
  assert.equal(bySec.get('NASDAQ:TSLA').tradingview.chart.status, 'verified');
  for (const k of ['TYO', 'HKG', 'KRX', 'KOSDAQ', 'TPE']) {
    assert.ok(desk.securities.filter((x) => x.key.startsWith(`${k}:`)).every((x) => x.tradingview.chart.status === 'unavailable'), k);
  }
});

test('news allowlist: one entry per listed company with a Yahoo symbol, matching the snapshot', () => {
  const expected = desk.securities.filter((x) => yahooSymbol(x.key, review));
  assert.equal(Object.keys(NEWS_SYMBOLS).length, expected.length);
  for (const x of expected) assert.equal(NEWS_SYMBOLS[x.key].yahoo, yahooSymbol(x.key, review));
  assert.equal(NEWS_SYMBOLS['TYO:6954'].yahoo, '6954.T');
  assert.equal(NEWS_SYMBOLS['ETR:SHA0'].yahoo, 'SHA0.DE');
});

test('pages: every listed company page has market data and its theses; the directory lists everything', () => {
  const dir = read('investment/index.html');
  assert.equal((dir.match(/<tr data-key="[A-Z]+:/g) ?? []).length, 276);
  assert.equal((dir.match(/<tr data-key="thesis-/g) ?? []).length, 98);
  let pages = 0;
  let cards = 0;
  for (const slug of readdirSync(new URL('companies/', root))) {
    const f = new URL(`companies/${slug}/index.html`, root);
    if (!existsSync(f)) continue;
    const html = readFileSync(f, 'utf8');
    if (!html.includes('id="market"')) continue;
    pages += 1;
    cards += (html.match(/<li class="thesis"/g) ?? []).length;
    assert.ok(html.includes('id="theses"'), slug);
    assert.doesNotMatch(html, /docs\.google|THESIS_RECORDS/, slug);
  }
  assert.equal(pages, 276);
  assert.equal(cards, 98);
  const fanuc = read('companies/fanuc/index.html');
  assert.doesNotMatch(fanuc, /data-tv-widget="advanced-chart"/);
  assert.match(fanuc, /data-tv-widget="financials"/);
  assert.match(fanuc, /Not available here/);
  const tesla = read('companies/tesla/index.html');
  assert.match(tesla, /data-tv-widget="advanced-chart"[^>]*&quot;allow_symbol_change&quot;:false/);
  assert.match(tesla, /data-news-security="NASDAQ:TSLA"/);
});

test('check: the command prints its result and fails on a tampered snapshot', async () => {
  const { execFileSync, spawnSync } = await import('node:child_process');
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const cmd = fileURLToPath(new URL('export-investment.mjs', import.meta.url));
  assert.match(execFileSync('node', [cmd, '--check'], { encoding: 'utf8' }), /investment desk ok: 98 theses/);
  const dir = mkdtempSync(join(tmpdir(), 'desk check ?'));
  const bad = structuredClone(desk);
  bad.theses[0].source_url = ['https://docs', 'google', 'com/spreadsheets/d/x/edit'].join('.'); // assembled so the public guard does not see a URL
  const f = join(dir, 'desk.json');
  writeFileSync(f, JSON.stringify(bad));
  const r = spawnSync('node', [cmd, '--check', '--desk', f], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /private link/);
});

test('descriptions: every listed company has an English business description, labelled as our translated research', () => {
  assert.ok(desk.securities.every((x) => x.description && !/\b(Empresa|incluida|Desarrolla|Fabricante)\b/.test(x.description)));
  const tesla = read('companies/tesla/index.html');
  assert.match(tesla, /Business description \(our research, translated\)/);
  assert.doesNotMatch(tesla, /Issuer description|what the company says about itself/);
});

test('copy and navigation: provenance stated, jump links before the widgets', () => {
  assert.match(desk.caveats.join(' '), /Recent headlines come from Yahoo Finance/);
  const tesla = read('companies/tesla/index.html');
  assert.match(tesla, /keeps a shared copy for up to 30 minutes/);
  assert.doesNotMatch(tesla, /nothing is stored/);
  assert.match(tesla, /reporting periods, units and currencies/);
  // The quote and chart sit in the page header (26 Nov 2026); the jump links still come before Market data's widgets.
  const jump = tesla.indexOf('class="jump"');
  assert.ok(jump > 0 && jump < tesla.indexOf('data-tv-widget', tesla.indexOf('id="market"')));
  assert.match(tesla, /id="deployment-records"/);
  const dir = read('investment/index.html');
  assert.ok(dir.indexOf('href="#theses"') < dir.indexOf('<table'));
  assert.match(dir, /id="funding"/);
});

test('thesis order: explicit publication dates newest first, undated records apart; no bare valuation on listed pages', () => {
  const tesla = read('companies/tesla/index.html');
  const sec = tesla.slice(tesla.indexOf('<section id="theses">'));
  const dated = sec.slice(0, sec.indexOf('Publication date not stated by the source'));
  const dates = [...dated.matchAll(/<span class="dim">(\d{4}-\d{2}-\d{2}) · /g)].map((m) => m[1]);
  assert.deepEqual(dates, ['2026-10-19', '2026-01-07', '2024-06-12', '2023-04-21']);
  assert.match(sec, /Publication date not stated by the source <span class="dim">\(3\)/);
  assert.doesNotMatch(tesla, /1,502,601,426,120/);
  assert.doesNotMatch(read('investment/index.html'), /1,502,601,426,120|21,568,122,535|35,190,080/);
});

test('company header: the chart is offered once, beside the identity and key facts, dark, and only where TradingView offers it', () => {
  for (const slug of ['tesla', 'schaeffler', 'intuitive-surgical']) {
    const html = read(`companies/${slug}/index.html`);
    assert.equal((html.match(/data-tv-widget="advanced-chart"/g) ?? []).length, 1, `${slug}: one chart`);
    assert.equal((html.match(/data-tv-widget="symbol-info"/g) ?? []).length, 1, `${slug}: one quote`);
    const head = html.indexOf('<div class="co-head with-chart">');
    const quote = html.indexOf('id="quote"');
    const facts = html.indexOf('<div class="co-facts">');
    assert.ok(head > 0 && head < html.indexOf('<h1>') && html.indexOf('<h1>') < quote && quote < facts && facts < html.indexOf('id="market"'), `${slug}: chart between the intro and the key facts`);
    assert.ok(html.indexOf('data-tv-widget="advanced-chart"') < facts, `${slug}: the chart is in the header`);
    assert.match(html, /The quote and chart are <a href="#quote">at the top of this page<\/a>/, slug);
    assert.match(html, /&quot;theme&quot;:&quot;dark&quot;,&quot;style&quot;:&quot;1&quot;,&quot;locale&quot;:&quot;en&quot;,&quot;backgroundColor&quot;:&quot;#000000&quot;,&quot;gridColor&quot;:&quot;rgba\(242, 242, 242, 0\.06\)&quot;,&quot;allow_symbol_change&quot;:false/, slug);
  }
  for (const slug of ['fanuc', 'ubtech']) {
    const html = read(`companies/${slug}/index.html`);
    assert.match(html, /<div class="co-head"><div class="co-id">/, `${slug}: no chart column`);
    assert.doesNotMatch(html, /id="quote"|data-tv-widget="advanced-chart"/, slug);
    assert.match(html, /<h3>Quote and chart<\/h3><p class="status">Not available here: /, `${slug}: the availability state stays in Market data`);
  }
  const css = read('assets/investment.css');
  assert.match(css, /\.mkt-frame \.tradingview-widget-container iframe\{color-scheme:normal;background:#000\}/);
  assert.match(css, /grid-template-areas:"id chart" "facts chart"/);
  // The quote's content needs about 279 px on a phone; its iframe keeps 300 px there, the chart is unchanged.
  assert.match(css, /@media \(max-width:640px\)\{\n  \.mkt-frame\.info \.tradingview-widget-container\{height:auto!important\}\n  \.mkt-frame\.info \.tradingview-widget-container iframe\{flex:none;height:300px!important\}\n\}/);
  assert.match(css, /\.co-chart \.mkt-frame\.chart\{height:360px\}/);
});
