// Private questionnaires of the two custom reports (Javier, 25 Nov 2026; fields and acceptance criteria from Codex's
// launch brief). One definition serves the app form and the server validation, so the browser never decides what is
// complete. Neutral wording: no named sectors, company examples or supplier tiers. The source UI is English; answers
// may be in English or Spanish; the report language is chosen below.
//
// Field kinds:
//   text       one line, up to 200 characters
//   url        an http(s) address, up to 300 characters
//   paragraph  free text, up to 4,000 characters
//   select     one of `options`
//   multi      any of `options` (optional extra detail goes in a paragraph next to it)
//   tasks      1 to 3 candidate tasks, each a paragraph of up to 4,000 characters
//   ack        a checkbox that must be ticked
// An estimate, a range or "Unknown" is a valid answer wherever `unknown` is true: required means "answered", not
// "measured". No field asks for balance sheets or forces a monetary figure.

import { INVESTMENT_THESIS_ID } from './services.js';

export const QUESTIONNAIRE_VERSION = '2026-11-25.1';

const LIMITS = { text: 200, url: 300, paragraph: 4000 };
export const MAX_TASKS = 3;

const EMPLOYEES = ['1-9', '10-49', '50-249', '250-999', '1000+', 'Prefer not to say'];
const LANGUAGES = [['en', 'English'], ['es', 'Spanish']];

export const SHARED_FIELDS = [
  { id: 'company_name', label: 'Company name', kind: 'text', required: true },
  { id: 'website', label: 'Website', kind: 'url', required: false },
  { id: 'activity', label: 'Main activity, products or services', kind: 'paragraph', required: true, hint: 'What the company does and sells, in a few sentences.' },
  { id: 'country', label: 'Country', kind: 'text', required: true },
  { id: 'site', label: 'Site or business unit this report covers', kind: 'text', required: true },
  { id: 'city', label: 'City', kind: 'text', required: false },
  { id: 'respondent', label: 'Your name and role', kind: 'text', required: true },
  { id: 'employees', label: 'Number of employees', kind: 'select', required: false, options: EMPLOYEES.map((v) => [v, v]) },
  { id: 'decision', label: 'The decision this report should support, and the outcome you want', kind: 'paragraph', required: true },
  { id: 'report_language', label: 'Report language', kind: 'select', required: true, options: LANGUAGES },
];

const DIVERSIFICATION = [
  { id: 'offer_and_role', label: 'Current products or services, and your role in the value chain', kind: 'paragraph', required: true,
    extra: { id: 'offer_types', label: 'What you supply (optional)', kind: 'multi', required: false,
      options: ['Products', 'Systems', 'Subsystems', 'Components', 'Materials', 'Equipment', 'Software', 'Engineering', 'Integration', 'Testing', 'Other'].map((v) => [v.toLowerCase(), v]) } },
  { id: 'processes', label: 'Main processes, and which are in-house or outsourced', kind: 'paragraph', required: true },
  { id: 'capabilities', label: 'Materials, technologies and technical capabilities', kind: 'paragraph', required: true },
  { id: 'engineering', label: 'Design, engineering, simulation, prototyping and assembly capability', kind: 'paragraph', required: true, hint: '"None" is a valid answer.' },
  { id: 'volumes', label: 'Typical volumes, batch sizes, changeovers and spare capacity', kind: 'paragraph', required: true, unknown: true, hint: 'Approximate figures are fine.' },
  { id: 'quality', label: 'Quality, testing, tolerances and certifications', kind: 'paragraph', required: true, unknown: true, hint: '"None" is a valid answer.' },
  { id: 'supply_chain', label: 'Supply chain and traceability', kind: 'paragraph', required: false },
  { id: 'adaptation', label: 'How you have adapted to new markets or requirements', kind: 'paragraph', required: false },
  { id: 'robotics_experience', label: 'Experience or projects in robotics', kind: 'paragraph', required: false, hint: '"None" is a valid answer.' },
  { id: 'skills', label: 'Skills, team, R&D and partnerships you can draw on', kind: 'paragraph', required: true, hint: 'Gaps are useful to know too.' },
  { id: 'robotics_interest', label: 'Robotics areas that interest you, and any you want to exclude', kind: 'paragraph', required: true, hint: '"Help us identify them" is a valid answer.' },
  { id: 'investment', label: 'Investment capacity or range, timescale, and geographic or commercial priorities', kind: 'paragraph', required: true, unknown: true, hint: 'A range or "Unknown" is fine. No figure is required.' },
  { id: 'planned_investments', label: 'Planned investments in capabilities', kind: 'paragraph', required: false },
  { id: 'constraints', label: 'Constraints, dependencies, risks or other context', kind: 'paragraph', required: false },
  { id: 'business_context', label: 'Years operating, revenue range and currency, and the share of the business this concerns', kind: 'paragraph', required: false, hint: 'Ranges are enough. We do not need financial statements.' },
];

