// Canonical active catalogue of the directory tabs (Software, Other Robots), Javier, 25 Nov 2026. One rule set, shared by
// the backend import (server/src/import/normalize.js) and therefore by every public generator that reads the import
// (tools/export-database.mjs, the pages, the home counts) and by the app: they all see the same entries.
//
//   - A repeated header row (its URL cell reads "URL" or its description cell "DESCRIPTION") is not an entry.
//   - A section heading (a name in capitals with neither URL nor description, e.g. "SIMULATORS") is not an entry; it
//     names the group of the rows that follow it in the same column, until the next heading.
//   - Exact identity, nothing looser (Codex review of 25 Nov 2026): the same exact address (exactAddress: scheme and
//     host compared without case and without "www.", one trailing slash ignored; the path's case, the query and the
//     fragment kept, so "/model?v=1" and "/model?v=2" or "/Project" and "/project" stay distinct) AND the same name
//     (compared without case or spacing). Within one list such repeats are merged into the first row; a different,
//     non-empty description of a merged row is kept as another description. Across lists, the entry of the spec's first
//     list is the canonical entry and the other list's row stays as a topical membership (canonical: false, pointing
//     to it) with its own stable id, counted once.
//   - The same address under another name (Reachy and "Reachy Pollen Robotics"), or the same name at another address,
//     is not merged: both stay as entries and are listed for review, unless an identity decision in
//     server/src/catalogue/directory-identities.json says they are one entity (reviewed, with its reason).
// Every excluded, merged or membership row is reported with its sheet row and reason; the workbook is never changed.

import identities from './directory-identities.json' with { type: 'json' };

