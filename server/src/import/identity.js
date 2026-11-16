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

// One read per tab; the registry writes are returned as prepared statements so the caller can commit them in the
// same transaction as the rows. A Worker invocation allows about 1,000 D1 calls, so nothing here may scale with
// the number of rows (the first live import stopped at 499 identities when it made two calls per row).
export async function resolveIdentities(db, dataset, prefix, rows, now) {
  const warnings = [];
  const statements = [];
  const keysInTab = new Map();
  for (const row of rows) if (row.naturalKey) keysInTab.set(row.naturalKey, (keysInTab.get(row.naturalKey) ?? 0) + 1);

  const { results } = await db
    .prepare('SELECT natural_key, id, aliases FROM identity_registry WHERE namespace = ?')
    .bind(dataset)
    .all();
  const known = new Map(results.map((r) => [r.natural_key, r]));

  for (const row of rows) {
    if (row.id) continue;
    if (!row.naturalKey || keysInTab.get(row.naturalKey) > 1) {
      row.id = `pending_${dataset}_r${row.sheetRow}${row.data.list ? `_${row.data.list}` : ''}`;
      row.data.identity_status = 'unresolved';
      warnings.push(`${dataset} sheet row ${row.sheetRow}: ${row.naturalKey ? `natural key "${row.naturalKey}" repeats` : 'no natural key'}; served with unstable id ${row.id}`);
      continue;
    }
    const existing = known.get(row.naturalKey);
    if (existing) {
      row.id = existing.id;
      const aliases = JSON.parse(existing.aliases);
      if (row.alias && !aliases.includes(row.alias)) aliases.push(row.alias);
      statements.push(
        db
          .prepare('UPDATE identity_registry SET aliases = ?, last_seen = ? WHERE namespace = ? AND natural_key = ?')
          .bind(JSON.stringify(aliases), now, dataset, row.naturalKey),
      );
    } else {
      row.id = newId(prefix);
      statements.push(
        db
          .prepare('INSERT INTO identity_registry (namespace, natural_key, id, aliases, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(dataset, row.naturalKey, row.id, JSON.stringify(row.alias ? [row.alias] : []), now, now),
      );
    }
    row.data.identity_status = 'resolved';
  }
  return { warnings, statements };
}
