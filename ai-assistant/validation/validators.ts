/**
 * Validation layer.
 *
 * These are generic, stateless guards — no Supabase calls, no OpenRouter
 * calls, no business rules about what makes a "good" topic. They exist so
 * every Phase 2 service can validate primitive shapes (strings, slugs,
 * categories, UUIDs, language codes) the same way, instead of each service
 * re-implementing ad-hoc checks like app/api/admin/topics/route.js does
 * inline today.
 *
 * Category validation intentionally accepts the allowed-list as a
 * parameter rather than importing TOPIC_CATEGORY_VALUES directly — see the
 * open question noted in types/category.types.ts about the topics vs
 * categories-table conflict. Phase 2 decides which list to pass in.
 */

import {
  TOPIC_NAME_MIN_LENGTH,
  TOPIC_NAME_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  SLUG_MAX_LENGTH,
  LANGUAGE_CODE_PATTERN,
} from '../config/constants';
import { ValidationError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Slug format: lowercase letters, digits, single hyphens, no leading/trailing hyphen. Matches lib/topicSlug.js output shape. */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isValidLanguageCode(value: unknown): value is string {
  return typeof value === 'string' && LANGUAGE_CODE_PATTERN.test(value.toLowerCase());
}

export function isValidSlugFormat(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length < SLUG_MIN_LENGTH || value.length > SLUG_MAX_LENGTH) return false;
  return SLUG_PATTERN.test(value);
}

export function isValidCategory(value: unknown, allowedCategories: readonly string[]): value is string {
  return typeof value === 'string' && allowedCategories.includes(value);
}

/** Trims and enforces a max length, returning null if the result is empty. */
export function clampString(value: string, maxLength: number): string | null {
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validate a proposed topic name against the module's length bounds.
 * Returns the trimmed name on success.
 */
export function validateTopicName(name: unknown): Result<string, ValidationError> {
  if (!isNonEmptyString(name)) {
    return err(new ValidationError('Topic name is required'));
  }
  const trimmed = name.trim();
  if (trimmed.length < TOPIC_NAME_MIN_LENGTH) {
    return err(new ValidationError(`Topic name must be at least ${TOPIC_NAME_MIN_LENGTH} characters`, { name: trimmed }));
  }
  if (trimmed.length > TOPIC_NAME_MAX_LENGTH) {
    return err(new ValidationError(`Topic name must be at most ${TOPIC_NAME_MAX_LENGTH} characters`, { name: trimmed }));
  }
  return ok(trimmed);
}

export function validateSlug(slug: unknown): Result<string, ValidationError> {
  if (!isValidSlugFormat(slug)) {
    return err(
      new ValidationError(
        'Slug must be lowercase, hyphen-separated, and 3–100 characters (e.g. "bible-verses-about-hope")',
        { slug },
      ),
    );
  }
  return ok(slug);
}

export function validateLanguageCode(language: unknown): Result<string, ValidationError> {
  if (!isValidLanguageCode(language)) {
    return err(new ValidationError('Language must be a 2-letter ISO 639-1 code (e.g. "en")', { language }));
  }
  return ok((language as string).toLowerCase());
}

export function validateCategory(
  category: unknown,
  allowedCategories: readonly string[],
): Result<string, ValidationError> {
  if (!isValidCategory(category, allowedCategories)) {
    return err(
      new ValidationError(`Category must be one of: ${allowedCategories.join(', ')}`, { category }),
    );
  }
  return ok(category);
}

export function validateParentId(parentId: unknown): Result<string | null, ValidationError> {
  if (parentId === null || parentId === undefined) return ok(null);
  if (!isValidUuid(parentId)) {
    return err(new ValidationError('parent_id must be a valid UUID or null', { parentId }));
  }
  return ok(parentId);
}
