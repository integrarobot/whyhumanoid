#!/usr/bin/env node
// Validates a Components staging export against the data contract (server/src/components/contract.js,
// ops/components-data-contract.md). Private: prints counts and problems, never cell values beyond ids.
//
//   python3 -I tools/workbook-xlsx-to-json.py <staging.xlsx> <staging.json>
//   node tools/components-staging.mjs --from <staging.json> [--master <master export.json>]
//
// With --master, the Investment screen must cover every Investment row exactly once (key: ISIN, else TICKER:EXCHANGE),
// and each legacy_components_url must be the URL of a current Components row.
import { readFileSync } from 'node:fs';
import { validateStaging, publicProjection, CONTRACT_VERSION } from '../server/src/components/contract.js';

const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const from = arg('--from');
if (!from) { console.error('usage: node tools/components-staging.mjs --from <staging.json> [--master <master export.json>]'); process.exit(2); }
const tabs = JSON.parse(readFileSync(from, 'utf8'));
let investmentKeys = null;
let legacyUrls = null;
if (arg('--master')) {
  const master = JSON.parse(readFileSync(arg('--master'), 'utf8'));
  const inv = master.Investment ?? master.Stocks;
  const h = inv[0];
  const col = (r, name) => String(r[h.indexOf(name)] ?? '').trim();
  investmentKeys = inv.slice(1).filter((r) => r.some((v) => String(v ?? '').trim())).map((r) => col(r, 'ISIN') || `${col(r, 'TICKER')}:${col(r, 'EXCHANGE')}`);
  const comp = master.Components ?? master.Hardware;
  legacyUrls = new Set(comp.slice(1).map((r) => String(r[1] ?? '').trim()).filter(Boolean));
}
const { problems, counts, records } = validateStaging(tabs, { investmentKeys });
if (legacyUrls) for (const tab of ['cc_companies', 'cc_products']) for (const r of records[tab]) if (r.legacy_components_url && !legacyUrls.has(r.legacy_components_url)) problems.push(`${tab} row ${r._row}: legacy_components_url is not the URL of a current Components row`);
console.log(`Components staging, contract v${CONTRACT_VERSION}: ${JSON.stringify(counts)}`);
if (!problems.length) console.log(`Public projection would hold ${publicProjection(records).length} companies (allowlisted fields only).`);
if (problems.length) { console.error(`Components staging check FAILED (${problems.length}):\n- ${problems.slice(0, 60).join('\n- ')}`); process.exit(1); }
console.log('Components staging check passed.');
