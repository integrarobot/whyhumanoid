#!/usr/bin/env node
// Coverage of full-body robot images across the Humanoids catalogue (Javier, 27 Nov 2026: batches of 10, transparent
// background, whole robot). Reads the catalogue, the published presentation (tools/robot-presentation.json) and the
// plan (ops/media/robots/coverage.json) and writes ops/media/robots/COVERAGE.md, one row per catalogue record.
// Internal: ops/ is not published. It never changes the presentation, the catalogue or the master.
//
//   node tools/robot-images-coverage.mjs            write COVERAGE.md
//   node tools/robot-images-coverage.mjs --check    plan consistent with the catalogue and COVERAGE.md current

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const OUT = 'ops/media/robots/COVERAGE.md';
// 'integrated': in tools/robot-presentation.json on a branch whose PR is not merged and verified yet, so not live.
// 'published': merged and verified on the live site. A batch PR integrates; the batch closeout turns integrated into published.
// 'no_valid_source': reviewed, and no source checked so far gives a faithful, identifiable whole-robot image (Codex,
// 27 Nov 2026). It is not a claim that no photo exists; the record stays traced, without an image, until one is found.
const PLAN_STATUSES = ['candidate', 'reserve', 'integrated', 'published', 'exception', 'no_valid_source', 'needs_decision', 'quality_debt'];
const WITH_IMAGE = ['integrated', 'published', 'quality_debt'];
const VERDICTS = ['usable_original', 'usable_cutout', 'identity_pending', 'rejected'];

