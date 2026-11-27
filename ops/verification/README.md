# Verification operations

Standard version: `1.0.0`. Updated: 2026-11-27.

The public method is at `/method/#verification-standard`. The executable contract is `server/src/verification/standard.js`. The existing research, workbook write, readback, PR, CI and production verification process also owns verification updates. This document adds no schedule, automated physical test, data entitlement or commercial offer.

## Source of truth and immutable history

Google Sheets is the master. The two native tables are additive and do not replace the existing Humanoids columns:

- `Verification Claims`, `A:V`, stores every historical attribute assertion. It is an append-only ledger, including superseded and retracted assertions. It is not just the latest value per robot.
- `Verification Changelog`, `A:J`, stores one dated change reference for each assertion, its reason and the public role of its contributor. It does not duplicate claim values.

Never rewrite, remove or reorder an existing event. A correction, retraction, hardware revision or re-verification appends a new unique event and names the earlier `supersedes_event_id`. A different value must not be hidden as a date-only refresh. Preserve the original source, evidence grade, hardware generation and date uncertainty. A new source for a conflicting assertion may remain a parallel event; the compiled view excludes unresolved conflicts from comparisons.

An `entity_id` is the existing canonical public humanoid slug, the segment in `/humanoids/<slug>/`. It is not a sheet row, catalogue number or manufacturer-only match. An older generation's customer deployment cannot establish the current generation's HRL.

`Verification Claims` headers, exactly in order:

```text
event_id,entity_id,field,value,unit,conditions,verification_tier,source_url,source_kind,source_locator,observed_at,verified_at,recorded_at,valid_from,valid_to,change_type,supersedes_event_id,hardware_generation,source_archive_url,archive_status,evidence_summary,evidence_json
```

`Verification Changelog` headers, exactly in order:

```text
event_id,entity_id,field,previous_event_id,new_event_id,change_type,recorded_at,reason,contributor,source_url
```

The `value` cell is typed JSON: `20`, `"manual_swap"`, or a quoted JSON string for a text assertion. Unknown values are empty or `null`, never zero. `evidence_json` is a JSON object with only the allowed public evidence properties. Dates retain the source's meaning: `observed_at` is not the review date, and an unknown `valid_from` stays unknown. `recorded_at` is the immutable UTC recording time. The changelog's `new_event_id` points to the claim event, `previous_event_id` agrees with its supersession, and its source and recording time must agree with that claim. Every event needs exactly one change reference, a reason and a contributor described by a public role.

Raw workbook exports, private write payloads, captured source bytes, private evidence and personal contacts stay outside Git. Do not place workbook or Drive URLs or identifiers in a public plan, manifest or closeout. The verification tabs use the private HMAC handoff in the workbook plan contract, even though the accepted public subset later becomes a snapshot.

## Evidence gates before a write plan

Validate a proposed ledger with `validateLedger` from `server/src/verification/standard.js` before asking the writer to append it. Simulate planned workbook rows in an isolated temporary checkout and run `tools/verification-ledger.mjs import-workbook` there. A rejected claim stays `pending_verification`; do not weaken a validator or fill an evidence flag merely to make it pass.

- Existing catalogue values remain `Pending_Audit` until an attribute-specific source review supports a grade. A traced OEM statement may be V1; a formal document with conditions may support V2 for the attribute it actually establishes. A patent, generic certification or filing does not establish untested performance. Independent, first-hand corroboration is required for V3; V4 requires a reproducible protocol, results, audit identifier and preserved public evidence.
- Payload marked only as a generic carry or lift claim stays unclassified. Sustained bilateral payload needs its explicit arm configuration, duty cycle and thermal conditions. Peak and single-arm values need their own explicit scope. They do not enter the default sustained-payload comparison.
- Rated-load runtime needs a load percentage and task protocol. Charging needs its state-of-charge window. Autonomous battery changing alone does not establish uninterrupted autonomous hot swap.
- Success rates need sample size, environment and protocol in the same assertion. L3 needs demonstrated autonomous exception recovery. MTBI needs exposure time and a nonzero intervention count; zero interventions yield a lower bound, not infinite measured MTBI.
- HRL4 needs documented external operation, an explicit paid relationship and customer confirmation. A memorandum, reservation, assembly target or announcement is insufficient. Later HRL gates also require the corresponding deliveries and operating evidence.
- Age changes the freshness warning and visual confidence. It does not rewrite a source's original tier. Confidential documents are not accepted into the public ledger, and the public form must not request their upload.

