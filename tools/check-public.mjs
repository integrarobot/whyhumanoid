#!/usr/bin/env node
// Guard for the public repository and the GitHub Pages site. Fails if premium data or workbook links could
// leak through Git, the published site or the free export. Run in CI on every pull request.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isInternalField, readDatabase, validateDatabase } from './export-database.mjs';
import { DATASETS, DATASETS_BY_ID } from '../server/src/datasets.js';
import { buildPages } from './build-pages.mjs';
import { projectionProblems } from './export-public.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
const failures = [];
const fail = (file, rule, detail) => failures.push(`${file}: ${rule}${detail ? ` (${detail})` : ''}`);

// Files GitHub Pages publishes: everything tracked except what _config.yml excludes.
const excluded = [...read('_config.yml').matchAll(/^\s*-\s*(\S+)\s*$/gm)].map((m) => m[1].replace(/\/$/, ''));
const isPublished = (file) => !file.startsWith('.') && !excluded.some((e) => file === e || file.startsWith(`${e}/`));
const isText = (file) => /\.(html?|js|mjs|json|csv|css|md|txt|xml|ya?ml|toml|sql)$/i.test(file) || file === 'CNAME';

// Rule 1 (whole repository): no Google Drive file ids or workbook URLs anywhere in Git.
// Drive ids are standalone 33 or 44 character tokens mixing upper case, lower case and digits
// (lower-case URL slugs such as "105m-to-build-..." are not ids).
const driveIdToken = /(?<![A-Za-z0-9_-])1[A-Za-z0-9_-]{32,43}(?![A-Za-z0-9_-])/g;
const driveId = {
  find: (text) => [...text.matchAll(driveIdToken)].map((m) => m[0]).find((t) => /[A-Z]/.test(t) && /[a-z]/.test(t) && /\d.*\d/.test(t.slice(1))),
  test(text) {
    return Boolean(this.find(text));
  },
};
const workbookUrl = /docs\.google\.com\/(spreadsheets|document)\/d\//;
// Rule 2 (whole repository): no real premium identifiers. Fixtures use the fx_ prefix and example.com.
const premiumId = /\b(?:rec|clm|dep|lnk|src|mdl|res)_[a-z0-9]+_[a-z0-9_]+\b/;
// Rule 3 (published site): no premium column names, which would indicate premium rows in page source.
const humanoidFields = new Set(JSON.parse(read('tools/humanoids-allowlist.json')).fields);
// Only the backend row key, raw sheet-row pointers and importer bookkeeping are internal column names; they must not
// appear in published pages. (Content columns are public in the 10-row previews; full rows are premium, rule 6.)
const database = readDatabase();
const premiumColumns = [
  ...new Set(DATASETS.flatMap((d) => d.fields ?? d.headers).filter((h) => h.includes('_') && isInternalField(h))),
].filter((h) => !humanoidFields.has(h));

for (const file of tracked.filter(isText)) {
  const text = read(file);
  if (driveId.test(text)) fail(file, 'contains a Google Drive file id', driveId.find(text).slice(0, 8));
  if (workbookUrl.test(text)) fail(file, 'contains a Google Docs/Sheets URL');
  // Record ids appear only in the public rows (data/preview); elsewhere fixtures use the fx_ prefix. Deployment case ids
  // (dep_...) are public since 24 Nov 2026: they key the permanent case addresses (tools/permalinks.json, deployments/).
  const ids = (text.match(new RegExp(premiumId.source, 'g')) ?? []).filter((x) => !(x.startsWith('dep_') && (file === 'tools/permalinks.json' || file.startsWith('deployments/'))));
  if (ids.length && !file.startsWith('data/preview/')) fail(file, 'contains a premium-style record id', ids[0]);
  if ((isPublished(file) || file.startsWith('server/public/')) && !file.startsWith('data/preview/')) {
    // Database values may mention column names in prose; rule 6 polices the database files themselves.
    const leaked = premiumColumns.filter((c) => new RegExp(`\\b${c}\\b`).test(text));
    if (leaked.length) fail(file, 'published file mentions premium columns', leaked.slice(0, 5).join(', '));
  }
}

