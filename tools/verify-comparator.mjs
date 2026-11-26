// Headless check of the company comparator on /investment/ (26 Nov 2026). Run from tools/: node verify-comparator.mjs
// Loads the generated page in JSDOM with assets/investment.js and drives the three slots: start message, full list of
// every company whatever the directory filters, search by name, ticker, ISIN and exchange, no match, keyboard
// (arrows, Enter, Escape, Tab), one company per slot, replace, clear, and the no-JavaScript fallback.
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('investment/index.html', root), 'utf8').replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
const js = readFileSync(new URL('assets/investment.js', root), 'utf8');
const failures = [];
const ok = (c, m) => { if (!c) failures.push(m); };

const noJs = new JSDOM(html).window.document;
ok(!noJs.querySelector('.inv-cmp-nojs').hidden && noJs.querySelector('.inv-cmp-slots').hidden, 'without JavaScript the note shows and the slots stay hidden');
ok(noJs.querySelectorAll('#inv-companies tbody tr').length === 276, 'the directory keeps every company without JavaScript');

const dom = new JSDOM(html, { url: 'https://whyhumanoid.com/investment/', runScripts: 'outside-only' });
const w = dom.window;
const d = w.document;
w.HTMLElement.prototype.scrollIntoView = function () {};
w.eval(js);
const total = d.querySelectorAll('#inv-companies tbody tr').length;
const status = () => d.getElementById('cmp-status').textContent;
const input = (n) => d.getElementById(`cmp-input-${n}`);
const options = (n) => [...d.querySelectorAll(`#cmp-list-${n} [role=option]`)];
const card = (n) => d.querySelector(`.inv-slot[data-slot="${n}"] .inv-slot-card`);
const key = (n, k) => input(n).dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const type = (n, v) => { input(n).value = v; input(n).dispatchEvent(new w.Event('input', { bubbles: true })); };

ok(total === 276, `276 companies in the directory, found ${total}`);
ok(d.querySelectorAll('.inv-slot').length === 3, 'three slots');
ok(d.querySelectorAll('#inv-companies input[type=checkbox]').length === 0, 'no comparison checkbox in the rows');
ok(d.querySelectorAll('#inv-companies .inv-row-tools button').length === 276, 'every row keeps its watchlist star');
ok(d.querySelector('.inv-cmp-nojs').hidden && !d.querySelector('.inv-cmp-slots').hidden, 'with JavaScript the slots show');
ok(status() === 'No company chosen yet.', `start message: ${status()}`);

// Directory filters and the watchlist do not narrow the comparator.
const q = d.querySelector('form.inv-filters input[type=search]');
q.value = 'zzzz-nothing'; q.dispatchEvent(new w.Event('input', { bubbles: true }));
d.querySelector('form.inv-filters input[name=watch]').checked = true;
input(1).click();
ok(options(1).length === total && input(1).getAttribute('aria-expanded') === 'true', 'the full list opens whatever the filters');
key(1, 'Escape');
ok(d.getElementById('cmp-list-1').hidden && input(1).getAttribute('aria-expanded') === 'false', 'Escape closes the list');

type(1, 'tesla');
ok(/^Tesla/.test(options(1)[0]?.textContent ?? '') && input(1).getAttribute('aria-activedescendant') === 'cmp-1-opt-0', 'search by name, first match active');
key(1, 'Enter');
ok(input(1).value === 'Tesla' && card(1).querySelector('h4 a')?.getAttribute('href') === '/companies/tesla/', 'Enter chooses Tesla, its card links to its page');
ok(status() === '1 company chosen. Add another to compare.', `one company: ${status()}`);

type(2, '6954');
ok(options(2).length === 1 && /Fanuc/i.test(options(2)[0].textContent), 'search by ticker');
key(2, 'Enter');
type(3, 'US88160R1014');
ok(options(3).length === 1 && options(3)[0].getAttribute('aria-disabled') === 'true' && /in Company 1/.test(options(3)[0].textContent), 'search by ISIN; a company in another slot is marked and disabled');
key(3, 'Enter');
ok(/already in Company 1/.test(status()) && card(3).textContent === 'No company chosen.', 'the same company cannot be chosen twice');
type(3, 'qqqzzz');
ok(options(3).length === 1 && options(3)[0].getAttribute('aria-disabled') === 'true' && /No company matches/.test(status()), 'no match is stated');
key(3, 'Tab');
ok(d.getElementById('cmp-list-3').hidden && input(3).value === '', 'Tab closes the list and restores the slot');
type(3, 'Hong Kong');
ok(options(3).length > 1 && options(3).every((o) => /Hong Kong/.test(o.textContent)), 'search by exchange');
key(3, 'ArrowDown'); key(3, 'ArrowDown'); key(3, 'ArrowUp');
ok(input(3).getAttribute('aria-activedescendant') === 'cmp-3-opt-1', 'arrows move the active option');
key(3, 'Enter');
const third = input(3).value;
ok(third && card(3).querySelector('h4'), 'third company chosen');
ok(status() === 'Comparing 3 companies.', `three companies: ${status()}`);

