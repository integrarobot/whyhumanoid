// Scoped import (26 Nov 2026): re-import only the Deployments graph tabs (Deployments, Clean Entities, Evidence
// Relations) from the private workbook, writing only what changed, so a grouped Deployments review can be published
// within the D1 daily write allowance (100,000 rows on the free plan) where a full import (about 32,000 rows written,
// because every tab and the whole search index are deleted and rewritten) would not fit. Since 26 Nov 2026 the Investment
// tab (stocks) can be scoped too, alone: its rows and their search documents only, with the relation graphs, the public
// projection and the company dossiers left untouched, because none of them reads it.
//
// Same rules as the full import (server/src/import/run.js): the same normalisation and validation per tab, the same
// relation graphs (rebuilt from the imported Deployments and Clean Entities rows, the other one read from D1 when it is
// not in scope), the same public projection and the same search documents; all in one transaction, so a failure
// changes nothing. Other tabs are not read and not touched.
//
// dry_run: normalises and compares with what D1 holds, writes nothing (not even an import_runs row), and returns the
// changes and an estimate of the rows D1 would write, for checking against the day's remaining allowance first.

import { DATASETS_BY_ID, tabValues } from '../datasets.js';
import { newId } from '../crypto.js';
import { ImportError, normalizeTab } from './normalize.js';
import { loadConfig, relationStatements, validConfig } from '../relations/store.js';
import { companyDocs, humanoidAliases, searchDoc } from '../search/index.js';
import { resolveIdentities } from './identity.js';
import { publicProjection } from '../public/projection.js';

// Tabs a scoped import may replace: the inputs of the Deployments relation graph and its evidence links, and (26 Nov
// 2026) the Investment tab of listed companies and the Humanoids catalogue, free tabs no graph or projection reads.
// Since 27 Nov 2026 also the Integrators catalogue: a free tab that no relation graph, public projection or company
// dossier reads either, so only its rows and its own search documents change.
export const GRAPH_DATASETS = ['deployments', 'entities', 'evidence-links'];
export const SCOPED_DATASETS = [...GRAPH_DATASETS, 'stocks', 'humanoids', 'integrators'];

// Rows D1 writes per statement, counting the table and each index (premium_rows: primary key and two indexes;
// search_docs and relation_graphs: primary key). snapshot_id is in no index (premium_rows_order is dataset and
// position, premium_rows_preview dataset and preview_rank), so a snapshot-only update writes the row alone. An upper
// estimate, for planning only; D1 reports the real figure.
// identity_registry: primary key and the unique id index; an update changes neither.
const WRITES = { rowInsert: 4, rowDelete: 4, rowUpdate: 4, rowSnapshot: 1, docUpsert: 4, docDelete: 2, graph: 4, config: 2, run: 2, identityInsert: 3, identityUpdate: 1 };

const same = (a, b) => a.position === b.position && a.sheet_row === b.sheet_row && a.preview_rank === b.preview_rank
  && a.visibility === b.visibility && a.data === b.data && a.preview_data === b.preview_data;
const DOC_FIELDS = ['position', 'title', 'subtitle', 'names', 'haystack', 'tags', 'link'];

