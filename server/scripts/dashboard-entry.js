// Single-file entry for deploying through the Cloudflare dashboard editor, where static assets cannot be uploaded.
// Serves the premium app (embedded at build time) and delegates everything else to the regular Worker.
import worker from '../src/worker.js';
import { indexHtml, premiumJs } from './.dashboard-assets.js';

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const page = (body, type) =>
  new Response(body, {
    headers: {
      'content-type': type,
      'content-security-policy': CSP,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex',
      'cache-control': 'no-cache',
    },
  });

// The app lives at PREMIUM_URL (https://whyhumanoid.com/app/ in production since 17 Nov 2026). When that is another
// origin, the old pages answer with a temporary redirect for GET and HEAD only: the browser keeps the #fragment, so old
// links (#deployments, one-time #login=...) still work. API routes and the Stripe webhook (POST /v1/...) are untouched.
const elsewhere = (request, env) => {
  try {
    return Boolean(env.PREMIUM_URL) && new URL(env.PREMIUM_URL).origin !== new URL(request.url).origin;
  } catch {
    return false;
  }
};

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const isPage = pathname === '/' || pathname === '/index.html';
    if (isPage && (request.method === 'GET' || request.method === 'HEAD') && elsewhere(request, env)) {
      return new Response(null, { status: 302, headers: { location: env.PREMIUM_URL, 'cache-control': 'no-store' } });
    }
    if (request.method === 'GET' && (pathname === '/' || pathname === '/index.html')) return page(indexHtml, 'text/html; charset=utf-8');
    if (request.method === 'GET' && pathname === '/premium.js') return page(premiumJs, 'text/javascript; charset=utf-8');
    return worker.fetch(request, env, ctx);
  },
  scheduled: worker.scheduled,
};
