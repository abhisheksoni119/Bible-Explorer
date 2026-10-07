/**
 * Supabase client wrapper.
 *
 * Mirrors lib/supabaseAdmin.js exactly in intent (service-role client,
 * session persistence disabled, falls back to anon key) — the difference is
 * this version is typed and returns a Result instead of silently returning
 * null when config is missing, so a future route handler can surface a
 * clear error instead of a confusing "supabase is null" crash.
 *
 * This module performs INSERT and SELECT only — see services/ for the
 * actual read/write logic (not implemented yet in this phase). This file
 * is purely the connection layer.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { loadConfig } from '../config/env';
import { ConfigurationError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';
import { createLogger } from '../utils/logger';

const log = createLogger('supabaseClient');

let cachedClient: SupabaseClient | null = null;

/**
 * Get (or lazily create) the shared Supabase client for this module.
 * Uses the service role key when available (required for INSERT — RLS is
 * enabled on `topics` and `content_ideas`), matching every other admin
 * route in this codebase. Warns — but does not fail — if only the anon key
 * is available, since reads will still work.
 */
export function getSupabaseClient(): Result<SupabaseClient, ConfigurationError> {
  if (cachedClient) return ok(cachedClient);

  const configResult = loadConfig();
  if (!configResult.ok) return err(configResult.error);

  const { supabaseUrl, supabaseKey, hasServiceRoleKey } = configResult.value;

  if (!hasServiceRoleKey) {
    log.warn(
      'SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key. ' +
        'Writes to topics/content_ideas will fail under RLS unless the anon policy allows them.',
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return ok(cachedClient);
}

/** Test-only escape hatch — never called from application code. */
export function _resetSupabaseClientForTests(): void {
  cachedClient = null;
}
