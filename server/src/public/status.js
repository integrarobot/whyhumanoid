// Current status and deployment countries of a deployment case (Javier, 25 Nov 2026: one public policy for every
// current summary: the home page, the Deployments section, company and robot pages, the public projection and the
// API). Shared by server/src/public/cases.js and server/src/public/projection.js.
//
// Current status: the status recorded by the case's most recent dated source. A date the source gives only as a year
// or a month counts from the start of that period. When several sources share that latest date, the most advanced of
// their statuses is taken (in operation, pilot or trial, unconfirmed, announced). A case whose sources are all undated
// has no current status by date: it is reported apart ("date of source unknown") with the most advanced status its
// records state. Earlier, more advanced statuses are not carried forward: a later source that records a planned
// expansion or a paused pilot is what the case currently shows. The evolution chart keeps its own, historical rule
// (the most advanced status documented by each date) and says so.

export const CASE_RANK = Object.freeze({ op: 0, pilot: 1, unc: 2, ann: 3 });

// "2026", "2026-03" or "2026-03-14" -> the first day of that period; anything else -> null.
export function sourceStart(value) {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(value ?? '').trim());
  if (!m) return null;
  return `${m[1]}-${m[2] ?? '01'}-${m[3] ?? '01'}`;
}

// records: rows with publication_date; keyOf(row) -> one of CASE_RANK's keys.
export function currentStatus(records, keyOf) {
  const dated = records.filter((r) => sourceStart(r.publication_date));
  const pool = dated.length ? dated : records;
  const latest = dated.length ? dated.map((r) => sourceStart(r.publication_date)).sort().at(-1) : null;
  const candidates = dated.length ? dated.filter((r) => sourceStart(r.publication_date) === latest) : pool;
  const best = [...candidates].sort((a, b) => CASE_RANK[keyOf(a)] - CASE_RANK[keyOf(b)])[0];
  return { record: best, key: keyOf(best), dated: dated.length > 0, as_of: dated.length ? best.publication_date : null };
}

// The most advanced status ever recorded (the former home-page rule), kept for the historical chart and for comparison.
export const mostAdvanced = (records, keyOf) => records.map(keyOf).sort((a, b) => CASE_RANK[a] - CASE_RANK[b])[0];

// The deployment countries a Country cell names. Parts are separated by ";" outside parentheses. A part that says it is
// a partner country, that the site is not confirmed, or that the country is not disclosed names no deployment country:
// it is kept as a note, and the original text is never lost.
const NOT_A_SITE = /partner country|not confirmed|unconfirmed|not disclosed|undisclosed|unknown/i;
export function deploymentCountries(value) {
  const text = String(value ?? '').trim();
  if (!text) return { countries: [], notes: [] };
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  const countries = [];
  const notes = [];
  for (const raw of parts.map((p) => p.trim()).filter(Boolean)) {
    if (NOT_A_SITE.test(raw)) { notes.push(raw); continue; }
    countries.push(raw);
  }
  return { countries, notes };
}
