// MCP server (Model Context Protocol, 25 Nov 2026) on the same Worker as the HTTP API, built with the official SDK
// (@modelcontextprotocol/sdk, Streamable HTTP transport for web-standard runtimes, stateless, JSON responses).
// Same credentials (an agent API key or a session as a Bearer token), same entitlement check, same public/paid field
// boundary and same fair-use limits as the HTTP API: a tool never returns what the matching API route would not.
// Read-only tools only. No custom report data, accounts, orders or operational tables are reachable.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { HttpError } from './http.js';
import { DATASETS_BY_ID, publicDatasetList, publicRowLimit, queryDatasetRows, queryPreview } from './datasets.js';
import { canReadFull } from './access/matrix.js';
import { search } from './search/index.js';
import { readGraph } from './relations/store.js';
import { SUPPORT_EMAIL } from './support.js';
import { USAGE_LIMITS } from './usage.js';
import { publicVerificationStandard, verificationForRows } from './verification/snapshot.js';

// Published snapshots of the categories that are not database tables (free, public files of the site).
export const ATLASES = Object.freeze({
  datasets: { title: 'Robot Learning Data Atlas', path: '/data/datasets/atlas.json' },
  benchmarks: { title: 'Robotics Evaluation Atlas', path: '/data/benchmarks/atlas.json' },
  reports: { title: 'Research Conclusions Atlas', path: '/data/reports/atlas.json' },
  integrators: { title: 'Integrators atlas', path: '/data/integrators/atlas.json' },
  evolution: { title: 'Evolution charts (seven categories)', path: '/data/evolution/charts.json' },
});

const text = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });

// Tool annotations (MCP spec; added 25 Nov 2026 for directory listings). Every tool only reads: it never writes, deletes or
// charges, and the same call returns the same answer for the same data and access. The world is closed: tools read
// this catalogue's own database and its own published atlases (fixed paths on whyhumanoid.com), never an arbitrary
// external source, so openWorldHint is false. The title is repeated in the annotations for clients that read it there.
export const READ_ONLY_ANNOTATIONS = Object.freeze({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
const readOnly = (title) => ({ title, annotations: { title, ...READ_ONLY_ANNOTATIONS } });

export async function handleMcp(request, { db, now, authed, isEntitledAccount, fetchPublic, config }) {
  // A missing credential is a visitor (public values only); a wrong, revoked or expired one is refused.
  const hasCredential = Boolean(request.headers.get('authorization'));
  const account = hasCredential ? await authed(request, now) : null;
  if (hasCredential && !account) throw new HttpError(401, 'authentication_required');
  const entitled = await isEntitledAccount(account);
  const scope = entitled ? 'full' : 'public';

  const server = new McpServer(
    { name: 'whyhumanoid', version: '1.0.1' },
    {
      instructions:
        'Why Humanoid? research catalogue of humanoid robots, deployments, components, integrators, software, datasets, benchmarks, investment, other robots and reports. ' +
        `This connection reads ${entitled ? 'the full catalogue (active data subscription)' : 'the public catalogue: free categories in full, Deployments and Components at their public fields'}. ` +
        'Records are claims as recorded from public sources. Humanoid row responses include attribute-scoped verification metadata and comparison caveats. Pending_Audit is not verified; never infer an entire robot is verified from one attribute. ' +
        `Fair use: ${USAGE_LIMITS.perMinute} requests a minute and ${USAGE_LIMITS.perDay} a day per API key. Support: ${SUPPORT_EMAIL}.`,
    },
  );

  server.registerTool('list_categories', {
    ...readOnly('List categories'),
    description: 'The catalogue categories and tables, what each holds, and what this connection can read from each.',
    inputSchema: {},
  }, async () => text({
    scope,
    tables: publicDatasetList().filter((d) => d.offer).map((d) => ({ ...d, readable_here: d.access.full === 'public' || entitled ? 'all fields' : d.access.preview_rows === 'none' ? 'count only' : 'public fields' })),
    atlases: Object.entries(ATLASES).map(([id, a]) => ({ id, title: a.title, access: 'public' })),
    support: SUPPORT_EMAIL,
    verification_standard: publicVerificationStandard(),
  }));

  server.registerTool('search_catalogue', {
    ...readOnly('Search the catalogue'),
    description: 'Full-text search across the categories, with common tags. Subscribers search every field; others search the public values.',
    inputSchema: {
      query: z.string().max(200).describe('Words to look for'),
      category: z.string().max(40).optional().describe('Optional category id, e.g. deployments'),
      tags: z.string().max(400).optional().describe('Optional comma-separated tag ids from earlier results'),
      page: z.number().int().min(1).max(50).optional().describe('Optional results page, from 1 to 50; default 1'),
    },
  }, async ({ query, category, tags, page }) => text(await search(db, { scope: entitled ? 'full' : 'preview', q: query, tags: tags ?? '', category: category ?? '', page: String(page ?? 1) })));

  server.registerTool('get_rows', {
    ...readOnly('Read rows of a table'),
    description: 'Rows of one table (ids from list_categories), in catalogue order, optionally filtered by text. Free tables return every field; Deployments and Components return every field with an active subscription and their public fields otherwise.',
    inputSchema: {
      table: z.string().max(40).describe('Table id, e.g. deployments, hardware, humanoids, software'),
      query: z.string().max(100).optional().describe('Optional text to search within row values, up to 100 characters; ignores case for A-Z letters'),
      limit: z.number().int().min(1).max(100).optional().describe('Optional number of rows to return, from 1 to 100; default 25'),
      offset: z.number().int().min(0).max(100000).optional().describe('Optional number of rows to skip before returning, from 0 to 100000; default 0'),
    },
  }, async ({ table, query, limit = 25, offset = 0 }) => {
    const spec = DATASETS_BY_ID.get(table);
    if (!spec || spec.offer === false) return text({ error: 'unknown_table' });
    const q = (query ?? '').trim() || null;
    if (entitled || canReadFull(spec.id, { entitled: false })) {
      const page = await queryDatasetRows(db, spec.id, { limit, offset, q, publicValues: !entitled });
      return text({ table: spec.id, fields: entitled ? 'all' : 'public', ...page, limit, offset, ...(spec.id === 'humanoids' ? { verification: verificationForRows(page.rows, new Date(now * 1000).toISOString().slice(0, 10)) } : {}) });
    }
    // No subscription: exactly the public rows the preview route serves, never the stored full values.
    if (publicRowLimit(spec) === 0) return text({ table: spec.id, fields: 'none', note: 'This table is counted only; its rows come with the data subscription.' });
    const preview = await queryPreview(db, spec);
    const rows = q ? preview.rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())) : preview.rows;
    return text({ table: spec.id, fields: 'public', public_fields: spec.publicFields ?? null, total: rows.length, rows: rows.slice(offset, offset + limit), limit, offset, note: 'Public fields only. Every field comes with the data subscription (US$100 per year).' });
  });

  server.registerTool('get_atlas', {
    ...readOnly('Read a published atlas'),
    description: 'A published snapshot: datasets, benchmarks, reports (research conclusions), integrators or evolution (the seven charts). Public for everyone.',
    inputSchema: { name: z.enum(Object.keys(ATLASES)).describe(`Atlas to read: ${Object.keys(ATLASES).join(', ')}`) },
  }, async ({ name }) => {
    if (!fetchPublic) return text({ error: 'atlas_unavailable' });
    const response = await fetchPublic(ATLASES[name].path);
    if (!response.ok) return text({ error: 'atlas_unavailable', status: response.status });
    return { content: [{ type: 'text', text: await response.text() }] };
  });

  server.registerTool('get_relations', {
    ...readOnly('Read the relations graph'),
    description: 'Links between deployment records, catalogue robots and companies. Subscribers get the full graph; others the graph built from public values.',
    inputSchema: {},
  }, async () => {
    const data = await readGraph(db, entitled ? 'full' : 'preview');
    return data ? { content: [{ type: 'text', text: data }] } : text({ error: 'relations_not_ready' });
  });

  server.registerTool('account_status', {
    ...readOnly('Account status'),
    description: 'Whether this connection has an active data subscription, and the fair-use limits.',
    inputSchema: {},
  }, async () => text({ authenticated: Boolean(account), credential: account?.kind ?? null, subscription_active: entitled, limits: USAGE_LIMITS, manage: `${config.appUrl}#account`, support: SUPPORT_EMAIL }));

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'private, no-store');
  headers.set('vary', 'Authorization');
  return new Response(response.body, { status: response.status, headers });
}
