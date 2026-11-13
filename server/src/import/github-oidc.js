// Authenticates the workbook import without any shared secret. The GitHub Actions workflow
// .github/workflows/import-workbook.yml requests a short-lived OIDC token from GitHub and sends it as a bearer
// token. The Worker accepts it only if GitHub signed it and it comes from this repository, that workflow, the
// GitHub environment matching this Worker (test or production) and a branch allowed for that environment.

const ISSUER = 'https://token.actions.githubusercontent.com';
const JWKS_URL = `${ISSUER}/.well-known/jwks`;
export const IMPORT_AUDIENCE = 'whyhumanoid-premium-import';
export const IMPORT_REPOSITORY_ID = '1456468940'; // integrarobot/whyhumanoid
export const IMPORT_WORKFLOW = 'integrarobot/whyhumanoid/.github/workflows/import-workbook.yml';
export const IMPORT_ALLOWED_REFS = {
  test: ['refs/heads/main', 'refs/heads/feat/premium-preview'],
  production: ['refs/heads/main'],
};
const CLOCK_SKEW = 60;
const JWKS_TTL = 3600;

let jwksCache = { keys: null, fetchedAt: 0 };
export function resetJwksCache() {
  jwksCache = { keys: null, fetchedAt: 0 };
}

function decodeSegment(segment) {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
const decodeJson = (segment) => JSON.parse(new TextDecoder().decode(decodeSegment(segment)));

async function signingKey(kid, now, fetchImpl) {
  const fresh = jwksCache.keys && now - jwksCache.fetchedAt < JWKS_TTL;
  let jwk = fresh ? jwksCache.keys.find((k) => k.kid === kid) : null;
  if (!jwk) {
    const response = await fetchImpl(JWKS_URL);
    if (!response.ok) throw new Error(`GitHub JWKS returned ${response.status}`);
    const { keys } = await response.json();
    jwksCache = { keys: keys ?? [], fetchedAt: now };
    jwk = jwksCache.keys.find((k) => k.kid === kid);
  }
  if (!jwk || jwk.kty !== 'RSA') return null;
  return crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
}

// Returns the verified claims, or null with a reason when the token is not acceptable for this environment.
export async function verifyImportToken(token, { environment, now, fetchImpl = fetch }) {
  const reject = (reason) => ({ ok: false, reason });
  if (!IMPORT_ALLOWED_REFS[environment]) return reject('import_environment_not_configured');
  const parts = String(token ?? '').split('.');
  if (parts.length !== 3) return reject('malformed_token');
  let header;
  let claims;
  try {
    header = decodeJson(parts[0]);
    claims = decodeJson(parts[1]);
  } catch {
    return reject('malformed_token');
  }
  if (header.alg !== 'RS256' || !header.kid) return reject('unsupported_token');
  const key = await signingKey(header.kid, now, fetchImpl);
  if (!key) return reject('unknown_signing_key');
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeSegment(parts[2]), signed);
  if (!valid) return reject('bad_signature');

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== ISSUER) return reject('wrong_issuer');
  if (!audiences.includes(IMPORT_AUDIENCE)) return reject('wrong_audience');
  if (!(Number(claims.exp) > now - CLOCK_SKEW)) return reject('expired');
  if (claims.nbf != null && Number(claims.nbf) > now + CLOCK_SKEW) return reject('not_yet_valid');
  if (String(claims.repository_id) !== IMPORT_REPOSITORY_ID) return reject('wrong_repository');
  if (claims.environment !== environment) return reject('wrong_environment');
  if (!IMPORT_ALLOWED_REFS[environment].includes(claims.ref)) return reject('ref_not_allowed');
  if (claims.job_workflow_ref !== `${IMPORT_WORKFLOW}@${claims.ref}`) return reject('wrong_workflow');
  return { ok: true, claims };
}
