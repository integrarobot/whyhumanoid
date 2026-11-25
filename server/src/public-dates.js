// Dated papers, announcements and releases of Datasets and Benchmarks (Javier, 25 Nov 2026: "adelante con lo de las fechas"; contract agreed
// with Codex the same day). Seven columns appended, in this order, to the end of both tabs of the master workbook; the
// tab without them is still accepted, and a row without a date is valid and counts as undated. Shared by the backend
// import and the public snapshots (server/src/data-atlas/atlas.js, server/src/benchmarks/atlas.js) and read by the
// evolution charts (tools/evolution-model.mjs).
//
//   PUBLIC_DATE             YYYY, YYYY-MM or YYYY-MM-DD as the source states it; a day or month it does not give is
//                           never filled in
//   PUBLIC_DATE_PRECISION   day, month or year: must match the format of PUBLIC_DATE
//   PUBLIC_DATE_MEANING     one of MEANINGS below; never a founding, review, snapshot or current-version date
//   PUBLIC_DATE_SOURCE_URL  https link to the primary source (an arXiv meaning: https://arxiv.org/abs/<id>, no version)
//   PUBLIC_DATE_LOCATOR     where the date is stated, e.g. "Submission history [v1]"
//   PUBLIC_DATE_CHECKED_AT  YYYY-MM-DD of the check; bookkeeping, never history
//   PUBLIC_DATE_NOTE        optional public caveat in English (an earlier publication, a different announcement date)
//
// The first six go together: all empty, or all filled. The date is the event its meaning names (the first arXiv
// submission of the associated paper, a publication, an announcement or a release) for the resource or version that
// NAME (and, for Datasets, VERSION_SCOPE) names. It need not be the resource's first public appearance (a note says so
// when an earlier one is known) and is never the date of its current figures.

export const PUBLIC_DATE_HEADERS = Object.freeze([
  'PUBLIC_DATE', 'PUBLIC_DATE_PRECISION', 'PUBLIC_DATE_MEANING', 'PUBLIC_DATE_SOURCE_URL', 'PUBLIC_DATE_LOCATOR',
  'PUBLIC_DATE_CHECKED_AT', 'PUBLIC_DATE_NOTE',
]);
export const PUBLIC_DATE_FIELDS = Object.freeze(PUBLIC_DATE_HEADERS.map((h) => h.toLowerCase()));
const REQUIRED = PUBLIC_DATE_FIELDS.filter((f) => f !== 'public_date_note');

export const MEANINGS = Object.freeze({
  associated_paper_first_arxiv_submission: { label: 'First arXiv submission (v1) of the associated paper', short: 'Associated paper, arXiv v1', tabs: ['datasets', 'benchmarks'], arxiv: true },
  associated_paper_publication: { label: 'Publication of the associated paper', short: 'Associated paper published', tabs: ['datasets', 'benchmarks'] },
  official_announcement: { label: 'Official announcement or project page', short: 'Official announcement', tabs: ['datasets', 'benchmarks'] },
  data_release: { label: 'First public release of the data', short: 'Data released', tabs: ['datasets'] },
  benchmark_release: { label: 'First public release of the benchmark', short: 'Benchmark released', tabs: ['benchmarks'] },
});

const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? '') && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const blank = (v) => v === null || v === undefined || String(v).trim() === '';

export function precisionOf(date) {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(String(date ?? '').trim());
  if (!m) return null;
  if (m[3]) return isDay(m[0]) ? 'day' : null;
  if (m[2]) return +m[2] >= 1 && +m[2] <= 12 ? 'month' : null;
  return 'year';
}

// The arXiv id names the month its number was assigned, which can follow a late-month v1 date (2509.00576 was
// submitted on 30 Aug 2025): it may not precede the month of the date nor follow it by more than one month.
function arxivMonthFits(date, id) {
  const months = (yy, mm) => (2000 + +yy) * 12 + +mm;
  const d = months(date.slice(2, 4), date.slice(5, 7));
  const a = months(id.slice(0, 2), id.slice(2, 4));
  return a === d || a === d + 1;
}

// Problems of one row's public date. `tab` is 'datasets' or 'benchmarks'; `at` names the row in messages.
export function publicDateProblems(row, tab, at) {
  const v = Object.fromEntries(PUBLIC_DATE_FIELDS.map((f) => [f, blank(row[f]) ? null : String(row[f]).trim()]));
  if (!PUBLIC_DATE_FIELDS.some((f) => v[f] !== null)) return [];
  const problems = [];
  const missing = REQUIRED.filter((f) => v[f] === null);
  if (missing.length) problems.push(`${at}: the public date columns go together; missing ${missing.map((f) => f.toUpperCase()).join(', ')}`);
  const precision = v.public_date === null ? null : precisionOf(v.public_date);
  if (v.public_date !== null && !precision) problems.push(`${at}: PUBLIC_DATE "${v.public_date}" must be YYYY, YYYY-MM or YYYY-MM-DD`);
  if (precision && v.public_date_precision !== null && v.public_date_precision !== precision) problems.push(`${at}: PUBLIC_DATE_PRECISION "${v.public_date_precision}" does not match PUBLIC_DATE ${v.public_date} (${precision})`);
  const meaning = MEANINGS[v.public_date_meaning];
  if (v.public_date_meaning !== null && !meaning) problems.push(`${at}: PUBLIC_DATE_MEANING "${v.public_date_meaning}" is not one of ${Object.keys(MEANINGS).join(', ')}`);
  else if (meaning && !meaning.tabs.includes(tab)) problems.push(`${at}: PUBLIC_DATE_MEANING ${v.public_date_meaning} does not apply to ${tab}`);
  if (v.public_date_source_url !== null && !/^https:\/\/[^\s]+$/.test(v.public_date_source_url)) problems.push(`${at}: PUBLIC_DATE_SOURCE_URL must be one https link`);
  if (v.public_date_checked_at !== null && !isDay(v.public_date_checked_at)) problems.push(`${at}: PUBLIC_DATE_CHECKED_AT must be YYYY-MM-DD`);
  if (precision && isDay(v.public_date_checked_at) && v.public_date > v.public_date_checked_at) problems.push(`${at}: PUBLIC_DATE ${v.public_date} is after its check ${v.public_date_checked_at}`);
  if (meaning?.arxiv) {
    const id = /^https:\/\/arxiv\.org\/abs\/(\d{4})\.\d{4,5}$/.exec(v.public_date_source_url ?? '');
    if (!id) problems.push(`${at}: an arXiv date needs PUBLIC_DATE_SOURCE_URL https://arxiv.org/abs/<id> (no version suffix)`);
    else if (precision !== 'day') problems.push(`${at}: an arXiv submission date is a day (Submission history [v1])`);
    else if (!arxivMonthFits(v.public_date, id[1])) problems.push(`${at}: PUBLIC_DATE ${v.public_date} cannot be the v1 submission of arXiv ${id[1]}`);
  }
  return problems;
}

// The public date of a validated row, or null.
export function publicDateOf(row) {
  const date = blank(row.public_date) ? null : String(row.public_date).trim();
  const meaning = MEANINGS[row.public_date_meaning];
  if (!date || !precisionOf(date) || !meaning) return null;
  return {
    date,
    precision: precisionOf(date),
    meaning: row.public_date_meaning,
    meaning_label: meaning.label,
    source_url: row.public_date_source_url ?? null,
    locator: row.public_date_locator ?? null,
    checked_at: row.public_date_checked_at ?? null,
    note: blank(row.public_date_note) ? null : String(row.public_date_note).trim(),
  };
}
