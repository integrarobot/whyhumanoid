#!/usr/bin/env node
// The launch baseline is a reproducible count of reviewed evidence, never a sector-wide prevalence estimate.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLedger, buildVerificationView, VERIFICATION_TIERS, tierNumber } from '../server/src/verification/standard.js';
const root = fileURLToPath(new URL('../',import.meta.url));
const read = p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
export function buildReport(ledger,cohort,catalogue,archives) {
  validateLedger(ledger);
  const entities = new Set(cohort.records.map(r=>r.entity_id));
  if (entities.size !== 25 || cohort.records.some(r=>Object.keys(r.areas).sort().join(',') !== 'autonomy,hrl,payload,runtime')) throw new Error('Cohort must contain 25 distinct models with all four review areas');
  const claims = ledger.events.filter(e=>entities.has(e.entity_id));
  const views = [...entities].map(id=>buildVerificationView(id,ledger.events,ledger.as_of));
  const sourceUrls = new Set(claims.map(e=>e.source_url).filter(Boolean));
  const captured = new Set(archives.captures.filter(c=>c.status==='captured').map(c=>c.source_url));
  const hrls = views.filter(v=>v.hrl_status.status==='source_reported').map(v=>v.hrl_status.level).filter(Boolean);
  const validated = (metric) => metric?.status === 'source_reported' && tierNumber(metric.verification_tier) >= 2 && metric.freshness?.state !== 'stale';
  return {
    schema_version:'1.0.0',as_of:ledger.as_of,title:'Verification coverage baseline: November 2026',report_kind:'initial_baseline',
    period:{start:'2026-11-27',end:ledger.as_of,complete_quarter:false},
    catalogue_models:catalogue.records.length,cohort_models:entities.size,source_screenings:cohort.records.length,
    deep_audits_completed:cohort.records.filter(r=>r.review_status==='deep_audit_completed').length,
    claims_recorded:claims.length,claims_by_tier:Object.fromEntries(VERIFICATION_TIERS.filter(t=>t!=='Pending_Audit').map(t=>[t,claims.filter(e=>e.verification_tier===t).length])),
    claims_by_field:Object.fromEntries([...new Set(claims.map(e=>e.field))].map(f=>[f,claims.filter(e=>e.field===f).length])),
    hrl_assigned_models:hrls.length,hrl_4_plus_confirmed_models:views.filter(v=>v.hrl_status.status==='source_reported' && Number(v.hrl_status.level?.slice(-1))>=4 && tierNumber(v.hrl_status.verification_tier)>=3 && v.hrl_status.freshness?.state !== 'stale').length,hrl_unassessed_models:entities.size-hrls.length,
    loaded_runtime_protocols_validated:views.filter(v=>validated(v.metrics.runtime_rated_load_hours)).length,
    sustained_bilateral_protocols_validated:views.filter(v=>validated(v.metrics.payload_sustained_bilateral_kg)).length,
    task_success_protocols_validated:views.filter(v=>validated(v.metrics.success_rate_pct)).length,
    archive_capture_status:[...sourceUrls].every(u=>captured.has(u))?'captured':'partial',
    interpretation:'Unassigned HRL and zero confirmed HRL4+ mean insufficient evidence reviewed under these gates; they do not establish that no such deployments exist. This editorial cohort is not a statistical sample, and its counts cannot be generalized to the sector.',
    limitations:cohort.limitations,cohort_path:'/data/verification/audit-cohort.json',
    next_report:'A quarterly comparison requires another dated evidence review; this launch baseline does not claim a completed quarter.',
  };
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=buildReport(read('data/verification/claims.json'),read('data/verification/audit-cohort.json'),read('data/humanoids-catalogue.json'),read('data/verification/archives.json'));
  const path=resolve(root,'data/verification/report-quarterly.json');const text=JSON.stringify(report,null,2)+'\n';
  if(process.argv.includes('--check')) {if(readFileSync(path,'utf8')!==text) throw new Error('Verification report is stale; run node tools/export-verification-report.mjs');}
  else writeFileSync(path,text);
  console.log(`Verification baseline: ${report.cohort_models} models, ${report.claims_recorded} claim events, ${report.hrl_assigned_models} supported HRL assessments.`);
}
