// Direct-Postgres cache for AI tool outputs. Uses DATABASE_URL via the `pg`
// driver so we don't depend on PostgREST's schema cache (which can be stale
// after DDL on Supabase). Pool is reused across requests in the Next.js
// server process via globalThis.

import pg from 'pg';
import { createHash } from 'crypto';

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!globalThis.__toolCachePool) {
    globalThis.__toolCachePool = new pg.Pool({
      connectionString:        process.env.DATABASE_URL,
      max:                     5,
      idleTimeoutMillis:       30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return globalThis.__toolCachePool;
}

export function normalizeKey(input) {
  if (input == null) return '';
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 200);
}

export function hashKey(input) {
  return createHash('sha1').update(normalizeKey(input)).digest('hex').slice(0, 24);
}

export async function getCached(tool, cacheKey) {
  const pool = getPool();
  if (!pool) return null;
  try {
    const { rows } = await pool.query(
      'SELECT output FROM tool_cache WHERE tool = $1 AND cache_key = $2 LIMIT 1',
      [tool, cacheKey],
    );
    return rows[0]?.output ?? null;
  } catch (e) {
    console.error('[toolCache] getCached error:', e.message);
    return null;
  }
}

export async function setCached(tool, cacheKey, output) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.query(
      `INSERT INTO tool_cache (tool, cache_key, output, created_at)
       VALUES ($1, $2, $3::jsonb, now())
       ON CONFLICT (tool, cache_key) DO UPDATE
         SET output = EXCLUDED.output, created_at = now()`,
      [tool, cacheKey, JSON.stringify(output)],
    );
    return true;
  } catch (e) {
    console.error('[toolCache] setCached error:', e.message);
    return false;
  }
}
// step0-rebuild-marker