// Rule 4: published server, tooling and test code must stay out of the Pages artifact.
for (const dir of ['server', 'tools', '.github', 'ops']) {
  if (tracked.some((f) => f.startsWith(`${dir}/`) && isPublished(f))) fail('_config.yml', `does not exclude ${dir}/`);
}
// Agent instructions and the delivery register (ops/entregas) are internal too.
for (const file of ['AGENTS.md', 'CLAUDE.md']) {
  if (tracked.includes(file) && isPublished(file)) fail('_config.yml', `does not exclude ${file}`);
}

// Rule 5: Humanoids rows are published only as the free catalogue: allowlisted fields, cleaned values (no private
// links, contacts or editor notes), no row the sheet marks as internal.
for (const old of ['data/humanoids.json', 'data/humanoids.csv', 'data/humanoids-preview.json', 'data/humanoids-preview.csv']) {
  if (tracked.includes(old)) fail(old, 'only data/humanoids-catalogue.* may hold public rows');
}
for (const file of tracked.filter((f) => f.startsWith('data/'))) {
  const databaseFiles = ['index', ...database.index.tabs.map((t) => t.id)].map((n) => `data/preview/${n}.json`);
  if (!['data/humanoids-catalogue.json', 'data/humanoids-catalogue.csv', 'data/manifest.json', 'data/pages.json', 'data/public/projection.json', 'data/reports/atlas.json', 'data/benchmarks/atlas.json', 'data/datasets/atlas.json', 'data/components/coverage.json', ...databaseFiles].includes(file)) fail(file, 'unexpected public data file');
}
const exported = JSON.parse(read('data/humanoids-catalogue.json'));
const manifest = JSON.parse(read('data/manifest.json'));
const isInternal = DATASETS_BY_ID.get('humanoids').internalRow;
if (exported.dataset !== 'humanoids' || exported.access !== 'free') fail('data/humanoids-catalogue.json', 'is not the free Humanoids catalogue');
const extraFields = exported.records.flatMap((r) => Object.keys(r)).filter((k) => !['id', 'sheet_row'].includes(k) && !humanoidFields.has(k));
if (extraFields.length) fail('data/humanoids-catalogue.json', 'fields outside the allowlist', [...new Set(extraFields)].join(', '));
const internal = exported.records.filter((r) => isInternal(r));
if (internal.length || exported.excluded.length) fail('data/humanoids-catalogue.json', 'publishes rows the sheet marks as internal', internal.map((r) => r.id).join(', '));
if (exported.records.length !== manifest.record_count) fail('data/manifest.json', 'record_count mismatch');
if (exported.records.length > manifest.full_database.humanoid_records) fail('data/manifest.json', 'more public records than the catalogue holds');
const csvRows = read('data/humanoids-catalogue.csv').match(/^\d+,\d+,/gm)?.length ?? 0;
if (csvRows !== exported.records.length) fail('data/humanoids-catalogue.csv', `holds ${csvRows} rows, the catalogue ${exported.records.length}`);
const page = JSON.parse(/<script[^>]*id="data"[^>]*>([\s\S]*?)<\/script>/.exec(read('index.html'))[1]);
if (page.excluded.length) fail('index.html', 'embeds rows the sheet marks as internal');
const catalogue = new Map(exported.records.map((r) => [r.id, r]));
for (const m of page.models) {
  const record = catalogue.get(m.id);
  if (!record) fail('index.html', `record ${m.id} is not in the free catalogue`);
  else if (page.cols.some((field, i) => (m.f[i] ?? '') !== (record[field] ?? ''))) fail('index.html', `record ${m.id} differs from its public values`);
}
if (page.models.length !== exported.records.length) fail('index.html', `embeds ${page.models.length} of ${exported.records.length} catalogue records`);

