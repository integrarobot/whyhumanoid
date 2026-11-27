import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { buildVerificationView } from '../server/src/verification/standard.js';
import { buildPages } from './build-pages.mjs';
import { renderVerificationProfile, renderVerificationComparison, renderVerificationStandard, renderVerificationMarkdown, renderVerificationReport, renderPreservation } from './verification-view.mjs';

const code = readFileSync(new URL('../assets/verification.js', import.meta.url), 'utf8');
const asOf = '2026-11-27';
const robot = { id: 1, slug: 'test-robot-1', path: '/humanoids/test-robot-1/', name: 'Test robot', lab: 'Synthetic maker' };
const metric = (value, tier = 'V2_Technical_Doc', extra = {}) => ({ field: 'payload_sustained_bilateral_kg', value, unit: 'kg', status: 'source_reported', verification_tier: tier, conditions: 'SYNTHETIC TEST: same protocol', comparison_group: 'synthetic-protocol', verified_at: asOf, freshness: { state: 'fresh', visual_tier: tier }, ...extra });
const setClock = (dom, days = 0) => {
  const NativeDate = dom.window.Date;
  const now = Date.parse(asOf) + days * 86400000;
  dom.window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
};

test('legacy robot exposes pending atomic fields without promoting legacy payload or manufacturing history', () => {
  const view = buildVerificationView(robot.slug, [], asOf);
  const doc = new JSDOM(renderVerificationProfile(robot, view)).window.document;
  assert.match(doc.querySelector('#verification').textContent, /0 structured attributes/);
  assert.match(doc.querySelector('#verification').textContent, /Pending audit; no HRL assigned/);
  assert.match(doc.querySelector('#verification').textContent, /not evidence that the specifications have never changed/);
  assert.equal(doc.querySelectorAll('.vt-v1,.vt-v2,.vt-v3,.vt-v4').length, 0);
  assert.match(renderVerificationMarkdown(view), /verification_tier=Pending_Audit; verified_at=null/);
});

test('comparison defaults to sustained payload and V2+; peak, legacy, stale and conflicting values do not leak into default view', () => {
  const robots = [robot, { ...robot, id: 2, name: 'Peak only' }, { ...robot, id: 3, name: 'Legacy only' }, { ...robot, id: 4, name: 'Stale documented' }, { ...robot, id: 5, name: 'Conflicting claim' }];
  const views = new Map([
    [1, { metrics: { payload_sustained_bilateral_kg: metric(10), payload_peak_bilateral_kg: metric(30, 'V1_OEM_Claim', { field: 'payload_peak_bilateral_kg' }) } }],
    [2, { metrics: { payload_peak_bilateral_kg: metric(50, 'V1_OEM_Claim', { field: 'payload_peak_bilateral_kg' }) } }],
    [3, { metrics: { payload_unclassified_claim_kg: metric(90) } }],
    [4, { metrics: { payload_sustained_bilateral_kg: metric(20, 'V2_Technical_Doc', { verified_at: '2025-11-26', freshness: { state: 'stale', visual_tier: 'V1_OEM_Claim' } }) } }],
    [5, { metrics: { payload_sustained_bilateral_kg: metric(80, 'V2_Technical_Doc', { status: 'conflicting_evidence' }) } }],
  ]);
  const dom = new JSDOM(renderVerificationComparison(robots, views, asOf), { runScripts: 'outside-only', url: 'https://whyhumanoid.com/humanoids/' });
  setClock(dom); dom.window.eval(code);
  const d = dom.window.document;
  assert.equal(d.querySelector('#verification-metric').value, 'payload_sustained_bilateral_kg');
  assert.equal(d.querySelectorAll('#verification-comparison-output tbody tr').length, 1);
  assert.match(d.querySelector('#verification-comparison-output').textContent, /Test robot/);
  assert.doesNotMatch(d.querySelector('#verification-comparison-output').textContent, /Peak only|Legacy only|Stale documented|Conflicting claim/);
  d.querySelector('#verification-v2').checked = false;
  d.querySelector('#verification-metric').value = 'payload_peak_bilateral_kg';
  d.querySelector('#verification-metric').dispatchEvent(new dom.window.Event('change'));
  assert.equal(d.querySelectorAll('#verification-comparison-output tbody tr').length, 2);
  assert.doesNotMatch(d.querySelector('#verification-comparison-output').textContent, /Legacy only/);
  assert.match(d.querySelector('#verification-comparison-output caption').textContent, /without a cross-protocol ranking/);
  dom.window.close();
});

