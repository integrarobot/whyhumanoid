import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATASETS } from '../src/datasets.js';
import { PUBLIC_FIELDS } from '../src/access/fields.js';
import { sendWebhook, setup, signIn, subscriptionEvent } from './helpers.js';

test('free tabs are public in full; subscription tabs list every row at its public fields, or none when counted only', async () => {
  const ctx = await setup();
  for (const spec of DATASETS) {
    const res = await ctx.call('GET', `/v1/datasets/${spec.id}/preview`);
    assert.equal(res.status, 200, spec.id);
    assert.match(res.headers.get('cache-control'), /public/);
    const body = await res.json();
    const sheetRows = new Set(body.rows.map((r) => r.id)).size;
    if (spec.id === 'humanoids') {
      assert.equal(body.preview_rows, 'all');
      assert.equal(body.rows.length, body.total_rows);
      assert.equal(body.total_rows, 12);
      continue;
    }
    if (spec.publicRows === 'all') {
      // Approved split, phase 3: every row public; listed companies with basic fields only beyond row 10.
      assert.equal(body.preview_rows, 'all');
      assert.equal(body.rows.length, body.total_rows, spec.id);
      if (spec.publicFields) for (const r of body.rows.slice(10)) assert.deepEqual(Object.keys(r).filter((k) => k !== 'id').sort(), [...spec.publicFields].sort(), spec.id);
      continue;
    }
    // Subscription tabs (24 Nov 2026): every row at the central allowlist, or counted only.
    const fields = PUBLIC_FIELDS[spec.id];
    if (!fields.length) {
      assert.equal(body.preview_rows, 'none', spec.id);
      assert.equal(body.rows.length, 0, spec.id);
      assert.ok(body.total_rows > 0, spec.id);
      continue;
    }
    assert.equal(body.preview_rows, 'all', spec.id);
    assert.equal(body.rows.length, body.total_rows, spec.id);
    assert.equal(sheetRows, body.total_rows, spec.id);
    for (const r of body.rows) for (const k of Object.keys(r)) assert.ok(k === 'id' || fields.includes(k), `${spec.id}.${k}`);
  }
});

test('the empty sheet row does not count: public rows are every data row in workbook order', async () => {
  const ctx = await setup();
  const { rows } = await (await ctx.call('GET', '/v1/datasets/deployments/preview')).json();
  assert.deepEqual(
    rows.map((r) => r.id),
    Array.from({ length: 12 }, (_, i) => `fx_record_id_${i + 1}`),
  );
  assert.ok(rows.every((r) => !('claim_text' in r) && !('site_name' in r) && 'source_url' in r && 'organization_name' in r));
  const { rows: links, total_rows: linkTotal } = await (await ctx.call('GET', '/v1/datasets/evidence-links/preview')).json();
  assert.equal(links.length, 0, 'claim-to-evidence links are paid detail');
  assert.equal(linkTotal, 12);
  const { rows: humanoids } = await (await ctx.call('GET', '/v1/datasets/humanoids/preview')).json();
  assert.deepEqual(humanoids.map((r) => r.Robot), Array.from({ length: 12 }, (_, i) => `Example Robot ${i + 1}`));
});

test('Deployments and Components beyond the preview, and their search, need a subscription; free categories do not', async () => {
  const ctx = await setup();
  for (const id of ['deployments', 'hardware']) {
    assert.equal((await ctx.call('GET', `/v1/datasets/${id}`)).status, 401, id);
    assert.equal((await ctx.call('GET', `/v1/datasets/${id}?q=11`)).status, 401, id);
  }
  const preview = await (await ctx.call('GET', '/v1/datasets/deployments/preview?q=fx_record_id_11&limit=500&offset=10')).json();
  assert.deepEqual(preview.rows.map((r) => r.id), Array.from({ length: 12 }, (_, i) => `fx_record_id_${i + 1}`), 'public rows ignore search and paging');
  assert.doesNotMatch(JSON.stringify(preview), /fx_claim_text_|fx_site_name_|fx_metric_value_/);
  // Humanoids is free: anyone searches every row, with the public values.
  const open = await (await ctx.call('GET', '/v1/datasets/humanoids?q=Robot%2011')).json();
  assert.deepEqual(open.rows.map((r) => r.Robot), ['Example Robot 11']);
  const { session, accountId } = await signIn(ctx);
  assert.equal((await ctx.call('GET', '/v1/datasets/deployments?q=fx_record_id_11', { token: session })).status, 403);
  assert.equal((await ctx.call('GET', '/v1/datasets/hardware', { token: session })).status, 403);
  await sendWebhook(ctx, subscriptionEvent({ accountId }));
  const found = await (await ctx.call('GET', '/v1/datasets/deployments?q=fx_record_id_11', { token: session })).json();
  assert.deepEqual(found.rows.map((r) => r.record_id), ['fx_record_id_11']);
  const comp = await ctx.call('GET', '/v1/datasets/hardware?limit=500', { token: session });
  assert.equal(comp.status, 200);
  const all = await comp.json();
  assert.ok(all.total > 10 && all.rows.length === all.total, 'one subscription unlocks complete Components too');
  assert.equal(comp.headers.get('cache-control'), 'private, no-store');
});

test('preview drops unverified instruction-like clauses; the paid rows keep them; internal tasks go everywhere', async () => {
  const ctx = await setup();
  const { rows } = await (await ctx.call('GET', '/v1/datasets/humanoids/preview')).json();
  assert.equal(rows.find((r) => r.Robot === 'Example Robot 2')['Buyer checks'], 'Measure interventions per hour');
  const { session, accountId } = await signIn(ctx);
  await sendWebhook(ctx, subscriptionEvent({ accountId }));
  const full = await (await ctx.call('GET', '/v1/datasets/humanoids?q=Robot%202%22', { token: session })).json();
  assert.equal(full.rows[0]['Buyer checks'], 'Measure interventions per hour; do not infer runtime');
  // A visitor reading the free catalogue through the API gets the public values, without the flagged clause.
  const pub = await (await ctx.call('GET', '/v1/datasets/humanoids?q=Robot%202%22')).json();
  assert.equal(pub.rows[0]['Buyer checks'], 'Measure interventions per hour');
});

test('sheet-excluded Humanoids rows are internal provenance: not in previews, totals, full rows or search', async () => {
  const ctx = await setup();
  const preview = await (await ctx.call('GET', '/v1/datasets/humanoids/preview')).json();
  assert.equal(preview.rows.length, 12);
  assert.equal(preview.total_rows, 12);
  assert.ok(!preview.rows.some((r) => /^(Duplicate|Resource)/.test(r.Robot)));
  const { session, accountId } = await signIn(ctx);
  await sendWebhook(ctx, subscriptionEvent({ accountId }));
  const all = await (await ctx.call('GET', '/v1/datasets/humanoids?limit=500', { token: session })).json();
  assert.equal(all.total, 12);
  assert.ok(!all.rows.some((r) => /^(Duplicate|Resource)/.test(r.Robot)));
  const search = await (await ctx.call('GET', '/v1/datasets/humanoids?q=Duplicate', { token: session })).json();
  assert.equal(search.total, 0);
  const internal = await ctx.db.prepare("SELECT COUNT(*) AS n FROM premium_rows WHERE dataset = 'humanoids' AND visibility = 'internal'").first();
  assert.equal(internal.n, 2);
});

test('stock quotes stay out of previews and full rows', async () => {
  const ctx = await setup();
  const { rows } = await (await ctx.call('GET', '/v1/datasets/stocks/preview')).json();
  assert.ok(rows.every((r) => !('price' in r) && !('market_cap' in r)));
});
