// Canonical active catalogue of the directory tabs (Software, Other Robots), Javier, 25 Nov 2026. One rule set, shared by
// the backend import (server/src/import/normalize.js) and therefore by every public generator that reads the import
// (tools/export-database.mjs, the pages, the home counts) and by the app: they all see the same entries.
//
//   - A repeated header row (its URL cell reads "URL" or its description cell "DESCRIPTION") is not an entry.
//   - A section heading (a name in capitals with neither URL nor description, e.g. "SIMULATORS") is not an entry; it
//     names the group of the rows that follow it in the same column, until the next heading.
//   - Exact identities: entries whose URLs normalise to the same address (host without www, path without trailing
//     slash, case-insensitive; server/src/import/identity.js urlKey) are one entity. Within one list, the repeats are
//     merged into the first row (their names kept as other names). Across lists, the entry of the spec's first list is
//     the canonical entry and the other list's row stays as a topical membership (canonical: false, pointing to it),
//     with its own stable id: a world model that is also a software entry is listed as a world model but counted once.
//     Nothing else is merged: the same name with different addresses stays separate (a version, a paper and a project
//     page are distinct records), and is reported for review.
// Every excluded or merged row is reported with its sheet row and reason; the workbook itself is never changed.

import { urlKey } from '../import/identity.js';

const blank = (v) => v === null || v === undefined || String(v).trim() === '';
export const isRepeatedHeader = (d) => /^url$/i.test(String(d.url ?? '').trim()) || /^description$/i.test(String(d.description ?? '').trim());
export const isSectionHeading = (d) => !blank(d.name) && blank(d.url) && blank(d.description) && /^[A-Z0-9][A-Z0-9 &/+'-]*$/.test(String(d.name).trim()) && /[A-Z]{3}/.test(d.name);

// "SOFTWARE FOR UNITREE" -> "Software for Unitree" with the spec's proper names; unknown words in sentence case.
export function sectionLabel(heading, properNames = []) {
  const words = String(heading).trim().toLowerCase().split(/\s+/);
  return words.map((w, i) => {
    const proper = properNames.find((p) => p.toLowerCase() === w);
    if (proper) return proper;
    return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  }).join(' ');
}

// items: [{ sheetRow, rank, data: { list, name, url, description } }] in workbook order (normalize.js, kind 'lists').
export function canonicalDirectory(spec, items) {
  const excluded = [];
  const merged = [];
  const memberships = [];
  const review = [];
  const groups = new Map(); // list -> current section label
  const kept = [];
  for (const item of items) {
    const d = item.data;
    if (isRepeatedHeader(d)) {
      excluded.push({ sheet_row: item.sheetRow, list: d.list, name: d.name, reason: 'repeated header row' });
      continue;
    }
    if (isSectionHeading(d)) {
      const label = sectionLabel(d.name, spec.properNames ?? []);
      groups.set(d.list, label);
      excluded.push({ sheet_row: item.sheetRow, list: d.list, name: d.name, reason: `section heading: the rows below it are grouped as "${label}"` });
      continue;
    }
    d.group = groups.get(d.list) ?? null;
    kept.push(item);
  }
  // Merge decisions in list order (the spec's first list wins, then workbook order), so a merged entry keeps the
  // identity of its primary list; the output keeps workbook order.
  const order = new Map((spec.lists ?? []).map((l, i) => [l.list, i]));
  const byPriority = [...kept].sort((a, b) => (order.get(a.data.list) ?? 0) - (order.get(b.data.list) ?? 0) || a.sheetRow - b.sheetRow);
  const byKey = new Map();
  const drop = new Set();
  for (const item of byPriority) {
    const key = blank(item.data.url) ? null : urlKey(item.data.url);
    const first = key ? byKey.get(key) : null;
    if (!first) {
      if (key) byKey.set(key, item);
      item.data.canonical = true;
      item.data.also_listed_as = [];
      item.data.other_names = [];
      continue;
    }
    // The same entity in another list (a software entry that is also a world model): a topical membership. Its row and
    // its stable id stay (ids are keyed on list and address); it points to its canonical entry and is never counted as
    // a second entry. The same entity twice in one list is a duplicate: merged into the first, its name kept.
    if (item.data.list !== first.data.list) {
      item.data.canonical = false;
      item.data.canonical_list = first.data.list;
      item.data.canonical_name = first.data.name;
      if (!first.data.also_listed_as.includes(item.data.list)) first.data.also_listed_as.push(item.data.list);
      memberships.push({ sheet_row: item.sheetRow, list: item.data.list, name: item.data.name, canonical_sheet_row: first.sheetRow, canonical_list: first.data.list, canonical_name: first.data.name, reason: `same address as the ${first.data.list.replace(/_/g, ' ')} entry: kept as a ${item.data.list.replace(/_/g, ' ')} membership, not a second entry` });
      continue;
    }
    drop.add(item);
    const f = first.data;
    const d = item.data;
    if (d.name !== f.name && !f.other_names.includes(d.name)) f.other_names.push(d.name);
    if (blank(f.description) && !blank(d.description)) f.description = d.description;
    merged.push({ sheet_row: item.sheetRow, list: d.list, name: d.name, into_sheet_row: first.sheetRow, into_list: f.list, into_name: f.name, reason: 'same address as an earlier entry of the same list: one entry, this name kept as another name' });
  }
  const out = kept.filter((item) => !drop.has(item));
  // Same name, different addresses: kept apart (distinct versions, papers or pages), listed for a human decision.
  const byName = new Map();
  for (const item of out.filter((x) => x.data.canonical !== false)) {
    const n = String(item.data.name).toLowerCase().replace(/[^a-z0-9]/g, '');
    byName.set(n, [...(byName.get(n) ?? []), item]);
  }
  for (const xs of byName.values()) if (xs.length > 1) review.push({ name: xs[0].data.name, entries: xs.map((x) => ({ sheet_row: x.sheetRow, list: x.data.list, url: x.data.url })), reason: 'same name, different addresses: kept as separate entries' });
  return { items: out, reconciliation: { source_entries: items.length, rows: out.length, entries: out.filter((x) => x.data.canonical !== false).length, excluded, merged, memberships, review } };
}
