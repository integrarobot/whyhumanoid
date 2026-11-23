#!/usr/bin/env node
// Builds the data block of index.html from the free public catalogue (data/humanoids-catalogue.json) only:
// every customer row of the Humanoids tab with public values. No paid value and no other tab reaches the page.
//
// The page needs presentation facets (country list, mobility class, numeric height and weight, year, listing
// status, check log). They are derived here by rules from the public fields. Where the legacy pipeline made a
// curated call the rules do not reproduce, tools/humanoids-facet-overrides.json pins that value together with a
// hash of its source field; if the source field changes, the override is stale and the build fails.
//
//   node tools/build-site.mjs                    rebuild index.html and run the parity check
//   node tools/build-site.mjs --check            fail if index.html is not exactly the build of data/
//   node tools/build-site.mjs --write-overrides  record rule/legacy disagreements as overrides (review the diff)

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { readLegacySnapshot } from './export-humanoids.mjs';
import { LIVE_SALES_OPEN, PLAN } from '../server/src/pricing.js';
import { pageRelations } from './relations.mjs';
import { pageLinks } from './build-pages.mjs';
import { CATEGORIES, SERVICES, SUBSCRIPTION } from '../server/src/access/matrix.js';
import { renderAdoption } from './adoption-view.mjs';
import { robotPresentation } from './robot-presentation.mjs';

// Where the catalogue sends buyers: the premium app on the production backend. Change it here when
// premium.whyhumanoid.com is set up as a custom domain.
// The premium app on the brand's domain (17 Nov 2026), published by tools/build-app.mjs.
export const PREMIUM_APP_URL = 'https://whyhumanoid.com/app/';
// Live checkout of the new offer waits for its purchase terms (server/src/pricing.js, LIVE_SALES_OPEN).
export const CHECKOUT_OPEN = LIVE_SALES_OPEN;
// Paywall (Javier, 16 Nov 2026): the 12 tabs other than Humanoids show their first 10 sheet rows; the rest is premium.
export const OPEN_DATABASE = false;

const root = new URL('../', import.meta.url);
const OVERRIDES_FILE = new URL('tools/humanoids-facet-overrides.json', root);
const sha = (v) => createHash('sha256').update(String(v ?? '')).digest('hex').slice(0, 16);

const FACET_SOURCE = {
  lab: 'Lab',
  robot: 'Robot',
  c: 'Country',
  mob: 'Platform / mobility',
  h: 'Height (cm)',
  w: 'Weight (kg)',
  y: 'Release',
  ls: 'Stock',
  chk: 'Sources / checked',
};

const COUNTRY_NAMES = { USA: 'United States', US: 'United States', UK: 'United Kingdom' };

function splitClauses(text) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') depth = Math.max(0, depth - 1);
    else if (text[i] === ';' && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.map((c) => c.trim()).filter(Boolean);
}

export const RULES = {
  lab: (v) => v ?? '',
  robot: (v) => v || 'Unnamed',
  c: (v) => {
    if (!v || /^(not disclosed|not found|no data|unknown)$/i.test(v)) return [];
    return v.split(/\s*[;/]\s*/).filter(Boolean).map((x) => COUNTRY_NAMES[x] ?? x);
  },
  mob: (v) => {
    const t = (v ?? '').split(';')[0].toLowerCase();
    if (!t) return 'No data';
    if (/\bdiy\b/.test(t)) return 'DIY or open';
    if (/bipedal or wheeled|wheeled or bipedal/.test(t)) return 'Bipedal or wheeled';
    if (/wheel|mobile manipulat|omnidirectional/.test(t)) return 'Wheeled';
    if (/bipedal/.test(t)) return 'Bipedal';
    if (/torso|\barms?\b|manipulat|bimanual/.test(t)) return 'Torso or arms';
    if (/^(ai for|robots for space|software)/.test(t)) return 'Software or other';
    return 'No data';
  },
  h: (v) => (/^\d+(\.\d+)?$/.test(v ?? '') ? Number.parseFloat(v) : null),
  w: (v) => (/^\d+(\.\d+)?$/.test(v ?? '') ? Number.parseFloat(v) : null),
  y: (v) => {
    const m = /^((?:19|20)\d{2})\b/.exec(v ?? '');
    return m ? Number(m[1]) : null;
  },
  ls: (v) => {
    if (!v) return 'No data';
    if (/^private/i.test(v)) return 'Private';
    if (/subsidiar|acquired|owned/i.test(v)) return 'Subsidiary or acquired';
    if (/open project|non-?profit/i.test(v)) return 'Open project or non-profit';
    if (/ceased|closed|defunct/i.test(v)) return 'Closed';
    if (/^[A-Z]+:[A-Z0-9.-]+/.test(v)) return 'Listed';
    return 'No data';
  },
  chk: (v) => {
    const [first = '', ...rest] = (v ?? '').split('\n');
    const parts = first.split(' | ');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(parts[0] ?? '') ? parts[0] : null;
    const statements = parts[1] ? splitClauses(parts[1]) : [];
    const funding = statements.find((s) => /funding/i.test(s)) ?? '';
    const specs = statements.find((s) => /specification/i.test(s)) ?? '';
    return {
      date,
      statements,
      website: parts[2] ?? '',
      funding: /checked/i.test(funding) ? 'checked' : /pending/i.test(funding) ? 'pending' : 'unknown',
      specs: /reviewed/i.test(specs) ? 'reviewed' : /inherited/i.test(specs) ? 'inherited' : /not published/i.test(specs) ? 'unpublished' : 'unknown',
      urls: rest.map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u)),
    };
  },
};

