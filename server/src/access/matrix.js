// Central access matrix (Javier, 23 Nov 2026). The single place that says which website category a workbook tab
// belongs to and who may read it in full. The Worker (API, search, relations), the exporters (tools/export-*.mjs),
// the page generator (tools/build-pages.mjs) and the catalogue page all read it; nothing else decides access.
//
// Commercial decision of 23 Nov 2026 (supersedes the 10-row paywall of 16 Nov 2026 and its 17 Nov split):
//   - Humanoids entirely free.
//   - One subscription, EUR 100 per year, unlocks BOTH complete Deployments and complete Components.
//   - Every other content category is free for now.
//   - Two services at EUR 1,000 each, NOT included in the subscription: a humanoid adoption assessment (with
//     Deployments) and a component-manufacturing study (with Components). Names are proposals; purchase is not built.
//
// The nine category labels and their order are confirmed by Javier. A category maps only to tabs that exist in the
// master workbook; where no dedicated tab exists the gap is stated, never filled with invented records.

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
    summary: 'Every humanoid robot in the catalogue: specifications, maker, funding, buyer checks and sources.',
  },
  {
    id: 'deployments', label: 'Deployments', path: '/deployments/', access: 'subscription', datasets: ['deployments'],
    supporting: ['evidence-links', 'entities'], service: 'humanoid-adoption-assessment',
    summary: 'Who is testing or using humanoid robots, where, for which task, with what status and source.',
  },
  {
    id: 'components', label: 'Components', path: '/components/', access: 'subscription', datasets: ['hardware'],
    service: 'component-manufacturing-study',
    summary: 'Compute, sensors, actuators and other hardware used in humanoid robots.',
    gap: 'The master workbook has no dedicated components table yet: this category shows the Hardware tab (name, link and description per entry).',
  },
  {
    id: 'integrators', label: 'Integrators', path: '/integrators/', access: 'free', datasets: ['integrators'],
    summary: 'System integrators and service providers that deploy humanoid and service robots.',
  },
  {
    id: 'software', label: 'Software', path: '/software/', access: 'free', datasets: ['software'],
    summary: 'Robot foundation models, vision-language-action models, world models and robotics software.',
  },
  {
    id: 'datasets', label: 'Datasets', path: '/datasets/', access: 'free', datasets: ['datasets'],
    summary: 'Robot learning datasets relevant to humanoid robots.',
  },
  {
    id: 'benchmarks', label: 'Benchmarks', path: '/benchmarks/', access: 'free', datasets: ['task-evaluations'],
    summary: 'How robot models measure up against documented evidence for a defined task.',
    gap: 'The master workbook has no dedicated benchmarks table: this category shows the Task Evaluation tab (per-task eligibility of each robot model against documented evidence).',
  },
  {
    id: 'investment', label: 'Investment', path: '/investment/', access: 'free', datasets: ['stocks'],
    summary: 'Listed companies exposed to humanoid robotics, and the funding recorded for each humanoid maker.',
    gap: 'The master workbook has no dedicated private-investment table: this category shows the Stocks tab and the Valuation, Investors and Rounds fields of the Humanoids catalogue.',
  },
  {
    id: 'other-robots', label: 'Other Robots', path: '/other-robots/', access: 'free', datasets: ['other-robots'],
    summary: 'Non-humanoid, service and educational robots tracked alongside the humanoid catalogue.',
  },
]);

// Access of every workbook tab. 'free': every customer row with its public values, to anyone. 'subscription': the
// first PREVIEW_ROWS rows publicly, everything else only after the server-side entitlement check.
// Tabs that are not one of the nine categories keep the access they had before 23 Nov 2026 until Javier decides.
export const DATASET_ACCESS = Object.freeze({
  humanoids: { category: 'humanoids', access: 'free' },
  deployments: { category: 'deployments', access: 'subscription' },
  hardware: { category: 'components', access: 'subscription' },
  integrators: { category: 'integrators', access: 'free' },
  software: { category: 'software', access: 'free' },
  datasets: { category: 'datasets', access: 'free' },
  'task-evaluations': { category: 'benchmarks', access: 'free' },
  stocks: { category: 'investment', access: 'free' },
  'other-robots': { category: 'other-robots', access: 'free' },
  // Supporting tabs of Deployments: their rows describe deployment records and claims.
  'evidence-links': { category: 'deployments', access: 'subscription', supporting: true },
  entities: { category: 'deployments', access: 'subscription', supporting: true },
  // Not one of the nine categories: unchanged (first 10 rows public) pending Javier's decision.
  'container-handling': { category: null, access: 'subscription', supporting: true },
  // Out of the offer since 17 Nov 2026; no new work (Javier, 23 Nov 2026). Data kept and imported as before.
  'data-space': { category: null, access: 'subscription', offer: false },
});

// Services sold separately at EUR 1,000 each. Not part of the subscription; purchase and delivery are a later
// milestone, so the site lists them as proposals with no checkout.
export const SERVICES = Object.freeze([
  {
    id: 'humanoid-adoption-assessment', category: 'deployments', name: 'Humanoid adoption assessment',
    price: '€1,000', status: 'proposal', included_in_subscription: false,
    summary: 'An assessment of whether, where and how humanoid robots fit your operation, built on the Deployments evidence.',
  },
  {
    id: 'component-manufacturing-study', category: 'components', name: 'Component manufacturing study',
    price: '€1,000', status: 'proposal', included_in_subscription: false,
    summary: 'A study of the components humanoid robots need and the opportunity to manufacture them.',
  },
]);

export const CATEGORIES_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function datasetAccess(datasetId) {
  const entry = DATASET_ACCESS[datasetId];
  if (!entry) throw new Error(`dataset ${datasetId} has no entry in the access matrix`);
  return entry;
}

export const isFreeDataset = (datasetId) => datasetAccess(datasetId).access === 'free';

// Rows anyone may read: null means every customer row; otherwise the first PREVIEW_ROWS rows.
export const publicRowLimitFor = (datasetId) => (isFreeDataset(datasetId) ? null : PREVIEW_ROWS);

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
    datasets: Object.fromEntries(Object.entries(DATASET_ACCESS).map(([id, a]) => [id, { category: a.category, access: a.access, public_rows: a.access === 'free' ? 'all' : PREVIEW_ROWS }])),
    services: SERVICES.map(({ id, category, name, price, status, included_in_subscription }) => ({ id, category, name, price, status, included_in_subscription })),
  };
}
