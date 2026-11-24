/* Components explorer (23 Nov 2026). Progressive enhancement over the static pages:
   - /components/: filters and search over the products (?q, ?class, ?principle, ?q2, ?if, ?ros, ?licence), the
     comparison of up to three (?cmp=ID,ID,ID), all kept in the address so a view can be shared.
   - Subscribers: with a session from the subscriber app (same site), the page asks the API for the complete rows;
     the server checks the subscription. On 200 every product joins the catalogue and the comparison, and a
     subscriber-only product address renders its passport. Anything else leaves the public view as it is.
   No score is computed and nothing is sorted by a value: the catalogue keeps the workbook order. */
(function () {
  'use strict';
  var root = document.getElementById('cx');
  var W = window.WHComponents;
  if (!root || !W) return;
  var fail = function (e) { var el = document.getElementById('cx-error'); if (el) el.hidden = false; if (window.console && e) console.error(e); };
  var $ = function (s, el) { return (el || root).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };
  var esc = W.esc;
  var API = root.getAttribute('data-api') || '';
  var session = null;
  try { session = localStorage.getItem('wh_session'); } catch (e) { session = null; }

  // Only rows of the product contract (each with its Component ID) are used: an API still serving the former
  // three-column directory, or anything else, leaves the public view untouched.
  function fetchRows(id) {
    return fetch(API + '/v1/datasets/' + id + '?limit=500', { headers: { authorization: 'Bearer ' + session }, cache: 'no-store' })
      .then(function (r) { return r.status === 200 ? r.json() : null; })
      .then(function (b) { return b && Array.isArray(b.rows) && b.rows.every(function (x) { return x && /^CMP-[A-Z]{3}-\d{3,}$/.test(x.component_id || '') && x.name; }) ? b.rows : null; })
      .catch(function () { return null; });
  }

  // ---------- a subscriber-only product address ----------
  if (root.classList.contains('cx-locked')) {
    var want = root.getAttribute('data-id');
    if (!session) return;
    Promise.all([fetchRows('hardware'), fetchRows('component-software')]).then(function (res) {
      if (!res[0]) return;
      var r = res[0].concat(res[1] || []).filter(function (x) { return x.component_id === want; })[0];
      if (!r) return;
      document.title = r.name + ': ' + (r.family || 'component') + ' passport · Why Humanoid?';
      $('#cx-title').textContent = r.name;
      $('#cx-lede').textContent = r.principle || 'Sensing principle not recorded';
      $('#cx-access').innerHTML = esc(r.manufacturer || '') + '<br>' + W.reviewBadge(r) + ' Subscriber view, from the complete Components category.';
      $('#cx-pp').innerHTML = W.passportHtml(r, { level: 2 }) + '<p class="pp-acts"><a href="/components/?cmp=' + esc(r.component_id) + '#compare">Compare with other products</a> · <a href="/components/">All components</a></p>';
    }).catch(fail);
    return;
  }
  if (root.classList.contains('cx-prod')) return; // public product pages are complete without JavaScript

  // ---------- the catalogue page ----------
  try {
    var data = JSON.parse(document.getElementById('cx-data').textContent);
    var products = data.products;
    var full = false;
    var params = new URLSearchParams(location.search);
    var save = function () { var q = params.toString(); try { history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (e) { /* sandboxed */ } };
    var setParam = function (k, v) { if (!v) params.delete(k); else params.set(k, v); save(); };
    var F = ['class', 'principle', 'q2', 'if', 'ros', 'licence'];
    var state = { q: params.get('q') || '' };
    F.forEach(function (k) { state[k] = params.get(k) || ''; });

    var makersFor = function (r) {
      var m = data.makers[r.component_id];
      if (!m) return null; // subscriber-only rows: the record's own wording
      var card = $('.pc[data-id="' + r.component_id + '"] .pc-m');
      return card ? card.innerHTML : null;
    };
    var haystack = function (r) { return [r.name, r.manufacturer, r.principle, r.measured, r.family, r.interface, r.software, r.component_id].join(' ').toLowerCase(); };

    function render() {
      var cards = products.map(function (r) { return W.cardHtml(r, makersFor(r)); }).join('');
      $('#pcs').innerHTML = cards;
      apply();
      markCompare();
    }

    function apply() {
      var shown = 0;
      var q = state.q.toLowerCase().trim();
      $$('.pc').forEach(function (el) {
        var r = products.filter(function (x) { return x.component_id === el.getAttribute('data-id'); })[0];
        var ok = (!q || haystack(r).indexOf(q) >= 0)
          && (!state['class'] || el.getAttribute('data-class') === state['class'])
          && (!state.principle || el.getAttribute('data-principle') === state.principle)
          && (!state.q2 || el.getAttribute('data-q').split(' ').indexOf(state.q2) >= 0)
          && (!state['if'] || el.getAttribute('data-if').split(' ').indexOf(state['if']) >= 0)
          && (!state.ros || el.getAttribute('data-ros') === state.ros)
          && (!state.licence || el.getAttribute('data-licence') === state.licence);
        el.hidden = !ok;
        if (ok) shown += 1;
      });
      F.forEach(function (k) { var s = $('#f-' + k); if (s) { s.value = state[k]; s.classList.toggle('on', Boolean(state[k])); } });
      var qi = $('#f-q'); if (qi && qi.value !== state.q) qi.value = state.q; if (qi) qi.classList.toggle('on', Boolean(state.q));
      var any = state.q || F.some(function (k) { return state[k]; });
      var locked = data.total - products.length;
      $('#f-stat').textContent = (any ? shown + ' of ' + products.length : products.length) + (full ? ' products (complete category)' : ' public products') + (any ? ' match' : '') + (!full && locked > 0 ? '; ' + locked + ' more with the subscription' : '') + '.';
      $('#pcs-empty').hidden = shown > 0;
    }

    $$('.cx-filters select').forEach(function (s) {
      s.addEventListener('change', function () { state[s.getAttribute('data-f')] = s.value; setParam(s.getAttribute('data-f'), s.value); apply(); });
    });
    var qInput = $('#f-q');
    qInput.addEventListener('input', function () { state.q = qInput.value; setParam('q', qInput.value.trim()); apply(); });
    $('#f-clear').addEventListener('click', function () { state.q = ''; setParam('q', ''); F.forEach(function (k) { state[k] = ''; setParam(k, ''); }); apply(); });

    // ---------- comparison ----------
    var selects = $$('.cmp-s');
    var byId = function (id) { return products.filter(function (x) { return x.component_id === id; })[0]; };
    function fillSelects(ids) {
      var opts = '<option value="">None</option>' + products.slice().sort(function (a, z) { return a.name.localeCompare(z.name); }).map(function (r) { return '<option value="' + esc(r.component_id) + '">' + esc(r.name) + '</option>'; }).join('');
      selects.forEach(function (s, i) { s.innerHTML = opts; s.value = ids[i] || ''; });
    }
    function currentIds() { return selects.map(function (s) { return s.value; }).filter(Boolean); }
    function renderCompare(ids) {
      $('#cmp-out').innerHTML = W.compareHtml(ids.map(byId).filter(Boolean));
      markCompare();
    }
    function markCompare() {
      var ids = currentIds();
      $$('.pc').forEach(function (el) { var on = ids.indexOf(el.getAttribute('data-id')) >= 0; el.classList.toggle('sel', on); var b = $('.pc-cmp', el); if (b) b.setAttribute('aria-pressed', String(on)); });
    }
    function setCompare(ids, announce) {
      ids = ids.filter(function (id, i) { return byId(id) && ids.indexOf(id) === i; }).slice(0, 3);
      selects.forEach(function (s, i) { s.value = ids[i] || ''; });
      renderCompare(ids);
      setParam('cmp', ids.join(','));
      if (announce) $('#f-stat').textContent = ids.length + ' of 3 selected for comparison.';
    }
    selects.forEach(function (s) { s.addEventListener('change', function () { setCompare(currentIds(), false); }); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('.pc-cmp');
      if (!b) return;
      var id = b.getAttribute('data-id');
      var ids = currentIds();
      if (ids.indexOf(id) >= 0) ids = ids.filter(function (x) { return x !== id; });
      else { ids.push(id); if (ids.length > 3) ids.shift(); }
      setCompare(ids, true);
    });

    // ---------- start, then the subscriber upgrade ----------
    $('#cx-filters').hidden = false;
    var cmp = (params.get('cmp') || '').split(',').filter(Boolean);
    apply();
    if (cmp.length) setCompare(cmp, false); else markCompare();
    if (session) {
      Promise.all([fetchRows('hardware'), fetchRows('component-software')]).then(function (res) {
        if (!res[0] || !res[0].length) return;
        products = res[0];
        full = true;
        var keep = currentIds();
        fillSelects(keep);
        render();
        // The comparison the address asked for, including products that only subscribers can see.
        setCompare(cmp.length ? cmp : keep, false);
        var lock = $('#pc-lock'); if (lock) lock.hidden = true;
        $$('.locked').forEach(function (el) { el.textContent = '+ ' + el.getAttribute('data-more') + ' more in the catalogue below'; });
        var acc = $('#cx-access');
        if (acc) acc.innerHTML = '<b>Subscriber view:</b> all ' + products.length + ' product passports, from the complete Components category.';
      }).catch(fail);
    }
  } catch (e) { fail(e); }
}());
