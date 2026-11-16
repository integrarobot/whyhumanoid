// Agent task plan: assembles documented evidence for one enterprise task into a structured answer.
// Deterministic (no model call): every statement comes from a premium row and carries its source.
// Output: task assumptions and constraints; candidates with robot/version and integrator ids; dated,
// source-linked claims with evidence stage and operating conditions; missing measurements; pilot checks with
// quantitative criteria only where the caller supplied the numbers; evidence gaps stated explicitly.

const NA = /^(|unknown|not_applicable|not applicable|n\/a|not disclosed|none)$/i;
const present = (v) => v != null && !NA.test(String(v).trim());

export const STAGES = ['vendor_announcement', 'demonstration', 'pilot', 'sustained_operation'];
const STAGE_RULES = [
  ['sustained_operation', /sustained|commercial_operation|in_operation|operational|production|deployed|ongoing/i],
  ['pilot', /pilot|proof_of_concept|\bpoc\b|trial/i],
  ['demonstration', /demo/i],
  ['vendor_announcement', /announc|plan|press|launch/i],
];
export const stageOf = (value) => STAGE_RULES.find(([, re]) => re.test(String(value ?? '')))?.[0] ?? 'unclassified';

// Measurements an operations lead needs before a container-handling pilot.
const MEASUREMENTS = {
  throughput: /throughput|per_hour|totes|picks|units/i,
  cycle_time: /cycle/i,
  uptime: /uptime|availability/i,
  intervention_rate: /intervention|assist|teleop/i,
  success_rate: /success|error|failure|accuracy/i,
  payload: /payload|load|kg/i,
  runtime_per_charge: /runtime|battery|charge|shift/i,
  cost: /cost|price|roi|tco/i,
};

const INPUTS = {
  target_throughput_per_hour: 'containers per hour',
  max_interventions_per_hour: 'interventions per hour',
  min_uptime_pct: '% uptime',
  payload_kg: 'kg per container',
  shift_hours: 'hours per shift',
};

export function validateInputs(inputs = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(inputs ?? {})) {
    if (!(key in INPUTS)) return { error: `unknown_input:${key}` };
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || (key === 'min_uptime_pct' && n > 100)) return { error: `invalid_input:${key}` };
    clean[key] = n;
  }
  return { inputs: clean };
}

const metricOf = (row) =>
  present(row.metric_name) ? { name: row.metric_name, operator: row.metric_operator ?? null, value: row.metric_value ?? null, unit: row.metric_unit ?? null, period: row.metric_period ?? null } : null;