type(1, 'nvidia'); options(1)[0].click();
ok(/NVIDIA/i.test(input(1).value) && /NVIDIA/i.test(card(1).querySelector('h4').textContent), 'a slot can be replaced');
type(2, 'tesla');
ok(options(2)[0].getAttribute('aria-disabled') === null, 'a replaced company is free again');
key(2, 'Escape');
ok(/Fanuc/i.test(input(2).value), 'Escape restores the chosen company');
d.querySelector('.inv-slot[data-slot="2"] .inv-slot-clear').click();
ok(input(2).value === '' && card(2).textContent === 'No company chosen.' && /NVIDIA/i.test(input(1).value) && input(3).value === third, 'one slot clears on its own');
ok(status() === 'Comparing 2 companies.', `two companies: ${status()}`);
ok(card(1).querySelectorAll('dl.inv-fields > div').length === 9, 'nine fields per company');

// Valuation (26 Nov 2026): market cap and P/E from one official TradingView Symbol Info widget per slot, revenue and
// growth from the SEC snapshot inline in the page. jsdom does not load the widget script: only its tag is checked.
const tvScripts = (n) => [...d.querySelectorAll(`.inv-slot[data-slot="${n}"] script[src]`)];
const fresh = new JSDOM(html, { url: 'https://whyhumanoid.com/investment/', runScripts: 'outside-only' });
fresh.window.HTMLElement.prototype.scrollIntoView = function () {};
fresh.window.eval(js);
{
  const D = fresh.window.document;
  const typeIn = (n, v) => { const el = D.getElementById(`cmp-input-${n}`); el.value = v; el.dispatchEvent(new fresh.window.Event('input', { bubbles: true })); el.dispatchEvent(new fresh.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); };
  const slot = (n) => D.querySelector(`.inv-slot[data-slot="${n}"]`);
  const scripts = (n) => [...slot(n).querySelectorAll('script[src]')];
  ok(D.querySelectorAll('script[src*="tradingview"]').length === 0, 'no widget before a company is chosen');
  typeIn(1, 'tesla');
  const s1 = scripts(1);
  ok(s1.length === 1 && s1[0].src.endsWith('/embed-widget-symbol-info.js') && JSON.parse(s1[0].text).symbol === 'NASDAQ:TSLA' && JSON.parse(s1[0].text).colorTheme === 'dark', 'Tesla: one Symbol Info widget for NASDAQ:TSLA');
  ok(slot(1).querySelector('.tradingview-widget-copyright a')?.textContent === 'Track all markets on TradingView', 'the TradingView credit is shown');
  const val = slot(1).querySelector('dl.inv-val').textContent;
  ok(/USD 94\.83 bn/.test(val) && /Fiscal year 2025-01-01 to 2025-12-31/.test(val) && /SEC Form 10-K filed 2026-01-29/.test(val), `Tesla revenue from its 10-K: ${val}`);
  ok(/\u22122\.9%/.test(val) && /Previous fiscal year 2024-01-01 to 2024-12-31: USD 97\.69 bn \(same Form 10-K\)/.test(val), 'Tesla growth with its base, dates and source');
  ok(slot(1).querySelector('dl.inv-val a')?.getAttribute('href') === 'https://www.sec.gov/Archives/edgar/data/1318605/000162828026003952/', 'links the SEC filing');
  typeIn(2, '6954');
  const f2 = scripts(2);
  ok(f2.length === 1 && f2[0].src.endsWith('/embed-widget-financials.js') && JSON.parse(f2[0].text).symbol === 'TSE:6954' && JSON.parse(f2[0].text).displayMode === 'compact', 'FANUC: no quote widget there, so the financials widget');
  const fv = slot(2).querySelector('dl.inv-val').textContent;
  ok(/JPY 857\.83 bn/.test(fv) && /Fiscal year 2025-04-01 to 2026-03-31/.test(fv) && /\+7\.6%/.test(fv) && /fiscal 2025/.test(fv) && /PDF p\.1/.test(fv), `FANUC revenue from its annual report: ${fv}`);
  ok(slot(2).querySelector('dl.inv-val a')?.getAttribute('href') === 'https://www.fanuc.co.jp/en/ir/announce/pdf/2026/financialresult202603_e.pdf', 'FANUC links its report');
  typeIn(3, 'nvidia');
  ok(/\+65\.5%/.test(slot(3).querySelector('dl.inv-val').textContent), 'NVIDIA growth');
  ok(D.querySelectorAll('script[src*="tradingview"]').length === 3, 'one widget per slot, three at most');
  const clear1 = slot(1).querySelector('.inv-slot-clear');
  typeIn(1, 'schaeffler');
  ok(scripts(1).length === 1 && JSON.parse(scripts(1)[0].text).symbol === 'XETR:SHA0', 'replacing a company replaces its widget');
  ok(/Vitesco/.test(slot(1).querySelector('dl.inv-val').textContent) && /\+29\.2%/.test(slot(1).querySelector('dl.inv-val').textContent), 'Schaeffler: reported growth with its Vitesco note');
  clear1.click();
  ok(scripts(1).length === 0 && D.querySelectorAll('script[src*="tradingview"]').length === 2, 'clearing a slot removes its widget');
  typeIn(1, 'aurora');
  ok(/Not meaningful: previous year revenue is zero or less/.test(slot(1).querySelector('dl.inv-val').textContent), 'a zero base is not meaningful, not zero growth');
}


if (failures.length) {
  console.error(`Comparator check FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Comparator check passed: three slots over all ${total} companies, search, keyboard, one company per slot, replace, clear, the no-JavaScript fallback, one quote widget per slot and SEC revenue with its base.`);
