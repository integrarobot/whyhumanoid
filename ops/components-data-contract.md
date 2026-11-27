# Components data contract, version 1

Date: 23 Nov 2026. Author: Claude (Why Humanoid?). Relayed by Codex to Grok. Decides: Javier.

Purpose: one agreed shape for the Components research (Grok) before any master schema change, so it can be checked by a
machine and incorporated without breaking identities, duplicating companies or leaking premium data. Validator:
`server/src/components/contract.js`, run with `node tools/components-staging.mjs --from <staging.json> --master <master export.json>`.

This contract does not change the website scope (ten categories), the access decision (Components by subscription)
or the master workbook. It is research and integration work, not a claim of exhaustive supplier coverage.

## 1. Today: what may change in the live Components tab

The live tab `Components` (sheetId 100173846, native table HardwareCatalog) has three columns, NAME, URL and
DESCRIPTION (A:C). Until the schema of section 4 is approved, Grok may only make compatible, verified A:C upserts:

| Rule | Why |
|---|---|
| Do not change column B (URL) of an existing row. To correct a URL, tell Codex: the old address becomes an alias in a reviewed change. | The row's stable id is its list and normalised URL (`hardware|<host+path>`). A new URL mints a new id and retires the old one. |
| Never two rows with the same URL. | Both rows lose their id ("unresolved"). |
| Append new rows at the bottom; do not insert above or reorder. | The public preview is the first 10 rows in sheet order. |
| Edit A (name) and C (description) freely, in English, one short factual sentence, attributable to the URL's owner. | Names become aliases; descriptions are shown to subscribers. |
| No new columns, tabs, formulas, merged cells or notes in this tab; keep the header row. | The import rejects header drift. |
| Do not rename the tab or the native table, and do not move the sheet. | The import requests the title `Components`; the gid is kept. |
| No Google Drive, Docs or Sheets links in any cell. | Private links never reach the site. |

## 2. Staging workbook (Grok), contract version 1

A separate staging workbook, not the master. English. Exactly these tabs, with exactly these header rows (row 1).
One record per row. Lists inside a cell are separated by ` | `. Empty cell means not recorded. Its id and links stay
out of Git and off the site; Codex exports it as .xlsx for the validator.

### cc_sources: every source cited anywhere

`source_id, url, title, publisher, publication_date, accessed_on, source_role, language`

- `source_id`: `csr_<slug>`, unique, never reused. `url`: the public original (https), never a rehosted or private
  copy. `publication_date`: YYYY, YYYY-MM or YYYY-MM-DD as printed. `accessed_on`: YYYY-MM-DD.
- `source_role`: manufacturer, distributor, customer, filing, research_paper, press, analyst, index_membership, other.
- Evidence sources are manufacturer, distributor, customer, filing, research_paper and press. **index_membership (ETF
  or index lists) and analyst notes are never evidence that a company supplies humanoids**; they may only justify
  "candidate_needs_evidence".

### cc_companies: one record per organisation (company-centred directory)

`company_id, name, legal_name, website, hq_country, organisation_type, listing_isin, listing_ticker, listing_exchange,
site_company_slug, humanoid_relevance, relevance_reason, source_ids, legacy_components_url, reviewed_on`

- `company_id`: `cco_<slug>`, assigned once, never derived from a row position and never changed when the name
  changes. One company, one record: the validator rejects two records with the same name.
- `organisation_type`: company, research_lab, university, open_source_project, consortium. A research lab is not a
  supplier unless a source says it sells.
- `listing_*`: only when the company is listed; the ISIN links it to the Investment row (identity only, not evidence).
- `site_company_slug`: the existing Why Humanoid? company page if there is one (for example `nvidia`, `robosense`,
  `sharpa`, `realsense`), so the site keeps one canonical page per company.
- `humanoid_relevance`: documented_humanoid_supplier (a source says it supplies a humanoid maker),
  documented_humanoid_product (a source presents a product for humanoids), candidate_needs_evidence, excluded. The
  first two need at least one evidence source. `relevance_reason`: one sentence, always.
- `legacy_components_url`: the URL of the current Components row this company came from, if any (provenance).
- Private firms (from the sensor workbook or the current Components rows) are kept with `listing_*` empty.

### cc_roles: what an organisation does, by component family

`company_id, role, families, statement, source_ids`

- `role`: manufacturer, designer, contract_manufacturer, distributor, reseller, integrator, research_developer,
  software_provider. OEM and distributor are different rows; research_developer is not manufacturer.
- `families`: from the family list below. `statement`: what the source says, in one sentence. Evidence source required.

### cc_products: one record per product and version

`product_id, company_id, product_name, version, family, product_kind, availability, availability_as_of,
hardware_licence, software_licence, limitations, source_ids, legacy_components_url`

- `product_id`: `cpr_<company-slug>__<product-slug>` (double underscore), starting with its company's slug. A new
  version that changes specifications is a new record (`..._a1-rev-b`); a renamed product keeps its id.
