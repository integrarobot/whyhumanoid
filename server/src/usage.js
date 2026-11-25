// Fair use for agent API keys (25 Nov 2026), over the HTTP API and MCP alike: at most 60 requests a minute and 5,000 a
// day per key. Over the limit the request is refused with 429 and a Retry-After header; nothing is charged. Browser
// sessions are not metered. The limits are published in the agent documentation; there is no "unlimited" tier.
import { HttpError } from './http.js';

export const USAGE_LIMITS = Object.freeze({ perMinute: 60, perDay: 5000 });

export async function meterCredential(db, tokenHash, now) {
  const minute = Math.floor(now / 60);
  const day = Math.floor(now / 86400);
  const windows = [[`m${minute}`, (minute + 1) * 60, USAGE_LIMITS.perMinute], [`d${day}`, (day + 1) * 86400, USAGE_LIMITS.perDay]];
  for (const [window, expires, limit] of windows) {
    await db
      .prepare(`INSERT INTO usage_counters (credential, window, count, expires_at) VALUES (?, ?, 1, ?)
                ON CONFLICT (credential, window) DO UPDATE SET count = count + 1`)
      .bind(tokenHash, window, expires)
      .run();
    const row = await db.prepare('SELECT count FROM usage_counters WHERE credential = ? AND window = ?').bind(tokenHash, window).first();
    if (Number(row?.count ?? 0) > limit) {
      const error = new HttpError(429, 'rate_limited');
      error.retryAfter = expires - now;
      throw error;
    }
  }
  // Old windows are removed now and then, so the table stays small.
  if (now % 97 === 0) await db.prepare('DELETE FROM usage_counters WHERE expires_at < ?').bind(now - 60).run();
}
