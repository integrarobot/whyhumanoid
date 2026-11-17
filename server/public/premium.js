// Full-database app. It holds no data. It runs at https://whyhumanoid.com/app/ (GitHub Pages, built by
// tools/build-app.mjs, which names the API origin in <meta name="wh-api">) and, for local tests and the old address,
// on the backend's own origin, where the meta tag is absent and the API is same-origin. Visitors and signed-in
// users without a subscription get the free Humanoids catalogue and each other category's first 10 sheet rows;
// subscribers get every row and field, after a server-side entitlement check on every request (Javier, 16 Nov 2026:
// paywall, EUR 100 per year, no free trial). Same table and "View all data" card as whyhumanoid.com.
(() => {
  // Never inside a frame: the page is static, so this replaces the frame-ancestors header the backend used to send.
  if (window.top !== window.self) { document.documentElement.hidden = true; return; }
  const API = (document.querySelector('meta[name="wh-api"]')?.getAttribute('content') || '').replace(/\/$/, '');
  const PAGE = 500;
  const $ = (id) => document.getElementById(id);
  const store = {
    get() { try { return localStorage.getItem('wh_session'); } catch { return null; } },
    set(v) { try { localStorage.setItem('wh_session', v); } catch { /* storage unavailable */ } },
    clear() { try { localStorage.removeItem('wh_session'); } catch { /* storage unavailable */ } },
  };
  const state = { session: store.get(), me: null, plan: null, datasets: [], current: null, pendingLogin: null };
  const cache = {};
  const totals = {};
  const full = () => Boolean(state.me?.access?.active);
  const HIDDEN = new Set(['id']); // the backend row key; the API never sends importer bookkeeping

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const label = (k) => k.replace(/_/g, ' ');
  const nz = (v) => v !== null && v !== undefined && String(v).trim() !== '';
  const human = (v) => String(v).replace(/_/g, ' ');
  const sub = (s) => (s ? `<span class="sub">${s}</span>` : '');
  const link = (u, text) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(text || u)}</a>`;
  // URLs inside text become full links that stop before trailing punctuation.
  const fmt = (v) => {
    if (!nz(v)) return '<span class="lbl">·</span>';
    return esc(v).replace(/https?:\/\/[^\s<]+/g, (u) => {
      let tail = '';
      for (let m; (m = u.match(/(&quot;|[.,;:!?\]]|\))$/)) && !(m[1] === ')' && u.includes('('));) { tail = m[1] + tail; u = u.slice(0, -m[1].length); }
      return `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>${tail}`;
    });
  };
  const day = (s) => new Date(s * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  function notice(text, isError = false) {
    $('status').textContent = text;
    $('status').classList.toggle('error', isError);
    $('status').hidden = !text;
  }
  async function api(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {};
    if (auth && state.session) headers.authorization = `Bearer ${state.session}`;
    if (body) headers['content-type'] = 'application/json';
    try {
      const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    } catch {
      return { status: 0, data: {} };
    }
  }

  // Account panel: what this visitor can do, from the server's answer only.
  function renderAccess() {
    const me = state.me;
    $('acc-anon').hidden = Boolean(me) || Boolean(state.pendingLogin);
    $('acc-user').hidden = !me;
    $('who').hidden = !me;
    $('signout').hidden = !me;
    if (!me) return;
    $('who').textContent = me.email;
    const a = me.access || {};
    const end = a.current_period_end ? day(a.current_period_end) : '';
    const price = state.plan?.plan?.price || '€100 per year';
    let title, text, cls, st;
    if (a.active && a.cancel_at_period_end) {
      [title, text, cls, st] = ['Full access until ' + end, 'Your subscription is cancelled and will not renew. You keep full access until ' + end + '.', 'warn', 'Cancelled, active until ' + end];
    } else if (a.active) {
      [title, text, cls, st] = ['Full access', 'Your subscription renews on ' + end + ' (' + price + '). Manage your card, invoices or cancellation in the Stripe portal.', 'ok', 'Active until ' + end];
    } else if (a.status === 'past_due' || a.status === 'unpaid') {
      [title, text, cls, st] = ['Payment needed', 'The last payment failed, so full access is paused. Update your card in the Stripe portal to restore it.', 'bad', 'Payment failed'];
    } else if (a.status && a.status !== 'none') {
      [title, text, cls, st] = ['Subscription ended', 'Your subscription is no longer active' + (end ? ' (paid period ended ' + end + ')' : '') + '. Subscribe again to reopen the full database.', 'bad', 'Expired'];
    } else {
      [title, text, cls, st] = ['No subscription yet', 'You are seeing the free Humanoids catalogue and the free previews. Subscribe for ' + price + ', paid yearly, no free trial, cancel any time.', '', 'No subscription'];
    }
    $('acc-title').textContent = title;
    $('acc-text').textContent = text;
    $('acc-state').textContent = st;
    $('acc-state').className = 'state ' + cls;
    // A failed renewal is fixed in the portal (update the card), not with a second subscription.
    const canBuy = !a.active && !['past_due', 'unpaid', 'incomplete'].includes(a.status);
    $('checkout').hidden = !canBuy;
    $('checkout').textContent = 'Subscribe for ' + price;
    $('checkout').disabled = !me.checkout_available;
    if (canBuy && !me.checkout_available) $('acc-text').textContent += ' Subscriptions are not open yet.';
    $('portal').hidden = !me.billing_portal;
  }

  // Categories, grouped as on whyhumanoid.com.
  const GROUPS = [
    ['Robots', ['humanoids', 'other-robots']],
    ['Deployments and evidence', ['deployments', 'evidence-links', 'task-evaluations', 'container-handling']],
    ['Software, hardware and data', ['software', 'hardware', 'datasets']],
    ['Companies', ['stocks', 'integrators', 'entities']],
    ['Data space', ['data-space']],
  ];
  function renderIndex() {
    const by = Object.fromEntries(state.datasets.map((d) => [d.id, d]));
    const known = new Set(GROUPS.flatMap((g) => g[1]));
    const groups = GROUPS.concat([['More', state.datasets.map((d) => d.id).filter((id) => !known.has(id))]]);
    $('db-index').innerHTML = groups.map(([name, ids]) => {
      const items = ids.filter((id) => by[id]).map((id) => `<a href="#${id}" data-id="${id}"${state.current === id ? ' aria-current="true"' : ''}>${esc(by[id].title)}<span class="n" data-n="${id}">${totals[id] ?? ''}</span></a>`).join('');
      return items ? `<div class="grp"><span class="lbl">${esc(name)}</span>${items}</div>` : '';
    }).join('');
  }

  // Rows: every row for a subscriber (paged API), the public preview otherwise.
  async function load(id) {
    const mode = full() ? 'full' : 'preview';
    if (cache[id] && cache[id].mode === mode) return cache[id];
    let rows = [], total = 0, snapshot = null, previewRows = null;
    if (mode === 'full') {
      for (let offset = 0; ; offset += PAGE) {
        const { status, data } = await api(`/v1/datasets/${id}?limit=${PAGE}&offset=${offset}`);
        if (status === 401 || status === 403) { await refreshMe(); return load(id); }
        if (status !== 200) throw new Error('load');
        rows = rows.concat(data.rows);
        total = data.total; snapshot = data.snapshot;
        if (rows.length >= total || !data.rows.length) break;
      }
    } else {
      const { status, data } = await api(`/v1/datasets/${id}/preview`, { auth: false });
      if (status !== 200) throw new Error('load');
      rows = data.rows; total = data.total_rows; snapshot = data.snapshot; previewRows = data.preview_rows;
    }
    const fields = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => !HIDDEN.has(k));
    cache[id] = { mode, rows, total, snapshot, previewRows, fields };
    totals[id] = total;
    const n = document.querySelector(`[data-n="${id}"]`); if (n) n.textContent = total;
    return cache[id];
  }

  // Deployments: business columns and grouped card, as on whyhumanoid.com.
  const STATUS = [['op', 'In operation'], ['pilot', 'Pilot or trial'], ['ann', 'Announced'], ['unc', 'Unconfirmed']];
  const status = (r) => { const v = String(r.operational_status || '').toLowerCase(); return v === 'operational' ? 'op' : v === 'pilot' || v === 'testing' ? 'pilot' : v === 'planned' ? 'ann' : 'unc'; };
  const stLabel = (k) => STATUS.find((s) => s[0] === k)[1];
  const GROUPS_DEP = [
    ['Record', ['record_id', 'claim_id', 'deployment_id']],
    ['Organization', ['organization_name', 'organization_id', 'organization_role', 'organization_country']],
    ['Robot', ['manufacturer', 'robot_model', 'robot_version']],
    ['Site and sector', ['site_name', 'city', 'region', 'country', 'sector', 'environment']],
    ['Relationship and status', ['operational_status', 'commercial_status', 'relationship_type', 'observed_start', 'observed_end']],
    ['Task', ['task_description', 'task_category', 'task_id', 'workflow_from', 'workflow_to', 'integration_dependencies']],
    ['Result or metric', ['metric_name', 'metric_operator', 'metric_value', 'metric_unit', 'metric_period']],
    ['Claim and evidence', ['claim_text', 'claim_type', 'evidence_level', 'confidence', 'verification_status']],
    ['Source', ['source_title', 'source_url', 'source_publisher', 'source_role', 'source_type', 'source_id', 'publication_date', 'accessed_at', 'language']],
    ['Notes and open questions', ['open_questions_notes']],
  ];
  function groupsOf(id, fields) {
    const seen = {};
    const out = (id === 'deployments' ? GROUPS_DEP : [['Fields', fields]]).map(([n, fs]) => {
      const keep = fs.filter((f) => fields.includes(f) && !seen[f]);
      keep.forEach((f) => { seen[f] = 1; });
      return [n, keep];
    }).filter((g) => g[1].length);
    const rest = fields.filter((f) => !seen[f]);
    if (rest.length) out.push(['Other fields', rest]);
    return out;
  }
  const metric = (r) => {
    if (!nz(r.metric_name)) return '';
    const op = nz(r.metric_operator) && r.metric_operator !== '=' ? r.metric_operator + ' ' : '';
    return esc(human(r.metric_name)) + ': ' + esc(op + (r.metric_value ?? '') + (nz(r.metric_unit) ? ' ' + human(r.metric_unit) : '')) + sub(nz(r.metric_period) ? esc(human(r.metric_period)) : '');
  };
  const DEP_COLS = [
    ['Organization and robot', (r) => esc(r.organization_name || '') + sub(esc([r.manufacturer, r.robot_model].filter(nz).join(' · '))), 'cw-m'],
    ['Task', (r) => (nz(r.task_description) ? esc(r.task_description) : esc(human(r.task_category || '')) + sub('No task description in the sheet')), 'cw-l'],
    ['Site', (r) => esc(r.site_name || '') + sub(esc([r.city, r.region, r.country].filter(nz).join(', '))), 'cw-m'],
    ['Result or metric', (r) => metric(r) || '<span class="lbl">No metric in the sheet</span>', 'cw-m'],
    ['Source', (r) => {
      const u = String(r.source_url || '').match(/https?:\/\/[^\s|,;]+/);
      return (u ? link(u[0], r.source_publisher || r.source_title || u[0]) : esc(r.source_publisher || r.source_title || 'Source') + sub('No URL in the sheet')) +
        sub(nz(r.publication_date) ? 'Published ' + esc(r.publication_date) : 'Publication date not recorded');
    }, 'cw-s'],
  ];

  let dlg = null, dlgCtx = null, opener = null;
  function closeDlg() {
    if (!dlg) return;
    if (typeof dlg.close === 'function') { try { dlg.close(); return; } catch { /* fall through */ } }
    dlg.removeAttribute('open'); dlg.dispatchEvent(new Event('close'));
  }
  function dialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'db-dlg'; dlg.id = 'db-dlg'; dlg.setAttribute('aria-labelledby', 'db-dlg-title');
    dlg.innerHTML = '<div class="db-dlg-head"><div class="db-dlg-id"><span class="lbl" id="db-dlg-kicker"></span><h3 id="db-dlg-title"></h3><p class="lbl" id="db-dlg-count"></p></div>' +
      '<button type="button" id="db-dlg-close">Close</button></div><div class="db-dlg-body" id="db-dlg-body"></div>' +
      '<div class="db-dlg-foot"><button type="button" id="db-dlg-prev">Previous record</button><span class="lbl" id="db-dlg-pos"></span><button type="button" id="db-dlg-next">Next record</button></div>';
    document.body.appendChild(dlg);
    dlg.querySelector('#db-dlg-close').addEventListener('click', closeDlg);
    dlg.querySelector('#db-dlg-prev').addEventListener('click', () => fill(dlgCtx.pos - 1));
    dlg.querySelector('#db-dlg-next').addEventListener('click', () => fill(dlgCtx.pos + 1));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDlg(); });
    dlg.addEventListener('close', () => {
      if (dlg.open) return;
      document.documentElement.classList.remove('dlg-open');
      if (opener && document.body.contains(opener)) opener.focus();
    });
    return dlg;
  }
  function fill(pos) {
    const { id, list, data, title } = dlgCtx;
    if (pos < 0 || pos >= list.length) return;
    dlgCtx.pos = pos;
    const r = list[pos], isDep = id === 'deployments', fields = data.fields;
    const withData = fields.filter((f) => nz(r[f])).length;
    const name = isDep ? [r.organization_name, [r.manufacturer, r.robot_model].filter(nz).join(' ')].filter(nz).join(' · ')
      : (fields.filter((f) => f !== 'list' && nz(r[f])).map((f) => r[f])[0] || title);
    dlg.querySelector('#db-dlg-kicker').textContent = `${title} · entry ${data.rows.indexOf(r) + 1}` + (isDep && nz(r.record_id) ? ' · ' + r.record_id : '');
    dlg.querySelector('#db-dlg-title').textContent = name;
    dlg.querySelector('#db-dlg-count').textContent = `${fields.length} fields · ${withData} with data · ${fields.length - withData} empty in the sheet`;
    const body = dlg.querySelector('#db-dlg-body');
    body.innerHTML = (isDep ? `<p class="db-dlg-st"><span class="dst ${status(r)}">${stLabel(status(r))}</span><span class="lbl">operational status in the sheet: ${esc(r.operational_status || 'empty')}</span></p>` : '') +
      groupsOf(id, fields).map(([g, fs]) => `<section class="db-sec"><h4 class="lbl">${esc(g)}</h4><dl class="db-kv">` +
        fs.map((k) => `<dt>${esc(label(k))}</dt>` + (nz(r[k]) ? `<dd data-f="${esc(k)}">${fmt(r[k])}</dd>` : `<dd data-f="${esc(k)}" class="nil">Empty in the sheet</dd>`)).join('') + '</dl></section>').join('');
    body.scrollTop = 0;
    dlg.querySelector('#db-dlg-pos').textContent = `Record ${pos + 1} of ${list.length}`;
    dlg.querySelector('#db-dlg-prev').disabled = pos === 0;
    dlg.querySelector('#db-dlg-next').disabled = pos === list.length - 1;
  }
  function openRecord(ctx, pos, from) {
    dialog(); dlgCtx = ctx; opener = from || null; fill(pos);
    if (!dlg.open) { if (typeof dlg.showModal === 'function') { try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); } } else dlg.setAttribute('open', ''); }
    document.documentElement.classList.add('dlg-open');
    dlg.querySelector('#db-dlg-close').focus();
  }

  async function show(id) {
    const meta = state.datasets.find((d) => d.id === id) || state.datasets[0];
    if (!meta) return;
    state.current = meta.id;
    renderIndex();
    if (dlg && dlg.open) closeDlg();
    const panel = $('db-panel');
    panel.innerHTML = '<p class="db-empty">Loading…</p>';
    let data;
    try { data = await load(meta.id); } catch { panel.innerHTML = '<p class="db-empty">This category could not be loaded. Reload the page to try again.</p>'; return; }
    if (state.current !== meta.id) return;
    const isDep = meta.id === 'deployments';
    const cols = isDep ? DEP_COLS : data.fields.filter((f) => f !== 'list').slice(0, 4).map((f) => [label(f), (r) => fmt(r[f])]);
    const preview = data.mode === 'preview' && data.previewRows !== 'all';
    const locked = preview ? Math.max(0, data.total - data.rows.length) : 0;
    panel.innerHTML =
      `<div class="db-panel-head"><div><h2>${esc(meta.title)}</h2><p>${esc(meta.description || '')}</p>` +
      `<p class="db-hint">${preview ? `Free preview: the first 10 sheet rows (${data.rows.length} entries) of ${data.total}.` : `${data.total} entries${data.mode === 'full' ? ', full database' : ''}.`} <b>View all data</b> opens every field of an entry (${data.fields.length} fields), in full.</p>` +
      `<p class="lbl" id="db-count"></p></div><label class="db-search"><span class="lbl">Search ${preview ? 'the preview' : 'every field'}</span><br><input id="db-q" type="search" autocomplete="off" placeholder="Filter every field"></label></div>` +
      (isDep ? '<div class="db-status" id="db-status" role="group" aria-label="Filter by status"></div>' : '') +
      `<div class="db-scroll"><table class="db-table${isDep ? ' dep' : ''}"><thead><tr><th scope="col">#</th>${isDep ? '<th scope="col">Status</th>' : ''}<th scope="col">Record</th>` +
      cols.map((c) => `<th scope="col">${esc(c[0])}</th>`).join('') + '</tr></thead><tbody id="db-rows"></tbody></table></div>';
    const body = $('db-rows'), ncol = cols.length + (isDep ? 3 : 2);
    let q = '', st = 'all', shown = data.rows;
    const lockRow = () => {
      if (!locked) return '';
      const cta = !state.me ? 'Sign in above to subscribe' : state.me.checkout_available ? 'Subscribe above for full access' : 'Subscriptions open soon';
      return `<tr class="lock"><td colspan="${ncol}"><b>${locked} more entries</b> are in the full database (${esc(state.plan?.plan?.price || '€100 per year')}). ${cta}.</td></tr>`;
    };
    function render() {
      shown = data.rows.filter((r) => (!isDep || st === 'all' || status(r) === st) && (!q || Object.keys(r).some((k) => !HIDDEN.has(k) && String(r[k] ?? '').toLowerCase().includes(q))));
      $('db-count').textContent = (shown.length !== data.rows.length ? shown.length + ' of ' : '') + data.rows.length + ' entries shown' + (data.snapshot ? ' · workbook copy ' + String(data.snapshot).slice(0, 10) : '');
      body.innerHTML = (shown.length ? shown.map((r) => {
        const n = data.rows.indexOf(r) + 1;
        return `<tr class="r" data-i="${n - 1}"><td class="num">${n}</td>` + (isDep ? `<td class="stc"><span class="dst ${status(r)}">${stLabel(status(r))}</span></td>` : '') +
          `<td class="opc"><button type="button" class="db-open" aria-haspopup="dialog" aria-label="View all data, entry ${n}">View all data</button></td>` +
          cols.map((c) => `<td data-label="${esc(c[0])}"${c[2] ? ` class="${c[2]}"` : ''}>${c[2] ? '<div>' + c[1](r) + '</div>' : c[1](r)}</td>`).join('') + '</tr>';
      }).join('') : `<tr><td class="db-empty" colspan="${ncol}">No entries match.</td></tr>`) + lockRow();
    }
    if (isDep) {
      const bar = $('db-status');
      const count = (k) => data.rows.filter((r) => k === 'all' || status(r) === k).length;
      bar.innerHTML = [['all', 'All']].concat(STATUS).map(([k, t]) => `<button type="button" data-st="${k}" aria-pressed="${k === 'all'}">${t} ${count(k)}</button>`).join('');
      bar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st = b.dataset.st; [...bar.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(); });
    }
    body.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      const tr = e.target.closest('tr.r'); if (!tr) return;
      const r = data.rows[+tr.dataset.i];
      openRecord({ id: meta.id, title: meta.title, data, list: shown }, shown.indexOf(r), tr.querySelector('.db-open'));
    });
    $('db-q').addEventListener('input', (e) => { q = e.target.value.toLowerCase(); render(); });
    render();
  }

  async function refreshMe() {
    if (!state.session) { state.me = null; return; }
    const { status, data } = await api('/v1/me');
    if (status === 200) state.me = data;
    else if (status === 401) { state.session = null; state.me = null; store.clear(); }
  }
  async function refresh() {
    const before = full();
    await refreshMe();
    renderAccess();
    if (before !== full()) Object.keys(cache).forEach((k) => delete cache[k]);
    await show(state.current || location.hash.slice(1) || 'deployments');
  }
  function signOut(message = '') {
    if (state.session) api('/v1/auth/logout', { method: 'POST' });
    state.session = null; state.me = null; store.clear();
    notice(message);
    refresh();
  }

  async function init() {
    // The one-time link is redeemed only on a click, so mail scanners that open links cannot use it up.
    const login = /[#&]login=([^&]+)/.exec(location.hash)?.[1];
    if (login) {
      history.replaceState(null, '', location.pathname + location.search);
      state.pendingLogin = login;
      $('confirm-login').hidden = false;
    }
    const params = new URLSearchParams(location.search);
    const [list, plan] = await Promise.all([api('/v1/datasets', { auth: false }), api('/v1/billing/plan', { auth: false })]);
    if (list.status !== 200) return notice('The service is not available right now.', true);
    state.datasets = list.data.datasets;
    state.plan = plan.status === 200 ? plan.data : null;
    if (state.plan) $('price').textContent = state.plan.plan.price;
    if (!/^[a-z0-9-]+$/.test(location.hash.slice(1))) history.replaceState(null, '', location.pathname + location.search + '#deployments');
    state.current = location.hash.slice(1);
    await refresh();
    // Entry counts in the category list, from the public previews (cached by the API for 5 minutes).
    state.datasets.filter((d) => d.id !== 'humanoids' && !cache[d.id]).forEach((d) => api(`/v1/datasets/${d.id}/preview`, { auth: false }).then(({ status, data }) => {
      if (status !== 200) return;
      totals[d.id] = data.total_rows;
      const n = document.querySelector(`[data-n="${d.id}"]`); if (n) n.textContent = data.total_rows;
    }));
    if (params.get('checkout') === 'cancelled') notice('Checkout was cancelled. Nothing was charged.');
    if (params.get('checkout') === 'success') {
      notice('Payment received. Full access opens as soon as Stripe confirms the subscription.');
      for (let i = 0; i < 20 && !full(); i++) { await new Promise((r) => setTimeout(r, 3000)); await refresh(); }
      notice(full() ? 'Your subscription is active. Welcome to the full database.' : 'Stripe has not confirmed the subscription yet. Reload this page in a minute.');
    }
    if (params.has('checkout') || params.has('billing')) history.replaceState(null, '', location.pathname + location.hash);
  }

  $('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { status, data } = await api('/v1/auth/magic-link', { method: 'POST', body: { email: $('email').value }, auth: false });
    if (status === 202) notice('Check your email for a sign-in link. It works once and expires in 15 minutes.');
    else if (data.error === 'too_many_login_requests') notice('Too many requests. Try again later.', true);
    else if (data.error === 'email_not_configured') notice('Sign-in is not available yet.', true);
    else notice('The sign-in link could not be sent.', true);
  });
  $('checkout').addEventListener('click', async () => {
    $('checkout').disabled = true;
    const { status, data } = await api('/v1/billing/checkout', { method: 'POST' });
    if (status === 200 && data.url) return location.assign(data.url);
    $('checkout').disabled = false;
    if (data.error === 'already_subscribed') { notice('Your subscription is already active.'); return refresh(); }
    notice(data.error === 'checkout_disabled' || data.error === 'live_checkout_disabled' ? 'Subscriptions are not open yet.' : 'Checkout is not available right now.', true);
  });
  $('portal').addEventListener('click', async () => {
    $('portal').disabled = true;
    const { status, data } = await api('/v1/billing/portal', { method: 'POST' });
    $('portal').disabled = false;
    if (status === 200 && data.url) return location.assign(data.url);
    notice('The subscription portal is not available right now.', true);
  });
  $('confirm-login-btn').addEventListener('click', async () => {
    $('confirm-login-btn').disabled = true;
    const token = state.pendingLogin;
    state.pendingLogin = null;
    $('confirm-login').hidden = true;
    const { status, data } = await api('/v1/auth/redeem', { method: 'POST', body: { token }, auth: false });
    if (status === 200) { state.session = data.token; store.set(data.token); notice(''); }
    else notice('This sign-in link is invalid or has expired. Request a new one.', true);
    await refresh();
  });
  $('signout').addEventListener('click', () => signOut());
  $('db-index').addEventListener('click', (e) => { const a = e.target.closest('a[data-id]'); if (!a) return; e.preventDefault(); history.pushState(null, '', '#' + a.dataset.id); show(a.dataset.id); });
  window.addEventListener('popstate', () => { const id = location.hash.slice(1); if (id && id !== state.current) show(id); });

  init();
})();
