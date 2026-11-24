// Global search over the 13 categories (Javier, 17 Nov 2026). The index is rebuilt by every import in two scopes:
// 'preview' from the public rows and values only (every row of a free tab; every row of Deployments and Components at
// its public fields, server/src/access/fields.js) and 'full' from every customer row. The API picks the scope from the server-side entitlement check
// BEFORE it searches, filters, counts or builds a snippet, so visitors never get premium content in any form.

import { DATASETS, DATASETS_BY_ID, publicRowLimit, publicRowSql, publicValuesSql } from '../datasets.js';
import { norm, normMap, likeEscape } from './normalize.js';
import { FACETS, FACET_LABELS, SYNONYMS, STOPWORDS, isKnownTag, tagLabel, tagsFor } from './vocabulary.js';
import { STATUS_LABELS } from '../public/projection.js';

export const PAGE_SIZE = 20;
const MAX_TERMS = 8;
const INTERNAL = new Set(['identity_status', 'source_rows', 'id']);
const NA = /^(not\b|n\/?a$|unknown$|unspecified$|not_disclosed$)/i;
const nz = (v) => v !== null && v !== undefined && String(v).trim() !== '' && !NA.test(String(v).trim());
const human = (v) => String(v ?? '').replace(/_/g, ' ');
const short = (v, n = 110) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s; };
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
// Company dossiers (approved split, phase 1) are a search category of their own, built from the public projection
// only (server/src/public/projection.js), so the same allowlisted values serve visitors and subscribers.
const CATEGORIES = [{ id: 'companies', title: 'Companies' }, ...DATASETS];
const CATEGORY_BY_ID = new Map(CATEGORIES.map((d) => [d.id, d]));
const ORDER = new Map(CATEGORIES.map((d, i) => [d.id, i]));
const ROLE_LABELS = { maker: 'Maker', customer_operator: 'Operator or customer', customer_investor: 'Customer and investor', technology_partner: 'Technology partner or integrator' };

