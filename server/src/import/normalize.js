// Turns the raw cell values of one workbook tab into normalised rows.
// Input: values as returned by the Sheets API (first row = headers; trailing empty cells may be omitted).
// Every row keeps its sheet row and its preview rank: the position of its sheet row among the non-empty data
// rows of the tab, in workbook order. The public preview is rank <= 10.

import { cleanValue, redactPrivateLinks } from './clean.js';
import { PREVIEW_ROWS } from '../datasets.js';
import { publicValues } from '../access/fields.js';

export class ImportError extends Error {}

const cell = (row, index) => {
  const value = row?.[index];
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
};

function checkHeaders(spec, values) {
  const actual = (values[0] ?? []).map((h) => String(h ?? '').trim());
  while (actual.length < spec.headers.length) actual.push('');
  const extra = actual.slice(spec.headers.length).filter((h) => h !== '');
  // A former header row (the workbook before its translation to English) is accepted only with the same columns.
  const matches = (headers) => headers.every((h, i) => h === actual[i]) && actual.slice(headers.length).every((h) => h === '');
  if (!(matches(spec.headers) || (spec.formerHeaders ?? []).some(matches)) || extra.length) {
    throw new ImportError(`Tab "${spec.tab}": header drift. Expected ${JSON.stringify(spec.headers)}, got ${JSON.stringify(actual)}`);
  }
}

export function normalizeTab(spec, values) {
  if (!Array.isArray(values) || values.length === 0) throw new ImportError(`Tab "${spec.tab}" is empty or missing`);
  // A tab with several blocks (Components since 23 Nov 2026: the product table, notes, related software) names the
  // block this dataset reads: spec.select(values) -> { header, rows: [{ sheetRow, row }] }, or throws on any surprise.
  let block;
  try {
    block = spec.select ? spec.select(values) : { header: values[0], rows: values.slice(1).map((row, i) => ({ sheetRow: i + 2, row })) };
  } catch (error) {
    throw new ImportError(error.message);
  }
  checkHeaders(spec, [block.header]);
  const warnings = [];
  const review = [];
  const items = [];
  const withheld = new Set(spec.withheld ?? []);
  const editorial = spec.editorial ?? {};
  let rank = 0;

  block.rows.forEach(({ row, sheetRow }) => {
    if (!(row ?? []).some((v) => String(v ?? '').trim() !== '')) return; // empty rows do not count
    if (spec.kind === 'lists') {
      rank += 1;
      for (const def of spec.lists) {
        const name = cell(row, def.columns.name);
        if (!name) continue;
        const data = { list: def.list, name, url: redactPrivateLinks(cell(row, def.columns.url)).value };
        data.description = def.columns.description === undefined ? null : redactPrivateLinks(cell(row, def.columns.description)).value;
        items.push({ sheetRow, rank, data });
      }
      return;
    }
    const data = {};
    const previewData = {};
    (spec.fields ?? spec.headers).forEach((field, c) => {
      if (withheld.has(field)) return;
      const value = cell(row, c);
      if (spec.clean && value !== null) {
        const full = cleanValue(value, { field, mode: 'full', editorial });
        data[field] = full.value;
        previewData[field] = cleanValue(value, { field, mode: 'preview', editorial }).value;
        for (const s of full.stripped) review.push({ sheetRow, field, action: 'stripped', reason: s.reason });
        for (const r of full.rewritten) review.push({ sheetRow, field, action: 'rewritten', reason: r.reason });
        for (const f of full.flagged) review.push({ sheetRow, field, action: 'flagged', reason: f.reason, key: f.key });
      } else {
        const safe = redactPrivateLinks(value);
        if (safe.redacted) review.push({ sheetRow, field, action: 'stripped', reason: 'private_link' });
        // Tabs with internal editorial clauses in their texts remove them before anything is stored (spec.scrub).
        const kept = spec.scrub && safe.value !== null ? spec.scrub(field, safe.value) : safe.value;
        if (kept !== safe.value) review.push({ sheetRow, field, action: 'stripped', reason: 'editorial_note' });
        data[field] = kept;
        previewData[field] = kept;
      }
    });
    // Rows the sheet itself excludes (duplicates, editorial resources) stay as internal provenance only.
    const internal = Boolean(spec.internalRow?.(data));
    if (!internal) rank += 1;
    // Public values. A subscription tab (24 Nov 2026): every row at the allowlisted fields of server/src/access/fields.js,
    // or none (null) when the tab is counted only. A free tab: its cleaned values, or all values (null).
    let pub = spec.clean ? previewData : null;
    if (spec.access === 'subscription') pub = internal ? null : publicValues(spec.id, spec.clean ? previewData : data);
    else if (spec.publicFields && !internal && rank > PREVIEW_ROWS) pub = Object.fromEntries(spec.publicFields.map((f) => [f, (spec.clean ? previewData : data)[f] ?? null]));
    items.push({ sheetRow, rank: internal ? null : rank, data, previewData: pub, visibility: internal ? 'internal' : 'customer' });
  });

  const seen = new Set();
  for (const item of items) {
    if (spec.idFields) {
      const fromPrimary = spec.idFields.map((f) => item.data[f]);
      let id = fromPrimary.every(Boolean) ? fromPrimary.join(':') : null;
      if (!id && spec.fallbackIdFields?.every((f) => item.data[f])) id = spec.fallbackIdFields.map((f) => item.data[f]).join(':');
      if (!id) throw new ImportError(`Tab "${spec.tab}", sheet row ${item.sheetRow}: missing ${spec.idFields.join(' + ')}`);
      if (seen.has(id)) throw new ImportError(`Tab "${spec.tab}": duplicate id "${id}" at sheet row ${item.sheetRow}`);
      seen.add(id);
      item.id = id;
    } else {
      // Keyless tabs get persistent ids from the identity registry, keyed on a natural identity, never on names.
      item.naturalKey = spec.naturalKey?.(item.data) ?? null;
      item.alias = item.data.name ?? item.data.Robot ?? null;
    }
  }

  return {
    rows: items.map((item, position) => ({
      id: item.id ?? null,
      naturalKey: item.naturalKey ?? null,
      alias: item.alias ?? null,
      sheetRow: item.sheetRow,
      previewRank: item.rank,
      visibility: item.visibility ?? 'customer',
      previewData: item.previewData ?? null,
      position,
      data: item.data,
    })),
    warnings,
    review,
  };
}
