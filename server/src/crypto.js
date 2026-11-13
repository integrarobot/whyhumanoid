// Small Web Crypto helpers. Works in Cloudflare Workers, Deno and Node >= 20.

const encoder = new TextEncoder();

export function base64url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(prefix, bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return `${prefix}${base64url(buf)}`;
}

export function newId(prefix) {
  return randomToken(`${prefix}_`, 12);
}

export function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
}

export async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}
