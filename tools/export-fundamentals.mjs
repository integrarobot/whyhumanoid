// Annual revenue and its growth for the company comparator (/investment/#comparator), from SEC XBRL company facts and,
// for companies that do not file with the SEC, from their annual reports as reviewed by Codex.
//   node tools/export-fundamentals.mjs --from <sec-revenue-source-packet.json> --issuers <issuer-annual-source-packet.json> [--check]
// The SEC packet is rebuilt with tools/fetch-sec-revenue.mjs; the issuer packet is a reviewed reading of the original
// reports (value, period, page locator, SHA-256 of the PDF).
// The packet (outside Git) holds, per listed company matched to an SEC registrant, the annual revenue facts of the
// standard total-revenue concepts as data.sec.gov publishes them (period, unit, value, form, accession, filing date),
// with the source URL and the SHA-256 of the original companyfacts file. This tool picks one comparable series per
// company and writes data/investment/fundamentals.json. No quotes, no estimates, no currency conversion.
//
// Rules (also written into the snapshot):
// 1. Annual facts only: a 350 to 380 day period from a 10-K, 20-F or 40-F (amendments included).
// 2. Per concept and unit, the latest annual period; the concept and unit with the most recent period wins, never
//    the first concept known. Concepts are never added up.
// 3. Same latest period in several concepts or units: equal values are the same figure; Revenues is taken over a
//    contract-revenue concept it contains (Revenues >= the other); a second unit is a convenience translation when it
//    has no earlier annual period or the latest filing gives no previous year in it, and the reporting currency is
//    kept. Anything else is pending.
// 4. Restatements: the value of a period is the one in the latest filing that reports it.
// 5. Growth compares the previous consecutive fiscal year in the same concept and unit, preferably as reported in the
//    same filing; no previous year, or a previous value of zero or less, means no growth figure.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ANNUAL = new Set(['10-K', '10-K/A', '20-F', '20-F/A', '40-F', '40-F/A']);
// Total-revenue concepts only (the same list as tools/fetch-sec-revenue.mjs): a packet carrying a partial concept, such
// as SalesRevenueGoodsNet, is refused rather than read.
export const TOTAL_CONCEPTS = new Set(['us-gaap:Revenues', 'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax', 'us-gaap:RevenueFromContractWithCustomerIncludingAssessedTax', 'ifrs-full:Revenue', 'ifrs-full:RevenueFromContractsWithCustomers']);
const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
// Every SEC fact: a finite value, real dates in order, a filing date and an accession number. A bad fact stops the export.
export function packetProblems(packet) {
  const problems = [];
  if (!isDate(packet.as_of)) problems.push('as_of is not a date');
  for (const c of packet.companies ?? []) {
    if (!c.key || !Number.isInteger(c.cik) || !/^https:\/\/data\.sec\.gov\//.test(c.source_url ?? '') || !/^[0-9a-f]{64}$/.test(c.raw_sha256 ?? '') || !isDate(c.retrieved_at)) problems.push(`${c.key}: identity or source`);
    for (const k of c.concepts ?? []) {
      if (!TOTAL_CONCEPTS.has(`${k.namespace}:${k.concept}`)) { problems.push(`${c.key}: concept ${k.namespace}:${k.concept} is not a total-revenue concept`); continue; }
      for (const [unit, facts] of Object.entries(k.units ?? {})) {
        if (!/^[A-Z]{3}$/.test(unit)) problems.push(`${c.key}: unit ${unit}`);
        for (const f of facts) {
          if (!Number.isFinite(f.val) || !isDate(f.start) || !isDate(f.end) || f.start > f.end || !isDate(f.filed) || !/^\d{10}-\d{2}-\d{6}$/.test(f.accn ?? '') || !f.form) problems.push(`${c.key}: fact ${JSON.stringify(f).slice(0, 120)}`);
        }
      }
    }
  }
  return problems;
}
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
const annual = (f) => ANNUAL.has(f.form) && f.start && f.end && days(f.start, f.end) >= 350 && days(f.start, f.end) <= 380;
const byFiled = (a, b) => a.filed.localeCompare(b.filed) || a.accn.localeCompare(b.accn);
const filingUrl = (cik, accn) => `https://www.sec.gov/Archives/edgar/data/${cik}/${accn.replace(/-/g, '')}/`;
export const RULES = [
  'Annual facts only: a 350 to 380 day period from a 10-K, 20-F or 40-F, amendments included.',
  'Per concept and unit the latest annual period; the most recent one wins. Concepts are never added up.',
  'Same latest period in several concepts: equal values are one figure; Revenues is taken over a contract-revenue concept it contains; a unit without an earlier annual period, or not giving the previous year in the latest filing, is a convenience translation and the reporting currency is kept; anything else is pending.',
  'Restatements: a period takes its value from the latest filing that reports it.',
  'Growth compares the previous consecutive fiscal year in the same concept and unit, preferably from the same filing; without it, or with a previous value of zero or less, there is no growth figure.',
];

// ok: a growth figure; not_meaningful: the previous year is zero or less; not_available: no previous year.
export const growthStatus = (priorValue, growth) => (growth !== null ? 'ok' : priorValue === null ? 'not_available' : 'not_meaningful');

// Companies outside the SEC: one reviewed annual figure per company from its own report. Checked here: positive
// values, real fiscal-year lengths (350 to 380 days, no calendar year assumed), consecutive years, the reviewer's
// growth equal to the one recomputed from the two values. A problem stops the export.
export function issuerEntry(c) {
  const problems = [];
  const len = (a, b) => days(a, b);
  if (!(Number.isFinite(c.revenue) && c.revenue > 0)) problems.push('revenue');
  if (c.prior_revenue !== null && c.prior_revenue !== undefined && !Number.isFinite(c.prior_revenue)) problems.push('prior revenue');
  for (const d of ['period_start', 'period_end', 'published', 'checked_at']) if (!isDate(c[d])) problems.push(d);
  if (c.prior_revenue !== null && c.prior_revenue !== undefined) for (const d of ['prior_start', 'prior_end']) if (!isDate(c[d])) problems.push(d);
  if (!/^[A-Z]{3}$/.test(c.currency ?? '')) problems.push('currency');
  if (c.basis !== 'FY') problems.push('basis');
  if (!(len(c.period_start, c.period_end) >= 350 && len(c.period_start, c.period_end) <= 380)) problems.push('period length');
  if (c.prior_revenue !== null && c.prior_revenue !== undefined) {
    if (!(len(c.prior_start, c.prior_end) >= 350 && len(c.prior_start, c.prior_end) <= 380)) problems.push('prior period length');
    if (Math.abs(days(c.prior_end, c.period_start) - 2) > 7) problems.push('prior year not consecutive');
  }
  if (!/^https:\/\//.test(c.source_url ?? '') || !c.source_locator || !/^[0-9a-f]{64}$/.test(c.raw_sha256 ?? '')) problems.push('source');
  const prior = c.prior_revenue ?? null;
  const growth = prior !== null && prior > 0 ? Math.round((c.revenue / prior - 1) * 1e4) / 1e4 : null;
  if (growth !== null && c.revenue_growth_yoy_pct !== undefined && Math.abs(c.revenue_growth_yoy_pct / 100 - (c.revenue / prior - 1)) > 1e-6) problems.push('stated growth differs from the values');
  if (problems.length) throw new Error(`${c.key}: ${problems.join(', ')}`);
  const fact = (value, start, end) => ({ value, currency: c.currency, start, end, label: `annual report published ${c.published}`, filing_url: c.source_url, locator: c.source_locator });
  return {
    name: c.name, status: 'published', source: 'issuer', source_url: c.source_url, retrieved_at: c.checked_at, raw_sha256: c.raw_sha256,
    revenue: fact(c.revenue, c.period_start, c.period_end),
    prior: prior !== null ? { ...fact(prior, c.prior_start, c.prior_end), label: 'same annual report' } : null,
    growth_yoy: growth,
    growth_status: growthStatus(prior, growth),
    growth_note: growth !== null ? null : prior !== null ? 'Previous fiscal year revenue is zero or less: no growth figure.' : 'No previous fiscal year: no growth figure.',
    note: readerNote(c),
  };
}

// The reader-facing note of an issuer figure (tools/fundamentals-notes.json), tied to the reviewer's note by its anchor.
const NOTES = JSON.parse(readFileSync(new URL('./fundamentals-notes.json', import.meta.url), 'utf8')).notes;
function readerNote(c) {
  const n = NOTES[c.key];
  if (!n) return null;
  if (!(c.note ?? '').includes(n.anchor)) throw new Error(`${c.key}: the reviewer's note changed; review tools/fundamentals-notes.json`);
  return n.text;
}

// One series per company: { status, revenue, prior, growth } or { status: 'pending' | 'no_annual_revenue', reason }.
export function pickRevenue(company) {
  const series = [];
  for (const k of company.concepts ?? []) {
    for (const [unit, facts] of Object.entries(k.units ?? {})) {
      const a = facts.filter(annual);
      if (!a.length) continue;
      const end = a.map((f) => f.end).sort().at(-1);
      series.push({ concept: `${k.namespace}:${k.concept}`, unit, facts: a, end });
    }
  }
  if (!series.length) return { status: 'no_annual_revenue', reason: 'No annual total-revenue fact in the SEC company facts.' };
  const latestEnd = series.map((s) => s.end).sort().at(-1);
  let top = series.filter((s) => s.end === latestEnd);
  const valueAt = (s, end) => s.facts.filter((f) => f.end === end).sort(byFiled).at(-1);
  if (top.length > 1) {
    // A unit with no earlier annual period beside one that has it: a convenience translation, set aside.
    const withHistory = top.filter((s) => s.facts.some((f) => f.end < latestEnd));
    if (withHistory.length && withHistory.length < top.length) top = withHistory;
  }
  if (top.length > 1 && new Set(top.map((s) => s.unit)).size > 1) {
    // Several currencies with history: the reporting currency is the one in which the latest filing also gives the
    // previous year; a convenience translation in that filing covers the current year only.
    const inFiling = top.filter((s) => {
      const cur = valueAt(s, latestEnd);
      return s.facts.some((f) => f.accn === cur.accn && f.end < latestEnd && annual(f));
    });
    if (inFiling.length && inFiling.length < top.length) top = inFiling;
  }
  if (top.length > 1) {
    const units = new Set(top.map((s) => s.unit));
    const vals = top.map((s) => valueAt(s, latestEnd).val);
    if (units.size > 1) return { status: 'pending', reason: `Revenue reported in ${[...units].join(' and ')} for the same year; the reporting currency needs review.` };
    if (new Set(vals).size > 1) {
      const rev = top.find((s) => s.concept === 'us-gaap:Revenues');
      const rest = top.filter((s) => s !== rev);
      if (!rev || rest.some((s) => valueAt(s, latestEnd).val > valueAt(rev, latestEnd).val)) {
        return { status: 'pending', reason: `Different totals in ${top.map((s) => s.concept).join(' and ')} for the same year; needs review.` };
      }
      top = [rev];
    } else {
      // Equal values: one figure. Prefer the series with the longer annual history for the comparison.
      top.sort((a, b) => new Set(b.facts.map((f) => f.end)).size - new Set(a.facts.map((f) => f.end)).size || (a.concept === 'us-gaap:Revenues' ? -1 : 1));
    }
  }
  const s = top[0];
  const cur = valueAt(s, latestEnd);
  // Previous consecutive year: its period ends the day before the current one starts (within a week, for 52/53-week
  // years). Same filing first, else the latest filing that reports it.
  const priorFacts = s.facts.filter((f) => Math.abs(days(f.end, cur.start) - 2) <= 7);
  const prior = priorFacts.filter((f) => f.accn === cur.accn).at(-1) ?? priorFacts.sort(byFiled).at(-1) ?? null;
  const fact = (f) => ({ value: f.val, currency: s.unit, start: f.start, end: f.end, form: f.form, accession: f.accn, filed: f.filed, filing_url: filingUrl(company.cik, f.accn) });
  const growth = prior && prior.val > 0 ? Math.round((cur.val / prior.val - 1) * 1e4) / 1e4 : null;
  return {
    status: 'published',
    source: 'sec',
    concept: s.concept,
    revenue: { ...fact(cur), label: `Form ${cur.form} filed ${cur.filed}` },
    prior: prior ? { ...fact(prior), label: prior.accn === cur.accn ? `same Form ${cur.form}` : `Form ${prior.form} filed ${prior.filed}` } : null,
    growth_yoy: growth,
    growth_status: growthStatus(prior?.val ?? null, growth),
    growth_note: growth !== null ? null : prior ? 'Previous fiscal year revenue is zero or less: no growth figure.' : 'No previous fiscal year in the same concept and unit: no growth figure.',
  };
}

// Figures that are real but need a second look before anyone reads much into them: growth beyond +150% or below
// -60% (a very small base, an acquisition or a SPAC merger), or a latest fiscal year that ended more than 15 months
// before the packet. They are published with their base and dates, and listed for review.
export function reviewFlags(r, asOf) {
  if (r.status !== 'published') return [];
  const flags = [];
  if (r.growth_yoy !== null && (r.growth_yoy > 1.5 || r.growth_yoy < -0.6)) flags.push('growth_outlier');
  if (Date.parse(asOf) - Date.parse(r.revenue.end) > 456 * 864e5) flags.push('old_fiscal_year');
  return flags;
}

export function buildSnapshot(packet, packetSha256, issuers = null, issuersSha256 = null) {
  const problems = packetProblems(packet);
  if (issuers && !isDate(issuers.checked_at)) problems.push('issuer packet checked_at is not a date');
  if (problems.length) throw new Error(`SEC packet refused:\n- ${problems.slice(0, 10).join('\n- ')}`);
  const securities = {};
  const counts = { companies: packet.companies.length + (issuers?.companies.length ?? 0), published: 0, with_growth: 0, pending: 0, no_annual_revenue: 0, sec: 0, issuer: 0 };
  for (const c of packet.companies) {
    const r = pickRevenue(c);
    counts[r.status] += 1;
    if (r.status === 'published' && r.growth_yoy !== null) counts.with_growth += 1;
    // A listing outside the US matched to its issuer's SEC filings: the issuer's consolidated accounts, the listing kept.
    const outside = !/^(NASDAQ|NYSE|NYSEAMERICAN|NYSEARCA):/.test(c.key) && /share class of the catalogue are unchanged/.test(c.identity_review ?? '');
    const note = r.status === 'published' && outside ? `Consolidated accounts of ${c.secName} as filed with the SEC; the listing shown here is unchanged.` : null;
    securities[c.key] = { name: c.name, sec_name: c.secName, cik: c.cik, source_url: c.source_url, retrieved_at: c.retrieved_at, raw_sha256: c.raw_sha256, ...r, ...(note ? { note } : {}), review_flags: reviewFlags(r, packet.as_of) };
    if (securities[c.key].review_flags.length) counts.flagged = (counts.flagged ?? 0) + 1;
    if (r.status === 'published') counts.sec += 1;
  }
  for (const c of issuers?.companies ?? []) {
    if (securities[c.key]) throw new Error(`${c.key}: in both packets`);
    const r = issuerEntry(c);
    securities[c.key] = { ...r, review_flags: reviewFlags(r, issuers.checked_at) };
    counts.published += 1;
    counts.issuer += 1;
    if (r.growth_yoy !== null) counts.with_growth += 1;
  }
  return {
    id: 'investment-fundamentals',
    source: 'SEC EDGAR XBRL company facts (data.sec.gov); issuer annual reports reviewed by Codex',
    as_of: packet.as_of,
    packet_sha256: [].concat(packetSha256),
    issuers_sha256: issuersSha256,
    issuers_reviewer: issuers?.reviewer ?? null,
    issuers_method: issuers?.method ?? null,
    scope: 'Listed companies of the Investment category matched to an SEC registrant by ticker and issuer name, and companies outside the SEC whose latest annual report has been reviewed. Latest annual figures, not real time: newer quarterly figures exist.',
    rules: RULES,
    counts,
    securities: Object.fromEntries(Object.entries(securities).sort(([a], [b]) => a.localeCompare(b))),
  };
}

const OUT = new URL('../data/investment/fundamentals.json', import.meta.url);
// Run as a command: compare file paths, not URL paths (a URL escapes spaces and '?', a command-line path does not).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const at = process.argv.indexOf('--from');
  if (at < 0 || !process.argv[at + 1]) { console.error('usage: node tools/export-fundamentals.mjs --from <sec-packet.json> [--from <more.json>] [--issuers <issuer-packet.json>] [--check]'); process.exit(2); }
  // Several SEC packets (--from repeated): merged, a company in two packets is an error.
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  const raws = process.argv.flatMap((a, i) => (a === '--from' && process.argv[i + 1] ? [readFileSync(process.argv[i + 1])] : []));
  const packets = raws.map((r) => JSON.parse(r));
  const seen = new Set();
  for (const c of packets.flatMap((p) => p.companies)) { if (seen.has(c.key)) { console.error(`${c.key}: in two SEC packets`); process.exit(1); } seen.add(c.key); }
  const merged = { as_of: packets.map((p) => p.as_of).sort().at(-1), companies: packets.flatMap((p) => p.companies) };
  const ia = process.argv.indexOf('--issuers');
  const iraw = ia > 0 && process.argv[ia + 1] ? readFileSync(process.argv[ia + 1]) : null;
  const snap = buildSnapshot(merged, raws.map(sha), iraw ? JSON.parse(iraw) : null, iraw ? sha(iraw) : null);
  const text = `${JSON.stringify(snap, null, 1)}\n`;
  if (process.argv.includes('--check')) {
    const now = readFileSync(OUT, 'utf8');
    if (now !== text) { console.error('data/investment/fundamentals.json is not what the packet gives: run without --check.'); process.exit(1); }
    console.log('Fundamentals snapshot matches the packet.');
  } else {
    writeFileSync(OUT, text);
    console.log(`Wrote data/investment/fundamentals.json: ${JSON.stringify(snap.counts)}`);
  }
}
