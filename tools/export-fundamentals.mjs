// Annual revenue and its growth for the company comparator (/investment/#comparator), from SEC XBRL company facts.
//   node tools/export-fundamentals.mjs --from <sec-revenue-source-packet.json> [--check]
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

const ANNUAL = new Set(['10-K', '10-K/A', '20-F', '20-F/A', '40-F', '40-F/A']);
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
    concept: s.concept,
    revenue: fact(cur),
    prior: prior ? fact(prior) : null,
    growth_yoy: growth,
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

export function buildSnapshot(packet, packetSha256) {
  const securities = {};
  const counts = { companies: packet.companies.length, published: 0, with_growth: 0, pending: 0, no_annual_revenue: 0 };
  for (const c of packet.companies) {
    const r = pickRevenue(c);
    counts[r.status] += 1;
    if (r.status === 'published' && r.growth_yoy !== null) counts.with_growth += 1;
    securities[c.key] = { name: c.name, sec_name: c.secName, cik: c.cik, source_url: c.source_url, retrieved_at: c.retrieved_at, raw_sha256: c.raw_sha256, ...r, review_flags: reviewFlags(r, packet.as_of) };
    if (securities[c.key].review_flags.length) counts.flagged = (counts.flagged ?? 0) + 1;
  }
  return {
    id: 'investment-fundamentals',
    source: 'SEC EDGAR XBRL company facts (data.sec.gov)',
    as_of: packet.as_of,
    packet_sha256: packetSha256,
    scope: 'Listed companies of the Investment category matched to an SEC registrant by ticker and issuer name. Companies that do not file with the SEC are not covered here.',
    rules: RULES,
    counts,
    securities: Object.fromEntries(Object.entries(securities).sort(([a], [b]) => a.localeCompare(b))),
  };
}

const OUT = new URL('../data/investment/fundamentals.json', import.meta.url);
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const at = process.argv.indexOf('--from');
  if (at < 0 || !process.argv[at + 1]) { console.error('usage: node tools/export-fundamentals.mjs --from <packet.json> [--check]'); process.exit(2); }
  const raw = readFileSync(process.argv[at + 1]);
  const snap = buildSnapshot(JSON.parse(raw), createHash('sha256').update(raw).digest('hex'));
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