const blank = (v) => v === null || v === undefined || String(v).trim() === '';
// Only the header and section rows the spec names (reviewed against the workbook) are taken out; a row that merely looks
// like one (capitals, no address, no description) stays an entry and is listed for review (Codex review, 25 Nov 2026).
export const isRepeatedHeader = (spec, d) => (spec.repeatedHeaders ?? []).some((h) => nameKey(h.name) === nameKey(d.name) && /^url$/i.test(String(d.url ?? '').trim()));
export const isSectionHeading = (spec, d) => blank(d.url) && blank(d.description) && (spec.sectionHeadings ?? []).some((h) => nameKey(h) === nameKey(d.name));
export const looksLikeHeading = (d) => !blank(d.name) && blank(d.url) && blank(d.description) && /^[A-Z0-9][A-Z0-9 &/+'-]*$/.test(String(d.name).trim()) && /[A-Z]{3}/.test(d.name);
export const nameKey = (v) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

// The address as written, with only the differences that cannot change the resource removed.
export function exactAddress(url) {
  try {
    const u = new URL(String(url).trim());
    const path = u.pathname.length > 1 ? u.pathname.replace(/\/$/, '') : '';
    return `${u.protocol.toLowerCase()}//${u.hostname.toLowerCase().replace(/^www\./, '')}${u.port ? `:${u.port}` : ''}${path}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

// "SOFTWARE FOR UNITREE" -> "Software for Unitree" with the spec's proper names; unknown words in sentence case.
export function sectionLabel(heading, properNames = []) {
  const words = String(heading).trim().toLowerCase().split(/\s+/);
  return words.map((w, i) => {
    const proper = properNames.find((p) => p.toLowerCase() === w);
    if (proper) return proper;
    return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  }).join(' ');
}

// A reviewed decision that two names at one address are one entity: { tab, address, names: [..], reason }.
function reviewedSame(spec, address, a, b) {
  return (identities.decisions ?? []).some((x) => x.tab === spec.id && x.same === true && exactAddress(x.address) === address
    && x.names.map(nameKey).includes(nameKey(a)) && x.names.map(nameKey).includes(nameKey(b)));
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
    if (isRepeatedHeader(spec, d)) {
      excluded.push({ sheet_row: item.sheetRow, list: d.list, name: d.name, reason: 'repeated header row' });
      continue;
    }
    if (isSectionHeading(spec, d)) {
      const label = sectionLabel(d.name, spec.properNames ?? []);
      groups.set(d.list, label);
      excluded.push({ sheet_row: item.sheetRow, list: d.list, name: d.name, reason: `section heading: the rows below it are grouped as "${label}"` });
      continue;
    }
    if (looksLikeHeading(d) || /^(url|description)$/i.test(String(d.url ?? '').trim()) || /^description$/i.test(String(d.description ?? '').trim())) review.push({ name: d.name, entries: [{ sheet_row: item.sheetRow, list: d.list, name: d.name, url: d.url }], reason: 'looks like a header or section row but is not a reviewed one: kept as an entry until reviewed' });
    d.group = groups.get(d.list) ?? null;
    d.canonical = true;
    d.also_listed_as = [];
    d.other_names = [];
    d.other_descriptions = [];
    d.other_groups = [];
    kept.push(item);
  }
  // Decisions in list order (the spec's first list wins, then workbook order), so a merged entry keeps the identity of
  // its primary list; the output keeps workbook order.
  const order = new Map((spec.lists ?? []).map((l, i) => [l.list, i]));
  const byPriority = [...kept].sort((a, b) => (order.get(a.data.list) ?? 0) - (order.get(b.data.list) ?? 0) || a.sheetRow - b.sheetRow);
  const byAddress = new Map(); // exact address -> canonical items at that address
  const drop = new Set();
  for (const item of byPriority) {
    const d = item.data;
    const address = blank(d.url) ? null : exactAddress(d.url);
    if (!address) continue;
    const earlier = byAddress.get(address) ?? [];
    const same = earlier.find((e) => nameKey(e.data.name) === nameKey(d.name) || reviewedSame(spec, address, e.data.name, d.name));
    if (!same) {
      for (const e of earlier) review.push({ name: d.name, entries: [e, item].map((x) => ({ sheet_row: x.sheetRow, list: x.data.list, name: x.data.name, url: x.data.url })), reason: 'same address under another name: kept as separate entries until an identity decision says they are one' });
      byAddress.set(address, [...earlier, item]);
      continue;
    }
    const f = same.data;
    if (d.list !== f.list) {
      d.canonical = false;
      d.canonical_list = f.list;
      d.canonical_name = f.name;
      if (!f.also_listed_as.includes(d.list)) f.also_listed_as.push(d.list);
      memberships.push({ sheet_row: item.sheetRow, list: d.list, name: d.name, canonical_sheet_row: same.sheetRow, canonical_list: f.list, canonical_name: f.name, reason: `same address and name as the ${f.list.replace(/_/g, ' ')} entry: kept as a ${d.list.replace(/_/g, ' ')} membership with its own id, not a second entry` });
      continue;
    }
    drop.add(item);
    if (d.name !== f.name && !f.other_names.includes(d.name)) f.other_names.push(d.name);
    if (d.group && d.group !== f.group && !f.other_groups.includes(d.group)) f.other_groups.push(d.group);
    let description = 'none';
    if (!blank(d.description)) {
      if (blank(f.description)) { f.description = d.description; description = 'used: the first row had none'; }
      else if (nameKey(d.description) === nameKey(f.description)) description = 'identical';
      else { f.other_descriptions.push(d.description); description = 'different: kept as another description'; }
    }
    merged.push({ sheet_row: item.sheetRow, list: d.list, name: d.name, group: d.group, into_sheet_row: same.sheetRow, into_list: f.list, into_name: f.name, into_group: f.group, description, reason: 'same address and name as an earlier entry of the same list' });
  }
  const out = kept.filter((item) => !drop.has(item));
  // Same name, different addresses: kept apart (distinct versions, papers or pages), listed for a human decision.
  const byName = new Map();
  for (const item of out.filter((x) => x.data.canonical !== false)) byName.set(nameKey(item.data.name).replace(/[^a-z0-9]/g, ''), [...(byName.get(nameKey(item.data.name).replace(/[^a-z0-9]/g, '')) ?? []), item]);
  for (const xs of byName.values()) if (xs.length > 1) review.push({ name: xs[0].data.name, entries: xs.map((x) => ({ sheet_row: x.sheetRow, list: x.data.list, name: x.data.name, url: x.data.url })), reason: 'same name, different addresses: kept as separate entries' });
  return { items: out, reconciliation: { source_entries: items.length, rows: out.length, entries: out.filter((x) => x.data.canonical !== false).length, excluded, merged, memberships, review } };
}
