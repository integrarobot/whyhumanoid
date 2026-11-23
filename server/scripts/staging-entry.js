// Single-file entry for the TEST Worker (whyhumanoid-premium-test) when it is deployed through the Cloudflare dashboard
// editor, where static assets cannot be uploaded (23 Nov 2026). The API is the regular Worker; every other path serves
// the public site of the commit in STAGING_SITE_COMMIT (40 hex characters), read from the public repository and
// changed only as server/src/staging/site.js says (same-origin API, staging banner, noindex). Never for production.
import worker from '../src/worker.js';
import { siteResponse } from '../src/staging/site.js';

const REPO = 'integrarobot/whyhumanoid';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/health' || url.pathname.startsWith('/v1/')) return worker.fetch(request, env, ctx);
    if (env.STRIPE_MODE === 'live') return new Response('the staging entry never runs with live Stripe', { status: 503 });
    const sha = String(env.STAGING_SITE_COMMIT ?? '');
    if (!/^[0-9a-f]{40}$/.test(sha)) return new Response('STAGING_SITE_COMMIT is not set to a full commit id', { status: 503 });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('method not allowed', { status: 405 });
    return siteResponse(url, (path) => fetch(`https://raw.githubusercontent.com/${REPO}/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`, {
      cf: { cacheTtl: 300, cacheEverything: true },
    }));
  },
  scheduled: worker.scheduled,
};
