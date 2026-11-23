/* Robotics Evaluation Atlas (/benchmarks/, 23 Nov 2026). Progressive enhancement over the static page:
   selection and detail (keyboard, touch and pointer alike), filters, Physics-IQ variant and input mode, the
   comparison picker and shareable URL state (?bm, ?res, ?model, ?grp, ?v, ?m, ?int, ?set, ?cap, ?only). */
(function () {
  'use strict';
  var root = document.getElementById('atlas');
  if (!root) return;
  var atlas;
  try { atlas = JSON.parse(document.getElementById('atlas-data').textContent); } catch (e) {
    var err = document.getElementById('atlas-error'); if (err) err.hidden = false; return;
  }
  var $ = function (s, el) { return (el || root).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = function () { return !matchMedia('(min-width:1120px)').matches; };
  var byId = {}; atlas.results.forEach(function (r) { byId[r.id] = r; });
  var bench = {}; atlas.benchmarks.forEach(function (b) { bench[b.id] = b; });
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var fmtDate = function (d) { if (!d) return 'not recorded'; var p = d.split('-').map(Number); return p[2] + ' ' + MONTHS[p[1] - 1] + ' ' + p[0]; };
  var fmtValue = function (r) { return r.value === null ? 'Not reported' : r.value + (r.unit === '%' ? '%' : r.unit ? ' ' + r.unit : ''); };
  var link = function (u, label) { return u ? '<a href="' + esc(u) + '" rel="noopener noreferrer">' + esc(label || u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) + '</a>' : '<span class="na">No link</span>'; };

  // ---------- URL state ----------
  var params = new URLSearchParams(location.search);
  function save() {
    var q = params.toString();
    try { history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (e) { /* file:// or sandbox */ }
  }
  function setParam(k, v) { if (v === null || v === undefined || v === '' || v === false) params.delete(k); else params.set(k, v === true ? '1' : v); save(); }
  function reveal(el) { if (!el) return; el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); }

  // ---------- results: detail of one observation or of one model ----------
  var resDetail = $('#res-detail');
  function kvs(pairs) { return '<dl class="d-kv">' + pairs.filter(function (p) { return p[1] !== null && p[1] !== undefined && p[1] !== ''; }).map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + p[1] + '</dd>'; }).join('') + '</dl>'; }
  function resultHtml(r) {
    var b = bench[r.benchmark_id];
    return kvs([
      ['Value', '<span class="ov">' + esc(fmtValue(r)) + '</span> · ' + esc(r.direction === 'lower' ? 'lower is better' : 'higher is better')],
      ['Model', esc(r.model) + (r.model_configuration ? ' · ' + esc(r.model_configuration) : '')],
      ['Benchmark', esc(b ? b.name : r.benchmark_id) + ' · ' + esc(r.benchmark_version || 'version not recorded')],
      ['Track', esc(r.track || 'Not recorded')],
      ['Task scope', esc(r.task_scope || 'Not recorded')],
      ['Metric', esc(r.metric) + (r.unit ? ' (' + esc(r.unit) + ')' : '')],
      ['Sample size', r.n_evals === null ? 'Not reported for this observation' : esc(r.n_evals)],
      ['Uncertainty', esc(r.uncertainty || 'Not recorded') + ' <span class="na">(as published; no interval is drawn)</span>'],
      ['Training data', esc(r.training_data || 'Not recorded')],
      ['Conditions', esc(r.conditions || 'Not recorded')],
      ['Comparability group', esc(r.comparability_group) + ' <span class="na">(editorial aid, not proof of equal compute or data)</span>'],
      ['Date', esc(fmtDate(r.result_date)) + (r.date_meaning ? ' · ' + esc(r.date_meaning) : '')],
      ['Source', link(r.source_url) + (r.source_locator ? ' · ' + esc(r.source_locator) : '')],
      ['Checked', esc(fmtDate(r.checked_at)) + ' <span class="na">(transcription and source check, not a replication)</span>'],
      ['Evidence', esc(r.evidence_status || 'Not recorded')],
      ['Limitations', esc(r.limitations || 'Not recorded')],
      ['Result ID', '<a class="perma" href="?res=' + esc(r.id) + '#results">' + esc(r.id) + '</a>'],
    ]);
  }
  function openDetail(html) {
    resDetail.innerHTML = '<button type="button" class="d-close">Close</button>' + html;
    resDetail.hidden = false;
    $('.d-close', resDetail).addEventListener('click', closeResult);
  }
  function mark(sel) {
    $$('.dot[aria-pressed]').forEach(function (d) { d.removeAttribute('aria-pressed'); });
    $$('.pr.sel, .obs tr.sel').forEach(function (x) { x.classList.remove('sel'); });
    sel.forEach(function (id) {
      $$('.dot[data-res="' + id + '"]').forEach(function (d) { d.setAttribute('aria-pressed', 'true'); var row = d.closest('.pr'); if (row) row.classList.add('sel'); });
      var tr = document.getElementById(id); if (tr) tr.classList.add('sel');
    });
  }
  function selectResult(id, fromUrl) {
    var r = byId[id]; if (!r) return;
    var b = bench[r.benchmark_id];
    var same = atlas.results.filter(function (x) { return x.model === r.model && x.benchmark_id === r.benchmark_id && x.id !== r.id; });
    openDetail('<p class="d-k">Source-reported observation</p><h3 class="d-t">' + esc(r.model) + ' · ' + esc(r.track || '') + '</h3>' + resultHtml(r) +
      (same.length ? '<p class="d-note">Other observations of ' + esc(r.model) + ' on ' + esc(b ? b.name : '') + '. They are separate observations, not to be added together.</p><ul class="obs-list">' + same.map(function (x) { return '<li><span class="ov">' + esc(fmtValue(x)) + '</span> ' + esc(x.track || '') + ' · <a href="?res=' + esc(x.id) + '#results" data-res-link="' + esc(x.id) + '">conditions and source</a></li>'; }).join('') + '</ul>' : ''));
    mark([id]);
    params.delete('model'); setParam('res', id);
    if (!fromUrl) reveal(resDetail);
  }
  function selectModel(name, fromUrl) {
    var rows = atlas.results.filter(function (x) { return x.model === name; });
    if (!rows.length) return;
    var html = '<p class="d-k">Model · every displayed observation</p><h3 class="d-t">' + esc(name) + '</h3><p class="d-note">Each value belongs to its own benchmark, version, track and conditions. They are listed, not combined: there is no cross-benchmark score.</p><ul class="obs-list">' +
      rows.map(function (r) { var b = bench[r.benchmark_id]; return '<li><span class="ov">' + esc(fmtValue(r)) + '</span> ' + esc(b ? b.name : r.benchmark_id) + ' · ' + esc(r.benchmark_version || 'version not recorded') + ' · ' + esc(r.track || '') + ' · ' + esc(r.metric) + (r.model_configuration ? '<br><span class="na">' + esc(r.model_configuration) + '</span>' : '') + '<br><a href="?res=' + esc(r.id) + '#results" data-res-link="' + esc(r.id) + '">Conditions and source</a></li>'; }).join('') + '</ul>';
    openDetail(html);
    mark(rows.map(function (r) { return r.id; }));
    params.delete('res'); setParam('model', name);
    if (!fromUrl) reveal(resDetail);
  }
  function closeResult() {
    resDetail.hidden = true; resDetail.innerHTML = ''; mark([]);
    params.delete('res'); setParam('model', null);
  }
  root.addEventListener('click', function (e) {
    var d = e.target.closest('.dot[data-res], button.v[data-res]');
    if (d) { e.preventDefault(); selectResult(d.getAttribute('data-res')); return; }
    var m = e.target.closest('button.pr-name[data-model]');
    if (m) { e.preventDefault(); selectModel(m.getAttribute('data-model')); return; }
    var l = e.target.closest('[data-res-link], a.res-link');
    if (l) { e.preventDefault(); var id = l.getAttribute('data-res-link') || l.getAttribute('data-res'); selectResult(id); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!resDetail.hidden) { closeResult(); return; }
    if (params.get('bm')) closeBench();
  });

  // ---------- PAW interpolation, Physics-IQ variant and input mode ----------
  var pawChart = $('.paw-chart'), pawInt = $('#paw-int');
  function setInt(on) { if (!pawChart) return; pawChart.setAttribute('data-show-int', on ? 'true' : 'false'); if (pawInt) pawInt.checked = on; setParam('int', on ? '1' : null); }
  if (pawInt) pawInt.addEventListener('change', function () { setInt(pawInt.checked); });
  function setPiq(v, m) {
    v = v === 'verified' ? 'verified' : 'original'; m = m === 'i2v' || m === 'v2v' ? m : 'all';
    $$('#panel-piq .facet').forEach(function (f) { f.hidden = f.getAttribute('data-variant') !== v || (m !== 'all' && f.getAttribute('data-mode') !== m); });
    var rv = $('#panel-piq input[name="piq-v"][value="' + v + '"]'); if (rv) rv.checked = true;
    var rm = $('#panel-piq input[name="piq-m"][value="' + m + '"]'); if (rm) rm.checked = true;
    setParam('v', v === 'original' ? null : v); setParam('m', m === 'all' ? null : m);
  }
  $$('#panel-piq input[type="radio"]').forEach(function (i) {
    i.addEventListener('change', function () { setPiq(($('#panel-piq input[name="piq-v"]:checked') || {}).value, ($('#panel-piq input[name="piq-m"]:checked') || {}).value); });
  });

  // ---------- landscape: selection and filters ----------
  var aside = $('#bm-detail'), hint = aside ? aside.innerHTML : '';
  function selectBench(id, fromUrl) {
    var card = document.getElementById(id); if (!card || !aside || !bench[id]) return;
    aside.innerHTML = '<button type="button" class="d-close">Close</button>' + $('.res-body', card).innerHTML;
    $('.d-close', aside).addEventListener('click', closeBench);
    $$('#matrix tr.sel, .tile[aria-current]').forEach(function (x) { x.classList.remove('sel'); x.removeAttribute('aria-current'); });
    var row = document.getElementById('row-' + id); if (row) row.classList.add('sel');
    $$('.tile[data-bm="' + id + '"]').forEach(function (t) { t.setAttribute('aria-current', 'true'); });
    setParam('bm', id);
    if (!fromUrl) { if (narrow()) reveal(aside); else if (row) reveal(row); }
  }
  function closeBench() {
    if (!aside) return;
    aside.innerHTML = hint;
    $$('#matrix tr.sel, .tile[aria-current]').forEach(function (x) { x.classList.remove('sel'); x.removeAttribute('aria-current'); });
    setParam('bm', null);
  }
  root.addEventListener('click', function (e) {
    var a = e.target.closest('a.bm-sel, a.tile');
    if (a) { e.preventDefault(); var id = a.getAttribute('data-bm'); selectBench(id); if (a.classList.contains('tile')) reveal(document.getElementById('row-' + id)); return; }
    var g = e.target.closest('[data-goto-res]');
    if (g) { e.preventDefault(); var p = g.getAttribute('data-goto-res') === 'bm-paw' ? $('#panel-paw') : $('#panel-piq'); if (p) p.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
  });
  var filt = { set: params.get('set'), cap: params.get('cap'), only: params.get('only') === '1' };
  var onlyRes = $('#only-res'), clearF = $('.clear-f');
  function applyFilters() {
    var shown = 0;
    $$('#matrix tbody tr').forEach(function (tr) {
      var ok = (!filt.set || tr.getAttribute('data-set') === filt.set) &&
        (!filt.cap || (' ' + tr.getAttribute('data-caps') + ' ').indexOf(' ' + filt.cap + ' ') >= 0) &&
        (!filt.only || tr.getAttribute('data-res') === '1');
      tr.hidden = !ok; if (ok) shown += 1;
    });
    $$('.set-f').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set') === filt.set)); });
    $$('.cap-f').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cap') === filt.cap)); });
    if (onlyRes) onlyRes.checked = filt.only;
    var empty = $('#matrix-empty'); if (empty) empty.hidden = shown > 0;
    if (clearF) clearF.hidden = !(filt.set || filt.cap || filt.only);
    setParam('set', filt.set); setParam('cap', filt.cap); setParam('only', filt.only ? '1' : null);
  }
  $$('.set-f').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-set'); filt.set = filt.set === k ? null : k; applyFilters(); }); });
  $$('.cap-f').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-cap'); filt.cap = filt.cap === k ? null : k; applyFilters(); }); });
  if (onlyRes) onlyRes.addEventListener('change', function () { filt.only = onlyRes.checked; applyFilters(); });
  if (clearF) clearF.addEventListener('click', function () { filt = { set: null, cap: null, only: false }; applyFilters(); });

  // ---------- compare: swap the pre-rendered group ----------
  var cmpSel = $('#cmp-group'), cmpOut = $('#cmp-out');
  function setGroup(g, user) {
    var t = document.getElementById('cmp-' + g); if (!t || !cmpOut) return;
    cmpOut.innerHTML = t.innerHTML; if (cmpSel) cmpSel.value = g;
    setParam('grp', g === (cmpSel && cmpSel.options[0] && cmpSel.options[0].value) && !user ? null : g);
  }
  if (cmpSel) cmpSel.addEventListener('change', function () { setGroup(cmpSel.value, true); });

  // ---------- observations table: filter by benchmark ----------
  var obsSel = $('#obs-bm');
  function setObs(id) {
    $$('#obs tbody tr').forEach(function (tr) { tr.hidden = !!id && tr.getAttribute('data-bm') !== id; });
    if (obsSel) obsSel.value = id || '';
  }
  if (obsSel) obsSel.addEventListener('change', function () { setObs(obsSel.value); });

  // ---------- restore state from the URL ----------
  setInt(params.get('int') === '1');
  setPiq(params.get('v'), params.get('m'));
  applyFilters();
  if (params.get('grp') && document.getElementById('cmp-' + params.get('grp'))) setGroup(params.get('grp'), true);
  if (params.get('bm') && bench[params.get('bm')]) selectBench(params.get('bm'), true);
  if (params.get('res') && byId[params.get('res')]) {
    var r = byId[params.get('res')];
    // Show the facet that holds the chosen Physics-IQ value.
    if (r.benchmark_id === 'bm-physics-iq') setPiq(r.benchmark_version === 'Verified' ? 'verified' : 'original', params.get('m'));
    selectResult(r.id, true);
  } else if (params.get('model')) selectModel(params.get('model'), true);
  root.classList.add('js');
})();
