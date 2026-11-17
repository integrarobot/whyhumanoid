// Relation graphs in D1: built at import time, in the same transaction as the rows, from the imported rows and the
// reviewed config (tools/relations-aliases.json plus the public robot index) that the import workflow sends.

import { buildGraph, compileConfig } from './graph.js';
import { sha256Hex } from '../crypto.js';

const MAX_CONFIG_BYTES = 512_000;

// A config is { aliases: { makers, robots }, catalogue: [{ id, Lab, Robot, lab, robot, slug }] }.
export function validConfig(config) {
  if (!config || typeof config !== 'object') return false;
  const { aliases, catalogue } = config;
  if (!aliases || typeof aliases !== 'object' || !Array.isArray(catalogue) || !catalogue.length) return false;
  return catalogue.every((r) => Number.isInteger(r.id) && typeof r.Lab === 'string' && typeof r.slug === 'string');
}

export async function loadConfig(db) {
  const row = await db.prepare('SELECT data, version FROM relation_config WHERE id = 1').first();
  return row ? { config: JSON.parse(row.data), version: row.version } : null;
}

// rowsOf(datasetId, scope) returns the imported rows of a tab ('full': every customer row with full values;
// 'preview': the public rows with public values). Returns the statements to commit and a report with counts only.
export async function relationStatements(db, { config, rowsOf, snapshotId, now }) {
  let stored = null;
  const statements = [];
  if (config) {
    const text = JSON.stringify(config);
    if (!validConfig(config) || text.length > MAX_CONFIG_BYTES) return { statements, report: { ok: false, error: 'invalid_relations_config' } };
    const version = (await sha256Hex(text)).slice(0, 16);
    stored = { config, version };
    statements.push(
      db
        .prepare('INSERT INTO relation_config (id, data, version, received_at) VALUES (1, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET data = excluded.data, version = excluded.version, received_at = excluded.received_at')
        .bind(text, version, now),
    );
  } else {
    stored = await loadConfig(db);
  }
  if (!stored) return { statements, report: { ok: false, error: 'relations_not_configured' }, config: null };
  const compiled = compileConfig(stored.config);
  const coverage = {};
  const graphs = {};
  for (const scope of ['full', 'preview']) {
    const { graph } = buildGraph(compiled, { rows: rowsOf('deployments', scope), entities: rowsOf('entities', scope), scope, snapshot: snapshotId });
    coverage[scope] = graph.coverage;
    graphs[scope] = graph;
    statements.push(
      db
        .prepare('INSERT INTO relation_graphs (scope, snapshot_id, data, coverage, config_version, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (scope) DO UPDATE SET snapshot_id = excluded.snapshot_id, data = excluded.data, coverage = excluded.coverage, config_version = excluded.config_version, created_at = excluded.created_at')
        .bind(scope, snapshotId, JSON.stringify(graph), JSON.stringify(graph.coverage), stored.version, now),
    );
  }
  return { statements, report: { ok: true, config_version: stored.version, config_problems: compiled.problems.length, coverage: coverage.full }, config: stored.config, graphs };
}

export async function readGraph(db, scope) {
  const row = await db.prepare('SELECT data FROM relation_graphs WHERE scope = ?').bind(scope).first();
  return row ? row.data : null;
}
