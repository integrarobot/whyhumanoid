import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAppendOnly, fromWorkbook, CLAIM_HEADERS, CHANGE_HEADERS } from './verification-ledger.mjs';
import { publicAddress, safeSourceUrl, preservationDirectory, archiveCohortSources, publicCaptureError } from './archive-verification-sources.mjs';
import { mkdtemp, mkdir, symlink, rm, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildReport } from './export-verification-report.mjs';

const validEvent = (patch={}) => ({
  event_id:'fx_1',entity_id:'fx-robot',field:'payload_unclassified_claim_kg',value:20,unit:'kg',
  conditions:'Example OEM payload without duration or arm configuration.',verification_tier:'V1_OEM_Claim',
  source_url:'https://example.com/product',source_kind:'oem_marketing',source_locator:'Specifications, payload',
  observed_at:null,verified_at:'2026-11-27',recorded_at:'2026-11-27T12:00:00Z',valid_from:null,valid_to:null,
  change_type:'initial_observation',supersedes_event_id:null,hardware_generation:'Example revision A',
  source_archive_url:null,archive_status:'pending',evidence_summary:'Synthetic manufacturer claim.',evidence:{},...patch,
});

test('history cannot be edited, removed or reordered', () => {
  const a = {event_id:'fx_1',value:20}; const b = {event_id:'fx_2',value:15};
  assert.doesNotThrow(()=>assertAppendOnly({events:[a]}, {events:[a,b]}));
  assert.throws(()=>assertAppendOnly({events:[a]}, {events:[]}));
  assert.throws(()=>assertAppendOnly({events:[a]}, {events:[{...a,value:15}]}));
  assert.throws(()=>assertAppendOnly({events:[a,b]}, {events:[b,a]}));
});
test('spreadsheet roundtrip preserves JSON number, evidence and changelog identity',()=>{
  const e = {...validEvent(),value:'20',evidence_json:'{}'};
  const c = {...e,new_event_id:e.event_id,previous_event_id:null,reason:'Synthetic source review',contributor:'Example reviewer'};
  const book = {'Verification Claims':[CLAIM_HEADERS,CLAIM_HEADERS.map(h=>e[h])],'Verification Changelog':[CHANGE_HEADERS,CHANGE_HEADERS.map(h=>c[h])]};
  const result=fromWorkbook(book,'2026-11-27');
  assert.equal(result.events[0].value,20); assert.deepEqual(result.events[0].evidence,{});
  book['Verification Changelog'][1][9]='https://example.com/wrong-source'; assert.throws(()=>fromWorkbook(book,'2026-11-27'),/unchanged claim/);
  book['Verification Changelog'][1][9]=e.source_url;
  book['Verification Changelog'][1][8]=''; assert.throws(()=>fromWorkbook(book,'2026-11-27'),/reason and contributor/);
  book['Verification Changelog'][1][8]=c.contributor;
  book['Verification Changelog'][1][4]='fx_wrong'; assert.throws(()=>fromWorkbook(book,'2026-11-27'),/unchanged claim/);
});
test('archive refuses private addresses, credentials, unsupported schemes and redirect targets',async()=>{
  for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','100.64.0.1','::1','fc00::1','::ffff:127.0.0.1']) assert.equal(publicAddress(ip),false,ip);
  assert.equal(publicAddress('8.8.8.8'),true);
  for(const url of ['http://example.com','https://user:pass@example.com','https://localhost','https://example.com:8443']) await assert.rejects(safeSourceUrl(url,async()=>[{address:'8.8.8.8'}]));
  await assert.rejects(safeSourceUrl('https://example.com',async()=>[{address:'127.0.0.1'}]),/private/);
  assert.equal((await safeSourceUrl('https://example.com',async()=>[{address:'8.8.8.8'}])).hostname,'example.com');
});

