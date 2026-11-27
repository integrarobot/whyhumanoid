#!/usr/bin/env node
// Newsletter and News: ingestion, validation and coverage of the editorial store (tools/editorial-model.mjs).
//
//   node tools/editorial.mjs ingest --package <package.json> [--dry-run] [--accept-change <id>,...] [--accept-item-change <id>,...]
//   node tools/editorial.mjs check                  validate the committed store (CI)
//   node tools/editorial.mjs report [--json]        coverage by year; never claims completeness on its own
//   node tools/editorial.mjs template               print an empty package to fill in
//
// A package is one JSON file (contract: ops/editorial/README.md). Ingestion is idempotent and incremental: the same
// package twice changes nothing; a package may carry only new editions. It validates the whole store as it would be
// after the import and writes nothing if anything is wrong. It never removes an edition already ingested. An edition
// whose translation is already reviewed changes only with --accept-change <edition_id>. A News item is addressed by
// edition and position, so any change of which story sits at a position (a new count, a reorder, another item) needs
// --accept-item-change <edition_id>, and is refused outright for an edition already live on the site: its item URLs
// must keep pointing at the same stories.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EDITORIAL_DIR, contentHash, coverage, isLive, readStore, readyEditions, sha256, storeProblems, urlsIn } from './editorial-model.mjs';

const root = new URL('../', import.meta.url);
const json = (v) => `${JSON.stringify(v, null, 2)}\n`;
const EDITION_KEYS = ['edition_id', 'source_url', 'published_on', 'retrieved_on', 'source_language', 'language', 'author', 'title', 'subtitle', 'body_markdown', 'more_news', 'translation', 'original_sha256'];

export const TEMPLATE = {
  package_version: 1,
  source: {
    publication: 'Integrarobot',
    listing_url: 'https://… (the archive or listing page the inventory was read from)',
    retrieved_on: 'YYYY-MM-DD',
    files: [{ name: 'articulos-integrarobot-desde-2025.md', sha256: '…' }, { name: 'mas-noticias-integrarobot-desde-2025.md', sha256: '…' }],
    pagination: { pages: ['https://… page 1', 'https://… page 2'], exhausted: false, note: '' },
  },
  complete: false,
  completeness: null,
  inventory: [{ edition_id: 'nl-YYYY-MM-DD-short-slug', source_url: 'https://…', published_on: 'YYYY-MM-DD', status: 'ingested | pending | inaccessible', note: null }],
  editions: [{
    edition_id: 'nl-YYYY-MM-DD-short-slug', source_url: 'https://… canonical URL of the original', published_on: 'YYYY-MM-DD (original publication)',
    retrieved_on: 'YYYY-MM-DD', source_language: 'es', language: 'en', author: 'byline as published',
    title: 'English title', subtitle: null, body_markdown: 'English main body, without the More news block',
    more_news: { status: 'present | absent | inaccessible', note: null, items: [{ position: 1, headline: 'English headline', body_markdown: 'English text with its [source](https://…)' }] },
    translation: { translated_on: 'YYYY-MM-DD', translated_by: 'who translated (agent or person)', status: 'draft | reviewed', reviewed_by: null, reviewed_on: null, review_evidence: null },
    original: null,
  }],
};

function packageProblems(pkg) {
  const p = [];
  if (pkg?.package_version !== 1) p.push('package_version must be 1');
  if (!pkg?.source || typeof pkg.source !== 'object') p.push('source is missing');
  else if (!pkg.source.pagination) p.push('source.pagination is missing');
  if (!Array.isArray(pkg?.inventory)) p.push('inventory must be a list');
  if (!Array.isArray(pkg?.editions)) p.push('editions must be a list');
  // Repeats inside the package itself (merging by id would hide them).
  const dup = (list, key, what) => { const seen = new Set(); for (const x of list ?? []) { if (seen.has(x?.[key])) p.push(`${what} ${x?.[key]}: listed twice in the package`); seen.add(x?.[key]); } };
  dup(pkg?.inventory, 'edition_id', 'inventory');
  dup(pkg?.inventory, 'source_url', 'inventory source_url');
  dup(pkg?.editions, 'edition_id', 'edition');
  dup(pkg?.editions, 'source_url', 'edition source_url');
  for (const e of pkg?.editions ?? []) {
    const extra = Object.keys(e ?? {}).filter((k) => ![...EDITION_KEYS, 'original'].includes(k));
    if (extra.length) p.push(`edition ${e?.edition_id ?? '?'}: unknown fields ${extra.join(', ')}`);
  }
  return p;
}