test('profile escapes source text and labels conflicting and retracted evidence as excluded', () => {
  const view = buildVerificationView(robot.slug, [], asOf);
  view.metrics.payload_sustained_bilateral_kg = metric(null, 'Pending_Audit', { status: 'conflicting_evidence', conditions: '<img src=x onerror=alert(1)>', source_url: 'javascript:alert(1)' });
  view.metrics.payload_peak_bilateral_kg = metric(null, 'Pending_Audit', { status: 'retracted' });
  const d = new JSDOM(renderVerificationProfile(robot, view)).window.document;
  assert.equal(d.querySelectorAll('img,script,a[href^="javascript:"]').length, 0);
  assert.match(d.body.textContent, /Conflicting evidence: excluded/);
  assert.match(d.body.textContent, /Retracted: excluded/);
});

test('governance exposes an honest, evidence-specific correction path with contextual entity', () => {
  const dom = new JSDOM(renderVerificationStandard(), { runScripts: 'outside-only', url: 'https://whyhumanoid.com/method/?entity=%2Fhumanoids%2Ftest-robot-1%2F#corrections' });
  dom.window.eval(code);
  const d = dom.window.document;
  assert.equal(d.querySelector('#verification-correction-entity').value, robot.path);
  assert.equal(d.querySelector('form').getAttribute('action'), 'mailto:javier@integrarobot.com');
  assert.match(d.querySelector('form').textContent, /Nothing is submitted or stored/);
  assert.match(d.body.textContent, /Explicit evidence of payment/);
  assert.match(d.body.textContent, /patent establishes its legal or technical disclosure only/);
  assert.match(d.body.textContent, /manufacturer cannot buy an HRL level/);
  dom.window.close();
});

test('preservation joins the manifest without rewriting claim history or claiming a public archived URL', () => {
  const source = 'https://example.com/synthetic-source';
  const before = { events: [{ source_url: source, archive_status: 'pending', source_archive_url: null }] };
  const manifest = { captures: [{ source_url: source, status: 'captured', captured_at: '2026-11-27T19:00:00Z', bytes: 42, sha256: 'a'.repeat(64), source_archive_url: null }] };
  const preserved = renderPreservation(source, manifest);
  assert.match(preserved, /Preservation copy captured 2026-11-27/);
  assert.match(preserved, /public archived URL is not available/);
  assert.match(preserved, /SHA-256/);
  assert.equal(before.events[0].archive_status, 'pending');
  assert.doesNotMatch(preserved, /href=.*archive/);
});

test('freshness advances at 181 and 366 days on opening without changing the original evidence tier', () => {
  for (const [days, expectedClass, eligible] of [[180, null, 1], [181, '.vf-review', 1], [365, '.vf-review', 1], [366, '.vf-stale', 0]]) {
    const view = buildVerificationView(robot.slug, [], asOf);
    view.metrics.payload_sustained_bilateral_kg = metric(10);
    const html = renderVerificationProfile(robot, view) + renderVerificationComparison([robot], new Map([[robot.id, view]]), asOf);
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://whyhumanoid.com/humanoids/' });
    setClock(dom, days); dom.window.eval(code);
    const d = dom.window.document;
    if (expectedClass) assert.ok(d.querySelector(expectedClass), `day ${days}`);
    else assert.equal(d.querySelectorAll('.vf-review,.vf-stale').length, 0);
    assert.equal(d.querySelectorAll('#verification-comparison-output tbody tr').length, eligible, `day ${days}`);
    assert.ok(d.querySelector('#verification .vt-v2'), 'original evidence tier retained');
    assert.equal(view.metrics.payload_sustained_bilateral_kg.verification_tier, 'V2_Technical_Doc');
    assert.equal(view.metrics.payload_sustained_bilateral_kg.verified_at, asOf);
    dom.window.close();
  }
});

