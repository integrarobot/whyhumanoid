// Rebuild the SEC revenue source packet for tools/export-fundamentals.mjs (manual command, no schedule).
//   node tools/fetch-sec-revenue.mjs --out <packet.json> [--since 2023-01-01]
// Reads data.sec.gov company facts for each registrant in tools/sec-registrants.json, one request at a time, at most
// five a second (SEC fair access allows ten), with an identifying User-Agent and no personal data. Keeps only annual
// facts (350 to 380 days, 10-K, 20-F, 40-F and amendments) of the standard total-revenue concepts; never
// SalesRevenueGoodsNet or other partial concepts. Records each source URL and the SHA-256 of the original file. The
// packet stays outside Git; run export-fundamentals.mjs on it and review the changes before publishing.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const USER_AGENT = 'WhyHumanoid public research https://whyhumanoid.com';
export const CONCEPTS = [
  ['us-gaap', 'Revenues'],
  ['us-gaap', 'RevenueFromContractWithCustomerExcludingAssessedTax'],
  ['us-gaap', 'RevenueFromContractWithCustomerIncludingAssessedTax'],
  ['ifrs-full', 'Revenue'],
  ['ifrs-full', 'RevenueFromContractsWithCustomers'],
];
const ANNUAL = new Set(['10-K', '10-K/A', '20-F', '20-F/A', '40-F', '40-F/A']);
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
const keep = (f, since) => ANNUAL.has(f.form) && f.start && f.end >= since && days(f.start, f.end) >= 350 && days(f.start, f.end) <= 380;
const pad = (cik) => String(cik).padStart(10, '0');

// The annual revenue facts of one companyfacts document (as parsed JSON), in the packet's shape.
export function extract(facts, since) {
  const out = [];
  for (const [ns, name] of CONCEPTS) {
    const units = facts?.facts?.[ns]?.[name]?.units;
    if (!units) continue;
    const kept = {};
    for (const [unit, list] of Object.entries(units)) {
      const a = list.filter((f) => keep(f, since)).map(({ start, end, val, accn, fy, fp, form, filed, frame }) => ({ start, end, val, accn, fy, fp, form, filed, ...(frame ? { frame } : {}) }));
      if (a.length) kept[unit] = a;
    }
    if (Object.keys(kept).length) out.push({ namespace: ns, concept: name, units: kept });
  }
  return out;
}

export async function buildPacket(registrants, { fetchImpl = fetch, since = '2023-01-01', today = new Date().toISOString().slice(0, 10), pause = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const companies = [];
  const failures = [];
  for (const r of registrants) {
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${pad(r.cik)}.json`;
    const res = await fetchImpl(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' } });
    if (res.status !== 200) { failures.push(`${r.key}: HTTP ${res.status}`); await pause(200); continue; }
    const raw = Buffer.from(await res.arrayBuffer());
    companies.push({
      key: r.key, name: r.name, cik: r.cik, secName: r.sec_name, identity_review: r.identity_review,
      source_url: url, retrieved_at: today, raw_sha256: createHash('sha256').update(raw).digest('hex'),
      concepts: extract(JSON.parse(raw.toString('utf8')), since),
    });
    await pause(200); // five requests a second at most
  }
  return {
    packet: {
      as_of: today,
      purpose: 'Research input: annual revenue facts only, not a computed financial snapshot. Select comparable consolidated total revenue and audit tags/periods before publishing; no exchange quotes included. Historical facts may be repeated or restated across filings. Prefer current and prior periods from the same filing where available. No sums across overlapping revenue concepts.',
      companies,
    },
    failures,
  };
}

// Run as a command: compare file paths, not URL paths (a URL escapes spaces and '?', a command-line path does not).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
  const out = arg('--out');
  if (!out) { console.error('usage: node tools/fetch-sec-revenue.mjs --out <packet.json> [--since 2023-01-01]'); process.exit(2); }
  const { registrants } = JSON.parse(readFileSync(new URL('./sec-registrants.json', import.meta.url), 'utf8'));
  const { packet, failures } = await buildPacket(registrants, { since: arg('--since') ?? '2023-01-01' });
  writeFileSync(out, `${JSON.stringify(packet, null, 1)}\n`);
  console.log(`${packet.companies.length} of ${registrants.length} registrants read; ${failures.length} failed${failures.length ? `: ${failures.join('; ')}` : ''}. Next: node tools/export-fundamentals.mjs --from ${out} --issuers <issuer packet>`);
  if (failures.length) process.exit(1);
}
