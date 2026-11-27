import { readFileSync } from 'node:fs';
import { CATEGORIES } from '../server/src/access/matrix.js';
import { USAGE_LIMITS } from '../server/src/usage.js';

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const registry = readJson('../ops/mcp-registry/server.json');
const tools = readJson('./mcp-public-tools.json');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const fence = '```';
const tagExample = 'platform:bipedal,hq:united_states';
const searchArgs = { query: '', category: 'humanoids', tags: tagExample, page: 1 };
const rowArgs = { table: 'humanoids', query: 'Atlas', limit: 10, offset: 0 };
const payloadField = 'Payload/carry (kg)';
const searchableTags = {
  companyCountry: 'hq:united_states',
  deploymentCountry: 'site:united_states',
  robotPlatform: 'platform:bipedal',
};

const publicAccess = 'Public access needs no account or key. The free catalogue is available in full. Deployments and Components expose only their public summaries and sources to visitors. An active data subscription and an API key provide the complete records.';
const evidence = 'Catalogue entries report what their sources say. Check the original source, date, model and test conditions. Missing values are left blank or marked as unknown.';
const payloadNote = `Read the public humanoid rows and inspect the recorded ${payloadField} field. Apply numeric thresholds in your client after checking whether the value is sustained, peak, one-handed or subject to other conditions. The server has no numeric payload filter.`;
const tagNote = 'Use comma-separated IDs from earlier search facets in tags. The hq: prefix filters company country, site: filters deployment country, and platform: filters robot mobility. Only records with the corresponding tags can match.';

function llms(site, api, mcp) {
  const summaries = {
    humanoids: 'Public robot specifications, manufacturers, market information and links to sources where recorded.',
    deployments: 'Reported use, pilots and announcements, with their sources and evidence.',
    components: 'Hardware and software building blocks, specifications and documented constraints.',
    integrators: 'Providers, supported platforms, territories and evidence of integration capabilities.',
    software: 'Robot foundation models, vision-language-action models, world models, simulators and tools.',
    datasets: 'Robot learning datasets, what they contain and their terms of use where known.',
    benchmarks: 'Robotics evaluations, reported results and the evidence behind them.',
    investment: 'Listed companies with robotics exposure and recorded humanoid-maker funding.',
    'other-robots': 'Service, industrial and educational robots beyond humanoids.',
    reports: 'Research findings, differences and assumptions across published reports.',
  };
  const additional = [
    { label: 'Companies', path: '/companies/', summary: 'Public company profiles with links to robots and deployment evidence.' },
    { label: 'Blog', path: '/blog/', summary: 'Integrarobot articles about humanoids and physical AI.' },
    { label: 'News', path: '/news/', summary: 'Dated news briefs with links to the original reporting.' },
  ];
  const entries = (items) => items.map(({ label, path, summary }) => `- [${label}](${site}${path}): ${summary}`).join('\n');
  return `# Why Humanoid?

> Integrarobot's research catalogue on humanoid robots and the surrounding physical AI ecosystem, with source-linked specifications and evidence.

${publicAccess} ${evidence}

## Agent access

- [Setup guide in Markdown](${site}/agents.md): Public access, filters, examples, and subscriber authentication.
- [MCP server](${mcp}): Streamable HTTP. Connect and call tools/list to discover the live schema.
- [MCP discovery manifest](${site}/.well-known/mcp.json): Endpoint, tool schemas and example calls.
- [AI Catalog](${site}/.well-known/ai-catalog.json): Domain discovery entry for the MCP server.
- [HTTP API](${api}/v1/datasets): JSON table directory. Use /v1/search for search.
- [Download the CLI](${site}/agents/whyhumanoid.mjs): Single JavaScript file for Node.js 18 or later.
- [Atlas robot record in Markdown](${site}/robots/atlas.md): Example of a public robot specification.

## Catalogue categories

${entries(CATEGORIES.map((category) => ({ ...category, summary: summaries[category.id] ?? category.summary })))}

## Additional public collections

${entries(additional)}

## Optional

- [Method](${site}/method/): Sources, evidence, and interpretation.
- [Terms of use](${site}/terms/): Terms for the catalogue and MCP connection.
- [Subscriptions](${site}/subscribe/): Access to complete Deployments and Components.
`;
}

