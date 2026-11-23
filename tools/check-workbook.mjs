#!/usr/bin/env node
// Import compatibility check against the CURRENT master workbook (23 Nov 2026). Private: run on an export kept
// outside Git; prints counts and field names only, never cell values.
//
//   node --no-warnings tools/check-workbook.mjs --from <export.json>
//
// 1. The live import asks Google Sheets for exactly the tab titles in server/src/datasets.js (batchGet ranges); former
//    titles are aliases for old exports only. So every current title must exist in the export, under that title.
// 2. Each tab's header row matches what the importer expects.
// 3. The whole import runs in memory on those tabs only (what the Worker would receive): row counts per dataset,
//    identities left unresolved, relations coverage with the reviewed config of this commit, search document counts.
// 4. Untranslated text: public fields whose values still look Spanish, per tab, for the content workflow (all site text
//    is English). A heuristic: it flags, it does not decide.
// Exit 1 on a missing tab, header drift or a failed import.

import { readFileSync } from 'node:fs';

const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const from = arg('--from');
if (!from) { console.error('usage: node --no-warnings tools/check-workbook.mjs --from <export.json>'); process.exit(2); }

const { DATASETS } = await import('../server/src/datasets.js');
const { normalizeTab } = await import('../server/src/import/normalize.js');
const { runImport } = await import('../server/src/import/run.js');
const { createTestDb } = await import('../server/test/helpers.js');
const { relationsConfig } = await import('./relations.mjs');

const exported = JSON.parse(readFileSync(from, 'utf8'));
const problems = [];
const requested = DATASETS.map((d) => d.tab);
const live = {};
for (const spec of DATASETS) {
  if (!exported[spec.tab]) {
    const former = (spec.formerTabs ?? []).find((t) => exported[t]);
    problems.push(`tab "${spec.tab}" (${spec.id}) is not in the workbook${former ? `; it still has the former title "${former}", which the live import would not request` : ''}`);
    continue;
  }
  live[spec.tab] = exported[spec.tab];
  try { normalizeTab(spec, exported[spec.tab]); } catch (e) { problems.push(`${spec.id}: ${e.message.replace(/got \[.*$/, '(header row differs)')}`); }
}
const extra = Object.keys(exported).filter((t) => !requested.includes(t));
console.log(`Requested by the live import (batchGet): ${requested.map((t) => `"${t}"`).join(', ')}`);
if (extra.length) console.log(`Tabs in the workbook the import does not read: ${extra.map((t) => `"${t}"`).join(', ')}`);

let result = null;
if (!problems.length) {
  const db = createTestDb();
  result = await runImport(db, live, Math.floor(Date.now() / 1000), { relationsConfig: relationsConfig() });
  if (!result.ok) problems.push(`import failed: ${result.error}`);
  else {
    const unresolved = await db.prepare("SELECT dataset, COUNT(*) AS n FROM premium_rows WHERE json_extract(data, '$.identity_status') = 'unresolved' GROUP BY dataset").all();
    console.log('Rows imported per dataset:', JSON.stringify(result.counts));
    console.log('Identities left unresolved:', JSON.stringify(Object.fromEntries((unresolved.results ?? []).map((r) => [r.dataset, r.n]))));
    console.log('Relations:', JSON.stringify({ ok: result.relations?.ok, error: result.relations?.error, config_version: result.relations?.config_version, coverage: result.relations?.coverage?.full ?? result.relations?.coverage }));
    console.log('Search documents:', JSON.stringify(result.search));
    console.log(`Import warnings: ${result.warnings?.length ?? 0}`);
  }
}

// Untranslated public text, by tab and field (counts only).
const ES = /[áéíóúñ¿¡]|\b(y|de|del|los|las|para|con|una|el|la|que|por|sus|desarrolla|fabricante|empresa)\b/i;
const flagged = [];
for (const spec of DATASETS) {
  const rows = exported[spec.tab];
  if (!rows) continue;
  const header = rows[0] ?? [];
  const counts = {};
  for (const r of rows.slice(1)) r.forEach((v, i) => { if (typeof v === 'string' && !/^https?:/.test(v) && v.length > 12 && ES.test(v)) counts[header[i] || `column ${i + 1}`] = (counts[header[i] || `column ${i + 1}`] ?? 0) + 1; });
  const big = Object.entries(counts).filter(([, n]) => n >= 3);
  if (big.length) flagged.push(`${spec.tab}: ${big.map(([f, n]) => `${f} ${n}`).join(', ')}`);
}
console.log(`Fields that still look Spanish (content workflow): ${flagged.length ? `\n  ${flagged.join('\n  ')}` : 'none'}`);

if (problems.length) {
  console.error(`Workbook compatibility FAILED:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('Workbook compatibility passed: every current tab title, header row and the full import.');
