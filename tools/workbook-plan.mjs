#!/usr/bin/env node
// Workbook write plans: the handoff between the three phases of a newsletter update (contract and roles in
// ops/weekly-update/plan-contract.md).
//
//   Phase 1, Claude (cloud, read-only): research, then the public plan in Git (ops/weekly-update/plans/<plan_id>.json)
//            and, when a value is private, a private payload that never enters Git (Git keeps only its SHA-256).
//   Phase 2, Codex (native Google Sheets connector): preflight, cell-level write, fresh readback, receipt.
//   Phase 3, Claude: fresh download, independent readback, publication, one production import.
//
//   node tools/workbook-plan.mjs check [plan.json ...] [--private <payload.json>]   (no file: every plan in Git)
//   node tools/workbook-plan.mjs split <draft.json> --public <plan.json> --private <payload.json>
//   node tools/workbook-plan.mjs preflight <plan.json> --from <export.json> [--private <payload.json>]
//   node tools/workbook-plan.mjs readback <plan.json> --from <export.json> [--private <payload.json>] [--previous <export.json>]
//   node tools/workbook-plan.mjs simulate <plan.json> --from <export.json> --out <export.json> --private <payload.json>
//   node tools/workbook-plan.mjs summary <plan.json>
//   node tools/workbook-plan.mjs hash <file>
//
// <export.json> is the private workbook export of tools/workbook-xlsx-to-json.py (tab -> rows, header first, values
// as the sheet displays them). Exports and payloads stay outside Git. Output never prints a private value.

import { createHash, createHmac, randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DATASETS } from '../server/src/datasets.js';
import { isRepeatedHeader, isSectionHeading, sectionLabel } from '../server/src/catalogue/directory.js';

export const CONTRACT = 'whyhumanoid/workbook-plan@1';
export const PRIVATE_CONTRACT = 'whyhumanoid/workbook-plan-private@1';
export const KINDS = ['append_row', 'fill_list_slot', 'update_cells'];
export const OUTCOMES = ['planned', 'already_incorporated', 'out_of_scope', 'pending_verification', 'pending_decision'];
export const PLANS_DIR = new URL('../ops/weekly-update/plans/', import.meta.url);

// Values may be written in clear only in the free tabs, and there never in internal columns. Every other tab (paid,
// counted-only or not imported: Deployments, Components, Clean Entities, Reports...) travels as HMACs only.
export const PUBLIC_SHEETS = new Set(DATASETS.filter((d) => d.access === 'free').map((d) => d.tab));
export const PRIVATE_COLUMNS = { Datasets: new Set(['RELATED_BENCHMARK_URL', 'CLASSIFICATION_NOTE', 'ATTACHMENT_REF']) };
export const isPrivateCell = (sheet, header) => !PUBLIC_SHEETS.has(sheet) || Boolean(PRIVATE_COLUMNS[sheet]?.has(header));
// Cells that change on their own (live market formulas). A readback accepts their changes outside the plan only while
// both values are formatted numbers; any other change outside the plan is reported and fails the readback.
export const LIVE_FIELDS = { Humanoids: new Set(['Valuation']), Investment: new Set(['PRICE', 'CHANGE_PCT', 'MARKET_CAP', 'LAST_TRADE', 'DATA_DELAY_MIN', 'QUOTE_STATUS']) };
const LIVE_VALUE = /^-?[\d,]*\.?\d+%?$|^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2}$|^$/;

const FORBIDDEN = [
  [/docs\.google\.com\/|drive\.google\.com\//, 'a Google Docs, Sheets or Drive link'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, 'an email address'],
];
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const DAY = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const HEX64 = /^[0-9a-f]{64}$/;
const https = (u) => typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u);

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const hmac = (salt, planId, opId, column, kind, value) =>
  createHmac('sha256', Buffer.from(salt, 'hex')).update(`${planId}\n${opId}\n${column}\n${kind}\n${value}`).digest('hex');
