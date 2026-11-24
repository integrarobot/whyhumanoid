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
// The nine category labels and their order are confirmed by Javier; Reports is the tenth (Javier, 23 Nov 2026), free. A category maps only to tabs that exist in the
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
    // Product catalogue since 23 Nov 2026 (server/src/components/catalogue.js); the related software block is supporting.
    id: 'components', label: 'Components', path: '/components/', access: 'subscription', datasets: ['hardware'],
    supporting: ['component-software'], service: 'component-manufacturing-study',
    summary: 'The building blocks of embodied intelligence: products, how they sense, what they measure, and their constraints.',
    gap: 'Detailed coverage currently focuses on touch: tactile sensors and one tactile research hand. Actuators, reducers, batteries, compute and other families have not been researched for this catalogue yet.',
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
    // Robot Learning Data Atlas (23 Nov 2026): the Datasets catalogue and the reported quantities of Dataset Metrics.
    id: 'datasets', label: 'Datasets', path: '/datasets/', access: 'free', datasets: ['datasets', 'dataset-metrics'],
    summary: 'Where robot learning data comes from, what it contains, and how it can be used.',
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
    summary: 'Listed companies exposed to humanoid robotics, and the funding recorded for each humanoid maker.',
    gap: 'The master workbook has no dedicated private-investment table: this category shows the Investment tab (listed companies) and the Valuation, Investors and Rounds fields of the Humanoids catalogue.',
  },
  {
    id: 'other-robots', label: 'Other Robots', path: '/other-robots/', access: 'free', datasets: ['other-robots'],
    summary: 'Non-humanoid, service and educational robots tracked alongside the humanoid catalogue.',
  },
  {
    // Not imported into the backend: the Reports tab of the workbook plus a reviewed mapping of findings, published as the
    // Research Conclusions Atlas (data/reports/atlas.json, tools/export-reports.mjs), and Why Humanoid?'s own analyses.
    id: 'reports', label: 'Reports', path: '/reports/', access: 'free', datasets: [], source: 'data/reports/atlas.json',
    summary: 'What research reports on humanoid robots agree on, where they diverge, and which assumptions drive their numbers.',
    gap: 'Findings are checked claim by claim against each original. Some are still pending, and two originals could not be reached for review; those findings are listed but not drawn.',
  },
]);

// Access of every workbook tab. 'free': every customer row with its public values, to anyone. 'subscription': the
// first PREVIEW_ROWS rows publicly, everything else only after the server-side entitlement check.
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
