/**
 * Topic category.
 *
 * IMPORTANT — known open question for Phase 2 (do not resolve silently):
 * The live `topics.category` column is constrained by a Postgres CHECK to
 * exactly these 5 values (see supabase-setup.sql + lib/categories.js):
 *   'topics' | 'guides' | 'questions' | 'bible-verses' | 'bible-characters'
 *
 * There is ALSO a separate Supabase `categories` table (10 rows) that does
 * NOT appear to be referenced by `topics.category` anywhere in the current
 * codebase — no foreign key, no join. It may be legacy/unused, or it may be
 * intended for a different purpose (e.g. a future nav taxonomy). Phase 2
 * MUST confirm which source of truth the Category Assignment service should
 * use before writing any topic to Supabase — inserting a category outside
 * the CHECK-constrained list will make the insert fail at the DB level.
 *
 * This union is kept in sync with lib/categories.js CATEGORY_VALUES by
 * hand. If lib/categories.js changes, update this type to match.
 */
export type TopicCategory =
  | 'topics'
  | 'guides'
  | 'questions'
  | 'bible-verses'
  | 'bible-characters';

export const TOPIC_CATEGORY_VALUES: readonly TopicCategory[] = [
  'topics',
  'guides',
  'questions',
  'bible-verses',
  'bible-characters',
];
