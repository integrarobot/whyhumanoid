// OpenAI Apps domain verification (26 Nov 2026). The OpenAI developer portal checks that whoever submits the
// Why Humanoid? app controls the MCP host (https://whyhumanoid-premium.javier-198.workers.dev/mcp) by fetching
// GET /.well-known/openai-apps-challenge and comparing the body with this token.
//
// The token is PUBLIC by design: it proves control of the hostname and grants nothing. It is not a credential, an API
// key or a secret, so it lives in Git. The route reads no database, no secret and no request header, and it does not
// touch /mcp, authentication, billing or imports.

export const OPENAI_APPS_CHALLENGE_PATH = '/.well-known/openai-apps-challenge';
export const OPENAI_APPS_CHALLENGE_TOKEN = 'aFaAZIEpwgk7flron0F8ZuZ66IWE_4L9h-N2Lns_JHg';

// The body is the token exactly: no trailing newline, no JSON. HEAD answers the same headers with no body.
export function openaiAppsChallenge(request) {
  return new Response(request.method === 'HEAD' ? null : OPENAI_APPS_CHALLENGE_TOKEN, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'content-length': String(new TextEncoder().encode(OPENAI_APPS_CHALLENGE_TOKEN).length),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