export function buildData(exported, overrides, access) {
  const { fields } = exported;
  const models = exported.records.map((record) => {
    const model = { id: record.id, row: record.sheet_row };
    for (const [facet, field] of Object.entries(FACET_SOURCE)) {
      const pinned = overrides[record.id]?.[facet];
      if (pinned) {
        if (pinned.source_hash !== sha(record[field])) {
          throw new Error(`Stale override: record ${record.id} facet ${facet}; "${field}" changed. Review tools/humanoids-facet-overrides.json`);
        }
        model[facet] = pinned.value;
      } else model[facet] = RULES[facet](record[field]);
    }
    model.f = fields.map((f) => record[f] ?? '');
    return model;
  });
  const excluded = exported.excluded.map(({ sheet_row: row, lab, robot, reason }) => ({ row, lab, robot, reason }));
  return { cols: fields, models, excluded, snapshot: exported.snapshot, ...(access ? { access } : {}) };
}

// Parity: every facet and field must equal the legacy page, except fields changed by the cleaning step and the
// public values the verified import changed since the legacy snapshot (manifest.verified_import).
const changedFields = (manifest) =>
  new Set([
    ...['stripped', 'excluded_unverified', 'rewritten'].flatMap((k) => (manifest.cleaning[k] ?? []).map((s) => `${s.id}|${s.field}`)),
    ...(manifest.verified_import?.updated ?? []).map((u) => `${u.id}|${u.field}`),
  ]);
const insertedRecords = (manifest) => new Map((manifest.verified_import?.inserted ?? []).map((i) => [i.id, i.sheet_row]));

export function parity(built, legacy, manifest) {
  const cleaned = changedFields(manifest);
  const inserted = insertedRecords(manifest);
  const legacyById = new Map(legacy.models.map((m) => [m.id, m]));
  const unexpected = [];
  const expected = [];
  const legacyRows = [...legacy.models.map((m) => m.row), ...inserted.values()].sort((a, b) => a - b);
  const builtRows = [...built.models.map((m) => m.row), ...built.excluded.map((e) => e.row)].sort((a, b) => a - b);
  if (!isDeepStrictEqual(builtRows, legacyRows)) unexpected.push('the catalogue does not hold exactly the legacy customer rows plus the verified inserts');
  for (const m of built.models) {
    const old = legacyById.get(m.id);
    if (inserted.has(m.id)) {
      if (old || inserted.get(m.id) !== m.row) unexpected.push(`inserted record ${m.id} clashes with the legacy page`);
      else expected.push(`record ${m.id} inserted by the verified import`);
      continue;
    }
    if (!old) {
      unexpected.push(`record ${m.id} not in legacy page`);
      continue;
    }
    for (const key of ['row', ...Object.keys(FACET_SOURCE)]) {
      if (!isDeepStrictEqual(m[key], old[key])) {
        const field = FACET_SOURCE[key];
        (cleaned.has(`${m.id}|${field}`) ? expected : unexpected).push(`record ${m.id} ${key}`);
      }
    }
    built.cols.forEach((field, i) => {
      if ((m.f[i] ?? '') !== (old.f[i] ?? '')) (cleaned.has(`${m.id}|${field}`) ? expected : unexpected).push(`record ${m.id} field ${field}`);
    });
  }
  const insertedRows = new Set(inserted.values());
  for (const e of legacy.excluded.filter((x) => insertedRows.has(x.row))) {
    expected.push(`sheet row ${e.row} was excluded on the legacy page (${e.reason.split(':')[0]}) and is published by the verified import`);
  }
  const legacyExcluded = legacy.excluded.filter((e) => legacyRows.includes(e.row) && !insertedRows.has(e.row));
  if (!isDeepStrictEqual(built.excluded, legacyExcluded)) unexpected.push('excluded rows differ');
  return { unexpected, expected };
}

