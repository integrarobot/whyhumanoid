#!/usr/bin/env node
// Investment research desk snapshot (26 Nov 2026). Reads a PRIVATE workbook export (kept outside Git) for one tab only,
// Investment Theses, and joins each thesis to its listed company of the public Investment snapshot
// (data/preview/stocks.json) by the company's row in the Investment tab, checking name, ticker and ISIN. Writes the
// public snapshot data/investment/desk.json: every thesis record with allowlisted fields only, and for every listed
// company its market-data mapping (TradingView widget symbol with one status per capability, outside links).
// Never written: the private catalogue link of each thesis, the THESIS_RECORDS deep links, row numbers, import dates,
// prices or any other value of the premium workbook. Reviewed reading (segments, provider mapping, browser checks and
// reader-facing rewording): tools/investment-review.json.
//
//   node --no-warnings tools/export-investment.mjs --from <export.json> --exported-at <ISO time of the workbook export>
//   node tools/export-investment.mjs --check        validates the committed snapshot without the source

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const FILE = new URL('data/investment/desk.json', root);
const NEWS_FILE = new URL('server/src/news/symbols.js', root);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);

export const THESIS_HEADERS = [
  'Company', 'Publishing entity', 'Publication date', "Main conclusions (publisher's thesis)", 'Source link', 'Publication title',
  'Robotics exposure', 'Thesis type', 'Valuation / investment rationale', 'Limits and evidence status', 'Evidence locator',
  'Verified on', 'Thesis ID', 'Ticker (Stocks)', 'Exchange (Stocks)', 'Report period / model horizon', 'Stocks row',
  'Position / stance', 'Investment row (master)', 'Company ISIN (master)', 'Source catalogue', 'Imported at',
];
// Public fields of a thesis, in display order, and the cell each comes from. Nothing else of the row is written.
const THESIS_FIELDS = [
  ['id', 'Thesis ID'], ['company', 'Company'], ['publisher', 'Publishing entity'], ['published', 'Publication date'],
  ['period', 'Report period / model horizon'], ['title', 'Publication title'], ['stance', 'Position / stance'],
  ['type', 'Thesis type'], ['exposure', 'Robotics exposure'], ['conclusions', "Main conclusions (publisher's thesis)"],
  ['rationale', 'Valuation / investment rationale'], ['limits', 'Limits and evidence status'], ['locator', 'Evidence locator'],
  ['source_url', 'Source link'], ['verified_on', 'Verified on'],
];
const TEXT_FIELDS = ['title', 'exposure', 'conclusions', 'rationale', 'limits', 'locator', 'period', 'type', 'stance'];
export const THESIS_KEYS = ['id', 'security', 'company', 'publisher', 'published', 'period', 'title', 'stance', 'stance_group', 'type', 'exposure', 'conclusions', 'rationale', 'limits', 'locator', 'source_url', 'verified_on', 'semiconductor'];
export const SECURITY_KEYS = ['key', 'name', 'ticker', 'exchange', 'segment', 'description', 'etf', 'tradingview', 'links', 'theses'];
export const CAPABILITIES = ['chart', 'financials', 'profile', 'news'];
const STATUSES = new Set(['verified', 'unverified', 'unavailable']);

export const CAVEATS = [
  'Each thesis is the view of the firm that published it, as recorded with a link to its source: an opinion or forecast, not a fact and not independent research. Valuations, targets and horizons are historic, in the currency and for the period the publisher used.',
  'No thesis in this catalogue does not mean that no thesis exists.',
  'A thesis about semiconductors, sensors or software is not evidence of revenue from humanoid robots.',
  'Publisher names are shown as each source states them. Several funds can belong to one management firm, so the number of names is not a number of independent firms.',
  'Quotes, charts, financials, profiles and optional top stories are TradingView widgets, loaded from TradingView in your browser: not Why Humanoid? data, possibly delayed or end-of-day, and not available for every exchange. Recent headlines come from Yahoo Finance\'s public feed through our server, which keeps a shared copy for up to 30 minutes.',
  'Nothing here is investment advice or a recommendation.',
];

// Words that tie a public cell to the private workbook or the research workflow; none may remain after text_edits.
const PRIVATE = /docs\.google\.com|drive\.google\.com|spreadsheets\/d\/|[\w.+-]+@[\w-]+\.[\w.]+|\b403\b|web reader|PDF metadata/i;
const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const s = (v) => String(v ?? '').trim();