test('real robot profiles join ledger evidence by the canonical path rather than the r-prefixed catalogue slug', () => {
  const { files } = buildPages();
  const neo = new JSDOM(files.get('humanoids/1x-neo-home-robot-1/index.html')).window.document;
  const row = [...neo.querySelectorAll('#verification tbody tr')].find((r) => r.querySelector('th')?.textContent === 'Unclassified runtime claim');
  assert.match(row?.querySelector('td')?.textContent ?? '', /^4 h$/);
  assert.ok(row.querySelector('.vt-v1'));
  assert.ok(neo.querySelector('script[src^="/assets/verification.js"]'));
  const ledger = JSON.parse(readFileSync(new URL('../data/verification/claims.json', import.meta.url), 'utf8'));
  const atlas = ledger.events.find((e) => e.entity_id.includes('atlas') && e.verification_tier === 'V2_Technical_Doc');
  assert.ok(atlas, 'Atlas technical attribute is in the reviewed cohort');
  const d = new JSDOM(files.get(`humanoids/${atlas.entity_id}/index.html`)).window.document;
  assert.ok(d.querySelector('#verification .vt-v2'));
  for (const entity of new Set(ledger.events.map((e) => e.entity_id))) {
    const doc = new JSDOM(files.get(`humanoids/${entity}/index.html`)).window.document;
    assert.ok(doc.querySelector('#verification .vt-v1,#verification .vt-v2,#verification .vt-v3,#verification .vt-v4'), entity);
  }
});

test('real launch cohort and baseline counts agree with the public ledger, with every source and open review preserved', () => {
  const read = (name) => JSON.parse(readFileSync(new URL(`../data/verification/${name}.json`, import.meta.url), 'utf8'));
  const cohort = read('audit-cohort'), report = read('report-quarterly'), ledger = read('claims'), archives = read('archives');
  assert.equal(report.cohort_models, cohort.records.length);
  assert.equal(report.source_screenings, cohort.records.length);
  assert.equal(report.claims_recorded, ledger.events.length);
  assert.equal(new Set(cohort.records.map((r) => r.entity_id)).size, cohort.records.length);
  assert.equal(report.deep_audits_completed, 0);
  for (const [tier, n] of Object.entries(report.claims_by_tier)) assert.equal(n, ledger.events.filter((e) => e.verification_tier === tier).length);
  for (const [field, n] of Object.entries(report.claims_by_field)) assert.equal(n, ledger.events.filter((e) => e.field === field).length);
  const html = renderVerificationReport(report, cohort, archives);
  const d = new JSDOM(html).window.document;
  assert.equal(d.querySelectorAll('section:last-child > details').length, cohort.records.length);
  assert.match(d.body.textContent, /not a completed quarter/);
  assert.match(d.body.textContent, /(?:not an estimate|do not establish) that no such deployments exist/);
  for (const r of cohort.records) for (const s of r.sources) assert.ok([...d.querySelectorAll('a')].some((a) => a.href === s.url));
  for (const a of archives.captures.filter((c) => c.status === 'captured' && cohort.records.some((r) => r.sources.some((s) => s.url === c.source_url)))) assert.match(d.body.textContent, new RegExp(a.sha256));
  assert.doesNotMatch(html, /\/Users\/|file:\/\//);
});
