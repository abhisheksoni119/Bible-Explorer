/**
 * InsertService — Version 1 scope item #8 (final step). IMPLEMENTED.
 *
 * Responsibility (frozen contract §3.8): the single write this module is
 * permitted to make. Insert an already-validated, already-duplicate-checked
 * TopicCandidate into the live Supabase `topics` table.
 *
 * Mirrors the insert shape and schema-error fallback already used by
 * app/api/admin/topics/route.js POST (retry without `is_pillar` if that
 * column is reported missing by Supabase) — same isSchemaError() check.
 *
 * Per §3.8.6, this service does NOT re-validate name/category/slug — that
 * is Category/Slug/Topic service's responsibility. It only inserts what
 * it's given, or fails.
 *
 * "No service may directly call InsertService except the orchestrator" —
 * this file is only ever imported by orchestrator.ts.
 */

import { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient } from '../clients/supabase.client';
import { TopicCandidate, TopicInsertionResult, TopicRow } from '../types';
import { AppError, DuplicateTopicError, SupabaseOperationError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';

/** Same check as app/api/admin/topics/route.js isSchemaError(). */
function isSchemaError(message = ''): boolean {
  return message.includes('does not exist') || message.includes('column') || message.includes('schema cache');
}

/** Postgres unique_violation error code. */
const UNIQUE_VIOLATION_CODE = '23505';

export async function insertTopic(
  candidate: TopicCandidate,
): Promise<Result<TopicInsertionResult, AppError>> {
  const clientResult = getSupabaseClient();
  if (!clientResult.ok) return err(clientResult.error);
  const supabase = clientResult.value;

  const baseRow: Record<string, unknown> = {
    name: candidate.name.trim(),
    category: candidate.category,
    language: candidate.language,
    slug: candidate.slug,
    is_pillar: candidate.isPillar ?? false,
  };
  if (candidate.parentId) baseRow.parent_id = candidate.parentId;

  let { data, error } = await supabase.from('topics').insert(baseRow).select().single();

  if (error && isSchemaError(error.message)) {
    // Same fallback as app/api/admin/topics/route.js: retry without
    // is_pillar in case that column is absent in this environment.
    const fallbackRow: Record<string, unknown> = { ...baseRow };
    delete fallbackRow.is_pillar;
    ({ data, error } = await supabase.from('topics').insert(fallbackRow).select().single());
  }

  if (error) {
    const pgError = error as PostgrestError;
    if (pgError.code === UNIQUE_VIOLATION_CODE) {
      return err(
        new DuplicateTopicError(
          'Topic insert conflicted with an existing unique constraint (race condition — ' +
            'a matching topic was inserted after DuplicateService checked)',
          pgError,
        ),
      );
    }
    return err(new SupabaseOperationError(error.message, error));
  }

  if (!data) {
    return err(new SupabaseOperationError('Insert into topics succeeded but no row was returned'));
  }

  return ok({ inserted: data as TopicRow });
}
