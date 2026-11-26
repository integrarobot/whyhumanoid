# Workbook write plan contract (`whyhumanoid/workbook-plan@1`)

Resumen en español: Claude investiga y planifica en la nube (fase 1), Codex escribe y relee con el conector nativo de Google Sheets (fase 2) y Claude publica tras el recibo de Codex (fase 3). Procedimiento en `.claude/skills/whyhumanoid-weekly-update/SKILL.md` y regla en `AGENTS.md`.

Decision by Javier (26 Nov 2026): every newsletter batch reaches the workbook and the site without Javier copying cells or relaying plans. Tool: `tools/workbook-plan.mjs` (tests in `tools/test-workbook-plan.mjs`, run by CI).

## Phases and owners

| Phase | Owner and schedule | Output |
|---|---|---|
| 1. Research and plan | Claude, scheduled task on Wednesdays at 14:00 Europe/Madrid, in the cloud, read-only access to the workbook | Public plan in Git, private payload outside Git, private delivery note, closeout |
| 2. Write and readback | Codex, automation "Incorporar newsletters a Why Humanoid?" (daily, 15:00 Europe/Madrid), native Google Sheets connector | Write and readback receipt |
| 3. Publication | Claude, in the Code session Codex coordinates, only after the receipt | Site, one production import, verification, closeout |

Common rules:

- Only the news section of each edition is processed (Javier, 18 Nov 2026).
- A read-only connector in phase 1 is not a blocker: its output is a complete, verifiable plan. Never ask Javier to copy cells. Never propose changes to Google permissions, identities, credentials or the scheduled task as a routine step.
- Writes are cell by cell, only in the plan's cells. Never replace the workbook or a whole tab. A cell that already holds the proposed value is not rewritten, so an interrupted write resumes without repeating anything.
- No phase changes prices, access, billing, credentials or the import workflow.
- Facts the sources do not support are not planned. They stay in the plan as `pending_verification` or `pending_decision`, with the evidence they need, and remain in `known_pending` until resolved. Routine classification under existing criteria is done by Claude or Codex, not escalated to Javier.

## Public plan (`ops/weekly-update/plans/<plan_id>.json`)

The plan is immutable once written to the workbook. `node tools/workbook-plan.mjs check` validates it, and CI runs the same check.

- `contract`: `whyhumanoid/workbook-plan@1`.
- `plan_id`: `WP-YYYYMMDD-source-slug`, dated by the edition (or by the first edition of the batch).
- `created_at` and `created_by`. `basis.workbook_modified_time` is the modified time of the workbook the plan was read from.
- `editions[]`: stable identity of each edition. Fields: `edition_id` (`integrarobot:YYYY-MM-DD:slug`), `url`, `title`, `published`, `section` (the literal title of the news section) and `item_count`.
- `items[]`: every news item of the section, numbered in its order, without double counting.
  - Each item has `title`, `link`, `new_information`, `outcome`, and a `reason` unless the outcome is `planned`. Outcomes: `planned`, `already_incorporated`, `out_of_scope`, `pending_verification`, `pending_decision`.
  - `entity.exists` and `entity.where` say whether the company or product was already in the catalogue. That is separate from whether the new claim is incorporated.
  - A planned item names its `ops`. If part of the item was already incorporated, `entity.where` says so.
- `operations[]`: one per record written.
  - `op_id` (`op-NNN`), `item_id` and `kind`. There are three kinds:
    - `append_row`: a new table row. Unlisted cells stay empty.
    - `fill_list_slot`: a free slot of a list that shares rows with another list, such as Software A:C or Other Robots A:C. Neighbouring cells are untouched.
    - `update_cells`: a change to an existing record.
  - Target: `sheet` (tab title), `row` (sheet row) and `header_row` (default 1).
  - `record.key`: the column, header and value that identify the record, such as `DATASET_ID`, `METRIC_ID`, `record_id` or a list name. `record.unique` is optional, for example a list URL. For `append_row` and `fill_list_slot` the key must not exist on another row. For `update_cells` the row must still hold the record.
  - `group_expected` is required in lists with reviewed section titles (Software: "Software for Unitree", "Simulators"). A row belongs to the group of the nearest section title above it, so a row appended at the end of the list joins the last group. `null` is the first block, with no group.
    - The target must be an entry slot. It cannot be a section title row, a repeated column-header row, or a row between a section title and the column headers that follow it.
    - `preflight` checks this on the live sheet and `readback` checks it again after the write.
  - `cells[]`: `column` (letters), `header` (the exact header in that column), `expected_previous` (`""` for empty cells) and `proposed`.
  - `sources[]`: `url`, `publisher`, `published` and `reviewed`.
