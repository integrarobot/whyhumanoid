// Market data on company pages: TradingView's free widgets, loaded only when their block comes near the screen, one
// widget per block, from the official embed scripts with the configuration written into the page. Nothing is fetched
// until then, and nothing is sent to Why Humanoid?. The symbol is fixed (no symbol change), so a widget never falls back
// to a different security.
(function () {
  var blocks = Array.prototype.slice.call(document.querySelectorAll('[data-tv-widget]'));
  if (!blocks.length) return;
  function load(el) {
    if (el.getAttribute('data-loaded')) return;
    el.setAttribute('data-loaded', '1');
    var host = el.querySelector('.tradingview-widget-container');
    var cfg = el.getAttribute('data-tv-config');
    var wait = el.querySelector('.mkt-wait');
    if (!host || !cfg) return;
    var s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-' + el.getAttribute('data-tv-widget') + '.js';
    s.async = true;
    s.text = cfg;
    s.onerror = function () { if (wait) wait.textContent = 'TradingView did not load. Use the links below.'; };
    s.onload = function () { if (wait) wait.remove(); };
    host.appendChild(s);
  }
  if (!('IntersectionObserver' in window)) { blocks.forEach(load); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); load(e.target); } });
  }, { rootMargin: '300px 0px' });
  blocks.forEach(function (b) { io.observe(b); });
})();
