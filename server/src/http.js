export class HttpError extends Error {
  constructor(status, code, detail) {
    super(code);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

// Every API response is uncacheable. Premium responses add `private` and vary on Authorization.
export function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export function privateJson(status, body) {
  return json(status, body, { 'cache-control': 'private, no-store', vary: 'Authorization' });
}

export async function readText(request, maxBytes) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new HttpError(413, 'payload_too_large');
  }
  return text;
}

export async function readJson(request, maxBytes = 16_384) {
  const text = await readText(request, maxBytes);
  try {
    const value = JSON.parse(text || '{}');
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
    return value;
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

export function corsHeaders(request, allowedOrigins) {
  const origin = request.headers.get('origin');
  if (!origin || !allowedOrigins.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Authorization, Content-Type',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

export function withHeaders(response, headers) {
  const merged = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    if (key === 'vary' && merged.has('vary')) merged.set('vary', `${merged.get('vary')}, ${value}`);
    else merged.set(key, value);
  }
  return new Response(response.body, { status: response.status, headers: merged });
}
