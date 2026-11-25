// Central access matrix (Javier, 23 Nov 2026). The single place that says which website category a workbook tab
// belongs to and who may read it in full. The Worker (API, search, relations), the exporters (tools/export-*.mjs),
// the page generator (tools/build-pages.mjs) and the catalogue page all read it; nothing else decides access.
//
// Commercial decision of 23 Nov 2026, revised by Javier on 24 Nov 2026 (supersedes the first-10-rows preview and the
// EUR price for new subscriptions):
//   - Humanoids entirely free; every other content category free except the two below.
//   - Deployments and Components: every case and product is listed publicly with a useful summary; the detail of each
//     item is paid. The public and paid fields are one allowlist (server/src/access/fields.js).
//   - One data subscription, US$100 per year billed annually, no free trial, unlocks complete Deployments and
//     Components. Existing EUR subscriptions keep their contracts and their access.
//   - Two custom company reports at US$1,000 each, separate from the subscription and NOT available to order yet.
//
// The nine category labels and their order are confirmed by Javier; Reports is the tenth (Javier, 23 Nov 2026), free. A category maps only to tabs that exist in the
// master workbook; where no dedicated tab exists the gap is stated, never filled with invented records.

import { PUBLIC_FIELDS } from './fields.js';

// The first-10-rows preview of 16 Nov 2026, kept only for the free tabs that still publish basic fields beyond it
// (Stocks). Subscription tabs no longer use it: every row is public at its public fields (fields.js).
import { REPORT_SERVICES, REPORTS_LIVE_OPEN } from '../orders/services.js';

export const PREVIEW_ROWS = 10;

// The one paid product. `product` is the entitlements.product value written by the Stripe webhook; existing
// subscribers (product 'premium') keep their access unchanged.
export const SUBSCRIPTION = Object.freeze({
  product: 'premium',
  name: 'Why Humanoid? Deployments and Components',
  unlocks: ['deployments', 'components'],
});

// Website categories, in the confirmed order. `datasets` are the workbook tabs (server/src/datasets.js ids) shown
// under the category. `access` is 'free' or 'subscription'.
export const CATEGORIES = Object.freeze([
  {
    id: 'humanoids', label: 'Humanoids', path: '/humanoids/', access: 'free', datasets: ['humanoids'],
    summary: 'Compare every humanoid robot we track: what each can do on paper, who makes it, how it is funded and what to check before buying, with a source for every value.',
  },
  {
    id: 'deployments', label: 'Deployments', path: '/deployments/', access: 'subscription', datasets: ['deployments'],
    supporting: ['evidence-links', 'entities'], service: 'humanoid-adoption-assessment',
    summary: 'Where are robots moving beyond demonstrations? Explore the companies testing or using them, the jobs involved and the evidence behind each case.',
  },
  {
    // Product catalogue since 23 Nov 2026 (server/src/components/catalogue.js); the related software block is supporting.
    id: 'components', label: 'Components', path: '/components/', access: 'subscription', datasets: ['hardware'],
    supporting: ['component-software'], service: 'component-manufacturing-study',
    summary: 'The building blocks of embodied intelligence: products, how they sense, what they measure, and their constraints.',
    gap: 'Detailed coverage currently focuses on touch: tactile sensors and one tactile research hand. Actuators, reducers, batteries, compute and other families have not been researched for this catalogue yet.',
  },
  {
    id: 'integrators', label: 'Integrators', path: '/integrators/', access: 'free', datasets: ['integrators'],
    summary: 'Find who can deliver humanoid integration, software, training and support: on which platforms, in which territory, and with what evidence behind each claim.',
  },
  {
    id: 'software', label: 'Software', path: '/software/', access: 'free', datasets: ['software'],
    summary: 'Find the models and software that make robots work: robot foundation models, vision-language-action models, world models, simulators and tools.',
  },
  {
    // Robot Learning Data Atlas (23 Nov 2026): the Datasets catalogue and the reported quantities of Dataset Metrics.
    id: 'datasets', label: 'Datasets', path: '/datasets/', access: 'free', datasets: ['datasets', 'dataset-metrics'],
    summary: 'Where robot learning data comes from, what it contains, and how you can use it.',
    gap: 'Quantities are extracted resource by resource from primary sources: some resources have none yet, and licences are often not established.',
  },
  {
    // Robotics Evaluation Atlas (23 Nov 2026): the Benchmarks tab and selected source-reported results.
    id: 'benchmarks', label: 'Benchmarks', path: '/benchmarks/', access: 'free', datasets: ['benchmarks', 'benchmark-results'],
    summary: 'What robotics benchmarks test, what models achieve, and where evidence is still missing.',
    gap: 'Numerical results are extracted benchmark by benchmark, after a source and protocol check: most resources have none yet.',
  },
  {
    id: 'investment', label: 'Investment', path: '/investment/', access: 'free', datasets: ['stocks'],
    summary: 'Follow the money around humanoid robotics: listed companies with exposure to the field, and the funding recorded for each humanoid maker.',
    gap: 'Private funding appears through each humanoid maker: its recorded valuation, investors and funding rounds. There is no separate deal-by-deal list yet.',
  },
  {
    id: 'other-robots', label: 'Other Robots', path: '/other-robots/', access: 'free', datasets: ['other-robots'],
    summary: 'Robots beyond humanoids, from service and industrial machines to educational kits, tracked alongside the humanoid catalogue.',
  },
  {
    // Not imported into the backend: the Reports tab of the workbook plus a reviewed mapping of findings, published as the
    // Research Conclusions Atlas (data/reports/atlas.json, tools/export-reports.mjs), and Why Humanoid?'s own analyses.
    id: 'reports', label: 'Reports', path: '/reports/', access: 'free', datasets: [], source: 'data/reports/atlas.json',
    summary: 'What research reports on humanoid robots agree on, where they diverge, and which assumptions drive their numbers.',
    gap: 'Findings are checked claim by claim against each original. Some are still pending, and two originals could not be reached for review; those findings are listed but not drawn.',
  },
]);