- `family`: actuator, motor, transmission, bearing, battery, bms, charging, tactile_sensor, force_torque_sensor,
  vision_sensor, lidar, imu, encoder, compute, motion_controller, power_electronics, connector, cable, material,
  magnet, thermal, hand_end_effector, software.
- `product_kind`: commercial_hardware, research_prototype, open_hardware, reference_design, software. A full hand
  (for example a research hand) is `hand_end_effector`; simulation software (for example a tactile simulator) is
  `software`; neither is a commercial sensor. A research prototype is never "available".
- `availability`: available, announced, sampling, discontinued, research_only, unknown, with `availability_as_of`.
- Licences separately for hardware and code (for example "proprietary" and "MIT"). `limitations`: what the source
  says the product does not do or was not tested for.

### cc_specs: one specification per row, long format

`product_id, spec, value, unit, conditions, source_id, locator`

- `spec` and `unit` from the vocabulary in `server/src/components/contract.js` (for example peak_torque in N·m,
  taxel_count in count, spatial_resolution in mm, sampling_rate in Hz, ai_performance in TOPS, capacity in Wh).
  New names or units go through a reviewed change, not the sheet.
- `value`: a number or a range (`120`, `0.1-5`, `<2`); words go into `conditions` (temperature, duty cycle, test
  setup). `locator`: page, table or section of the source. One source per specification, an evidence source.

### cc_prices: dated, sourced prices, never mixed with BOM estimates

`product_id, price_kind, amount, currency, quantity_basis, price_date, source_id, locator`

- `price_kind`: list_price, published_quote (from the manufacturer or a distributor only), estimated_bom,
  analyst_estimate. `quantity_basis`: per unit and order size. ISO currency. Never convert or average.

### cc_integrations: documented use in robots

`product_id, robot_or_platform, relation, statement, source_id, locator`

- `relation`: documented_in_product, customer_reported, announced_partnership, research_demonstration. An
  announcement is not a deployment. Evidence source required.

### cc_investment_screen: the coverage ledger for all 276 Investment companies

`investment_key, name, decision, families, reason, source_ids, reviewed_on`

- `investment_key`: the ISIN of the Investment row, else `TICKER:EXCHANGE`. Every Investment row exactly once (the
  validator checks it against the master export).
- `decision`: included (an evidence source shows a physical supply-chain role: actuators, transmissions, bearings,
  batteries, BMS and charging, sensing, compute and control, power and connectors, materials, magnets, thermal),
  candidate_needs_evidence, excluded. A reason for every decision, also for excluded. Included companies also get a
  `cc_companies` record. Investment content itself is not edited by this work.

## 3. Checks before anything is incorporated

1. `node tools/components-staging.mjs --from <staging.json> --master <master export.json>` passes: headers, id
   formats and uniqueness, references, enumerations, units, evidence rules, price kinds, no private links, every
   source cited, Investment coverage complete, every `legacy_components_url` is a current Components URL.
2. A reviewed batch (Codex or Javier) on a sample of at least the 11 current entries and the tactile sensors: every
   important claim traced to its source and locator.
3. Only then the master change of section 4, in its own PR with a migration test.

## 4. Migration plan (not before approval)

- Master: add three tabs mirroring cc_companies (with cc_roles folded in or kept apart), cc_products (with
  cc_specs, cc_prices, cc_integrations) and cc_sources, or the minimum equivalent Javier approves. The current
  `Components` tab stays as it is during the transition and is never rewritten in place.
- Code: new datasets keyed by `company_id`, `product_id` and `source_id` (the ids are the natural keys; no row-based
  identities). The existing dataset `hardware` keeps its ids; each of its 11 rows maps to the new records through
  `legacy_components_url`, and the mapping is kept as provenance. Example: the row "NVIDIA Jetson Thor" (company and
  product in one row) becomes company `cco_nvidia` (site page `nvidia`) and product `cpr_nvidia__jetson-thor`, both
  with `legacy_components_url` = that row's URL; the old row is retired only after the new pages and the subscriber
  view show the same entity, and its old addresses redirect.
- Site: company pages stay one per company (`site_company_slug`); Components entries link to them; product pages
  only if Javier wants them. The Components category stays subscription.

## 5. Public and premium projection (explicit allowlist)

Public, for every company not excluded: name, website, country, organisation type, roles (labels only), component
families, number of products, and its company page. Everything else is for subscribers: product records,
specifications, prices, integrations, limitations, statements and sources. The projection is built by an allowlist
(`publicProjection` in the contract module), never by removing fields, and the same rule governs static JSON, public
exports, search documents and company pages. No rich premium data goes into `data/`, the sitemap or page metadata.

## 6. Open points for Javier

- Whether the first 10 rows stay the Components preview once the directory is company-centred, or the public
  projection of section 5 replaces it.
- Whether product pages are public by name (identity) or only inside the subscription.
- Who reviews each batch before it reaches the master.
