// Investment directory and thesis table (/investment/): search, filters, sorting, counters, a watchlist kept in this
// browser only and a side-by-side comparison of 2 to 4 companies. Works on the table already in the page; without
// JavaScript the full tables stay readable.
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

    // Watchlist (this browser only) and comparison, on the company directory.
    var cmpBox = document.getElementById(form.getAttribute('data-compare') || '');
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
      if (cmpBox) {
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'cmp';
        cb.value = key;
        cb.setAttribute('aria-label', 'Compare ' + tr.getAttribute('data-name'));
        cb.addEventListener('change', function () { compare(cb); });
        tools.appendChild(cb);
      }
    });
    function compare(changed) {
      var picked = rows.filter(function (tr) { var c = tr.querySelector('input.cmp'); return c && c.checked; });
      if (picked.length > 4) { changed.checked = false; picked.pop(); cmpBox.querySelector('[aria-live]').textContent = 'Compare up to 4 companies.'; return; }
      var live = cmpBox.querySelector('[aria-live]');
      var out = cmpBox.querySelector('.inv-compare-table');
      if (picked.length < 2) { out.innerHTML = ''; out.closest('.inv-compare').classList.add('inv-hidden'); live.textContent = picked.length ? 'Pick at least one more company to compare.' : ''; return; }
      live.textContent = 'Comparing ' + picked.length + ' companies.';
      var fields = [['Company', 'name'], ['Ticker', 'ticker'], ['Exchange', 'exchange'], ['Country', 'country'], ['Segment', 'segment'], ['ETF membership', 'etf'], ['Theses in catalogue', 'theses'], ['Stances', 'stances'], ['Publishers', 'publishers'], ['Chart here', 'chart']];
      var esc = function (s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
      var LABEL = { verified: 'Chart checked', unverified: 'Chart not yet checked', unavailable: 'No chart here', positive: 'Positive', exit: 'Exit', mixed: 'Mixed' };
      // One card per company, side by side when there is room and stacked on narrow screens.
      var html = '<ul class="inv-cmp-cards">' + picked.map(function (tr) {
        return '<li><h4><a href="' + esc(tr.getAttribute('data-path')) + '">' + esc(tr.getAttribute('data-name')) + '</a></h4><dl>' + fields.slice(1).map(function (f) {
          var v = tr.getAttribute('data-' + f[1]) || '';
          if (f[1] === 'theses' && v === '0') v = '';
          return '<dt>' + f[0] + '</dt><dd>' + (v ? esc(tokens(v).map(function (t) { return LABEL[t] || t; }).join(', ')) : '<span class="na">None recorded</span>') + '</dd>';
        }).join('') + '</dl></li>';
      }).join('') + '</ul>';
      out.innerHTML = html;
      out.closest('.inv-compare').classList.remove('inv-hidden');
    }
    apply();
  }
  Array.prototype.forEach.call(document.querySelectorAll('form.inv-filters[data-for]'), setup);
})();
