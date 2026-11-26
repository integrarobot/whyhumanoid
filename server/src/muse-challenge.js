// Muse connector domain verification (26 Nov 2026). Muse checks that whoever submitted the Why Humanoid? connector
// controls the MCP host (https://whyhumanoid-premium.javier-198.workers.dev/mcp) by fetching
// GET /.well-known/muse-challenge/<token> and comparing the body with "muse-challenge=<token>". The challenge expires on
// 3 Dec 2026 at 19:32 Europe/Madrid; after that the route can be removed.
//
// The token is PUBLIC by design: it proves control of the hostname and grants nothing. It is not a credential, an API
// key or a secret, so it lives in Git. Only this exact path answers; any other token is a 404. The route reads no
// database, no secret and no request header, and it does not touch /mcp, the API, authentication, billing or imports.

export const MUSE_CHALLENGE_TOKEN = '0f4b178779974ebde7e015a3353e0c0167fbf88f0afa2ca08aa90379b8c09dcb';
export const MUSE_CHALLENGE_PATH = `/.well-known/muse-challenge/${MUSE_CHALLENGE_TOKEN}`;
export const MUSE_CHALLENGE_BODY = `muse-challenge=${MUSE_CHALLENGE_TOKEN}`;

// The body is exactly "muse-challenge=<token>": no trailing newline, no JSON. HEAD answers the same headers, no body.
export function museChallenge(request) {
  return new Response(request.method === 'HEAD' ? null : MUSE_CHALLENGE_BODY, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'content-length': String(new TextEncoder().encode(MUSE_CHALLENGE_BODY).length),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