export async function buildTaskPlan(db, { taskId, inputs = {} }) {
  const load = async (dataset) =>
    ((await db.prepare("SELECT data, snapshot_id FROM premium_rows WHERE dataset = ? AND visibility = 'customer' ORDER BY position").bind(dataset).all()).results ?? []).map(
      (r) => ({ ...JSON.parse(r.data), _snapshot: r.snapshot_id }),
    );
  const [links, deployments, evaluations, analysis] = await Promise.all([
    load('evidence-links'),
    load('deployments'),
    load('task-evaluations'),
    load('container-handling'),
  ]);
  const taskLinks = links.filter((l) => l.task_id === taskId);
  const gaps = [];
  if (!taskLinks.length) gaps.push(`No documented evidence is linked to task ${taskId}.`);

  const byClaim = new Map(deployments.filter((d) => present(d.claim_id)).map((d) => [d.claim_id, d]));
  const byDeployment = new Map(deployments.filter((d) => present(d.deployment_id)).map((d) => [d.deployment_id, d]));
  const models = [...new Set(taskLinks.map((l) => l.model_id).filter(present))];

  const candidates = models.map((modelId) => {
    const modelLinks = taskLinks.filter((l) => l.model_id === modelId);
    const evaluation = evaluations.find((e) => e.task_id === taskId && e.model_id === modelId) ?? null;
    const claims = modelLinks.map((link) => {
      const dep = byClaim.get(link.claim_id) ?? byDeployment.get(link.deployment_id) ?? {};
      const stageValue = link.stage_at_source_date ?? dep.operational_status ?? dep.relationship_type ?? null;
      return {
        claim_id: link.claim_id ?? null,
        link_id: link.link_id ?? null,
        statement: link.statement ?? dep.claim_text ?? null,
        evidence_stage: stageOf(stageValue),
        stage_source_value: stageValue,
        source: {
          url: link.source_url ?? dep.source_url ?? null,
          publication_date: link.source_publication_date ?? dep.publication_date ?? null,
          role: link.source_role ?? dep.source_role ?? null,
          rechecked_at: link.source_rechecked_at ?? dep.accessed_at ?? null,
        },
        operating_conditions: {
          robot_version: dep.robot_version ?? null,
          site: dep.site_name ?? null,
          city: dep.city ?? null,
          country: dep.country ?? null,
          sector: dep.sector ?? null,
          environment: dep.environment ?? null,
          workflow_from: dep.workflow_from ?? null,
          workflow_to: dep.workflow_to ?? null,
          integration_dependencies: dep.integration_dependencies ?? null,
        },
        metrics: [metricOf(link), metricOf(dep)].filter(Boolean),
        limitations: link.limitations ?? dep.open_questions_notes ?? null,
        _dep: dep,
      };
    });
    const deps = claims.map((c) => c._dep);
    const versions = [...new Set(deps.map((d) => d.robot_version).filter(present))];
    const integratorIds = [
      ...new Set([
        ...modelLinks.map((l) => l.integrator_id).filter(present),
        ...deps.filter((d) => /integrat/i.test(d.organization_role ?? '')).map((d) => d.organization_id).filter(present),
      ]),
    ];
    const measured = new Set(
      claims.flatMap((c) => c.metrics).flatMap((m) => Object.entries(MEASUREMENTS).filter(([, re]) => re.test(`${m.name} ${m.unit ?? ''}`)).map(([k]) => k)),
    );
    const candidateGaps = [];
    if (!evaluation) candidateGaps.push('No task evaluation for this model.');
    if (!claims.some((c) => ['pilot', 'sustained_operation'].includes(c.evidence_stage))) candidateGaps.push('No pilot or sustained-operation evidence for this task.');
    if (claims.length && claims.every((c) => /manufacturer|vendor/i.test(c.source.role ?? ''))) candidateGaps.push('All evidence comes from the manufacturer.');
    if (!versions.length) candidateGaps.push('Robot version not disclosed in the evidence.');
    if (!integratorIds.length) candidateGaps.push('Integrator not documented.');
    for (const c of claims) {
      if (c.evidence_stage === 'unclassified') candidateGaps.push(`Stage not classified for claim ${c.claim_id ?? c.link_id} ("${c.stage_source_value ?? 'empty'}").`);
      if (!present(c.source.publication_date)) candidateGaps.push(`Claim ${c.claim_id ?? c.link_id} has no publication date.`);
      if (!present(c.source.url)) candidateGaps.push(`Claim ${c.claim_id ?? c.link_id} has no source URL.`);
    }
    for (const c of claims) delete c._dep;
    return {
      model_id: modelId,
      robot_model: evaluation?.model ?? deps.find((d) => present(d.robot_model))?.robot_model ?? null,
      manufacturer: deps.find((d) => present(d.manufacturer))?.manufacturer ?? null,
      robot_versions: versions,
      integrator_ids: integratorIds,
      evaluation: evaluation
        ? Object.fromEntries(Object.entries(evaluation).filter(([k]) => !['task_id', 'model_id', 'model', 'id', '_snapshot'].includes(k)))
        : null,
      claims,
      measured: [...measured],
      missing_measurements: Object.keys(MEASUREMENTS).filter((k) => !measured.has(k)),
      evidence_gaps: candidateGaps,
    };
  });

  const scope = analysis.filter((r) => r.traceability === taskId || String(r.traceability ?? '').includes(taskId));
  const assumptions = [
    ...scope.filter((r) => /alcance|scope/i.test(r.layer ?? '')).map((r) => `${r.element}: ${r.result}`),
    'Claims are reported as their sources state them; manufacturer statements are not independent verification.',
    'Evidence stages: vendor_announcement < demonstration < pilot < sustained_operation.',
  ];
  const constraints = Object.entries(inputs).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v} ${INPUTS[k]}`);
  const anyMeasured = (key) => candidates.filter((c) => c.measured.includes(key)).map((c) => c.model_id);
  const check = (id, title, inputKey, criterion, measurement) => ({
    id,
    check: title,
    status: inputs[inputKey] != null ? 'quantified' : 'needs_input',
    criterion: inputs[inputKey] != null ? criterion(inputs[inputKey]) : null,
    needs_input: inputs[inputKey] != null ? null : inputKey,
    documented_for: anyMeasured(measurement),
  });
  const shift = inputs.shift_hours;
  const pilotChecks = [
    check('throughput', 'Sustained throughput at the target cell', 'target_throughput_per_hour', (v) => `>= ${v} containers per hour, averaged over ${shift ?? 'a full'}${shift ? ' h' : ''} shift`, 'throughput'),
    check('interventions', 'Human interventions', 'max_interventions_per_hour', (v) => `<= ${v} interventions per hour, every intervention logged`, 'intervention_rate'),
    check('uptime', 'Availability', 'min_uptime_pct', (v) => `>= ${v}% of scheduled time, charging included`, 'uptime'),
    check('payload', 'Container weight', 'payload_kg', (v) => `handles ${v} kg containers at the measured cycle time`, 'payload'),
    check('shift', 'Shift coverage', 'shift_hours', (v) => `covers ${v} h per shift including charging or swaps`, 'runtime_per_charge'),
  ];
  const evidenceGaps = [...gaps];
  for (const key of Object.keys(MEASUREMENTS)) if (!anyMeasured(key).length && candidates.length) evidenceGaps.push(`No candidate has a documented ${key.replace(/_/g, ' ')} measurement.`);
  for (const c of pilotChecks) if (c.status === 'needs_input') evidenceGaps.push(`Pilot criterion "${c.check}" needs the input ${c.needs_input}.`);

  return {
    task: { id: taskId, assumptions, constraints },
    candidates,
    pilot_checks: pilotChecks,
    evidence_gaps: evidenceGaps,
    snapshot: links[0]?._snapshot ?? null,
  };
}
