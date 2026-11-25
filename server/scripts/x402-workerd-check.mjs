#!/usr/bin/env node
// x402 in the real Workers runtime (24 Nov 2026). Runs the BUILT Worker bundle (dist/worker.dashboard.js, the file that
// is deployed) in workerd through `wrangler dev` with a local D1, and pays its deployment-evidence route with the
// official x402 client. Verification and settlement go to the official x402 facilitator code (test/x402-facilitator.js)
// over a simulated chain, served on the loopback. No Cloudflare account, no network, no funds, no real keys.
//
//   node scripts/build-dashboard.mjs <esbuild 0.27.7>
//   node scripts/x402-workerd-check.mjs [--wrangler <path to a wrangler 4.x binary>]
//
// Checks: free description; 400 before payment for a bad query; 402 with the official v2 PaymentRequired and a valid
// Bazaar extension and no data; a paid 200 with PAYMENT-RESPONSE, settled once; a replay with the same payment answered
// without a second settlement; the payment row in D1. Prints one line per check and exits 1 on any failure.

import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { privateKeyToAccount } from 'viem/accounts';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { decodePaymentRequiredHeader, decodePaymentResponseHeader } from '@x402/core/http';
import { PaymentRequiredV2Schema } from '@x402/core/schemas';
import { validateDiscoveryExtension } from '@x402/extensions/bazaar';
import { BASE_SEPOLIA, officialFacilitator } from '../test/x402-facilitator.js';

// fileURLToPath, not URL.pathname: the checkout path may hold spaces or '?', which pathname would percent-encode.
const here = fileURLToPath(new URL('..', import.meta.url));
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const WRANGLER = arg('--wrangler');
const run = (args, cwd) => (WRANGLER ? execFileSync(WRANGLER, args, { cwd, stdio: 'pipe' }) : execFileSync('npx', ['--yes', 'wrangler@4.168.0', ...args], { cwd, stdio: 'pipe' }));
const FAC_PORT = 8790;
const WORKER_PORT = 8791;
const ANVIL_0 = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // published development key
const PAY_TO = '0x1111111111111111111111111111111111111111';
// The approved pilot price (Javier, 25 Nov 2026): USD 0.10 per query, i.e. 100000 USDC atomic units (6 decimals).
const PILOT_PRICE_USD = '0.10';
const PILOT_AMOUNT = '100000';

const results = [];
const check = (ok, label) => { results.push([ok, label]); console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); };

// 1. A throwaway project around the built bundle, with a local D1.
const dir = mkdtempSync(join(tmpdir(), 'x402-workerd-'));
writeFileSync(join(dir, 'wrangler.toml'), `name = "x402-workerd-check"
main = "${join(here, 'dist/worker.dashboard.js')}"
compatibility_date = "2026-11-01"
compatibility_flags = ["nodejs_compat"]
no_bundle = true
[[d1_databases]]
binding = "DB"
database_name = "x402check"
database_id = "00000000-0000-0000-0000-000000000000"
[vars]
X402_ENABLED = "true"
X402_NETWORK = "${BASE_SEPOLIA}"
X402_PAY_TO = "${PAY_TO}"
X402_PRICE_USD = "${PILOT_PRICE_USD}"
X402_FACILITATOR = "http://127.0.0.1:${FAC_PORT}"
X402_STRIPE_RECORDING = "false"
`);
for (const m of ['0001_init.sql', '0002_relations.sql', '0003_search.sql', '0004_report_orders.sql', '0005_report_orders_one_pending.sql', '0006_x402_payments.sql']) run(['d1', 'execute', 'x402check', '--local', `--file=${join(here, 'migrations', m)}`], dir);
const row = (i, extra = {}) => JSON.stringify({ record_id: `fx_record_${i}`, deployment_id: `fx_case_${i}`, organization_name: `Example Org ${i}`, manufacturer: 'Example Robotics', robot_model: `Model ${i}`, operational_status: 'pilot', claim_text: `Example claim ${i}`, source_url: `https://example.com/${i}`, publication_date: `2026-0${i}-01`, site_name: `Example Site ${i}`, ...extra }).replace(/'/g, "''");
writeFileSync(join(dir, 'seed.sql'), [1, 2, 3].map((i) => `INSERT INTO premium_rows (dataset, row_id, position, sheet_row, preview_rank, visibility, data, snapshot_id) VALUES ('deployments', 'fx_record_${i}', ${i}, ${i + 1}, ${i}, 'customer', '${row(i)}', 'check');`).join('\n') + "\nINSERT INTO import_runs (id, started_at, finished_at, status) VALUES ('check', 1, 1764000000, 'succeeded');\n");
run(['d1', 'execute', 'x402check', '--local', '--file=seed.sql'], dir);

// 2. The official facilitator on the loopback, as the Worker's HTTPFacilitatorClient calls it.
const fac = officialFacilitator();
const facServer = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    res.setHeader('content-type', 'application/json');
    try {
      if (req.url.endsWith('/supported')) return res.end(JSON.stringify(await fac.client.getSupported()));
      const { paymentPayload, paymentRequirements } = JSON.parse(body || '{}');
      if (req.url.endsWith('/verify')) return res.end(JSON.stringify(await fac.client.verify(paymentPayload, paymentRequirements)));
      if (req.url.endsWith('/settle')) return res.end(JSON.stringify(await fac.client.settle(paymentPayload, paymentRequirements)));
      res.statusCode = 404; res.end('{}');
    } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: String(e?.message ?? e) })); }
  });
});
await new Promise((ok) => facServer.listen(FAC_PORT, '127.0.0.1', ok));

