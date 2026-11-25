#!/usr/bin/env node
// Why Humanoid? command-line tool (25 Nov 2026). One file, no dependencies, Node.js 18 or later.
// Reads the catalogue through the public HTTP API with your agent API key, under the same subscription as the web app:
// complete Deployments and Components with an active subscription, the public catalogue without one.
//
//   curl -fsSLO https://whyhumanoid.com/agents/whyhumanoid.mjs
//   export WHYHUMANOID_API_KEY=whk_...        # from https://whyhumanoid.com/app/#keys (optional for public data)
//   node whyhumanoid.mjs categories
//   node whyhumanoid.mjs search "pallet" --category deployments
//   node whyhumanoid.mjs rows deployments --limit 5
//   node whyhumanoid.mjs atlas reports
//   node whyhumanoid.mjs account
//
// Output is JSON on stdout. Fair use: 60 requests a minute and 5,000 a day per key. Help: javier@integrarobot.com

const VERSION = '1.0.0';
const HELP = `Why Humanoid? CLI ${VERSION}

Usage: node whyhumanoid.mjs <command> [options]

Commands
  categories                       Tables and published atlases, and what your access reads from each
  search <words> [--category id] [--tags a,b] [--page n]
                                   Search across categories
  rows <table> [--query text] [--limit n] [--offset n]
                                   Rows of one table (e.g. deployments, hardware, humanoids, software)
  atlas <datasets|benchmarks|reports|integrators|evolution>
                                   A published atlas (public)
  account                          Your access and subscription state (needs a key)

Options
  --api <url>     API origin (default https://whyhumanoid-premium.javier-198.workers.dev)
  --site <url>    Site origin for atlases (default https://whyhumanoid.com)
  --key <key>     API key (default: the WHYHUMANOID_API_KEY environment variable)

Fair use: 60 requests a minute and 5,000 a day per key. Help: javier@integrarobot.com`;

const ATLASES = { datasets: '/data/datasets/atlas.json', benchmarks: '/data/benchmarks/atlas.json', reports: '/data/reports/atlas.json', integrators: '/data/integrators/atlas.json', evolution: '/data/evolution/charts.json' };

function parse(argv) {
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a.startsWith('--')) { opts[a.slice(2)] = argv[i + 1]; i += 1; }
    else positional.push(a);
  }
  return { positional, opts };
}

async function call(base, path, key) {
  const response = await fetch(new URL(path, base), { headers: key ? { authorization: `Bearer ${key}` } : {} });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error('The API key was refused (unknown, revoked or expired). Create a new one at https://whyhumanoid.com/app/#keys');
  if (response.status === 403) throw new Error('This needs an active data subscription: https://whyhumanoid.com/subscribe/');
  if (response.status === 429) throw new Error(`Fair-use limit reached; try again in ${response.headers.get('retry-after') ?? 'a few'} seconds.`);
  if (!response.ok) throw new Error(`The API answered ${response.status} (${body.error ?? 'error'}). Help: javier@integrarobot.com`);
  return body;
}

export async function run(argv, { env = process.env, out = (s) => process.stdout.write(s) } = {}) {
  const { positional, opts } = parse(argv);
  const [command, ...args] = positional;
  if (opts.help || !command) { out(`${HELP}\n`); return 0; }
  const api = opts.api ?? env.WHYHUMANOID_API ?? 'https://whyhumanoid-premium.javier-198.workers.dev';
  const site = opts.site ?? env.WHYHUMANOID_SITE ?? 'https://whyhumanoid.com';
  const key = opts.key ?? env.WHYHUMANOID_API_KEY ?? '';
  let result;
  if (command === 'categories') {
    const list = await call(api, '/v1/datasets', key);
    result = { tables: list.datasets.filter((d) => d.offer), atlases: Object.keys(ATLASES) };
  } else if (command === 'search') {
    if (!args.length) throw new Error('search needs words to look for');
    const p = new URLSearchParams({ q: args.join(' '), page: opts.page ?? '1' });
    if (opts.category) p.set('category', opts.category);
    if (opts.tags) p.set('tags', opts.tags);
    result = await call(api, `/v1/search?${p}`, key);
  } else if (command === 'rows') {
    const [table] = args;
    if (!/^[a-z0-9-]+$/.test(table ?? '')) throw new Error('rows needs a table id, e.g. deployments');
    const p = new URLSearchParams({ limit: opts.limit ?? '25', offset: opts.offset ?? '0' });
    if (opts.query) p.set('q', opts.query);
    // Free tables and, with a subscription, Deployments and Components in full; otherwise their public rows.
    try {
      result = await call(api, `/v1/datasets/${table}?${p}`, key);
    } catch (error) {
      if (!/subscription|refused/.test(error.message) || key) throw error;
      const preview = await call(api, `/v1/datasets/${table}/preview`, '');
      const offset = Number(opts.offset ?? 0);
      result = { ...preview, rows: preview.rows.slice(offset, offset + Number(opts.limit ?? 25)), note: 'Public fields only. Every field comes with the data subscription.' };
    }
  } else if (command === 'atlas') {
    const [name] = args;
    if (!ATLASES[name]) throw new Error(`atlas needs one of: ${Object.keys(ATLASES).join(', ')}`);
    const response = await fetch(new URL(ATLASES[name], site));
    if (!response.ok) throw new Error(`The site answered ${response.status}`);
    result = await response.json();
  } else if (command === 'account') {
    if (!key) throw new Error('account needs an API key (WHYHUMANOID_API_KEY or --key)');
    result = await call(api, '/v1/me', key);
  } else {
    throw new Error(`Unknown command "${command}". Run with --help.`);
  }
  out(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}

// Run as a program (not when imported by a test).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('whyhumanoid.mjs')) {
  // exitCode, not exit(): a large JSON written to a pipe must be flushed before the process ends.
  run(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
