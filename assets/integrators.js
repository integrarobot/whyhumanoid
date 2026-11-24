// Integrators directory filters (/integrators/, 24 Nov 2026). The page is complete without this script: it only shows
// the filter form and hides the providers that do not match. Filters live in the address (?role=...&q=...), so a
// filtered view can be shared, reloaded or reached with the back button. The comparison table follows the same filters.
(() => {
  const form = document.getElementById('if');
  if (!form) return;
  const cards = [...document.querySelectorAll('.ip[data-id]')];
  const rows = [...document.querySelectorAll('.cmp-t tr[data-id]')];
  const count = document.getElementById('if-count');
  const empty = document.getElementById('if-empty');
  const total = cards.length;
  const KEYS = { role: 'roles', service: 'services', platform: 'platforms', sector: 'sectors', territory: 'territories', evidence: 'group' };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  for (const el of cards) el.dataset.qn = norm(el.dataset.q);

  const read = () => {
    const f = { q: norm(form.q.value), counted: form.counted.checked };
    for (const k of Object.keys(KEYS)) f[k] = form[k].value;
    return f;
  };
  const matches = (el, f) => {
    if (f.counted && el.dataset.status !== 'humanoid') return false;
    for (const [k, attr] of Object.entries(KEYS)) {
      if (!f[k]) continue;
      const vals = (el.dataset[attr] || '').split(' ');
      if (!vals.includes(f[k])) return false;
    }
    if (f.q) {
      const hay = el.dataset.qn ?? norm(el.dataset.q);
      if (!f.q.split(' ').every((w) => hay.includes(w))) return false;
    }
    return true;
  };
  const toUrl = (f) => {
    const p = new URLSearchParams();
    if (f.q) p.set('q', form.q.value.trim());
    for (const k of Object.keys(KEYS)) if (f[k]) p.set(k, f[k]);
    if (f.counted) p.set('counted', '1');
    const s = p.toString();
    return `${location.pathname}${s ? `?${s}` : ''}${location.hash}`;
  };
  const apply = (push) => {
    const f = read();
    let shown = 0;
    for (const el of cards) { const ok = matches(el, f); el.hidden = !ok; if (ok) shown += 1; }
    for (const tr of rows) tr.hidden = !matches(tr, f);
    for (const list of ['counted', 'others']) {
      const any = cards.some((el) => !el.hidden && el.closest(`ul[data-list="${list}"]`));
      for (const el of document.querySelectorAll(`[data-list="${list}"]`)) el.hidden = !any;
    }
    const sep = document.querySelector('.cmp-others');
    if (sep) sep.hidden = !rows.some((tr) => !tr.hidden && tr.closest('.cmp-others'));
    const active = f.q || f.counted || Object.keys(KEYS).some((k) => f[k]);
    count.textContent = active ? `Showing ${shown} of ${total} providers` : `${total} providers`;
    empty.hidden = shown > 0;
    const url = toUrl(f);
    if (url !== `${location.pathname}${location.search}${location.hash}`) history[push ? 'pushState' : 'replaceState'](null, '', url);
  };
  const fromUrl = () => {
    const p = new URLSearchParams(location.search);
    form.q.value = p.get('q') || '';
    for (const k of Object.keys(KEYS)) {
      const v = p.get(k) || '';
      form[k].value = [...form[k].options].some((o) => o.value === v) ? v : '';
    }
    form.counted.checked = p.get('counted') === '1';
  };
  const clear = () => { form.reset(); apply(true); form.q.focus(); };

  form.hidden = false;
  fromUrl();
  apply(false);
  let t = null;
  form.q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => apply(false), 120); });
  form.addEventListener('change', (e) => { if (e.target !== form.q) apply(true); });
  form.addEventListener('submit', (e) => { e.preventDefault(); apply(true); });
  for (const b of document.querySelectorAll('.if-clear')) b.addEventListener('click', clear);
  window.addEventListener('popstate', () => { fromUrl(); apply(false); });
})();