// What story sits at each position: its links, or its headline when it has none (normalised). Count, order and
// identity changes all show here; a typo fixed in the text of an item with links does not.
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const itemIdentity = (e) => JSON.stringify((e?.more_news?.items ?? []).map((it) => { const u = urlsIn(`${it.headline ?? ''} ${it.body_markdown ?? ''}`); return u.length ? u : norm(it.headline); }));

// The store after a package, in memory, with the files to write and what changed.
export function planIngest(store, pkg, { accept = [], acceptItems = [] } = {}) {
  const problems = packageProblems(pkg);
  if (problems.length) return { problems };
  const next = {
    config: store.config,
    inventory: { ...store.inventory, source: { publication: pkg.source.publication ?? null, listing_url: pkg.source.listing_url ?? null, retrieved_on: pkg.source.retrieved_on ?? null, files: pkg.source.files ?? null }, pagination: pkg.source.pagination, complete: pkg.complete === true, completeness: pkg.completeness ?? null },
    editions: new Map(store.editions),
    originals: new Map(store.originals),
  };
  const entries = new Map(store.inventory.editions.map((e) => [e.edition_id, e]));
  for (const e of pkg.inventory) entries.set(e.edition_id, { edition_id: e.edition_id, source_url: e.source_url, published_on: e.published_on, status: e.status, note: e.note ?? null });
  next.inventory.editions = [...entries.values()].sort((a, b) => a.published_on.localeCompare(b.published_on) || a.edition_id.localeCompare(b.edition_id));
  const changes = { added: [], changed: [], unchanged: [], originals: [], item_identity_changed: [] };
  const live = new Set(isLive(store.config) ? readyEditions(store).map((e) => e.id) : []);
  for (const raw of pkg.editions) {
    const id = raw.edition_id;
    const { original, ...rest } = raw;
    const edition = Object.fromEntries(EDITION_KEYS.map((k) => [k, rest[k] ?? null]));
    if (original) {
      const o = { edition_id: id, ...original };
      const h = contentHash(o);
      if (raw.original_sha256 && raw.original_sha256 !== h) problems.push(`edition ${id}: original_sha256 does not match the original it carries`);
      edition.original_sha256 = h;
      const prev = store.originals.get(id);
      if (!prev || contentHash(prev) !== h) { next.originals.set(id, o); changes.originals.push(id); }
    } else if (store.originals.has(id)) edition.original_sha256 = contentHash(store.originals.get(id));
    const prev = store.editions.get(id);
    if (!prev) { changes.added.push(id); next.editions.set(id, edition); continue; }
    if (contentHash(prev) === contentHash(edition)) { changes.unchanged.push(id); continue; }
    if (itemIdentity(prev) !== itemIdentity(edition)) {
      if (live.has(id)) { problems.push(`edition ${id}: live on the site; its News items may not change which story each address shows (retire or redirect them in a reviewed code change first)`); continue; }
      if (!acceptItems.includes(id)) { problems.push(`edition ${id}: the News items change count, order or identity; pass --accept-item-change ${id} only to correct a wrong mapping before publication`); continue; }
      changes.item_identity_changed.push(id);
    }
    if (prev.translation?.status === 'reviewed' && !accept.includes(id)) { problems.push(`edition ${id}: already reviewed; pass --accept-change ${id} to replace it`); continue; }
    changes.changed.push(id);
    next.editions.set(id, edition);
  }
  for (const id of store.editions.keys()) if (entries.get(id)?.status !== 'ingested') problems.push(`edition ${id}: already ingested; the inventory may not mark it ${entries.get(id)?.status ?? 'missing'}`);
  problems.push(...storeProblems(next));
  return { problems, next, changes };
}

export function stateOf(store, packageText) {
  return {
    note: 'Written by tools/editorial.mjs ingest: the last package and the content hash of every edition and original. No clock.',
    last_package_sha256: packageText ? sha256(packageText) : null,
    editions: Object.fromEntries([...store.editions].sort().map(([id, e]) => [id, contentHash(e)])),
    originals: Object.fromEntries([...store.originals].sort().map(([id, o]) => [id, contentHash(o)])),
  };
}