// Access of every workbook tab. 'free': every customer row with all its values, to anyone. 'subscription': every row
// at its public fields (fields.js) to anyone, the full row only after the server-side entitlement check; a tab whose
// public field list is empty is counted but not listed.
// Tabs that are not one of the nine categories keep the access they had before 23 Nov 2026 until Javier decides.
export const DATASET_ACCESS = Object.freeze({
  humanoids: { category: 'humanoids', access: 'free' },
  deployments: { category: 'deployments', access: 'subscription' },
  hardware: { category: 'components', access: 'subscription' },
  // Related software block of the Components tab (TACTO), with the Components category and its access.
  'component-software': { category: 'components', access: 'subscription', supporting: true },
  integrators: { category: 'integrators', access: 'free' },
  software: { category: 'software', access: 'free' },
  datasets: { category: 'datasets', access: 'free' },
  'dataset-metrics': { category: 'datasets', access: 'free' },
  benchmarks: { category: 'benchmarks', access: 'free' },
  'benchmark-results': { category: 'benchmarks', access: 'free' },
  // Internal operational assessment since the Robotics Evaluation Atlas (23 Nov 2026): no longer the Benchmarks
  // category; access unchanged.
  'task-evaluations': { category: null, access: 'free' },
  stocks: { category: 'investment', access: 'free' },
  'other-robots': { category: 'other-robots', access: 'free' },
  // Supporting tabs of Deployments: their rows describe deployment records and claims.
  'evidence-links': { category: 'deployments', access: 'subscription', supporting: true },
  entities: { category: 'deployments', access: 'subscription', supporting: true },
  // Not one of the nine categories: counted, not listed publicly, pending Javier's decision.
  'container-handling': { category: null, access: 'subscription', supporting: true },
  // Out of the offer since 17 Nov 2026; no new work (Javier, 23 Nov 2026). Data kept and imported as before.
  'data-space': { category: null, access: 'subscription', offer: false },
});

// Custom company reports (Javier, 24 Nov 2026; ordering flow 25 Nov 2026): Integrarobot's analysis applied to one
// company's decision, US$1,000 each as a one-off payment, separate from the subscription in both directions and with no
// subscription prerequisite. Names, summaries and the switch that opens live ordering (REPORTS_LIVE_OPEN) live in
// server/src/orders/services.js; until it is true the site says "Not available to order yet". The ids are kept from
// 23 Nov 2026 (stable anchors).
export const SERVICES = Object.freeze(REPORT_SERVICES.map((s) => Object.freeze({
  id: s.id, category: s.category, name: s.name, summary: s.summary,
  price: 'US$1,000', status: REPORTS_LIVE_OPEN ? 'available' : 'not_available', included_in_subscription: false, orderable: REPORTS_LIVE_OPEN,
})));

export const CATEGORIES_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function datasetAccess(datasetId) {
  const entry = DATASET_ACCESS[datasetId];
  if (!entry) throw new Error(`dataset ${datasetId} has no entry in the access matrix`);
  return entry;
}

export const isFreeDataset = (datasetId) => datasetAccess(datasetId).access === 'free';

// Public fields of a tab: null for a free tab (every field), otherwise its allowlist (possibly empty).
export const publicFieldsFor = (datasetId) => (isFreeDataset(datasetId) ? null : PUBLIC_FIELDS[datasetId] ?? []);
// Rows anyone may read: null means every customer row (free, or at public fields); 0 means none is listed.
export const publicRowLimitFor = (datasetId) => (isFreeDataset(datasetId) || publicFieldsFor(datasetId).length ? null : 0);

// The decision itself. `entitled` must come from the server-side entitlement check (entitlements.hasAccess).
export function canReadFull(datasetId, { entitled }) {
  return isFreeDataset(datasetId) || Boolean(entitled);
}

export function categoryOfDataset(datasetId) {
  const id = datasetAccess(datasetId).category;
  return id ? CATEGORIES_BY_ID.get(id) : null;
}

// Public description of the matrix, served by GET /v1/access and embedded in the site: no data, only rules.
export function publicMatrix() {
  return {
    subscription: { name: SUBSCRIPTION.name, unlocks: SUBSCRIPTION.unlocks },
    categories: CATEGORIES.map((c) => ({ id: c.id, label: c.label, path: c.path, access: c.access, datasets: c.datasets, service: c.service ?? null, gap: c.gap ?? null })),
    datasets: Object.fromEntries(Object.entries(DATASET_ACCESS).map(([id, a]) => [id, {
      category: a.category, access: a.access,
      public_rows: a.access === 'free' ? 'all' : publicFieldsFor(id).length ? 'all' : 'none',
      public_fields: a.access === 'free' ? 'all' : publicFieldsFor(id),
    }])),
    services: SERVICES.map(({ id, category, name, price, status, included_in_subscription, orderable }) => ({ id, category, name, price, status, included_in_subscription, orderable })),
  };
}