export const colIndex = (letters) => [...letters].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
export const colLetters = (index) => {
  let s = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const cellAt = (rows, row, col) => String(rows?.[row - 1]?.[col] ?? '');
const norm = (v) => String(v ?? '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const payloadKey = (opId, column, kind) => `${opId}:${column}:${kind}`;

// --- Phase 1: validation of the public plan (and of the private payload when given) ---------------------------------
export function validatePlan(plan, { text = JSON.stringify(plan), payload = null, payloadBytes = null } = {}) {
  const problems = [];
  const bad = (m) => problems.push(m);
  if (plan?.contract !== CONTRACT) bad(`contract must be "${CONTRACT}"`);
  if (!/^WP-\d{8}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(plan?.plan_id ?? '')) bad('plan_id must look like WP-AAAAMMDD-slug');
  if (!ISO.test(plan?.created_at ?? '')) bad('created_at must be an ISO UTC time');
  if (!plan?.created_by) bad('created_by is required');
  if (!ISO.test(plan?.basis?.workbook_modified_time ?? '')) bad('basis.workbook_modified_time must be the ISO time of the workbook the plan was read from');
  for (const [re, what] of FORBIDDEN) if (re.test(text)) bad(`the public plan contains ${what}`);

  const editions = new Map();
  for (const e of plan?.editions ?? []) {
    if (!/^[a-z0-9-]+:\d{4}-\d{2}-\d{2}:[a-z0-9-]+$/.test(e.edition_id ?? '')) bad(`edition_id "${e.edition_id}" must look like source:AAAA-MM-DD:slug`);
    if (editions.has(e.edition_id)) bad(`edition ${e.edition_id} is repeated`);
    if (!https(e.url) || !e.title || !DAY.test(e.published ?? '') || !e.section) bad(`edition ${e.edition_id}: url, title, published and section are required`);
    if (!Number.isInteger(e.item_count) || e.item_count < 0) bad(`edition ${e.edition_id}: item_count must be a whole number`);
    editions.set(e.edition_id, e);
  }
  if (!editions.size) bad('at least one edition is required');

  const items = new Map();
  for (const it of plan?.items ?? []) {
    const at = `item ${it.item_id}`;
    if (!/^[a-z0-9-]+$/.test(it.item_id ?? '') || items.has(it.item_id)) bad(`${at}: item_id must be unique, lower case`);
    if (!editions.has(it.edition_id)) bad(`${at}: unknown edition ${it.edition_id}`);
    if (!Number.isInteger(it.order) || it.order < 1) bad(`${at}: order must start at 1`);
    if (!it.title || !https(it.link) || !it.new_information) bad(`${at}: title, link and new_information are required`);
    if (!OUTCOMES.includes(it.outcome)) bad(`${at}: outcome must be one of ${OUTCOMES.join(', ')}`);
    if (it.outcome === 'planned' && !(it.ops ?? []).length) bad(`${at}: a planned item names its operations`);
    if (it.outcome !== 'planned' && !it.reason) bad(`${at}: reason is required when the outcome is ${it.outcome}`);
    if (typeof it.entity?.exists !== 'boolean') bad(`${at}: entity.exists (true or false) is required, apart from whether the new claim is incorporated`);
    items.set(it.item_id, it);
  }
  for (const e of editions.values()) {
    const orders = [...items.values()].filter((i) => i.edition_id === e.edition_id).map((i) => i.order).sort((a, b) => a - b);
    if (orders.length !== e.item_count || orders.some((o, i) => o !== i + 1)) bad(`edition ${e.edition_id}: items must be numbered 1 to ${e.item_count} in the edition's order`);
  }

  const targets = new Set();
  let privateCells = 0;
  const ops = new Map();
  for (const op of plan?.operations ?? []) {
    const at = `operation ${op.op_id}`;
    if (!/^op-\d{3}$/.test(op.op_id ?? '') || ops.has(op.op_id)) bad(`${at}: op_id must be unique, op-NNN`);
    ops.set(op.op_id, op);
    if (!items.has(op.item_id)) bad(`${at}: unknown item ${op.item_id}`);
    else if (!(items.get(op.item_id).ops ?? []).includes(op.op_id)) bad(`${at}: item ${op.item_id} does not list it`);
    if (!KINDS.includes(op.kind)) bad(`${at}: kind must be one of ${KINDS.join(', ')}`);
    if (!op.sheet) bad(`${at}: sheet is required`);
    if (!Number.isInteger(op.row) || op.row < 2) bad(`${at}: row must be a sheet row below the header`);
    if (op.header_row !== undefined && (!Number.isInteger(op.header_row) || op.header_row >= op.row)) bad(`${at}: header_row must be above row`);
    if (!(op.sources ?? []).length) bad(`${at}: at least one source is required`);
    for (const s of op.sources ?? []) if (!https(s.url) || !s.publisher || !s.published || !DAY.test(s.reviewed ?? '')) bad(`${at}: each source needs url (https), publisher, published and reviewed (AAAA-MM-DD)`);
    const key = op.record?.key;
    if (!key?.column || !key?.header || (key.value === undefined) === (key.value_hmac === undefined)) bad(`${at}: record.key needs column, header and exactly one of value or value_hmac`);
    else if (isPrivateCell(op.sheet, key.header) ? key.value !== undefined : key.value_hmac !== undefined) bad(`${at}: record.key must be ${isPrivateCell(op.sheet, key.header) ? 'an HMAC (private tab or column)' : 'in clear'}`);
    for (const u of op.record?.unique ?? []) {
      if (!u.column || !u.header || (u.value === undefined) === (u.value_hmac === undefined)) bad(`${at}: record.unique entries need column, header and exactly one of value or value_hmac`);
      else if (isPrivateCell(op.sheet, u.header) ? u.value !== undefined : u.value_hmac !== undefined) bad(`${at}: record.unique ${u.header} must be ${isPrivateCell(op.sheet, u.header) ? 'an HMAC (private tab or column)' : 'in clear'}`);
    }
    if (!(op.cells ?? []).length) bad(`${at}: cells are required`);
    for (const c of op.cells ?? []) {
      const where = `${at} ${op.sheet}!${c.column}${op.row}`;
      if (!/^[A-Z]{1,3}$/.test(c.column ?? '') || !c.header) bad(`${where}: column (letters) and header are required`);
      const t = `${op.sheet}!${c.column}${op.row}`;
      if (targets.has(t)) bad(`${where}: the cell is targeted twice`);
      targets.add(t);
      const priv = isPrivateCell(op.sheet, c.header);
      if (Boolean(c.private) !== priv) bad(`${where}: private must be ${priv} for this tab and column`);
      if (priv) {
        privateCells += 1;
        if (c.proposed !== undefined || !HEX64.test(c.proposed_hmac ?? '')) bad(`${where}: a private cell carries proposed_hmac only`);
        if (c.expected_previous !== undefined && c.expected_previous !== '') bad(`${where}: a private non-empty previous value travels as expected_previous_hmac`);
      } else if (typeof c.proposed !== 'string' || c.proposed_hmac !== undefined) bad(`${where}: a public cell carries proposed in clear`);
      const hasPrev = typeof c.expected_previous === 'string' || HEX64.test(c.expected_previous_hmac ?? '');
      if (!hasPrev) bad(`${where}: expected_previous (or expected_previous_hmac) is required`);
      if (op.kind !== 'update_cells' && c.expected_previous !== '') bad(`${where}: ${op.kind} writes only into empty cells (expected_previous "")`);
    }
    if (listSpec(op)?.spec.sectionHeadings?.length && op.kind !== 'update_cells' && !(op.group_expected === null || typeof op.group_expected === 'string')) {
      bad(`${at}: group_expected (the list's section label, or null for the first block) is required: a row joins the group of the heading above it`);
    }
    if (key?.column && op.kind !== 'update_cells') {
      const kc = (op.cells ?? []).find((c) => c.column === key.column);
      if (!kc) bad(`${at}: the record key column ${key.column} must be one of the written cells`);
      else if (key.value !== undefined && kc.proposed !== key.value) bad(`${at}: record.key.value must equal the proposed key cell`);
    }
  }
  for (const it of items.values()) for (const id of it.ops ?? []) if (!ops.has(id)) bad(`item ${it.item_id}: unknown operation ${id}`);

  const pp = plan?.private_payload;
  if (privateCells && (!HEX64.test(pp?.sha256 ?? '') || !pp?.delivery || pp?.cells !== privateCells)) bad(`private_payload needs sha256, delivery and cells (${privateCells})`);
  if (!privateCells && pp) bad('private_payload must be absent when no cell is private');
  if (payload) problems.push(...validatePayload(plan, payload, payloadBytes));
  return problems;
}

export function validatePayload(plan, payload, bytes) {
  const problems = [];
  if (payload?.contract !== PRIVATE_CONTRACT) problems.push(`private payload contract must be "${PRIVATE_CONTRACT}"`);
  if (payload?.plan_id !== plan.plan_id) problems.push('private payload belongs to another plan');
  if (bytes && sha256(bytes) !== plan.private_payload?.sha256) problems.push('private payload SHA-256 differs from the plan');
  if (!HEX64.test(payload?.salt ?? '')) problems.push('private payload salt must be 64 hex characters');
  const v = payload?.values ?? {};
  const check = (opId, column, kind, digest) => {
    const value = v[payloadKey(opId, column, kind)];
    if (typeof value !== 'string') return problems.push(`private payload lacks ${payloadKey(opId, column, kind)}`);
    for (const [re, what] of FORBIDDEN.slice(0, 1)) if (re.test(value)) problems.push(`${payloadKey(opId, column, kind)} holds ${what}`);
    if (hmac(payload.salt, plan.plan_id, opId, column, kind, value) !== digest) problems.push(`${payloadKey(opId, column, kind)} does not match its HMAC`);
  };
  for (const op of plan.operations ?? []) {
    if (op.record?.key?.value_hmac) check(op.op_id, op.record.key.column, 'key', op.record.key.value_hmac);
    for (const u of op.record?.unique ?? []) if (u.value_hmac) check(op.op_id, u.column, 'unique', u.value_hmac);
    for (const c of op.cells ?? []) {
      if (c.proposed_hmac) check(op.op_id, c.column, 'proposed', c.proposed_hmac);
      if (c.expected_previous_hmac) check(op.op_id, c.column, 'previous', c.expected_previous_hmac);
    }
  }
  return problems;
}

// Clear values of a cell, key or unique entry: from the public plan, or from the private payload.
const resolver = (plan, payload) => (op, column, kind, entry) => {
  const clear = kind === 'proposed' ? entry.proposed : kind === 'previous' ? entry.expected_previous : entry.value;
  if (clear !== undefined) return clear;
  if (kind === 'previous' && entry.expected_previous_hmac === undefined) return '';
  return payload?.values?.[payloadKey(op.op_id, column, kind)];
};

// --- Phase 1 authoring: a draft with every value in clear becomes the public plan and the private payload -------------
export function splitDraft(draft, salt = randomBytes(32).toString('hex')) {
  const plan = structuredClone(draft);
  const values = {};
  let cells = 0;
  for (const op of plan.operations ?? []) {
    const key = op.record?.key;
    if (key && isPrivateCell(op.sheet, key.header) && key.value !== undefined) {
      values[payloadKey(op.op_id, key.column, 'key')] = key.value;
      key.value_hmac = hmac(salt, plan.plan_id, op.op_id, key.column, 'key', key.value);
      delete key.value;
    }
    for (const u of op.record?.unique ?? []) {
      if (isPrivateCell(op.sheet, u.header) && u.value !== undefined) {
        values[payloadKey(op.op_id, u.column, 'unique')] = u.value;
        u.value_hmac = hmac(salt, plan.plan_id, op.op_id, u.column, 'unique', u.value);
        delete u.value;
      }
    }
    for (const c of op.cells ?? []) {
      if (!isPrivateCell(op.sheet, c.header)) continue;
      cells += 1;
      c.private = true;
      values[payloadKey(op.op_id, c.column, 'proposed')] = c.proposed;
      c.proposed_hmac = hmac(salt, plan.plan_id, op.op_id, c.column, 'proposed', c.proposed);
      delete c.proposed;
      if (c.expected_previous) {
        values[payloadKey(op.op_id, c.column, 'previous')] = c.expected_previous;
        c.expected_previous_hmac = hmac(salt, plan.plan_id, op.op_id, c.column, 'previous', c.expected_previous);
        delete c.expected_previous;
      }
    }
  }
  const payload = cells || Object.keys(values).length ? { contract: PRIVATE_CONTRACT, plan_id: plan.plan_id, salt, values } : null;
  const payloadText = payload ? `${JSON.stringify(payload, null, 2)}\n` : null;
  if (payload) plan.private_payload = { ...(draft.private_payload ?? {}), cells, sha256: sha256(payloadText) };
  else delete plan.private_payload;
  return { plan, payload, payloadText };
}

// --- Phase 2 and 3: the plan against a workbook export -------------------------------------------------------------
function header(exportData, op, c) {
  return cellAt(exportData[op.sheet], op.header_row ?? 1, colIndex(c.column));
}

// Directory lists with reviewed section headings (Software: "SOFTWARE FOR UNITREE", "SIMULATORS"): a row belongs to
// the group of the nearest heading above it in its list, so a row appended at the end of the list joins the last group.
export function listSpec(op) {
  const spec = DATASETS.find((d) => d.tab === op.sheet && d.kind === 'lists');
  const list = spec?.lists.find((l) => l.columns.name === colIndex(op.record?.key?.column ?? 'A'));
  return spec && list ? { spec, list } : null;
}
// The kind of a sheet row inside one list: a section title, a repeated column-header row, blank, or an entry.
function rowKind(exportData, sheet, spec, list, r) {
  const row = exportData[sheet]?.[r - 1] ?? [];
  const d = { name: row[list.columns.name] ?? '', url: row[list.columns.url] ?? '', description: list.columns.description === undefined ? '' : row[list.columns.description] ?? '' };
  if (isSectionHeading(spec, d)) return { kind: 'heading', label: sectionLabel(d.name, spec.properNames ?? []) };
  if (isRepeatedHeader(spec, d)) return { kind: 'header' };
  if (!String(d.name).trim() && !String(d.url).trim() && !String(d.description).trim()) return { kind: 'blank' };
  return { kind: 'entry' };
}
export function groupAt(exportData, op) {
  const found = listSpec(op);
  if (!found?.spec.sectionHeadings?.length) return undefined;
  for (let r = op.row - 1; r > (op.header_row ?? 1); r -= 1) {
    const k = rowKind(exportData, op.sheet, found.spec, found.list, r);
    if (k.kind === 'heading') return k.label;
  }
  return null;
}
// A list row must be an entry slot: not a section title or a column-header row, and not between a section title and
// the column headers that follow it (entries come after them).
export function slotProblems(exportData, op, { after = false } = {}) {
  const found = listSpec(op);
  if (!found?.spec.sectionHeadings?.length) return [];
  const { spec, list } = found;
  const here = rowKind(exportData, op.sheet, spec, list, op.row);
  if (here.kind === 'heading' || here.kind === 'header') return [`${op.op_id}: row ${op.row} is a ${here.kind === 'heading' ? 'section title' : 'column-header'} row of the list`];
  if (after && here.kind !== 'entry') return [`${op.op_id}: row ${op.row} holds no list entry after the write`];
  for (let r = op.row - 1; r > (op.header_row ?? 1); r -= 1) {
    const k = rowKind(exportData, op.sheet, spec, list, r);
    if (k.kind === 'blank') continue;
    if (k.kind === 'heading' && (spec.repeatedHeaders ?? []).length) return [`${op.op_id}: row ${op.row} sits between the section title "${k.label}" and its column headers`];
    break;
  }
  return [];
}

export function preflight(plan, exportData, payload = null) {
  const value = resolver(plan, payload);
  const cells = [];
  const problems = [];
  for (const op of plan.operations) {
    const rows = exportData[op.sheet];
    if (!rows) { problems.push(`${op.op_id}: sheet ${op.sheet} is missing`); continue; }
    for (const c of op.cells) {
      const where = `${op.op_id} ${op.sheet}!${c.column}${op.row}`;
      if (header(exportData, op, c) !== c.header) problems.push(`${where}: header is "${header(exportData, op, c)}", plan says "${c.header}"`);
      const current = cellAt(rows, op.row, colIndex(c.column));
      const proposed = value(op, c.column, 'proposed', c);
      const previous = value(op, c.column, 'previous', c);
      if (proposed === undefined || previous === undefined) { cells.push('unverifiable'); problems.push(`${where}: private value needed (--private)`); continue; }
      const state = current === previous ? 'pending' : current === proposed ? 'applied' : 'conflict';
      cells.push(state);
      if (state === 'conflict') problems.push(`${where}: holds neither the expected previous value nor the proposed one`);
    }
    problems.push(...slotProblems(exportData, op));
    if (op.group_expected !== undefined) {
      const group = groupAt(exportData, op);
      if (group !== undefined && group !== op.group_expected) problems.push(`${op.op_id}: row ${op.row} would be listed under "${group ?? 'no group'}", plan says "${op.group_expected ?? 'no group'}" (write it inside the right block)`);
    }
    const key = op.record.key;
    const keyValue = value(op, key.column, 'key', key);
    if (keyValue === undefined) { problems.push(`${op.op_id}: private key needed (--private)`); continue; }
    const kc = colIndex(key.column);
    if (op.kind === 'update_cells') {
      if (norm(cellAt(rows, op.row, kc)) !== norm(keyValue)) problems.push(`${op.op_id}: row ${op.row} is not the record named by its key (rows moved?)`);
    } else {
      for (const u of [key, ...(op.record.unique ?? [])]) {
        const v = u === key ? keyValue : value(op, u.column, 'unique', u);
        if (v === undefined) continue;
        const col = colIndex(u.column);
        const elsewhere = rows.findIndex((r, i) => i + 1 !== op.row && i + 1 > (op.header_row ?? 1) && norm(r?.[col]) === norm(v));
        if (elsewhere >= 0) problems.push(`${op.op_id}: ${u.header} already present at ${op.sheet} row ${elsewhere + 1} (duplicate)`);
      }
    }
  }
  const count = (s) => cells.filter((x) => x === s).length;
  return { problems, cells: cells.length, pending: count('pending'), applied: count('applied'), conflicts: count('conflict'), unverifiable: count('unverifiable') };
}

export function readback(plan, exportData, payload = null, previous = null) {
  const value = resolver(plan, payload);
  const differences = [];
  let checked = 0;
  const targets = new Set();
  const targetRows = new Set();
  for (const op of plan.operations) {
    const rows = exportData[op.sheet] ?? [];
    targetRows.add(`${op.sheet}\n${op.row}`);
    for (const c of op.cells) {
      targets.add(`${op.sheet}\n${op.row}\n${colIndex(c.column)}`);
      const where = `${op.op_id} ${op.sheet}!${c.column}${op.row}`;
      const proposed = value(op, c.column, 'proposed', c);
      if (proposed === undefined) { differences.push(`${where}: private value needed (--private)`); continue; }
      checked += 1;
      if (header(exportData, op, c) !== c.header) differences.push(`${where}: header changed`);
      if (cellAt(rows, op.row, colIndex(c.column)) !== proposed) differences.push(`${where}: differs from the plan`);
    }
    // The written row is the planned record, once, in the planned group, in an entry slot of its list.
    const key = op.record.key;
    const keyValue = value(op, key.column, 'key', key);
    if (keyValue !== undefined) {
      const kc = colIndex(key.column);
      if (norm(cellAt(rows, op.row, kc)) !== norm(keyValue)) differences.push(`${op.op_id}: row ${op.row} does not hold the planned record`);
      if (op.kind !== 'update_cells') {
        const copies = rows.filter((r, i) => i + 1 > (op.header_row ?? 1) && norm(r?.[kc]) === norm(keyValue)).length;
        if (copies !== 1) differences.push(`${op.op_id}: the planned record appears ${copies} times in ${op.sheet}`);
      }
    }
    differences.push(...slotProblems(exportData, op, { after: true }));
    if (op.group_expected !== undefined) {
      const group = groupAt(exportData, op);
      if (group !== undefined && group !== op.group_expected) differences.push(`${op.op_id}: row ${op.row} is listed under "${group ?? 'no group'}", plan says "${op.group_expected ?? 'no group'}"`);
    }
  }
  // A new row holds nothing outside the plan.
  for (const op of plan.operations.filter((o) => o.kind === 'append_row')) {
    const row = exportData[op.sheet]?.[op.row - 1] ?? [];
    row.forEach((v, i) => { if (String(v ?? '') !== '' && !targets.has(`${op.sheet}\n${op.row}\n${i}`)) differences.push(`${op.sheet}!${colLetters(i)}${op.row}: a new row holds a value outside the plan`); });
  }
  // Every other cell of the workbook against the export taken just before the write: only live market values may move.
  let neighbours = 0;
  const unexpected = [];
  const live = {};
  if (previous) {
    for (const sheet of new Set([...Object.keys(previous), ...Object.keys(exportData)])) {
      const a = previous[sheet];
      const b = exportData[sheet];
      if (!a || !b) { unexpected.push(`${sheet}: tab ${a ? 'removed' : 'added'}`); continue; }
      const head = b[0] ?? [];
      for (let r = 0; r < Math.max(a.length, b.length); r += 1) {
        const ra = a[r] ?? [];
        const rb = b[r] ?? [];
        for (let i = 0; i < Math.max(ra.length, rb.length); i += 1) {
          if (targets.has(`${sheet}\n${r + 1}\n${i}`)) continue;
          if (targetRows.has(`${sheet}\n${r + 1}`)) neighbours += 1;
          const va = String(ra[i] ?? '');
          const vb = String(rb[i] ?? '');
          if (va === vb) continue;
          if (r > 0 && LIVE_FIELDS[sheet]?.has(head[i]) && LIVE_VALUE.test(va) && LIVE_VALUE.test(vb)) live[sheet] = (live[sheet] ?? 0) + 1;
          else unexpected.push(`${sheet}!${colLetters(i)}${r + 1}`);
        }
      }
    }
  }
  return { checked, differences, neighbours, unexpected, live, compared: Boolean(previous) };
}

export function simulate(plan, exportData, payload) {
  const out = structuredClone(exportData);
  const value = resolver(plan, payload);
  for (const op of plan.operations) {
    const rows = out[op.sheet];
    while (rows.length < op.row) rows.push([]);
    const row = rows[op.row - 1];
    for (const c of op.cells) {
      const v = value(op, c.column, 'proposed', c);
      if (v === undefined) throw new Error(`${op.op_id}: private value needed (--private)`);
      const i = colIndex(c.column);
      while (row.length <= i) row.push('');
      row[i] = v;
    }
    while (row.length && row[row.length - 1] === '') row.pop();
  }
  return out;
}

export function summary(plan) {
  const lines = [`${plan.plan_id}: ${plan.operations.length} operations, ${plan.operations.reduce((n, o) => n + o.cells.length, 0)} cells, ${plan.private_payload?.cells ?? 0} private`];
  for (const op of plan.operations) {
    const cols = op.cells.map((c) => colIndex(c.column));
    const range = `${op.sheet}!${colLetters(Math.min(...cols))}${op.row}:${colLetters(Math.max(...cols))}${op.row}`;
    const key = op.record.key.value ?? '(private key)';
    lines.push(`  ${op.op_id} ${op.kind.padEnd(14)} ${range.padEnd(26)} ${key}  [${op.cells.length} cells${op.cells.some((c) => c.private) ? `, ${op.cells.filter((c) => c.private).length} private` : ''}]`);
  }
  return lines.join('\n');
}

// --- CLI -----------------------------------------------------------------------------------------------------------
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
function loadPayload() {
  const path = arg('--private');
  if (!path) return { payload: null, bytes: null };
  const bytes = readFileSync(path);
  return { payload: JSON.parse(bytes.toString('utf8')), bytes };
}
function fail(lines) {
  for (const l of lines) console.error(`- ${l}`);
  process.exit(1);
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
})();

if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(`workbook-plan: ${error.message}`);
    process.exit(1);
  }
}