// One document per company of the projection. Visitors are sent to the public company page; subscribers to the
// company view of the app.
export function companyDocs(projection, scope) {
  return (projection?.companies ?? []).map((c, i) => {
    const sums = [c.as_organisation, c.as_maker].filter(Boolean);
    const records = sums.reduce((n, x) => n + x.records, 0);
    const roles = Object.keys(c.roles ?? {}).map((k) => ROLE_LABELS[k] || human(k));
    const values = [
      c.name, ...roles, ...(c.countries ?? []), c.entity?.canonical_name, human(c.entity?.entity_type ?? ''),
      ...sums.flatMap((x) => [...x.sectors.map(human), ...x.site_countries, ...x.counterparts.flatMap((p) => [p.name, p.robot_recorded, ...Object.entries(p.status).filter(([, n]) => n).map(([k]) => STATUS_LABELS[k])])]),
    ].filter(nz);
    const tags = new Set();
    for (const x of sums) {
      for (const sector of x.sectors) for (const t of tagsFor('deployments', { sector })) tags.add(t);
      for (const country of x.site_countries) for (const t of tagsFor('deployments', { country })) tags.add(t);
    }
    for (const country of c.countries ?? []) for (const t of tagsFor('deployments', { organization_country: country })) tags.add(t);
    return {
      dataset: 'companies',
      row_id: c.id,
      position: i,
      title: c.name,
      subtitle: [roles.join(', '), (c.countries ?? []).join(', '), records ? `${records} deployment record${records === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · '),
      names: `|${[...new Set([c.name, c.entity?.canonical_name].filter(nz).map(norm))].join('|')}|`,
      haystack: ` ${norm(values.join(' '))} `,
      tags: `|${[...tags].join('|')}|`,
      link: scope === 'full' ? `company/${c.id}` : `/companies/${c.slug}/`,
    };
  });
}

// Title, subtitle, names (for exact matches) and the default context field of a row, per category.
function describe(datasetId, d) {
  const join = (...xs) => xs.filter(nz).map(human).join(' · ');
  switch (datasetId) {
    case 'humanoids': {
      const robot = nz(d.Robot) && d.Robot !== 'Unnamed' ? d.Robot : 'Undisclosed model';
      return { title: `${robot} by ${d.Lab ?? ''}`.trim(), subtitle: join(d.Country), names: [d.Robot, d.Lab], context: 'Buyer checks' };
    }
    case 'deployments': {
      const robot = [d.manufacturer, d.robot_model].filter(nz).join(' ');
      return {
        title: [d.organization_name, robot].filter(nz).join(' · ') || d.record_id,
        subtitle: join(d.site_name, d.city, d.country, d.task_category, d.operational_status),
        names: [d.organization_name, d.manufacturer, d.robot_model, d.site_name, d.record_id],
        context: 'task_description',
      };
    }
    case 'stocks':
      return { title: nz(d.ticker) ? `${d.name} (${d.ticker})` : d.name, subtitle: join(d.exchange, d.country, d.segment), names: [d.name, d.ticker, d.isin], context: 'description' };
    case 'entities':
      return { title: d.canonical_name || d.entity_id, subtitle: join(d.entity_type, d.identity_scope), names: [d.canonical_name, d.source_label, d.entity_id], context: 'notes' };
    case 'evidence-links':
      return { title: short(d.statement, 90) || d.link_id, subtitle: join(d.stage_at_source_date, d.task_relevance), names: [d.link_id], context: 'limitations' };
    case 'task-evaluations':
      return { title: [d.model, d.task_id].filter(nz).map(human).join(' · '), subtitle: short(d.decision_reason, 90), names: [d.model, d.model_id], context: 'decision_reason' };
    case 'container-handling':
      return { title: d.element || d.layer, subtitle: human(d.layer), names: [d.element], context: 'result' };
    case 'datasets':
      return { title: d.name || d.dataset_id, subtitle: join(d.resource_class, d.data_origin, d.embodiment), names: [d.name, d.dataset_id], context: 'description' };
    case 'dataset-metrics': {
      const qual = { more_than: 'more than ', approximate: 'about ' }[d.qualifier] ?? '';
      return { title: [d.dataset_id, nz(d.value) ? `${qual}${d.value} ${d.unit ?? ''}`.trim() : human(d.metric)].filter(nz).join(' · '), subtitle: join(d.metric, d.scope, d.release_status), names: [d.metric_id], context: 'limitations' };
    }
    case 'hardware':
    case 'component-software':
      return { title: d.name || d.component_id, subtitle: join(d.family, d.group, d.principle), names: [d.name, d.component_id], context: 'measured' };
    case 'data-space':
      return { title: d.topic || d.record_id, subtitle: join(d.workstream, d.epistemic_status), names: [d.topic, d.record_id], context: 'finding_or_proposal' };
    default: {
      const list = { software: 'Software', world_model: 'World model', edubot: 'Educational robot', other_robot: '', dataset: '', hardware: '', integrator: '' }[d.list] ?? '';
      return { title: d.name || host(d.url) || '', subtitle: [list, host(d.url)].filter(Boolean).join(' · '), names: [d.name], context: 'description' };
    }
  }
}

// One search document per row. Names hold the record's own names and reviewed public aliases; the haystack holds
// every served value plus the labels of its tags, all normalised.
export function searchDoc(datasetId, row, { catalogueId = null, aliases = [] } = {}, unmapped = []) {
  const d = row.data;
  const tags = tagsFor(datasetId, d, unmapped);
  const { title, subtitle, names } = describe(datasetId, d);
  const nameList = [...new Set([...names, ...aliases].filter(nz).map(norm).filter(Boolean))];
  const values = Object.entries(d).filter(([k, v]) => !INTERNAL.has(k) && v !== null && v !== undefined).map(([, v]) => String(v).replace(/https?:\/\//g, ' '));
  const haystack = ` ${norm([...values, ...tags.map(tagLabel), ...aliases].join(' '))} `;
  const link = datasetId === 'humanoids' && catalogueId ? `robot/${catalogueId}` : `${datasetId}/${row.id}`;
  return { dataset: datasetId, row_id: row.id, position: row.position, title: String(title ?? ''), subtitle: String(subtitle ?? ''), names: `|${nameList.join('|')}|`, haystack, tags: `|${tags.join('|')}|`, link };
}

// Statements that replace both scopes. rowsOf(datasetId, scope) gives the imported rows ({ id, position, data });
// config is the reviewed relations config (catalogue index and aliases), used for robot links and aliases.
export function searchStatements(db, { rowsOf, config, projection = null }) {
  const catalogue = new Map((config?.catalogue ?? []).map((c) => [`${c.Lab}|${c.Robot}`, c]));
  const makers = config?.aliases?.makers ?? {};
  const robots = config?.aliases?.robots ?? {};
  const unmapped = [];
  const statements = [db.prepare('DELETE FROM search_docs')];
  const counts = {};
  for (const scope of ['full', 'preview']) {
    const docs = companyDocs(projection, scope);
    for (const spec of DATASETS) {
      for (const row of rowsOf(spec.id, scope)) {
        let extra = {};
        if (spec.id === 'humanoids') {
          const c = catalogue.get(`${row.data.Lab}|${row.data.Robot}`);
          const m = makers[row.data.Lab];
          const r = c ? robots[String(c.id)] : null;
          extra = { catalogueId: c?.id ?? null, aliases: [m?.name, ...(m?.names ?? []), ...(r?.model ?? []), ...(r?.family ?? [])].filter(Boolean) };
        }
        docs.push(searchDoc(spec.id, row, extra, scope === 'full' ? unmapped : []));
      }
    }
    counts[scope] = docs.length;
    // D1 binds at most 100 parameters per statement: 10 columns, 9 rows per insert.
    for (let i = 0; i < docs.length; i += 9) {
      const chunk = docs.slice(i, i + 9);
      statements.push(
        db
          .prepare(`INSERT INTO search_docs (scope, dataset, row_id, position, title, subtitle, names, haystack, tags, link) VALUES ${chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`)
          .bind(...chunk.flatMap((x) => [scope, x.dataset, x.row_id, x.position, x.title, x.subtitle, x.names, x.haystack, x.tags, x.link])),
      );
    }
  }
  const seen = new Set();
  const distinct = unmapped.filter(([k, v]) => { const key = `${k}|${v}`; if (seen.has(key)) return false; seen.add(key); return true; });
  return { statements, report: { full: counts.full, preview: counts.preview, unmapped_values: distinct.length }, unmapped: distinct };
}

// Query words, phrases first: "estados unidos" and "material handling" stay together. Each term carries its
// alternatives (the word itself and the vocabulary terms it means).
export function parseQuery(q) {
  let text = norm(String(q ?? '').slice(0, 200));
  const terms = [];
  for (const phrase of [...SYNONYMS.keys()].filter((k) => k.includes(' ')).sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`(^| )${phrase}( |$)`);
    if (re.test(text)) { terms.push({ word: phrase, alts: [phrase, ...SYNONYMS.get(phrase)] }); text = text.replace(re, ' '); }
  }
  for (const w of text.split(' ')) {
    if (!w || STOPWORDS.has(w) || (w.length < 2 && !/\d/.test(w))) continue;
    if (terms.some((t) => t.word === w)) continue;
    terms.push({ word: w, alts: [w, ...(SYNONYMS.get(w) ?? [])] });
  }
  return terms.slice(0, MAX_TERMS);
}

const parseTags = (raw) => [...new Set(String(raw ?? '').split(',').map((t) => t.trim()).filter(isKnownTag))].slice(0, 20);

// Relevance: an exact name first, then a name that starts with the query, then names that contain it, then
// any field. Ties keep category order and sheet order.
function rank(doc, phrase, terms) {
  if (!phrase) return 4;
  if (doc.names.includes(`|${phrase}|`)) return 0;
  if (doc.names.includes(`|${phrase}`)) return 1;
  if (doc.names.includes(phrase)) return 2;
  if (terms.length && terms.every((t) => t.alts.some((a) => doc.names.includes(a)))) return 3;
  return 4;
}

// Snippet: the first field (other than the title fields) whose text holds a query word, cut around it, with the
// positions to highlight in the original text. Without such a field, the category's context field, unhighlighted.
function snippet(datasetId, data, terms, tagLabels = []) {
  const { context, names } = describe(datasetId, data);
  const nameSet = new Set(names.filter(nz).map(String));
  const usable = Object.entries(data).filter(([k, v]) => !INTERNAL.has(k) && nz(v) && !nameSet.has(String(v)) && !/^https?:\/\/\S+$/.test(String(v).trim()));
  // Prose before identifiers: a field named *_id or holding a bare id is a last resort.
  const isId = ([k, v]) => /(^|_)id$|_ids$/.test(k) || /^[a-z]+_[a-z0-9_]+$/.test(String(v).trim());
  const entries = [...usable.filter((e) => !isId(e)), ...usable.filter(isId)];
  const alts = terms.flatMap((t) => t.alts).sort((a, b) => b.length - a.length);
  if (tagLabels.length) entries.push(...tagLabels.map(([facet, labelText]) => [`tag:${facet}`, labelText]));
  for (const [field, value] of entries) {
    const m = normMap(value);
    const hits = [];
    for (const a of alts) {
      const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])(${a.split(' ').join('\\s+')})${a.length <= 3 ? '(?![\\p{L}\\p{N}])' : ''}`, 'gu');
      for (let x; (x = re.exec(m.text));) hits.push([x.index + x[0].length - x[1].length, x.index + x[0].length]);
    }
    if (!hits.length) continue;
    hits.sort((p, q) => p[0] - q[0]);
    const start = Math.max(0, m.map[hits[0][0]] - 60);
    const end = Math.min(m.source.length, m.map[hits[0][1] - 1] + 1 + 90);
    const text = (start > 0 ? '…' : '') + m.source.slice(start, end) + (end < m.source.length ? '…' : '');
    const offset = start > 0 ? 1 - start : -start;
    const marks = [];
    for (const [s, e] of hits) {
      const a = m.map[s] + offset;
      const b = m.map[e - 1] + 1 + offset;
      if (a >= 0 && b <= text.length && !marks.some(([x, y]) => a < y && b > x)) marks.push([a, b]);
    }
    return { field, label: field.startsWith('tag:') ? field.slice(4) : human(field), text, marks: marks.sort((p, q) => p[0] - q[0]) };
  }
  const v = data[context];
  return nz(v) ? { field: context, label: human(context), text: short(v, 160), marks: [] } : null;
}

// scope must come from the entitlement check. Returns results, facet counts and category counts of the accessible
// set only.
export async function search(db, { scope, q = '', tags = '', category = '', page = 1 }) {
  if (scope !== 'full' && scope !== 'preview') throw new Error('search scope required');
  const terms = parseQuery(q);
  const active = parseTags(tags);
  const cat = CATEGORY_BY_ID.has(category) ? category : '';
  const phrase = norm(q);
  if (!terms.length && !active.length && !cat) return { scope, query: String(q ?? ''), terms: [], total: 0, page: 1, page_size: PAGE_SIZE, results: [], facets: [], categories: [], active: [] };

  const where = ['scope = ?'];
  const params = [scope];
  // Access matrix at query time too (24 Nov 2026): outside the full scope, a row of a subscription tab is searchable
  // only while it holds stored public values, whatever an older index holds; a counted-only tab never is.
  if (scope !== 'full') {
    const gated = DATASETS.filter((d) => d.access !== 'free').map((d) => d.id);
    const listed = DATASETS.filter((d) => d.access !== 'free' && publicRowLimit(d) !== 0).map((d) => d.id);
    where.push(`(dataset NOT IN (${gated.map(() => '?').join(', ')}) OR (dataset IN (${listed.map(() => '?').join(', ')}) AND row_id IN (SELECT row_id FROM premium_rows WHERE premium_rows.dataset = search_docs.dataset AND visibility = 'customer' AND preview_data IS NOT NULL)))`);
    params.push(...gated, ...listed);
  }
  for (const t of terms) {
    where.push(`(${t.alts.map(() => "haystack LIKE ? ESCAPE '\\'").join(' OR ')})`);
    // Words match from their start ("tend" finds "tending", not "attending"); words of up to 3 characters match whole.
    params.push(...t.alts.map((a) => (a.length <= 3 ? `% ${likeEscape(a)} %` : `% ${likeEscape(a)}%`)));
  }
  const { results = [] } = await db
    .prepare(`SELECT dataset, row_id, position, title, subtitle, names, tags, link FROM search_docs WHERE ${where.join(' AND ')}`)
    .bind(...params)
    .all();

  // Filters: categories and tags. Within one facet any chosen value matches; across facets all must match.
  const byFacet = new Map();
  for (const t of active) { const f = t.split(':')[0]; if (!byFacet.has(f)) byFacet.set(f, []); byFacet.get(f).push(t); }
  const passes = (doc, skipFacet = null, skipCategory = false) =>
    (skipCategory || !cat || doc.dataset === cat) &&
    [...byFacet].every(([f, ts]) => f === skipFacet || ts.some((t) => doc.tags.includes(`|${t}|`)));

  const matched = results.filter((doc) => passes(doc));
  matched.sort((a, b) => rank(a, phrase, terms) - rank(b, phrase, terms) || ORDER.get(a.dataset) - ORDER.get(b.dataset) || a.position - b.position);

  const facets = FACETS.map(([id, label]) => {
    const counts = new Map();
    for (const doc of results) {
      if (!passes(doc, id)) continue;
      for (const t of doc.tags.split('|')) if (t.startsWith(`${id}:`)) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    for (const t of byFacet.get(id) ?? []) if (!counts.has(t)) counts.set(t, 0);
    const values = [...counts].map(([tag, count]) => ({ id: tag, label: tagLabel(tag), count, active: active.includes(tag) }))
      .sort((a, b) => b.active - a.active || b.count - a.count || a.label.localeCompare(b.label));
    return { id, label, values };
  }).filter((f) => f.values.length);
  const catCounts = new Map();
  for (const doc of results) if (passes(doc, null, true)) catCounts.set(doc.dataset, (catCounts.get(doc.dataset) ?? 0) + 1);
  const categories = CATEGORIES.filter((d) => catCounts.has(d.id) || d.id === cat).map((d) => ({ id: d.id, title: d.title, count: catCounts.get(d.id) ?? 0, active: d.id === cat }));

  const total = matched.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const p = Math.min(Math.max(1, Number.parseInt(page, 10) || 1), pages);
  const slice = matched.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);

  // Snippets from the same scope's values only: the public values of the public rows, or the full values.
  const dataOf = new Map();
  for (const spec of DATASETS) {
    const ids = slice.filter((x) => x.dataset === spec.id).map((x) => x.row_id);
    if (!ids.length) continue;
    const sql = scope === 'full'
      ? `SELECT row_id, data FROM premium_rows WHERE dataset = ? AND visibility = 'customer' AND row_id IN (${ids.map(() => '?').join(', ')})`
      : `SELECT row_id, ${publicValuesSql(spec)} AS data FROM premium_rows WHERE dataset = ? AND visibility = 'customer' AND ${publicRowSql(spec)} AND row_id IN (${ids.map(() => '?').join(', ')})`;
    const rows = (await db.prepare(sql).bind(spec.id, ...ids).all()).results ?? [];
    for (const r of rows) dataOf.set(`${spec.id}|${r.row_id}`, JSON.parse(r.data));
  }
  const out = slice.map((doc) => {
    const data = dataOf.get(`${doc.dataset}|${doc.row_id}`);
    return {
      category: doc.dataset,
      category_title: CATEGORY_BY_ID.get(doc.dataset).title,
      id: doc.row_id,
      title: doc.title,
      subtitle: doc.subtitle,
      link: doc.link,
      tags: doc.tags.split('|').filter(Boolean).map((t) => ({ id: t, label: tagLabel(t), facet: FACET_LABELS[t.split(':')[0]] })),
      snippet: data ? snippet(doc.dataset, data, terms, doc.tags.split('|').filter(Boolean).map((t) => [FACET_LABELS[t.split(':')[0]], tagLabel(t)])) : null,
    };
  });
  return {
    scope,
    query: String(q ?? ''),
    terms: terms.map((t) => t.word),
    total,
    page: p,
    pages,
    page_size: PAGE_SIZE,
    results: out,
    facets,
    categories,
    active: active.map((t) => ({ id: t, label: tagLabel(t), facet: FACET_LABELS[t.split(':')[0]] })),
    category: cat || null,
  };
}
