// Investment research desk views (26 Nov 2026): the /investment/ directory (search, filters, sorting, counters,
// watchlist, comparison, every thesis record) and, on each listed company's page, its market data (TradingView widgets
// per capability, recent headlines through GET /v1/news, outside links) and its dated, attributed thesis cards. From
// the public snapshot data/investment/desk.json (tools/export-investment.mjs) and the public stocks snapshot.

import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
export const readDesk = () => JSON.parse(readFileSync(new URL('data/investment/desk.json', root), 'utf8'));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const ext = (u, label) => `<a href="${esc(u)}" rel="noopener noreferrer">${esc(label ?? host(u))}</a>`;
const na = (t = 'Not recorded') => `<span class="na">${esc(t)}</span>`;
const uniq = (a) => [...new Set(a)];
const STANCE = { positive: 'Positive', exit: 'Exit', mixed: 'Mixed' };
const CHART_LABEL = { verified: 'Chart checked', unverified: 'Chart not yet checked', unavailable: 'No chart here' };

export function deskIndex(desk) {
  const byKey = new Map(desk.securities.map((x) => [x.key, x]));
  const thesis = new Map(desk.theses.map((t) => [t.id, t]));
  return { byKey, thesis, thesesOf: (key) => (byKey.get(key)?.theses ?? []).map((id) => thesis.get(id)) };
}

const when = (t) => (t.published ? esc(t.published) : `<span class="na">Publication date not stated</span>`);
const pill = (cls, label) => `<span class="pill ${esc(cls)}">${esc(label)}</span>`;

export function caveatsHtml(desk) {
  return `<ul class="readkey">${desk.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`;
}

// ---------- /investment/ ----------
function options(values, label) {
  return `<option value="">${esc(label)}</option>${values.map(([v, l]) => `<option value="${esc(v)}">${esc(l ?? v)}</option>`).join('')}`;
}

