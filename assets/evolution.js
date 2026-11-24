// Evolution charts (Javier, 24 Nov 2026): historical replay of the server-rendered charts (tools/evolution-view.mjs)
// and the home carousel. The HTML already shows the final state; this script only hides marks whose source date is
// after the cursor, moves the cursor and updates the date and count. Not live data.
// Carousel: the seven charts in order, exactly 10 seconds each while it plays; it holds while the tab is hidden, the
// chart is off screen or the pointer is over it, and stops on any click, key or keyboard focus inside it, so reading
// is never reset.
// prefers-reduced-motion: final states, no autoplay; the Play button starts it on request.
(function () {
  'use strict';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function day(t) { return new Date(t * 86400000); }
  function fmt(t, prec, end) {
    var d = day(t);
    var y = d.getUTCFullYear();
    if (end) return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + y;
    if (prec === 'year') return String(y);
    if (prec === 'quarter') return 'Q' + (Math.floor(d.getUTCMonth() / 3) + 1) + ' ' + y;
    if (prec === 'month') return MONTHS[d.getUTCMonth()] + ' ' + y;
    return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + y;
  }

  function Chart(el) {
    var t0 = +el.getAttribute('data-t0');
    var t1 = +el.getAttribute('data-t1');
    var prec = el.getAttribute('data-prec');
    var mode = el.getAttribute('data-readout');
    var one = el.getAttribute('data-one');
    var many = el.getAttribute('data-many');
    var marks = Array.prototype.slice.call(el.querySelectorAll('[data-t]'));
    var curs = el.querySelectorAll('.evo-cur');
    var dateEl = el.querySelector('.evo-date b');
    var nEl = el.querySelector('.evo-n');
    var prog = el.querySelector('.evo-prog');
    var map = (el.getAttribute('data-map') || '').split(',').filter(Boolean).map(function (p) { var a = p.split(':'); return [+a[0], parseFloat(a[1])]; });
    var self = { t0: t0, t1: t1, el: el, t: t1 };
    function xOf(t) {
      if (!map.length) return null;
      if (t <= map[0][0]) return map[0][1];
      for (var i = 1; i < map.length; i++) {
        if (t <= map[i][0]) { var a = map[i - 1]; var b = map[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
      }
      return map[map.length - 1][1];
    }
    self.set = function (t) {
      t = Math.max(t0, Math.min(t1, Math.round(t)));
      self.t = t;
      var n = 0;
      var last = null;
      marks.forEach(function (m) {
        var on = +m.getAttribute('data-t') <= t;
        m.classList.toggle('off', !on);
        if (on) { if (mode === 'sum') n += +m.getAttribute('data-n'); else if (mode === 'count') n += 1; else last = m; }
      });
      if (mode === 'last') n = last ? +last.getAttribute('data-n') : 0;
      var x = xOf(t);
      for (var i = 0; i < curs.length; i++) curs[i].style.left = (x === null ? (t - t0) / (t1 - t0) * 100 : x) + '%';
      if (dateEl) dateEl.textContent = fmt(t, prec, t === t1);
      if (nEl) nEl.innerHTML = '<b>' + n + '</b> ' + (n === 1 ? one : many);
      if (prog) prog.style.width = ((t - t0) / (t1 - t0) * 100) + '%';
      var r = el.parentNode && el.parentNode.querySelector('.evo-scrub input');
      if (r && +r.value !== t) { r.value = t; r.setAttribute('aria-valuetext', fmt(t, prec, t === t1)); }
    };
    self.progress = function (f) { el.classList.toggle('playing', f < 1); self.set(t0 + (t1 - t0) * Math.min(1, Math.max(0, f))); };
    self.final = function () { el.classList.remove('playing'); self.set(t1); };
    return self;
  }

  // ---------- section pages: replay button, date scrubber, one automatic replay when first seen ----------
  Array.prototype.forEach.call(document.querySelectorAll('.evo-sec'), function (sec) {
    var c = Chart(sec.querySelector('.evo-chart'));
    var btn = sec.querySelector('.evo-play');
    var range = sec.querySelector('.evo-scrub input');
    var raf = 0;
    var DURATION = 8000;
    function stop() { cancelAnimationFrame(raf); raf = 0; btn.textContent = 'Replay'; }
    function play() {
      stop();
      var start = performance.now();
      btn.textContent = 'Stop';
      (function frame(now) {
        var f = (now - start) / DURATION;
        c.progress(f);
        if (f < 1) raf = requestAnimationFrame(frame); else { c.final(); stop(); }
      })(start);
    }
    btn.addEventListener('click', function () { if (raf) { stop(); c.final(); } else play(); });
    range.addEventListener('input', function () { stop(); c.el.classList.add('playing'); c.set(+range.value); });
    range.addEventListener('change', function () { if (+range.value === c.t1) c.final(); });
    if (!REDUCED && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); play(); }
      }, { threshold: 0.4 });
      io.observe(sec.querySelector('.evo-chart'));
    }
  });

  // ---------- home carousel ----------
  var car = document.getElementById('evo-car');
  if (!car) return;
  var SLIDE_MS = (+car.getAttribute('data-seconds') || 10) * 1000;
  var REPLAY_MS = SLIDE_MS * 0.7;
  var slides = Array.prototype.slice.call(car.querySelectorAll('.evo-slide'));
  var tabs = Array.prototype.slice.call(car.querySelectorAll('[role="tab"]'));
  var charts = slides.map(function (s) { return Chart(s.querySelector('.evo-chart')); });
  var pp = car.querySelector('.evo-pp');
  var posEl = car.querySelector('.evo-pos');
  var live = car.querySelector('.evo-live');
  var timer = car.querySelector('.evo-timer i');
  var idx = 0;
  var elapsed = 0;
  var playing = !REDUCED;
  var hold = { hidden: document.hidden, offscreen: false, hover: false };
  var last = performance.now();
  pp.hidden = false;

  function active() { return playing && !hold.hidden && !hold.offscreen && !hold.hover; }
  function state() {
    car.setAttribute('data-state', !playing ? 'paused' : active() ? 'playing' : 'held');
    car.setAttribute('data-index', String(idx));
    pp.textContent = playing ? 'Pause' : 'Play';
    pp.setAttribute('aria-label', playing ? 'Pause rotation' : 'Play rotation');
  }
  function show(i, announce) {
    idx = (i + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.classList.toggle('on', k === idx); s.setAttribute('aria-hidden', k === idx ? 'false' : 'true'); });
    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === idx ? 'true' : 'false'); t.setAttribute('tabindex', k === idx ? '0' : '-1'); });
    posEl.textContent = (idx + 1) + ' / ' + slides.length;
    car.setAttribute('data-index', String(idx));
    if (announce) live.textContent = 'Chart ' + (idx + 1) + ' of ' + slides.length + ': ' + tabs[idx].textContent;
    car.setAttribute('data-shown-at', String(Math.round(performance.now())));
  }
  function render() {
    if (playing) charts[idx].progress(elapsed / REPLAY_MS); else charts[idx].final();
    timer.style.width = (playing ? Math.min(100, elapsed / SLIDE_MS * 100) : 0) + '%';
  }
  function pause() { playing = false; elapsed = 0; render(); state(); }
  function play() { playing = true; last = performance.now(); render(); state(); }
  function go(i) { show(i, true); pause(); }

  pp.addEventListener('click', function () { if (playing) pause(); else { elapsed = 0; play(); } });
  car.querySelector('.evo-prev').addEventListener('click', function () { go(idx - 1); });
  car.querySelector('.evo-next').addEventListener('click', function () { go(idx + 1); });
  tabs.forEach(function (t, k) {
    t.addEventListener('click', function (e) { e.preventDefault(); go(k); });
    t.addEventListener('keydown', function (e) {
      var to = e.key === 'ArrowRight' ? idx + 1 : e.key === 'ArrowLeft' ? idx - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (to === null) return;
      e.preventDefault();
      go(to);
      tabs[idx].focus();
    });
  });
  // Any click or key inside a slide (a link, the data) stops the rotation so the reader keeps the chart.
  car.querySelector('.evo-slides').addEventListener('pointerdown', function () { if (playing) pause(); });
  car.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hold.hover = true; state(); } });
  car.addEventListener('pointerleave', function () { hold.hover = false; last = performance.now(); state(); });
  // Keyboard focus entering the carousel stops the rotation until Play is pressed (the Play button itself excepted).
  car.addEventListener('focusin', function (e) { if (e.target !== pp && playing) pause(); });
  document.addEventListener('visibilitychange', function () { hold.hidden = document.hidden; last = performance.now(); state(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { hold.offscreen = !es[0].isIntersecting; last = performance.now(); state(); }, { threshold: 0.25 }).observe(car);
  }

  function frame(now) {
    var dt = Math.min(250, now - last);
    last = now;
    if (active()) {
      elapsed += dt;
      if (elapsed >= SLIDE_MS) { elapsed -= SLIDE_MS; show(idx + 1, false); }
      render();
    }
    requestAnimationFrame(frame);
  }
  show(0, false);
  charts.forEach(function (c, k) { if (k) c.final(); });
  render();
  state();
  requestAnimationFrame(frame);
})();
