-- 001: Article revisions (rollback support for AI/content edits)
-- Idempotent: safe to run multiple times.
-- Until this is run, the app degrades gracefully (revisions simply report
-- "not enabled"); no code change is needed to enable it afterwards.

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
