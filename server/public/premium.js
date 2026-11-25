// Full-database app. It holds no data. It runs at https://whyhumanoid.com/app/ (GitHub Pages, built by
// tools/build-app.mjs, which names the API origin in <meta name="wh-api">) and, for local tests and the old address,
// on the backend's own origin, where the meta tag is absent and the API is same-origin. Visitors and signed-in
// users without a subscription get every free category in full and every Deployments and Components entry at its
// public fields (server/src/access/fields.js); subscribers get every row and field, after a server-side entitlement
// check on every request (Javier, 24 Nov 2026: US$100 per year billed annually for new subscriptions, no free trial;
// existing EUR subscriptions keep their price). Same table and "View all data" card as whyhumanoid.com.
// Relations (Javier, 17 Nov 2026): each robot shows where it works, doing what and with which evidence; each record
// links to its robot, maker and organisation; each company lists its robots and records by role. The server builds
// the graph; visitors get the graph of the 10 public Deployments rows only. Stable links: #robot/<catalogue id>,
// #company/<id>, #<category>/<record id> (any "View all data" card), all surviving reloads and back/forward.
// Global search (Javier, 17 Nov 2026): #search?q=&tags=&category=&page= across the 13 categories, with common tags.
// The server picks what may be searched (public rows for visitors, every row for subscribers) before searching.
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
    const price = state.plan?.plan?.price || 'US$100 per year';
    let title, text, cls, st;
    if (a.active && a.cancel_at_period_end) {
      [title, text, cls, st] = ['Full access until ' + end, 'Your subscription is cancelled and will not renew. You keep full access until ' + end + '.', 'warn', 'Cancelled, active until ' + end];
    } else if (a.active) {
      // Renewal at the subscription's own price: a subscription bought in EUR keeps its currency and amount.
      [title, text, cls, st] = ['Full access', 'Your subscription renews on ' + end + ' at the price of your subscription. Manage your card, invoices or cancellation in the Stripe portal.', 'ok', 'Active until ' + end];
    } else if (a.status === 'past_due' || a.status === 'unpaid') {
      [title, text, cls, st] = ['Payment needed', 'The last payment failed, so full access is paused. Update your card in the Stripe portal to restore it.', 'bad', 'Payment failed'];
    } else if (a.status && a.status !== 'none') {
      [title, text, cls, st] = ['Subscription ended', 'Your subscription is no longer active' + (end ? ' (paid period ended ' + end + ')' : '') + '. Subscribe again to reopen complete Deployments and Components.', 'bad', 'Expired'];
    } else {
      [title, text, cls, st] = ['No subscription yet', 'You are seeing the free data: every free category in full, and every Deployments case and Components product with its public summary. The data subscription, ' + price + ' billed annually with no free trial, adds the detail of every case and the full technical passport of every product; cancel any time.', '', 'No subscription'];
    }
    $('acc-title').textContent = title;
    $('acc-text').textContent = text;
    $('acc-state').textContent = st;
    $('acc-state').className = 'state acc-state ' + cls;
    // A failed renewal is fixed in the portal (update the card), not with a second subscription.
    const canBuy = !a.active && !['past_due', 'unpaid', 'incomplete'].includes(a.status);
    $('checkout').hidden = !canBuy;
    $('checkout').textContent = 'Subscribe for ' + price;
    $('checkout').disabled = !me.checkout_available;
    if (canBuy && !me.checkout_available) $('acc-text').textContent += ' New subscriptions are temporarily unavailable. Please try again later.';
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
      const items = ids.filter((id) => by[id]).map((id) => `<a href="#${id}" data-id="${id}"${state.current === id ? ' aria-current="true"' : ''}>${esc(by[id].title)}${by[id].offer === false ? ' <span class="lbl">not in the subscription offer</span>' : ''}<span class="n" data-n="${id}">${totals[id] ?? ''}</span></a>`).join('');
      return items ? `<div class="grp"><span class="lbl">${esc(name)}</span>${items}</div>` : '';
    }).join('');
  }

  // Rows: every row for a subscriber (paged API); otherwise the public rows (free tabs in full, Deployments and
  // Components at their public fields).
  // "138 entries (141 rows: 3 are the same entry in a second list)", or "276 entries" when rows and entries agree.
  const countText = (data) => { const e = data.entries ?? data.total; return `${e} entr${e === 1 ? 'y' : 'ies'}${e !== data.total ? ` (${data.total} rows: ${data.total - e} ${data.total - e === 1 ? 'is' : 'are'} the same entry in a second list)` : ''}`; };
  async function load(id) {
    const mode = full() ? 'full' : 'preview';
    if (cache[id] && cache[id].mode === mode) return cache[id];
    let rows = [], total = 0, entries = null, snapshot = null, previewRows = null, publicFields = null;
    if (mode === 'full') {
      for (let offset = 0; ; offset += PAGE) {
        const { status, data } = await api(`/v1/datasets/${id}?limit=${PAGE}&offset=${offset}`);
        if (status === 401 || status === 403) { await refreshMe(); return load(id); }
        if (status !== 200) throw new Error('load');
        rows = rows.concat(data.rows);
        total = data.total; entries = data.entries ?? null; snapshot = data.snapshot;
        if (rows.length >= total || !data.rows.length) break;
      }
    } else {
      const { status, data } = await api(`/v1/datasets/${id}/preview`, { auth: false });
      if (status !== 200) throw new Error('load');
      rows = data.rows; total = data.total_rows; entries = data.entries ?? null; snapshot = data.snapshot; previewRows = data.preview_rows; publicFields = data.public_fields ?? null;
      // An API older than 24 Nov 2026 answers visitors with the first rows in full and no field contract: show them at
      // the public fields embedded by tools/build-app.mjs, like the rest of the site (the subscriber view is unchanged).
      const contract = PAGES.public_fields?.[id];
      if (!publicFields && Array.isArray(contract)) {
        publicFields = contract;
        rows = contract.length ? rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k === 'id' || contract.includes(k)))) : [];
      }
    }
    const fields = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => !HIDDEN.has(k));
    // entries: canonical entries of a directory tab (a membership row, canonical: false, is the same entry in a second
    // list); every other tab has entries = rows.
    if (entries === null) entries = rows.length === total ? rows.filter((r) => r.canonical !== false).length : total;
    cache[id] = { mode, rows, total, entries, snapshot, previewRows, publicFields, fields };
    // The category list counts entries, like the home page and the API (a membership row is not a second entry).
    totals[id] = entries;
    const n = document.querySelector(`[data-n="${id}"]`); if (n) n.textContent = entries;
    return cache[id];
  }

  // Relations graph from the server: full for subscribers, the 10 public Deployments rows for everyone else.
  const rel = { mode: null, g: null, error: null, rec: new Map(), co: new Map(), robots: new Map(), byRobot: new Map(), byCompany: new Map() };
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  async function relations(retry = true) {
    const mode = full() ? 'full' : 'preview';
    if (rel.mode === mode && rel.g) return rel;
    const res = await api(mode === 'full' ? '/v1/relations' : '/v1/relations/preview', { auth: mode === 'full' });
    if (mode === 'full' && (res.status === 401 || res.status === 403) && retry) { await refreshMe(); return relations(false); }
    if (res.status !== 200 || !res.data?.records) { Object.assign(rel, { mode: null, g: null, error: res.status }); return rel; }
    const g = res.data;
    Object.assign(rel, { mode: g.scope === 'full' ? 'full' : 'preview', g, error: null, rec: new Map(), co: new Map(), robots: new Map(), byRobot: new Map(), byCompany: new Map() });
    g.robots.forEach((r) => rel.robots.set(r.id, r));
    g.companies.forEach((c) => { rel.co.set(c.id, c); (c.organization_ids || []).forEach((o) => { if (!rel.co.has(o)) rel.co.set(o, c); }); });
    g.records.forEach((r) => {
      rel.rec.set(r.record_id, r);
      if (r.robot !== null) push(rel.byRobot, r.robot, r);
      if (r.maker) push(rel.byCompany, r.maker, r);
      if (r.operator && r.operator !== r.maker) push(rel.byCompany, r.operator, r);
    });
    return rel;
  }
  const ROLE = { maker: 'Maker', customer_operator: 'Operator or customer', customer_investor: 'Customer and investor', technology_partner: 'Technology partner or integrator' };
  const REASON = {
    model_not_disclosed: 'the record does not name the model',
    model_not_in_catalogue: 'the record names a model that has no record of its own in the Humanoids catalogue',
    maker_not_in_catalogue: 'the maker has no robot in the Humanoids catalogue',
    maker_not_disclosed: 'the record does not name the maker',
    maker_missing: 'the record does not name the maker',
    several_makers: 'the record names several makers',
    several_catalogue_robots: 'several catalogue robots match the name, so none is linked',
    no_organization_id: 'the sheet gives no organisation id for it',
  };
  const robotLabel = (rb) => rb ? `${rb.robot} by ${rb.lab}` : '';
  const companyLink = (id, text) => { const c = id && rel.co.get(id); return c ? `<a href="#company/${encodeURIComponent(c.id)}">${esc(text || c.name)}</a>` : esc(text || ''); };
  // Permanent public pages (tools/build-pages.mjs): robots by slug; companies only when they have public information
  // (the map is embedded by tools/build-app.mjs; companies seen only in subscriber records have no public page).
  const PAGES = (() => { try { return JSON.parse(document.getElementById('wh-pages')?.textContent || '{}'); } catch { return {}; } })();
  const publicRobot = (rb) => `https://whyhumanoid.com/robots/${esc(String(rb.slug).replace(/^r-/, ''))}/`;
  const publicCompany = (c) => { const p = PAGES.companies?.[c.id] || (c.organization_ids || []).map((o) => PAGES.companies?.[o]).find(Boolean); return p ? `https://whyhumanoid.com${p}` : ''; };
  const robotLink = (id) => { const rb = rel.robots.get(id); return rb ? `<a href="#robot/${rb.id}">${esc(robotLabel(rb))}</a>` : ''; };
  const levelNote = (rr) => (rr.level === 'model' ? 'names this model' : rr.level === 'family' ? 'names the same model line with another or an unstated version' : '');
  const recordedRobot = (r) => [r.manufacturer, r.robot_model].filter(nz).join(' · ') + (nz(r.robot_version) && !/^not disclosed$/i.test(r.robot_version) ? ` (version: ${r.robot_version})` : '');
  function relLock() {
    if (rel.mode === 'full') return '';
    const cta = !state.me ? 'Sign in above to subscribe' : state.me.checkout_available ? 'Subscribe above for full access' : 'New subscriptions are temporarily unavailable';
    const n = totals.deployments;
    return `<p class="rel-lock"><b>Public summary.</b> Every${n ? ` one of the ${n}` : ''} Deployments records is linked here with its public fields and source. The data subscription adds each record's site, task description, timeline, metrics, claim and evidence (${esc(state.plan?.plan?.price || 'US$100 per year')}). ${cta}.</p>`;
  }
  // One deployment: its records (claims) in date order, each with status, task, evidence, source and its own card.
  function depGroups(list, rows, { robot = true, org = true, maker = false } = {}) {
    const groups = new Map();
    list.forEach((rr) => { const r = rows.get(rr.record_id); if (r) push(groups, rr.deployment_id || rr.record_id, [rr, r]); });
    return [...groups.values()].map((items) => {
      items.sort((a, b) => String(a[1].publication_date || a[1].observed_start || '').localeCompare(String(b[1].publication_date || b[1].observed_start || '')));
      const [rr, r] = items[0];
      const where = [r.site_name, [r.city, r.region, r.country].filter(nz).join(', ')].filter(nz).join(' · ');
      const head = [];
      if (org) head.push(rr.operator ? `${companyLink(rr.operator, r.organization_name)} <span class="lbl">${esc(ROLE[rr.role] || human(rr.role || 'organisation'))}</span>` : `${esc(r.organization_name || 'Organisation not recorded')} <span class="lbl">not linked: ${esc(REASON[rr.operator_reason] || 'no organisation id')}</span>`);
      if (maker) head.push(rr.maker ? `<span class="lbl">Maker</span> ${companyLink(rr.maker, r.manufacturer)}` : `<span class="lbl">Maker not linked: ${esc(REASON[rr.maker_reason] || 'not recorded')}</span>`);
      if (robot) head.push(rr.robot !== null ? `<span class="lbl">Robot</span> ${robotLink(rr.robot)}` : `<span class="lbl">Robot as recorded</span> ${esc(recordedRobot(r) || 'not recorded')}`);
      const claims = items.map(([x, y]) => {
        const s = status(y);
        const u = String(y.source_url || '').match(/https?:\/\/[^\s|,;]+/);
        const src = u ? link(u[0], (y.source_publisher || y.source_title || 'Source') + ' ↗') : `${esc(y.source_publisher || y.source_title || 'Source')} (no URL in the sheet)`;
        const facts = [
          `Robot as recorded: ${esc(recordedRobot(y) || 'not recorded')}`,
          nz(y.evidence_level) ? `Evidence level ${esc(y.evidence_level)}` : 'Evidence level not recorded',
          nz(y.verification_status) ? esc(human(y.verification_status)) : '',
          nz(y.observed_start) ? `Observed ${esc(y.observed_start)}${nz(y.observed_end) ? ' to ' + esc(y.observed_end) : ''}` : '',
          `Source: ${src}, ${nz(y.publication_date) ? 'published ' + esc(y.publication_date) : 'publication date not recorded'}`,
        ].filter(Boolean);
        const m = metric(y);
        return `<li class="claim"><div class="claim-h"><span class="dst ${s}">${stLabel(s)}</span><span class="task">${nz(y.task_description) ? esc(y.task_description) : esc(human(y.task_category || 'Task not described'))}</span></div>` +
          (m ? `<p class="metric">${m}</p>` : '') + `<p class="facts">${facts.join(' · ')}</p>` +
          `<a class="db-open" href="#deployments/${encodeURIComponent(x.record_id)}">View all data</a></li>`;
      }).join('');
      return `<article class="dep"><header>${head.map((h) => `<div>${h}</div>`).join('')}${where ? `<p class="where">${esc(where)}</p>` : ''}</header><ul>${claims}</ul></article>`;
    }).join('');
  }
  const STATUS_KEY = '<p class="rel-key lbl">Status as recorded: In operation · Pilot or trial · Announced (planned or agreed, not evidence of work) · Unconfirmed (claimed by a vendor or unresolved)</p>';
  function robotDeployments(id, rows) {
    const rb = rel.robots.get(id);
    const recs = rel.byRobot.get(id) || [];
    const model = recs.filter((r) => r.level === 'model'), line = recs.filter((r) => r.level === 'family');
    const others = rb ? (rel.byCompany.get(rb.maker) || []).filter((r) => r.maker === rb.maker && r.robot === null) : [];
    const n = totals.deployments;
    let html = '';
    if (model.length) html += `<h4 class="lbl">Records that name this model (${model.length})</h4>${depGroups(model, rows, { robot: false })}`;
    if (line.length) html += `<h4 class="lbl">Same model line, another or unstated version (${line.length})</h4><p class="rel-note">These records name the model line, not the version this catalogue record describes (${esc(rb?.robot || '')}). Specifications and results are not interchangeable between versions.</p>${depGroups(line, rows, { robot: false })}`;
    if (!recs.length) {
      html += rel.mode === 'full'
        ? `<p class="rel-empty">No Deployments record names this robot or its model line. The database records only deployments with a public source reviewed by Integrarobot, so this is not evidence that the robot has no deployments.</p>`
        : `<p class="rel-empty">No Deployments record names this robot or its model line. The database records only deployments with a public source reviewed by Integrarobot, so this is not evidence that the robot has no deployments.</p>`;
    }
    if (others.length && rb) html += `<p class="rel-note">${others.length} ${others.length === 1 ? 'record' : 'records'} from ${companyLink(rb.maker)} ${others.length === 1 ? 'names' : 'name'} another model or none, so ${others.length === 1 ? 'it is' : 'they are'} not attributed to this robot. <a href="#company/${encodeURIComponent(rb.maker)}">See the maker</a>.</p>`;
    return html + (recs.length ? STATUS_KEY : '') + relLock();
  }
  // The Humanoids row for a catalogue robot (same Lab and Robot as the public catalogue record).
  const sameRobot = (row, rb) => rb && String(row.Lab ?? '').trim() === String(rb.Lab ?? '').trim() && String(row.Robot ?? '').trim() === String(rb.Robot ?? '').trim();
  const robotOfRow = (row) => [...rel.robots.values()].find((rb) => sameRobot(row, rb)) || null;

  // Deployments: business columns and grouped card, as on whyhumanoid.com.
  const STATUS = [['op', 'In operation'], ['pilot', 'Pilot or trial'], ['ann', 'Announced'], ['unc', 'Unconfirmed']];
  const STATUS_RANK = { op: 0, pilot: 1, ann: 2, unc: 3 };
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
    ['Organization and robot', (r) => {
      const rr = rel.rec.get(r.record_id);
      const org = rr?.operator ? companyLink(rr.operator, r.organization_name) : esc(r.organization_name || '');
      const rob = rr && rr.robot !== null ? `${esc([r.manufacturer, r.robot_model].filter(nz).join(' · '))} → ${robotLink(rr.robot)}` : esc([r.manufacturer, r.robot_model].filter(nz).join(' · '));
      return org + sub(rob);
    }, 'cw-m'],
    ['Task', (r) => (nz(r.task_description) ? esc(r.task_description) : esc(human(r.task_category || '')) + sub('No task description in the sheet')), 'cw-l'],
    ['Site', (r) => esc(r.site_name || '') + sub(esc([r.city, r.region, r.country].filter(nz).join(', '))), 'cw-m'],
    ['Result or metric', (r) => metric(r) || '<span class="lbl">No metric in the sheet</span>', 'cw-m'],
    ['Source', (r) => {
      const u = String(r.source_url || '').match(/https?:\/\/[^\s|,;]+/);
      return (u ? link(u[0], r.source_publisher || r.source_title || u[0]) : esc(r.source_publisher || r.source_title || 'Source') + sub('No URL in the sheet')) +
        sub(nz(r.publication_date) ? 'Published ' + esc(r.publication_date) : 'Publication date not recorded');
    }, 'cw-s'],
  ];
  // Visitors see every record at its public fields (24 Nov 2026): no column pretends a paid field is missing.
  const REVIEW_LBL = { customer_confirmed: 'Confirmed by the customer or operator', partner_reported: 'Reported by a partner', vendor_reported: 'Reported by the vendor', media_reported: 'Reported by the media', unresolved: 'Unresolved' };
  const DEP_PUBLIC_COLS = [
    ['Organization and robot', (r) => {
      const rr = rel.rec.get(r.record_id);
      const org = rr?.operator ? companyLink(rr.operator, r.organization_name) : esc(r.organization_name || '');
      const rob = rr && rr.robot !== null ? `${esc([r.manufacturer, r.robot_model].filter(nz).join(' · '))} → ${robotLink(rr.robot)}` : esc([r.manufacturer, r.robot_model].filter(nz).join(' · '));
      return org + sub(rob);
    }, 'cw-m'],
    ['Task', (r) => esc(human(r.task_category && r.task_category !== 'unspecified' ? r.task_category : 'Task not specified in the sources')), 'cw-m'],
    ['Sector and country', (r) => esc(human(r.sector || '')) + sub(esc(r.country || '')), 'cw-m'],
    ['Reported by', (r) => esc(REVIEW_LBL[r.verification_status] || human(r.verification_status || 'Not recorded')), 'cw-m'],
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
      const r = parseHash();
      if (r && r.view === 'record' && dlgCtx && r.dataset === dlgCtx.id) setHash(dlgCtx.id, false);
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
    let links = '';
    if (isDep && rel.g) {
      const rr = rel.rec.get(r.record_id);
      links = rr ? `<section class="db-sec rel-links"><h4 class="lbl">Links</h4><dl class="db-kv">` +
        `<dt>Robot</dt><dd>${rr.robot !== null ? `${robotLink(rr.robot)} <span class="lbl">the record ${levelNote(rr)}</span>` : `Not linked to a catalogue robot: ${esc(REASON[rr.robot_reason] || 'not resolved')}. As recorded: ${esc(recordedRobot(r) || 'nothing')}`}</dd>` +
        `<dt>Maker</dt><dd>${rr.maker ? companyLink(rr.maker, r.manufacturer) : `Not linked: ${esc(REASON[rr.maker_reason] || 'not resolved')}`}</dd>` +
        `<dt>${esc(ROLE[rr.role] || 'Organisation')}</dt><dd>${rr.operator ? companyLink(rr.operator, r.organization_name) : `${esc(r.organization_name || '')} (not linked: ${esc(REASON[rr.operator_reason] || 'not resolved')})`}</dd>` +
        (rr.deployment_id ? `<dt>Deployment</dt><dd>${esc(rr.deployment_id)}</dd>` : '') + '</dl></section>' : '';
    }
    if (id === 'humanoids' && rel.g) {
      const rb = robotOfRow(r);
      links = rb ? `<section class="db-sec rel-links"><h4 class="lbl">Deployments</h4>${dlgDeployments(rb)}<p><a href="#robot/${rb.id}">Open this robot's deployments page</a> · <a href="${publicRobot(rb)}">Public robot page ↗</a></p></section>` : '';
    }
    body.innerHTML = (isDep ? `<p class="db-dlg-st"><span class="dst ${status(r)}">${stLabel(status(r))}</span><span class="lbl">operational status in the sheet: ${esc(r.operational_status || 'empty')}</span></p>` : '') + links +
      groupsOf(id, fields).map(([g, fs]) => `<section class="db-sec"><h4 class="lbl">${esc(g)}</h4><dl class="db-kv">` +
        fs.map((k) => `<dt>${esc(label(k))}</dt>` + (nz(r[k]) ? `<dd data-f="${esc(k)}">${fmt(r[k])}</dd>` : `<dd data-f="${esc(k)}" class="nil">${data.mode === 'preview' && !(k in r) ? 'With the subscription' : 'Empty in the sheet'}</dd>`)).join('') + '</dl></section>').join('');
    body.scrollTop = 0;
    dlg.querySelector('#db-dlg-pos').textContent = `Record ${pos + 1} of ${list.length}`;
    if (r.id) setHash(`${id}/${encodeURIComponent(r.id)}`, false);
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
    try { [data] = await Promise.all([load(meta.id), ['deployments', 'humanoids'].includes(meta.id) ? relations() : null, meta.id === 'humanoids' ? load('deployments').catch(() => null) : null]); } catch { panel.innerHTML = '<p class="db-empty">This category could not be loaded. Reload the page to try again.</p>'; return; }
    if (state.current !== meta.id) return;
    const isDep = meta.id === 'deployments';
    // Visitors: Deployments and Components list every entry at its public fields (24 Nov 2026); a counted-only tab none.
    const summary = data.mode === 'preview' && Array.isArray(data.publicFields);
    const cols = isDep ? (summary ? DEP_PUBLIC_COLS : DEP_COLS) : (summary ? data.publicFields.filter((f) => f !== 'list') : data.fields.filter((f) => f !== 'list')).slice(0, 4).map((f) => [label(f), (r) => fmt(r[f])]);
    const preview = data.mode === 'preview' && data.previewRows === 'none';
    const locked = preview ? Math.max(0, data.total - data.rows.length) : 0;
    panel.innerHTML =
      `<div class="db-panel-head"><div><h2>${esc(meta.title)}</h2><p>${esc(meta.description || '')}</p>` +
      `<p class="db-hint">${preview ? `Counted, not listed: ${data.total} entries come with the subscription.` : summary ? `Free: ${data.rows.length === data.total ? `all ${countText(data)}` : `${data.rows.length} of ${data.total} entries`}, each with its public fields. <b>View all data</b> shows them and names the fields that come with the subscription.` : `${countText(data)}${data.mode === 'full' ? ', complete' : ''}. <b>View all data</b> opens every field of an entry (${data.fields.length} fields), in full.`}</p>` +
      `<p class="lbl" id="db-count"></p></div><label class="db-search"><span class="lbl">Search ${summary ? 'the public fields' : preview ? 'the free entries' : 'every field'}</span><br><input id="db-q" type="search" autocomplete="off" placeholder="Filter every field"></label></div>` +
      (isDep ? '<div class="db-status" id="db-status" role="group" aria-label="Filter by status"></div>' : '') +
      `<div class="db-scroll"><table class="db-table${isDep ? ' dep' : ''}"><thead><tr><th scope="col">#</th>${isDep ? '<th scope="col">Status</th>' : ''}<th scope="col">Record</th>` +
      cols.map((c) => `<th scope="col">${esc(c[0])}</th>`).join('') + '</tr></thead><tbody id="db-rows"></tbody></table></div>' +
      // The subscription notice sits below the table, outside its horizontal scroll, with the panel's full width.
      '<div class="db-more" id="db-more" role="note" hidden></div>';
    const body = $('db-rows'), ncol = cols.length + (isDep ? 3 : 2);
    let q = '', st = 'all', shown = data.rows;
    const more = $('db-more');
    if (locked || summary) {
      const cta = !state.me ? 'Sign in above to subscribe' : state.me.checkout_available ? 'Subscribe above for full access' : 'New subscriptions are temporarily unavailable';
      const price = esc(state.plan?.plan?.price || 'US$100 per year');
      more.innerHTML = summary
        ? `<p><b>Every field</b> of these ${data.total} entries comes with the data subscription (${price}, billed annually). ${cta}.</p>`
        : `<p><b>${locked} more ${locked === 1 ? 'entry</b> comes' : 'entries</b> come'} with the subscription (${price}). ${cta}.</p>`;
      more.hidden = false;
    }
    function render() {
      shown = data.rows.filter((r) => (!isDep || st === 'all' || status(r) === st) && (!q || Object.keys(r).some((k) => !HIDDEN.has(k) && String(r[k] ?? '').toLowerCase().includes(q))));
      const shownEntries = shown.filter((r) => r.canonical !== false).length;
      // Unfiltered: the entries with their rows note, once. Filtered: the matching entries, and their rows if a match
      // repeats an entry of another list.
      $('db-count').textContent = (shown.length === data.rows.length ? countText(data) : `${shownEntries} of ${data.entries ?? data.total} entries` + (shown.length !== shownEntries ? ` (${shown.length} rows: ${shown.length - shownEntries} ${shown.length - shownEntries === 1 ? 'is' : 'are'} the same entry in a second list)` : '')) + ' shown' + (data.snapshot ? ' · workbook copy ' + String(data.snapshot).slice(0, 10) : '');
      body.innerHTML = (shown.length ? shown.map((r) => {
        const n = data.rows.indexOf(r) + 1;
        return `<tr class="r" data-i="${n - 1}"><td class="num">${n}</td>` + (isDep ? `<td class="stc"><span class="dst ${status(r)}">${stLabel(status(r))}</span></td>` : '') +
          `<td class="opc"><button type="button" class="db-open" aria-haspopup="dialog" aria-label="View all data, entry ${n}">View all data</button></td>` +
          cols.map((c) => `<td data-label="${esc(c[0])}"${c[2] ? ` class="${c[2]}"` : ''}>${c[2] ? '<div>' + c[1](r) + '</div>' : c[1](r)}</td>`).join('') + '</tr>';
      }).join('') : `<tr><td class="db-empty" colspan="${ncol}">No entries match.</td></tr>`);
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

  function dlgDeployments(rb) {
    const dep = cache.deployments;
    if (!dep) return '<p class="rel-note">Open the robot\'s deployments page to see them.</p>';
    return robotDeployments(rb.id, new Map(dep.rows.map((r) => [r.record_id, r])));
  }
  const panelError = (text) => { $('db-panel').innerHTML = `<p class="db-empty">${text}</p>`; };
  async function relView(current) {
    state.current = current;
    renderIndex();
    if (dlg && dlg.open) closeDlg();
    $('db-panel').innerHTML = '<p class="db-empty">Loading…</p>';
    const [R, dep] = await Promise.all([relations(), load('deployments').catch(() => null)]);
    if (!R.g || !dep) { panelError('Relations could not be loaded. Reload the page to try again.'); return null; }
    return new Map(dep.rows.map((r) => [r.record_id, r]));
  }

  // A catalogue robot: where it works, doing what, with which evidence.
  async function showRobot(id) {
    const rows = await relView('humanoids');
    if (!rows) return;
    const rb = rel.robots.get(id);
    if (!rb) return panelError(`No robot with catalogue number ${esc(id)}. <a href="#humanoids">See the Humanoids catalogue</a>.`);
    const hum = await load('humanoids').catch(() => null);
    const row = hum?.rows.find((r) => sameRobot(r, rb));
    $('db-panel').innerHTML = `<div class="db-panel-head"><div><p class="lbl">Robot · Humanoids catalogue record ${rb.id}</p><h2>${esc(rb.robot)} <span class="by">by ${esc(rb.lab)}</span></h2>` +
      `<p class="rel-meta"><span class="lbl">Maker</span> ${companyLink(rb.maker)}` + (row ? ` · <a href="#humanoids/${encodeURIComponent(row.id)}">All catalogue data</a>` : '') + ` · <a href="${publicRobot(rb)}">Public robot page ↗</a></p></div></div>` +
      `<section class="rel"><h3>Deployments</h3>${robotDeployments(id, rows)}</section>`;
  }

  // A company: its roles, its robots and its records, as maker and as organisation.
  async function showCompany(id) {
    const rows = await relView(null);
    if (!rows) return;
    const c = rel.co.get(id);
    if (!c) return panelError(rel.mode === 'full' ? 'No company with this id in the database.' : `No public record names this company.${relLock()}`);
    if (c.id !== id) setHash(`company/${encodeURIComponent(c.id)}`, false);
    const recs = rel.byCompany.get(c.id) || [];
    const asMaker = recs.filter((r) => r.maker === c.id), asOrg = recs.filter((r) => r.operator === c.id);
    const roles = Object.entries(c.roles || {}).map(([k, n]) => `${esc(ROLE[k] || human(k))} (${n} ${n === 1 ? 'record' : 'records'})`).join(' · ');
    const orgs = (c.organization_ids || []).map(esc).join(', ');
    const identity = c.identity === 'sheet_organization_id'
      ? `Organisation id in the Deployments sheet: ${orgs}`
      : (c.identity === 'catalogue_lab' ? 'Maker in the Humanoids catalogue' : 'Maker outside the Humanoids catalogue, grouped by its name as recorded') +
        (orgs ? `; the organisation ${orgs} in the Deployments sheet has the same name, so it is the same company` : '');
    // A robot linked only by planned or unconfirmed records is not a robot the company uses: show its best recorded status.
    const used = new Map(), line = new Map(); // line: every record names only the robot's model line
    asOrg.forEach((rr) => {
      if (rr.robot === null) return;
      const row = rows.get(rr.record_id), s = row ? status(row) : 'unc', prev = used.get(rr.robot);
      if (prev === undefined || STATUS_RANK[s] < STATUS_RANK[prev]) used.set(rr.robot, s);
      line.set(rr.robot, (line.get(rr.robot) ?? true) && rr.level === 'family');
    });
    const kv = [
      ['Roles', roles || (rel.mode === 'full' ? 'No Deployments record names this company' : 'No public record names this company')],
      ['Identity', identity],
      ['Names as recorded', (c.names || []).map(esc).join('; ') || esc(c.name)],
      ['Countries as recorded', (c.countries || []).map(esc).join('; ') || '<span class="lbl">Not recorded</span>'],
      ['Catalogue robots', (c.robots || []).map((r) => robotLink(r)).join('; ') || '<span class="lbl">None</span>'],
      ['Robots in its records', [...used].map(([r, s]) => `${robotLink(r)} <span class="lbl">${stLabel(s)}${line.get(r) ? ' · model line only' : ''}</span>`).join('; ') || '<span class="lbl">None linked</span>'],
      ['Entities record', c.entity_id ? `<a href="#entities/${encodeURIComponent(c.entity_id)}">${esc(c.entity_id)}</a>` : '<span class="lbl">None</span>'],
    ];
    $('db-panel').innerHTML = `<div class="db-panel-head"><div><p class="lbl">Company</p><h2>${esc(c.name)}</h2><p>Only what the records say: no corporate data is added.${publicCompany(c) ? ` <a href="${esc(publicCompany(c))}">Public company page ↗</a>` : ''}</p></div></div>` +
      `<dl class="db-kv rel-kv">${kv.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` +
      (asMaker.length ? `<section class="rel"><h3>As maker (${asMaker.length} ${asMaker.length === 1 ? 'record' : 'records'})</h3>${depGroups(asMaker, rows, { robot: true, org: true })}</section>` : '') +
      (asOrg.length ? `<section class="rel"><h3>As organisation (${asOrg.length} ${asOrg.length === 1 ? 'record' : 'records'})</h3>${depGroups(asOrg, rows, { robot: true, org: false, maker: true })}</section>` : '') +
      (recs.length ? STATUS_KEY : '') + relLock();
  }

  // Any "View all data" card by its record id: #<category>/<id>.
  async function showRecord(datasetId, rowId) {
    await show(datasetId);
    const data = cache[datasetId];
    if (!data || state.current !== datasetId) return;
    const i = data.rows.findIndex((r) => String(r.id) === rowId);
    if (i < 0) {
      notice(data.mode === 'full' ? 'That record is not in the current copy of the database.' : 'That record is not public. Subscribers can open every record of Deployments and Components.');
      setHash(datasetId, false);
      return;
    }
    const meta = state.datasets.find((d) => d.id === datasetId);
    openRecord({ id: datasetId, title: meta.title, data, list: data.rows }, i, null);
  }

  // Global search. The hash holds the whole state (query, tags, category, page), so links, reloads and Back keep it.
  const searchMemo = new Map();
  const scrollMemo = new Map();
  let searchSeq = 0;
  let typing = null;
  const searchParams = (raw) => {
    const i = raw.indexOf('?');
    const p = new URLSearchParams(i < 0 ? '' : raw.slice(i + 1));
    return { q: p.get('q') ?? '', tags: (p.get('tags') ?? '').split(',').filter(Boolean), category: p.get('category') ?? '', page: Math.max(1, Number.parseInt(p.get('page') ?? '1', 10) || 1) };
  };
  function searchHash(s) {
    const p = new URLSearchParams();
    if (s.q) p.set('q', s.q);
    if (s.tags.length) p.set('tags', s.tags.join(','));
    if (s.category) p.set('category', s.category);
    if (s.page > 1) p.set('page', String(s.page));
    const qs = p.toString();
    return `search${qs ? `?${qs}` : ''}`;
  }
  const currentSearch = () => (parseHash()?.view === 'search' ? parseHash() : { q: '', tags: [], category: '', page: 1 });
  function goSearch(s, pushEntry) {
    setHash(searchHash(s), pushEntry);
    return renderSearch(s);
  }
  const marked = (snip) => {
    if (!snip) return '';
    let out = '', at = 0;
    for (const [a, b] of snip.marks || []) { out += esc(snip.text.slice(at, a)) + `<mark>${esc(snip.text.slice(a, b))}</mark>`; at = b; }
    return `<p class="gs-snip"><span class="lbl">${esc(snip.label)}</span> ${out + esc(snip.text.slice(at))}</p>`;
  };
  const TRY = ['BMW', 'Figure 02', 'logistics Germany', 'almacén', 'machine tending', 'Agility'];
  async function renderSearch(s) {
    state.current = 'search';
    $('gs-jump').hidden = true;
    renderIndex();
    if (dlg && dlg.open) closeDlg();
    const input = $('gs-q');
    if (document.activeElement !== input) input.value = s.q;
    const panel = $('db-panel');
    const freeNote = 'Free search covers every free category in full and the public fields of every Deployments case and Components product. Subscribers search every field.';
    if (!s.q.trim() && !s.tags.length && !s.category) {
      panel.innerHTML = `<div class="db-panel-head"><div><h2>Search the database</h2><p>Robots, companies, deployments, tasks, places and sectors across every category, with names, aliases and every field. Spanish words such as almacén, logística or EE. UU. work too.</p>` +
        `<p class="db-hint">${full() ? 'You search every row of every category.' : `${freeNote} <b>Subscribers search every row.</b>`}</p></div></div>` +
        `<div class="gs-try"><span class="lbl">Try</span>${TRY.map((t) => `<a class="gs-chip" href="#${esc(searchHash({ q: t, tags: [], category: '', page: 1 }))}">${esc(t)}</a>`).join('')}</div>`;
      return;
    }
    const key = `${full() ? 'full' : 'preview'}|${searchHash(s)}`;
    let data = searchMemo.get(key);
    if (!data) {
      const seq = ++searchSeq;
      panel.setAttribute('aria-busy', 'true');
      if (!panel.querySelector('.gs-res, .gs-none')) panel.innerHTML = '<p class="db-empty">Searching…</p>';
      const qs = new URLSearchParams({ q: s.q, tags: s.tags.join(','), category: s.category, page: String(s.page) });
      const { status, data: body } = await api(`/v1/search?${qs}`);
      panel.removeAttribute('aria-busy');
      if (seq !== searchSeq || parseHash()?.view !== 'search') return;
      if (status !== 200) { panelError('Search is not available right now. Try again in a moment.'); return; }
      data = body;
      searchMemo.set(key, data);
      if (searchMemo.size > 60) searchMemo.delete(searchMemo.keys().next().value);
    }
    const visitor = data.scope !== 'full';
    const from = (data.page - 1) * data.page_size + 1, to = from + data.results.length - 1;
    const anyFilter = data.active.length || data.category;
    const catTitle = (id) => state.datasets.find((d) => d.id === id)?.title || data.categories?.find((c) => c.id === id)?.title || id;
    const activeChips = anyFilter
      ? `<div class="gs-active" aria-label="Active filters">${data.category ? `<button type="button" class="gs-chip" data-rm-cat aria-label="Remove filter Category: ${esc(catTitle(data.category))}">Category: ${esc(catTitle(data.category))} <span aria-hidden="true">×</span></button>` : ''}` +
        data.active.map((t) => `<button type="button" class="gs-chip" data-rm-tag="${esc(t.id)}" aria-label="Remove filter ${esc(t.facet)}: ${esc(t.label)}">${esc(t.facet)}: ${esc(t.label)} <span aria-hidden="true">×</span></button>`).join('') +
        '<button type="button" class="btn ghost" data-clear>Clear all filters</button></div>'
      : '';
    const cats = data.categories.length
      ? `<div class="gs-group" role="group" aria-label="Category"><span class="lbl">Category</span>${data.categories.map((c) => `<button type="button" class="gs-chip" data-cat="${esc(c.id)}" aria-pressed="${c.active}">${esc(c.title)} <span class="n">${c.count}</span></button>`).join('')}</div>`
      : '';
    const facets = data.facets.map((f) => `<div class="gs-group" role="group" aria-label="${esc(f.label)}"><span class="lbl">${esc(f.label)}</span>${f.values.map((v) => `<button type="button" class="gs-chip" data-tag="${esc(v.id)}" aria-pressed="${v.active}">${esc(v.label)} <span class="n">${v.count}</span></button>`).join('')}</div>`).join('');
    const openFilters = anyFilter || (window.matchMedia?.('(min-width: 701px)').matches ?? true);
    const filters = cats || facets ? `<details class="gs-filters"${openFilters ? ' open' : ''}><summary>Filters${anyFilter ? ` · ${data.active.length + (data.category ? 1 : 0)} active` : ''}</summary><div class="gs-groups">${cats}${facets}</div></details>` : '';
    const results = data.results.map((r) => `<li><div class="gs-meta"><span class="lbl">${esc(r.category_title)}</span></div><a class="gs-title" href="${r.link.startsWith('/') ? `https://whyhumanoid.com${esc(r.link)}` : `#${esc(r.link)}`}" data-res>${esc(r.title)}</a>${r.subtitle ? `<div class="gs-sub">${esc(r.subtitle)}</div>` : ''}${marked(r.snippet)}</li>`).join('');
    const none = `<div class="gs-none db-empty"><p>No results${s.q ? ` for “${esc(s.q)}”` : ''}${anyFilter ? ' with these filters' : ''}.</p><p>${anyFilter ? 'Remove a filter or ' : ''}try fewer or other words: a robot, a company, a place, a sector or a task.${visitor ? ` ${freeNote} The full database may hold more.` : ''}</p></div>`;
    const pager = data.pages > 1
      ? `<nav class="gs-pager" aria-label="Result pages"><button type="button" class="btn ghost" data-page="${data.page - 1}"${data.page <= 1 ? ' disabled' : ''}>Previous</button><span class="lbl">${from}–${to} of ${data.total} · page ${data.page} of ${data.pages}</span><button type="button" class="btn ghost" data-page="${data.page + 1}"${data.page >= data.pages ? ' disabled' : ''}>Next</button></nav>`
      : '';
    panel.innerHTML =
      `<div class="db-panel-head"><div><span class="lbl">Search · ${visitor ? 'free data' : 'every row'}</span><h2 id="gs-head" tabindex="-1">${data.total} result${data.total === 1 ? '' : 's'}${s.q ? ` for “${esc(s.q)}”` : ''}</h2>` +
      `<p class="db-hint">${visitor ? `${freeNote} <b>Subscribers also search every row of Deployments and Components.</b> <button type="button" class="btn ghost" data-access>${state.me ? 'Subscribe' : 'Sign in or subscribe'}</button>` : 'Every row and field of every category.'}</p></div></div>` +
      activeChips + filters +
      (data.total ? `<ol class="gs-res" start="${from}">${results}</ol>${pager}` : none);
    const memo = scrollMemo.get(key);
    if (memo !== undefined) { window.scrollTo(0, memo); scrollMemo.delete(key); }
    // Under the search box: how many results there are, and a way down to them (they sit below the categories).
    const jump = $('gs-jump');
    jump.textContent = `${data.total} result${data.total === 1 ? '' : 's'} below ↓`;
    jump.hidden = false;
  }
  $('db-panel').addEventListener('click', (e) => {
    if (state.current !== 'search') return;
    const s = currentSearch();
    const el = e.target.closest('[data-tag],[data-cat],[data-rm-tag],[data-rm-cat],[data-clear],[data-page],[data-res],[data-access]');
    if (!el) return;
    if (el.hasAttribute('data-access')) { $('access').scrollIntoView({ block: 'start' }); ($('email').offsetParent ? $('email') : $('checkout')).focus({ preventScroll: true }); return; }
    if (el.hasAttribute('data-res')) { scrollMemo.set(`${full() ? 'full' : 'preview'}|${searchHash(s)}`, window.scrollY); return; }
    e.preventDefault();
    if (el.dataset.tag) { const t = el.dataset.tag; s.tags = s.tags.includes(t) ? s.tags.filter((x) => x !== t) : [...s.tags, t]; s.page = 1; }
    else if (el.dataset.cat) { s.category = s.category === el.dataset.cat ? '' : el.dataset.cat; s.page = 1; }
    else if (el.dataset.rmTag) { s.tags = s.tags.filter((x) => x !== el.dataset.rmTag); s.page = 1; }
    else if (el.hasAttribute('data-rm-cat')) { s.category = ''; s.page = 1; }
    else if (el.hasAttribute('data-clear')) { s.tags = []; s.category = ''; s.page = 1; }
    else if (el.dataset.page) {
      s.page = Number(el.dataset.page);
      goSearch(s, true).then(() => { $('db-panel').scrollIntoView({ block: 'start' }); $('gs-head')?.focus({ preventScroll: true }); });
      return;
    }
    const focusKey = el.dataset.tag || el.dataset.cat;
    goSearch(s, true).then(() => {
      // Keep the keyboard where it was: on the same chip, or on the search box when the chip went away.
      const again = focusKey && $('db-panel').querySelector(`[data-tag="${CSS.escape(focusKey)}"],[data-cat="${CSS.escape(focusKey)}"]`);
      (again || $('gs-q')).focus({ preventScroll: true });
    });
  });
  $('gs-form').addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(typing);
    const s = currentSearch();
    goSearch({ ...s, q: $('gs-q').value.trim(), page: 1 }, true).then(() => $('db-panel').scrollIntoView({ block: 'start' }));
  });
  $('gs-jump').addEventListener('click', () => { $('db-panel').scrollIntoView({ block: 'start' }); $('gs-head')?.focus({ preventScroll: true }); });
  $('gs-q').addEventListener('input', () => {
    clearTimeout(typing);
    typing = setTimeout(() => {
      const onSearch = parseHash()?.view === 'search';
      const s = currentSearch();
      const q = $('gs-q').value.trim();
      if (!onSearch && !q) return;
      goSearch({ ...s, q, page: 1 }, !onSearch);
    }, 300);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable="true"]') || (dlg && dlg.open)) return;
    e.preventDefault();
    $('gs-q').focus();
    $('gs-q').select();
  });

  // Router. Plain links change the hash (one history entry each); cards update it in place.
  let rendered = null;
  function parseHash() {
    const raw = location.hash.slice(1);
    if (/^search(\?|$)/.test(raw)) return { view: 'search', ...searchParams(raw) };
    let h = raw;
    try { h = decodeURIComponent(h); } catch { /* keep raw */ }
    let m;
    if ((m = /^robot\/(\d+)$/.exec(h))) return { view: 'robot', id: Number(m[1]) };
    if ((m = /^company\/([A-Za-z0-9_.-]+)$/.exec(h))) return { view: 'company', id: m[1] };
    if (h === 'reports') return { view: 'reports' };
    if ((m = /^reports\/(ord_[A-Za-z0-9_-]+)$/.exec(h))) return { view: 'order', id: m[1] };
    if (h === 'keys') return { view: 'keys' };
    if (h === 'ops') return { view: 'ops' };
    if ((m = /^ops\/(ord_[A-Za-z0-9_-]+)$/.exec(h))) return { view: 'ops', id: m[1] };
    if ((m = /^([a-z0-9-]+)\/(.+)$/.exec(h)) && state.datasets.some((d) => d.id === m[1])) return { view: 'record', dataset: m[1], id: m[2] };
    if (/^[a-z0-9-]+$/.test(h) && (!state.datasets.length || state.datasets.some((d) => d.id === h))) return { view: 'dataset', id: h };
    return null;
  }
  function setHash(h, pushEntry) {
    if (location.hash === '#' + h) return;
    try { history[pushEntry ? 'pushState' : 'replaceState'](null, '', location.pathname + location.search + '#' + h); } catch { location.hash = h; }
    rendered = location.hash;
  }
  async function render(force = false) {
    if (!force && rendered === location.hash) return;
    rendered = location.hash;
    const r = parseHash() || { view: 'dataset', id: 'deployments' };
    if (r.view === 'robot') await showRobot(r.id);
    else if (r.view === 'company') await showCompany(r.id);
    else if (r.view === 'record') await showRecord(r.dataset, r.id);
    else if (r.view === 'search') await renderSearch(r);
    else if (r.view === 'reports') await showReports();
    else if (r.view === 'order') await showOrder(r.id);
    else if (r.view === 'keys') await showKeys();
    else if (r.view === 'ops') await showOps(r.id);
    else await show(r.id);
    if (r.view !== 'search') $('gs-jump').hidden = true;
  }

  // ---- Custom reports, agent access and the operator queue (25 Nov 2026) -------------------------------------------
  // Reports: two one-off US$1,000 services, separate from the subscription. The order and its private questionnaire live
  // on the server (every read and write needs this account's session); the browser only renders them.
  const ORD = { services: null, forms: {}, timer: null, saving: false, current: null };
  // These views are not categories: the category list shows none as current.
  const mark = (id) => { state.current = id; renderIndex(); };
  const SUPPORT = 'javier@liderarmente.com';
  const ORDER_STATUS = {
    pending_payment: ['Waiting for payment', 'warn'],
    awaiting_questionnaire: ['Questionnaire open', 'warn'],
    awaiting_report: ['Questionnaire received · report in preparation', 'ok'],
    in_progress: ['Report in preparation', 'ok'],
    delivered: ['Report emailed', 'ok'],
    cancelled: ['Checkout cancelled · nothing charged', ''],
    payment_failed: ['Payment failed · nothing charged', 'bad'],
  };
  const PROBLEM = { required: 'Required', too_long: 'Too long', not_a_web_address: 'Enter a full web address (https://…)', not_an_option: 'Choose one of the options', must_be_true: 'Tick to confirm', one_to_three_tasks: 'One to three tasks', not_text: 'Enter text' };
  const when = (t) => new Date(t * 1000).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const statusBadge = (s) => { const [t, c] = ORDER_STATUS[s] || [s, '']; return `<span class="state ${c}">${esc(t)}</span>`; };

  async function reportServices() {
    if (!ORD.services) { const { status, data } = await api('/v1/reports/services', { auth: false }); ORD.services = status === 200 ? data : null; }
    return ORD.services;
  }
  async function formFor(service) {
    if (!ORD.forms[service]) { const { status, data } = await api(`/v1/reports/questionnaire/${service}`, { auth: false }); if (status === 200) ORD.forms[service] = data; }
    return ORD.forms[service];
  }

  async function showReports() {
    const panel = $('db-panel');
    mark('reports');
    const svc = await reportServices();
    if (!svc) { panel.innerHTML = `<p>Custom reports are not available right now. Write to <a href="mailto:${SUPPORT}">${SUPPORT}</a>.</p>`; return; }
    let orders = [];
    if (state.session) { const r = await api('/v1/reports/orders'); if (r.status === 200) orders = r.data.orders; }
    panel.innerHTML =
      `<div class="db-panel-head"><div><h2 id="db-title">Custom reports</h2><p>Our analysis applied to your company's decision, as a private PDF report. Separate from the data subscription: no subscription needed, and the subscription does not include them.</p>` +
      `<p class="db-hint"><b>${esc(svc.before_payment)}</b></p><p class="db-hint">${esc(svc.limits)}</p></div></div>` +
      `<div class="ord-grid">${svc.services.map((s) => `<article class="panel ord-card"><h3>${esc(s.name)}</h3><p>${esc(s.summary)}</p><p class="lbl">${esc(s.price)} · one-off payment · no subscription required</p>` +
        (!state.session ? '<p>Sign in with your email above to order. Your order and questionnaire stay in your account.</p>'
          : s.checkout_available ? `<button class="btn ord-buy" type="button" data-service="${esc(s.id)}">Pay ${esc(s.price)} and open the questionnaire</button>`
            : '<p><b>Not available to order yet.</b> Ordering opens after the payment flow has been tested.</p>') + '</article>').join('')}</div>` +
      (state.session ? `<h3>Your orders</h3>${orders.length ? `<ul class="ord-list">${orders.map((o) => `<li><a href="#reports/${esc(o.id)}">${esc(o.service_name)}</a> ${statusBadge(o.status)} <span class="lbl">ordered ${when(o.created_at)}${o.due_at ? ' · report due by ' + esc(o.due_utc) : ''}</span></li>`).join('')}</ul>` : '<p>No orders yet.</p>'}` : '') +
      `<p class="lbl">Questions about an order: <a href="mailto:${SUPPORT}">${SUPPORT}</a></p>`;
    panel.querySelectorAll('.ord-buy').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      const { status, data } = await api('/v1/reports/orders', { method: 'POST', body: { service: b.dataset.service } });
      // Already paid (a payment confirmed late): the original order's questionnaire, not a new payment.
      if (status === 200 && data.already_paid) { notice('Your payment for this report was confirmed. Your questionnaire is open below.'); location.hash = `#reports/${data.order_id}`; return; }
      if (status === 200 && data.url) return location.assign(data.url);
      b.disabled = false;
      notice(status === 401 ? 'Sign in to order.'
        : data.error === 'payment_processing' ? 'Your payment for this report is still being processed by your bank. We will open the questionnaire as soon as Stripe confirms it. Nothing more will be charged.'
          : data.error === 'checkout_status_unknown_retry' ? 'We could not check your previous checkout with Stripe just now. Try again in a minute. Nothing was charged.'
            : data.error === 'payment_needs_review' ? `We need to check your previous payment by hand. Please write to ${SUPPORT}. Nothing more will be charged.`
        : data.error === 'checkout_expiring_retry_shortly' ? 'Your previous checkout for this report is about to expire. Try again in about 15 minutes. Nothing was charged.'
          : data.error === 'checkout_in_progress_retry' ? 'Your checkout is being prepared. Try again in a moment. Nothing was charged.'
            : `Checkout is not available right now (${data.error || 'error'}). Nothing was charged. Write to ${SUPPORT} if this continues.`, true);
    }));
  }

  // One field of the questionnaire, with its current value.
  function fieldHtml(f, v, problems) {
    const id = `q-${f.id}`;
    const req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="lbl">optional</span>';
    const err = problems[f.id] ? `<p class="q-err" id="${id}-err">${esc(PROBLEM[problems[f.id]] || problems[f.id])}</p>` : '';
    const hint = f.hint ? `<p class="q-hint" id="${id}-hint">${esc(f.hint)}</p>` : '';
    const desc = [f.hint ? `${id}-hint` : '', problems[f.id] ? `${id}-err` : ''].filter(Boolean).join(' ');
    const aria = `${f.required ? ' aria-required="true"' : ''}${desc ? ` aria-describedby="${desc}"` : ''}${problems[f.id] ? ' aria-invalid="true"' : ''}`;
    const unknownBtn = f.unknown ? ` <button type="button" class="btn ghost q-unknown" data-for="${id}">Unknown</button>` : '';
    let input;
    if (f.kind === 'paragraph') input = `<textarea id="${id}" rows="4" maxlength="4000"${aria}>${esc(v ?? '')}</textarea>`;
    else if (f.kind === 'select') input = `<select id="${id}"${aria}><option value="">Choose…</option>${f.options.map(([k, t]) => `<option value="${esc(k)}"${v === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    else if (f.kind === 'multi') return `<fieldset class="q-f" data-f="${f.id}"><legend>${esc(f.label)}${req}</legend>${hint}<div class="q-multi">${f.options.map(([k, t]) => `<label><input type="checkbox" name="${id}" value="${esc(k)}"${(v || []).includes(k) ? ' checked' : ''}> ${esc(t)}</label>`).join('')}</div>${err}</fieldset>`;
    else if (f.kind === 'tasks') {
      const tasks = [0, 1, 2].map((i) => (v || [])[i] ?? '');
      return `<fieldset class="q-f" data-f="${f.id}"><legend>${esc(f.label)}${req}</legend>${hint}${tasks.map((t, i) => `<label class="q-task">Task ${i + 1}${i ? ' <span class="lbl">optional</span>' : ''}<textarea id="${id}-${i}" rows="4" maxlength="4000">${esc(t)}</textarea></label>`).join('')}${err}</fieldset>`;
    } else if (f.kind === 'ack') return `<div class="q-f q-ack" data-f="${f.id}"><label><input type="checkbox" id="${id}"${v === true ? ' checked' : ''}${aria}> ${esc(f.label)}${req}</label>${err}</div>`;
    else input = `<input id="${id}" type="${f.kind === 'url' ? 'url' : 'text'}" maxlength="${f.kind === 'url' ? 300 : 200}" value="${esc(v ?? '')}"${aria}>`;
    return `<div class="q-f" data-f="${f.id}"><label for="${id}">${esc(f.label)}${req}</label>${hint}<div class="q-in">${input}${unknownBtn}</div>${err}</div>`;
  }
  const allFields = (form) => form.fields.flatMap((f) => (f.extra ? [f, f.extra] : [f]));
  function collect(form) {
    const a = {};
    for (const f of allFields(form)) {
      const id = `q-${f.id}`;
      if (f.kind === 'multi') a[f.id] = [...document.querySelectorAll(`input[name="${id}"]:checked`)].map((x) => x.value);
      else if (f.kind === 'tasks') a[f.id] = [...document.querySelectorAll(`[id^="${id}-"]`)].filter((x) => x.tagName === 'TEXTAREA').map((x) => x.value);
      else if (f.kind === 'ack') a[f.id] = Boolean($(id)?.checked);
      else a[f.id] = $(id)?.value ?? '';
    }
    return a;
  }
  const answered = (f, v) => (f.kind === 'ack' ? v === true : Array.isArray(v) ? v.some((x) => String(x).trim()) : Boolean(String(v ?? '').trim()));

  async function showOrder(orderId, { problems = {}, review = false } = {}) {
    const panel = $('db-panel');
    mark('reports');
    if (!state.session) { panel.innerHTML = '<h2 id="db-title">Your report order</h2><p>Sign in with the email address you used to order. Your order and your answers are kept in your account.</p>'; return; }
    const { status, data } = await api(`/v1/reports/orders/${encodeURIComponent(orderId)}`);
    if (status !== 200) { panel.innerHTML = `<h2 id="db-title">Order not found</h2><p>This order is not in your account. Sign in with the email address you used to order, or write to <a href="mailto:${SUPPORT}">${SUPPORT}</a>.</p>`; return; }
    const o = data.order;
    ORD.current = o;
    const form = await formFor(o.service);
    const head = `<p class="lbl"><a href="#reports">Custom reports</a> / ${esc(o.service_name)}</p><h2 id="db-title">${esc(o.service_name)}</h2><p>${statusBadge(o.status)} <span class="lbl">Order ${esc(o.id)} · US$1,000 · ordered ${when(o.created_at)}</span></p>`;
    if (o.status === 'pending_payment') {
      panel.innerHTML = `${head}<p>We have not received the payment confirmation from Stripe yet. If you have paid, this usually takes a few seconds.</p><button class="btn" id="ord-check" type="button">Check payment again</button> <a class="btn ghost" href="#reports">Back</a><p class="lbl">Questions: <a href="mailto:${SUPPORT}">${SUPPORT}</a></p>`;
      $('ord-check').addEventListener('click', async () => { await api(`/v1/reports/orders/${o.id}/reconcile`, { method: 'POST' }); showOrder(o.id); });
      return;
    }
    if (['cancelled', 'payment_failed'].includes(o.status)) {
      panel.innerHTML = `${head}<p>Nothing was charged for this order. You can order again from <a href="#reports">Custom reports</a>.</p>`;
      return;
    }
    if (o.submitted) {
      const values = o.answers || {};
      panel.innerHTML = `${head}<div class="notice">We received your completed questionnaire on <b>${when(o.submitted_at)}</b>. We will email your report (PDF) to <b>${esc(state.me?.email || 'your account address')}</b> by <b>${esc(o.due_utc)}</b> (${esc(o.due_madrid)}).${o.status === 'delivered' ? ` Our records show the report was emailed on ${when(o.delivered_at)}.` : ''}</div>` +
        `<p>To correct something you sent, write to <a href="mailto:${SUPPORT}">${SUPPORT}</a> with your order reference. The deadline above stays the same.</p>` +
        `<h3>What you sent</h3><dl class="db-kv">${allFields(form).filter((f) => answered(f, values[f.id])).map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(Array.isArray(values[f.id]) ? values[f.id].join('\n\n') : values[f.id] === true ? 'Yes' : values[f.id])}</dd>`).join('')}</dl>`;
      return;
    }
    const values = o.answers || {};
    const req = allFields(form).filter((f) => f.required);
    const done = req.filter((f) => answered(f, values[f.id])).length;
    if (review) {
      const missing = req.filter((f) => !answered(f, values[f.id]));
      panel.innerHTML = `${head}<h3>Review your answers</h3>` +
        (missing.length ? `<div class="notice error" role="alert">${missing.length} required ${missing.length === 1 ? 'answer is' : 'answers are'} missing: ${missing.map((f) => esc(f.label)).join('; ')}.</div>` : '<p>Every required answer is there. Submitting starts the 24 hours: we will email your report within 24 hours of receiving it. You cannot edit the answers afterwards.</p>') +
        `<dl class="db-kv">${allFields(form).filter((f) => answered(f, values[f.id])).map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(Array.isArray(values[f.id]) ? values[f.id].join('\n\n') : values[f.id] === true ? 'Yes' : values[f.id])}</dd>`).join('')}</dl>` +
        `<div class="row"><button class="btn ghost" id="q-back" type="button">Back to editing</button>${missing.length ? '' : ' <button class="btn" id="q-submit" type="button">Submit the questionnaire</button>'}</div>`;
      $('q-back').addEventListener('click', () => showOrder(o.id));
      $('q-submit')?.addEventListener('click', async () => {
        $('q-submit').disabled = true;
        const r = await api(`/v1/reports/orders/${o.id}/submit`, { method: 'POST', body: { answers: values } });
        if (r.status === 200) { notice(r.data.already ? 'This questionnaire had already been submitted; the deadline is unchanged.' : 'Questionnaire received. Check your email for the confirmation with the deadline.'); return showOrder(o.id); }
        if (r.status === 422) return showOrder(o.id, { problems: Object.fromEntries((r.data.problems || []).map((p) => [p.field, p.problem])) });
        $('q-submit').disabled = false;
        notice(`The questionnaire could not be submitted (${r.data.error || 'connection'}). Your answers are saved. Try again, or write to ${SUPPORT}.`, true);
      });
      return;
    }
    panel.innerHTML = `${head}<p>Payment received. Complete this private questionnaire about your company; answers in English or Spanish. Estimates, ranges and "Unknown" count as answers: we do not need financial statements. Answers are saved in your account as you type, so you can leave and come back. <b>We will email your report within 24 hours of receiving your completed questionnaire</b>; the 24 hours start when you submit it.</p>` +
      `<p class="lbl">The report goes to ${esc(state.me?.email || 'your account address')}. To use another address, write to ${SUPPORT}. Do not include other people's personal contact details. We use your answers only to prepare and deliver this report. Documents can follow by email after you submit; there is no upload here.</p>` +
      `<p class="q-progress" id="q-progress" aria-live="polite">${done} of ${req.length} required answers · <span id="q-saved">${o.draft_saved_at ? 'saved ' + when(o.draft_saved_at) : 'not saved yet'}</span></p><p class="lbl"><span class="req">*</span> required</p>` +
      `<form id="q-form" novalidate>${form.fields.map((f) => fieldHtml(f, values[f.id], problems) + (f.extra ? fieldHtml(f.extra, values[f.extra.id], problems) : '')).join('')}` +
      `<div class="row"><button class="btn ghost" id="q-save" type="button">Save now</button> <button class="btn" id="q-review" type="submit">Review and submit</button></div></form>`;
    const save = async () => {
      clearTimeout(ORD.timer);
      const answers = collect(form);
      const r = await api(`/v1/reports/orders/${o.id}/draft`, { method: 'POST', body: { answers } });
      if (r.status === 200 && r.data.saved) {
        o.answers = answers;
        $('q-saved').textContent = 'saved ' + when(r.data.draft_saved_at);
        $('q-progress').firstChild.textContent = `${r.data.progress.done} of ${r.data.progress.required} required answers · `;
        return true;
      }
      $('q-saved').textContent = r.status === 200 ? 'not saved: check the marked answers' : 'not saved (connection); your text is still on this page';
      if (r.data.problems) r.data.problems.forEach((p) => { const el = document.querySelector(`[data-f="${p.field}"]`); if (el && !el.querySelector('.q-err')) el.insertAdjacentHTML('beforeend', `<p class="q-err">${esc(PROBLEM[p.problem] || p.problem)}</p>`); });
      return false;
    };
    $('q-form').addEventListener('input', () => { clearTimeout(ORD.timer); $('q-saved').textContent = 'saving…'; ORD.timer = setTimeout(save, 1500); });
    $('q-form').addEventListener('change', () => { clearTimeout(ORD.timer); ORD.timer = setTimeout(save, 600); });
    $('q-save').addEventListener('click', save);
    $('q-form').addEventListener('click', (e) => {
      const u = e.target.closest('.q-unknown');
      if (u) { const el = $(u.dataset.for); if (el && !el.value.trim()) { el.value = 'Unknown'; el.dispatchEvent(new Event('input', { bubbles: true })); } }
    });
    $('q-form').addEventListener('submit', async (e) => { e.preventDefault(); if (await save()) showOrder(o.id, { review: true }); });
  }

  // Agent access: the same subscription for people and their agents. Keys are created here (shown once), listed and
  // revoked; setup for the API, MCP and the CLI is on /agents/.
  async function showKeys(created = null) {
    const panel = $('db-panel');
    mark('keys');
    const docs = '<p>Setup for the HTTP API, MCP clients and the command-line tool: <a href="https://whyhumanoid.com/agents/">whyhumanoid.com/agents</a>. Fair use: 60 requests a minute and 5,000 a day per key.</p>';
    if (!state.session) { panel.innerHTML = `<h2 id="db-title">Agent access</h2><p>Sign in to create API keys for your agents. They read the catalogue with your subscription: no extra charge.</p>${docs}`; return; }
    const r = await api('/v1/api-keys');
    const keys = r.status === 200 ? r.data.keys : [];
    panel.innerHTML = `<h2 id="db-title">Agent access</h2><p>Your agents read the catalogue with your account: complete Deployments and Components while your subscription is active. When it ends, the paid rows stop (the API and the command line answer 403 there) and the public catalogue stays available. No extra charge; a revoked key stops working at once.</p>${docs}` +
      (created ? `<div class="notice"><p><b>Your new key</b> (shown once; store it like a password):</p><p><code class="key">${esc(created)}</code></p></div>` : '') +
      (full() ? `<form id="key-form" class="row"><label>Label <input id="key-label" maxlength="60" value="agent"></label> <button class="btn" type="submit">Create a key</button></form>` : '<p><b>Keys need an active data subscription.</b> Without one, the public catalogue needs no key at all.</p>') +
      `<h3>Your keys</h3>${keys.length ? `<ul class="ord-list">${keys.map((k) => `<li><code>${esc(k.id)}…</code> ${esc(k.label || '')} <span class="lbl">created ${when(k.created_at)}${k.last_used_at ? ' · last used ' + when(k.last_used_at) : ''}${k.revoked_at ? ' · revoked ' + when(k.revoked_at) : ''}</span>${k.revoked_at ? '' : ` <button class="btn ghost key-revoke" type="button" data-id="${esc(k.id)}">Revoke</button>`}</li>`).join('')}</ul>` : '<p>No keys yet.</p>'}`;
    $('key-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const c = await api('/v1/api-keys', { method: 'POST', body: { label: $('key-label').value } });
      if (c.status === 201) return showKeys(c.data.api_key);
      notice(c.data.error === 'api_key_limit_reached' ? 'You have 5 active keys. Revoke one to create another.' : 'The key could not be created.', true);
    });
    panel.querySelectorAll('.key-revoke').forEach((b) => b.addEventListener('click', async () => { await api(`/v1/api-keys/${b.dataset.id}/revoke`, { method: 'POST' }); showKeys(); }));
  }

  // Operator queue: orders operators can see (server-side check), the submitted brief, the work state and the emails.
  async function showOps(orderId) {
    const panel = $('db-panel');
    mark('ops');
    if (!orderId) {
      const r = await api('/v1/ops/orders');
      if (r.status !== 200) { panel.innerHTML = '<h2 id="db-title">Operator queue</h2><p>Operators only. Sign in with an operator address.</p>'; return; }
      const now = Date.now() / 1000;
      const failed = r.data.outbox.filter((m) => m.status !== 'sent');
      panel.innerHTML = `<h2 id="db-title">Operator queue</h2>` +
        (failed.length ? `<div class="notice error">${failed.length} email${failed.length === 1 ? '' : 's'} not sent yet. <button class="btn ghost" id="ops-retry" type="button">Retry now</button></div>` : '') +
        `<div class="db-scroll"><table class="db-table"><thead><tr><th scope="col">Order</th><th scope="col">Service</th><th scope="col">Status</th><th scope="col">Buyer</th><th scope="col">Due</th></tr></thead><tbody>${r.data.orders.map((o) => `<tr><td><a href="#ops/${esc(o.id)}">${esc(o.id)}</a>${o.mode === 'test' ? ' <span class="lbl">test</span>' : ''}</td><td>${esc(o.service_name)}</td><td>${statusBadge(o.status)}</td><td>${esc(o.account_email || '')}</td><td>${o.due_at ? `<span class="${o.due_at < now && !['delivered'].includes(o.status) ? 'state bad' : ''}">${esc(o.due_utc)}</span>` : ''}</td></tr>`).join('') || '<tr><td colspan="5">No orders.</td></tr>'}</tbody></table></div>`;
      $('ops-retry')?.addEventListener('click', async () => { await api('/v1/ops/outbox/retry', { method: 'POST', body: { ids: failed.map((m) => m.id) } }); showOps(); });
      return;
    }
    const r = await api(`/v1/ops/orders/${encodeURIComponent(orderId)}`);
    if (r.status !== 200) { panel.innerHTML = '<h2 id="db-title">Operator queue</h2><p>Not found or not allowed.</p>'; return; }
    const o = r.data.order;
    const form = await formFor(o.service);
    const values = o.answers || {};
    panel.innerHTML = `<p class="lbl"><a href="#ops">Operator queue</a> / ${esc(o.id)}</p><h2 id="db-title">${esc(o.service_name)}</h2><p>${statusBadge(o.status)} <span class="lbl">${esc(o.mode)} · ${esc(o.account_email || '')} · paid ${o.paid_at ? when(o.paid_at) : 'no'}${o.submitted_at ? ' · submitted ' + when(o.submitted_at) + ' · due ' + esc(o.due_utc) : ''}${o.delivered_at ? ' · delivered ' + when(o.delivered_at) : ''}</span></p>` +
      (o.delivery_note ? `<p><b>Delivery record:</b> ${esc(o.delivery_note)}</p>` : '') +
      `<h3>Brief${o.submitted ? ' (submitted, form ' + esc(o.form_version || '') + ')' : ' (draft, not submitted)'}</h3><dl class="db-kv">${allFields(form).filter((f) => answered(f, values[f.id])).map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(Array.isArray(values[f.id]) ? values[f.id].join('\n\n') : values[f.id] === true ? 'Yes' : values[f.id])}</dd>`).join('') || '<dd>No answers yet.</dd>'}</dl>` +
      `<h3>Work</h3><label>Note <textarea id="ops-note" rows="3" maxlength="2000">${esc(o.operator_note || '')}</textarea></label><div class="row">` +
      (o.status === 'awaiting_report' ? '<button class="btn ghost" data-st="in_progress" type="button">Start work</button> ' : '') +
      (['awaiting_report', 'in_progress'].includes(o.status) ? '<button class="btn" data-st="delivered" type="button">Record delivery (PDF emailed)</button> ' : '') +
      '<button class="btn ghost" data-st="note" type="button">Save note</button></div><p class="lbl">Recording delivery needs a note (when and to which address the PDF was emailed). It does not send anything.</p>' +
      `<h3>Emails</h3><ul class="ord-list">${o.outbox.map((m) => `<li>${esc(m.kind)} → ${esc(m.to_email)} <span class="state ${m.status === 'sent' ? 'ok' : 'bad'}">${esc(m.status)}</span> <span class="lbl">${m.attempts} attempt${m.attempts === 1 ? '' : 's'}${m.last_error ? ' · ' + esc(m.last_error) : ''}</span>${m.status === 'sent' ? '' : ` <button class="btn ghost ops-resend" type="button" data-id="${esc(m.id)}">Retry</button>`}</li>`).join('')}</ul>`;
    panel.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', async () => {
      const u = await api(`/v1/ops/orders/${o.id}`, { method: 'POST', body: { status: b.dataset.st, note: $('ops-note').value } });
      if (u.status !== 200) notice(u.data.error === 'delivery_note_required' ? 'Write the delivery note first (when and where the PDF was emailed).' : `Not saved (${u.data.error || 'error'}).`, true);
      showOps(o.id);
    }));
    panel.querySelectorAll('.ops-resend').forEach((b) => b.addEventListener('click', async () => { await api('/v1/ops/outbox/retry', { method: 'POST', body: { ids: [b.dataset.id] } }); showOps(o.id); }));
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
    if (before !== full()) { Object.keys(cache).forEach((k) => delete cache[k]); rel.mode = null; rel.g = null; }
    await render(true);
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
    // The home page's search form sends /app/?q=...: open the search with it.
    if (params.has('q') && !location.hash) history.replaceState(null, '', `${location.pathname}#${searchHash({ q: params.get('q').trim(), tags: [], category: '', page: 1 })}`);
    const [list, plan] = await Promise.all([api('/v1/datasets', { auth: false }), api('/v1/billing/plan', { auth: false })]);
    if (list.status !== 200) return notice(`The service is not available right now. Please try again in a few minutes, or write to ${SUPPORT}.`, true);
    state.datasets = list.data.datasets;
    state.plan = plan.status === 200 ? plan.data : null;
    if (state.plan) $('price').textContent = state.plan.plan.price;
    if (!parseHash()) history.replaceState(null, '', location.pathname + location.search + '#deployments');
    await refresh();
    // A robot or company link opened directly lands on its view, below the account panel.
    if (['robot', 'company'].includes(parseHash()?.view) || (parseHash()?.view === 'search' && location.hash.includes('='))) $('db-panel').scrollIntoView({ block: 'start' });
    // Entry counts in the category list, from the public previews (cached by the API for 5 minutes).
    state.datasets.filter((d) => d.id !== 'humanoids' && !cache[d.id]).forEach((d) => api(`/v1/datasets/${d.id}/preview`, { auth: false }).then(({ status, data }) => {
      if (status !== 200) return;
      // Entries, not rows: a directory's topical memberships (a world model that is also a software entry) count once.
      totals[d.id] = data.entries ?? data.total_rows;
      const n = document.querySelector(`[data-n="${d.id}"]`); if (n) n.textContent = totals[d.id];
    }));
    if (params.get('checkout') === 'cancelled') notice('Checkout was cancelled. Nothing was charged.');
    if (params.get('checkout') === 'success') {
      notice('Payment received. Full access opens as soon as Stripe confirms the subscription.');
      for (let i = 0; i < 20 && !full(); i++) { await new Promise((r) => setTimeout(r, 3000)); await refresh(); }
      notice(full() ? 'Your subscription is active: complete Deployments and Components are open, for you and your agents.' : `Stripe has not confirmed the subscription yet. Reload this page in a minute, or write to ${SUPPORT}.`);
    }
    // Return from a report Checkout: the order is confirmed by Stripe's signed event or by the server asking Stripe,
    // never by this redirect.
    const ret = params.get('report_checkout'), retOrder = params.get('order');
    if (ret === 'cancelled') notice('Checkout was cancelled. Nothing was charged. You can pay later from Custom reports.');
    if (ret === 'success' && /^ord_[A-Za-z0-9_-]+$/.test(retOrder || '')) {
      notice('Thank you. Waiting for Stripe to confirm the payment…');
      let st = 'pending_payment';
      for (let i = 0; i < 15 && st === 'pending_payment' && state.session; i++) {
        const r = await api(`/v1/reports/orders/${retOrder}/reconcile`, { method: 'POST' });
        st = r.data.order?.status || st;
        if (st === 'pending_payment') await new Promise((res) => setTimeout(res, 3000));
      }
      notice(st === 'awaiting_questionnaire' ? 'Payment confirmed. Your private questionnaire is open below.' : st === 'pending_payment' ? `Stripe has not confirmed the payment yet. Your order is saved: reload this page in a minute, or write to ${SUPPORT}.` : '');
      history.replaceState(null, '', location.pathname + '#reports/' + retOrder);
      await render(true);
    }
    if (params.has('checkout') || params.has('billing') || params.has('report_checkout')) history.replaceState(null, '', location.pathname + location.hash);
  }

  $('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { status, data } = await api('/v1/auth/magic-link', { method: 'POST', body: { email: $('email').value }, auth: false });
    if (status === 202) notice('Check your email for a sign-in link. It works once and expires in 15 minutes.');
    else if (data.error === 'too_many_login_requests') notice('Too many requests. Try again later.', true);
    else if (data.error === 'email_not_configured') notice('Sign-in is not available yet.', true);
    else notice(`The sign-in link could not be sent. Check the address, or write to ${SUPPORT}.`, true);
  });
  $('checkout').addEventListener('click', async () => {
    $('checkout').disabled = true;
    const { status, data } = await api('/v1/billing/checkout', { method: 'POST' });
    if (status === 200 && data.url) return location.assign(data.url);
    $('checkout').disabled = false;
    if (data.error === 'already_subscribed') { notice('Your subscription is already active.'); return refresh(); }
    notice(data.error === 'checkout_disabled' || data.error === 'live_checkout_disabled' ? 'Subscriptions are not open yet.' : `Checkout is not available right now. Nothing was charged. Write to ${SUPPORT} if this continues.`, true);
  });
  $('portal').addEventListener('click', async () => {
    $('portal').disabled = true;
    const { status, data } = await api('/v1/billing/portal', { method: 'POST' });
    $('portal').disabled = false;
    if (status === 200 && data.url) return location.assign(data.url);
    notice(`The subscription portal is not available right now. Write to ${SUPPORT} to change or cancel your subscription.`, true);
  });
  $('confirm-login-btn').addEventListener('click', async () => {
    $('confirm-login-btn').disabled = true;
    const token = state.pendingLogin;
    state.pendingLogin = null;
    $('confirm-login').hidden = true;
    const { status, data } = await api('/v1/auth/redeem', { method: 'POST', body: { token }, auth: false });
    if (status === 200) { state.session = data.token; store.set(data.token); notice(''); }
    else notice('This sign-in link has already been used or has expired. Request a new one above.', true);
    await refresh();
  });
  $('signout').addEventListener('click', () => signOut());
  $('db-index').addEventListener('click', (e) => { const a = e.target.closest('a[data-id]'); if (!a) return; e.preventDefault(); setHash(a.dataset.id, true); show(a.dataset.id); });
  // Relation links are plain #links: each click is a history entry, so Back returns to the previous view.
  const go = () => render().then(() => { if (!['dataset', 'search'].includes(parseHash()?.view)) $('db-panel').scrollIntoView({ block: 'start' }); });
  window.addEventListener('popstate', go);
  window.addEventListener('hashchange', go);

  init();
})();
