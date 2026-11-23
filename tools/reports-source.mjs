#!/usr/bin/env node
// Reports category (Javier, 23 Nov 2026): adapter for the external staging sheet of report extractions (kept by Grok;
// its id and links stay out of Git and off the site) and check of the reviewed catalogue that the site publishes.
//
//   node tools/reports-source.mjs --check
//       validates data/reports/catalogue.json: schema, stable unique ids and slugs, reserved slugs, public https
//       originals (no Google Sheets, Drive or Docs links), review status 'verified' for every listed record.
//   node tools/reports-source.mjs --from <sheet-export.json> --out <private review file outside the repository>
//       <sheet-export.json>: python3 -I tools/workbook-xlsx-to-json.py <sheet.xlsx> <sheet-export.json>.
//       Checks the 18-column schema, gives every row a stable candidate id, compares it with the catalogue, and splits
//       each finding cell into one stub per claim (report_id, topic, text, locator if the cell gives one) with every
//       field a reviewer must fill: metric, value, unit, geography or population, reference period or horizon,
//       scenario, limitations. Nothing is parsed into numbers and nothing is averaged. The review file is private.
//
// The sheet is an extraction, not verified evidence: a record is published only after its bibliographic data are
// checked against the public original; findings only after each is checked page by page.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
export const RESERVED_SLUGS = new Set(['deployment-records']);
export const SHEET_COLUMNS = [
  'Report name', 'Publishing entity', 'Year of publication (month)', 'Scope & methodology',
  'Humanoid unit sales / shipments forecast', 'Installed base / units in operation', 'Market size / revenue forecast',
  'Scenarios (base / bull / bear)', 'Unit cost / BOM & price trajectory', 'Labor impact (jobs, tasks, labor shortage)',
  'Investment / funding', 'Key adoption sectors & timeline', 'China vs US / regional view', 'Key bottlenecks / risks',
  'Key companies highlighted', 'Headline conclusion', 'Other key figures', 'Source link',
];
const FINDING_COLUMNS = SHEET_COLUMNS.slice(4, 17);
const PRIVATE = /docs\.google\.com|drive\.google\.com|googleusercontent\.com|sheets\.google|\/spreadsheets\//i;
const slug = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function candidateId(row) {
  const publisher = slug(String(row['Publishing entity'] ?? '').split(/[(/,]/)[0]).split('-').slice(0, 3).join('-');
  const year = /\b(19|20)\d{2}\b/.exec(String(row['Year of publication (month)'] ?? ''))?.[0] ?? 'nd';
  const key = slug(String(row['Report name'] ?? '').replace(/\(.*?\)/g, '')).split('-').filter((w) => w.length > 2).slice(0, 5).join('-');
  return `rpt_${publisher}_${year}_${key}`;
}

export function checkCatalogue(doc) {
  const problems = [];
  const ids = new Set(), slugs = new Set();
  for (const r of doc.reports ?? []) {
    const at = r.id ?? '(no id)';
    for (const f of ['id', 'slug', 'title', 'publisher', 'published', 'format', 'scope', 'original_url', 'access', 'review', 'findings']) if (r[f] === undefined || r[f] === '') problems.push(`${at}: ${f} missing`);
    if (!/^rpt_[a-z0-9-]+_(\d{4}|nd)_[a-z0-9-]+$/.test(r.id ?? '')) problems.push(`${at}: id is not rpt_<publisher>_<year>_<key>`);
    if (ids.has(r.id)) problems.push(`${at}: duplicate id`); ids.add(r.id);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug ?? '') || RESERVED_SLUGS.has(r.slug)) problems.push(`${at}: slug ${r.slug} invalid or reserved`);
    if (slugs.has(r.slug)) problems.push(`${at}: duplicate slug`); slugs.add(r.slug);
    if (!/^https:\/\//.test(r.original_url ?? '') || PRIVATE.test(r.original_url ?? '')) problems.push(`${at}: original_url must be a public https original, never a sheet, Drive or Docs link`);
    if (PRIVATE.test(JSON.stringify(r))) problems.push(`${at}: holds a private Google link`);
    if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(r.published ?? '')) problems.push(`${at}: published must be YYYY, YYYY-MM or YYYY-MM-DD`);
    if (!['public', 'public-redacted', 'public-summary-of-paid-report'].includes(r.access)) problems.push(`${at}: access ${r.access}`);
    if (r.review?.status !== 'verified' || !/^\d{4}-\d{2}-\d{2}$/.test(r.review?.checked_on ?? '') || !['title', 'publisher', 'date', 'url', 'scope'].every((f) => r.review?.checked?.includes(f))) problems.push(`${at}: only records verified against the original (title, publisher, date, url, scope) are published`);
    if (r.findings !== 'in-review') problems.push(`${at}: findings are not published in this release`);
  }
  return problems;
}

