/**
 * DuplicateService — Version 1 scope item #7. IMPLEMENTED.
 *
 * Responsibility (frozen contract §3.7): read-only check of a fully-formed
 * TopicCandidate against existing `topics` rows before InsertService runs.
 * SELECT only — no writes.
 *
 * Matching scope (§3.7.6), extending scripts/dedupe-topics.mjs precedent:
 *   1. (name, category, language) case-insensitive exact match
 *   2. Independent slug collision check against topics.slug
 * isDuplicate: true if either check matches.
 */

import { getSupabaseClient } from '../clients/supabase.client';
import { DuplicateCheckResult, TopicCandidate, TopicRow } from '../types';
import { AppError, SupabaseOperationError, ValidationError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';
import { isNonEmptyString } from '../validation/validators';

export async function checkForDuplicateTopic(
  candidate: TopicCandidate,
): Promise<Result<DuplicateCheckResult, AppError>> {
  if (!isNonEmptyString(candidate.name)) {
    return err(new ValidationError('candidate.name is required for duplicate detection'));
  }
  if (!isNonEmptyString(candidate.slug)) {
    return err(new ValidationError('candidate.slug is required for duplicate detection'));
  }

  const clientResult = getSupabaseClient();
  if (!clientResult.ok) return err(clientResult.error);
  const supabase = clientResult.value;

  const name = candidate.name.trim();
  const language = (candidate.language || 'en').trim().toLowerCase();

  // 1. (name, category, language) case-insensitive exact match.
  // .ilike() without wildcards is a case-insensitive EXACT match in
  // PostgREST — same semantics as scripts/dedupe-topics.mjs's
  // name.trim().toLowerCase() grouping, extended with language scoping
  // since topics.language exists and a same-named topic can legitimately
  // exist in two languages.
  const nameQuery = await supabase
    .from('topics')
    .select('*')
    .ilike('name', name)
    .eq('category', candidate.category)
    .eq('language', language);

  if (nameQuery.error) {
    return err(new SupabaseOperationError(nameQuery.error.message, nameQuery.error));
  }

  const nameMatches = (nameQuery.data ?? []) as TopicRow[];
  if (nameMatches.length > 0) {
    return ok({ isDuplicate: true, matches: nameMatches, reason: 'exact_name_match' });
  }

  // 2. Independent slug collision check (slugs map to URLs — collision
  // matters regardless of whether the name/category/language also matched).
  const slugQuery = await supabase.from('topics').select('*').eq('slug', candidate.slug);

  if (slugQuery.error) {
    return err(new SupabaseOperationError(slugQuery.error.message, slugQuery.error));
  }

  const slugMatches = (slugQuery.data ?? []) as TopicRow[];
  if (slugMatches.length > 0) {
    return ok({ isDuplicate: true, matches: slugMatches, reason: 'slug_collision' });
  }

  return ok({ isDuplicate: false, matches: [], reason: 'none' });
}