test('capture files cannot enter the repository through dot-prefixed children or a symlink',async()=>{
  const temp = await mkdtemp(join(tmpdir(),'wh-captures-'));
  const repo = join(temp,'repo'); await mkdir(repo);
  try {
    await assert.rejects(preservationDirectory(join(repo,'..captures'),repo),/outside/);
    const inside = join(repo,'captured'); await mkdir(inside);
    const link = join(temp,'outside-link'); await symlink(inside,link);
    await assert.rejects(preservationDirectory(link,repo),/symlink/);
    assert.equal(await preservationDirectory(join(temp,'outside'),repo),await realpath(join(temp,'outside')));
  } finally { await rm(temp,{recursive:true,force:true}); }
});

test('capture failures expose bounded public categories without TLS stacks or local paths',()=>{
  const tls=Object.assign(new Error('TLS stack contains internal diagnostics'),{code:'EPROTO'});
  assert.equal(publicCaptureError(tls),'TLS handshake failed (EPROTO)');
  assert.equal(publicCaptureError(new Error('Operator-only diagnostic data')),'Capture failed');
  assert.equal(publicCaptureError(new Error('HTTP 403')),'HTTP 403');
  assert.equal(publicCaptureError(Object.assign(new Error('Missing file details'),{code:'ENOENT'})),'Preservation file could not be written (ENOENT)');
});

test('cohort batch covers consulted sources without claims and appends only new or explicitly retried attempts',async()=>{
  const temp = await mkdtemp(join(tmpdir(),'wh-cohort-captures-'));
  const cohort={records:[{sources:[{url:'https://example.com/a'},{url:'https://example.com/b'}]},{sources:[{url:'https://example.com/b'},{url:'https://example.com/c'}]}]};
  const manifest={schema_version:'1.0.0',captures:[{source_url:'https://example.com/a',status:'captured'},{source_url:'https://example.com/b',status:'failed'}]};
  const calls=[]; const capture=async(url)=>{calls.push(url);return {source_url:url,status:'captured'};};
  try {
    const first=await archiveCohortSources(cohort,temp,manifest,{capture});
    assert.deepEqual(calls,['https://example.com/c']); assert.equal(first.captures.length,3); assert.equal(manifest.captures.length,2);
    calls.length=0;
    const retry=await archiveCohortSources(cohort,temp,first,{retryFailed:true,capture});
    assert.deepEqual(calls,['https://example.com/b']); assert.equal(retry.captures.length,4);
  } finally { await rm(temp,{recursive:true,force:true}); }
});

test('report protocol validation counts require current V2+ attributes and HRL4 confirmation requires V3+',()=>{
  const areas={payload:{},runtime:{},autonomy:{},hrl:{}};
  const cohort={records:Array.from({length:25},(_,i)=>({entity_id:i?'fx-model-'+i:'fx-robot',areas,review_status:'initial_source_review'})),limitations:[]};
  const catalogue={records:cohort.records}; const archives={captures:[]};
  const sustained=validEvent({field:'payload_sustained_bilateral_kg',evidence:{sustained_bilateral:true,duty_cycle:'Repeated carry cycle',thermal_conditions:'20 C ambient'}});
  const report=(e,as_of='2026-11-27')=>buildReport({schema_version:'1.0.0',as_of,events:[e]},cohort,catalogue,archives);
  assert.equal(report(sustained).sustained_bilateral_protocols_validated,0);
  const documented={...sustained,verification_tier:'V2_Technical_Doc',source_kind:'technical_document',evidence:{...sustained.evidence,measurement_scope_confirmed:true}};
  assert.equal(report(documented).sustained_bilateral_protocols_validated,1);
  assert.equal(report(documented,'2027-11-28').sustained_bilateral_protocols_validated,0);
  const hrl=validEvent({field:'hrl_status',value:'HRL_4',unit:null,evidence:{functional_hardware:true,external_demonstration:true,external_site_operation:true,paid_contract_confirmed:true,customer_confirmation:true}});
  assert.equal(report(hrl).hrl_4_plus_confirmed_models,0);
});