function stanceGroup(stance) {
  if (/^Positive\b/.test(stance)) return 'positive';
  if (/^Exit\b/.test(stance)) return 'exit';
  if (/^Mixed\b/.test(stance)) return 'mixed';
  return null;
}
const SEMI = /semiconductor|\bchips?\b|\bcompute\b/i;

// The TradingView symbol and capability statuses of one listed company (Google Finance symbol as recorded).
export function tradingView(gf, review) {
  const [prefix, ticker] = gf.split(':');
  const ex = review.tradingview[prefix];
  if (!ex) return { symbol: null, venue: null, ...Object.fromEntries(CAPABILITIES.map((c) => [c, { status: 'unavailable', reason: 'This exchange is not mapped to TradingView.' }])) };
  const symbol = `${ex.prefix}:${prefix === 'STO' ? ticker.replace(/-/g, '_') : ticker}`;
  const checked = review.symbols[symbol];
  const out = { symbol, venue: ex.venue, url: `https://www.tradingview.com/symbols/${symbol.replace(':', '-')}/` };
  for (const c of CAPABILITIES) {
    const status = checked?.[c] ?? ex[c];
    const reason = checked?.[`${c}_reason`] ?? (checked?.[c] ? null : ex[`${c}_reason`]) ?? null;
    out[c] = { status, ...(reason && status === 'unavailable' ? { reason } : {}), ...(checked?.[`${c}_note`] ? { note: checked[`${c}_note`] } : {}), ...(checked?.[c] ? { checked_at: checked.checked_at } : {}) };
  }
  if (!checked) out.checked_at = null;
  return out;
}

export function yahooSymbol(gf, review) {
  const [prefix, ticker] = gf.split(':');
  const suffix = review.yahoo[prefix];
  if (suffix === undefined) return null;
  const t = prefix === 'HKG' ? ticker.padStart(4, '0') : ticker.replace('.', '-');
  return `${t}${suffix}`;
}

// English display of the recorded business description (Spanish in the workbook): a reviewed translation of each
// distinct text, or the holdings template translated by pattern. A translation of our research note, not issuer text.
const HOLDINGS = /^Empresa incluida en las carteras oficiales de ([A-Z, ]+) al (\d{2})\/(\d{2})\/(\d{4})\.(?: Sector del gestor: ([^.]+)\.)? Actividad específica en humanoides pendiente de contraste\.$/;
export function describe(text, review) {
  const t = s(text);
  if (!t) return null;
  if (review.descriptions[t]) return review.descriptions[t];
  const m = t.match(HOLDINGS);
  if (!m) return undefined;
  const sector = m[5] ? review.description_patterns.sectors[m[5]] : null;
  if (m[5] && !sector) return undefined;
  return `Included in the published holdings of ${m[1].split(',').map((x) => x.trim()).join(', ')} as of ${m[4]}-${m[3]}-${m[2]}.${sector ? ` Fund manager's sector: ${sector}.` : ''} Its specific humanoid activity has not yet been checked.`;
}

export function securityOf(r, review, thesisIds) {
  const yahoo = yahooSymbol(r.gf_symbol, review);
  return {
    key: r.gf_symbol,
    name: r.name,
    ticker: r.ticker,
    exchange: r.exchange,
    segment: review.segments[r.segment] ?? null,
    description: describe(r.description, review) ?? null,
    etf: s(r.etf_membership) ? r.etf_membership.split(';').map((x) => x.trim()).filter(Boolean) : [],
    tradingview: tradingView(r.gf_symbol, review),
    links: {
      google_finance: /^https:\/\/www\.google\.com\/finance\/quote\//.test(r.finance_url ?? '') ? r.finance_url : null,
      yahoo_finance: yahoo ? `https://finance.yahoo.com/quote/${encodeURIComponent(yahoo)}/` : null,
      website: /^https?:\/\//.test(r.url ?? '') ? r.url : null,
    },
    theses: thesisIds,
  };
}

