// Public and paid fields of the subscription categories (Javier, 24 Nov 2026: complete public listings, restricted
// depth within each item). The single allowlist every layer uses: the importer stores each row's public values from
// it (premium_rows.preview_data), the API's public rows, the visitor search index and its snippets, the public
// relations graph, the static exports (data/preview/) and the pages all read those values, never the full row.
// Anything not listed here is paid; a dataset with an empty list is counted publicly but none of its rows is listed.
//
// Free categories are not listed here: every value of every row is public (server/src/access/matrix.js).

const OPEN = /\b(open[- ]source|open design|open hardware|open cad|mit\b|gpl|cc[- ]by|apache|bsd)\b/i;

// Deployments: one claim per row; the public site groups rows into cases by deployment_id (server/src/public/cases.js).
// Public: who, which robot, sector, country, task category, status as recorded, who reports it, and the source.
// Paid: site, city, region, environment, relationship and commercial status, task description, workflow, integration,
// timeline, metrics, claim text and type, evidence level, confidence, open questions and notes.
export const DEPLOYMENTS_PUBLIC = Object.freeze([
  'record_id', 'organization_id', 'organization_name', 'organization_role', 'organization_country', 'deployment_id',
  'manufacturer', 'robot_model', 'robot_version', 'sector', 'country', 'task_category', 'operational_status',
  'verification_status', 'source_title', 'source_url', 'source_publisher', 'publication_date',
]);

// Entities (identity register supporting Deployments): canonical identity only; provenance and notes are paid.
export const ENTITIES_PUBLIC = Object.freeze(['entity_id', 'entity_type', 'canonical_name', 'manufacturer_id', 'parent_entity_id', 'reference_url', 'reviewed_at']);

// Components (physical products) and their related software. Public: identity, availability, what it does and how, the
// main source and the review state. An open-hardware or open-source product also keeps its licence and repository, so
// the openness statement carries its reference. Paid: the technical passport (resolution, force, rates, size, mass,
// surface, interface, software, durability, prices, BOM, where to buy, papers, users, pros and cons, uncertainties,
// field-level sources, comparison summary).
export const COMPONENTS_PUBLIC = Object.freeze([
  'component_id', 'name', 'group', 'family', 'manufacturer', 'country', 'year', 'status', 'principle', 'measured',
  'main_source_url', 'review_status',
  // Family-specific extension (26 Nov 2026): the class for filters, what the part does, the kind of evidence and when
  // it was checked. Applications, specifications, integration requirements and limitations are the paid passport.
  'component_class', 'function', 'evidence_scope', 'checked_at',
]);
export const COMPONENTS_OPEN_PUBLIC = Object.freeze(['licence', 'repository']);
export const isOpenComponent = (d) => d.group === 'Research / open hardware' || OPEN.test(String(d.status ?? '')) || (/software/i.test(String(d.group ?? '')) && OPEN.test(String(d.licence ?? '')));

export const PUBLIC_FIELDS = Object.freeze({
  deployments: DEPLOYMENTS_PUBLIC,
  entities: ENTITIES_PUBLIC,
  hardware: [...COMPONENTS_PUBLIC, ...COMPONENTS_OPEN_PUBLIC],
  'component-software': [...COMPONENTS_PUBLIC, ...COMPONENTS_OPEN_PUBLIC],
  // Claim-to-evidence links are paid detail of Deployments; the other two are outside the offer.
  'evidence-links': [],
  'container-handling': [],
  'data-space': [],
});

// The public values of one row of a subscription dataset, or null when its rows are not listed publicly.
export function publicValues(datasetId, data) {
  const fields = PUBLIC_FIELDS[datasetId];
  if (!fields) throw new Error(`${datasetId}: no public field contract`);
  if (!fields.length) return null;
  const out = {};
  for (const f of fields) {
    if (COMPONENTS_OPEN_PUBLIC.includes(f) && (datasetId === 'hardware' || datasetId === 'component-software') && !isOpenComponent(data)) continue;
    if (f in data) out[f] = data[f] ?? null;
  }
  return out;
}

// Every field of a dataset that is never public (for leak checks and for the "with the subscription" labels).
export const paidFields = (datasetId, allFields) => allFields.filter((f) => !(PUBLIC_FIELDS[datasetId] ?? []).includes(f));
