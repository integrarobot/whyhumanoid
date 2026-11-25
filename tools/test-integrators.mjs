#!/usr/bin/env node
// Integrators acceptance (24 Nov 2026), on the committed snapshot and the built pages: every provider id survives with
// its 26 fields, the counting rule holds (CA3 and the unconfirmed records listed, never counted), the shared Novares
// project is one project, each provider has one free profile page with its sources and unknowns, the earlier
// addresses still resolve, and nothing private reaches the pages. Run in CI:  node --test tools/test-integrators.mjs

import { SUPPORT_EMAIL } from '../server/src/support.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { INTEGRATOR_FIELDS } from '../server/src/integrators/catalogue.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const atlas = JSON.parse(read('data/integrators/atlas.json'));
const preview = JSON.parse(read('data/preview/integrators.json')).rows;
const pages = JSON.parse(read('data/pages.json'));
const registry = JSON.parse(read('tools/permalinks.json')).companies;
const category = read('integrators/index.html');
const byId = new Map(atlas.providers.map((p) => [p.id, p]));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const profilePath = (p) => {
  const m = category.match(new RegExp(`id="p-${p.id.replace(/^int_/, '').replace(/_/g, '-')}"[\\s\\S]*?<h3><a href="(/companies/[^"]+/)">`));
  return m?.[1] ?? null;
};

test('every provider id of the sheet survives with all 26 fields, as the preview holds them', () => {
  assert.equal(atlas.source.columns, 26);
  assert.equal(atlas.providers.length, preview.length);
  assert.equal(new Set(atlas.providers.map((p) => p.id)).size, atlas.providers.length);
  for (const r of preview) {
    const p = byId.get(r.provider_id);
    assert.ok(p, `${r.provider_id} in the atlas`);
    assert.deepEqual(Object.keys(p.fields), INTEGRATOR_FIELDS);
    for (const f of INTEGRATOR_FIELDS) assert.equal(p.fields[f], r[f], `${r.provider_id} ${f} as the sheet states it`);
    assert.ok(String(p.fields.description).length > 40, `${r.provider_id}: a real description`);
    assert.doesNotMatch(p.fields.description, /pending|translation|traducci[oó]n|\b(el|la|los|las|para|con)\b/i, `${r.provider_id}: English description`);
  }
});

test('the counting rule: CA3 is the exception, Bumerania, Amerevo and RH Bots are unconfirmed, the rest humanoid-specific', () => {
  const st = Object.fromEntries(atlas.statuses.map((s) => [s.id, s]));
  assert.deepEqual(st.exception.ids, ['int_ca3']);
  assert.deepEqual([...st.unconfirmed.ids].sort(), ['int_amerevo', 'int_bumerania', 'int_rh_bots']);
  assert.equal(atlas.counts.humanoid, atlas.providers.length - 4);
  assert.equal(byId.get('int_ca3').group, 'simulation');
  for (const id of st.unconfirmed.ids) assert.equal(byId.get(id).group, 'unconfirmed');
  for (const key of ['roles', 'services', 'platforms', 'sectors', 'territories']) {
    for (const v of atlas.counts[key]) assert.ok(v.count <= atlas.counts.humanoid, `${key}: counts only humanoid-specific providers`);
  }
  assert.match(category, /not \d+ validated production integrators/);
  assert.match(category, /Listed, not counted as humanoid providers/);
});

test('Novares Seseña is one shared project; distinct providers stay distinct', () => {
  const novares = atlas.projects.filter((p) => /Novares/.test(p.name));
  assert.equal(novares.length, 1);
  assert.deepEqual(novares[0].providers.map((x) => x.id).sort(), ['int_bleu', 'int_innov8']);
  assert.equal(novares[0].results.length, 2, 'each source keeps its own figures');
  assert.equal(atlas.projects.filter((p) => p.type === 'customer_project').length, atlas.counts.corroborated_projects);
  assert.ok(byId.has('int_gmo_air') && byId.has('int_techshare'), 'GMO AIR and TechShare are two providers');
  assert.equal(atlas.providers.filter((p) => /generation robots|gr lab/i.test(p.fields.canonical_name)).length, 1, 'Generation Robots and GR Lab are one record');
  const vodafone = atlas.projects.find((p) => p.id === 'vodafone-duisburg');
  assert.equal(vodafone.deployment_case, 'accenture-vodafone-duisburg');
  assert.ok(existsSync(new URL('deployments/accenture-vodafone-duisburg/index.html', root)));
});

