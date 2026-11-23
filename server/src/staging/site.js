// Staging site (23 Nov 2026): serves the public site of one pinned commit the way GitHub Pages would, for the test
// Worker only. Shared by server/scripts/staging-entry.js (dashboard bundle, files from the public repository at that
// commit) and tools/build-staging.mjs (static bundle for wrangler). Never used by the production Worker.
//
// Pages semantics: /dir/ -> dir/index.html, /dir -> 307 /dir/, unknown paths -> 404.html with status 404, and the
// paths _config.yml keeps out of the site (code, tooling, operations, docs) are never served. Staging changes: the app
// calls the API on the same origin, links to the production app become relative, every page carries a visible
// banner and noindex, and robots.txt disallows everything.

export const PRODUCTION_API_ORIGIN = 'https://whyhumanoid-premium.javier-198.workers.dev';
export const PRODUCTION_APP_URL = 'https://whyhumanoid.com/app/';
const EXCLUDED = /^(server|tools|ops|node_modules|\.[^/]*)(\/|$)|^[^/]+\.md$|^(_config\.yml|CNAME)$/i;
const TYPES = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8', csv: 'text/csv; charset=utf-8', xml: 'application/xml; charset=utf-8',
  txt: 'text/plain; charset=utf-8', png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon',
};
export const BANNER = '<div role="note" style="position:sticky;top:0;z-index:99;background:#F0A23B;color:#0B0C0E;font:600 13px/1.4 system-ui,sans-serif;padding:6px 12px;text-align:center">Staging for review · not the live site · payments in Stripe test mode only</div>';
export const STAGING_ROBOTS = 'User-agent: *\nDisallow: /\n';

export const contentType = (path) => TYPES[(/\.([a-z0-9]+)$/i.exec(path)?.[1] ?? '').toLowerCase()] ?? 'application/octet-stream';
export const isServable = (path) => !EXCLUDED.test(path);

// Text of an HTML or JS file as staging serves it at `origin`.
export function stagingText(text, path, origin) {
  let s = text.split(PRODUCTION_API_ORIGIN).join(origin).split(PRODUCTION_APP_URL).join('/app/');
  if (path.endsWith('.html')) s = s.replace(/<body([^>]*)>/, (m) => `${m}\n${BANNER}`).replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow">');
  return s;
}

const headers = (path, extra = {}) => ({
  'content-type': contentType(path), 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin', 'cache-control': 'no-cache', ...extra,
});

// getFile(path) -> Promise<{ ok, status, text(), arrayBuffer() }> for a repository path (no leading slash).
export async function siteResponse(url, getFile) {
  let path = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (path.split('/').includes('..')) return new Response('not found', { status: 404 });
  if (path === 'robots.txt') return new Response(STAGING_ROBOTS, { headers: headers(path) });
  const notFound = async () => {
    const r = await getFile('404.html');
    return new Response(r.ok ? stagingText(await r.text(), '404.html', url.origin) : 'not found', { status: 404, headers: headers('404.html') });
  };
  if (!isServable(path)) return notFound();
  const last = path.split('/').at(-1);
  if (path && !path.endsWith('/') && !last.includes('.')) return new Response(null, { status: 307, headers: { location: `/${path}/${url.search}` } });
  if (path === '' || path.endsWith('/')) path += 'index.html';
  if (!isServable(path)) return notFound();
  const file = await getFile(path);
  if (!file.ok) return notFound();
  const body = /\.(html|js)$/.test(path) ? stagingText(await file.text(), path, url.origin) : await file.arrayBuffer();
  return new Response(body, { status: 200, headers: headers(path) });
}
