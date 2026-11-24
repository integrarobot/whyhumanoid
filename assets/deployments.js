/* Deployments cases (24 Nov 2026): search and filters over every public case, kept in the address (?q, ?status,
   ?sector, ?country, ?review) so a view can be shared and survives back and reload. The list is complete without
   JavaScript; this only hides what does not match. */
(function () {
  'use strict';
  var form = document.getElementById('dc-filters');
  var list = document.getElementById('dcs');
  if (!form || !list) return;
  var items = Array.prototype.slice.call(list.querySelectorAll('.dc'));
  var count = document.getElementById('dc-count');
  var empty = document.getElementById('dcs-empty');
  var KEYS = ['q', 'status', 'sector', 'country', 'review'];
  var params = function () { return new URLSearchParams(location.search); };
  var save = function () {
    var p = params();
    KEYS.forEach(function (k) { var v = (form.elements[k].value || '').trim(); if (v) p.set(k, v); else p.delete(k); });
    var q = p.toString();
    try { history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (e) { /* sandboxed */ }
  };
  var apply = function () {
    var q = (form.elements.q.value || '').toLowerCase().trim();
    var st = form.elements.status.value, se = form.elements.sector.value, co = form.elements.country.value, rv = form.elements.review.value;
    var shown = 0;
    items.forEach(function (el) {
      var ok = (!q || el.getAttribute('data-text').indexOf(q) >= 0)
        && (!st || el.getAttribute('data-status') === st)
        && (!se || el.getAttribute('data-sector').split('|').indexOf(se) >= 0)
        && (!co || el.getAttribute('data-country').split('|').indexOf(co) >= 0)
        && (!rv || (el.getAttribute('data-review') || 'none') === rv);
      el.hidden = !ok;
      if (ok) shown += 1;
    });
    var any = KEYS.some(function (k) { return form.elements[k].value; });
    count.textContent = any ? shown + ' of ' + items.length + ' cases match.' : 'All ' + items.length + ' cases.';
    empty.hidden = shown > 0;
  };
  var p = params();
  KEYS.forEach(function (k) { if (p.get(k)) form.elements[k].value = p.get(k); });
  form.hidden = false;
  form.addEventListener('input', function () { save(); apply(); });
  form.addEventListener('change', function () { save(); apply(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('reset', function () { setTimeout(function () { save(); apply(); }, 0); });
  window.addEventListener('popstate', function () { var x = params(); KEYS.forEach(function (k) { form.elements[k].value = x.get(k) || ''; }); apply(); });
  apply();
}());
