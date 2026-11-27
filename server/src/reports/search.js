// Reports in the global search (27 Nov 2026). Reports is a free category that is not a database table: its source is
// the reviewed public Research Conclusions Atlas (data/reports/atlas.json, built by tools/export-reports.mjs), bundled
// into the Worker at build time. Nothing here reads the workbook, the original PDFs or D1, and nothing reinterprets a
// finding: titles, publishers, authors, scopes and finding statements are shown as the atlas publishes them.
//
// One document per report (its metadata, also for reports whose findings are still being checked) and one per
// checked finding (the findings the site draws; pending, unreachable and withheld findings are not published and are
// not indexed). Free for everyone, so both search scopes hold the same documents (free/subscriber parity).
// Links go to the public pages: /reports/<slug>/ and /reports/<slug>/#f-<finding id>.

import atlas from '../../../data/reports/atlas.json' with { type: 'json' };
import { norm } from '../search/normalize.js';

export const REPORTS_CATEGORY = Object.freeze({ id: 'reports', title: 'Reports' });

const themeLabel = new Map((atlas.vocabulary?.themes ?? []).map((t) => [t.key, t.label]));
const kindLabel = atlas.vocabulary?.kinds ?? {};
const nz = (v) => v !== null && v !== undefined && String(v).trim() !== '';
const short = (v, n) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s; };
const published = (r) => (nz(r.published) ? String(r.published) : '');

function reportDocs() {
  const byId = new Map(atlas.reports.map((r) => [r.id, r]));
  const docs = [];
  atlas.reports.forEach((r, i) => {
    const checked = r.check?.status === 'verified';
    const themes = Object.entries(atlas.coverage?.find((c) => c.report === r.id)?.themes ?? {})
      .filter(([, v]) => v && v !== 'not_covered' && v !== 'not_extracted').map(([k]) => themeLabel.get(k)).filter(Boolean);
    const data = {
      publisher: r.publisher,
      authors: r.authors,
      published: published(r),
      scope: r.scope,
      format: r.format,
      themes: themes.join(', '),
      status: checked ? 'Checked against the public original' : 'Not yet checked against the original',
    };
    docs.push({
      dataset: 'reports',
      row_id: r.id,
      position: i,
      title: r.title,
      subtitle: [r.publisher, published(r), checked ? '' : 'not yet checked against the original'].filter(Boolean).join(' · '),
      names: [r.title, r.short, r.publisher, r.authors],
      haystack: [r.title, r.short, r.publisher, r.authors, r.scope, r.format, ...themes],
      link: `/reports/${r.slug}/`,
      data,
    });
  });
  atlas.findings.filter((f) => f.check?.status === 'verified' && byId.has(f.report)).forEach((f, i) => {
    const r = byId.get(f.report);
    // The source label says whose figure it is: the report's own, or another publisher's that the report cites.
    const cited = nz(f.attribution) && !norm(r.publisher).includes(norm(f.attribution)) && !norm(f.attribution).includes(norm(r.publisher));
    const data = {
      statement: f.statement,
      source: cited ? `${r.short}, citing ${f.attribution}` : r.short,
      theme: themeLabel.get(f.theme) ?? '',
      kind: kindLabel[f.kind] ?? '',
      geography: f.geography,
      scope: f.scope,
      assumptions: f.assumptions,
      limits: f.limits,
      locator: f.locator,
    };
    docs.push({
      dataset: 'reports',
      row_id: f.id,
      position: atlas.reports.length + i,
      title: short(f.statement, 110),
      subtitle: [data.source, data.theme, data.kind].filter(Boolean).join(' · '),
      // The report's own names rank its findings just after the report for a query naming the publisher, ahead of
      // other reports that only cite it.
      names: [r.publisher, r.short, r.title],
      haystack: [f.statement, f.attribution, r.title, r.short, r.publisher, data.theme, data.kind, f.geography, f.scope, f.assumptions, f.limits],
      link: `/reports/${r.slug}/#f-${f.id}`,
      data,
    });
  });
  return docs.map((d) => ({
    ...d,
    names: `|${[...new Set(d.names.filter(nz).map(norm).filter(Boolean))].join('|')}|`,
    haystack: ` ${norm(d.haystack.filter(nz).map(String).join(' '))} `,
    tags: '||',
  }));
}

let cached = null;
// The same documents for both scopes: Reports is free, so a visitor and a subscriber find exactly the same.
export function reportSearchDocs() {
  cached ??= reportDocs();
  return cached;
}

// The same word matching as the SQL search over search_docs: every query term must have one of its alternatives at
// the start of a word of the haystack; alternatives of up to 3 characters must be the whole word.
export function matchesTerms(doc, terms) {
  return terms.every((t) => t.alts.some((a) => doc.haystack.includes(a.length <= 3 ? ` ${a} ` : ` ${a}`)));
}

export const REPORTS_SNAPSHOT = atlas.snapshot ?? null;