const INTEGRATION = [
  { id: 'process_problem', label: 'The process or area, and the problem to solve', kind: 'paragraph', required: true },
  { id: 'workflow', label: 'The current workflow, step by step: inputs, outputs and handoffs', kind: 'paragraph', required: true },
  { id: 'tasks', label: 'Candidate tasks (1 to 3)', kind: 'tasks', required: true,
    hint: 'For each task: its name and action; the objects or materials handled, with approximate dimensions and weights; the precision needed; how much it varies; exceptions; and how often it happens (cycle time or volume). Unknown measurements are fine.' },
  { id: 'people', label: 'People, shifts, hours and time spent on these tasks', kind: 'paragraph', required: true, unknown: true },
  { id: 'pain_points', label: 'Pain points and baseline measures (delays, errors, workload, staffing, output, quality)', kind: 'paragraph', required: true, unknown: true },
  { id: 'workspace', label: 'Workspace: layout, access, floor, lighting, temperature, dust or liquids, and anything unusual', kind: 'paragraph', required: true },
  { id: 'safety', label: 'Interaction with people, and known safety or regulatory constraints', kind: 'paragraph', required: true, unknown: true },
  { id: 'existing_systems', label: 'Existing machines, automation, software and connections', kind: 'paragraph', required: true },
  { id: 'flexibility', label: 'What can change, and what must stay as it is', kind: 'paragraph', required: true },
  { id: 'owner', label: 'Internal technical or operations owner (role only) and your support and maintenance capability', kind: 'paragraph', required: true, hint: 'A role, not a name. Please do not include third parties\' personal contact details.' },
  { id: 'budget', label: 'Budget range, time horizon, and target outcome or payback', kind: 'paragraph', required: true, unknown: true, hint: 'A range or "Unknown" is fine.' },
  { id: 'past_attempts', label: 'Past automation attempts and lessons learned', kind: 'paragraph', required: false },
  { id: 'costs', label: 'Relevant approximate costs: labour, downtime, rework, support', kind: 'paragraph', required: false, unknown: true, hint: 'Ranges, currency, or "Unknown".' },
  { id: 'pilot_criteria', label: 'How you would judge a first pilot: success measures and stop criteria', kind: 'paragraph', required: true },
  { id: 'additional', label: 'Additional context or information you know is missing', kind: 'paragraph', required: false },
];

export const ACKNOWLEDGEMENT = { id: 'acknowledgement', label: 'I have reviewed this information and am authorised to share it for this report.', kind: 'ack', required: true };