export function renderInvestmentDesk(desk, { rows, companyOf }) {
  const ix = deskIndex(desk);
  const items = rows.map((r) => {
    const x = ix.byKey.get(r.gf_symbol);
    const theses = ix.thesesOf(r.gf_symbol);
    const co = companyOf(r);
    return { r, x, theses, path: co?.path ?? null };
  });
  const withT = items.filter((i) => i.theses.length).length;
  const charts = items.filter((i) => i.x.tradingview.chart.status !== 'unavailable').length;
  const venues = uniq(items.map((i) => i.x.tradingview.venue ?? i.r.exchange)).sort();
  const countries = uniq(items.map((i) => i.r.country).filter(Boolean)).sort();
  const segments = uniq(items.map((i) => i.x.segment).filter(Boolean)).sort();
  const etfs = uniq(items.flatMap((i) => i.x.etf)).sort();
  const publishers = uniq(desk.theses.map((t) => t.publisher)).sort((a, b) => a.localeCompare(b));
  const types = uniq(desk.theses.map((t) => t.type)).sort();
  const row = ({ r, x, theses, path }) => {
    const stances = uniq(theses.map((t) => t.stance_group));
    const pubs = uniq(theses.map((t) => t.publisher));
    const venue = x.tradingview.venue ?? r.exchange;
    const search = [r.name, r.ticker, r.exchange, venue, x.key, r.isin, ...pubs].filter(Boolean).join(' ').toLowerCase();
    const data = {
      key: x.key, name: r.name, path: path ?? '', ticker: r.ticker, exchange: venue, isin: r.isin ?? '', country: r.country ?? '', segment: x.segment ?? '',
      etf: x.etf.join('|'), theses: String(theses.length), stances: stances.join('|'), publishers: pubs.join('|'), chart: x.tradingview.chart.status, search,
    };
    const attrs = Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
    return `<tr ${attrs}><td><span class="inv-row-tools"></span> ${path ? `<a href="${esc(path)}">${esc(r.name)}</a>` : esc(r.name)}</td><td>${esc(r.ticker ?? '')}<br><span class="dim">${esc(venue)}</span></td><td>${esc(r.country ?? '')}</td><td>${x.segment ? esc(x.segment) : na()}</td><td>${x.etf.length ? x.etf.map((e) => pill('', e)).join('') : na('None')}</td><td>${theses.length ? `${theses.length} ${stances.map((s) => pill(s, STANCE[s])).join('')}` : '<span class="na">0</span>'}</td><td>${pill(x.tradingview.chart.status, CHART_LABEL[x.tradingview.chart.status])}</td></tr>`;
  };
  const tRow = (t) => {
    const x = ix.byKey.get(t.security);
    const item = items.find((i) => i.x === x);
    const search = [t.company, t.publisher, t.title, t.type, t.exposure, x.ticker].join(' ').toLowerCase();
    const attrs = { key: t.id, company: t.company, publisher: t.publisher, date: t.published ?? '', stance: t.stance_group, type: t.type, search };
    return `<tr ${Object.entries(attrs).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}><td>${item?.path ? `<a href="${esc(item.path)}#theses">${esc(t.company)}</a>` : esc(t.company)}</td><td>${esc(t.publisher)}</td><td>${t.published ? esc(t.published) : `<span class="na">Not stated</span>`}<br><span class="dim">${esc(t.period)}</span></td><td>${pill(t.stance_group, t.stance)}</td><td>${esc(t.type)}</td><td>${ext(t.source_url, t.title)}</td></tr>`;
  };
  return `<nav class="jump" aria-label="On this page"><a href="#desk">Companies (${items.length})</a><a href="#comparator">Company comparator</a><a href="#theses">Investment theses (${desk.theses.length})</a><a href="#funding">Funding of humanoid makers</a></nav>
<section id="desk"><h2>Listed companies <span class="dim">(${items.length})</span></h2>
<p class="inv-counters"><span><b>${items.length}</b> listed companies</span><span><b>${withT}</b> with a thesis in this catalogue</span><a href="#theses"><b>${desk.theses.length}</b> thesis records</a><span><b>${charts}</b> with a chart offered here</span><span><b>${items.length - charts}</b> without a chart here</span></p>
${comparatorHtml(items.length)}
<form class="inv-filters" data-for="inv-companies" data-count="inv-count" hidden>
<label class="wide">Search company, ticker, ISIN or publisher<input type="search" name="q" autocomplete="off" placeholder="e.g. Tesla, 6954, Baillie Gifford"></label>
<label>Segment<select name="segment">${options(segments.map((v) => [v]), 'All segments')}</select></label>
<label>ETF membership<select name="etf" data-mode="tokens">${options(etfs.map((v) => [v]), 'Any or none')}</select></label>
<label>Country<select name="country">${options(countries.map((v) => [v]), 'All countries')}</select></label>
<label>Exchange<select name="exchange">${options(venues.map((v) => [v]), 'All exchanges')}</select></label>
<label>Thesis coverage<select name="theses" data-mode="has"><option value="">Any</option><option value="with">With a thesis here</option><option value="without">No thesis here</option></select></label>
<label>Stance<select name="stances" data-mode="tokens">${options(Object.entries(STANCE), 'Any stance')}</select></label>
<label>Publisher<select name="publishers" data-mode="tokens">${options(publishers.map((v) => [v]), 'Any publisher')}</select></label>
<label>Chart here<select name="chart">${options(Object.entries(CHART_LABEL), 'Any')}</select></label>
<label class="check"><input type="checkbox" name="watch"> Watchlist only</label>
<span><button type="reset">Clear filters</button></span>
</form>
<p class="inv-bar"><span id="inv-count" aria-live="polite"></span><span class="dim">★ adds a company to a watchlist kept in this browser only.</span></p>
<div class="scroll"><table class="dir" id="inv-companies"><thead><tr><th scope="col" data-sort="name">Company</th><th scope="col" data-sort="ticker">Ticker</th><th scope="col" data-sort="country">Country as recorded</th><th scope="col" data-sort="segment">Segment as recorded</th><th scope="col">ETF membership</th><th scope="col" data-sort="theses" data-type="number">Theses</th><th scope="col" data-sort="chart">Market data</th></tr></thead><tbody>${items.map(row).join('')}</tbody></table></div>
<p class="key">Segments and ETF membership as recorded in our research (ETF holdings as of ${esc(uniq(rows.map((r) => r.etf_as_of).filter(Boolean)).join(', ') || 'the dates on each page')}). “Chart checked” means the TradingView chart was seen working for that symbol in a browser; “not yet checked” means it is offered but not yet confirmed. Quotes are not stored or published by Why Humanoid?.</p>
</section>
<section id="theses"><h2>Investment theses <span class="dim">(${desk.theses.length} records on ${desk.counts.companies_with_theses} companies)</span></h2>
${caveatsHtml(desk)}
<form class="inv-filters" data-for="inv-theses" data-count="inv-theses-count" hidden>
<label class="wide">Search company, publisher, title or exposure<input type="search" name="q" autocomplete="off"></label>
<label>Stance<select name="stance">${options(Object.entries(STANCE), 'Any stance')}</select></label>
<label>Publisher<select name="publisher">${options(publishers.map((v) => [v]), 'Any publisher')}</select></label>
<label>Type<select name="type">${options(types.map((v) => [v]), 'Any type')}</select></label>
<span><button type="reset">Clear filters</button></span>
</form>
<p class="inv-bar"><span id="inv-theses-count" aria-live="polite"></span></p>
<div class="scroll"><table class="dir" id="inv-theses"><thead><tr><th scope="col" data-sort="company">Company</th><th scope="col" data-sort="publisher">Publisher as stated</th><th scope="col" data-sort="date">Published (period below)</th><th scope="col" data-sort="stance">Stance as recorded</th><th scope="col" data-sort="type">Type</th><th scope="col">Source</th></tr></thead><tbody>${desk.theses.map(tRow).join('')}</tbody></table></div>
<p class="key">${desk.counts.publisher_names} publisher names as the sources give them; several are funds of the same management firm. Each company page shows its theses in full, with the publisher's conclusions, valuation or rationale, horizon, limits and where in the source to find them.</p>
</section>`;
}

