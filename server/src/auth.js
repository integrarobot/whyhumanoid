import { HttpError } from './http.js';
import { newId, randomToken, sha256Hex } from './crypto.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SESSION_PREFIX = 'whs_';
export const API_KEY_PREFIX = 'whk_';
const LOGIN_PREFIX = 'whl_';

export function normaliseEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) throw new HttpError(400, 'invalid_email');
  return email;
}

// Creates a one-time login token. The caller emails the link; only the hash is stored.
export async function createLoginToken(db, email, now, { ttlSeconds, maxPerHour }) {
  const recent = await db
    .prepare('SELECT COUNT(*) AS n FROM login_tokens WHERE email = ? AND created_at > ?')
    .bind(email, now - 3600)
    .first();
  if (Number(recent?.n ?? 0) >= maxPerHour) throw new HttpError(429, 'too_many_login_requests');
  const token = randomToken(LOGIN_PREFIX);
  await db
    .prepare('INSERT INTO login_tokens (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), email, now, now + ttlSeconds)
    .run();
  return token;
}

// Redeems a login token once, creates the account if needed and issues a session.
export async function redeemLoginToken(db, token, now, { sessionTtlSeconds }) {
  if (typeof token !== 'string' || !token.startsWith(LOGIN_PREFIX)) throw new HttpError(400, 'invalid_token');
  const hash = await sha256Hex(token);
  const claimed = await db
    .prepare('UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
    .bind(now, hash, now)
    .run();
  if (!claimed?.meta?.changes) throw new HttpError(401, 'invalid_or_expired_token');
  const { email } = await db.prepare('SELECT email FROM login_tokens WHERE token_hash = ?').bind(hash).first();
  const account = await findOrCreateAccount(db, email, now);
  const session = await issueCredential(db, account.id, 'session', now, { expiresAt: now + sessionTtlSeconds });
  return { account, session };
}

export async function findOrCreateAccount(db, email, now) {
  const existing = await db.prepare('SELECT id, email FROM accounts WHERE email = ?').bind(email).first();
  if (existing) return existing;
  const id = newId('acct');
  await db
    .prepare('INSERT OR IGNORE INTO accounts (id, email, created_at) VALUES (?, ?, ?)')
    .bind(id, email, now)
    .run();
  return db.prepare('SELECT id, email FROM accounts WHERE email = ?').bind(email).first();
}

export async function issueCredential(db, accountId, kind, now, { expiresAt = null, label = null } = {}) {
  const token = randomToken(kind === 'session' ? SESSION_PREFIX : API_KEY_PREFIX);
  await db
    .prepare(
      'INSERT INTO credentials (token_hash, account_id, kind, label, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(await sha256Hex(token), accountId, kind, label, now, expiresAt)
    .run();
  return { token, kind, expiresAt };
}

// Resolves the bearer credential on every request. Returns null when absent, unknown, revoked or expired.
export async function authenticate(request, db, now) {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return null;
  const hash = await sha256Hex(match[1]);
  const row = await db
    .prepare(
      `SELECT c.account_id, c.kind, c.expires_at, c.revoked_at, a.email
         FROM credentials c JOIN accounts a ON a.id = c.account_id
        WHERE c.token_hash = ?`,
    )
    .bind(hash)
    .first();
  if (!row || row.revoked_at || (row.expires_at && Number(row.expires_at) <= now)) return null;
  await db.prepare('UPDATE credentials SET last_used_at = ? WHERE token_hash = ?').bind(now, hash).run();
  return { accountId: row.account_id, email: row.email, kind: row.kind, tokenHash: hash };
}

export async function revokeCredential(db, tokenHash, now) {
  await db.prepare('UPDATE credentials SET revoked_at = ? WHERE token_hash = ?').bind(now, tokenHash).run();
}
