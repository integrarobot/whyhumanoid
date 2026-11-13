// Full-database app, served by the backend on the same origin as the API. It holds no data: anonymous visitors
// get each dataset's public 10-row preview; subscribers get full rows and search after a server-side
// entitlement check on every request.
(() => {
  const PAGE = 100;
  const $ = (id) => document.getElementById(id);
  const store = {
    get() { try { return sessionStorage.getItem('wh_session'); } catch { return null; } },
    set(v) { try { sessionStorage.setItem('wh_session', v); } catch { /* storage unavailable */ } },
    clear() { try { sessionStorage.removeItem('wh_session'); } catch { /* storage unavailable */ } },
  };
  const state = { session: store.get(), me: null, datasets: [], current: null, offset: 0, q: '', plan: null };
  const full = () => Boolean(state.me?.access?.active);

  function notice(text, isError = false) {
    $('status').textContent = text;
    $('status').classList.toggle('error', isError);
    $('status').hidden = !text;
  }

  async function api(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {};
    if (auth && state.session) headers.authorization = `Bearer ${state.session}`;
    if (body) headers['content-type'] = 'application/json';
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  }

  function renderNav() {
    $('datasets').replaceChildren(...state.datasets.map((d) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = d.title;
      b.setAttribute('aria-current', String(state.current === d.id));
      b.addEventListener('click', () => { state.q = ''; $('search').value = ''; openDataset(d.id); });
      li.append(b);
      return li;
    }));
  }

  function renderTable(rows) {
    const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const head = document.createElement('tr');
    for (const c of columns) {
      const th = document.createElement('th');
      th.textContent = c;
      head.append(th);
    }
    $('thead').replaceChildren(head);
    $('tbody').replaceChildren(...rows.map((row) => {
      const tr = document.createElement('tr');
      for (const c of columns) {
        const td = document.createElement('td');
        const v = row[c];
        if (typeof v === 'string' && /^https?:\/\/\S+$/.test(v)) {
          const a = document.createElement('a');
          a.href = v; a.textContent = v; a.rel = 'noopener noreferrer'; a.target = '_blank';
          td.append(a);
        } else td.textContent = v ?? '';
        tr.append(td);
      }
      return tr;
    }));
  }

  async function openDataset(id, offset = 0) {
    state.current = id;
    state.offset = offset;
    renderNav();
    const q = state.q ? `&q=${encodeURIComponent(state.q)}` : '';
    const { status, data } = full()
      ? await api(`/v1/datasets/${id}?limit=${PAGE}&offset=${offset}${q}`)
      : await api(`/v1/datasets/${id}/preview`, { auth: false });
    if (status === 401) return signOut('Your session has ended. Sign in again.');
    if (status === 403) return refresh();
    if (status !== 200) return notice('The dataset could not be loaded.', true);
    $('viewer').hidden = false;
    $('dataset-title').textContent = data.dataset.title;
    $('dataset-description').textContent = data.dataset.description;
    const total = full() ? data.total : data.total_rows;
    $('count').textContent = full()
      ? `${total} rows${data.snapshot ? ` · snapshot ${data.snapshot.slice(0, 10)}` : ''}`
      : `Free preview: first ${data.rows.length ? Math.min(data.preview_rows, data.rows.length) : 0} sheet rows of ${total}`;
    $('search').hidden = !full();
    $('prev').hidden = !full();
    $('next').hidden = !full();
    $('prev').disabled = offset === 0;
    $('next').disabled = offset + PAGE >= total;
    renderTable(data.rows);
  }

  async function refresh() {
    $('signin').hidden = true;
    $('subscribe').hidden = true;
    if (state.session) {
      const { status, data } = await api('/v1/me');
      if (status === 200) {
        state.me = data;
        $('who').textContent = data.email;
        $('who').hidden = false;
        $('signout').hidden = false;
      } else {
        state.session = null;
        store.clear();
      }
    }
    if (!state.session) $('signin').hidden = false;
    else if (!full()) $('subscribe').hidden = false;
    $('checkout').disabled = !state.plan?.checkout_available;
    await openDataset(state.current ?? state.datasets[0]?.id);
  }

  function signOut(message = '') {
    if (state.session) api('/v1/auth/logout', { method: 'POST' }).catch(() => {});
    state.session = null;
    state.me = null;
    store.clear();
    $('who').hidden = true;
    $('signout').hidden = true;
    notice(message);
    refresh();
  }

  async function init() {
    const login = /[#&]login=([^&]+)/.exec(location.hash)?.[1];
    if (login) {
      history.replaceState(null, '', location.pathname + location.search);
      const { status, data } = await api('/v1/auth/redeem', { method: 'POST', body: { token: login }, auth: false });
      if (status === 200) { state.session = data.token; store.set(data.token); }
      else notice('This sign-in link is invalid or has expired. Request a new one.', true);
    }
    const checkout = new URLSearchParams(location.search).get('checkout');
    if (checkout === 'success') notice('Payment received. Full access opens as soon as Stripe confirms the subscription.');
    if (checkout === 'cancelled') notice('Checkout was cancelled. Nothing was charged.');
    const [list, plan] = await Promise.all([api('/v1/datasets', { auth: false }), api('/v1/billing/plan', { auth: false })]);
    if (list.status !== 200) return notice('The service is not available right now.', true);
    state.datasets = list.data.datasets;
    state.plan = plan.status === 200 ? plan.data : null;
    if (state.plan) for (const id of ['price-copy', 'price-copy-2']) $(id).textContent = state.plan.plan.price;
    await refresh();
  }

  $('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { status, data } = await api('/v1/auth/magic-link', { method: 'POST', body: { email: $('email').value }, auth: false });
    if (status === 202) notice('Check your email for a sign-in link. It works once and expires in 15 minutes.');
    else notice(data.error === 'too_many_login_requests' ? 'Too many requests. Try again later.' : 'The sign-in link could not be sent.', true);
  });
  $('checkout').addEventListener('click', async () => {
    const { status, data } = await api('/v1/billing/checkout', { method: 'POST' });
    if (status === 200 && data.url) location.assign(data.url);
    else if (data.error === 'checkout_disabled') notice('Subscriptions open soon.');
    else notice('Checkout is not available right now.', true);
  });
  $('signout').addEventListener('click', () => signOut());
  $('prev').addEventListener('click', () => openDataset(state.current, Math.max(0, state.offset - PAGE)));
  $('next').addEventListener('click', () => openDataset(state.current, state.offset + PAGE));
  let timer;
  $('search').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = e.target.value.trim(); openDataset(state.current, 0); }, 300);
  });

  init();
})();
