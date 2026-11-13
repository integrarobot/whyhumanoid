#!/usr/bin/env node
// Builds the data block of index.html from the free public catalogue (data/humanoids-catalogue.json) only:
// every customer row of the Humanoids tab with public values. No paid value and no other tab reaches the page.
//
// The page needs presentation facets (country list, mobility class, numeric height and weight, year, listing
// status, check log). They are derived here by rules from the public fields. Where the legacy pipeline made a
// curated call the rules do not reproduce, tools/humanoids-facet-overrides.json pins that value together with a
// hash of its source field; if the source field changes, the override is stale and the build fails.
//
//   node tools/build-site.mjs                    rebuild index.html and run the parity check
//   node tools/build-site.mjs --check            fail if index.html is not exactly the build of data/
//   node tools/build-site.mjs --write-overrides  record rule/legacy disagreements as overrides (review the diff)

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { readLegacySnapshot } from './export-humanoids.mjs';
import { PLAN } from '../server/src/pricing.js';

// Where the catalogue sends buyers: the premium app on the production backend. Change it here when
// premium.whyhumanoid.com is set up as a custom domain.
export const PREMIUM_APP_URL = 'https://whyhumanoid-premium.javier-198.workers.dev/';

const root = new URL('../', import.meta.url);
const OVERRIDES_FILE = new URL('tools/humanoids-facet-overrides.json', root);
const sha = (v) => createHash('sha256').update(String(v ?? '')).digest('hex').slice(0, 16);

const FACET_SOURCE = {
  lab: 'Lab',
  robot: 'Robot',
  c: 'Country',
  mob: 'Platform / mobility',
  h: 'Height (cm)',
  w: 'Weight (kg)',
  y: 'Release',
  ls: 'Stock',
  chk: 'Sources / checked',
};

const COUNTRY_NAMES = { USA: 'United States', US: 'United States', UK: 'United Kingdom' };

function splitClauses(text) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') depth = Math.max(0, depth - 1);
    else if (text[i] === ';' && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.map((c) => c.trim()).filter(Boolean);
}

export const RULES = {
  lab: (v) => v ?? '',
  robot: (v) => v || 'Unnamed',
  c: (v) => {
    if (!v || /^(not disclosed|not found|no data|unknown)$/i.test(v)) return [];
    return v.split(/\s*[;/]\s*/).filter(Boolean).map((x) => COUNTRY_NAMES[x] ?? x);
  },
  mob: (v) => {
    const t = (v ?? '').split(';')[0].toLowerCase();
    if (!t) return 'No data';
    if (/\bdiy\b/.test(t)) return 'DIY or open';
    if (/bipedal or wheeled|wheeled or bipedal/.test(t)) return 'Bipedal or wheeled';
    if (/wheel|mobile manipulat|omnidirectional/.test(t)) return 'Wheeled';
    if (/bipedal/.test(t)) return 'Bipedal';
    if (/torso|\barms?\b|manipulat|bimanual/.test(t)) return 'Torso or arms';
    if (/^(ai for|robots for space|software)/.test(t)) return 'Software or other';
    return 'No data';
  },
  h: (v) => (/^\d+(\.\d+)?$/.test(v ?? '') ? Number.parseFloat(v) : null),
  w: (v) => (/^\d+(\.\d+)?$/.test(v ?? '') ? Number.parseFloat(v) : null),
  y: (v) => {
    const m = /^((?:19|20)\d{2})\b/.exec(v ?? '');
    return m ? Number(m[1]) : null;
  },
  ls: (v) => {
    if (!v) return 'No data';
    if (/^private/i.test(v)) return 'Private';
    if (/subsidiar|acquired|owned/i.test(v)) return 'Subsidiary or acquired';
    if (/open project|non-?profit/i.test(v)) return 'Open project or non-profit';
    if (/ceased|closed|defunct/i.test(v)) return 'Closed';
    if (/^[A-Z]+:[A-Z0-9.-]+/.test(v)) return 'Listed';
    return 'No data';
  },
  chk: (v) => {
    const [first = '', ...rest] = (v ?? '').split('\n');
    const parts = first.split(' | ');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(parts[0] ?? '') ? parts[0] : null;
    const statements = parts[1] ? splitClauses(parts[1]) : [];
    const funding = statements.find((s) => /funding/i.test(s)) ?? '';
    const specs = statements.find((s) => /specification/i.test(s)) ?? '';
    return {
      date,
      statements,
      website: parts[2] ?? '',
      funding: /checked/i.test(funding) ? 'checked' : /pending/i.test(funding) ? 'pending' : 'unknown',
      specs: /reviewed/i.test(specs) ? 'reviewed' : /inherited/i.test(specs) ? 'inherited' : /not published/i.test(specs) ? 'unpublished' : 'unknown',
      urls: rest.map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u)),
    };
  },
};

export function buildData(exported, overrides, access) {
  const { fields } = exported;
  const models = exported.records.map((record) => {
    const model = { id: record.id, row: record.sheet_row };
    for (const [facet, field] of Object.entries(FACET_SOURCE)) {
      const pinned = overrides[record.id]?.[facet];
      if (pinned) {
        if (pinned.source_hash !== sha(record[field])) {
          throw new Error(`Stale override: record ${record.id} facet ${facet}; "${field}" changed. Review tools/humanoids-facet-overrides.json`);
        }
        model[facet] = pinned.value;
      } else model[facet] = RULES[facet](record[field]);
    }
    model.f = fields.map((f) => record[f] ?? '');
    return model;
  });
  const excluded = exported.excluded.map(({ sheet_row: row, lab, robot, reason }) => ({ row, lab, robot, reason }));
  return { cols: fields, models, excluded, snapshot: exported.snapshot, ...(access ? { access } : {}) };
}