function main() {
  const [command, file] = process.argv.slice(2);
  if (command === 'check') {
    const files = process.argv.slice(3).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--private');
    const list = files.length ? files : existsSync(PLANS_DIR) ? readdirSync(PLANS_DIR).filter((f) => f.endsWith('.json')).map((f) => fileURLToPath(new URL(f, PLANS_DIR))) : [];
    const { payload, bytes } = loadPayload();
    const problems = [];
    for (const f of list) {
      const text = readFileSync(f, 'utf8');
      problems.push(...validatePlan(JSON.parse(text), { text, payload, payloadBytes: bytes }).map((p) => `${f.split('/').pop()}: ${p}`));
    }
    if (problems.length) { console.error('Workbook plan check FAILED:'); fail(problems); }
    console.log(`Workbook plans follow ${CONTRACT}: ${list.length} plan(s)${payload ? ', private payload verified' : ''}; no private value in clear.`);
  } else if (command === 'split') {
    const draft = readJson(file);
    const { plan, payloadText } = splitDraft(draft);
    const problems = validatePlan(plan, { text: JSON.stringify(plan), payload: payloadText && JSON.parse(payloadText), payloadBytes: payloadText && Buffer.from(payloadText) });
    if (problems.length) { console.error('The draft does not give a valid plan:'); fail(problems); }
    writeFileSync(arg('--public'), `${JSON.stringify(plan, null, 2)}\n`);
    if (payloadText) writeFileSync(arg('--private'), payloadText);
    console.log(summary(plan));
    console.log(`public plan ${arg('--public')} sha256 ${sha256(readFileSync(arg('--public')))}${payloadText ? `; private payload sha256 ${sha256(payloadText)} (keep it out of Git)` : ''}`);
  } else if (command === 'preflight' || command === 'readback' || command === 'simulate') {
    const planBytes = readFileSync(file);
    const plan = JSON.parse(planBytes.toString('utf8'));
    const { payload, bytes } = loadPayload();
    const problems = validatePlan(plan, { text: planBytes.toString('utf8'), payload, payloadBytes: bytes });
    if (problems.length) { console.error('The plan is not valid:'); fail(problems); }
    const exportData = readJson(arg('--from'));
    if (command === 'preflight') {
      const r = preflight(plan, exportData, payload);
      console.log(`Preflight ${plan.plan_id}: ${r.cells} cells, ${r.pending} to write, ${r.applied} already written, ${r.conflicts} conflicts, ${r.unverifiable} need the private payload.`);
      if (r.problems.length) fail(r.problems);
    } else if (command === 'readback') {
      // Without the export taken just before the write, changes outside the plan cannot be ruled out: refuse.
      if (!arg('--previous')) fail(['--previous <export taken just before the write> is required: without it, changes outside the plan are not checked']);
      const r = readback(plan, exportData, payload, readJson(arg('--previous')));
      const receipt = {
        plan_id: plan.plan_id,
        public_plan_sha256: sha256(planBytes),
        private_payload_sha256: bytes ? sha256(bytes) : null,
        cells_checked: r.checked,
        differences: r.differences.length,
        neighbour_cells_checked: r.neighbours,
        unexpected_changes: r.unexpected.length,
        live_market_changes: r.live,
      };
      console.log(JSON.stringify(receipt, null, 2));
      if (r.differences.length || r.unexpected.length) fail([...r.differences, ...r.unexpected.slice(0, 50).map((c) => `${c}: changed outside the plan`), ...(r.unexpected.length > 50 ? [`(and ${r.unexpected.length - 50} more)`] : [])]);
    } else {
      if (!arg('--out')) fail(['--out is required']);
      writeFileSync(arg('--out'), JSON.stringify(simulate(plan, exportData, payload)));
      console.log(`Simulated ${plan.plan_id} on a copy of the export: ${arg('--out')} (private, outside Git).`);
    }
  } else if (command === 'summary') {
    console.log(summary(readJson(file)));
  } else if (command === 'hash') {
    console.log(sha256(readFileSync(file)));
  } else {
    console.error('usage: node tools/workbook-plan.mjs check|split|preflight|readback|simulate|summary|hash (see the header)');
    process.exit(2);
  }
}
