-- Global search across the 13 categories (server/src/search/). Rebuilt by every import, in the same transaction as
-- the rows. scope 'preview' holds only the public rows with their public values (the whole free Humanoids catalogue
-- and the first 10 sheet rows of each other tab); scope 'full' holds every customer row and is searched only after
-- the server has checked an active subscription. Tags come from the controlled vocabulary in vocabulary.js.
CREATE TABLE IF NOT EXISTS search_docs (
  scope TEXT NOT NULL CHECK (scope IN ('full', 'preview')),
  dataset TEXT NOT NULL,
  row_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  names TEXT NOT NULL,
  haystack TEXT NOT NULL,
  tags TEXT NOT NULL,
  link TEXT NOT NULL,
  PRIMARY KEY (scope, dataset, row_id)
);