// ---------- company comparator ----------
// Three equal slots, each a searchable list of every listed company in the directory below (assets/investment.js
// reads the rows, not the filters, order or watchlist). Without JavaScript the note says so and the directory keeps
// every field.
export const COMPARATOR_SLOTS = 3;
function comparatorHtml(total) {
  const slot = (i) => `<div class="inv-slot" data-slot="${i}">
<label class="inv-slot-label" id="cmp-label-${i}" for="cmp-input-${i}">Company ${i}</label>
<div class="inv-combo">
<input id="cmp-input-${i}" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cmp-list-${i}" aria-describedby="cmp-hint" autocomplete="off" spellcheck="false" placeholder="Search name, ticker, ISIN or exchange">
<button type="button" class="inv-combo-open" aria-label="Show all ${total} companies for Company ${i}" aria-controls="cmp-list-${i}" tabindex="-1">▾</button>
<ul class="inv-combo-list" id="cmp-list-${i}" role="listbox" aria-labelledby="cmp-label-${i}" hidden></ul>
</div>
<button type="button" class="inv-slot-clear" hidden>Clear Company ${i}</button>
<div class="inv-slot-card"><p class="dim">No company chosen.</p></div>
</div>`;
  return `<section class="inv-comparator" id="comparator" aria-labelledby="comparator-h">
<h3 id="comparator-h">Company comparator</h3>
<p class="inv-cmp-nojs">The comparator needs JavaScript. Every company and the same fields are in the directory below.</p>
<p class="dim" id="cmp-hint" hidden>Choose up to three of the ${total} listed companies. Type a name, ticker, ISIN or exchange, or open the full list; each company can be in one slot only.</p>
<div class="inv-cmp-slots" hidden>${Array.from({ length: COMPARATOR_SLOTS }, (_, k) => slot(k + 1)).join('')}</div>
<p class="inv-cmp-status" id="cmp-status" aria-live="polite" hidden></p>
</section>`;
}

// ---------- company pages ----------
function widget(kind, cls, cfg, tvUrl, wait) {
  return `<div class="mkt-frame ${cls}" data-tv-widget="${esc(kind)}" data-tv-config="${esc(JSON.stringify(cfg))}"><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"><p class="mkt-wait">${esc(wait)}</p></div><div class="tradingview-widget-copyright"><a href="${esc(tvUrl)}" rel="noopener nofollow" target="_blank">Track all markets on TradingView</a></div></div></div>`;
}
function statusLine(cap, what) {
  if (cap.status === 'verified') return `<p class="status">${esc(what)} checked in a browser on ${esc(cap.checked_at)}${cap.note ? `: ${esc(cap.note)}` : ''}.</p>`;
  return `<p class="status">${esc(what)} offered for this symbol but not yet checked in a browser. If TradingView says the symbol is not available, use the links below.</p>`;
}

