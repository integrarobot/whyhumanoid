import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATASETS_BY_ID } from '../src/datasets.js';
import { fixtureWorkbook, sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';

const TASK = 'task_fx_containers';
const rowOf = (datasetId, values) => DATASETS_BY_ID.get(datasetId).headers.map((h) => values[h] ?? '');

// Coherent synthetic scenario (example.com, fx_ ids): Alpha has operational and pilot evidence plus an
// integrator; Beta only has a manufacturer announcement.
function scenario() {
  const wb = fixtureWorkbook();
  const dep = (v) => rowOf('deployments', { manufacturer: 'Example Robotics', robot_model: 'Alpha', sector: 'logistics', environment: 'warehouse', claim_type: 'fact', ...v });
  wb.Deployments = [wb.Deployments[0],
    dep({ record_id: 'fx_rec_a1', organization_id: 'fx_org_ops', organization_role: 'customer_operator', deployment_id: 'fx_dep_a1', robot_version: 'A2', site_name: 'Example DC', country: 'Spain', operational_status: 'commercial_operation', workflow_from: 'AMR', workflow_to: 'Conveyor', integration_dependencies: 'WMS; conveyors', metric_name: 'totes_per_hour', metric_operator: '>=', metric_value: '120', metric_unit: 'totes/hour', claim_id: 'fx_clm_a1', source_url: 'https://example.com/a1', source_role: 'customer_operator', publication_date: '2026-05-01' }),
    dep({ record_id: 'fx_rec_a2', organization_id: 'fx_org_int', organization_role: 'system_integrator', deployment_id: 'fx_dep_a1', robot_version: 'A2', operational_status: 'pilot', claim_id: 'fx_clm_a2', source_url: 'https://example.com/a2', source_role: 'system_integrator', publication_date: '2025-11-02' }),
    dep({ record_id: 'fx_rec_b1', manufacturer: 'Example Humanoids', robot_model: 'Beta', robot_version: 'Not disclosed', operational_status: 'announced', claim_id: 'fx_clm_b1', source_url: 'https://example.org/beta', source_role: 'manufacturer' }),
  ];
  const link = (v) => rowOf('evidence-links', { task_id: TASK, integrator_id: 'unknown', metric_name: 'not_applicable', ...v });
  wb['Relaciones evidencia'] = [wb['Relaciones evidencia'][0],
    link({ link_id: 'fx_link_1', model_id: 'fx_model_alpha', claim_id: 'fx_clm_a1', deployment_id: 'fx_dep_a1', statement: 'Example Logistics runs Alpha moving totes from AMRs to conveyors.', stage_at_source_date: 'commercial_operation', source_role: 'customer_operator', source_url: 'https://example.com/a1', source_publication_date: '2026-05-01', limitations: 'Fleet size not disclosed.' }),
    link({ link_id: 'fx_link_2', model_id: 'fx_model_alpha', claim_id: 'fx_clm_a2', deployment_id: 'fx_dep_a1', statement: 'Integrator pilot of Alpha at the same site.', stage_at_source_date: 'pilot', source_role: 'system_integrator', source_url: 'https://example.com/a2', source_publication_date: '2025-11-02', metric_name: 'interventions_per_hour', metric_operator: '<=', metric_value: '0.5', metric_unit: 'per hour' }),
    link({ link_id: 'fx_link_3', model_id: 'fx_model_beta', claim_id: 'fx_clm_b1', statement: 'Example Humanoids announces Beta for logistics.', stage_at_source_date: 'announced', source_role: 'manufacturer', source_url: 'https://example.org/beta' }),
  ];
  wb['Evaluacion tarea'] = [wb['Evaluacion tarea'][0], rowOf('task-evaluations', { task_id: TASK, model_id: 'fx_model_alpha', model: 'Alpha', eligible_task_evidence: 'TRUE', eligible_commercial: 'TRUE', eligible_economic: 'FALSE', decision_reason: 'Operational evidence; costs missing.' })];
  wb['Producto - Contenedores'] = [wb['Producto - Contenedores'][0], rowOf('container-handling', { Capa: 'Alcance', Elemento: 'Demonstration case', 'Resultado / implicación': 'Container handling in intralogistics: pick, carry, place.', Trazabilidad: TASK })];
  return wb;
}

test('task plan needs a subscription, like every full-data request', async () => {
  const ctx = await setup({ workbook: scenario() });
  assert.equal((await ctx.call('POST', '/v1/agent/task-plan', { body: { task_id: TASK } })).status, 401);
  const { session } = await signIn(ctx);
  assert.equal((await ctx.call('POST', '/v1/agent/task-plan', { token: session, body: { task_id: TASK } })).status, 403);
});

test('task plan returns candidates, dated source-linked claims, gaps and quantified pilot checks', async () => {
  const ctx = await setup({ workbook: scenario() });
  const { session, accountId } = await signIn(ctx);
  await sendWebhook(ctx, subscriptionEvent({ accountId }));
  const res = await ctx.call('POST', '/v1/agent/task-plan', { token: session, body: { task_id: TASK, inputs: { target_throughput_per_hour: 100, shift_hours: 8 } } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /private/);
  const plan = await res.json();
  assert.ok(plan.task.assumptions.some((a) => a.startsWith('Demonstration case: Container handling')));
  assert.deepEqual(plan.task.constraints, ['target throughput per hour: 100 containers per hour', 'shift hours: 8 hours per shift']);

  const alpha = plan.candidates.find((c) => c.model_id === 'fx_model_alpha');
  assert.equal(alpha.robot_model, 'Alpha');
  assert.deepEqual(alpha.robot_versions, ['A2']);
  assert.deepEqual(alpha.integrator_ids, ['fx_org_int']);
  assert.deepEqual(alpha.claims.map((c) => c.evidence_stage), ['sustained_operation', 'pilot']);
  assert.equal(alpha.claims[0].source.publication_date, '2026-05-01');
  assert.equal(alpha.claims[0].operating_conditions.workflow_to, 'Conveyor');
  assert.ok(alpha.measured.includes('throughput') && alpha.measured.includes('intervention_rate'));
  assert.ok(alpha.missing_measurements.includes('uptime') && alpha.missing_measurements.includes('cost'));
  assert.equal(alpha.evaluation.eligible_economic, 'FALSE');
  assert.deepEqual(alpha.evidence_gaps, []);

  const beta = plan.candidates.find((c) => c.model_id === 'fx_model_beta');
  assert.equal(beta.claims[0].evidence_stage, 'vendor_announcement');
  for (const gap of ['No task evaluation', 'No pilot or sustained-operation', 'All evidence comes from the manufacturer', 'Robot version not disclosed', 'Integrator not documented', 'has no publication date']) {
    assert.ok(beta.evidence_gaps.some((g) => g.includes(gap)), gap);
  }

  const throughput = plan.pilot_checks.find((c) => c.id === 'throughput');
  assert.equal(throughput.status, 'quantified');
  assert.equal(throughput.criterion, '>= 100 containers per hour, averaged over 8 h shift');
  assert.deepEqual(throughput.documented_for, ['fx_model_alpha']);
  const uptime = plan.pilot_checks.find((c) => c.id === 'uptime');
  assert.equal(uptime.status, 'needs_input');
  assert.equal(uptime.criterion, null);
  assert.ok(plan.evidence_gaps.includes('No candidate has a documented uptime measurement.'));
  assert.ok(plan.evidence_gaps.some((g) => g.includes('needs the input min_uptime_pct')));
});

test('unknown tasks and invalid inputs are explicit', async () => {
  const ctx = await setup({ workbook: scenario() });
  const { session, accountId } = await signIn(ctx);
  await sendWebhook(ctx, subscriptionEvent({ accountId }));
  const none = await (await ctx.call('POST', '/v1/agent/task-plan', { token: session, body: { task_id: 'task_fx_unknown' } })).json();
  assert.deepEqual(none.candidates, []);
  assert.ok(none.evidence_gaps[0].includes('No documented evidence'));
  assert.equal((await ctx.call('POST', '/v1/agent/task-plan', { token: session, body: { task_id: TASK, inputs: { min_uptime_pct: 120 } } })).status, 400);
  assert.equal((await ctx.call('POST', '/v1/agent/task-plan', { token: session, body: { task_id: TASK, inputs: { guess: 1 } } })).status, 400);
});
