// Persistent identifiers for tabs without an id column (Integrators, directories, Humanoids).
// An id is assigned once per (namespace, natural key) and stored in identity_registry; it is never derived
// from a display name and never regenerated. Display names seen for an id are kept as aliases.
// Rows without a usable natural key, or whose key repeats inside the tab, are marked unresolved and get an
// unstable pending id so they stay visible for review.

import { newId } from '../crypto.js';

export function hostKey(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.toLowerCase().replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

export function urlKey(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    return `${u.hostname.toLowerCase().replace(/^www\./, '')}${path}`;
  } catch {
    return null;
  }
}

export async function resolveIdentities(db, dataset, prefix, rows, now) {
  const warnings = [];
  const keysInTab = new Map();
  for (const row of rows) if (row.naturalKey) keysInTab.set(row.naturalKey, (keysInTab.get(row.naturalKey) ?? 0) + 1);

  for (const row of rows) {
    if (row.id) continue;
    if (!row.naturalKey || keysInTab.get(row.naturalKey) > 1) {
      row.id = `pending_${dataset}_r${row.sheetRow}${row.data.list ? `_${row.data.list}` : ''}`;
      row.data.identity_status = 'unresolved';
      warnings.push(`${dataset} sheet row ${row.sheetRow}: ${row.naturalKey ? `natural key "${row.naturalKey}" repeats` : 'no natural key'}; served with unstable id ${row.id}`);
      continue;
    }
    const existing = await db
      .prepare('SELECT id, aliases FROM identity_registry WHERE namespace = ? AND natural_key = ?')
      .bind(dataset, row.naturalKey)
      .first();
    if (existing) {
      row.id = existing.id;
      const aliases = JSON.parse(existing.aliases);
      if (row.alias && !aliases.includes(row.alias)) aliases.push(row.alias);
      await db
        .prepare('UPDATE identity_registry SET aliases = ?, last_seen = ? WHERE namespace = ? AND natural_key = ?')
        .bind(JSON.stringify(aliases), now, dataset, row.naturalKey)
        .run();
    } else {
      row.id = newId(prefix);
      await db
        .prepare('INSERT INTO identity_registry (namespace, natural_key, id, aliases, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(dataset, row.naturalKey, row.id, JSON.stringify(row.alias ? [row.alias] : []), now, now)
        .run();
    }
    row.data.identity_status = 'resolved';
  }
  return warnings;
}
