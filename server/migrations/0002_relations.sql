-- Relations between Deployments records, catalogue robots and companies (server/src/relations/graph.js).
-- Rebuilt by every import from the imported rows and the reviewed config the import workflow sends.
-- scope 'full' is served only after the entitlement check; scope 'preview' uses only the public preview rows.
CREATE TABLE IF NOT EXISTS relation_graphs (
  scope TEXT PRIMARY KEY CHECK (scope IN ('full', 'preview')),
  snapshot_id TEXT NOT NULL,
  data TEXT NOT NULL,
  coverage TEXT NOT NULL,
  config_version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- The last reviewed relations config received from the import workflow (aliases and public robot index).
CREATE TABLE IF NOT EXISTS relation_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  version TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