// Rule 6 (access matrix, 24 Nov 2026): the other 12 tabs are published as data/preview/: free tabs in full;
// Deployments, Components and their supporting tabs in every row at the public fields of server/src/access/fields.js
// and no other field (validateDatabase), or no row when counted only. Full rows of those tabs live only in the backend
// database. No file of the old open export (data/database/) may come back.
for (const problem of validateDatabase(database.index, database.tabs)) fail('data/preview', problem);
if (JSON.stringify(page.database) !== JSON.stringify(database.index)) fail('index.html', 'embedded database index differs from data/preview/index.json');
for (const file of tracked.filter((f) => f.startsWith('data/database/'))) fail(file, 'full rows of a premium tab must not be published (paywall)');
if (/data\/database\//.test(read('index.html'))) fail('index.html', 'loads the old full export (data/database)');
if (page.access?.open !== false) fail('index.html', 'page is still in open-database mode');
for (const t of page.database.tabs) if (page.database.tabs && t.rows) fail('index.html', `embeds rows of ${t.id}`);

// Rule 8 (approved split, phase 1, 17 Nov 2026; narrowed 24 Nov 2026): data/public/projection.json holds only
// allowlisted keys of server/src/public/projection.js (counts and summaries; never sites, task descriptions, metrics,
// claims, evidence levels, observation dates or notes).
for (const problem of projectionProblems(JSON.parse(read('data/public/projection.json')))) fail('data/public/projection.json', problem);

// Rule 7 (permanent pages, 17 Nov 2026): robots/, companies/, sitemap.xml, 404.html and data/pages.json are exactly the
// build of tools/build-pages.mjs, which reads only public inputs (free catalogue, public rows, public relations).
// Any hand edit, or a page for a company seen only in premium rows, fails here.
const pageBuild = buildPages().files;
// Every generated directory of the ten categories, Other Robots, the subscription page and Reports is checked too.
for (const file of tracked.filter((f) => /^(robots|companies|reports|method|subscribe|humanoids|deployments|components|integrators|software|datasets|benchmarks|investment|other-robots)\//.test(f) || ['sitemap.xml', '404.html', 'data/pages.json'].includes(f))) {
  if (!pageBuild.has(file)) fail(file, 'is not produced by tools/build-pages.mjs');
  else if (read(file) !== pageBuild.get(file)) fail(file, 'differs from the build of public inputs (node tools/build-pages.mjs)');
}

// Rule 9 (Robotics Evaluation Atlas, 23 Nov 2026): the Benchmarks snapshot holds only the allowlisted public fields of
// the Benchmarks and Benchmark Results tabs (server/src/benchmarks/atlas.js), never the workbook link or editorial history.
const { snapshotProblems } = await import('../server/src/benchmarks/atlas.js');
for (const problem of snapshotProblems(JSON.parse(read('data/benchmarks/atlas.json')))) fail('data/benchmarks/atlas.json', problem);
// Rule 10 (Robot Learning Data Atlas, 23 Nov 2026): the Datasets snapshot holds only the allowlisted public fields of the
// Datasets and Dataset Metrics tabs (server/src/data-atlas/atlas.js): never the workbook link, the classification note,
// the matrix reference or a clause about the private editorial material.
const { snapshotProblems: dataSnapshotProblems } = await import('../server/src/data-atlas/atlas.js');
for (const problem of dataSnapshotProblems(JSON.parse(read('data/datasets/atlas.json')))) fail('data/datasets/atlas.json', problem);
// Rule 11 (Components, 23 Nov 2026): the coverage file holds counts and component ids only, and the public Components
// rows (every product and the related software at their public fields) never carry the research workbook link, the
// import history or the compilation's prompt notes.
const { coverageProblems } = await import('./export-components.mjs');
for (const problem of coverageProblems(JSON.parse(read('data/components/coverage.json')))) fail('data/components/coverage.json', problem);
for (const f of ['data/preview/hardware.json', 'data/preview/component-software.json']) {
  const t = read(f);
  if (/"(no|source_workbook)":/.test(t)) fail(f, 'publishes a withheld Components column');
  if (/\bGrok\b|the query asked|check periodically|manufacturer verified/i.test(t)) fail(f, 'publishes import history or a prompt note');
}

// Rule 8 (Reports, 23 Nov 2026): the catalogue lists only records verified against the public original, with no private
// Google sheet, Drive or Docs link; extractions and findings of the staging sheet never reach the repository.
const { snapshotProblems: reportsProblems } = await import('../server/src/reports/atlas.js');
for (const problem of reportsProblems(JSON.parse(read('data/reports/atlas.json')))) fail('data/reports/atlas.json', problem);
for (const file of tracked) if (/\.(html|json|js|csv|xml|txt)$/.test(file) && isPublished(file) && /docs\.google\.com\/(spreadsheets|document)\/d\/|drive\.google\.com\/(file|drive|open)/.test(read(file))) fail(file, 'links a private Google sheet, document or Drive file');

if (failures.length) {
  console.error(`Public data guard FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `Public data guard passed: ${tracked.length} tracked files, ${tracked.filter(isPublished).length} published, ` +
    `${exported.records.length} free Humanoids records (public values only), ${premiumColumns.length} premium column names checked.`,
);
