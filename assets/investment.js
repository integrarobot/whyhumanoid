// Investment directory and thesis table (/investment/): search, filters, sorting, counters, a watchlist kept in this
// browser only, and the company comparator: three slots, each a searchable list of every company in the directory.
// Works on the table already in the page; without JavaScript the full tables stay readable.
(function () {
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: no watchlist */ } },
  };
  var WATCH = 'wh-investment-watchlist';
  var watch = store.get(WATCH) || [];

  function tokens(v) { return (v || '').split('|').filter(Boolean); }

  function setup(form) {
    var table = document.getElementById(form.getAttribute('data-for'));
    if (!table) return;
    var tbody = table.tBodies[0];
    var rows = Array.prototype.slice.call(tbody.rows);
    var count = document.getElementById(form.getAttribute('data-count'));
    var total = rows.length;
    form.hidden = false;

    function matches(tr) {
      var ok = true;
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!ok || !el.name || el.type === 'button' || el.type === 'reset') return;
        var attr = 'data-' + el.name;
        if (el.type === 'search') {
          var q = el.value.trim().toLowerCase();
          if (q && (tr.getAttribute('data-search') || '').indexOf(q) < 0) ok = false;
        } else if (el.type === 'checkbox') {
          if (el.checked && el.name === 'watch' && watch.indexOf(tr.getAttribute('data-key')) < 0) ok = false;
        } else if (el.value) {
          var v = tr.getAttribute(attr) || '';
          if (el.getAttribute('data-mode') === 'tokens') { if (tokens(v).indexOf(el.value) < 0) ok = false; }
          else if (el.getAttribute('data-mode') === 'has') { if ((Number(v) > 0) !== (el.value === 'with')) ok = false; }
          else if (v !== el.value) ok = false;
        }
      });
      return ok;
    }
    function apply() {
      var shown = 0;
      rows.forEach(function (tr) { var m = matches(tr); tr.classList.toggle('inv-hidden', !m); if (m) shown += 1; });
      if (count) count.textContent = shown === total ? 'Showing all ' + total : 'Showing ' + shown + ' of ' + total;
    }
    form.addEventListener('input', apply);
    form.addEventListener('change', apply);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    form.addEventListener('reset', function () { setTimeout(apply, 0); });

    // Sorting: each sortable header gets a button; numbers sort as numbers, text by locale, empty values last.
    Array.prototype.forEach.call(table.tHead.rows[0].cells, function (th, i) {
      var key = th.getAttribute('data-sort');
      if (!key) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = th.textContent;
      th.textContent = '';
      th.appendChild(b);
      b.addEventListener('click', function () {
        var dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        Array.prototype.forEach.call(table.tHead.rows[0].cells, function (h) { h.removeAttribute('aria-sort'); });
        th.setAttribute('aria-sort', dir);
        var num = th.getAttribute('data-type') === 'number';
        rows.sort(function (a, z) {
          var x = a.getAttribute('data-' + key) || '', y = z.getAttribute('data-' + key) || '';
          if (!x && y) return 1;
          if (x && !y) return -1;
          var c = num ? Number(x) - Number(y) : x.localeCompare(y);
          return dir === 'ascending' ? c : -c;
        });
        rows.forEach(function (tr) { tbody.appendChild(tr); });
      });
    });

    // Watchlist (this browser only), on the company directory.
    rows.forEach(function (tr) {
      var key = tr.getAttribute('data-key');
      var tools = tr.querySelector('.inv-row-tools');
      if (!tools || !key) return;
      var star = document.createElement('button');
      star.type = 'button';
      star.textContent = '★';
      star.setAttribute('aria-label', 'Watch ' + tr.getAttribute('data-name'));
      star.setAttribute('aria-pressed', String(watch.indexOf(key) >= 0));
      star.addEventListener('click', function () {
        var i = watch.indexOf(key);
        if (i >= 0) watch.splice(i, 1); else watch.push(key);
        store.set(WATCH, watch);
        star.setAttribute('aria-pressed', String(i < 0));
        apply();
      });
      tools.appendChild(star);
    });
    apply();
  }
  Array.prototype.forEach.call(document.querySelectorAll('form.inv-filters[data-for]'), setup);

  // ---------- Company comparator (#comparator) ----------
  // Every row of the company directory, read once in alphabetical order, whatever the filters, sorting or watchlist.
  // Each slot is a combobox with its own listbox; a company can be in one slot only. Text goes in with textContent.
  function fold(v) { return (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function comparator() {
    var box = document.getElementById('comparator');
    var table = document.getElementById('inv-companies');
    if (!box || !table) return;
    var all = Array.prototype.map.call(table.tBodies[0].rows, function (tr) {
      var c = {};
      ['key', 'name', 'path', 'ticker', 'exchange', 'isin', 'country', 'segment', 'etf', 'theses', 'stances', 'publishers', 'chart', 'tv', 'tvurl'].forEach(function (k) { c[k] = tr.getAttribute('data-' + k) || ''; });
      c.search = fold([c.name, c.ticker, c.exchange, c.isin, c.key].join(' '));
      return c;
    }).filter(function (c) { return c.key; }).sort(function (a, z) { return a.name.localeCompare(z.name); });
    var LABEL = { verified: 'Chart checked', unverified: 'Chart not yet checked', unavailable: 'No chart here', positive: 'Positive', exit: 'Exit', mixed: 'Mixed' };
    var FIELDS = [['Ticker', 'ticker'], ['Exchange', 'exchange'], ['Country', 'country'], ['Segment', 'segment'], ['ETF membership', 'etf'], ['Theses in catalogue', 'theses'], ['Stances', 'stances'], ['Publishers', 'publishers'], ['Chart here', 'chart']];
    var status = document.getElementById('cmp-status');
    // Annual revenue from SEC filings, inline in the page (tools/export-fundamentals.mjs). Never fetched.
    var FUND = {};
    try { FUND = JSON.parse((document.getElementById('inv-fundamentals') || {}).textContent || '{}'); } catch (e) { FUND = {}; }
    function money(v, cur) {
      var a = Math.abs(v);
      var t = a >= 1e9 ? (v / 1e9).toFixed(2) + ' bn' : a >= 1e6 ? (v / 1e6).toFixed(2) + ' m' : Math.round(v).toLocaleString('en-US');
      return cur + ' ' + t;
    }
    function pct(g) { return (g > 0 ? '+' : g < 0 ? '\u2212' : '') + Math.abs(g * 100).toFixed(1) + '%'; }
    var slots = Array.prototype.slice.call(box.querySelectorAll('.inv-slot'));
    var chosen = slots.map(function () { return null; });
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
    function say(msg) { status.textContent = msg; }
    function summary() {
      var n = chosen.filter(Boolean).length;
      say(n === 0 ? 'No company chosen yet.' : n === 1 ? '1 company chosen. Add another to compare.' : 'Comparing ' + n + ' companies.');
    }
    function holder(c, self) { for (var k = 0; k < chosen.length; k += 1) if (k !== self && chosen[k] && chosen[k].key === c.key) return k; return -1; }

    slots.forEach(function (slot, i) {
      var n = i + 1;
      var input = slot.querySelector('input[role=combobox]');
      var list = slot.querySelector('[role=listbox]');
      var openBtn = slot.querySelector('.inv-combo-open');
      var clearBtn = slot.querySelector('.inv-slot-clear');
      var card = slot.querySelector('.inv-slot-card');
      var matches = [];
      var active = -1;

      function card0() { gen += 1; card.textContent = ''; card.appendChild(el('p', 'dim', 'No company chosen.')); }
      function showCard(c) {
        card.textContent = '';
        var h = el('h4');
        if (c.path) { var a = el('a', '', c.name); a.setAttribute('href', c.path); h.appendChild(a); } else h.textContent = c.name;
        card.appendChild(h);
        card.appendChild(quote(c));
        card.appendChild(revenue(c));
        var dl = el('dl', 'inv-fields');
        FIELDS.forEach(function (f) {
          var v = c[f[1]];
          if (f[1] === 'theses' && v === '0') v = '';
          var row = el('div');
          row.appendChild(el('dt', '', f[0]));
          var dd = el('dd');
          if (v) dd.textContent = v.split('|').filter(Boolean).map(function (t) { return LABEL[t] || t; }).join(', ');
          else dd.appendChild(el('span', 'na', 'None recorded'));
          row.appendChild(dd);
          dl.appendChild(row);
        });
        card.appendChild(dl);
      }
      // Market cap and P/E: TradingView's official Symbol Info widget, one per slot, loaded when the company is chosen
      // and removed with it (replace or clear); a late callback from a replaced widget is ignored.
      var gen = 0;
      function quote(c) {
        var box = el('div', 'inv-val-quote');
        box.appendChild(el('p', 'inv-val-k', 'Market cap and P/E'));
        var my = ++gen;
        if (!c.tv || c.chart === 'unavailable') {
          box.appendChild(el('p', 'inv-val-na', 'Not shown here: TradingView\u2019s free quote widget does not cover this symbol.'));
          if (c.tvurl) { var l = el('a', '', 'See it on TradingView \u2197'); l.setAttribute('href', c.tvurl); l.setAttribute('rel', 'noopener nofollow'); l.setAttribute('target', '_blank'); box.appendChild(l); }
          return box;
        }
        var frame = el('div', 'mkt-frame info');
        var host = el('div', 'tradingview-widget-container');
        var w = el('div', 'tradingview-widget-container__widget');
        var wait = el('p', 'mkt-wait', 'Loading the quote from TradingView\u2026');
        w.appendChild(wait);
        host.appendChild(w);
        var credit = el('div', 'tradingview-widget-copyright');
        var a = el('a', '', 'Track all markets on TradingView');
        a.setAttribute('href', c.tvurl || 'https://www.tradingview.com/');
        a.setAttribute('rel', 'noopener nofollow');
        a.setAttribute('target', '_blank');
        credit.appendChild(a);
        host.appendChild(credit);
        frame.appendChild(host);
        box.appendChild(frame);
        var sc = document.createElement('script');
        sc.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js';
        sc.async = true;
        sc.text = JSON.stringify({ symbol: c.tv, locale: 'en', colorTheme: 'dark', isTransparent: true, width: '100%' });
        sc.onerror = function () { if (my === gen && wait.parentNode) wait.textContent = 'TradingView did not load. Open the company on TradingView instead.'; };
        sc.onload = function () { if (my === gen && wait.parentNode) wait.parentNode.removeChild(wait); };
        host.appendChild(sc);
        return box;
      }
      // Revenue and its growth: the latest fiscal year reported to the SEC, with its base, dates and filing.
      function revenue(c) {
        var dl = el('dl', 'inv-val');
        var f = FUND[c.key];
        function row(label, main, notes) {
          var d = el('div');
          d.appendChild(el('dt', '', label));
          var dd = el('dd');
          if (typeof main === 'string') dd.appendChild(el('span', 'v', main)); else dd.appendChild(main);
          (notes || []).forEach(function (n) { if (n) dd.appendChild(n); });
          d.appendChild(dd);
          dl.appendChild(d);
        }
        if (!f || f.s !== 'published') {
          var why = !f ? 'Not covered yet: this company does not file annual reports with the SEC.' : 'No annual revenue in its SEC filings.';
          row('Revenue, latest fiscal year', el('span', 'na', why));
          row('Revenue growth vs previous year', el('span', 'na', 'Not available'));
          return dl;
        }
        var src = el('span', 'mt');
        src.appendChild(document.createTextNode('Year ended ' + f.end + ' \u00b7 Form ' + f.form + ' filed ' + f.filed + ' \u00b7 '));
        var link = el('a', '', 'SEC filing \u2197');
        link.setAttribute('href', f.url);
        link.setAttribute('rel', 'noopener');
        src.appendChild(link);
        row('Revenue, latest fiscal year', money(f.v, f.cur), [src, f.f.indexOf('old_fiscal_year') >= 0 ? el('span', 'mt warn', 'The latest annual figure this company has filed with the SEC.') : null]);
        if (f.g === null) row('Revenue growth vs previous year', el('span', 'na', f.n || 'Not available'));
        else row('Revenue growth vs previous year', pct(f.g), [el('span', 'mt', 'From ' + money(f.pv, f.cur) + ', year ended ' + f.pend), f.f.indexOf('growth_outlier') >= 0 ? el('span', 'mt warn', 'A large change: check the filing (a small base, an acquisition or a merger).') : null]);
        return dl;
      }
      function restore() { input.value = chosen[i] ? chosen[i].name : ''; }
      function close() {
        list.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        active = -1;
      }
      function setActive(k) {
        var opts = list.querySelectorAll('[role=option]');
        if (!matches.length) return;
        active = Math.max(0, Math.min(k, matches.length - 1));
        Array.prototype.forEach.call(opts, function (o, j) { o.classList.toggle('active', j === active); });
        input.setAttribute('aria-activedescendant', opts[active].id);
        if (opts[active].scrollIntoView) opts[active].scrollIntoView({ block: 'nearest' });
      }
      function open(query) {
        var terms = fold(query).split(/\s+/).filter(Boolean);
        matches = all.filter(function (c) { return terms.every(function (t) { return c.search.indexOf(t) >= 0; }); });
        list.textContent = '';
        if (!matches.length) {
          var none = el('li', 'inv-combo-none', 'No company matches \u201c' + query.trim() + '\u201d.');
          none.setAttribute('role', 'option');
          none.setAttribute('aria-disabled', 'true');
          none.id = 'cmp-' + n + '-none';
          list.appendChild(none);
          say('No company matches \u201c' + query.trim() + '\u201d in Company ' + n + '.');
        }
        matches.forEach(function (c, j) {
          var li = el('li', 'inv-combo-opt');
          li.id = 'cmp-' + n + '-opt-' + j;
          li.setAttribute('role', 'option');
          li.setAttribute('aria-selected', String(Boolean(chosen[i] && chosen[i].key === c.key)));
          li.appendChild(el('span', 'nm', c.name));
          var meta = [c.ticker, c.exchange].filter(Boolean).join(' \u00b7 ');
          var other = holder(c, i);
          if (other >= 0) { li.setAttribute('aria-disabled', 'true'); meta += (meta ? ' \u00b7 ' : '') + 'in Company ' + (other + 1); }
          li.appendChild(el('span', 'mt', meta));
          li.addEventListener('mousedown', function (e) { e.preventDefault(); });
          li.addEventListener('click', function () { choose(c); });
          list.appendChild(li);
        });
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        active = -1;
        input.removeAttribute('aria-activedescendant');
        if (matches.length) say(matches.length + (matches.length === 1 ? ' company' : ' companies') + ' in the list for Company ' + n + '.');
      }
      function full() { open(chosen[i] && input.value === chosen[i].name ? '' : input.value); }
      function choose(c) {
        var other = holder(c, i);
        if (other >= 0) { say(c.name + ' is already in Company ' + (other + 1) + '. Clear it there or choose another company.'); return; }
        chosen[i] = c;
        input.value = c.name;
        close();
        clearBtn.hidden = false;
        showCard(c);
        summary();
      }
      function clear() {
        chosen[i] = null;
        input.value = '';
        close();
        clearBtn.hidden = true;
        card0();
        summary();
        input.focus();
      }
      input.addEventListener('input', function () { open(input.value); if (matches.length) setActive(0); });
      input.addEventListener('click', function () { if (list.hidden) full(); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) { full(); setActive(0); } else setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); if (list.hidden) { full(); setActive(matches.length - 1); } else setActive(active - 1); }
        else if (e.key === 'Home' && !list.hidden) { e.preventDefault(); setActive(0); }
        else if (e.key === 'End' && !list.hidden) { e.preventDefault(); setActive(matches.length - 1); }
        else if (e.key === 'Enter') { if (!list.hidden && active >= 0) { e.preventDefault(); choose(matches[active]); } }
        else if (e.key === 'Escape') { if (!list.hidden) { e.preventDefault(); close(); restore(); summary(); } }
        else if (e.key === 'Tab') { if (!list.hidden) { close(); restore(); } }
      });
      input.addEventListener('blur', function () { setTimeout(function () { if (!slot.contains(document.activeElement)) { close(); restore(); } }, 0); });
      openBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
      openBtn.addEventListener('click', function () { if (list.hidden) { full(); input.focus(); } else { close(); restore(); } });
      clearBtn.addEventListener('click', clear);
    });

    box.querySelector('.inv-cmp-nojs').hidden = true;
    document.getElementById('cmp-hint').hidden = false;
    box.querySelector('.inv-cmp-slots').hidden = false;
    status.hidden = false;
    summary();
  }
  comparator();
})();