test('each provider has one free profile page with every field, its sources and its unknowns', () => {
  const paths = new Set();
  for (const p of atlas.providers) {
    const path = profilePath(p);
    assert.ok(path, `${p.id}: linked from /integrators/`);
    assert.ok(!paths.has(path), `${p.id}: its own page`);
    paths.add(path);
    const html = read(`${path.slice(1)}index.html`);
    assert.match(html, /<h2 id="integrator-h">Integrator profile<\/h2>/);
    assert.doesNotMatch(html, /http-equiv="refresh"/, `${p.id}: a page, not a redirect`);
    const profile = html.slice(html.indexOf('<section class="ip-profile"'), html.indexOf('</section>', html.indexOf('<section class="ip-profile"')));
    assert.doesNotMatch(profile, /subscription|subscribe/i, `${p.id}: the profile is free, nothing locked`);
    for (const u of p.sources) assert.ok(html.includes(esc(u)), `${p.id}: source ${u}`);
    for (const f of p.unknown) assert.ok(html.includes('class="na"'), `${p.id}: ${f} shown as unknown`);
    assert.ok(html.includes(esc(p.fields.limitations).replace(/\n/g, '<br>')), `${p.id}: limitations next to the claims`);
    // The public support address of the site footer is allowlisted (Javier, 25 Nov 2026); no other contact may appear.
    assert.doesNotMatch(html.replaceAll(`mailto:${SUPPORT_EMAIL}`, '').replaceAll(SUPPORT_EMAIL, ''), /mailto:|@[a-z0-9-]+\.(com|es|fr|de|fi|jp|se|ai|io)\b/i, `${p.id}: no personal contact`);
  }
  assert.equal(paths.size, atlas.providers.length);
});

test('the earlier integrator addresses still resolve to the same providers', () => {
  const legacy = { syntech: 'int_syntech', mine: 'int_mine', bravo: 'int_bravo', intec: 'int_intec', bumerania: 'int_bumerania', amerevo: 'int_amerevo', 'rh-bots': 'int_rh_bots' };
  for (const [slug, id] of Object.entries(legacy)) {
    assert.ok(Object.entries(registry).some(([k, v]) => k.startsWith('int_') && v.slugs.includes(slug)), `${slug} in the registry`);
    assert.equal(profilePath(byId.get(id)), `/companies/${slug}/`, `${id} keeps /companies/${slug}/`);
  }
  assert.match(read('companies/syntech/index.html'), /<h1>Synergy Tech<\/h1>/);
  assert.match(read('companies/mine/index.html'), /<h1>MineTechnology<\/h1>/);
  assert.match(read('companies/bravo/index.html'), /<h1>Bravo Robots<\/h1>/);
  assert.ok(Object.values(pages.companies).includes('/companies/synergy-tech/') === false, 'no duplicate page for the new name');
});

test('the category page is free, complete without JavaScript and offers every filter', () => {
  assert.equal((category.match(/<li class="ip" /g) ?? []).length, atlas.providers.length);
  assert.equal((category.match(/<tr data-id="int_/g) ?? []).length, atlas.providers.length);
  for (const f of ['q', 'role', 'service', 'platform', 'sector', 'territory', 'evidence', 'counted']) assert.match(category, new RegExp(`name="${f}"`));
  assert.match(category, /id="if-empty" hidden/);
  assert.match(category, /<span class="badge">Free<\/span>/);
  assert.doesNotMatch(category, /docs\.google\.com|drive\.google\.com/);
});