// Parity: every facet and field must equal the legacy page, except fields changed by the cleaning step and the
// public values the verified import changed since the legacy snapshot (manifest.verified_import).
const changedFields = (manifest) =>
  new Set([
    ...['stripped', 'excluded_unverified', 'rewritten'].flatMap((k) => (manifest.cleaning[k] ?? []).map((s) => `${s.id}|${s.field}`)),
    ...(manifest.verified_import?.updated ?? []).map((u) => `${u.id}|${u.field}`),
  ]);
const insertedRecords = (manifest) => new Map((manifest.verified_import?.inserted ?? []).map((i) => [i.id, i.sheet_row]));

export function parity(built, legacy, manifest) {
  const cleaned = changedFields(manifest);
  const inserted = insertedRecords(manifest);
  const legacyById = new Map(legacy.models.map((m) => [m.id, m]));
  const unexpected = [];
  const expected = [];
  const legacyRows = [...legacy.models.map((m) => m.row), ...inserted.values()].sort((a, b) => a - b);
  const builtRows = [...built.models.map((m) => m.row), ...built.excluded.map((e) => e.row)].sort((a, b) => a - b);
  if (!isDeepStrictEqual(builtRows, legacyRows)) unexpected.push('the catalogue does not hold exactly the legacy customer rows plus the verified inserts');
  for (const m of built.models) {
    const old = legacyById.get(m.id);
    if (inserted.has(m.id)) {
      if (old || inserted.get(m.id) !== m.row) unexpected.push(`inserted record ${m.id} clashes with the legacy page`);
      else expected.push(`record ${m.id} inserted by the verified import`);
      continue;
    }
    if (!old) {
      unexpected.push(`record ${m.id} not in legacy page`);
      continue;
    }
    for (const key of ['row', ...Object.keys(FACET_SOURCE)]) {
      if (!isDeepStrictEqual(m[key], old[key])) {
        const field = FACET_SOURCE[key];
        (cleaned.has(`${m.id}|${field}`) ? expected : unexpected).push(`record ${m.id} ${key}`);
      }
    }
    built.cols.forEach((field, i) => {
      if ((m.f[i] ?? '') !== (old.f[i] ?? '')) (cleaned.has(`${m.id}|${field}`) ? expected : unexpected).push(`record ${m.id} field ${field}`);
    });
  }
  const insertedRows = new Set(inserted.values());
  for (const e of legacy.excluded.filter((x) => insertedRows.has(x.row))) {
    expected.push(`sheet row ${e.row} was excluded on the legacy page (${e.reason.split(':')[0]}) and is published by the verified import`);
  }
  const legacyExcluded = legacy.excluded.filter((e) => legacyRows.includes(e.row) && !insertedRows.has(e.row));
  if (!isDeepStrictEqual(built.excluded, legacyExcluded)) unexpected.push('excluded rows differ');
  return { unexpected, expected };
}

export function renderIndex(html, data) {
  const block = /(<script[^>]*id="data"[^>]*>)[\s\S]*?(<\/script>)/;
  if (!block.test(html)) throw new Error('index.html has no data block');
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return html.replace(block, (_, open, close) => `${open}${json}${close}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const exported = JSON.parse(readFileSync(new URL('data/humanoids-catalogue.json', root), 'utf8'));
  const manifest = JSON.parse(readFileSync(new URL('data/manifest.json', root), 'utf8'));
  const legacy = readLegacySnapshot();
  let overrides = JSON.parse(readFileSync(OVERRIDES_FILE, 'utf8')).overrides;

  if (process.argv.includes('--write-overrides')) {
    const fresh = {};
    const rulesOnly = buildData(exported, {}, null);
    const legacyById = new Map(legacy.models.map((m) => [m.id, m]));
    const cleaned = changedFields(manifest);
    const records = new Map(exported.records.map((r) => [r.id, r]));
    for (const m of rulesOnly.models) {
      for (const [facet, field] of Object.entries(FACET_SOURCE)) {
        const old = legacyById.get(m.id)?.[facet];
        if (!isDeepStrictEqual(m[facet], old) && !cleaned.has(`${m.id}|${field}`)) {
          fresh[m.id] ??= {};
          fresh[m.id][facet] = { value: old, source_hash: sha(records.get(m.id)[field]) };
        }
      }
    }
    const doc = {
      note: 'Curated presentation facets from the legacy page that the rules in tools/build-site.mjs do not reproduce. Each value is pinned to a hash of its source field; a changed source makes the build fail until the override is reviewed.',
      overrides: fresh,
    };
    writeFileSync(OVERRIDES_FILE, `${JSON.stringify(doc, null, 2)}\n`);
    overrides = fresh;
    console.log(`Wrote ${Object.values(fresh).reduce((n, o) => n + Object.keys(o).length, 0)} overrides for ${Object.keys(fresh).length} records`);
  }

  const access = { free: 'all', total_records: exported.records.length, price: PLAN.display, url: PREMIUM_APP_URL };
  const data = buildData(exported, overrides, access);
  const { unexpected, expected } = parity(data, legacy, manifest);
  if (unexpected.length) {
    console.error(`Parity FAILED (${unexpected.length}):\n- ${unexpected.slice(0, 40).join('\n- ')}`);
    process.exit(1);
  }
  const indexUrl = new URL('index.html', root);
  const current = readFileSync(indexUrl, 'utf8');
  const next = renderIndex(current, data);
  if (process.argv.includes('--check')) {
    if (current !== next) {
      console.error('index.html is not the build of data/. Run node tools/build-site.mjs');
      process.exit(1);
    }
  } else writeFileSync(indexUrl, next);
  console.log(`Parity passed: ${data.models.length} catalogue records identical to the legacy page except ${expected.length} cleaned or verified-import changes`);
}