// The quote and chart of a listing, rendered once per page: at the top of the company page when TradingView offers the
// chart (renderCompanyChart), otherwise in its place in Market data with the honest availability state. The free
// advanced-chart embed takes the dark theme with an explicit black background and a faint grid (its documented
// backgroundColor and gridColor); the quote strip stays transparent on a black host (assets/investment.css).
export const CHART_BG = '#000000';
export const chartOffered = (x) => Boolean(x && x.tradingview.symbol && x.tradingview.chart.status !== 'unavailable');
function quoteChart(x, heading) {
  const tv = x.tradingview;
  const sym = tv.symbol;
  const common = { symbol: sym, locale: 'en', colorTheme: 'dark', isTransparent: true };
  const body = `${widget('advanced-chart', 'chart', { autosize: true, symbol: sym, interval: 'D', timezone: 'Etc/UTC', theme: 'dark', style: '1', locale: 'en', backgroundColor: CHART_BG, gridColor: 'rgba(242, 242, 242, 0.06)', allow_symbol_change: false, withdateranges: true, range: '12M', hide_side_toolbar: true, details: false, hotlist: false, calendar: false, save_image: false, support_host: 'https://www.tradingview.com' }, tv.url, 'The chart loads from TradingView.')}${widget('symbol-info', 'info', { ...common, width: '100%' }, tv.url, 'The quote loads from TradingView.')}${statusLine(tv.chart, 'The chart')}`;
  return `${heading}${tv.chart.status === 'unavailable' ? `<p class="status">Not available here: ${esc(tv.chart.reason)} Use the links below.</p>` : body}`;
}
export function renderCompanyChart(l, x) {
  return `<section class="co-chart" id="quote" aria-labelledby="quote-h"><h2 id="quote-h">Quote and chart <span class="dim">${esc(x.tradingview.symbol)}</span></h2>${quoteChart(x, '')}</section>`;
}

export function renderListingResearch(l, x, theses, { apiOrigin, snapshot, chartAtTop = false }) {
  const tv = x.tradingview;
  const sym = tv.symbol;
  const common = { symbol: sym, locale: 'en', colorTheme: 'dark', isTransparent: true };
  const links = [
    x.links.google_finance && ext(x.links.google_finance, 'Google Finance ↗'),
    x.links.yahoo_finance && ext(x.links.yahoo_finance, 'Yahoo Finance ↗'),
    x.links.yahoo_finance && ext(`${x.links.yahoo_finance}news/`, 'Yahoo Finance news ↗'),
    ext(`https://news.google.com/search?q=${encodeURIComponent(`"${l.name}"`)}&hl=en`, 'Google News search ↗'),
    sym && ext(tv.url, 'TradingView ↗'),
    x.links.website && ext(x.links.website, 'Company website ↗'),
  ].filter(Boolean);
  const linkList = `<ul class="mkt-links">${links.map((a) => `<li>${a}</li>`).join('')}</ul>`;
  const block = (title, cap, body) => `<div class="mkt"><h3>${esc(title)}</h3>${cap.status === 'unavailable' ? `<p class="status">Not available here: ${esc(cap.reason)} Use the links below.</p>` : body}</div>`;
  const chart = chartAtTop ? `<p class="status">The quote and chart are <a href="#quote">at the top of this page</a>.</p>` : `<div class="mkt">${quoteChart(x, '<h3>Quote and chart</h3>')}</div>`;
  const fin = block('Financials', tv.financials, `${statusLine(tv.financials, 'Financials')}<p class="status">Figures follow TradingView's reporting periods, units and currencies, which may differ from the trading currency of the listing. Check the company's own reports before comparing companies.</p>${widget('financials', 'financials', { ...common, displayMode: 'regular', width: '100%', height: '100%' }, tv.url, 'Financials load from TradingView when you reach them.')}`);
  const prof = block('Company profile', tv.profile, `${statusLine(tv.profile, 'The profile')}${widget('symbol-profile', 'profile', { ...common, width: '100%', height: '100%' }, tv.url, 'The profile loads from TradingView when you reach it.')}`);
  const news = !x.links.yahoo_finance ? `<div class="mkt"><h3>Recent headlines</h3><p class="status">No Yahoo Finance symbol is mapped for this company, so no headlines are read here. Use the links below.</p>${linkList}</div>` : `<div class="mkt" data-news-security="${esc(x.key)}" data-news-api="${esc(apiOrigin)}"><h3>Recent headlines</h3><p class="status news-state">Headlines load from Yahoo Finance's public feed when you reach this block.</p><ul class="sources news-list"></ul><p class="key">Headlines, dates and links only, as the feed lists them for this company's Yahoo Finance symbol (${esc(decodeURIComponent(x.links.yahoo_finance.split('/quote/')[1].replace(/\/$/, '')))}). The feed picks them; some may be about the sector rather than the company. No freshness is promised.</p>${linkList}</div>`;
  const stories = tv.news.status === 'unavailable' ? '' : `<details class="mkt"><summary>Top stories on TradingView (optional, may be old or empty)</summary>${widget('timeline', 'news', { ...common, feedMode: 'symbol', displayMode: 'regular', width: '100%', height: '100%' }, tv.url, 'Stories load from TradingView when you open this.')}</details>`;
  return `<nav class="jump" aria-label="On this page"><a href="#market">Market data</a><a href="#theses">Investment theses (${theses.length})</a><a href="#deployment-records">Deployment evidence</a></nav>
<section id="market"><h2>Market data</h2>
<dl class="kv">${[
    ['Ticker', esc(l.ticker)], ['Exchange as recorded', esc(l.exchange)], ['TradingView symbol', sym ? esc(sym) : na('Not mapped')],
    ['Currency as recorded', l.currency ? esc(l.currency) : na()], ['ISIN', l.isin ? esc(l.isin) : na()],
  ].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>
${chart}${fin}${prof}${news}${stories}
<p class="key">Quotes, charts, financials, profiles and stories are TradingView widgets loaded from TradingView in your browser, with the delay TradingView shows; Why Humanoid? does not store them. Recent headlines come from Yahoo Finance's public feed through our server, which keeps a shared copy for up to 30 minutes. None of it is Why Humanoid? research, and nothing here is investment advice. Listing details from the Investment category, snapshot ${esc(String(snapshot).slice(0, 10))}.</p>
</section>`;
}

