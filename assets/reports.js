/* Research Conclusions Atlas (/reports/, 24 Nov 2026): filters for the findings table, the passport panel and shareable
   URL state (?theme, ?report, ?check, ?kind, ?f) on top of the static markup, which works without this script: every
   mark, reference and row links to the finding's passport on its report page. The passport is rendered by
   WHReports.passport (assets/reports-core.js), the same function the page builder uses. */
(function () {
  'use strict';
  var W = window.WHReports;
  var panel = document.getElementById('rp-panel');
  if (!W || !panel) return;
  var body = document.getElementById('rp-panel-body');
  var form = document.getElementById('rp-filters');
  var rows = Array.prototype.slice.call(document.querySelectorAll('.rp-ft tbody tr'));
  var count = document.getElementById('rp-count');
  var KEYS = ['theme', 'report', 'check', 'kind'];
  var data = null, loading = null, opener = null;

  var params = function () { return new URLSearchParams(location.search); };
  var setUrl = function (mut, hash) {
    var p = params(); mut(p);
    var q = p.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + (hash === undefined ? location.hash : hash));
  };
  var load = function () {
    if (data) return Promise.resolve(data);
    if (!loading) loading = fetch('/data/reports/atlas.json', { credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (a) {
      data = { atlas: a, byId: {}, reports: {} };
      a.findings.forEach(function (f) { data.byId[f.id] = f; });
      a.reports.forEach(function (r) { data.reports[r.id] = r; });
      return data;
    });
    return loading;
  };

  // ---- filters ----
  var apply = function () {
    var p = params(), shown = 0;
    rows.forEach(function (tr) {
      var ok = KEYS.every(function (k) { var v = p.get(k); return !v || tr.getAttribute('data-' + k) === v; });
      tr.hidden = !ok; if (ok) shown++;
    });
    if (form) KEYS.forEach(function (k) { if (form.elements[k]) form.elements[k].value = p.get(k) || ''; });
    if (count) count.textContent = 'Showing ' + shown + ' of ' + rows.length + ' findings' + (shown < rows.length ? ' (filtered)' : '') + '.';
    Array.prototype.forEach.call(document.querySelectorAll('.rp-cov td a'), function (a) {
      a.classList.toggle('on', a.getAttribute('data-report') === p.get('report') && a.getAttribute('data-theme') === p.get('theme'));
    });
  };
  if (form) {
    form.hidden = false;
    form.addEventListener('change', function () {
      setUrl(function (p) { KEYS.forEach(function (k) { var v = form.elements[k].value; if (v) p.set(k, v); else p.delete(k); }); });
      apply();
    });
    form.addEventListener('reset', function (e) {
      e.preventDefault();
      setUrl(function (p) { KEYS.forEach(function (k) { p.delete(k); }); });
      apply();
    });
  }
  // A coverage cell filters the table to that report and theme.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.rp-cov td a[data-report]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    setUrl(function (p) { p.set('report', a.getAttribute('data-report')); p.set('theme', a.getAttribute('data-theme')); p.delete('f'); }, '#findings');
    apply();
    document.getElementById('findings').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---- passport panel ----
  var mark = function (id) {
    Array.prototype.forEach.call(document.querySelectorAll('.on[data-f], a.mk.on, .cx.sel'), function (el) { el.classList.remove('on'); el.classList.remove('sel'); });
    if (!id) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-f="' + id + '"]'), function (el) {
      if (el.matches('a.mk, tr, li, .sb')) el.classList.add('on');
      if (el.matches('.cx')) el.classList.add('sel');
    });
  };
  var open = function (id, from) {
    opener = from || document.activeElement;
    panel.hidden = false;
    body.innerHTML = '<p class="dim">Loading the passport…</p>';
    return load().then(function (d) {
      var f = d.byId[id];
      if (!f) { body.innerHTML = '<p class="dim">No finding with this id.</p>'; return; }
      body.innerHTML = W.passport(f, d.reports, d.atlas.vocabulary, { level: 2 });
      mark(id);
      setUrl(function (p) { p.set('f', id); });
      body.focus();
    }).catch(function () {
      panel.hidden = true;
      var a = from && from.getAttribute && from.getAttribute('href');
      if (a) location.href = a;
    });
  };
  var close = function () {
    panel.hidden = true;
    mark(null);
    setUrl(function (p) { p.delete('f'); });
    if (opener && opener.focus && document.contains(opener)) opener.focus();
  };
  panel.querySelector('.rp-close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-f]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if (panel.contains(a)) return;
    e.preventDefault();
    open(a.getAttribute('data-f'), a);
  });

  // ---- initial state from the URL ----
  apply();
  var p = params();
  if (p.get('f')) open(p.get('f'), null);
  else if (p.get('theme') && !location.hash) {
    var sec = document.getElementById('theme-' + p.get('theme'));
    if (sec) sec.scrollIntoView();
  }
}());
