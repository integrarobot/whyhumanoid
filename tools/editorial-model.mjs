// Editorial sections (Newsletter and News), 26 Nov 2026: the store, its validation, readiness and coverage.
//
// The store lives in editorial/, outside the published site (_config.yml excludes it):
//   editorial/config.json                  publication switch and scope
//   editorial/inventory.json               every edition the source listing shows, with its status and the pagination
//   editorial/editions/<edition_id>.json   one edition in English: main body, its More news items in source order,
//                                          the original publication date and the translation record
//   editorial/originals/<edition_id>.json  optional: the Spanish original of that edition, kept as evidence; when it
//                                          exists, the edition is tied to it by SHA-256 and checked against it
//   editorial/state.json                   what the last ingestion left (content hashes only, no clock)
// Only editions whose translation is marked reviewed, and whose original (if archived) has not changed since, are
// rendered. Originals are never shown on the site; readers get the canonical source URL instead.
// Contract and procedure: ops/editorial/README.md.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

export const EDITORIAL_DIR = 'editorial';
// Historical scope: the editions of 2025 and 2026. A later year is added to editorial/config.json scope.years in a
// reviewed change (ops/editorial/README.md, "A new year"), so the weekly feed never stops silently in January.
export const DEFAULT_YEARS = [2025, 2026];
export const yearsOf = (config) => (Array.isArray(config?.scope?.years) && config.scope.years.length ? config.scope.years : DEFAULT_YEARS);
// Today's date in Europe/Madrid, the time zone of the embargo and of the weekly schedule.
export const madridToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
// The sections are live only when the switch is on AND the embargo date (Europe/Madrid) has been reached.
export const isLive = (config, today = madridToday()) => config?.published === true && isDate(config?.embargo_until) && today >= config.embargo_until;
export const EDITION_ID = /^nl-(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const INVENTORY_STATUS = ['ingested', 'pending', 'inaccessible'];
export const MORE_NEWS_STATUS = ['present', 'absent', 'inaccessible'];
export const TRANSLATION_STATUS = ['draft', 'reviewed'];
// The heading that opens the More news block, in the Spanish source ("Más noticias de robótica e IA Física") and in
// English. A main body must not contain it: the block lives in more_news.
export const MORE_NEWS_ES = /^\s{0,3}(?:#{1,6}\s*)?(?:\*\*|__)?\s*m[aá]s\s+noticias\b/im;
export const MORE_NEWS_EN = /^\s{0,3}(?:#{1,6}\s*)?(?:\*\*|__)?\s*more\s+news\b/im;
const RAW_HTML = /<\/?[a-z][\s\S]*?>|<!--/i;
// Markdown links, found by one parser shared with the renderer (tools/editorial-view.mjs), so validation, hashes and
// pages always see the same URL. A URL may hold balanced parentheses, as in https://example.com/a_(b).
export function findLinks(text) {
  const s = String(text ?? '');
  const out = [];
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] !== '[') continue;
    const close = s.indexOf(']', i + 1);
    if (close < 0) break;
    if (s[close + 1] !== '(') continue;
    let j = close + 2;
    let depth = 0;
    while (j < s.length && !/\s/.test(s[j])) {
      if (s[j] === '(') depth += 1;
      else if (s[j] === ')') { if (!depth) break; depth -= 1; }
      j += 1;
    }
    const url = s.slice(close + 2, j);
    const title = s.slice(j).match(/^\s+"[^"]*"\s*/);
    const end = j + (title ? title[0].length : 0);
    if (!url || s[end] !== ')') continue;
    const image = i > 0 && s[i - 1] === '!';
    out.push({ start: image ? i - 1 : i, end: end + 1, image, label: s.slice(i + 1, close), url });
    i = end;
  }
  return out;
}
// Bare URLs in text outside links: up to whitespace, without trailing punctuation or an unbalanced closing parenthesis.
export const BARE_URL = /\bhttps?:\/\/[^\s<>]+/g;
export function trimUrl(u) {
  let url = u.replace(/[.,;:!?'"\]]+$/, '');
  while (url.endsWith(')') && (url.match(/\(/g) ?? []).length < (url.match(/\)/g) ?? []).length) url = url.slice(0, -1).replace(/[.,;:!?'"\]]+$/, '');
  return url;
}
// The text with every link replaced by its label (or blanks), for word counts and bare-URL search.
const withoutLinks = (text, keepLabel) => {
  const s = String(text ?? '');
  let out = '';
  let last = 0;
  for (const l of findLinks(s)) { out += `${s.slice(last, l.start)} ${keepLabel ? l.label : ''} `; last = l.end; }
  return out + s.slice(last);
};
// Common Spanish function words, as a guard against untranslated text in an English field. A ratio, not a ban: names
// such as "El Salvador" or "Los Angeles" stay well below it.
const SPANISH = new Set(['el', 'los', 'las', 'del', 'para', 'con', 'una', 'unos', 'unas', 'que', 'por', 'está', 'están', 'más', 'también', 'según', 'pero', 'como', 'sobre', 'esta', 'este', 'estos', 'estas', 'sus', 'entre', 'hasta', 'desde', 'cuando', 'porque', 'muy', 'sin', 'puede', 'pueden', 'hay', 'robótica', 'noticias']);
export const SPANISH_RATIO_LIMIT = 0.04;

export function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s; }
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
const webUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch { return false; } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Canonical JSON (keys sorted at every level) and its SHA-256: the identity of an original or an edition.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value ?? null);
}
export const sha256 = (text) => createHash('sha256').update(text).digest('hex');
export const contentHash = (value) => sha256(canonical(value));

// Every http(s) URL a Markdown text points to, links and bare URLs alike, as a sorted list without repeats.
export function urlsIn(markdown) {
  const out = new Set();
  for (const l of findLinks(markdown)) out.add(l.url);
  for (const m of withoutLinks(markdown, true).matchAll(BARE_URL)) out.add(trimUrl(m[0]));
  return [...out].sort();
}
export function spanishRatio(text) {
  const words = withoutLinks(text, true).replace(BARE_URL, ' ').toLowerCase().match(/\p{L}+/gu) ?? [];
  return words.length ? words.filter((w) => SPANISH.has(w)).length / words.length : 0;
}
// Problems in a Markdown text the renderer would refuse: raw HTML, and link targets that are not http(s).
export function markdownProblems(markdown, where) {
  const p = [];
  const text = String(markdown ?? '');
  if (RAW_HTML.test(text)) p.push(`${where}: raw HTML is not accepted (write Markdown)`);
  for (const l of findLinks(text)) if (!webUrl(l.url)) p.push(`${where}: link target is not an http(s) URL: ${l.url.slice(0, 60)}`);
  return p;
}

// A News item is identified by its edition and its position in that edition's More news block, never by its title:
// two editions may carry items with the same headline, and both are kept.
export const itemId = (editionId, position) => `${editionId}/${String(position).padStart(2, '0')}`;

function itemsProblems(items, at, { english }) {
  const p = [];
  if (!Array.isArray(items)) return [`${at}: more_news.items must be a list`];
  items.forEach((it, i) => {
    const w = `${at} item ${i + 1}`;
    if (it?.position !== i + 1) p.push(`${w}: positions must run 1, 2, 3... in the order of the source`);
    if (!nonEmpty(it?.headline)) p.push(`${w}: headline is empty`);
    if ((english ? MORE_NEWS_EN : MORE_NEWS_ES).test(it?.headline ?? '')) p.push(`${w}: the block heading is not an item`);
    p.push(...markdownProblems(`${it?.headline ?? ''}\n${it?.body_markdown ?? ''}`, w));
    if (english) {
      const r = spanishRatio(`${it?.headline ?? ''} ${it?.body_markdown ?? ''}`);
      if (r > SPANISH_RATIO_LIMIT * 2) p.push(`${w}: looks untranslated (${(r * 100).toFixed(1)}% Spanish function words)`);
    }
  });
  return p;
}
function moreNewsProblems(mn, at, { english }) {
  if (!mn || !MORE_NEWS_STATUS.includes(mn.status)) return [`${at}: more_news.status must be one of ${MORE_NEWS_STATUS.join(', ')}`];
  const p = itemsProblems(mn.items, at, { english });
  const n = Array.isArray(mn.items) ? mn.items.length : 0;
  if (mn.status === 'present' && !n) p.push(`${at}: More news is present but has no items`);
  if (mn.status !== 'present' && n) p.push(`${at}: More news is ${mn.status} but lists items`);
  if (mn.status === 'inaccessible' && !nonEmpty(mn.note)) p.push(`${at}: an inaccessible More news block needs a note saying why`);
  return p;
}

// The problems of one English edition: identity, dates, content and translation record.
export function editionProblems(e, { entry = null, original = null, years = DEFAULT_YEARS } = {}) {
  const at = `editions/${e?.edition_id ?? '?'}`;
  if (!e || typeof e !== 'object') return [`${at}: not an object`];
  const p = [];
  const id = e.edition_id;
  if (!EDITION_ID.test(id ?? '') || id.length > 90) p.push(`${at}: edition_id must look like nl-YYYY-MM-DD-slug (lowercase, at most 90 characters)`);
  if (!webUrl(e.source_url) || !String(e.source_url).startsWith('https://')) p.push(`${at}: source_url must be the canonical https URL of the original edition`);
  if (!isDate(e.published_on)) p.push(`${at}: published_on (original publication date) must be YYYY-MM-DD`);
  else {
    const m = id?.match(EDITION_ID);
    if (m && `${m[1]}-${m[2]}-${m[3]}` !== e.published_on) p.push(`${at}: the date in edition_id differs from published_on`);
    if (!years.includes(Number(e.published_on.slice(0, 4)))) p.push(`${at}: published_on ${e.published_on} is outside the scope years ${years.join(', ')}`);
  }
  if (!isDate(e.retrieved_on)) p.push(`${at}: retrieved_on must be YYYY-MM-DD`);
  else if (isDate(e.published_on) && e.retrieved_on < e.published_on) p.push(`${at}: retrieved before it was published`);
  if (e.source_language !== 'es') p.push(`${at}: source_language must be "es"`);
  if (e.language !== 'en') p.push(`${at}: language must be "en"`);
  if (!nonEmpty(e.author)) p.push(`${at}: author is empty (the byline as published)`);
  if (!nonEmpty(e.title)) p.push(`${at}: title is empty`);
  if (!nonEmpty(e.body_markdown)) p.push(`${at}: body_markdown is empty`);
  if (MORE_NEWS_EN.test(e.body_markdown ?? '') || MORE_NEWS_ES.test(e.body_markdown ?? '')) p.push(`${at}: the main body still contains the More news block; move it to more_news`);
  p.push(...markdownProblems(e.body_markdown, `${at} body`));
  const ratio = spanishRatio(`${e.title ?? ''} ${e.subtitle ?? ''} ${e.body_markdown ?? ''}`);
  if (ratio > SPANISH_RATIO_LIMIT) p.push(`${at}: looks untranslated (${(ratio * 100).toFixed(1)}% Spanish function words)`);
  p.push(...moreNewsProblems(e.more_news, at, { english: true }));
  const t = e.translation;
  if (!t || typeof t !== 'object') p.push(`${at}: translation record is missing`);
  else {
    if (!TRANSLATION_STATUS.includes(t.status)) p.push(`${at}: translation.status must be draft or reviewed`);
    if (!isDate(t.translated_on)) p.push(`${at}: translation.translated_on must be YYYY-MM-DD`);
    else if (isDate(e.published_on) && t.translated_on < e.published_on) p.push(`${at}: translated before the original was published`);
    if (!nonEmpty(t.translated_by)) p.push(`${at}: translation.translated_by is empty`);
    if (t.status === 'reviewed') {
      if (!nonEmpty(t.reviewed_by) || !isDate(t.reviewed_on)) p.push(`${at}: a reviewed translation names reviewed_by and reviewed_on`);
      if (!nonEmpty(t.review_evidence)) p.push(`${at}: a reviewed translation records review_evidence (what the reviewer compared and found)`);
      else if (isDate(t.translated_on) && t.reviewed_on < t.translated_on) p.push(`${at}: reviewed before it was translated`);
    }
  }
  if (entry) {
    if (entry.source_url !== e.source_url) p.push(`${at}: source_url differs from the inventory`);
    if (entry.published_on !== e.published_on) p.push(`${at}: published_on differs from the inventory`);
    if (entry.status !== 'ingested') p.push(`${at}: the inventory marks it ${entry.status}`);
  }
  // The Spanish original, when archived: same links, same items in the same order, and unchanged since translation.
  if (e.original_sha256 != null) {
    if (!original) p.push(`${at}: original_sha256 is set but editorial/originals/${id}.json is missing`);
    else {
      if (contentHash(original) !== e.original_sha256) p.push(`${at}: stale, the archived original changed after translation (original_sha256)`);
      if (!same(urlsIn(e.body_markdown), urlsIn(original.body_markdown))) p.push(`${at}: the body does not keep exactly the links of the original`);
      const src = original.more_news?.items ?? [];
      const items = e.more_news?.items ?? [];
      if (original.more_news?.status !== e.more_news?.status) p.push(`${at}: More news status differs from the original`);
      if (items.length !== src.length) p.push(`${at}: ${items.length} More news items for ${src.length} in the original`);
      items.forEach((it, i) => {
        const o = src[i];
        if (o && !same(urlsIn(`${it.headline} ${it.body_markdown ?? ''}`), urlsIn(`${o.headline} ${o.body_markdown ?? ''}`))) p.push(`${at} item ${i + 1}: does not keep exactly the links of the original item`);
      });
    }
  } else if (original) p.push(`${at}: an original is archived but original_sha256 is not set`);
  return p;
}

// The problems of one archived Spanish original.
export function originalProblems(o) {
  const at = `originals/${o?.edition_id ?? '?'}`;
  if (!o || typeof o !== 'object') return [`${at}: not an object`];
  const p = [];
  if (!EDITION_ID.test(o.edition_id ?? '')) p.push(`${at}: edition_id must look like nl-YYYY-MM-DD-slug`);
  if (o.language !== 'es') p.push(`${at}: language must be "es"`);
  if (!nonEmpty(o.title)) p.push(`${at}: title is empty`);
  if (!nonEmpty(o.body_markdown)) p.push(`${at}: body_markdown is empty`);
  if (MORE_NEWS_ES.test(o.body_markdown ?? '')) p.push(`${at}: the main body still contains the More news block; move it to more_news`);
  p.push(...markdownProblems(o.body_markdown, `${at} body`));
  p.push(...moreNewsProblems(o.more_news, at, { english: false }));
  return p;
}

export function inventoryProblems(inv, { years = DEFAULT_YEARS } = {}) {
  if (!inv || typeof inv !== 'object' || !Array.isArray(inv.editions)) return ['inventory.json: editions must be a list'];
  const p = [];
  const ids = new Set();
  const urls = new Set();
  for (const e of inv.editions) {
    const at = `inventory ${e?.edition_id ?? '?'}`;
    if (!EDITION_ID.test(e?.edition_id ?? '')) p.push(`${at}: edition_id must look like nl-YYYY-MM-DD-slug`);
    if (ids.has(e?.edition_id)) p.push(`${at}: listed twice`);
    ids.add(e?.edition_id);
    if (urls.has(e?.source_url)) p.push(`${at}: source_url listed twice (${e?.source_url})`);
    urls.add(e?.source_url);
    if (!webUrl(e?.source_url)) p.push(`${at}: source_url is not an http(s) URL`);
    if (!isDate(e?.published_on) || !years.includes(Number(e.published_on.slice(0, 4)))) p.push(`${at}: published_on must be a date in the scope years ${years.join(', ')}`);
    else if (EDITION_ID.test(e.edition_id ?? '') && e.edition_id.slice(3, 13) !== e.published_on) p.push(`${at}: the date in edition_id differs from published_on`);
    if (!INVENTORY_STATUS.includes(e?.status)) p.push(`${at}: status must be one of ${INVENTORY_STATUS.join(', ')}`);
    if (e?.status === 'inaccessible' && !nonEmpty(e.note)) p.push(`${at}: an inaccessible edition needs a note saying why`);
  }
  const pg = inv.pagination ?? {};
  if (!Array.isArray(pg.pages)) p.push('inventory.json: pagination.pages must list the listing pages read');
  else {
    if (pg.pages.some((u) => !webUrl(u) || !String(u).startsWith('https://'))) p.push('inventory.json: every pagination page must be an https URL');
    if (new Set(pg.pages).size !== pg.pages.length) p.push('inventory.json: a pagination page is listed twice');
  }
  // Provenance of the converted documents: name and SHA-256 of each.
  const files = inv.source?.files;
  if (files != null && (!Array.isArray(files) || files.some((f) => !nonEmpty(f?.name) || !/^[0-9a-f]{64}$/.test(f?.sha256 ?? '')))) p.push('inventory.json: source.files must list { name, sha256 } with a 64-character hex SHA-256');
  if (typeof pg.exhausted !== 'boolean') p.push('inventory.json: pagination.exhausted must be true or false');
  if (inv.complete !== true && inv.complete !== false) p.push('inventory.json: complete must be true or false');
  // A complete archive is a claim with evidence: the listing read to its last page, the source and its date, every
  // edition accounted for, and who declared it, after the listing was read.
  if (inv.complete === true) {
    if (pg.exhausted !== true) p.push('inventory.json: complete needs pagination.exhausted');
    if (!Array.isArray(pg.pages) || !pg.pages.length) p.push('inventory.json: complete needs the listing pages read (pagination.pages)');
    if (!webUrl(inv.source?.listing_url) || !String(inv.source.listing_url).startsWith('https://')) p.push('inventory.json: complete needs source.listing_url (https)');
    if (!isDate(inv.source?.retrieved_on)) p.push('inventory.json: complete needs source.retrieved_on');
    if (!Array.isArray(inv.source?.files) || !inv.source.files.length) p.push('inventory.json: complete needs source.files (the converted documents and their SHA-256)');
    if (!inv.editions.length) p.push('inventory.json: complete with no edition listed');
    if (inv.editions.some((e) => e.status === 'pending')) p.push('inventory.json: complete with editions still pending');
    if (!nonEmpty(inv.completeness?.declared_by) || !isDate(inv.completeness?.declared_on)) p.push('inventory.json: complete needs completeness.declared_by and declared_on');
    else if (isDate(inv.source?.retrieved_on) && inv.completeness.declared_on < inv.source.retrieved_on) p.push('inventory.json: completeness declared before the listing was read');
    if (!nonEmpty(inv.completeness?.evidence)) p.push('inventory.json: complete needs completeness.evidence (how the inventory was reconciled with the listing)');
  }
  return p;
}

const readJson = (root, p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const listJson = (root, dir) => (existsSync(new URL(`${dir}/`, root)) ? readdirSync(new URL(`${dir}/`, root)).filter((f) => f.endsWith('.json')).sort() : []);

// The committed store, read from disk.
export function readStore(root, dir = EDITORIAL_DIR) {
  const config = readJson(root, `${dir}/config.json`);
  const inventory = readJson(root, `${dir}/inventory.json`);
  const editions = new Map(listJson(root, `${dir}/editions`).map((f) => [f.replace(/\.json$/, ''), readJson(root, `${dir}/editions/${f}`)]));
  const originals = new Map(listJson(root, `${dir}/originals`).map((f) => [f.replace(/\.json$/, ''), readJson(root, `${dir}/originals/${f}`)]));
  const state = existsSync(new URL(`${dir}/state.json`, root)) ? readJson(root, `${dir}/state.json`) : null;
  return { config, inventory, editions, originals, state };
}

// Every problem of a store: config, inventory, editions, originals and the links between them.
export function storeProblems(store, { today = madridToday() } = {}) {
  const p = [];
  const { config, inventory, editions, originals } = store;
  const years = yearsOf(config);
  if (typeof config?.published !== 'boolean') p.push('config.json: published must be true or false');
  if (!isDate(config?.embargo_until)) p.push('config.json: embargo_until must be YYYY-MM-DD (Europe/Madrid)');
  else if (config.published === true && today < config.embargo_until) p.push(`config.json: published before the embargo date ${config.embargo_until} (Europe/Madrid, today ${today})`);
  if (config?.scope?.years != null) {
    const ys = config.scope.years;
    if (!Array.isArray(ys) || !ys.length || ys.some((y) => !Number.isInteger(y) || y < 2025) || new Set(ys).size !== ys.length || ys.some((y, i) => i && y !== ys[i - 1] + 1) || ys[0] !== 2025) p.push('config.json: scope.years must be consecutive years from 2025, e.g. [2025, 2026]');
  }
  p.push(...inventoryProblems(inventory, { years }));
  const entries = new Map((inventory?.editions ?? []).map((e) => [e.edition_id, e]));
  const urls = new Map();
  for (const [file, e] of editions) {
    if (e?.edition_id !== file) p.push(`editions/${file}.json: edition_id ${e?.edition_id} does not match the file name`);
    if (!entries.has(e?.edition_id)) p.push(`editions/${file}: not in the inventory`);
    p.push(...editionProblems(e, { entry: entries.get(e?.edition_id) ?? null, original: originals.get(e?.edition_id) ?? null, years }));
    if (isDate(e?.published_on) && e.published_on > today) p.push(`editions/${file}: published_on is in the future`);
    if (isDate(e?.translation?.translated_on) && e.translation.translated_on > today) p.push(`editions/${file}: translated_on is in the future`);
    if (urls.has(e?.source_url)) p.push(`editions/${file}: same source_url as ${urls.get(e.source_url)}`);
    urls.set(e?.source_url, file);
  }
  for (const [file, o] of originals) {
    if (o?.edition_id !== file) p.push(`originals/${file}.json: edition_id does not match the file name`);
    if (!editions.has(file)) p.push(`originals/${file}: archived without an edition`);
    p.push(...originalProblems(o));
  }
  for (const e of entries.values()) if (e.status === 'ingested' && !editions.has(e.edition_id)) p.push(`inventory ${e.edition_id}: marked ingested but has no edition`);
  return p;
}

// Editions ready to publish: valid, translation reviewed, original (if archived) unchanged. Newest first.
export function readyEditions(store) {
  const entries = new Map(store.inventory.editions.map((e) => [e.edition_id, e]));
  const out = [];
  for (const [id, e] of store.editions) {
    if (e.translation?.status !== 'reviewed') continue;
    if (editionProblems(e, { entry: entries.get(id) ?? null, original: store.originals.get(id) ?? null, years: yearsOf(store.config) }).length) continue;
    out.push({
      id, source_url: e.source_url, published_on: e.published_on, author: e.author,
      title: e.title, subtitle: e.subtitle ?? null, body_markdown: e.body_markdown,
      translated_on: e.translation.translated_on,
      more_news_status: e.more_news.status, more_news_note: e.more_news.note ?? null,
      items: e.more_news.items.map((it) => ({ id: itemId(id, it.position), position: it.position, headline: it.headline, body_markdown: it.body_markdown ?? '' })),
    });
  }
  return out.sort((a, b) => b.published_on.localeCompare(a.published_on) || a.id.localeCompare(b.id));
}

// Coverage by year: what the listing shows, what is ingested, reviewed and ready, and the exceptions. It never claims
// completeness unless the inventory itself declares it, with exhausted pagination and a named reviewer.
export function coverage(store) {
  const ready = new Set(readyEditions(store).map((e) => e.id));
  const years = {};
  for (const y of yearsOf(store.config)) years[y] = { listed: 0, ingested: 0, pending: 0, inaccessible: 0, more_news: { present: 0, absent: 0, inaccessible: 0 }, news_items: 0, translations: { reviewed: 0, draft: 0 }, originals_archived: 0, ready_editions: 0, ready_news_items: 0 };
  for (const entry of store.inventory.editions) {
    const y = years[Number(entry.published_on?.slice(0, 4))];
    if (!y) continue;
    y.listed += 1;
    y[entry.status] = (y[entry.status] ?? 0) + 1;
    const e = store.editions.get(entry.edition_id);
    if (!e) continue;
    if (y.more_news[e.more_news?.status] !== undefined) y.more_news[e.more_news.status] += 1;
    y.news_items += e.more_news?.items?.length ?? 0;
    if (e.translation?.status === 'reviewed') y.translations.reviewed += 1; else y.translations.draft += 1;
    if (store.originals.has(entry.edition_id)) y.originals_archived += 1;
    if (ready.has(entry.edition_id)) { y.ready_editions += 1; y.ready_news_items += e.more_news?.items?.length ?? 0; }
  }
  const inv = store.inventory;
  return {
    published: store.config.published,
    live: isLive(store.config),
    embargo_until: store.config.embargo_until ?? null,
    complete: inv.complete === true,
    completeness: inv.complete === true ? inv.completeness : null,
    pagination: { pages_read: inv.pagination?.pages?.length ?? 0, exhausted: inv.pagination?.exhausted === true },
    years,
  };
}
