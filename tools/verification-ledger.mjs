#!/usr/bin/env node
// Google Sheets is the master. Import only the two additive verification tabs; legacy data stays untouched.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateLedger, ledgerFromWorkbook } from '../server/src/verification/standard.js';
import { archiveSource } from './archive-verification-sources.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const path = 'data/verification/claims.json';
export const CLAIM_HEADERS = ['event_id','entity_id','field','value','unit','conditions','verification_tier','source_url','source_kind','source_locator','observed_at','verified_at','recorded_at','valid_from','valid_to','change_type','supersedes_event_id','hardware_generation','source_archive_url','archive_status','evidence_summary','evidence_json'];
export const CHANGE_HEADERS = ['event_id','entity_id','field','previous_event_id','new_event_id','change_type','recorded_at','reason','contributor','source_url'];
const read = f => JSON.parse(readFileSync(f, 'utf8'));
const json = x => JSON.stringify(x, null, 2) + '\n';

export function assertAppendOnly(previous, current) {
  if (current.events.length < previous.events.length) throw new Error('Cannot remove verification events');
  previous.events.forEach((event,i) => { if (JSON.stringify(event) !== JSON.stringify(current.events[i])) throw new Error(`Immutable event changed: ${event.event_id}`); });
}

export function fromWorkbook(book, asOf) {
  const parsed = ledgerFromWorkbook(book);
  if (!parsed) throw new Error('Both verification tabs are required for a verification snapshot export');
  return { ...parsed, as_of: asOf };
}

export function checkPublicEntities(ledger) {
  const registry = read(resolve(root,'tools/permalinks.json'));
  const allowed = new Set(Object.values(registry.robots).flat());
  const privateText = /docs\.google\.com|drive\.google\.com|file:\/\/|\b(?:sk|rk)_(?:live|test)_|\b(?:rec|clm|lnk|src)_[a-z0-9]+_/i;
  for (const event of ledger.events) {
    if (!allowed.has(event.entity_id)) throw new Error(`Verification entity is not a public humanoid: ${event.entity_id}`);
    if (privateText.test(JSON.stringify(event))) throw new Error('Verification event contains a private reference');
    if (event.evidence?.visibility === 'confidential') throw new Error('Confidential evidence cannot enter the public ledger');
  }
}

async function main() {
  const args = process.argv.slice(2); const arg = name => args[args.indexOf(name) + 1];
  const ledgerFile = resolve(root,path);
  let ledger = read(ledgerFile);
  if (args[0] === 'import-workbook') {
    if (!args.includes('--from') || !args.includes('--as-of')) throw new Error('Provide --from private-export.json --as-of YYYY-MM-DD');
    const proposed = fromWorkbook(read(arg('--from')), arg('--as-of'));
    assertAppendOnly(ledger, proposed); validateLedger(proposed); checkPublicEntities(proposed);
    if (proposed.events.length > ledger.events.length) {
      if (!args.includes('--archive-dir')) throw new Error('New events require --archive-dir outside Git');
      const archivesFile = resolve(root,'data/verification/archives.json');
      const archives = existsSync(archivesFile) ? read(archivesFile) : { schema_version:'1.0.0', captures:[] };
      const sources = [...new Set(proposed.events.slice(ledger.events.length).map(e=>e.source_url).filter(Boolean))];
      for (const url of sources) { archives.captures.push(await archiveSource(url,arg('--archive-dir'))); }
      writeFileSync(archivesFile,json(archives));
    }
    writeFileSync(ledgerFile,json(proposed)); ledger = proposed;
  }
  validateLedger(ledger); checkPublicEntities(ledger);
  if (args.includes('--base')) {
    let previous;
    try { previous = JSON.parse(execFileSync('git',['show',`${arg('--base')}:${path}`],{cwd:root,stdio:['ignore','pipe','ignore']}).toString()); }
    catch (e) { const files = execFileSync('git',['ls-tree','--name-only',arg('--base'),path],{cwd:root}).toString(); if (files.trim()) throw e; previous = {events:[]}; }
    assertAppendOnly(previous,ledger);
  }
  console.log(`Verification ledger: ${ledger.events.length} immutable public claim events; valid.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e=>{ console.error(e.message); process.exitCode=1; });
