// All-or-nothing import of the thirteen workbook tabs into the private store.
// If any tab fails validation nothing is replaced and the previous snapshot keeps serving.

import { DATASETS } from '../datasets.js';
import { newId } from '../crypto.js';
import { ImportError, normalizeTab } from './normalize.js';
import { resolveIdentities } from './identity.js';

export async function runImport(db, valuesByTab, now) {
  const runId = newId('imp');
  const snapshotId = new Date(now * 1000).toISOString();
  await db.prepare('INSERT INTO import_runs (id, started_at, status) VALUES (?, ?, ?)').bind(runId, now, 'running').run();

  const normalised = [];
  const warnings = [];
  const review = [];
  try {
    for (const spec of DATASETS) {
      const result = normalizeTab(spec, valuesByTab[spec.tab]);
      normalised.push({ spec, rows: result.rows });
      warnings.push(...result.warnings);
      review.push(...result.review.map((r) => ({ dataset: spec.id, ...r })));
    }
  } catch (error) {
    await db
      .prepare('UPDATE import_runs SET finished_at = ?, status = ?, error = ? WHERE id = ?')
      .bind(now, 'failed', String(error.message ?? error), runId)
      .run();
    if (error instanceof ImportError) return { ok: false, runId, error: error.message };
    throw error;
  }

  // Identity registrations commit in the same transaction as the rows: a failed import registers nothing.
  const statements = [];
  for (const { spec, rows } of normalised) {
    if (spec.idFields) continue;
    const identities = await resolveIdentities(db, spec.id, spec.idPrefix, rows, now);
    warnings.push(...identities.warnings);
    statements.push(...identities.statements);
  }

  const counts = {};
  for (const { spec, rows } of normalised) {
    counts[spec.id] = rows.filter((r) => r.visibility === 'customer').length;
    if (rows.some((r) => r.visibility === 'internal')) counts[`${spec.id}_internal`] = rows.filter((r) => r.visibility === 'internal').length;
    statements.push(db.prepare('DELETE FROM premium_rows WHERE dataset = ?').bind(spec.id));
    for (const row of rows) {
      statements.push(
        db
          .prepare(
            'INSERT INTO premium_rows (dataset, row_id, position, sheet_row, preview_rank, visibility, data, preview_data, snapshot_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            spec.id,
            row.id,
            row.position,
            row.sheetRow,
            row.previewRank,
            row.visibility,
            JSON.stringify(row.data),
            row.previewData ? JSON.stringify(row.previewData) : null,
            snapshotId,
          ),
      );
    }
  }
  statements.push(
    db
      .prepare('UPDATE import_runs SET finished_at = ?, status = ?, counts = ?, warnings = ? WHERE id = ?')
      .bind(now, 'succeeded', JSON.stringify(counts), JSON.stringify({ warnings, review }), runId),
  );
  await db.batch(statements);
  return { ok: true, runId, snapshotId, counts, warnings, review };
}
