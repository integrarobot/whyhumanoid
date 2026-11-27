// Newsletter and News: text search over the lists already on the page (tools/editorial-view.mjs). Without
// JavaScript the form stays hidden and every entry is listed. Matching is on lowercase words, all of which must occur.
(function () {
  var form = document.querySelector('.ed-search');
  if (!form) return;
  var input = form.querySelector('input');
  var count = form.querySelector('.ed-count');
  var entries = Array.prototype.slice.call(document.querySelectorAll('[data-ed-text]'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('[data-ed-group]')).reverse();
  form.hidden = false;
  function apply() {
    var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    entries.forEach(function (el) {
      var text = el.getAttribute('data-ed-text');
      var hit = words.every(function (w) { return text.indexOf(w) !== -1; });
      if (hit) { el.removeAttribute('data-ed-hidden'); shown += 1; } else el.setAttribute('data-ed-hidden', '');
    });
    groups.forEach(function (g) {
      var any = g.querySelector('[data-ed-text]:not([data-ed-hidden])');
      if (any) g.removeAttribute('data-ed-hidden'); else g.setAttribute('data-ed-hidden', '');
    });
    count.textContent = words.length ? shown + (shown === 1 ? ' match' : ' matches') : '';
  }
  input.addEventListener('input', apply);
  var q = new URLSearchParams(window.location.search).get('q');
  if (q) { input.value = q; apply(); }
})();