// Service ids are the stable anchors of 23 Nov 2026 (server/src/access/matrix.js).
export const QUESTIONNAIRES = Object.freeze({
  'humanoid-adoption-assessment': [...SHARED_FIELDS, ...INTEGRATION, ACKNOWLEDGEMENT],
  'component-manufacturing-study': [...SHARED_FIELDS, ...DIVERSIFICATION, ACKNOWLEDGEMENT],
  [INVESTMENT_THESIS_ID]: [
    { id: 'company_name', label: 'Company name as listed in Investment', kind: 'text', required: true },
    { id: 'security', label: 'Ticker and exchange', kind: 'text', required: true, hint: 'Include the share class if the company has more than one.' },
    { id: 'research_question', label: 'Research question you want the report to address', kind: 'paragraph', required: false, hint: 'For example, how much revenue is linked to robotics, or how credible are the announced customer orders?' },
    { id: 'source_links', label: 'Public sources or existing theses to consider', kind: 'paragraph', required: false, hint: 'One link per line. Share public material only.' },
    { id: 'report_language', label: 'Report language', kind: 'select', required: true, options: LANGUAGES },
    ACKNOWLEDGEMENT,
  ],
});

const flat = (fields) => fields.flatMap((f) => (f.extra ? [f, f.extra] : [f]));

// The definition the app renders (labels, hints, kinds, limits). Same for every visitor; no answers.
export function questionnaireFor(service) {
  const fields = QUESTIONNAIRES[service];
  if (!fields) return null;
  return { version: QUESTIONNAIRE_VERSION, service, limits: LIMITS, max_tasks: MAX_TASKS, fields };
}

const isUrl = (v) => { try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; } };

// Cleans an answers object to the known fields and their limits. Unknown keys are dropped; over-long values are an
// error (never truncated silently). final=true also requires every required field.
export function validateAnswers(service, raw, { final = false } = {}) {
  const fields = QUESTIONNAIRES[service];
  if (!fields) return { error: 'unknown_service' };
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'invalid_answers' };
  const answers = {};
  const problems = [];
  for (const f of flat(fields)) {
    const v = raw[f.id];
    const empty = v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && !v.some((x) => String(x ?? '').trim()));
    if (empty) {
      if (final && f.required) problems.push({ field: f.id, problem: 'required' });
      continue;
    }
    if (f.kind === 'ack') {
      if (v !== true) problems.push({ field: f.id, problem: 'must_be_true' });
      else answers[f.id] = true;
    } else if (f.kind === 'select') {
      if (!f.options.some(([id]) => id === v)) problems.push({ field: f.id, problem: 'not_an_option' });
      else answers[f.id] = v;
    } else if (f.kind === 'multi') {
      if (!Array.isArray(v) || v.some((x) => !f.options.some(([id]) => id === x))) problems.push({ field: f.id, problem: 'not_an_option' });
      else answers[f.id] = [...new Set(v)];
    } else if (f.kind === 'tasks') {
      if (!Array.isArray(v) || v.length > MAX_TASKS) { problems.push({ field: f.id, problem: 'one_to_three_tasks' }); continue; }
      const tasks = v.map((t) => String(t ?? '').trim()).filter(Boolean);
      if (tasks.some((t) => t.length > LIMITS.paragraph)) problems.push({ field: f.id, problem: 'too_long' });
      else if (tasks.length) answers[f.id] = tasks;
      else if (final && f.required) problems.push({ field: f.id, problem: 'required' });
    } else {
      const text = String(v).trim();
      const limit = LIMITS[f.kind] ?? LIMITS.paragraph;
      if (typeof v !== 'string') problems.push({ field: f.id, problem: 'not_text' });
      else if (text.length > limit) problems.push({ field: f.id, problem: 'too_long' });
      else if (f.kind === 'url' && text && !isUrl(text)) problems.push({ field: f.id, problem: 'not_a_web_address' });
      else if (text) answers[f.id] = text;
      else if (final && f.required) problems.push({ field: f.id, problem: 'required' });
    }
  }
  return problems.length ? { error: 'invalid_answers', problems, answers } : { answers };
}

// Progress for the app: required fields answered out of required fields.
export function progress(service, answers) {
  const required = flat(QUESTIONNAIRES[service] ?? []).filter((f) => f.required);
  const done = required.filter((f) => {
    const v = answers?.[f.id];
    return f.kind === 'ack' ? v === true : Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? '').trim());
  }).length;
  return { done, required: required.length };
}
