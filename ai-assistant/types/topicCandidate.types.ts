import { TopicCategory } from './category.types';
import { TopicRow } from './topic.types';
import { SearchIntentResult } from './research.types';

/**
 * A proposed topic, assembled by Topic Generation + Category Assignment +
 * Slug Generation, BEFORE duplicate-checking and insertion.
 * This is the hand-off object between those services.
 */
export interface TopicCandidate {
  name: string;
  category: TopicCategory;
  language: string;
  slug: string;
  parentId?: string | null;
  isPillar?: boolean;
  keywords?: string[];
  intent?: SearchIntentResult;
  /** Free-text justification the AI/service produced — for editorial review, not stored in `topics`. */
  reasoning?: string;
}

/**
 * Result of checking a TopicCandidate against existing `topics` rows.
 * Mirrors the matching logic already established by scripts/dedupe-topics.mjs
 * (name + category, case-insensitive) but scoped to also consider language,
 * since `topics.language` exists and a topic can legitimately have the same
 * name across two languages.
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matches: TopicRow[];
  reason?: 'exact_name_match' | 'slug_collision' | 'none';
}

/** Outcome of validating + inserting a TopicCandidate into Supabase. */
export interface TopicInsertionResult {
  inserted: TopicRow;
}