// One stub per claim: a cell is split on line breaks and on "; " between claims. Locators: [p.17], p. 4, [§3], §2.
export function findingStubs(reportId, row) {
  const stubs = [];
  for (const topic of FINDING_COLUMNS) {
    const cell = String(row[topic] ?? '').trim();
    if (!cell || /^(n\/?a|not (stated|covered|available)|none|-)\.?$/i.test(cell)) continue;
    for (const part of cell.split(/\n+|;\s+(?=[A-Z0-9$€¥~])/).map((s) => s.trim()).filter(Boolean)) {
      const locator = /\[(p\.?\s?\d+[^\]]*|§[^\]]+)\]|\bpp?\.\s?\d+(-\d+)?|§\s?[\w.]+/i.exec(part)?.[0] ?? null;
      stubs.push({ report_id: reportId, topic, text: part, locator, status: 'unreviewed', to_fill: ['metric', 'value', 'unit', 'geography_or_population', 'reference_period_or_horizon', 'scenario', 'limitations', 'checked_locator'] });
    }
  }
  return stubs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const catalogue = JSON.parse(readFileSync(resolve(root, 'data/reports/catalogue.json'), 'utf8'));
  const problems = checkCatalogue(catalogue);
  if (process.argv.includes('--check')) {
    if (problems.length) { console.error(`Reports catalogue check FAILED:\n- ${problems.join('\n- ')}`); process.exit(1); }
    console.log(`Reports catalogue check passed: ${catalogue.reports.length} verified record(s), findings in review, no private links.`);
  } else {
    const from = arg('--from'), out = arg('--out');
    if (!from || !out) { console.error('usage: --check | --from <sheet-export.json> --out <private file>'); process.exit(2); }
    if (resolve(out).startsWith(root)) { console.error('the review file is private: write it outside the repository'); process.exit(2); }
    const book = JSON.parse(readFileSync(from, 'utf8'));
    const tabs = Object.entries(book);
    if (tabs.length !== 1) problems.push(`expected one tab, found ${tabs.length}`);
    const [, rows] = tabs[0];
    const header = rows[0].map((h) => String(h ?? '').trim());
    if (JSON.stringify(header.slice(0, SHEET_COLUMNS.length)) !== JSON.stringify(SHEET_COLUMNS)) problems.push(`header differs from the expected 18 columns: ${JSON.stringify(header)}`);
    const published = new Map(catalogue.reports.map((r) => [r.original_url, r]));
    const candidates = rows.slice(1).filter((r) => r.some((v) => String(v ?? '').trim())).map((cells) => {
      const row = Object.fromEntries(SHEET_COLUMNS.map((h, i) => [h, cells[i] ?? null]));
      const id = candidateId(row);
      const pub = published.get(row['Source link']);
      return {
        candidate_id: id, catalogue_id: pub?.id ?? null, status: pub ? 'published (bibliographic record verified)' : 'bibliographic check pending',
        title: row['Report name'], publisher: row['Publishing entity'], published: row['Year of publication (month)'], scope: row['Scope & methodology'], original_url: row['Source link'],
        checklist: ['open the original at original_url', 'title, publisher, authors and date as printed', 'page count or format', 'scope and method with a locator', 'is the URL the publisher\'s own; if not, the publisher\'s landing page', 'access: public, redacted or summary of a paid report'],
        findings: findingStubs(pub?.id ?? id, row),
      };
    });
    const ids = candidates.map((c) => c.candidate_id);
    for (const id of ids.filter((x, i) => ids.indexOf(x) !== i)) problems.push(`two rows give the candidate id ${id}`);
    writeFileSync(out, `${JSON.stringify({ note: 'PRIVATE review file: extractions from the staging sheet, not verified. Never commit or publish.', candidates }, null, 2)}\n`);
    const stubs = candidates.flatMap((c) => c.findings);
    console.log(`${candidates.length} reports; ${candidates.filter((c) => c.catalogue_id).length} published, ${candidates.filter((c) => !c.catalogue_id).length} pending the bibliographic check; ${stubs.length} finding stubs (${stubs.filter((s) => s.locator).length} with a locator in the cell), all unreviewed. Review file: ${out}`);
    if (problems.length) { console.error(`Schema problems:\n- ${problems.join('\n- ')}`); process.exit(1); }
  }
}
