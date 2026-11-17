#!/usr/bin/env node
// Private review of the global search tags (stdout only; never commit the output).
//
//   node --no-warnings tools/search-tags.mjs --from <export.json>
//
// Runs the backend import of a private export in memory, with the reviewed relations config, and prints: documents
// per scope, tag coverage per facet and category, and every sheet value the controlled vocabulary does not know
// (server/src/search/vocabulary.js). An unknown value gets no tag: add it to the vocabulary only if it is a real
// synonym of an existing term, with a reason in the PR; otherwise leave it untagged. The import log shows counts only.

import { readFileSync } from 'node:fs';
import { createTestDb } from '../server/test/helpers.js';
import { runImport } from '../server/src/import/run.js';
import { DATASETS } from '../server/src/datasets.js';
import { FACETS } from '../server/src/search/vocabulary.js';
import { relationsConfig } from './relations.mjs';

const from = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from') + 1] : null;
if (!from) { console.error('usage: node tools/search-tags.mjs --from <export.json>'); process.exit(2); }
const db = createTestDb();
const result = await runImport(db, JSON.parse(readFileSync(from, 'utf8')), Math.floor(Date.now() / 1000), { relationsConfig: relationsConfig() });
if (!result.ok) { console.error(`import failed: ${result.error}`); process.exit(1); }
console.log(`search documents: full ${result.search.full}, preview ${result.search.preview}; unknown values ${result.search.unmapped_values}`);
const { results } = await db.prepare("SELECT dataset, tags FROM search_docs WHERE scope = 'full'").all();
for (const [facet, label] of FACETS) {
  const per = new Map();
  for (const r of results) {
    const tags = r.tags.split('|').filter((t) => t.startsWith(`${facet}:`));
    if (!tags.length) continue;
    per.set(r.dataset, (per.get(r.dataset) ?? 0) + 1);
  }
  const values = new Map();
  for (const r of results) for (const t of r.tags.split('|')) if (t.startsWith(`${facet}:`)) values.set(t, (values.get(t) ?? 0) + 1);
  console.log(`\n${label}: ${[...per].map(([d, n]) => `${d} ${n}`).join(', ') || 'no records'}`);
  console.log(`  ${[...values].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t.split(':')[1]} ${n}`).join(', ')}`);
}
const untagged = DATASETS.map((d) => [d.id, results.filter((r) => r.dataset === d.id && r.tags === '||').length]).filter(([, n]) => n);
console.log(`\nrecords without any tag: ${untagged.map(([d, n]) => `${d} ${n}`).join(', ') || 'none'}`);
if (result.searchUnmapped.length) {
  console.log('\nvalues the vocabulary does not know (no tag given):');
  for (const [kind, value] of result.searchUnmapped) console.log(`  ${kind}: ${value}`);
}
