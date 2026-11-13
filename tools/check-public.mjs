#!/usr/bin/env node
// Guard for the public repository and the GitHub Pages site. Fails if premium data or workbook links could
// leak through Git, the published site or the free export. Run in CI on every pull request.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { DATASETS, DATASETS_BY_ID } from '../server/src/datasets.js';

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
const premiumColumns = [
  ...new Set(DATASETS.flatMap((d) => d.fields ?? d.headers).filter((h) => h.includes('_'))),
].filter((h) => !humanoidFields.has(h));

for (const file of tracked.filter(isText)) {
  const text = read(file);
  if (driveId.test(text)) fail(file, 'contains a Google Drive file id', driveId.find(text).slice(0, 8));
  if (workbookUrl.test(text)) fail(file, 'contains a Google Docs/Sheets URL');
  if (premiumId.test(text)) fail(file, 'contains a premium-style record id', text.match(premiumId)[0]);
  if (isPublished(file) || file.startsWith('server/public/')) {
    const leaked = premiumColumns.filter((c) => new RegExp(`\\b${c}\\b`).test(text));
    if (leaked.length) fail(file, 'published file mentions premium columns', leaked.slice(0, 5).join(', '));
  }
}

// Rule 4: published server, tooling and test code must stay out of the Pages artifact.
for (const dir of ['server', 'tools', '.github']) {
  if (tracked.some((f) => f.startsWith(`${dir}/`) && isPublished(f))) fail('_config.yml', `does not exclude ${dir}/`);
}

// Rule 5: the only public rows are the free Humanoids catalogue: allowlisted fields, public (cleaned) values,
// no row the sheet marks as internal, and nothing from the 12 other tabs or the paid values.
for (const old of ['data/humanoids.json', 'data/humanoids.csv', 'data/humanoids-preview.json', 'data/humanoids-preview.csv']) {
  if (tracked.includes(old)) fail(old, 'only data/humanoids-catalogue.* may hold public rows');
}
for (const file of tracked.filter((f) => f.startsWith('data/'))) {
  if (!['data/humanoids-catalogue.json', 'data/humanoids-catalogue.csv', 'data/manifest.json'].includes(file)) fail(file, 'unexpected public data file');
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

if (failures.length) {
  console.error(`Public data guard FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `Public data guard passed: ${tracked.length} tracked files, ${tracked.filter(isPublished).length} published, ` +
    `${exported.records.length} free Humanoids records (public values only), ${premiumColumns.length} premium column names checked.`,
);
