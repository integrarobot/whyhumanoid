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
import { BEFORE_PAYMENT, REPORTS_LIVE_OPEN } from '../server/src/orders/services.js';
import { FOOTER_CSS, renderSiteFooterNav } from './footer-view.mjs';
import { renderAdoption } from './adoption-view.mjs';
import { renderEvolutionCarousel } from './evolution-view.mjs';
import { robotPresentation } from './robot-presentation.mjs';

// Where the catalogue sends buyers: the premium app on the production backend. Change it here when
// premium.whyhumanoid.com is set up as a custom domain.
// The premium app on the brand's domain (17 Nov 2026), published by tools/build-app.mjs.
export const PREMIUM_APP_URL = 'https://whyhumanoid.com/app/';
// Whether new live subscriptions can be bought (server/src/pricing.js, LIVE_SALES_OPEN; open since 24 Nov 2026).
export const CHECKOUT_OPEN = LIVE_SALES_OPEN;
// Access (Javier, 24 Nov 2026): free tabs in full; Deployments and Components list every entry at its public fields.
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
        // A reviewed label quotes its evidence: the excerpt must still be in the record (PokeBot: "Wheeled", 25 Nov 2026).
        if (pinned.excerpt && !String(record[field] ?? '').includes(pinned.excerpt)) throw new Error(`Override of record ${record.id} facet ${facet}: "${field}" no longer contains "${pinned.excerpt}"`);
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
  const movedIds = new Set((manifest.verified_import?.moved ?? []).map((m) => m.id));
  const legacyRows = [...legacy.models.filter((m) => !movedIds.has(m.id)).map((m) => m.row), ...inserted.values()].sort((a, b) => a - b);
  const builtRows = [...built.models.map((m) => m.row), ...built.excluded.map((e) => e.row)].sort((a, b) => a - b);
  if (!isDeepStrictEqual(builtRows, legacyRows)) unexpected.push('the catalogue does not hold exactly the legacy customer rows plus the verified inserts, minus the records moved out of the tab');
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
// Counts of the Robot Learning Data Atlas for the home page (category card, hero and the database panel's link).
export function dataAtlasSummary() {
  const c = JSON.parse(readFileSync(new URL('data/datasets/atlas.json', root), 'utf8')).counts;
  return { resources: c.resources, corpora: c.corpora, quantities: c.quantities, path: '/datasets/' };
}
// The two premium paths (Javier, 24 Nov 2026), first after the hero, then the ten categories. Same words and prices as
// tools/offer-view.mjs; report ordering stays disabled.
const PATHS_CSS = `<style>
.paths-sec{padding:26px 0 22px;border-top:1px solid var(--line)}
.paths-sec .cats-head{margin-bottom:14px}
.paths{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))}
.path{border:1px solid var(--line);background:var(--ink-1,#111316);padding:18px;display:flex;flex-direction:column;gap:8px;min-width:0}
.path.p-data{border-color:color-mix(in srgb,var(--amber) 55%,transparent);box-shadow:inset 0 3px 0 var(--amber)}
.path.p-rep{box-shadow:inset 0 3px 0 var(--bone-3)}
.path h3{font-family:var(--f-serif);font-weight:400;font-size:clamp(22px,2.6vw,28px);line-height:1.15;margin:0;color:var(--bone)}
.path .pp{margin:0;font-size:15px;color:var(--bone-2)}
.path .pp b{font-family:var(--f-serif);font-weight:400;font-size:30px;color:var(--bone);margin-right:4px}
.path ul{margin:0;padding-left:18px;color:var(--bone-2);font-size:14px;display:grid;gap:4px}
.path .pn{margin:0;font-size:13px;color:var(--bone-3)}
.path .pa{margin:auto 0 0;padding-top:6px;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}
.path .soon{display:inline-flex;align-items:center;min-height:40px;padding:0 12px;border:1px dashed var(--line-2,rgba(234,230,221,.22));font-family:var(--f-mono);font-size:12px;letter-spacing:.04em;color:var(--bone-2)}
</style>`;
export function renderCategories(data) {
  const tabs = new Map((data.database?.tabs ?? []).map((t) => [t.id, t]));
  const reportsAtlas = JSON.parse(readFileSync(new URL('data/reports/atlas.json', root), 'utf8'));
  // Reports: the external reports of the Research Conclusions Atlas; Why Humanoid?'s own analysis is named apart.
  const reports = reportsAtlas.reports.length;
  // Benchmarks: the resources of the Robotics Evaluation Atlas snapshot (data/benchmarks/atlas.json), not a preview tab.
  const atlas = JSON.parse(readFileSync(new URL('data/benchmarks/atlas.json', root), 'utf8')).counts;
  // Datasets: the resources of the Robot Learning Data Atlas snapshot (data/datasets/atlas.json), also not a preview tab.
  const dataAtlas = dataAtlasSummary();
  // Deployments: its public cases (one per deployment id of the public rows); Components: its physical products.
  const cases = new Set(JSON.parse(readFileSync(new URL('data/preview/deployments.json', root), 'utf8')).rows.map((r) => r.deployment_id ?? r.record_id)).size;
  const count = (c) => (c.id === 'humanoids' ? data.models.length - (data.not_robots ?? []).length - (data.uncertain ?? []).length : c.id === 'reports' ? reports : c.id === 'benchmarks' ? atlas.resources : c.id === 'datasets' ? dataAtlas.resources : c.id === 'deployments' ? cases : c.datasets.reduce((n, id) => n + (tabs.get(id)?.canonical_entries ?? tabs.get(id)?.entries_total ?? 0), 0));
  const unit = { humanoids: `humanoid robot models${data.uncertain?.length ? ` · ${data.uncertain.length} of uncertain scope` : ''}${data.not_robots?.length ? ` · ${data.not_robots.length} software models listed apart` : ''}`, deployments: 'cases', components: 'products', integrators: 'providers', software: 'entries', datasets: 'data resources', benchmarks: 'resources', investment: 'listed companies', 'other-robots': 'entries', reports: 'external reports + 1 Why Humanoid? analysis' };
  // Freshness per module (25 Nov 2026): the date each category's public data says something about, by kind. A source
  // check (Humanoids records, report originals) is not a workbook copy, and neither is the date this page was built.
  const dmy = (iso) => { const d = new Date(String(iso ?? '').length === 10 ? `${iso}T00:00:00Z` : iso); return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
  const checked = data.models.map((m) => m.chk?.date).filter(Boolean).sort().at(-1);
  const copyOf = (id) => dmy(tabs.get(id)?.snapshot ?? data.database?.snapshot);
  const benchAtlas = JSON.parse(readFileSync(new URL('data/benchmarks/atlas.json', root), 'utf8')).snapshot;
  const dataAtlasSnap = JSON.parse(readFileSync(new URL('data/datasets/atlas.json', root), 'utf8')).snapshot;
  const fresh = {
    humanoids: checked ? `records checked up to ${dmy(checked)}` : null,
    deployments: `workbook copy of ${copyOf('deployments')}`,
    components: `workbook copy of ${copyOf('hardware')}`,
    integrators: `workbook copy of ${copyOf('integrators')}`,
    software: `workbook copy of ${copyOf('software')}`,
    datasets: `workbook copy of ${dmy(dataAtlasSnap?.exported_at)}`,
    benchmarks: `workbook copy of ${dmy(benchAtlas?.exported_at)}`,
    investment: `workbook copy of ${copyOf('stocks')}`,
    'other-robots': `workbook copy of ${copyOf('other-robots')}`,
    reports: reportsAtlas.snapshot?.checked_on ? `originals checked ${dmy(reportsAtlas.snapshot.checked_on)}` : null,
  };
  const items = CATEGORIES.map((c) => `<li><a href="${c.path}">${escHtml(c.label)}</a><p>${escHtml(c.summary)}</p><span class="meta"><b>${count(c)}</b> ${unit[c.id]} · ${c.access === 'subscription' ? 'All listed free · <span class="sub">detail with the subscription</span>' : 'Free'}</span>${fresh[c.id] ? `<span class="meta fresh">${escHtml(fresh[c.id])}</span>` : ''}</li>`).join('');
  const reportsList = SERVICES.map((sv) => `<li><b>${escHtml(sv.name)}</b> (${sv.category === 'deployments' ? 'Deployments' : 'Components'}): ${escHtml(sv.summary)}</li>`).join('');
  return `<!-- categories:start -->
    ${PATHS_CSS}
    <section class="paths-sec" id="paths" aria-labelledby="paths-h">
      <div class="cats-head"><h2 class="h2" id="paths-h">Two ways to <em>go further</em></h2><p class="lbl">Every category stays free to browse</p></div>
      <div class="paths">
        <article class="path p-data"><p class="lbl hi">Full data access</p><h3>Use the evidence to make your own decisions.</h3>
          <p class="pp"><b>US$100</b> per year · billed annually · no free trial</p>
          <ul><li>Complete Deployments: every case with its sites, tasks, timeline, metrics, claims and evidence.</li><li>Complete Components: full technical passports, side-by-side comparison and technical filters.</li><li>Detailed search across both, and the existing API keys for agents.</li></ul>
          <p class="pn">Access to research and data. It does not include a personalised recommendation.</p>
          <p class="pa">${CHECKOUT_OPEN ? '<a class="btn primary" href="/app/#subscribe">Subscribe for US$100 a year</a>' : '<span class="soon">New subscriptions open soon</span>'} <a href="/subscribe/">What the subscription includes</a></p></article>
        <article class="path p-rep"><p class="lbl">Custom company reports</p><h3>Our expertise, applied to your company’s decisions.</h3>
          <p class="pp"><b>US$1,000</b> per report · one-off payment · no subscription needed</p>
          <ul>${reportsList}</ul>
          <p class="pn">${escHtml(BEFORE_PAYMENT)} Not included in the subscription.</p>
          <p class="pa">${REPORTS_LIVE_OPEN ? '<a class="btn primary" href="/app/#reports">Order a report</a>' : '<span class="soon">Not available to order yet</span>'} <a href="/subscribe/#reports">How reports work</a></p></article>
      </div>
    </section>
    <section class="cats-sec" id="categories" aria-labelledby="cats-h">
      <div class="cats-head"><h2 class="h2" id="cats-h">Ten <em>categories</em></h2><p class="lbl">Free to browse · Deployments and Components list every entry, with their detail in the subscription</p></div>
      <ul class="catgrid">${items}</ul>
      <p class="lbl">Also: <a href="/blog/">Blog</a> · <a href="/news/">News</a> · <a href="#database">browse every category as a table</a> · <a href="/companies/">every company</a> · <a href="/reports/deployment-records/">deployment records report</a> · <a href="/method/">method</a></p>
    </section>
    <!-- categories:end -->`;
}

// Compact two paths inside the hero, so both are visible in the first screen on phones too; the full block follows.
export function renderPathsMini() {
  return `<!-- paths-mini:start --><div class="hero-paths" aria-label="Two ways to go further">
          <a class="hp hp-data" href="#paths"><span class="lbl hi">Full data access</span><b>Use the evidence to make your own decisions.</b><span>US$100 per year, billed annually${CHECKOUT_OPEN ? '' : ' · opening soon'}</span></a>
          <a class="hp hp-rep" href="#paths"><span class="lbl">Custom company reports</span><b>Our expertise, applied to your company’s decisions.</b><span>US$1,000 per report · one-off${REPORTS_LIVE_OPEN ? ', ready to order' : ' · not available to order yet'}</span></a>
        </div><style>.hero-paths{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:8px;margin:14px 0 18px}.hp{display:grid;gap:3px;padding:10px 12px;border:1px solid var(--line);text-decoration:none;color:var(--bone-2);font-size:13px;line-height:1.35}.hp b{color:var(--bone);font-weight:600;font-size:14px}.hp-data{border-color:color-mix(in srgb,var(--amber) 55%,transparent);box-shadow:inset 3px 0 0 var(--amber)}.hp:hover,.hp:focus-visible{border-color:var(--amber)}</style><!-- paths-mini:end -->`;
}
// The home footer's help line (Codex, 25 Nov 2026): the one public support address, as on every other page.
// The shared site footer links (tools/footer-view.mjs, 25 Nov 2026): the same links as every other page, and no email
// address in the footer (Javier, 25 Nov 2026); Contact leads to the About page.
export function renderFooterHelp() {
  return `<!-- footer-help:start --><style>${FOOTER_CSS}.foot .site-foot{margin:0;flex-basis:100%}</style>${renderSiteFooterNav()}<!-- footer-help:end -->`;
}
export function renderIndex(html, data) {
  const help = /<!-- footer-help:start -->[\s\S]*?<!-- footer-help:end -->/;
  if (!help.test(html)) throw new Error('index.html has no footer-help block');
  html = html.replace(help, () => renderFooterHelp());
  const mini = /<!-- paths-mini:start -->[\s\S]*?<!-- paths-mini:end -->/;
  if (!mini.test(html)) throw new Error('index.html has no paths-mini block');
  html = html.replace(mini, () => renderPathsMini());
  const block = /(<script[^>]*id="data"[^>]*>)[\s\S]*?(<\/script>)/;
  if (!block.test(html)) throw new Error('index.html has no data block');
  const cats = /<!-- categories:start -->[\s\S]*?<!-- categories:end -->/;
  if (!cats.test(html)) throw new Error('index.html has no categories block');
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  // The hero's featured chart (Javier, 24 Nov 2026): the seven evolution charts in rotation, every 10 seconds, from
  // data/evolution/charts.json. It replaces the static adoption figure; the adoption explorer below stays.
  const adoption = /<!-- (?:adoption|evolution):start -->[\s\S]*?<!-- (?:adoption|evolution):end -->/;
  if (!adoption.test(html)) throw new Error('index.html has no evolution block');
  const evolution = JSON.parse(readFileSync(new URL('data/evolution/charts.json', root), 'utf8'));
  const ver = (f) => createHash('sha256').update(readFileSync(new URL(f, root))).digest('hex').slice(0, 10);
  const carousel = renderEvolutionCarousel(evolution).replace('<!-- evolution:start -->', `<!-- evolution:start -->\n      <link rel="stylesheet" href="/assets/evolution.css?v=${ver('assets/evolution.css')}">`).replace('<!-- evolution:end -->', `<script src="/assets/evolution.js?v=${ver('assets/evolution.js')}" defer></script>\n      <!-- evolution:end -->`);
  const projection = JSON.parse(readFileSync(new URL('data/public/projection.json', root), 'utf8'));
  const explorer = /<!-- adoption-explorer:start -->[\s\S]*?<!-- adoption-explorer:end -->/;
  if (!explorer.test(html)) throw new Error('index.html has no adoption explorer block');
  const view = renderAdoption(projection, data.pages ?? {});
  return html.replace(cats, () => renderCategories(data)).replace(adoption, () => carousel).replace(explorer, () => view.section).replace(block, (_, open, close) => `${open}${json}${close}`);
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
  // The page embeds the index of the 12 other tabs (counts, field names and public fields) and loads each tab's public
  // rows from data/preview/<tab>.json: free tabs in full, Deployments and Components at their public fields (24 Nov
  // 2026). Full rows of those two never reach the site or Git.
  data.database = JSON.parse(readFileSync(new URL('data/preview/index.json', root), 'utf8'));
  // Datasets left the previews for its own snapshot (Robot Learning Data Atlas, 23 Nov 2026): the panel links to it.
  data.dataAtlas = dataAtlasSummary();
  // Relations for the free robot panels: the public fields of every Deployments row (tools/relations.mjs).
  data.relations = pageRelations();
  // Addresses of the permanent robot and company pages (tools/build-pages.mjs), for links from the catalogue.
  data.pages = pageLinks();
  // Reviewed display names, full-body images and maker order links, by catalogue id (tools/robot-presentation.json).
  data.present = Object.fromEntries(robotPresentation());
  data.access.open = OPEN_DATABASE;
  // Catalogue records that are software, not robots, by their own record (tools/catalogue-classification.json).
  const classification = JSON.parse(readFileSync(new URL('tools/catalogue-classification.json', root), 'utf8')).records;
  data.not_robots = classification.filter((c) => c.kind === 'software').map((c) => c.id);
  data.uncertain = classification.filter((c) => c.kind === 'uncertain').map((c) => c.id);
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
