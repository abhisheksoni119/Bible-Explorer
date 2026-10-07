/**
 * Typed environment loader.
 *
 * Reuses the exact env var names already in production use elsewhere in
 * this repo (see lib/supabase.js, lib/supabaseAdmin.js, lib/generator.js) —
 * no new env vars are introduced for required config. This module does not
 * change deployment config; it only reads what's already there and fails
 * loudly (via Result) instead of silently returning null like
 * lib/supabase.js does.
 *
 * Required (must already be set for the live app to work at all):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY   (falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *                                   same fallback lib/supabaseAdmin.js uses —
 *                                   but the Assistant needs write access, so a
 *                                   missing service role key is logged as a
 *                                   warning by the Supabase client wrapper)
 *   - OPENROUTER_API_KEY          (falls back to legacy Open_Router_API,
 *                                   matching lib/generator.js)
 *
 * Optional (module-specific overrides — new names, additive only):
 *   - AI_ASSISTANT_OPENROUTER_MODEL   (default: DEFAULT_OPENROUTER_MODEL)
 *   - AI_ASSISTANT_REQUEST_TIMEOUT_MS (default: DEFAULT_REQUEST_TIMEOUT_MS)
 */

import { ConfigurationError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';
import { DEFAULT_OPENROUTER_MODEL, DEFAULT_REQUEST_TIMEOUT_MS } from './constants';

export interface AiAssistantConfig {
  supabaseUrl: string;
  /** Service role key when available; falls back to anon key like lib/supabaseAdmin.js. */
  supabaseKey: string;
  /** True when the service role key was actually found (writes will work). */
  hasServiceRoleKey: boolean;
  openRouterApiKey: string;
  openRouterModel: string;
  requestTimeoutMs: number;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function readIntEnv(name: string, fallback: number): number {
  const raw = readEnv(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

let cachedConfig: AiAssistantConfig | null = null;

/**
 * Load and validate config from process.env. Cached after the first
 * successful call within a server process (mirrors the singleton pattern
 * used by lib/supabase.js / lib/supabaseAdmin.js).
 */
export function loadConfig(): Result<AiAssistantConfig, ConfigurationError> {
  if (cachedConfig) return ok(cachedConfig);

  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseUrl) {
    return err(new ConfigurationError('NEXT_PUBLIC_SUPABASE_URL is not set'));
  }

  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const supabaseKey = serviceRoleKey || anonKey;
  if (!supabaseKey) {
    return err(
      new ConfigurationError(
        'Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set',
      ),
    );
  }

  const openRouterApiKey = readEnv('OPENROUTER_API_KEY') || readEnv('Open_Router_API');
  if (!openRouterApiKey) {
    return err(new ConfigurationError('OPENROUTER_API_KEY is not set'));
  }

  const config: AiAssistantConfig = {
    supabaseUrl,
    supabaseKey,
    hasServiceRoleKey: Boolean(serviceRoleKey),
    openRouterApiKey,
    openRouterModel: readEnv('AI_ASSISTANT_OPENROUTER_MODEL') || DEFAULT_OPENROUTER_MODEL,
    requestTimeoutMs: readIntEnv('AI_ASSISTANT_REQUEST_TIMEOUT_MS', DEFAULT_REQUEST_TIMEOUT_MS),
  };

  cachedConfig = config;
  return ok(config);
}

/** Test-only escape hatch — never called from application code. */
export function _resetConfigCacheForTests(): void {
  cachedConfig = null;
}
