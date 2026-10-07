/**
 * Shared constants for the AI Database Assistant module.
 *
 * Values here mirror what's already live in lib/generator.js so the two
 * OpenRouter call sites stay consistent (same model, same referer headers)
 * unless a future phase deliberately overrides them via env.
 */

/** Matches MODEL in lib/generator.js — keep in sync unless intentionally diverging. */
export const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4.1-mini';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Matches the headers already sent by lib/generator.js callOpenRouter(). */
export const OPENROUTER_HTTP_REFERER = 'https://bibleverseinsights.com';
export const OPENROUTER_APP_TITLE = 'Bible Verse Insights';

export const DEFAULT_LANGUAGE = 'en';

export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export const DEFAULT_MAX_TOKENS = 2_000;

/**
 * Topic name / slug length bounds. These are the module's own defaults for
 * Phase 2 validation — the live `topics` table has no CHECK constraint on
 * length today, so these are application-level guards, not DB-enforced.
 */
export const TOPIC_NAME_MIN_LENGTH = 3;
export const TOPIC_NAME_MAX_LENGTH = 255;
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 100;

/** ISO 639-1 style 2-letter language code pattern (e.g. "en", "es", "fr"). */
export const LANGUAGE_CODE_PATTERN = /^[a-z]{2}$/;