// 3. The Worker in workerd.
const dev = WRANGLER ? spawn(WRANGLER, ['dev', '--port', String(WORKER_PORT), '--ip', '127.0.0.1'], { cwd: dir }) : spawn('npx', ['--yes', 'wrangler@4.168.0', 'dev', '--port', String(WORKER_PORT), '--ip', '127.0.0.1'], { cwd: dir });
let devLog = '';
dev.stdout.on('data', (d) => (devLog += d));
dev.stderr.on('data', (d) => (devLog += d));
for (let i = 0; i < 90 && !/Ready on/.test(devLog); i += 1) await new Promise((r) => setTimeout(r, 1000));
const base = `http://127.0.0.1:${WORKER_PORT}`;
try {
  check(/Ready on/.test(devLog), 'workerd runs the built Worker bundle');
  const about = await (await fetch(`${base}/v1/x402`)).json();
  check(about.status === 'available' && about.network_name === 'Base Sepolia', `free description: ${about.status} ${about.reason ?? ''}`);
  check((await fetch(`${base}/v1/x402/deployment-evidence?colour=red`)).status === 400, 'a bad query is refused before any payment');
  const unpaid = await fetch(`${base}/v1/x402/deployment-evidence?robot=Model%202`);
  const pr = unpaid.status === 402 ? decodePaymentRequiredHeader(unpaid.headers.get('payment-required')) : null;
  check(Boolean(pr) && PaymentRequiredV2Schema.safeParse(pr).success, `402 with an official v2 PaymentRequired (${unpaid.status})`);
  check(Boolean(pr) && pr.accepts?.length === 1 && pr.accepts[0].amount === PILOT_AMOUNT && pr.accepts[0].network === BASE_SEPOLIA && pr.accepts[0].payTo === PAY_TO, `PAYMENT-REQUIRED asks for the pilot price USD ${PILOT_PRICE_USD} (${pr?.accepts?.[0]?.amount} atomic units)`);
  check(Boolean(pr) && validateDiscoveryExtension(pr.extensions?.bazaar).valid, 'the Bazaar extension passes the official validator');
  check(!(await unpaid.text()).includes('Example claim'), 'no data before payment');
  const sent = [];
  const pay = wrapFetchWithPayment(async (input, init) => { const r = new Request(input, init); sent.push(r.headers.get('payment-signature')); return fetch(r); }, new x402Client().register(BASE_SEPOLIA, new ExactEvmScheme(privateKeyToAccount(ANVIL_0))));
  const paid = await pay(`${base}/v1/x402/deployment-evidence?robot=Model%202`);
  const body = paid.status === 200 ? await paid.json() : null;
  const receipt = paid.headers.get('payment-response') ? decodePaymentResponseHeader(paid.headers.get('payment-response')) : null;
  check(paid.status === 200 && body?.results?.[0]?.records?.[0]?.claim?.text === 'Example claim 2', `the official client pays and gets the evidence (${paid.status})`);
  check(receipt?.success === true && receipt.network === BASE_SEPOLIA, 'PAYMENT-RESPONSE reports the settlement');
  check(!JSON.stringify(body).includes('Example Site'), 'subscription detail (site) is not sold per query');
  check(fac.chain.state.settled.length === 1, 'settled exactly once');
  const replay = await fetch(`${base}/v1/x402/deployment-evidence?robot=Model%202`, { headers: { 'payment-signature': sent.find(Boolean) } });
  check(replay.status === 200 && fac.chain.state.settled.length === 1, 'a replay is answered without a second settlement');
  const d1 = JSON.parse(run(['d1', 'execute', 'x402check', '--local', '--json', '--command', "SELECT status, stripe_status FROM x402_payments"], dir).toString());
  const rows = d1[0]?.results ?? [];
  check(rows.length === 1 && rows[0].status === 'settled' && rows[0].stripe_status === 'disabled', `D1 holds one settled payment (${JSON.stringify(rows)})`);
} finally {
  dev.kill();
  facServer.close();
}
const failed = results.filter(([ok]) => !ok);
console.log(failed.length ? `x402 workerd check FAILED (${failed.length} of ${results.length})` : `x402 workerd check passed: ${results.length} checks in workerd with the built bundle.`);
process.exit(failed.length ? 1 : 0);