## Publication sequence

After the writer's receipt, obtain a fresh private workbook export and perform the existing independent readback, including all prior verification rows. Then import the verification ledger before generating pages, reports or an API bundle:

```sh
node tools/verification-ledger.mjs import-workbook --from <private-export.json> --as-of <YYYY-MM-DD> --archive-dir <directory-outside-the-repository>
node tools/verification-ledger.mjs check --base <base-commit>
node tools/archive-verification-sources.mjs --cohort data/verification/audit-cohort.json --output-dir <directory-outside-the-repository> --retry-failed
node tools/export-verification-report.mjs
node tools/build-pages.mjs
node tools/build-site.mjs
node --no-warnings --test tools/test-verification-ledger.mjs tools/test-verification-ui.mjs
node --no-warnings --test server/test/verification.test.js
node tools/export-verification-report.mjs --check
node tools/build-pages.mjs --check
node tools/build-site.mjs --check
node tools/check-public.mjs
```

Run the existing broader CI checks and browser verification appropriate to the changed surfaces. An unchanged verification ledger keeps its original `as_of`; do not advance dates or tiers to make the catalogue appear fresh. New claims require preservation attempts. The cohort batch additionally preserves consulted sources that produced no accepted claim; previous successful captures are not fetched again, while `--retry-failed` retries unsuccessful attempts.

`data/verification/archives.json` is a dated public capture manifest. It records content hashes, byte sizes, source URLs and failed attempts. Source bytes remain outside the repository. A successful local capture is not a public `source_archive_url`, an independent measurement or a grade upgrade. A failed capture remains explicit; never invent a Wayback URL. Public archive URLs require a separate check and a new claim event where appropriate.

The report is generated from the ledger, cohort, catalogue and capture manifest. Historical event counts are labelled as such. Its protocol-validation counts require current V2+ attributes; confirmed HRL4+ counts require V3+ evidence. The initial baseline is not a completed quarter or a statistically representative global assessment. Do not mark a source screening as a completed deep audit or an independent physical test.

One PR per batch includes the exported public ledger, capture manifest, generated report and pages. CI checks append-only history against the base commit. After a green review and merge, publish Pages and deploy the API from the same reviewed snapshot when verification data or code changed. The API bundles the public ledger: a D1 workbook import alone does not update this metadata. No new D1 migration or full data import is required solely for these additive verification tables.

Existing catalogue changes still follow their normal scoped import and quota checks. Never run an extra full workbook import merely to refresh verification metadata. Preserve the current Worker bindings, variables, secrets, access matrix and six read-only MCP tools.

## Production readback and closure

Check the changed robot's page, `/v1/verification?entity=<slug>`, humanoid HTTP responses and the existing MCP `get_rows` response. Match the expected event IDs, exact hardware generation, values, units, tier, review dates, caveats and source links. Confirm retractions and superseded values remain in history, and that incompatible or missing values stay excluded from comparisons. Verify a pending model has not inherited a grade, and that deployment/component public responses retain their existing field boundaries.

Read `/v1/verification` for the standard and snapshot metadata. Row-based humanoid HTTP/MCP responses attach verification under `verification.by_row_id`; this preserves existing row fields. Capture status is published separately through `source_preservation_url` and never silently rewrites an immutable claim.

Record the workbook write/readback, PR/head, CI, Pages deployment, API version, production comparisons, capture failures and evidence gaps in the existing delivery closeout. A workbook write, a green local test or a merged PR alone is not proof of live publication. Future re-reviews and manufacturer replies use the existing editorial workflow; no autonomous audit or immediate response is promised.
