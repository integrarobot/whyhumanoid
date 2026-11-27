// All-or-nothing import of the thirteen workbook tabs into the private store.
// If any tab fails validation nothing is replaced and the previous snapshot keeps serving.
// The relation graphs (Deployments, robots, companies) are rebuilt in the same transaction, from the imported rows and
// the reviewed relations config sent with the import (or the last one received), and so is the search index (public
// scope from the public rows and values only, full scope from every customer row).

import { DATASETS, publicRowLimit, tabValues } from '../datasets.js';
import { newId } from '../crypto.js';
import { ImportError, normalizeTab } from './normalize.js';
import { resolveIdentities } from './identity.js';
import { relationStatements } from '../relations/store.js';
import { searchStatements } from '../search/index.js';
import { publicProjection } from '../public/projection.js';
import { atlasProblems } from '../benchmarks/atlas.js';
import { atlasProblems as dataAtlasProblems } from '../data-atlas/atlas.js';
import { componentProblems } from '../components/catalogue.js';
import { ledgerFromWorkbook } from '../verification/standard.js';

export async function runImport(db, valuesByTab, now, { relationsConfig = null } = {}) {
  const runId = newId('imp');
  const snapshotId = new Date(now * 1000).toISOString();
  await db.prepare('INSERT INTO import_runs (id, started_at, status) VALUES (?, ?, ?)').bind(runId, now, 'running').run();

  const normalised = [];
  const warnings = [];
  const review = [];
  const reconciliation = {};
  try {
    // Optional additive verification tabs are a separate append-only ledger. Validate them if present, without
    // converting them into replace-on-import premium rows or changing the existing catalogue access matrix.
    try { ledgerFromWorkbook(valuesByTab); } catch (error) { throw new ImportError(error.message); }
    for (const spec of DATASETS) {
      const result = normalizeTab(spec, tabValues(valuesByTab, spec));
      normalised.push({ spec, rows: result.rows });
      warnings.push(...result.warnings);
      review.push(...result.review.map((r) => ({ dataset: spec.id, ...r })));
      if (result.reconciliation) reconciliation[spec.id] = result.reconciliation;
    }
    // Robotics Evaluation Atlas: the catalogue and its results are validated together (ids, foreign keys, numbers,
    // native scales, comparability groups, reviewed vocabulary). Any problem stops the import, like header drift.
    const rowsOf = (id) => normalised.find((n) => n.spec.id === id)?.rows.filter((r) => r.visibility === 'customer').map((r) => r.data);
    const first = (problems) => `${problems.slice(0, 5).join('; ')}${problems.length > 5 ? ` (and ${problems.length - 5} more)` : ''}`;
    const catalogue = rowsOf('benchmarks');
    const datasets = rowsOf('datasets');
    if (catalogue) {
      // Datasets links are checked both ways (DATASET_ID and RELATED_BENCHMARK_IDS against RELATED_DATASET_IDS).
      const problems = atlasProblems(catalogue, rowsOf('benchmark-results') ?? [], datasets ?? null);
      if (problems.length) throw new ImportError(`Benchmarks: ${first(problems)}`);
    }
    // Components: product ids, the reviewed group vocabulary, software kept out of the product table, sources.
    const products = rowsOf('hardware');
    if (products) {
      const problems = componentProblems(products, rowsOf('component-software') ?? []);
      if (problems.length) throw new ImportError(`Components: ${first(problems)}`);
    }
    // Robot Learning Data Atlas: the Datasets catalogue and Dataset Metrics, validated together the same way.
    if (datasets) {
      const problems = dataAtlasProblems(datasets, rowsOf('dataset-metrics') ?? [], { benchmarkIds: catalogue?.map((b) => b.benchmark_id) ?? null });
      if (problems.length) throw new ImportError(`Datasets: ${first(problems)}`);
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
  // Relations: full scope from every customer row; preview scope from the public rows and values only.
  const byId = new Map(normalised.map(({ spec, rows }) => [spec.id, { spec, rows }]));
  // Public scope: a free tab's rows with their public values; a subscription tab's rows only through their stored public
  // values (fields.js), never their full values.
  const isPublic = (spec, r) => spec.access === 'free' || Boolean(r.previewData);
  const rowsOf = (id, scope) => {
    const { spec, rows } = byId.get(id);
    return rows
      .filter((r) => r.visibility === 'customer' && (scope === 'full' || isPublic(spec, r)))
      .map((r) => (scope === 'full' ? r.data : (r.previewData ?? r.data)));
  };
  const relations = await relationStatements(db, { config: relationsConfig, rowsOf, snapshotId, now });
  if (!relations.report.ok && relations.report.error === 'invalid_relations_config') {
    await db
      .prepare('UPDATE import_runs SET finished_at = ?, status = ?, error = ? WHERE id = ?')
      .bind(now, 'failed', 'invalid_relations_config', runId)
      .run();
    return { ok: false, runId, error: 'invalid_relations_config' };
  }
  if (!relations.report.ok) warnings.push(`relations: ${relations.report.error}`);
  else if (relations.report.config_problems) warnings.push(`relations: ${relations.report.config_problems} config problems (run node tools/relations.mjs --check)`);
  statements.push(...relations.statements);

  const searchRowsOf = (id, scope) => {
    const { spec, rows } = byId.get(id);
    return rows
      .filter((r) => r.visibility === 'customer' && (scope === 'full' || isPublic(spec, r)))
      .map((r) => ({ id: r.id, position: r.position, data: scope === 'full' ? r.data : (r.previewData ?? r.data) }));
  };
  // Public projection (approved split, phase 1): company dossiers built from every row through an allowlist.
  const projection = relations.graphs?.full ? publicProjection({ graph: relations.graphs.full, rows: rowsOf('deployments', 'full'), entities: rowsOf('entities', 'full') }) : null;
  const search = searchStatements(db, { rowsOf: searchRowsOf, config: relations.config ?? null, projection });
  statements.push(...search.statements);

  statements.push(
    db
      .prepare('UPDATE import_runs SET finished_at = ?, status = ?, counts = ?, warnings = ? WHERE id = ?')
      .bind(now, 'succeeded', JSON.stringify({ ...counts, relations: relations.report.coverage ?? null, search: search.report }), JSON.stringify({ warnings, review }), runId),
  );
  await db.batch(statements);
  return { ok: true, runId, snapshotId, counts, warnings, review, reconciliation, relations: relations.report, search: search.report, searchUnmapped: search.unmapped };
}
