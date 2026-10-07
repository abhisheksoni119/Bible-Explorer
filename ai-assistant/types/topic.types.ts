import { TopicCategory } from './category.types';

/**
 * Row shape of the live Supabase `topics` table, as inspected directly
 * against the Bible Verse Insights project (ynftzpgjsnoyjovotpua).
 *
 * Field-for-field source of truth: Supabase schema inspection + supabase-setup.sql.
 * `category` is typed as TopicCategory here for compile-time safety, but the
 * DB stores it as plain TEXT with a CHECK constraint — always validate
 * before insert/update, don't rely on the type alone.
 */
export interface TopicRow {
  id: string; // uuid
  name: string;
  category: string; // stored as TEXT + CHECK constraint; narrow with isValidCategory() before trusting as TopicCategory
  created_at: string; // ISO timestamp
  is_pillar: boolean;
  article_created: boolean;
  parent_id: string | null; // self-referencing FK → topics.id
  language: string; // default 'en'
  slug: string | null;
}

/** Fields required to insert a new topic. Matches app/api/admin/topics/route.js POST shape, extended with slug/language. */
export interface NewTopicInput {
  name: string;
  category: TopicCategory;
  language?: string; // defaults to DEFAULT_LANGUAGE if omitted
  is_pillar?: boolean;
  parent_id?: string | null;
  slug?: string | null;
}