export function renderTheses(company, theses, desk) {
  if (!theses.length) return `<section id="theses"><h2>Investment theses</h2><p>No thesis about ${esc(company)} is in this catalogue. That does not mean that no thesis exists.</p><p class="key">See all ${desk.theses.length} thesis records on <a href="/investment/#theses">Investment</a>.</p></section>`;
  const card = (t) => `<li class="thesis" id="${esc(t.id)}"><header>${pill(t.stance_group, t.stance)}<b>${esc(t.publisher)}</b><span class="dim">${when(t)} · ${esc(t.period)}</span></header>
<h3>${ext(t.source_url, t.title)}</h3>
<dl>
<dt>Publisher's view</dt><dd>${esc(t.conclusions)}</dd>
<dt>Valuation or rationale, as published</dt><dd>${t.rationale ? esc(t.rationale) : na()}</dd>
<dt>Period or model horizon</dt><dd>${esc(t.period)}</dd>
<dt>Robotics exposure, as described</dt><dd>${esc(t.exposure)}</dd>
<dt>Type</dt><dd>${esc(t.type)}</dd>
<dt>Limits</dt><dd>${t.limits ? esc(t.limits) : na()}</dd>
<dt>Where in the source</dt><dd>${t.locator ? esc(t.locator) : na()}</dd>
<dt>Checked against the source</dt><dd>${esc(t.verified_on)}</dd>
</dl>${t.semiconductor ? '<p class="semi">A thesis about semiconductors or computing is not evidence of revenue from humanoid robots.</p>' : ''}</li>`;
  // Dated records newest first by their publication date; records whose source states no publication date follow in
  // catalogue order. A report period is never used as a publication date.
  const dated = theses.filter((t) => t.published).sort((a, b) => b.published.localeCompare(a.published));
  const undated = theses.filter((t) => !t.published);
  return `<section id="theses"><h2>Investment theses <span class="dim">(${theses.length})</span></h2>
${caveatsHtml(desk)}
${dated.length ? `<h3 class="sub">With a publication date, newest first <span class="dim">(${dated.length})</span></h3><ul class="theses">${dated.map(card).join('')}</ul>` : ''}
${undated.length ? `<h3 class="sub">Publication date not stated by the source <span class="dim">(${undated.length})</span></h3><p class="key">Shown in catalogue order; the report period of each is not a publication date.</p><ul class="theses">${undated.map(card).join('')}</ul>` : ''}
<p class="key">Publishers' opinions and forecasts as their sources state them; historic valuations stay in the publisher's currency and horizon. All ${desk.theses.length} records: <a href="/investment/#theses">Investment</a>.</p></section>`;
}