function setupGuide(site, api, mcp) {
  const search = new URL('/v1/search', api);
  search.searchParams.set('category', searchArgs.category);
  search.searchParams.set('tags', searchArgs.tags);
  return `# Why Humanoid? agent setup

${publicAccess} ${evidence}

## MCP

Connect to ${mcp} using Streamable HTTP. For public data, omit the Authorization header. Initialize the session and use \`tools/list\` to read the current tools and argument schemas. Then call \`tools/call\` with a tool name and its arguments.

${fence}json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_catalogue","arguments":${JSON.stringify(searchArgs)}}}
${fence}

${fence}json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_rows","arguments":${JSON.stringify(rowArgs)}}}
${fence}

[Discovery manifest](${site}/.well-known/mcp.json) · [Domain AI Catalog](${site}/.well-known/ai-catalog.json)

## HTTP API

Base URL: ${api}

${fence}sh
curl -fsS '${api}/v1/datasets'
curl -fsS '${search}'
curl -fsS '${api}/v1/datasets/humanoids?q=Atlas&limit=10'
curl -fsS '${api}/v1/datasets/deployments/preview'
${fence}

${tagNote} Send free text as \`q\` over HTTP and \`query\` in MCP. Search returns paginated results and the available facets. ${payloadNote}

## CLI

Use Node.js 18 or later. [Read the source](${site}/agents/whyhumanoid.mjs) before running it.

${fence}sh
curl -fsSLO '${site}/agents/whyhumanoid.mjs'
node whyhumanoid.mjs categories
node whyhumanoid.mjs search '' --category humanoids --tags '${tagExample}'
node whyhumanoid.mjs rows humanoids --query Atlas --limit 10
${fence}

## Subscriber access

Create an API key in [Agent access](${site}/app/#keys). Send it as \`Authorization: Bearer YOUR_API_KEY\` to the API or MCP server, or set \`WHYHUMANOID_API_KEY\` for the CLI. Rates are ${USAGE_LIMITS.perMinute} requests per minute and ${USAGE_LIMITS.perDay.toLocaleString('en-US')} per day per key. Follow \`Retry-After\` if you receive HTTP 429. The MCP tools are read-only.

[Catalogue index](${site}/llms.txt) · [Atlas in Markdown](${site}/robots/atlas.md) · [Method](${site}/method/) · [Terms](${site}/terms/)
`;
}

export function agentDiscoveryFiles(site, api) {
  const { name, title, description, version, websiteUrl, repository, icons } = registry;
  const mcp = `${api}/mcp`;
  const card = {
    $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    name, title, description, version, websiteUrl, repository, icons,
    remotes: [{ type: 'streamable-http', url: mcp }],
  };
  const manifest = {
    ...card,
    _meta: {
      'com.whyhumanoid/catalogue': {
        documentation: `${site}/agents.md`,
        index: `${site}/llms.txt`,
        apiBaseUrl: api,
        datasetDirectory: `${api}/v1/datasets`,
        cliDownload: `${site}/agents/whyhumanoid.mjs`,
        publicAccess,
        toolsListMethod: 'tools/list',
        tools,
        filters: {
          tags: { description: tagNote, examples: searchableTags },
          payload: { mode: 'client-side', field: payloadField, unit: 'kg', description: payloadNote },
        },
        examples: [
          { method: 'tools/call', params: { name: 'search_catalogue', arguments: searchArgs } },
          { method: 'tools/call', params: { name: 'get_rows', arguments: rowArgs } },
        ],
      },
    },
  };
  return new Map([
    ['llms.txt', llms(site, api, mcp)],
    // Jekyll publishes the plain text at /agents.md. Keep the source name distinct from AGENTS.md on macOS.
    ['agents/guide.txt', `---\npermalink: /agents.md\nlayout: null\n---\n${setupGuide(site, api, mcp)}`],
    ['.well-known/mcp.json', json(manifest)],
    ['.well-known/ai-catalog.json', json({
      specVersion: '1.0',
      entries: [{
        identifier: 'urn:air:whyhumanoid.com:mcp:whyhumanoid',
        type: 'application/mcp-server-card+json',
        data: card,
      }],
    })],
  ]);
}

export const robotMarkdownPath = (robot) => `/robots/${robot.path.split('/')[2]}.md`;

const plain = (value) => String(value ?? '').trim().replace(/\s+/g, ' ')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replace(/[\\*_[\]`]/g, '\\$&');
const fields = (pairs) => pairs.filter(([, value]) => value != null && String(value).trim() !== '')
  .map(([label, value]) => `- **${label}**: ${plain(value)}`).join('\n');
const url = (value) => {
  try {
    const parsed = new URL(value);
    return /^https?:$/.test(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
};

export function renderRobotMarkdown({ site, robot, classification, snapshot, checks, buyerChecks, sections, links, cases }) {
  const lines = [
    `# ${plain(robot.name)} by ${plain(robot.lab)}`,
    `[Canonical robot page](${site}${robot.path}) · [Method](${site}/method/)`,
    `Catalogue snapshot: ${snapshot}. ${evidence}`,
  ];
  if (classification) {
    lines.push(`Classification: ${plain(classification.label)}.`,
      ...classification.excerpts.map(({ field, text }) => `- **${plain(field)}**: ${plain(text)}`));
  }
  if (buyerChecks) lines.push(`## Before comparing\n\n${plain(buyerChecks)}`);
  for (const [heading, pairs] of sections) {
    const block = fields(pairs);
    if (block) lines.push(`## ${heading}\n\n${block}`);
  }
  if (robot.maker) lines.push(`[Company profile](${site}${robot.maker.path})`);
  const makerLinks = links.map(([label, target]) => [label, url(target)])
    .filter(([, address]) => address)
    .map(([label, address]) => `- [${label}](<${address}>)`);
  if (makerLinks.length) lines.push(makerLinks.join('\n'));
  if (cases.length) lines.push('## Public deployment cases', cases.map(([name, path]) => `- [${plain(name)}](${site}${path})`).join('\n'));
  const sources = [...new Set(checks.urls.map(url).filter(Boolean))].map((address) => `- <${address}>`);
  const checkDetails = fields([
    ['Last checked', checks.date],
    ['Checks recorded', checks.statements.join('; ')],
    ['Model identity', robot.record['Model checked']],
  ]);
  lines.push('## Sources and checks', [checkDetails, ...sources].filter(Boolean).join('\n') || 'No linked sources or checks recorded.');
  return `${lines.join('\n\n')}\n`;
}
