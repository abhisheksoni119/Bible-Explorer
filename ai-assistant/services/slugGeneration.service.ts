/**
 * SlugService — Version 1 scope item #6. IMPLEMENTED.
 *
 * Responsibility (frozen contract §3.6): produce a well-formed candidate
 * slug for a topic name + category. Does NOT check uniqueness against the
 * database (DuplicateService's job).
 *
 * Per §3.6.4/§3.6.6, this service has no discretion over slug rules — it
 * must reuse:
 *   - lib/topicSlug.js topicSlug() for the general case (categories:
 *     'topics', 'guides', 'questions')
 *   - lib/generator.js enforceArticleMeta() for the two categories with an
 *     enforced format ('bible-verses', 'bible-characters')
 *   - lib/generator.js candidateSlugs() to populate `alternates`
 */

import { topicSlug } from '../../lib/topicSlug.js';
import { enforceArticleMeta, candidateSlugs } from '../../lib/generator.js';
import { TopicCategory } from '../types';
import { AppError, ValidationError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';
import { isNonEmptyString, validateSlug } from '../validation/validators';

export interface SlugGenerationInput {
  topicName: string;
  category: TopicCategory;
}

export interface SlugGenerationOutput {
  slug: string;
  alternates?: string[];
}

const ENFORCED_SLUG_CATEGORIES: readonly TopicCategory[] = ['bible-verses', 'bible-characters'];

function computePrimarySlug(topicName: string, category: TopicCategory): string {
  if (ENFORCED_SLUG_CATEGORIES.includes(category)) {
    // enforceArticleMeta() always returns a non-null { title, slug } for
    // these two categories (see lib/generator.js) — that is the existing
    // production rule this service is required to reuse verbatim.
    const enforced = enforceArticleMeta(category, topicName) as { title: string; slug: string } | null;
    if (enforced?.slug) return enforced.slug;
  }
  // General case — same sanitisation the existing admin "Add Topic" UI uses.
  return topicSlug(topicName);
}

export async function generateSlug(
  input: SlugGenerationInput,
): Promise<Result<SlugGenerationOutput, AppError>> {
  if (!isNonEmptyString(input.topicName)) {
    return err(new ValidationError('topicName is required for slug generation'));
  }
  const topicName = input.topicName.trim();

  const slug = computePrimarySlug(topicName, input.category);

  const slugValidation = validateSlug(slug);
  if (!slugValidation.ok) return err(slugValidation.error);

  const rawAlternates: string[] = candidateSlugs(input.category, topicName) ?? [];
  const alternates = rawAlternates.filter((alt) => alt && alt !== slugValidation.value);

  const output: SlugGenerationOutput = {
    slug: slugValidation.value,
    alternates: alternates.length > 0 ? alternates : undefined,
  };

  return ok(output);
}
