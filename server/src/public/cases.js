// Public deployment cases (Javier, 24 Nov 2026: complete public listings, restricted depth within each item). Groups the
// PUBLIC Deployments rows (the allowlist of server/src/access/fields.js, as published in data/preview/deployments.json
// and served by GET /v1/datasets/deployments/preview) into one case per deployment_id, the research team's own case key.
// Several sources about one deployment stay one case; distinct organisations, robots, versions or countries within a
// case are all kept, never merged into one guess. Nothing here reads a paid field: it cannot, because it only ever
// receives public rows.

import { STATUS_LABELS, statusKey } from './projection.js';

const NA = /^(not\b|n\/?a$|unknown$|unspecified$|none$|tbd$|not_disclosed$)/i;
const has = (v) => v !== null && v !== undefined && String(v).trim() !== '' && !NA.test(String(v).trim());
const human = (v) => String(v ?? '').replace(/_/g, ' ');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const uniq = (xs) => [...new Set(xs.filter(has).map((x) => String(x).trim()))];
const firstUrl = (v) => String(v ?? '').match(/https?:\/\/[^\s|,;]+/)?.[0] ?? null;

// Status as recorded, in the words of the public listing. The key groups them for filters and counts (projection.js).
export const STATUS_DETAIL = Object.freeze({
  operational: 'In operation',
  pilot: 'Pilot',
  testing: 'Testing or demonstration',
  planned: 'Announced (planned or agreed)',
  vendor_claimed_operational: 'Operation claimed by the vendor, unconfirmed',
  unresolved: 'Unresolved',
});
// Who reports the claim: the review state a reader needs before relying on it.
export const REVIEW_LABELS = Object.freeze({
  customer_confirmed: 'Confirmed by the customer or operator',
  partner_reported: 'Reported by a partner',
  vendor_reported: 'Reported by the vendor',
  media_reported: 'Reported by the media',
  unresolved: 'Unresolved',
});
export const ROLE_LABELS = Object.freeze({
  customer_operator: 'Customer or operator', customer_investor: 'Customer and investor', technology_partner: 'Technology partner or integrator',
});
export const taskLabel = (v) => (has(v) ? cap(human(v)) : 'Task not specified in the sources');
export const CASE_CAVEAT = 'Records are claims from named sources, as recorded, not facts verified by Why Humanoid?. A status is the latest one recorded; it is not proof of results. Outcomes, metrics and site details are not part of the public summary, and what the sources do not say stays unknown.';

export const caseSlug = (deploymentId) => String(deploymentId).replace(/^dep_/, '').replace(/_/g, '-').toLowerCase();

// rows: public Deployments rows in workbook order. Returns cases in workbook order of their first record.
export function publicCases(rows) {
  const groups = new Map();
  for (const r of rows) {
    const key = has(r.deployment_id) ? r.deployment_id : `record:${r.record_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return [...groups.entries()].map(([id, rs]) => {
    const dated = [...rs].sort((a, b) => String(a.publication_date ?? '').localeCompare(String(b.publication_date ?? '')));
    const latest = dated.at(-1);
    const orgs = [];
    for (const r of rs) {
      const k = r.organization_id || r.organization_name;
      if (!orgs.some((o) => (o.id || o.name) === k)) orgs.push({ id: r.organization_id ?? null, name: r.organization_name ?? null, role: r.organization_role ?? null, country: r.organization_country ?? null });
    }
    const robots = [];
    for (const r of rs) {
      const k = [r.manufacturer, r.robot_model, r.robot_version].join('|');
      if (!robots.some((x) => x.key === k)) robots.push({ key: k, manufacturer: has(r.manufacturer) ? r.manufacturer : null, model: has(r.robot_model) ? r.robot_model : null, version: has(r.robot_version) ? r.robot_version : null });
    }
    const sources = [];
    for (const r of dated) {
      const url = firstUrl(r.source_url);
      const k = url ?? `${r.source_publisher}|${r.source_title}`;
      if (!sources.some((s) => s.key === k)) sources.push({ key: k, publisher: r.source_publisher ?? null, title: r.source_title ?? null, url, date: has(r.publication_date) ? r.publication_date : null });
    }
    const raw = String(latest.operational_status ?? '').toLowerCase();
    return {
      id,
      slug: caseSlug(id),
      records: rs.length,
      record_ids: rs.map((r) => r.record_id),
      organisations: orgs,
      robots: robots.map(({ key, ...x }) => x),
      sectors: uniq(rs.map((r) => r.sector)),
      countries: uniq(rs.flatMap((r) => String(r.country ?? '').split(/;\s*/))),
      tasks: (() => { const t = uniq(rs.map((r) => r.task_category)).map(taskLabel); return t.length ? t : [taskLabel(null)]; })(),
      status: { key: statusKey(raw), label: STATUS_LABELS[statusKey(raw)], detail: STATUS_DETAIL[raw] ?? (has(raw) ? cap(human(raw)) : 'Not recorded'), as_of: latest.publication_date ?? null },
      review: { key: latest.verification_status ?? null, label: REVIEW_LABELS[latest.verification_status] ?? (has(latest.verification_status) ? cap(human(latest.verification_status)) : 'Not recorded') },
      first_date: dated[0].publication_date ?? null,
      last_date: latest.publication_date ?? null,
      sources: sources.map(({ key, ...s }) => s),
    };
  });
}

// One line naming the robot(s) of a case as recorded; distinct versions stay distinct.
export const robotText = (c) => c.robots.map((r) => [r.manufacturer, r.model].filter(Boolean).join(' ') + (r.version ? ` (version ${r.version})` : '') || 'Robot not recorded').join('; ');
