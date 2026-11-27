// Read-only public verification snapshot. Its source is the additive verification ledger exported from the workbook.
// Identity joins use exact existing catalogue values; no mutable row number or fuzzy manufacturer match.
import ledger from '../../../data/verification/claims.json' with { type: 'json' };
import catalogue from '../../../data/humanoids-catalogue.json' with { type: 'json' };
import pages from '../../../data/pages.json' with { type: 'json' };
import { STANDARD_VERSION, VERIFICATION_TIERS, HRL_LABELS, METRIC_FIELDS, COMPARISON_CAVEATS, buildVerificationView, validateLedger } from './standard.js';

validateLedger(ledger);
const identities = catalogue.records.map((r) => ({
  entity_id: pages.robots[String(r.id)]?.split('/')[2] ?? null,
  lab: r.Lab, robot: r.Robot, web: r.Web,
})).filter((r) => r.entity_id);
const bySlug = new Map(identities.map((r) => [r.entity_id, r]));
const currentDate = () => new Date().toISOString().slice(0, 10);

export function publicVerificationStandard() {
  return { standard_version: STANDARD_VERSION, method_url: 'https://whyhumanoid.com/method/#verification-standard', claims_url: 'https://whyhumanoid.com/data/verification/claims.json',
    source_preservation_url: 'https://whyhumanoid.com/data/verification/archives.json',
    source_preservation_note: 'Capture status is a separate dated manifest. An internal preservation copy is not a public archive URL and does not raise a verification tier.',
    verification_tiers: VERIFICATION_TIERS, hrl_levels: HRL_LABELS, metric_fields: METRIC_FIELDS, default_status: 'Pending_Audit',
    default_payload_comparison: 'payload_sustained_bilateral_kg', comparison_caveats: COMPARISON_CAVEATS,
    freshness: { fresh_through_days: 180, review_due_through_days: 365, stale_after_days: 365, evidence_tier_is_preserved: true },
    snapshot_as_of: ledger.as_of ?? null, claim_events: ledger.events.length, entities_with_attribute_reviews: new Set(ledger.events.map((e) => e.entity_id)).size,
    scope: 'Public humanoid attributes only. A source-backed attribute review does not verify an entire robot. Deployment and component access rules are unchanged.',
  };
}

export function verificationForEntity(entityId, validAt = currentDate(), knownAt = validAt) {
  if (!bySlug.has(entityId)) return null;
  return buildVerificationView(entityId, ledger.events, validAt, knownAt);
}

export function verificationForRow(row, asOf = currentDate()) {
  const matches = identities.filter((r) => r.lab === row.Lab && r.robot === row.Robot && r.web === row.Web);
  if (matches.length !== 1) return { ...buildVerificationView('unresolved', [], asOf), entity_id: null, identity_status: 'unresolved', comparison_caveats: [...COMPARISON_CAVEATS, 'The exact robot identity could not be joined to a permanent public page; no verification is inherited.'] };
  return { ...buildVerificationView(matches[0].entity_id, ledger.events, asOf), identity_status: 'exact_match' };
}

export function verificationForRows(rows, asOf = currentDate()) {
  return { standard_version: STANDARD_VERSION, as_of: asOf,
    by_row_id: Object.fromEntries(rows.map((r) => [r.id, verificationForRow(r, asOf)])),
    comparison_caveats: COMPARISON_CAVEATS,
  };
}