- `private_payload`: the payload `sha256`, the number of private `cells`, and `delivery`.

Private values:

- Values travel in clear only in the free tabs (`access: 'free'` in `server/src/datasets.js`), and never in internal columns: Datasets `RELATED_BENCHMARK_URL`, `CLASSIFICATION_NOTE` and `ATTACHMENT_REF`.
- Every other tab travels as HMACs only, even where a field is public on the site. That covers Deployments, Components, Clean Entities, Evidence Relations, Product - Container Handling, Data Space, Reports and any new tab. The plan carries `proposed_hmac`, `expected_previous_hmac` and `value_hmac` (for `record.key` and `record.unique` alike) with `private: true`.
- The public plan never carries Google Docs, Sheets or Drive links or IDs, email addresses, or paid record identifiers.

Moves inside a list, such as correcting a group, are not plan operations yet. Codex writes them with a receipt that proves a permutation: the same multiset of rows, and nothing changed outside the moved columns. Claude reads them back from a fresh export before publishing. The first case was Software A77:C134 on 26 Nov 2026.

## Making space in a list (phase 2 preparation and replan)

A block of a sectioned list can be full. On 26 Nov 2026, for example, the first Software block filled rows 2 to 80, with the SOFTWARE FOR UNITREE title at row 81. The plan operations never write on a section title or a column-header row, so a new entry for that block needs a free slot first. Making one is a routine, bounded preparation, not a decision for Javier and not a reason for manual copying:

1. **Phase 1 requests the preparation.** It still writes the content plan against the current master, with the block it needs (`group_expected`) and the number of slots. It records a preparation request in the handoff entry of `state.json` (`status: awaiting_preparation`), naming:
   - the tab;
   - the list columns only (for example Software `A:C`);
   - the block and its first and last rows;
   - the number of empty slots, placed at the end of the block, just above the next section title.

   The plan is not yet ready for writing: its rows are rebased after the preparation.
2. **Codex prepares the master.** Codex first reads the full native metadata of the affected block, from the slot position to the end of that list, and of its neighbours: values, links, formats, validation, chips, notes and the table range. It then makes the slots with a range insert or a permutation scoped to that list's columns. Never whole-sheet rows: the parallel list in the same rows (Software `E:F`, Other Robots `E:G`) must not move.

   Every record, its identity, links, formats and validation are preserved, and the native table range grows to cover the list. Codex then re-reads the whole moved block and its neighbours and gives a receipt:
   - rows moved and their new positions;
   - the new positions of the section titles and column-header rows;
   - the empty slots, by row and group;
   - the table range;
   - zero value or metadata differences;
   - the parallel list unchanged;
   - the workbook modified time.
3. **Nothing is published or imported for a preparation alone.** Positions change but no catalogue value does. The edition is not marked processed.
4. **Claude rebases the unwritten plan.** Claude downloads the master afresh and checks the preparation:
   - the same non-empty rows of the list, in their new positions;
   - the requested number of empty slots in the requested block;
   - the parallel list and every other tab unchanged, except live market values.

   Then Claude rewrites the draft with the new rows and basis time and runs `split` again: new SHA-256, new salt and new private payload, a new Drive file whose ID goes privately to Codex as in phase 1, and `preflight` on the prepared basis. A plan nobody has written may be replaced in place by its rebased version. The handoff keeps `rebased_from` (the old SHA-256) and returns to `awaiting_write`. A written plan is immutable and is never rebased.
5. **Phases 2 and 3 continue as usual.** Codex writes the rebased plan. Claude runs the readback with the prepared master as `--previous`, then publishes and imports once.

## Private payload and its delivery

Format: `{ "contract": "whyhumanoid/workbook-plan-private@1", "plan_id", "salt", "values": { "<op_id>:<column>:<proposed|previous|key|unique>": "<value>" } }`. Each HMAC is SHA-256 keyed with the payload's salt, over `plan_id`, `op_id`, column, kind and value, separated by newlines. The plan records the file's SHA-256, so the payload cannot change unnoticed.

Delivery, proven on 26 Nov 2026:

