/* Robot Learning Data Atlas (/datasets/, 23 Nov 2026). Progressive enhancement over the static page: shared filters
   that highlight every view at once (origins, scale rows, matrix) and answer questions with known, partial and unknown
   matches kept apart; the detail panel (keyboard, touch and pointer alike); the linear or logarithmic axis and the
   order of rows; the passport comparison; and shareable URL state (?mod, ?body, ?use, ?lane, ?scale, ?order, ?apart,
   ?cmp, ?ds). No score is computed: answers are listed alphabetically. */
(function () {
  'use strict';
  var root = document.getElementById('atlas');
  if (!root) return;
  var fail = function () { var e = document.getElementById('atlas-error'); if (e) e.hidden = false; };
  var data;
  try { data = JSON.parse(document.getElementById('data-atlas').textContent); } catch (e) { fail(); return; }
  try {
    var $ = function (s, el) { return (el || root).querySelector(s); };
    var $$ = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var wide = function () { return window.matchMedia && matchMedia('(min-width:1120px)').matches; };
    var res = {}; data.resources.forEach(function (r) { res[r.id] = r; });
    var label = {
      mod: function (k) { return data.vocabulary.modalities[k] || k; },
      body: function (k) { var f = data.vocabulary.body_families.filter(function (x) { return x.key === k; })[0]; return f ? f.label : k; },
      use: function (k) { var f = data.vocabulary.learning_uses.filter(function (x) { return x.key === k; })[0]; return f ? f.label : k; },
      lane: function (k) { var f = data.vocabulary.lanes.filter(function (x) { return x.key === k; })[0]; return f ? f.label : k; }
    };

    // ---------- URL state ----------
    var params = new URLSearchParams(location.search);
    var save = function () {
      var q = params.toString();
      try { history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (e) { /* sandboxed */ }
    };
    var setParam = function (k, v) { if (v === null || v === undefined || v === '') params.delete(k); else params.set(k, v); save(); };
    var F = ['mod', 'body', 'use', 'lane'];
    var state = {};
    F.forEach(function (k) { state[k] = params.get(k) || ''; });

    // ---------- matching: known, partial (a subset carries the modality), unknown, or no ----------
    // Each condition is judged on its own; any "no" excludes, then unknown, then partial. No score.
    function match(r) {
      var worst = 'known';
      var rank = { known: 0, partial: 1, unknown: 2, no: 3 };
      var take = function (v) { if (rank[v] > rank[worst]) worst = v; };
      if (state.mod) {
        var m = r.mods.filter(function (x) { return x.key === state.mod; })[0];
        take(m ? (m.partial ? 'partial' : 'known') : (r.mstate === 'unknown' ? 'unknown' : 'no'));
      }
      if (state.body) take(r.body.indexOf(state.body) >= 0 ? 'known' : (r.body.length ? 'no' : 'unknown'));
      if (state.use) take(r.uses.indexOf(state.use) >= 0 ? 'known' : (r.uses.length ? 'no' : 'unknown'));
      if (state.lane) take(r.lane === state.lane ? 'known' : 'no');
      return worst;
    }
    var active = function () { return F.some(function (k) { return state[k]; }); };

    function apply() {
      var on = active();
      var m = {};
      data.resources.forEach(function (r) { m[r.id] = on ? match(r) : ''; });
      $$('.dtile').forEach(function (t) {
        var v = m[t.dataset.ds];
        if (v) t.setAttribute('data-m', v); else t.removeAttribute('data-m');
        var mt = $('.mt', t);
        mt.textContent = v === 'partial' ? 'Partial: only a subset carries it' : v === 'unknown' ? 'Not established in the catalogue' : v === 'known' ? 'Matches' : '';
      });
      $$('.sr-row, .mx tr[data-ds]').forEach(function (row) { var v = m[row.dataset.ds]; if (v === 'no') row.setAttribute('data-m', 'no'); else row.removeAttribute('data-m'); });
      F.forEach(function (k) { var s = $('#f-' + k); if (s) { s.value = state[k]; s.classList.toggle('on', Boolean(state[k])); } });
      var q = F.filter(function (k) { return state[k]; }).map(function (k) { return k + '=' + state[k]; }).join('&');
      $$('.preset').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.q.replace(/&amp;/g, '&') === q)); });
      answers(m, on);
    }

    function answers(m, on) {
      var stat = $('#f-stat');
      var box = $('#query'); var out = $('#q-out'); var none = $('#q-none');
      if (!on) {
        stat.textContent = 'Showing all ' + data.resources.length + ' resources. Choose a question or a filter to highlight matches in every view.';
        out.innerHTML = ''; none.hidden = false; return;
      }
      var groups = { known: [], partial: [], unknown: [], evaluation: [] };
      data.resources.forEach(function (r) {
        var v = m[r.id];
        if (v === 'no') return;
        // Evaluation data is listed apart: it is associated with benchmarks, not offered for training.
        if (r.evaluation) groups.evaluation.push(r); else groups[v].push(r);
      });
      Object.keys(groups).forEach(function (k) { groups[k].sort(function (a, z) { return a.name.localeCompare(z.name); }); });
      var cond = F.filter(function (k) { return state[k]; }).map(function (k) { return label[k](state[k]); }).join(' + ');
      stat.textContent = cond + ': ' + groups.known.length + ' known match' + (groups.known.length === 1 ? '' : 'es') + ', ' + groups.partial.length + ' partial, ' + groups.unknown.length + ' not established' + (groups.evaluation.length ? ', ' + groups.evaluation.length + ' evaluation data' : '') + '.';
      var col = function (title, note, list) {
        return '<div><h4>' + esc(title) + ' <span class="cn">' + list.length + '</span></h4><p>' + esc(note) + '</p>' + (list.length ? '<ul>' + list.map(function (r) { return '<li><button type="button" class="sn" data-ds="' + esc(r.id) + '">' + esc(r.name) + '</button></li>'; }).join('') + '</ul>' : '<p class="na">None</p>') + '</div>';
      };
      none.hidden = true;
      var total = groups.known.length + groups.partial.length + groups.unknown.length + groups.evaluation.length;
      out.innerHTML = total ? col('Known matches', 'The catalogue records every condition for the whole resource.', groups.known)
        + col('Partial matches', 'A condition holds only for a subset of the resource.', groups.partial)
        + col('Unknown', 'The catalogue does not establish at least one condition.', groups.unknown)
        + (groups.evaluation.length ? col('Evaluation data', 'Associated with a benchmark; not listed as training data.', groups.evaluation) : '')
        : '<p class="empty">No resource matches all the conditions. Remove a condition or choose another question.</p>';
    }

    // ---------- filter controls ----------
    $$('.ds-filters select').forEach(function (s) {
      s.addEventListener('change', function () { state[s.dataset.f] = s.value; setParam(s.dataset.f, s.value); apply(); });
    });
    $$('.preset').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = new URLSearchParams(b.dataset.q.replace(/&amp;/g, '&'));
        var same = b.getAttribute('aria-pressed') === 'true';
        F.forEach(function (k) { state[k] = same ? '' : (q.get(k) || ''); setParam(k, state[k]); });
        apply();
      });
    });
    $('#f-clear').addEventListener('click', function () { F.forEach(function (k) { state[k] = ''; setParam(k, ''); }); apply(); });

    // ---------- detail panel ----------
    var detail = $('#ds-detail');
    var hint = detail.innerHTML;
    var opener = null;
    function select(id, from) {
      var card = document.getElementById(id);
      var r = res[id];
      if (!card || !r) return;
      opener = from || null;
      var body = $('.res-body', card);
      detail.innerHTML = '<button type="button" class="d-close">Close</button><p class="d-k">' + esc(label.lane(r.lane)) + '</p><h3 class="d-t">' + esc(r.name) + '</h3>' + body.innerHTML;
      $$('.perma', detail).forEach(function (p) { p.remove(); });
      detail.insertAdjacentHTML('beforeend', '<p class="acts"><button type="button" class="add-cmp" data-ds="' + esc(id) + '">Add to comparison</button> <a class="perma" href="/datasets/#' + esc(id) + '">Permalink</a></p>');
      $$('.dtile').forEach(function (t) { if (t.dataset.ds === id) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
      $$('.sr-row').forEach(function (row) { row.classList.toggle('sel', row.dataset.ds === id); });
      setParam('ds', id);
      if (wide()) detail.focus({ preventScroll: true });
      else { detail.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); detail.focus({ preventScroll: true }); }
    }
    function close() {
      detail.innerHTML = hint;
      $$('.dtile[aria-current]').forEach(function (t) { t.removeAttribute('aria-current'); });
      $$('.sr-row.sel').forEach(function (r) { r.classList.remove('sel'); });
      setParam('ds', '');
      if (opener && document.contains(opener)) opener.focus();
      opener = null;
    }
    root.addEventListener('click', function (e) {
      var closeBtn = e.target.closest('.d-close');
      if (closeBtn) { close(); return; }
      var add = e.target.closest('.add-cmp');
      if (add) { addCompare(add.dataset.ds); return; }
      var t = e.target.closest('.dtile, .sn, #ds-detail a[data-ds], .miss a[data-ds], .mx a[data-ds], .pp a[data-ds]');
      if (!t || !t.dataset.ds) return;
      // Links into the catalogue list keep working as anchors when the detail panel cannot show beside the content.
      e.preventDefault();
      select(t.dataset.ds, t);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && params.get('ds')) { e.preventDefault(); close(); }
    });

    // ---------- scale: axis and order ----------
    var scaleSec = $('#scale');
    function setScale(v) { scaleSec.setAttribute('data-scale', v === 'log' ? 'log' : 'lin'); $$('input[name="sc"]').forEach(function (i) { i.checked = i.value === (v === 'log' ? 'log' : 'lin'); }); }
    function setOrder(v) {
      $$('.srows').forEach(function (ol) {
        var rows = $$('.sr-row', ol);
        rows.sort(function (a, z) { return v === 'name' ? a.dataset.n.localeCompare(z.dataset.n) : Number(z.dataset.v) - Number(a.dataset.v); });
        rows.forEach(function (r) { ol.appendChild(r); });
      });
      $$('input[name="so"]').forEach(function (i) { i.checked = i.value === (v === 'name' ? 'name' : 'size'); });
    }
    $$('input[name="sc"]').forEach(function (i) { i.addEventListener('change', function () { setScale(i.value); setParam('scale', i.value === 'log' ? 'log' : ''); }); });
    $$('input[name="so"]').forEach(function (i) { i.addEventListener('change', function () { setOrder(i.value); setParam('order', i.value === 'name' ? 'name' : ''); }); });
    var apart = $('#set-apart');
    apart.addEventListener('toggle', function () { setParam('apart', apart.open ? '1' : ''); });

    // ---------- passport comparison ----------
    var selects = $$('.cmp-s');
    var rowLabels = $$('#pp-out tbody th').map(function (th) { return th.outerHTML; });
    function renderCompare(ids) {
      // Each column comes from the resource's own passport card (same rows, same order), so nothing is duplicated.
      var cols = ids.map(function (id) {
        var card = document.getElementById(id);
        if (!card || !res[id]) return null;
        var head = '<th scope="col" data-ds="' + esc(id) + '"><a href="#' + esc(id) + '" data-ds="' + esc(id) + '">' + esc(res[id].name) + '</a></th>';
        return [head].concat($$('.d-kv > dd', card).slice(0, rowLabels.length).map(function (dd) { return '<td>' + dd.innerHTML + '</td>'; }));
      }).filter(Boolean);
      var out = $('#pp-out');
      if (!cols.length) { out.innerHTML = '<p class="empty">Choose up to three resources to compare their passports.</p>'; return; }
      var html = '<table class="pp"><caption class="sr">Data passports compared side by side</caption><thead><tr><th scope="col" class="pk">Field</th>' + cols.map(function (c) { return c[0]; }).join('') + '</tr></thead><tbody>';
      rowLabels.forEach(function (th, i) { html += '<tr>' + th + cols.map(function (c) { return c[i + 1] || '<td></td>'; }).join('') + '</tr>'; });
      out.innerHTML = html + '</tbody></table>';
    }
    function currentIds() { return selects.map(function (s) { return s.value; }).filter(Boolean); }
    selects.forEach(function (s) {
      s.addEventListener('change', function () { var ids = currentIds(); renderCompare(ids); setParam('cmp', ids.join(',')); });
    });
    function addCompare(id) {
      var ids = currentIds();
      if (ids.indexOf(id) < 0) { ids.push(id); if (ids.length > 3) ids.shift(); }
      selects.forEach(function (s, i) { s.value = ids[i] || ''; });
      renderCompare(ids); setParam('cmp', ids.join(','));
      var sec = $('#passports'); sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      $('#pp-out').focus({ preventScroll: true });
    }

    // ---------- start: restore the shared URL ----------
    $('#filters').hidden = false;
    $('#query').hidden = false;
    var loading = $('#ds-loading'); if (loading) loading.hidden = true;
    F.forEach(function (k) {
      var s = $('#f-' + k);
      if (state[k] && s && !$$('option', s).some(function (o) { return o.value === state[k]; })) { state[k] = ''; params.delete(k); }
    });
    if (params.get('scale') === 'log') setScale('log');
    if (params.get('order') === 'name') setOrder('name');
    if (params.get('apart') === '1') apart.open = true;
    var cmp = (params.get('cmp') || '').split(',').filter(function (id) { return res[id]; }).slice(0, 3);
    if (cmp.length) { selects.forEach(function (s, i) { s.value = cmp[i] || ''; }); renderCompare(cmp); }
    else params.delete('cmp');
    save();
    apply();
    if (params.get('ds') && res[params.get('ds')]) select(params.get('ds'), null);
    else if (/^#ds-/.test(location.hash)) { var c = document.getElementById(location.hash.slice(1)); if (c && c.tagName === 'DETAILS') c.open = true; }
    window.addEventListener('hashchange', function () { var c = document.getElementById(location.hash.slice(1)); if (c && c.tagName === 'DETAILS') c.open = true; });
  } catch (e) { fail(); if (window.console) console.error(e); }
}());
