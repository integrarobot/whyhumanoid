#!/usr/bin/env node
// Research Conclusions Atlas snapshot (24 Nov 2026). Reads a PRIVATE workbook export (kept outside Git) for the Reports
// tab only, and the reviewed mapping tools/reports-findings.json. Validates them together (server/src/reports/atlas.js:
// the 21-column contract, every edition accounted for, every finding's excerpt literally in its master cell, ids,
// vocabularies, units, exhaustive stacks, one estimate per series) and writes data/reports/atlas.json, allowlisted
// fields only. With --originals <dir> (private text extracted from the public originals, one <RPT-ID>.txt per report,
// pages marked "=== PAGE n"), it also checks that every checked finding's phrase is on the page it cites.
//
//   node --no-warnings tools/export-reports.mjs --from <export.json> --exported-at <ISO> [--originals <dir>]
//   node tools/export-reports.mjs --check

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { atlasProblems, buildAtlas, reportRows, snapshotProblems } from '../server/src/reports/atlas.js';

const root = new URL('../', import.meta.url);
const FILE = new URL('data/reports/atlas.json', root);
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

export const readMapping = () => JSON.parse(readFileSync(new URL('tools/reports-findings.json', root), 'utf8'));

// Every checked finding's phrase on its page of the original text (private, outside the repository).
export function originalProblems(mapping, dir) {
  const problems = [];
  const texts = new Map();
  for (const f of mapping.findings) {
    if (f.check?.status !== 'verified') continue;
    const file = `${dir.replace(/\/$/, '')}/${f.report}.txt`;
    if (!texts.has(f.report)) texts.set(f.report, existsSync(file) ? readFileSync(file, 'utf8') : null);
    const text = texts.get(f.report);
    if (text === null) { problems.push(`${f.id}: no original text for ${f.report}`); continue; }
    let scope = text;
    if (f.check.page) {
      const parts = text.split(/=== PAGE (\d+)\n/);
      const pages = new Map();
      for (let i = 1; i < parts.length; i += 2) pages.set(Number(parts[i]), parts[i + 1]);
      scope = pages.get(f.check.page) ?? '';
    }
    if (!norm(scope).includes(norm(f.check.phrase))) problems.push(`${f.id}: phrase not found on ${f.check.page ? `page ${f.check.page}` : 'the page'} of the ${f.report} original`);
  }
  return problems;
}

export function atlasFromExport(values, { exportedAt, builtAt, originals = null }) {
  const rows = reportRows(values.Reports);
  const mapping = readMapping();
  const problems = [...atlasProblems(rows, mapping), ...(originals ? originalProblems(mapping, originals) : [])];
  if (problems.length) throw new Error(`Reports validation failed:\n- ${problems.join('\n- ')}`);
  const atlas = buildAtlas({ rows, mapping, exportedAt, builtAt });
  const snap = snapshotProblems(atlas);
  if (snap.length) throw new Error(`snapshot outside the allowlist:\n- ${snap.join('\n- ')}`);
  return atlas;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (arg('--from')) {
    const exportedAt = arg('--exported-at');
    if (!exportedAt || Number.isNaN(Date.parse(exportedAt))) { console.error('--exported-at <ISO time of the workbook export> is required'); process.exit(2); }
    const atlas = atlasFromExport(JSON.parse(readFileSync(arg('--from'), 'utf8')), { exportedAt: new Date(exportedAt).toISOString(), builtAt: new Date().toISOString(), originals: arg('--originals') });
    mkdirSync(new URL('data/reports/', root), { recursive: true });
    writeFileSync(FILE, `${JSON.stringify(atlas, null, 1)}\n`);
    const c = atlas.counts;
    console.log(`Wrote data/reports/atlas.json: ${c.reports} report editions (${c.reports_checked} checked against the original, ${c.reports_unreachable} unreachable), ${c.findings} findings (${c.findings_checked} checked, ${c.numeric_checked} with checked numbers, ${c.findings_pending} pending, ${c.findings_unreachable} unreachable, ${c.findings_withheld} withheld), ${c.original_estimates} original estimates (${c.repeated_estimates} repeated across reports)${arg('--originals') ? '; every checked phrase found on its page' : ''}.`);
  } else if (process.argv.includes('--check')) {
    const problems = snapshotProblems(JSON.parse(readFileSync(FILE, 'utf8')));
    if (problems.length) { console.error(`Reports atlas check FAILED:\n- ${problems.join('\n- ')}`); process.exit(1); }
    console.log('Reports atlas holds allowlisted fields only and its counts match its rows.');
  } else {
    console.error('usage: node tools/export-reports.mjs --from <export.json> --exported-at <ISO> [--originals <dir>] | --check');
    process.exit(2);
  }
}