// Builds the desk from the Investment Theses tab (rows with the header first), the public stocks snapshot and the review.
export function buildDesk(thesisRows, stocks, review, { exportedAt }) {
  const problems = [];
  const [head, ...body] = thesisRows;
  const h = head.map(s);
  for (const k of THESIS_HEADERS) if (!h.includes(k)) problems.push(`Investment Theses: missing column ${k}`);
  if (problems.length) throw new Error(problems.join('\n'));
  const rows = body.filter((r) => r.some((v) => s(v))).map((r) => Object.fromEntries(h.map((k, i) => [k, s(r[i])])));
  const byRow = new Map(stocks.rows.map((r) => [r._row + 1, r]));
  const used = new Map(review.text_edits.map((e) => [e.from, 0]));
  const ids = new Set();
  const theses = [];
  for (const r of rows) {
    const id = r['Thesis ID'];
    if (!id || ids.has(id)) problems.push(`thesis id missing or repeated: ${id}`);
    ids.add(id);
    const co = byRow.get(Number(r['Investment row (master)']));
    if (!co) { problems.push(`${id}: no listed company at its Investment row`); continue; }
    if (co.name !== r.Company || co.ticker !== r['Ticker (Stocks)'] || co.exchange !== r['Exchange (Stocks)']) problems.push(`${id}: company, ticker or exchange differs from its Investment row (${co.name} ${co.ticker} ${co.exchange})`);
    if (r['Company ISIN (master)'] && s(co.isin) && r['Company ISIN (master)'] !== co.isin) problems.push(`${id}: ISIN differs from its Investment row`);
    const t = { security: co.gf_symbol };
    for (const [k, col] of THESIS_FIELDS) t[k] = r[col];
    for (const k of TEXT_FIELDS) {
      for (const e of review.text_edits) if (t[k].includes(e.from)) { t[k] = t[k].replace(e.from, e.to).trim(); used.set(e.from, used.get(e.from) + 1); }
    }
    t.published = /^not stated$/i.test(t.published) ? null : t.published;
    if (t.published !== null && !DATE.test(t.published)) problems.push(`${id}: publication date ${t.published}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.verified_on)) problems.push(`${id}: verified date ${t.verified_on}`);
    if (!/^https:\/\//.test(t.source_url) || /\s/.test(t.source_url)) problems.push(`${id}: source link`);
    t.stance_group = stanceGroup(t.stance);
    if (!t.stance_group) problems.push(`${id}: stance outside Positive / Exit / Mixed: ${t.stance}`);
    t.semiconductor = SEMI.test(t.exposure);
    for (const k of ['company', 'publisher', 'title', 'conclusions', 'exposure', 'type']) if (!t[k]) problems.push(`${id}: empty ${k}`);
    theses.push(Object.fromEntries(THESIS_KEYS.map((k) => [k, t[k]])));
  }
  for (const [from, n] of used) if (!n) problems.push(`text edit not found in any cell: ${from.slice(0, 60)}`);
  const byKey = new Map();
  for (const t of theses) byKey.set(t.security, [...(byKey.get(t.security) ?? []), t.id]);
  const securities = stocks.rows.map((r) => securityOf(r, review, byKey.get(r.gf_symbol) ?? []));
  for (const r of stocks.rows) if (!review.segments[r.segment]) problems.push(`segment without a reviewed English label: ${r.segment}`);
  for (const r of stocks.rows) if (describe(r.description, review) === undefined) problems.push(`${r.gf_symbol}: description without a reviewed English translation`);
  for (const sym of Object.keys(review.symbols)) if (!securities.some((x) => x.tradingview.symbol === sym)) problems.push(`checked symbol ${sym} is not a listed company`);
  const desk = {
    id: 'investment-desk',
    exported_at: exportedAt,
    stocks_snapshot: stocks.snapshot,
    counts: {
      securities: securities.length,
      theses: theses.length,
      companies_with_theses: byKey.size,
      publisher_names: new Set(theses.map((t) => t.publisher)).size,
    },
    caveats: CAVEATS,
    theses,
    securities,
  };
  problems.push(...snapshotProblems(desk, stocks));
  if (problems.length) throw new Error(`investment desk validation failed:\n- ${problems.join('\n- ')}`);
  return desk;
}

// Contract of the public snapshot, checked on every build and in CI without the private source.
export function snapshotProblems(desk, stocks) {
  const p = [];
  const raw = JSON.stringify(desk);
  if (PRIVATE.test(raw)) p.push(`private link, address or workflow wording in the snapshot: ${raw.match(PRIVATE)[0]}`);
  if (/_row|stocks row|investment row|imported/i.test(raw)) p.push('row numbers or import dates in the snapshot');
  if (/\bStocks\b/.test(JSON.stringify(desk.theses))) p.push('a thesis names the workbook tab Stocks');
  if (desk.securities.length !== stocks.rows.length) p.push(`securities ${desk.securities.length} != listed companies ${stocks.rows.length}`);
  const keys = new Set(desk.securities.map((x) => x.key));
  const ids = new Set();
  for (const t of desk.theses) {
    if (Object.keys(t).join() !== THESIS_KEYS.join()) p.push(`${t.id}: fields outside the allowlist`);
    if (!keys.has(t.security)) p.push(`${t.id}: security ${t.security} not listed`);
    if (ids.has(t.id)) p.push(`${t.id}: repeated`);
    ids.add(t.id);
  }
  for (const x of desk.securities) {
    if (Object.keys(x).join() !== SECURITY_KEYS.join()) p.push(`${x.key}: fields outside the allowlist`);
    for (const c of CAPABILITIES) if (!STATUSES.has(x.tradingview[c]?.status)) p.push(`${x.key}: ${c} status`);
    for (const c of CAPABILITIES) if (x.tradingview[c].status === 'unavailable' && !x.tradingview[c].reason) p.push(`${x.key}: ${c} unavailable without a reason`);
    for (const id of x.theses) if (!ids.has(id)) p.push(`${x.key}: thesis ${id} missing`);
  }
  const n = desk.securities.reduce((a, x) => a + x.theses.length, 0);
  if (n !== desk.theses.length) p.push(`theses joined ${n} != records ${desk.theses.length}`);
  if (desk.counts.theses !== desk.theses.length || desk.counts.securities !== desk.securities.length) p.push('counts');
  return p;
}

// The Worker's news allowlist (server/src/news/symbols.js): listed company key -> Yahoo Finance symbol and name. Only
// these symbols can be fetched by GET /v1/news.
export function newsSymbolsModule(desk, review) {
  const map = Object.fromEntries(desk.securities.map((x) => [x.key, yahooSymbol(x.key, review)]).filter(([, y]) => y).map(([k, y]) => [k, { yahoo: y, name: desk.securities.find((x) => x.key === k).name }]));
  return `// Generated by tools/export-investment.mjs from data/investment/desk.json: do not edit. The listed companies whose\n// recent headlines GET /v1/news may fetch, with their Yahoo Finance symbol (server/src/news/yahoo.js).\nexport const NEWS_SYMBOLS = ${JSON.stringify(map, null, 1)};\n`;
}

function main() {
  const stocks = read('data/preview/stocks.json');
  const review = read('tools/investment-review.json');
  if (process.argv.includes('--check')) {
    const desk = arg('--desk') ? JSON.parse(readFileSync(arg('--desk'), 'utf8')) : read('data/investment/desk.json');
    const p = snapshotProblems(desk, stocks);
    // The mapping is reproducible from the public inputs: it must match what the review gives today.
    for (const x of desk.securities) {
      const r = stocks.rows.find((y) => y.gf_symbol === x.key);
      if (!r) { p.push(`${x.key}: not in the stocks snapshot`); continue; }
      const again = securityOf(r, review, x.theses);
      if (JSON.stringify(again) !== JSON.stringify(x)) p.push(`${x.key}: stale mapping; regenerate with --from`);
    }
    if (readFileSync(NEWS_FILE, 'utf8') !== newsSymbolsModule(desk, review)) p.push('server/src/news/symbols.js is stale; regenerate with --from');
    if (JSON.stringify(desk.caveats) !== JSON.stringify(CAVEATS)) p.push('caveats are stale; regenerate with --from');
    if (p.length) { console.error(`investment desk: ${p.length} problem(s)\n- ${p.join('\n- ')}`); process.exit(1); }
    console.log(`investment desk ok: ${desk.counts.theses} theses on ${desk.counts.companies_with_theses} of ${desk.counts.securities} listed companies`);
    return;
  }
  const from = arg('--from');
  const exportedAt = arg('--exported-at');
  if (!from || !exportedAt || Number.isNaN(Date.parse(exportedAt))) { console.error('usage: --from <export.json> --exported-at <ISO>'); process.exit(2); }
  const values = JSON.parse(readFileSync(from, 'utf8'));
  const tab = values['Investment Theses'];
  if (!tab?.length) { console.error('the export has no Investment Theses tab'); process.exit(1); }
  const desk = buildDesk(tab, stocks, review, { exportedAt: new Date(exportedAt).toISOString() });
  mkdirSync(new URL('data/investment/', root), { recursive: true });
  writeFileSync(FILE, `${JSON.stringify(desk, null, 1)}\n`);
  mkdirSync(new URL('server/src/news/', root), { recursive: true });
  writeFileSync(NEWS_FILE, newsSymbolsModule(desk, review));
  const st = (c, v) => desk.securities.filter((x) => x.tradingview[c].status === v).length;
  console.log(`wrote data/investment/desk.json: ${desk.counts.theses} theses, ${desk.counts.companies_with_theses} companies with theses, ${desk.counts.securities} listed companies`);
  for (const c of CAPABILITIES) console.log(`  ${c}: verified ${st(c, 'verified')}, unverified ${st(c, 'unverified')}, unavailable ${st(c, 'unavailable')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
