-- COMBINED: Article revisions + multi-article support
-- Apply BOTH prepared migrations in one paste (idempotent, additive-only).
-- Files: docs/migrations/001_article_revisions.sql + 002_drop_unique_topic_article.sql
-- Safe to run multiple times. Fully reversible (see REVERT notes at bottom).

-- ─── Migration 001: Article revisions (rollback support) ──────────────────

CREATE TABLE IF NOT EXISTS article_revisions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id        UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  content           TEXT NOT NULL,
  meta_title        TEXT,
  meta_description  TEXT,
  source            TEXT NOT NULL DEFAULT 'manual',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_revisions_article
  ON article_revisions (article_id, created_at DESC);

-- Security: revision snapshots contain full article content. RLS with NO
-- policies denies browser roles (anon / authenticated) completely; only the
-- server-side service-role key (admin API, behind admin login) can access it.
ALTER TABLE article_revisions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON article_revisions FROM anon;
REVOKE ALL ON article_revisions FROM authenticated;

-- ─── Migration 002: Multiple distinct articles per topic ─────────────────
-- Removes the one-article-per-topic restriction. Duplicate-intent protection
-- is enforced by the application (slug collisions, published protection).
-- No rows are modified or deleted.

ALTER TABLE articles DROP CONSTRAINT IF EXISTS unique_topic_article;

-- ─── REVERT (only if ever needed) ──────────────────────────────────────────
--   DROP TABLE IF EXISTS article_revisions;
--   ALTER TABLE articles
--     ADD CONSTRAINT unique_topic_article UNIQUE (topic_id);
--   (re-add only after confirming no topic has more than one article)