export function coverage(plan = read('ops/media/robots/coverage.json'), presentation = read('tools/robot-presentation.json'), catalogue = read('data/humanoids-catalogue.json')) {
  const problems = [];
  const byId = new Map(catalogue.records.map((r) => [String(r.id), r]));
  const published = new Set(Object.keys(presentation.robots ?? {}).filter((id) => presentation.robots[id].image));
  for (const [id, p] of Object.entries(plan.robots ?? {})) {
    const r = byId.get(id);
    if (!r) { problems.push(`robot ${id}: no catalogue record`); continue; }
    if (r.Lab !== p.recorded?.Lab || (r.Robot ?? null) !== (p.recorded?.Robot ?? null)) problems.push(`robot ${id}: recorded ${JSON.stringify(p.recorded)} differs from the catalogue (${r.Lab} / ${r.Robot})`);
    if (!PLAN_STATUSES.includes(p.status)) problems.push(`robot ${id}: unknown status ${p.status}`);
    if (published.has(id) && !WITH_IMAGE.includes(p.status)) problems.push(`robot ${id}: has an image in tools/robot-presentation.json, so its status is ${WITH_IMAGE.join(', ')}`);
    if (WITH_IMAGE.includes(p.status) && !published.has(id)) problems.push(`robot ${id}: ${p.status} but no image in tools/robot-presentation.json`);
    if (['exception', 'no_valid_source', 'needs_decision', 'quality_debt'].includes(p.status) && !p.reason) problems.push(`robot ${id}: ${p.status} needs a reason`);
    for (const s of p.sources ?? []) {
      if (!VERDICTS.includes(s.verdict)) problems.push(`robot ${id}: source verdict ${s.verdict} unknown`);
      if (!s.file || !s.by || !/^\d{4}-\d\d-\d\d$/.test(s.date ?? '')) problems.push(`robot ${id}: each source needs file, by and date`);
    }
  }
  const seen = new Map();
  for (const b of plan.batches ?? []) {
    for (const [kind, ids] of [['candidates', b.candidates ?? []], ['reserves', b.reserves ?? []]]) {
      for (const n of ids) {
        const id = String(n);
        if (seen.has(id)) problems.push(`robot ${id}: listed twice in batches (${seen.get(id)} and batch ${b.batch} ${kind})`);
        seen.set(id, `batch ${b.batch} ${kind}`);
        // A candidate becomes published when its batch integrates it; a reserve is never published as a reserve.
        const want = kind === 'candidates' ? ['candidate', 'integrated', 'published'] : ['reserve'];
        if (!want.includes(plan.robots?.[id]?.status)) problems.push(`robot ${id}: in batch ${b.batch} ${kind}, status must be ${want.join(' or ')}`);
      }
    }
    if ((b.candidates ?? []).length > (b.target ?? 10)) problems.push(`batch ${b.batch}: more candidates than its target`);
  }
  for (const [id, p] of Object.entries(plan.robots ?? {})) if (['candidate', 'reserve'].includes(p.status) && !seen.has(id)) problems.push(`robot ${id}: ${p.status} but in no batch`);

  // Scopes (Javier, 27 Nov 2026: "Agibot and all the remaining makers with A and B"): every record whose Lab starts with
  // one of the scope's initials must be tracked in the plan (or already carry an image); the scope is resolved when each
  // member is published or a justified exception.
  const scopes = (plan.scopes ?? []).map((sc) => {
    const re = new RegExp(`^[${(sc.lab_initials ?? []).join('')}]`, 'i');
    const members = catalogue.records.filter((r) => re.test(r.Lab ?? '')).map((r) => String(r.id));
    for (const id of members) if (!published.has(id) && !plan.robots?.[id]) problems.push(`scope ${sc.name}: robot ${id} (${byId.get(id).Lab} / ${byId.get(id).Robot}) is not tracked in the plan`);
    const status = (id) => (published.has(id) ? (plan.robots?.[id]?.status === 'integrated' ? 'integrated' : 'published') : plan.robots?.[id]?.status ?? 'pending');
    const tally = {};
    for (const id of members) tally[status(id)] = (tally[status(id)] ?? 0) + 1;
    const open = members.filter((id) => !['published', 'quality_debt', 'exception', 'no_valid_source'].includes(status(id)));
    return { name: sc.name, total: members.length, tally, open };
  });

  const rows = catalogue.records.map((r) => {
    const id = String(r.id);
    const p = plan.robots?.[id];
    const status = published.has(id) ? ({ quality_debt: 'published, quality debt', integrated: 'integrated, not live' }[p?.status] ?? 'published') : (p?.status ?? 'pending');
    const best = (p?.sources ?? []).filter((s) => s.verdict !== 'rejected').at(-1);
    const rejected = (p?.sources ?? []).filter((s) => s.verdict === 'rejected').length;
    const where = seen.get(id) ?? '';
    const note = p?.reason ?? [best ? `${best.verdict.replace('_', ' ')} (${best.by}, ${best.date})` : '', rejected ? `${rejected} source${rejected > 1 ? 's' : ''} rejected` : ''].filter(Boolean).join('; ');
    return { id: r.id, lab: r.Lab, robot: r.Robot ?? '(empty)', status, where, note };
  });
  const count = (s) => rows.filter((x) => x.status === s || x.status.startsWith(`${s},`)).length;
  const esc = (v) => String(v).replace(/\|/g, '\\|');
  const md = [
    '# Robot image coverage',
    '',
    'Generated by `node tools/robot-images-coverage.mjs` from `ops/media/robots/coverage.json`, `tools/robot-presentation.json` and `data/humanoids-catalogue.json`. Do not edit by hand.',
    '',
    `Catalogue snapshot ${catalogue.snapshot}: ${rows.length} records. Published ${count('published')} (of which quality debt ${rows.filter((x) => x.status === 'published, quality debt').length}); integrated in an open PR, not live ${count('integrated')}; candidates ${count('candidate')}; reserves ${count('reserve')}; needs decision ${count('needs_decision')}; exceptions ${count('exception')}; no valid source yet ${count('no_valid_source')}; pending ${count('pending')}.`,
    '',
    ...scopes.flatMap((sc) => [`Scope "${sc.name}": ${sc.total} records; ${Object.entries(sc.tally).sort().map(([k, v]) => `${k} ${v}`).join(', ')}. Still open: ${sc.open.length ? sc.open.join(', ') : 'none'}.`, '']),
    '| id | Lab | Robot | Status | Batch | Note |',
    '|---:|---|---|---|---|---|',
    ...rows.map((x) => `| ${x.id} | ${esc(x.lab)} | ${esc(x.robot)} | ${x.status} | ${x.where} | ${esc(x.note)} |`),
    '',
  ].join('\n');
  return { problems, md, rows, scopes };
}

// Run as a script, also from a checkout whose path has spaces or other characters a URL escapes ("Why Humanoid?");
// imported as a module (no argv[1], or another entry point), nothing runs.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { problems, md, rows } = coverage();
  if (problems.length) { console.error(`Robot image coverage FAILED:\n- ${problems.join('\n- ')}`); process.exit(1); }
  const file = new URL(OUT, root);
  if (process.argv.includes('--check')) {
    if (!existsSync(file) || readFileSync(file, 'utf8') !== md) { console.error(`${OUT} is out of date: run node tools/robot-images-coverage.mjs`); process.exit(1); }
    console.log(`Robot image coverage passed: ${rows.length} records, plan consistent with the catalogue and the published presentation.`);
  } else { writeFileSync(file, md); console.log(`Wrote ${OUT} (${rows.length} records).`); }
}