// The ten categories (nine confirmed plus Reports), in order, as static HTML on the home page (access matrix, 23 Nov 2026): each with
// its real address, what it holds, how many entries the public data has and whether it is free or by subscription.
const escHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function renderCategories(data) {
  const tabs = new Map((data.database?.tabs ?? []).map((t) => [t.id, t]));
  const reports = JSON.parse(readFileSync(new URL('data/reports/catalogue.json', root), 'utf8')).reports.length + 1; // + Why Humanoid?'s deployment records analysis
  const count = (c) => (c.id === 'humanoids' ? data.models.length : c.id === 'reports' ? reports : c.datasets.reduce((n, id) => n + (tabs.get(id)?.entries_total ?? 0), 0));
  const unit = { humanoids: 'robots', deployments: 'records', components: 'entries', integrators: 'integrators', software: 'entries', datasets: 'datasets', benchmarks: 'evaluations', investment: 'listed companies', 'other-robots': 'entries', reports: 'reports' };
  const items = CATEGORIES.map((c) => `<li><a href="${c.path}">${escHtml(c.label)}</a><p>${escHtml(c.summary)}</p><span class="meta"><b>${count(c)}</b> ${unit[c.id]} · ${c.access === 'subscription' ? '<span class="sub">Subscription</span> · first 10 free' : 'Free'}</span></li>`).join('');
  const services = SERVICES.map((sv) => `<div><p class="lbl">Service · proposal</p><h3>${escHtml(sv.name)}</h3><p>${escHtml(sv.summary)}</p><p class="lbl">${escHtml(sv.price)} · not included in the subscription · not available to order yet</p></div>`).join('');
  return `<!-- categories:start -->
    <section class="cats-sec" id="categories" aria-labelledby="cats-h">
      <div class="cats-head"><h2 class="h2" id="cats-h">Ten <em>categories</em></h2><p class="lbl">Humanoids and eight more free · Deployments and Components with the subscription</p></div>
      <ul class="catgrid">${items}</ul>
      <div class="offer"><div><p class="lbl">Subscription · ${escHtml(data.access?.price ?? '')}</p><h3>${escHtml(SUBSCRIPTION.name)}</h3><p>Complete Deployments and complete Components, with search and agent API keys over them.</p>${CHECKOUT_OPEN ? '' : '<p class="lbl">New subscriptions open once the purchase terms are final · existing subscribers keep full access</p>'}<p><a class="btn" href="/subscribe/">See the subscription</a></p></div>${services}</div>
      <p class="lbl">Also: <a href="#database">browse the workbook tabs</a> · <a href="/companies/">every company</a> · <a href="/reports/deployment-records/">deployment records report</a> · <a href="/method/">method</a></p>
    </section>
    <!-- categories:end -->`;
}

