/**
 * KeywordService — Version 1 scope item #2. IMPLEMENTED.
 *
 * Responsibility (frozen contract §3.2): expand a ResearchOutput into a
 * ranked, deduplicated list of KeywordCandidate entries. Deterministic
 * transformation of what ResearchService already gathered — no additional
 * OpenRouter call, so this service never duplicates Research's work.
 *
 * Per §3.2.6, research.keywords may be empty — that is a valid, non-error
 * input. This service returns Ok([]) in that case rather than an error.
 */

import { KeywordCandidate, ResearchOutput } from '../types';
import { AppError, ValidationError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';

const DEFAULT_MAX_CANDIDATES = 20;

// Matches the frozen contract exactly (§3.2.2): research is the full
// ResearchOutput, not a narrowed shape.
export interface KeywordDiscoveryInput {
  research: ResearchOutput;
  maxCandidates?: number;
}

function normalizeKeywordText(keyword: string): string {
  return keyword.trim().replace(/\s+/g, ' ');
}

export async function discoverKeywords(
  input: KeywordDiscoveryInput,
): Promise<Result<KeywordCandidate[], AppError>> {
  if (!Array.isArray(input.research?.keywords)) {
    return err(new ValidationError('research.keywords must be an array'));
  }

  if (input.maxCandidates !== undefined) {
    if (!Number.isInteger(input.maxCandidates) || input.maxCandidates <= 0) {
      return err(new ValidationError('maxCandidates must be a positive integer', { maxCandidates: input.maxCandidates }));
    }
  }
  const limit = input.maxCandidates ?? DEFAULT_MAX_CANDIDATES;

  // Deduplicate case-insensitively, keeping the first occurrence (Research
  // already ordered by relevance) and preferring the entry with volume data
  // if a later duplicate happens to carry it.
  const seen = new Map<string, KeywordCandidate>();
  for (const candidate of input.research.keywords) {
    if (typeof candidate?.keyword !== 'string') continue;
    const normalized = normalizeKeywordText(candidate.keyword);
    if (!normalized) continue;
    const dedupeKey = normalized.toLowerCase();

    const existing = seen.get(dedupeKey);
    if (!existing) {
      seen.set(dedupeKey, { ...candidate, keyword: normalized });
    } else if (existing.estimatedVolume === undefined && candidate.estimatedVolume !== undefined) {
      seen.set(dedupeKey, { ...candidate, keyword: normalized });
    }
  }

  const deduped = Array.from(seen.values());

  // Rank: entries with estimatedVolume first (descending), then the rest in
  // their original (relevance-ordered) sequence.
  const withVolume = deduped.filter((k) => typeof k.estimatedVolume === 'number');
  const withoutVolume = deduped.filter((k) => typeof k.estimatedVolume !== 'number');
  withVolume.sort((a, b) => (b.estimatedVolume as number) - (a.estimatedVolume as number));

  const ranked = [...withVolume, ...withoutVolume].slice(0, limit);

  return ok(ranked);
}
