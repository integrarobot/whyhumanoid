#!/usr/bin/env node
// Integrators atlas (Javier, 24 Nov 2026): the public snapshot behind /integrators/ and the integrator profiles on
// company pages. Integrators is free in full, so this needs no private source: it reads the committed public preview
// (data/preview/integrators.json, written from the live workbook by tools/export-database.mjs --only integrators) and
// the reviewed reading tools/integrators-review.json, checks every reviewed statement against the provider's own cell,
// and writes data/integrators/atlas.json.
//
//   node tools/export-integrators.mjs           write data/integrators/atlas.json
//   node tools/export-integrators.mjs --check   fail if it is out of date or the review no longer matches the sheet
//
// Counting rule: CATALOG STATUS decides who is a humanoid-specific provider (server/src/integrators/catalogue.js). The
// requested specialist exception and the records whose humanoid scope is unconfirmed are listed, never counted as
// humanoid providers. A project shared by several providers (Novares Seseña) is one project.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  COVERAGE_FIELDS, FIELD_LABELS, INTEGRATOR_FIELDS, NO_PLATFORM, NO_TERRITORY, PLATFORMS, ROLE_CLASSES, SECTORS,
  SERVICE_CLASSES, STATUS_CLASSES, TERRITORIES, displayName, isUnknown, sourceUrls, statusClass, tagsOf,
} from '../server/src/integrators/catalogue.js';

const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const OUT = 'data/integrators/atlas.json';
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } };

export function buildAtlas() {
  const problems = [];
  const index = read('data/preview/index.json').tabs.find((t) => t.id === 'integrators');
  const rows = read('data/preview/integrators.json').rows;
  const review = read('tools/integrators-review.json');
  const catalogue = read('data/humanoids-catalogue.json').records;
  const software = read('data/preview/software.json').rows;
  const cases = new Set(Object.values(read('tools/permalinks.json').deployments ?? {}).flat());
  const groups = new Map(review.evidence_groups.map((g) => [g.id, g]));
  const byId = new Map(rows.map((r) => [r.provider_id, r]));

  if (JSON.stringify(index.fields) !== JSON.stringify(INTEGRATOR_FIELDS)) problems.push('data/preview/integrators.json does not hold the 26 Integrators fields in sheet order');
  for (const id of Object.keys(review.providers)) if (!byId.has(id)) problems.push(`review names ${id}, which is not in the sheet`);
  const cell = (id, field) => String(byId.get(id)?.[field] ?? '');
  const cites = (where, id, field, excerpt) => {
    if (!byId.has(id)) return problems.push(`${where}: provider ${id} is not in the sheet`);
    if (!INTEGRATOR_FIELDS.includes(field)) return problems.push(`${where}: ${field} is not an Integrators field`);
    if (!excerpt || !cell(id, field).includes(excerpt)) problems.push(`${where}: "${excerpt}" is not in ${id} ${field}`);
    return true;
  };

  const robotPage = (lab, robot) => catalogue.find((r) => r.Lab === lab && r.Robot === robot)?.id ?? null;
  const tagRobots = new Map();
  const providerRobots = new Map();
  for (const l of review.robot_links) {
    const id = robotPage(l.lab, l.robot);
    if (!id) { problems.push(`robot link: ${l.lab} ${l.robot} is not in the Humanoids catalogue`); continue; }
    if (l.platform) {
      if (!PLATFORMS.some((p) => p.id === l.platform)) problems.push(`robot link: unknown platform ${l.platform}`);
      tagRobots.set(l.platform, { id, name: `${l.lab} ${l.robot}` });
    } else if (cites(`robot link ${l.lab} ${l.robot}`, l.provider, l.field, l.excerpt)) {
      (providerRobots.get(l.provider) ?? providerRobots.set(l.provider, []).get(l.provider)).push({ id, name: `${l.lab} ${l.robot}`, excerpt: l.excerpt });
    }
  }
  const softwareLinks = new Map();
  for (const l of review.software_links) {
    const sw = software.find((s) => host(s.url) === l.software_host);
    if (!sw) problems.push(`software link: no Software entry at ${l.software_host}`);
    else if (cites('software link', l.provider, l.field, l.excerpt)) softwareLinks.set(l.provider, { name: sw.name, url: sw.url, row: sw._row });
  }

  const projects = review.projects.map((p) => {
    if (!review.project_types[p.type]) problems.push(`project ${p.id}: unknown type ${p.type}`);
    for (const x of p.providers) cites(`project ${p.id}`, x.id, x.field, x.excerpt);
    for (const x of p.results ?? []) cites(`project ${p.id} result`, x.id, x.field, x.excerpt);
    if (p.deployment_case && !cases.has(p.deployment_case)) problems.push(`project ${p.id}: deployment case ${p.deployment_case} is not a published case`);
    return {
      id: p.id, name: p.name, type: p.type, type_label: review.project_types[p.type], summary: p.summary,
      providers: p.providers.map((x) => ({ id: x.id, role: x.role })),
      results_note: p.results_note ?? null,
      results: (p.results ?? []).map((x) => ({ id: x.id, text: x.excerpt })),
      deployment_case: p.deployment_case ?? null,
    };
  });

  const providers = rows.map((r) => {
    const id = r.provider_id;
    const status = statusClass(r);
    const rv = review.providers[id];
    if (!rv) problems.push(`${id} has no reviewed evidence group in tools/integrators-review.json`);
    const g = rv ? groups.get(rv.group) : null;
    if (rv && !g) problems.push(`${id}: unknown evidence group ${rv.group}`);
    if (g && g.status !== status) problems.push(`${id}: evidence group ${g.id} is for ${g.status} records, the sheet says ${status}`);
    if (rv && !String(r.evidence_stage).includes(rv.basis)) problems.push(`${id}: basis "${rv.basis}" is not in its evidence stage`);
    const tags = tagsOf(r);
    const robots = [...(providerRobots.get(id) ?? []), ...tags.platforms.filter((t) => tagRobots.has(t)).map((t) => ({ ...tagRobots.get(t), excerpt: null }))];
    return {
      id, sheet_row: r._row, name: r.name, display_name: displayName(r), url: r.url, status, group: rv?.group ?? null,
      basis: rv?.basis ?? null, tags,
      fields: Object.fromEntries(INTEGRATOR_FIELDS.map((f) => [f, r[f] ?? null])),
      unknown: INTEGRATOR_FIELDS.filter((f) => isUnknown(r[f])),
      sources: sourceUrls(r.source_urls),
      projects: projects.filter((p) => p.providers.some((x) => x.id === id)).map((p) => p.id),
      links: { robots, software: softwareLinks.get(id) ?? null, makers: [...new Set(PLATFORMS.filter((p) => tags.platforms.includes(p.id) && p.maker).map((p) => p.maker))] },
    };
  });

  const humanoid = providers.filter((p) => p.status === 'humanoid');
  const count = (list, key, vocab, extra = []) => [...vocab, ...extra].map((v) => ({ id: v.id, label: v.label, count: list.filter((p) => p.tags[key].includes(v.id)).length }));
  const atlas = {
    title: 'Integrators',
    note: 'Public snapshot of the Integrators tab of the Why Humanoid? master workbook: every provider with all 26 fields, as the sheet states them, plus tags read from the cells with fixed vocabularies and a reviewed evidence grouping. Records are provider and partner claims as recorded, not independently verified results. Free.',
    snapshot: index.snapshot ?? null,
    source: { tab: 'Integrators', table: 'IntegratorsCatalog', columns: INTEGRATOR_FIELDS.length, rows: rows.length },
    statuses: Object.entries(STATUS_CLASSES).map(([id, s]) => ({ id, ...s, count: providers.filter((p) => p.status === id).length, ids: providers.filter((p) => p.status === id).map((p) => p.id) })),
    groups: review.evidence_groups.map((g) => ({ ...g, count: providers.filter((p) => p.group === g.id).length })),
    counts: {
      providers: providers.length,
      humanoid: humanoid.length,
      projects: projects.filter((p) => p.type !== 'partnership').length,
      corroborated_projects: projects.filter((p) => p.type === 'customer_project').length,
      roles: count(humanoid, 'roles', ROLE_CLASSES),
      services: count(humanoid, 'services', SERVICE_CLASSES),
      platforms: count(humanoid, 'platforms', PLATFORMS, [NO_PLATFORM]),
      sectors: count(humanoid, 'sectors', SECTORS),
      territories: count(humanoid, 'territories', TERRITORIES, [NO_TERRITORY]),
    },
    coverage: COVERAGE_FIELDS.map((f) => ({ field: f, label: FIELD_LABELS[f], established: providers.filter((p) => !p.unknown.includes(f)).length, unknown: providers.filter((p) => p.unknown.includes(f)).length })),
    vocab: {
      roles: ROLE_CLASSES.map(({ id, label }) => ({ id, label })),
      services: SERVICE_CLASSES.map(({ id, label }) => ({ id, label })),
      platforms: [...PLATFORMS.map(({ id, label, maker }) => ({ id, label, maker })), NO_PLATFORM],
      sectors: SECTORS.map(({ id, label }) => ({ id, label })),
      territories: [...TERRITORIES.map(({ id, label }) => ({ id, label })), NO_TERRITORY],
      fields: INTEGRATOR_FIELDS.map((f) => ({ id: f, label: FIELD_LABELS[f] })),
    },
    providers,
    projects,
  };
  return { atlas, problems };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { atlas, problems } = buildAtlas();
  if (problems.length) {
    console.error(`Integrators atlas: the review does not match the sheet:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  const text = `${JSON.stringify(atlas, null, 1)}\n`;
  const summary = `${atlas.counts.providers} providers (${atlas.counts.humanoid} humanoid-specific, ${atlas.statuses.find((s) => s.id === 'exception').count} specialist exception, ${atlas.statuses.find((s) => s.id === 'unconfirmed').count} scope unconfirmed), ${atlas.source.columns} fields, ${atlas.projects.length} named projects and collaborations`;
  if (process.argv.includes('--check')) {
    if (!existsSync(new URL(OUT, root)) || readFileSync(new URL(OUT, root), 'utf8') !== text) {
      console.error(`${OUT} is out of date. Run node tools/export-integrators.mjs`);
      process.exit(1);
    }
    console.log(`${OUT} is current: ${summary}.`);
  } else {
    mkdirSync(new URL('data/integrators/', root), { recursive: true });
    writeFileSync(new URL(OUT, root), text);
    console.log(`Wrote ${OUT}: ${summary}.`);
  }
}