export async function runScopedImport(db, valuesByTab, now, { datasets, relationsConfig = null, dryRun = false } = {}) {
  const ids = [...new Set(datasets ?? [])];
  if (!ids.length || ids.some((id) => !SCOPED_DATASETS.includes(id))) {
    return { ok: false, error: 'invalid_scope', allowed: SCOPED_DATASETS };
  }
  const snapshotId = new Date(now * 1000).toISOString();
  const runId = newId('imp');
  const fail = async (error) => {
    if (!dryRun) {
      await db.prepare('INSERT INTO import_runs (id, started_at, finished_at, status, error) VALUES (?, ?, ?, ?, ?)')
        .bind(runId, now, now, 'failed', `scoped ${ids.join(',')}: ${error}`).run();
    }
    return { ok: false, runId: dryRun ? null : runId, error };
  };

  // 1. Normalise only the tabs in scope, with the full import's rules. Any problem stops here.
  const imported = new Map();
  const warnings = [];
  const review = [];
  const identityStatements = [];
  // identity_registry rows a commit would insert (new identity) or update (aliases, last seen).
  const planned = { inserted: 0, updated: 0 };
  try {
    for (const id of ids) {
      const spec = DATASETS_BY_ID.get(id);
      const values = tabValues(valuesByTab, spec);
      if (!values) throw new ImportError(`${spec.tab}: tab missing from the workbook read`);
      const result = normalizeTab(spec, values);
      // Tabs without an id column (Humanoids) take their persistent ids from identity_registry, exactly as in the full
      // import. The registry writes are planned here and committed with the rows; a dry run plans and never writes them.
      if (!spec.idFields) {
        const identities = await resolveIdentities(db, id, spec.idPrefix, result.rows, now);
        warnings.push(...identities.warnings);
        identityStatements.push(...identities.statements);
        planned.inserted += identities.inserted;
        planned.updated += identities.updated;
      }
      imported.set(id, { spec, rows: result.rows });
      warnings.push(...result.warnings);
      review.push(...result.review.map((r) => ({ dataset: id, ...r })));
    }
  } catch (error) {
    if (error instanceof ImportError) return fail(error.message);
    throw error;
  }

  // 2. What D1 holds now for those tabs, and the changes row by row.
  const stored = async (id) => new Map(((await db.prepare('SELECT row_id, position, sheet_row, preview_rank, visibility, data, preview_data FROM premium_rows WHERE dataset = ?').bind(id).all()).results ?? []).map((r) => [r.row_id, r]));
  const statements = [...identityStatements];
  const changes = {};
  let writes = planned.inserted * WRITES.identityInsert + planned.updated * WRITES.identityUpdate;
  for (const [id, { rows }] of imported) {
    const before = await stored(id);
    const seen = new Set();
    const c = { added: 0, changed: 0, removed: 0, unchanged: 0 };
    for (const row of rows) {
      seen.add(row.id);
      const next = { position: row.position, sheet_row: row.sheetRow, preview_rank: row.previewRank ?? null, visibility: row.visibility, data: JSON.stringify(row.data), preview_data: row.previewData ? JSON.stringify(row.previewData) : null };
      const prev = before.get(row.id);
      if (prev && same(prev, next)) { c.unchanged += 1; continue; }
      if (prev) {
        c.changed += 1;
        writes += WRITES.rowUpdate;
        statements.push(db.prepare('UPDATE premium_rows SET position = ?, sheet_row = ?, preview_rank = ?, visibility = ?, data = ?, preview_data = ?, snapshot_id = ? WHERE dataset = ? AND row_id = ?')
          .bind(next.position, next.sheet_row, next.preview_rank, next.visibility, next.data, next.preview_data, snapshotId, id, row.id));
      } else {
        c.added += 1;
        writes += WRITES.rowInsert;
        statements.push(db.prepare('INSERT INTO premium_rows (dataset, row_id, position, sheet_row, preview_rank, visibility, data, preview_data, snapshot_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, row.id, next.position, next.sheet_row, next.preview_rank, next.visibility, next.data, next.preview_data, snapshotId));
      }
    }
    for (const rowId of before.keys()) {
      if (seen.has(rowId)) continue;
      c.removed += 1;
      writes += WRITES.rowDelete;
      statements.push(db.prepare('DELETE FROM premium_rows WHERE dataset = ? AND row_id = ?').bind(id, rowId));
    }
    // Every row of the tab then carries this snapshot, as after a full import (the API reports it per tab).
    writes += c.unchanged * WRITES.rowSnapshot;
    statements.push(db.prepare('UPDATE premium_rows SET snapshot_id = ? WHERE dataset = ? AND snapshot_id <> ?').bind(snapshotId, id, snapshotId));
    changes[id] = c;
  }

  // 3. Rows per scope, as the full import sees them: imported rows for the tabs in scope, D1 for the other inputs.
  const fromDb = new Map();
  const dbRows = async (id) => {
    if (!fromDb.has(id)) {
      const res = await db.prepare("SELECT row_id, position, data, preview_data FROM premium_rows WHERE dataset = ? AND visibility = 'customer' ORDER BY position").bind(id).all();
      fromDb.set(id, (res.results ?? []).map((r) => ({ id: r.row_id, position: r.position, data: JSON.parse(r.data), previewData: r.preview_data ? JSON.parse(r.preview_data) : null })));
    }
    return fromDb.get(id);
  };
  const scopedRows = async (id, scope) => {
    const spec = DATASETS_BY_ID.get(id);
    const rows = imported.has(id) ? imported.get(id).rows.filter((r) => r.visibility === 'customer') : await dbRows(id);
    return rows
      .filter((r) => scope === 'full' || spec.access === 'free' || Boolean(r.previewData))
      .map((r) => ({ id: r.id, position: r.position, data: scope === 'full' ? r.data : (r.previewData ?? r.data) }));
  };
  // The relation graph, the public projection and the company dossiers depend on the Deployments graph tabs only: they
  // are rebuilt when one of those is in scope and left exactly as they are otherwise (a stocks-only import).
  const graphInScope = ids.some((id) => GRAPH_DATASETS.includes(id));
  const cache = {};
  for (const id of [...(graphInScope ? ['deployments', 'entities'] : []), ...ids]) for (const scope of ['full', 'preview']) cache[`${id}|${scope}`] ??= await scopedRows(id, scope);
  const rowsOf = (id, scope) => cache[`${id}|${scope}`].map((r) => r.data);

  // 4. Relation graphs and the public projection, rebuilt as in the full import.
  const relations = graphInScope ? await relationStatements(db, { config: relationsConfig, rowsOf, snapshotId, now }) : { report: null, statements: [], graphs: null };
  if (graphInScope) {
    if (!relations.report.ok && relations.report.error === 'invalid_relations_config') return fail('invalid_relations_config');
    if (!relations.report.ok) warnings.push(`relations: ${relations.report.error}`);
    writes += relations.statements.length === 3 ? WRITES.config + 2 * WRITES.graph : relations.statements.length * WRITES.graph;
    statements.push(...relations.statements);
  }
  const projection = relations.graphs?.full ? publicProjection({ graph: relations.graphs.full, rows: rowsOf('deployments', 'full'), entities: rowsOf('entities', 'full') }) : null;

  // 5. Search documents of the tabs in scope and of the company dossiers: upsert what differs, delete what is gone.
  // Humanoids documents carry the aliases of the reviewed relations config, as in the full import: the config this
  // import sent (the one a full import would use), else the one stored by the last import.
  const aliasConfig = ids.includes('humanoids') ? (validConfig(relationsConfig) ? relationsConfig : (await loadConfig(db))?.config ?? null) : null;
  const humanoidExtra = humanoidAliases(aliasConfig);
  const docSets = [...(graphInScope ? ['companies'] : []), ...ids];
  const docs = { full: [], preview: [] };
  const unmapped = [];
  for (const scope of ['full', 'preview']) {
    if (projection) docs[scope].push(...companyDocs(projection, scope));
    for (const id of ids) for (const row of cache[`${id}|${scope}`]) docs[scope].push(searchDoc(id, row, id === 'humanoids' ? humanoidExtra(row.data) : {}, scope === 'full' ? unmapped : []));
  }
  const placeholders = docSets.map(() => '?').join(', ');
  const before = new Map(((await db.prepare(`SELECT scope, dataset, row_id, ${DOC_FIELDS.join(', ')} FROM search_docs WHERE dataset IN (${placeholders})`).bind(...docSets).all()).results ?? [])
    .map((d) => [`${d.scope}|${d.dataset}|${d.row_id}`, d]));
  const search = { upserted: 0, deleted: 0, unchanged: 0 };
  const keep = new Set();
  for (const scope of ['full', 'preview']) {
    for (const d of docs[scope]) {
      const key = `${scope}|${d.dataset}|${d.row_id}`;
      keep.add(key);
      const prev = before.get(key);
      if (prev && DOC_FIELDS.every((f) => String(prev[f]) === String(d[f]))) { search.unchanged += 1; continue; }
      search.upserted += 1;
      writes += WRITES.docUpsert;
      statements.push(db.prepare('INSERT OR REPLACE INTO search_docs (scope, dataset, row_id, position, title, subtitle, names, haystack, tags, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(scope, d.dataset, d.row_id, d.position, d.title, d.subtitle, d.names, d.haystack, d.tags, d.link));
    }
  }
  // Company dossiers are only rebuilt when the graph is; without one, their documents stay as they are.
  for (const [key, d] of before) {
    if (keep.has(key) || (d.dataset === 'companies' && !projection)) continue;
    search.deleted += 1;
    writes += WRITES.docDelete;
    statements.push(db.prepare('DELETE FROM search_docs WHERE scope = ? AND dataset = ? AND row_id = ?').bind(d.scope, d.dataset, d.row_id));
  }

  writes += WRITES.run;
  const report = { scope: ids, changes, identities: planned, search, relations: relations.report, estimated_rows_written: writes, statements: statements.length + 2 };
  if (dryRun) return { ok: true, dryRun: true, snapshotId, ...report, warnings, review };

  const counts = Object.fromEntries([...imported].map(([id, { rows }]) => [id, rows.filter((r) => r.visibility === 'customer').length]));
  await db.batch([
    db.prepare('INSERT INTO import_runs (id, started_at, status) VALUES (?, ?, ?)').bind(runId, now, 'running'),
    ...statements,
    db.prepare('UPDATE import_runs SET finished_at = ?, status = ?, counts = ?, warnings = ? WHERE id = ?')
      .bind(now, 'succeeded', JSON.stringify({ scoped: ids, ...counts, changes, relations: relations.report?.coverage ?? null, search }), JSON.stringify({ warnings, review }), runId),
  ]);
  return { ok: true, runId, snapshotId, counts, ...report, warnings, review, searchUnmapped: unmapped };
}
