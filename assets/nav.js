/* Categories menu of the generated pages (25 Nov 2026), the same behaviour as the home page: the ten category links
   stay inline while they fit; otherwise they fold behind an explicit Categories button (aria-expanded, aria-controls)
   that opens all ten as a list with 48 px targets. Escape closes and returns focus to the button; a click outside,
   focus leaving the header or choosing a link closes it. Without this script the bar scrolls as before. */
(function () {
  var top = document.querySelector('header.top'), nav = document.getElementById('cat-menu'), btn = document.getElementById('cat-toggle');
  if (!top || !nav || !btn) return;
  function setOpen(open, focusBack) {
    top.classList.toggle('cats-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (!open && focusBack) btn.focus();
  }
  function fit() {
    var wasOpen = top.classList.contains('cats-open');
    top.classList.remove('cats-compact', 'cats-open'); btn.hidden = true;
    if (nav.scrollWidth > nav.clientWidth + 1) {
      top.classList.add('cats-compact'); btn.hidden = false;
      if (wasOpen) setOpen(true);
    } else btn.setAttribute('aria-expanded', 'false');
  }
  btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a') && top.classList.contains('cats-compact')) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && top.classList.contains('cats-open')) setOpen(false, true); });
  document.addEventListener('click', function (e) { if (top.classList.contains('cats-open') && !top.contains(e.target)) setOpen(false); });
  top.addEventListener('focusout', function (e) { if (top.classList.contains('cats-open') && e.relatedTarget && !top.contains(e.relatedTarget)) setOpen(false); });
  fit();
  if (window.ResizeObserver) new ResizeObserver(function () { fit(); }).observe(top); else window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