1. Phase 1 creates the file in Javier's Google Drive ("My Drive") with the Google Drive connector, titled `whyhumanoid-private-handoff-<plan_id>.json` and not shared. It then downloads the file once and checks its SHA-256.
2. Phase 1 delivers the Drive file ID and link privately, together with `plan_id` and the SHA-256:
   - in the phase 1 conversation, as a direct message to whoever reads it;
   - in the private note the scheduled task leaves for Codex;
   - never in Git, a public closeout or the site.

   Codex opens the file by its ID. A title search is not enough: Drive search may not index a new file yet, and on 26 Nov 2026 both exact and partial title searches returned nothing while the ID worked.
3. If the file cannot be created, phase 1 attaches the payload to its conversation and gives its SHA-256 there.
4. If a plan has private cells and the payload cannot be delivered either way, phase 1 closes `bloqueado` with the exact reason. Public operations may go in a separate plan.

Phase 1 commands:

1. Write a draft with every value in clear, outside Git.
2. Run `node tools/workbook-plan.mjs split <draft> --public ops/weekly-update/plans/<plan_id>.json --private <payload outside Git>`.
3. Run `check --private <payload>`, `preflight <plan> --from <export> --private <payload>` and `summary <plan>`.

## Phase 2 receipt (Codex)

Before writing, Codex checks that the plan on `main` and the payload match their SHA-256. On the live sheet it checks:

- the headers;
- that each cell holds the expected previous value, or already the proposed one;
- that the key is not duplicated;
- the list groups and slots.

On any mismatch it stops and says so; there are no silent partial writes.

It then writes only the pending cells and reads back the written cells and their neighbours. The receipt, in the coordination chat, gives:

- `plan_id`, the `main` commit and the plan SHA-256;
- the payload SHA-256;
- cells written and cells already written;
- conflicts (0) and readback differences (0);
- neighbour cells checked unchanged;
- native table ranges;
- the workbook modified time after the write;
- a statement that no credentials, sharing or identities changed.

## Phase 3 (Claude, only after the receipt)

1. Download the workbook afresh and run `python3 -I tools/workbook-xlsx-to-json.py <book.xlsx> <export.json> --compare <export taken just before the write>`. Only the plan's rows and live market values may change.
2. Run `node tools/workbook-plan.mjs readback <plan> --from <export> --private <payload> --previous <export taken just before the write>`. `--previous` is mandatory: without it, changes outside the plan could not be ruled out. The readback fails on any of the following:
   - a value that differs from the plan;
   - a header that changed;
   - a record missing at its row, or appearing more than once;
   - a wrong group or slot;
   - a new row holding values outside the plan;
   - any change outside the plan except live market numbers: Humanoids `Valuation` and Investment `PRICE`, `CHANGE_PCT`, `MARKET_CAP`, `LAST_TRADE`, `DATA_DELAY_MIN` and `QUOTE_STATUS`, while both values are formatted numbers.

   It never prints a private value. Its receipt goes into `state.json`.
3. Publish through the skill's flow, one PR per batch. Regenerate only what changed (for example `export-database --only software`). A tab whose content is unchanged keeps its atlas and preview; the Benchmarks test pins its export time.
4. Run one production import per batch ("Import private workbook", `main`, `production`), with no test import first: the daily D1 rows-written quota is per account.
   - Check the day's real remaining margin first. Codex reads it in the Cloudflare dashboard (UTC day); count the imports already run that day.
   - Estimate this import's cost and compare it with that margin. For the current workbook and catalogue (26 Nov 2026), a full import writes an estimated 12,000 rows, about 32,000 counting index writes. That is an estimate, not a bound: a larger catalogue writes more, so re-estimate (a local run of the import on the test SQLite shim gives the figure).
   - A second import on the same day is valid when the workbook changed again and the margin covers it (26 Nov 2026: batch, then group correction).
   - Never run concurrent imports. Never run redundant ones: no import when the workbook has not changed since the last import, and none for a change that does not reach the import, such as cell formats.
5. Verify in production (API or MCP): the counts, and each planned record with its snapshot.
6. In `state.json`, the handoff moves to `published`. The edition moves to `last_processed_edition` with its unresolved items, which stay in `known_pending`. Then register the closeout.

## Handoff state (`ops/weekly-update/state.json`, `handoffs`)

One entry per plan:

- `plan_id`, `plan` and `editions`;
- `status`: `awaiting_preparation`, `awaiting_write`, `written` or `published`;
- `preparation` and `rebased_from`, when a list needed space;
- `private_payload`: its `sha256` and the channel, with no ID or link;
- `write_receipt`: a summary of Codex's receipt, with no local paths;
- `independent_readback`;
- `publication`: PR, commit, Pages run, import run and production snapshot;
- open defects and their fixes.
