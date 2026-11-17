# Public and paid split: proposal (task 6)

Status: **proposal, not in force.** Javier decides before anything changes. Until then the paywall of d-0008 stands:
Humanoids free, the first 10 sheet rows of each other tab free, everything else for subscribers (€100 per year).
The full proposal for Javier, in Spanish and with two example dossiers built from current data, is a private doc on
claude.ai (link in the close of this task). This file is the operational summary; it holds no premium values.

## Rule

Public is what says that something exists and who it is. Paid is what saves the work of checking it, completing it
and following it. For each field, in order:

1. Can anyone get it in minutes from a public source (maker site, press release)? Public.
2. Is it the result of our research (finding, reading, classifying, verifying, cross-checking)? Paid, except one
   selected sample per dossier.
3. Is its value coverage or time (everything, changes, notices)? Paid, and only sold once the feature exists.
4. Can a count or aggregate reveal a single record? If not, it may be public.

## Proposed access matrix

| Entity or tab | Public | Paid | Change from today |
| --- | --- | --- | --- |
| Robot (Humanoids) | All current catalogue fields; deployment summary (records by status, organisations, countries, sectors, years); 1 selected evidence | Every record naming it, in full | Summary and evidence added |
| Company (makers, organisations, entities) | Name, role, recorded country, web and social links if recorded, catalogue robots, records by status and role, sectors, site countries, years, identity (canonical name, type, reference URL); 1 selected evidence | Full records, internal notes, full relations | A page for every company in the database, not only those with public information today |
| Deployments | In summaries: organisation, recorded maker and model, country, sector, status label, year; selected evidence in full | Site and city, task and workflow, integration dependencies, metrics, claim text, confidence, verification, sources and dates, open questions | The 10 preview rows stay |
| Evidence links, Task evaluations, Container handling | What they are, how many, method, one example | All content | Task evaluations is already fully public (4 rows); not withdrawn |
| Entities | Canonical name, type, reference URL, review date (inside the company page) | Notes, identity scope | Those fields public for all |
| Stocks | Name, ticker, exchange, country | Segment, ETF membership with date and sources, checks | Javier's decision 5 |
| Integrators, Software, Datasets, Hardware, Other robots | Recommended: full public directory | Nothing (alternative: descriptions paid) | Javier's decision 6 |
| Data space | Recommended: out of the paid product | | Javier's decision 7 |
| Reports and charts | Aggregates by status, sector, country and quarter, each cell with 3 records or more | Drill-down to records, filters | New |
| Method and sources | Definitions of status, verification, source roles and evidence levels E0 to E5; weekly cadence; corrections | | New; E0 to E5 definitions must come from Javier or the workbook |

## Selection rules

- **Selected evidence**, one per robot and one per company: eligible only with a source URL and a verification other
  than unresolved. Order: most advanced status (operational, then pilot or testing, then vendor-claimed operation,
  then planned); primary source (customer, maker, partner) before press; customer-confirmed before vendor-reported;
  latest publication; with a metric; sheet order. Editorial overrides in a reviewed file (public company and robot
  ids only).
- **Deployment summaries:** counts over all records with organisation, recorded maker and model, country, sector,
  status and year. No URL, site, task, metric or claim text.
- **Reports:** aggregates only, answering a buyer question, every cell with 3 records or more, snapshot date and a
  link to the method on each chart.

## Features: available and future

Never announce a feature before it exists.

| Feature | Today |
| --- | --- |
| Full rows and fields of the 13 tabs | Available to subscribers |
| Global search with common tags, categories, Deployments status filter, per-tab text filter | Available (sell as "search with tags", not "advanced filters") |
| Relations robot, company and deployment; "View all data" cards | Available |
| Permanent public pages for robots and companies with public information | Available (task 5) |
| API keys and paged JSON reads (500 rows per call), agent task plan | Exists technically; no key screen, customer docs, limits or plans |
| History of changes per record | Not built: each import replaces the previous data |
| Watchlists and tracking, alerts | Not built (alerts depend on history) |
| Exports for subscribers | Not built (only the free catalogue CSV) |
| Side-by-side comparisons | Not built |

## Phases and checks

0. **Decision.** Javier approves or changes the matrix and the nine decisions of the proposal. No technical change.
1. **Every company page and deployment summaries.** A public projection with a field allowlist, generated from the
   private export in the same step that makes the previews today, reviewed in a PR; company pages for every
   organisation; summaries on robot and company pages; visitor search extended to the projection.
   - The projection holds only allowlisted keys (unit test and `tools/check-public.mjs`).
   - Planted reserved values (a site, a metric, a claim text) appear in no HTML, metadata, sitemap or `data/` file,
     and visitor search returns 0 for them.
   - The Worker still checks the subscription before serving full rows; public responses carry no reserved field.
2. **Selected evidence, method page, first aggregate report.**
   - Each published evidence follows the rule or the editorial list; each chart cell has 3 records or more.
   - Titles, descriptions and structured data come only from public fields.
3. **Review.** Javier decides on the 10-row previews, Stocks, the link directories and Data space; the paywall
   message is updated.
   - Humanoids parity holds; no published URL breaks (`tools/permalinks.json`); nothing unbuilt is announced.

Future, only when built: history first, then tracking and alerts, exports, comparisons, documented API with plans.