export function renderIndex(html, data) {
  const block = /(<script[^>]*id="data"[^>]*>)[\s\S]*?(<\/script>)/;
  if (!block.test(html)) throw new Error('index.html has no data block');
  const cats = /<!-- categories:start -->[\s\S]*?<!-- categories:end -->/;
  if (!cats.test(html)) throw new Error('index.html has no categories block');
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const adoption = /<!-- adoption:start -->[\s\S]*?<!-- adoption:end -->/;
  if (!adoption.test(html)) throw new Error('index.html has no adoption block');
  const projection = JSON.parse(readFileSync(new URL('data/public/projection.json', root), 'utf8'));
  const explorer = /<!-- adoption-explorer:start -->[\s\S]*?<!-- adoption-explorer:end -->/;
  if (!explorer.test(html)) throw new Error('index.html has no adoption explorer block');
  const view = renderAdoption(projection, data.pages ?? {});
  return html.replace(cats, () => renderCategories(data)).replace(adoption, () => view.hero).replace(explorer, () => view.section).replace(block, (_, open, close) => `${open}${json}${close}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const exported = JSON.parse(readFileSync(new URL('data/humanoids-catalogue.json', root), 'utf8'));
  const manifest = JSON.parse(readFileSync(new URL('data/manifest.json', root), 'utf8'));
  const legacy = readLegacySnapshot();
  let overrides = JSON.parse(readFileSync(OVERRIDES_FILE, 'utf8')).overrides;

  if (process.argv.includes('--write-overrides')) {
    const fresh = {};
    const rulesOnly = buildData(exported, {}, null);
    const legacyById = new Map(legacy.models.map((m) => [m.id, m]));
    const cleaned = changedFields(manifest);
    const records = new Map(exported.records.map((r) => [r.id, r]));
    for (const m of rulesOnly.models) {
      for (const [facet, field] of Object.entries(FACET_SOURCE)) {
        const old = legacyById.get(m.id)?.[facet];
        if (!isDeepStrictEqual(m[facet], old) && !cleaned.has(`${m.id}|${field}`)) {
          fresh[m.id] ??= {};
          fresh[m.id][facet] = { value: old, source_hash: sha(records.get(m.id)[field]) };
        }
      }
    }
    const doc = {
      note: 'Curated presentation facets from the legacy page that the rules in tools/build-site.mjs do not reproduce. Each value is pinned to a hash of its source field; a changed source makes the build fail until the override is reviewed.',
      overrides: fresh,
    };
    writeFileSync(OVERRIDES_FILE, `${JSON.stringify(doc, null, 2)}\n`);
    overrides = fresh;
    console.log(`Wrote ${Object.values(fresh).reduce((n, o) => n + Object.keys(o).length, 0)} overrides for ${Object.keys(fresh).length} records`);
  }

  // The full database lives in the premium app (sign in, subscribe, read). CHECKOUT_OPEN says whether live checkout
  // is enabled in production, so the page never promises a purchase that cannot be made yet.
  const access = {
    free: 'all',
    total_records: exported.records.length,
    price: PLAN.display,
    url: PREMIUM_APP_URL,
    app_url: PREMIUM_APP_URL,
    checkout_open: CHECKOUT_OPEN,
  };
  const data = buildData(exported, overrides, access);
  // Paywall (16 Nov 2026): the page embeds the index of the 12 other tabs (counts and field names) and loads each tab's
  // free preview, its first 10 sheet rows, from data/preview/<tab>.json. Full rows never reach the site or Git.
  data.database = JSON.parse(readFileSync(new URL('data/preview/index.json', root), 'utf8'));
  // Relations for the free robot pages: only the public preview rows of Deployments (tools/relations.mjs).
  data.relations = pageRelations();
  // Addresses of the permanent robot and company pages (tools/build-pages.mjs), for links from the catalogue.
  data.pages = pageLinks();
  // Reviewed display names, full-body images and maker order links, by catalogue id (tools/robot-presentation.json).
  data.present = Object.fromEntries(robotPresentation());
  data.access.open = OPEN_DATABASE;
  const { unexpected, expected } = parity(data, legacy, manifest);
  if (unexpected.length) {
    console.error(`Parity FAILED (${unexpected.length}):\n- ${unexpected.slice(0, 40).join('\n- ')}`);
    process.exit(1);
  }
  const indexUrl = new URL('index.html', root);
  const current = readFileSync(indexUrl, 'utf8');
  const next = renderIndex(current, data);
  if (process.argv.includes('--check')) {
    if (current !== next) {
      console.error('index.html is not the build of data/. Run node tools/build-site.mjs');
      process.exit(1);
    }
  } else writeFileSync(indexUrl, next);
  console.log(`Parity passed: ${data.models.length} catalogue records identical to the legacy page except ${expected.length} cleaned or verified-import changes`);
}
