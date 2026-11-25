// Current status and deployment countries of a deployment case (Javier, 25 Nov 2026: one public policy for every
// current summary: the home page, the Deployments section, company and robot pages, the public projection and the
// API; reviewed by Codex the same day). Shared by server/src/public/cases.js and server/src/public/projection.js.
//
// Current status: the status recorded by the case's most recent dated source.
//   - A source date is an interval: a day is itself, a month or a year covers the whole period. An impossible date
//     (2026-99-99, 2026-02-30) is not a date.
//   - The latest sources are those that could be the most recent: every dated source whose period ends on or after the
//     latest start among them. One source, or several on the same exact day, is a clear order. Several sources whose
//     periods overlap (a year and a day inside it) cannot be ordered: that is flagged as ambiguous, not decided.
//   - When the latest sources disagree (same day, or ambiguous order), the most advanced of their statuses is shown
//     (in operation, pilot or trial, unconfirmed, announced) and the summary says so: a tie-break, not new evidence.
//   - A case whose sources are all undated has no current status by date: it is reported apart ("date of source
//     unknown") with the most advanced status its records state.
//   - Earlier, more advanced statuses are not carried forward: a later source that records a planned expansion or a
//     paused pilot is what the case currently shows. The evolution chart keeps its own, historical rule (the most
//     advanced status documented by each date) and says so.

export const CASE_RANK = Object.freeze({ op: 0, pilot: 1, unc: 2, ann: 3 });

const pad = (n) => String(n).padStart(2, '0');
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
// "2026", "2026-03" or "2026-03-14" -> { start, end, precision } (a real calendar date); anything else -> null.
export function sourcePeriod(value) {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(String(value ?? '').trim());
  if (!m) return null;
  const y = +m[1];
  if (m[3]) {
    const d = new Date(Date.UTC(y, +m[2] - 1, +m[3]));
    if (d.getUTCFullYear() !== y || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    return { start: iso, end: iso, precision: 'day' };
  }
  if (m[2]) {
    if (+m[2] < 1 || +m[2] > 12) return null;
    return { start: `${m[1]}-${m[2]}-01`, end: `${m[1]}-${m[2]}-${pad(lastDay(y, +m[2]))}`, precision: 'month' };
  }
  return { start: `${m[1]}-01-01`, end: `${m[1]}-12-31`, precision: 'year' };
}
export const sourceStart = (value) => sourcePeriod(value)?.start ?? null;

// records: rows with publication_date; keyOf(row) -> one of CASE_RANK's keys.
export function currentStatus(records, keyOf) {
  const dated = records.map((r) => ({ r, p: sourcePeriod(r.publication_date) })).filter((x) => x.p);
  const byRank = (xs) => [...xs].sort((a, b) => CASE_RANK[keyOf(a)] - CASE_RANK[keyOf(b)]);
  if (!dated.length) {
    const best = byRank(records)[0];
    return { record: best, key: keyOf(best), dated: false, as_of: null, order: 'undated', tie: false, latest: [] };
  }
  const maxStart = dated.map((x) => x.p.start).sort().at(-1);
  const latest = dated.filter((x) => x.p.end >= maxStart);
  const exact = latest.every((x) => x.p.precision === 'day' && x.p.start === latest[0].p.start);
  const order = latest.length === 1 ? 'clear' : exact ? 'same_day' : 'ambiguous';
  const best = byRank(latest.map((x) => x.r))[0];
  const keys = new Set(latest.map((x) => keyOf(x.r)));
  return {
    record: best, key: keyOf(best), dated: true, as_of: best.publication_date, order,
    // The latest sources disagree: the most advanced is shown, and that is a tie-break, said next to the status.
    tie: keys.size > 1,
    latest: latest.map((x) => ({ date: x.r.publication_date, key: keyOf(x.r) })),
  };
}

// The most advanced status ever recorded (the former home-page rule), kept for the historical chart and for comparison.
export const mostAdvanced = (records, keyOf) => records.map(keyOf).sort((a, b) => CASE_RANK[a] - CASE_RANK[b])[0];

// The deployment countries a Country cell names (Codex review, 25 Nov 2026). Parts are separated by ";" outside
// parentheses. Each part is one of:
//   a country    "Germany", or "Japan (Tokyo plant)": the name before the parenthesis, the whole part kept as a note
//   multiple     "Multiple": several countries, not named
//   unknown      a partner country, an unconfirmed or undisclosed site ("South Korea (partner country; deployment site
//                not confirmed)", "Not disclosed (North America)"): names no deployment country
// The cell's original text is always kept (original), and so is every annotated part (notes).
const NOT_A_SITE = /partner country|not confirmed|unconfirmed|not disclosed|undisclosed|unknown|not recorded/i;
const MULTIPLE = /^(multiple|several|various)\b/i;
export function deploymentCountries(value) {
  const original = String(value ?? '').trim();
  const out = { countries: [], multiple: false, unknown: false, notes: [], original: original || null };
  if (!original) return out;
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of original) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  for (const raw of parts.map((p) => p.trim()).filter(Boolean)) {
    if (NOT_A_SITE.test(raw)) { out.unknown = true; out.notes.push(raw); continue; }
    if (MULTIPLE.test(raw)) { out.multiple = true; if (raw.toLowerCase() !== 'multiple') out.notes.push(raw); continue; }
    const name = raw.replace(/\s*\(.*\)\s*$/, '').trim();
    if (name !== raw) out.notes.push(raw);
    if (name) out.countries.push(name);
  }
  return out;
}