// Files a store becomes, relative to the repository root.
export function storeFiles(store, packageText) {
  const files = new Map([[`${EDITORIAL_DIR}/inventory.json`, json(store.inventory)], [`${EDITORIAL_DIR}/state.json`, json(stateOf(store, packageText))]]);
  for (const [id, e] of store.editions) files.set(`${EDITORIAL_DIR}/editions/${id}.json`, json(e));
  for (const [id, o] of store.originals) files.set(`${EDITORIAL_DIR}/originals/${id}.json`, json(o));
  return files;
}

function report(store) {
  const c = coverage(store);
  const lines = [`Editorial coverage (switch: ${c.published ? 'on' : 'off'}; live: ${c.live ? 'yes' : `no, embargo until ${c.embargo_until}`}).`];
  for (const [y, v] of Object.entries(c.years)) {
    lines.push(`${y}: ${v.listed} editions listed (${v.ingested} ingested, ${v.pending} pending, ${v.inaccessible} inaccessible); More news ${v.more_news.present} present, ${v.more_news.absent} absent, ${v.more_news.inaccessible} inaccessible; ${v.news_items} News items; translations ${v.translations.reviewed} reviewed, ${v.translations.draft} draft; ${v.originals_archived} Spanish originals archived; ready to publish: ${v.ready_editions} editions, ${v.ready_news_items} News items.`);
  }
  lines.push(`Listing pages read: ${c.pagination.pages_read}; pagination exhausted: ${c.pagination.exhausted ? 'yes' : 'no'}.`);
  lines.push(c.complete ? `Inventory declared complete by ${c.completeness.declared_by} on ${c.completeness.declared_on}.` : 'Coverage is not declared complete.');
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd] = process.argv.slice(2);
  const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
  const store = readStore(root);
  if (cmd === 'check') {
    const problems = storeProblems(store);
    const state = stateOf(store, null);
    if (store.state && JSON.stringify({ ...store.state, last_package_sha256: null }) !== JSON.stringify(state)) problems.push('state.json does not match the store (edit the store only through ingest)');
    if (problems.length) { console.error(`Editorial store check FAILED (${problems.length}):\n- ${problems.join('\n- ')}`); process.exit(1); }
    console.log(`Editorial store ok: ${store.inventory.editions.length} editions listed, ${store.editions.size} ingested, ${readyEditions(store).length} ready to publish; published: ${store.config.published ? 'yes' : 'no'}.`);
  } else if (cmd === 'report') {
    console.log(process.argv.includes('--json') ? JSON.stringify(coverage(store), null, 2) : report(store));
  } else if (cmd === 'template') {
    console.log(JSON.stringify(TEMPLATE, null, 2));
  } else if (cmd === 'ingest') {
    const file = arg('--package');
    if (!file || !existsSync(file)) { console.error('usage: node tools/editorial.mjs ingest --package <package.json> [--dry-run] [--accept-change <id>,...]'); process.exit(2); }
    const text = readFileSync(file, 'utf8');
    let pkg;
    try { pkg = JSON.parse(text); } catch (e) { console.error(`package is not JSON: ${e.message}`); process.exit(1); }
    const list = (n) => (arg(n) ?? '').split(',').filter(Boolean);
    const { problems, next, changes } = planIngest(store, pkg, { accept: list('--accept-change'), acceptItems: list('--accept-item-change') });
    if (problems.length) { console.error(`Ingestion refused, nothing written (${problems.length}):\n- ${problems.join('\n- ')}`); process.exit(1); }
    const files = storeFiles(next, text);
    const written = [];
    for (const [f, body] of files) {
      const u = new URL(f, root);
      const before = existsSync(u) ? readFileSync(u, 'utf8') : null;
      // The package hash alone changing is not a change of content.
      if (before === body || (f.endsWith('/state.json') && before && JSON.stringify({ ...JSON.parse(before), last_package_sha256: null }) === JSON.stringify({ ...JSON.parse(body), last_package_sha256: null }))) continue;
      written.push(f);
      if (!process.argv.includes('--dry-run')) { mkdirSync(new URL('./', u), { recursive: true }); writeFileSync(u, body); }
    }
    console.log(`${process.argv.includes('--dry-run') ? 'Dry run: would write' : 'Wrote'} ${written.length} files. Editions: ${changes.added.length} added, ${changes.changed.length} changed (${changes.item_identity_changed.length} with News item identity changes), ${changes.unchanged.length} unchanged; ${changes.originals.length} originals archived or updated.`);
    console.log(report(next));
  } else {
    console.error('usage: node tools/editorial.mjs ingest|check|report|template');
    process.exit(2);
  }
}
