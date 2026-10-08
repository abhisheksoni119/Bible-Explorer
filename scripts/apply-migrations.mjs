// Applies reviewed, idempotent database migrations using the authorized
// DATABASE_URL provided by the platform (Vercel build environment).
//
// SAFETY:
//  - Target guard: refuses to run unless the connection points at the
//    confirmed production project ref ynftzpgjsnoyjovotpua.
//  - Only hardcoded, reviewed, idempotent statements are applied
//    (docs/migrations/001 + 002). No arbitrary SQL, no user input.
//  - Prints non-secret diagnostics only: project ref, statement results,
//    topics/articles row counts. Never prints the connection string or keys.
//
// Usage: node scripts/apply-migrations.mjs   (requires DATABASE_URL in env)

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const PROJECT_REF = 'ynftzpgjsnoyjovotpua';

function log(msg) { console.log('[migrate] ' + msg); }

function loadMigrations() {
  // Order matters. Each statement is idempotent and was reviewed against the
  // production schema (see docs/migrations/*.sql).
  return [
    {
      id: '001_article_revisions',
      statements: [
        `CREATE TABLE IF NOT EXISTS article_revisions (
          id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          article_id        UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
          content           TEXT NOT NULL,
          meta_title        TEXT,
          meta_description  TEXT,
          source            TEXT NOT NULL DEFAULT 'manual',
          created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_article_revisions_article
          ON article_revisions (article_id, created_at DESC)`,
        `ALTER TABLE article_revisions ENABLE ROW LEVEL SECURITY`,
        `REVOKE ALL ON article_revisions FROM anon`,
        `REVOKE ALL ON article_revisions FROM authenticated`,
      ],
    },
    {
      id: '002_drop_unique_topic_article',
      statements: [
        `ALTER TABLE articles DROP CONSTRAINT IF EXISTS unique_topic_article`,
      ],
    },
  ];
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || '';
  if (!databaseUrl) {
    log('SKIP: DATABASE_URL is not set in this environment (nothing to migrate).');
    return;
  }

  // Target guard — the ref must appear in the connection (host, username, or
  // database name) so this can never touch a different Supabase project.
  if (!databaseUrl.includes(PROJECT_REF)) {
    const hostPart = (databaseUrl.match(/@([^:/?]+)/) || [])[1] || '(unparsable)';
    log('REFUSE: DATABASE_URL does not point at project ' + PROJECT_REF + ' (connection host: ' + hostPart + ').');
    return;
  }
  log('target confirmed: connection references project ' + PROJECT_REF);

  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Ground truth before applying (non-secret diagnostics for build logs)
  const q = async sql => (await client.query(sql)).rows;
  try {
    const topicsCount = await q('SELECT COUNT(*)::int AS n FROM topics');
    const articlesCount = await q("SELECT COUNT(*)::int AS n FROM articles");
    const publishedCount = await q("SELECT COUNT(*)::int AS n FROM articles WHERE status='published'");
    log('pre-migration state: topics=' + topicsCount[0].n + ' articles=' + articlesCount[0].n + ' published=' + publishedCount[0].n);

    // Verify this really is the production content database: the public site
    // serves ~290 published articles from it.
    if (publishedCount[0].n < 100) {
      log('REFUSE: this database has fewer than 100 published articles and does not look like the production content database.');
      log('REFUSE: No migrations were applied. Fix the DATABASE_URL target in the Vercel project settings first.');
      await client.end();
      return;
    }

    for (const migration of loadMigrations()) {
      log('applying ' + migration.id + ' ...');
      for (const statement of migration.statements) {
        await client.query(statement);
      }
      log('applied ' + migration.id + ' ✓');
    }

    // Post-apply verification
    const revTable = await q(`SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='article_revisions'`);
    const revRls = await q(`SELECT rowsecurity FROM pg_tables WHERE tablename='article_revisions'`);
    const revIndex = await q(`SELECT COUNT(*)::int AS n FROM pg_indexes WHERE tablename='article_revisions' AND indexname='idx_article_revisions_article'`);
    const constraint = await q(`SELECT COUNT(*)::int AS n FROM pg_constraint WHERE conrelid='articles'::regclass AND conname='unique_topic_article'`);
    const topicsAfter = await q('SELECT COUNT(*)::int AS n FROM topics');
    const articlesAfter = await q('SELECT COUNT(*)::int AS n FROM articles');
    log('verify: article_revisions table=' + (revTable[0].n === 1 ? 'EXISTS' : 'MISSING') +
        ' | RLS=' + (revRls[0] ? String(revRls[0].rowsecurity) : '?') +
        ' | index=' + (revIndex[0].n === 1 ? 'EXISTS' : 'MISSING') +
        ' | unique_topic_article constraint=' + (constraint[0].n === 0 ? 'REMOVED' : 'STILL PRESENT (' + constraint[0].n + ')'));
    log('post-migration state: topics=' + topicsAfter[0].n + ' articles=' + articlesAfter[0].n + ' (unchanged counts expected)');
  } finally {
    await client.end();
  }
  log('migrations complete.');
}

