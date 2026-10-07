// Tiny in-memory rate limiter for protecting expensive AI endpoints from
// crawler/abuse cost explosions. Per Next.js process; resets on restart.
// For multi-instance deployments, swap for a Redis-backed bucket.

const BUCKETS = new Map();
const CLEANUP_EVERY = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now) {
  if (now - lastCleanup < CLEANUP_EVERY) return;
  lastCleanup = now;
  for (const [k, b] of BUCKETS) {
    if (b.resetAt <= now) BUCKETS.delete(k);
  }
}

/**
 * Consume one token from the bucket identified by `key`.
 * Returns { allowed, remaining, retryAfterSec }.
 */
export function consume(key, { max = 10, windowMs = 60 * 60 * 1000 } = {}) {
  const now = Date.now();
  cleanup(now);
  let b = BUCKETS.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    BUCKETS.set(key, b);
  }
  if (b.count >= max) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { allowed: true, remaining: max - b.count, retryAfterSec: 0 };
}

/**
 * Extract a best-effort client IP from Next.js request headers.
 * Falls back to "anon" when no header is present (dev / direct calls).
 */
export function clientIpFromHeaders(headers) {
  if (!headers) return 'anon';
  const xff = headers.get?.('x-forwarded-for') || headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim() || 'anon';
  const real = headers.get?.('x-real-ip') || headers['x-real-ip'];
  return (real && String(real).trim()) || 'anon';
}
// step0-rebuild-marker
