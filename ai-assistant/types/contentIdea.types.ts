/**
 * Row shape of the live Supabase `content_ideas` table.
 *
 * Source of truth: Supabase schema inspection + supabase-ideas-setup.sql.
 * Note the DB-level UNIQUE(topic_id, title) constraint — this is what
 * app/api/admin/generate-ideas/route.js relies on for its
 * `.upsert(rows, { onConflict: 'topic_id,title', ignoreDuplicates: true })`
 * call. Any insert this module performs into content_ideas should follow
 * the same upsert pattern rather than a plain insert, to avoid throwing on
 * a legitimate re-run.
 */
export interface ContentIdeaRow {
  id: string; // uuid
  title: string;
  category: string | null;
  source: string | null;
  used: boolean;
  created_at: string;
  topic_id: string | null; // FK → topics.id, ON DELETE CASCADE
  language: string; // default 'en'
}

/** Fields required to insert a new content idea (research output, pre-editorial-review). */
export interface NewContentIdeaInput {
  title: string;
  category?: string | null;
  source?: string | null;
  topic_id?: string | null;
  language?: string;
}
