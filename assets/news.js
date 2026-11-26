// Recent headlines on company pages: asks the Why Humanoid? API (GET /v1/news, cached 30 minutes) for one listed
// company when its block comes near the screen. Headlines are inserted as text, with https links only; the outside
// news links in the page stay whatever happens.
(function () {
  var blocks = Array.prototype.slice.call(document.querySelectorAll('[data-news-security]'));
  if (!blocks.length || !window.fetch) return;
  var STALE_DAYS = 14;
  function day(iso) { var d = new Date(iso); return isNaN(d) ? null : d.toISOString().slice(0, 10); }
  function say(box, msg) { box.querySelector('.news-state').textContent = msg; }
  function load(box) {
    if (box.getAttribute('data-loaded')) return;
    box.setAttribute('data-loaded', '1');
    var api = box.getAttribute('data-news-api') + '/v1/news?security=' + encodeURIComponent(box.getAttribute('data-news-security'));
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    fetch(api, { signal: ctl ? ctl.signal : undefined, credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (data) {
        clearTimeout(timer);
        var list = box.querySelector('.news-list');
        var items = (data && data.items) || [];
        if (data.status !== 'ok' || !items.length) {
          say(box, data.status === 'empty' ? 'The feed has no headlines for this company right now. Use the links below.' : 'Recent headlines could not be loaded right now. Use the links below.');
          return;
        }
        items.forEach(function (it) {
          var u;
          try { u = new URL(it.url); } catch (e) { return; }
          if (u.protocol !== 'https:') return;
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = u.href;
          a.rel = 'noopener noreferrer nofollow';
          a.textContent = String(it.title || '').slice(0, 300);
          li.appendChild(a);
          var meta = document.createElement('span');
          meta.className = 'dim';
          meta.textContent = ' · ' + (day(it.published) || 'date not given') + ' · ' + u.hostname.replace(/^www\./, '');
          li.appendChild(meta);
          list.appendChild(li);
        });
        var newest = items[0] && items[0].published ? new Date(items[0].published) : null;
        var fetched = day(data.fetched_at);
        var old = newest && (Date.now() - newest.getTime()) / 86400000 > STALE_DAYS;
        say(box, 'Via Yahoo Finance, newest first, read ' + (fetched || 'recently') + '.' + (old ? ' The newest headline in the feed is from ' + day(newest.toISOString()) + '; no newer headline was listed.' : ''));
      })
      .catch(function () { clearTimeout(timer); say(box, 'Recent headlines could not be loaded right now. Use the links below.'); });
  }
  if (!('IntersectionObserver' in window)) { blocks.forEach(load); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); load(e.target); } });
  }, { rootMargin: '300px 0px' });
  blocks.forEach(function (b) { io.observe(b); });
})();
