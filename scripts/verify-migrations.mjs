// READ-ONLY migration verifier (canary build).
// Connects with the platform-injected DATABASE_URL, checks the schema state
// of migrations 001/002 WITHOUT modifying anything, and writes a
// booleans-only result file to public/migration-status.json (served on this
// deployment only). Never prints or stores the connection string or keys.
//
// Usage: node scripts/verify-migrations.mjs   (build-time, preview canary)

import fs from 'node:fs';
import pg from 'pg';

const OUT = 'public/migration-status.json';

async function main() {
  const url = process.env.DATABASE_URL || '';
  const result = {
    purpose: 'read-only migration verification (canary) — booleans and counts only',
    checkedAt: new Date().toISOString(),
  };

  if (!url) {
    result.dbReachable = false;
    result.reason = 'DATABASE_URL not present in build environment';
    fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.log('[verify-migrations] DATABASE_URL absent — wrote status file.');
    return;
  }

  const host = (url.match(/@([^:/?]+)/) || [])[1] || '(unparsable)';
  const user = (url.match(/:\/\/([^:@]+):/) || [])[1] || '(unparsable)';
  result.dbUser = decodeURIComponent(user); // username is postgres.<public-ref> — not a secret
  result.dbHost = host; // host contains the public project ref — not a secret
  result.dbReferencesYnftz = url.includes('ynftzpgjsnoyjovotpua'); // ref lives in the username of pooler URIs; checked, never printed

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
  } catch (e) {
    result.dbReachable = false;
    result.reason = 'connection failed: ' + e.message.split('\n')[0].slice(0, 120);
    fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.log('[verify-migrations] connection failed — wrote status file.');
    return;
  }

  const q = async (sql) => (await client.query(sql)).rows;

  try {
    // ── Migration 001: article_revisions ────────────────────────────────
    const table = await q(`SELECT COUNT(*)::int AS n FROM information_schema.tables
      WHERE table_schema='public' AND table_name='article_revisions'`);
    result.m001_revisionsTableExists = table[0].n === 1;

    if (result.m001_revisionsTableExists) {
      const rls = await q(`SELECT rowsecurity FROM pg_tables WHERE tablename='article_revisions'`);
      result.m001_rlsEnabled = rls.length > 0 && rls[0].rowsecurity === true;

      const idx = await q(`SELECT COUNT(*)::int AS n FROM pg_indexes
        WHERE tablename='article_revisions' AND indexname='idx_article_revisions_article'`);
      result.m001_indexExists = idx[0].n === 1;

      // anon-role grants on the table (should be revoked)
      const grants = await q(`SELECT COUNT(*)::int AS n FROM information_schema.role_table_grants
        WHERE table_name='article_revisions' AND grantee IN ('anon','authenticated')`);
      result.m001_browserRolesRevoked = grants[0].n === 0;
    } else {
      result.m001_rlsEnabled = false;
      result.m001_indexExists = false;
      result.m001_browserRolesRevoked = false;
    }

    // ── Migration 002: one-article-per-topic constraint ─────────────────
    const constraint = await q(`SELECT COUNT(*)::int AS n FROM pg_constraint
      WHERE conrelid='articles'::regclass AND conname='unique_topic_article'`);
    result.m002_topicArticleConstraintRemoved = constraint[0].n === 0;

    // Slug uniqueness must remain enforced (unique constraint or index on articles.slug)
    const slugUnique = await q(`SELECT COUNT(*)::int AS n FROM pg_constraint
      WHERE conrelid='articles'::regclass AND contype='u'
        AND pg_get_constraintdef(oid) ILIKE '%slug%'`);
    const slugUniqueIdx = await q(`SELECT COUNT(*)::int AS n FROM pg_indexes
      WHERE tablename='articles' AND indexdef ILIKE 'CREATE UNIQUE%' AND indexdef ILIKE '%slug%'`);
    result.m002_slugUniquenessEnforced = slugUnique[0].n > 0 || slugUniqueIdx[0].n > 0;

    // ── Content-integrity counts (read-only) ────────────────────────────
    const topics = await q('SELECT COUNT(*)::int AS n FROM topics');
    const articles = await q('SELECT COUNT(*)::int AS n FROM articles');
    const published = await q(`SELECT COUNT(*)::int AS n FROM articles WHERE status='published'`);
    result.counts = { topics: topics[0].n, articles: articles[0].n, published: published[0].n };

    // Multi-article reality check: any topic currently holding >1 article?
    const multi = await q(`SELECT COUNT(*)::int AS n FROM (
      SELECT topic_id FROM articles WHERE topic_id IS NOT NULL
      GROUP BY topic_id HAVING COUNT(*) > 1) m`);
    result.m002_topicsWithMultipleArticles = multi[0].n;

    result.dbReachable = true;
  } finally {
    await client.end();
  }

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log('[verify-migrations] verification complete — status file written.');
}

main().catch(e => {
  // Never fail the build from the verifier itself.
  try {
    fs.writeFileSync(OUT, JSON.stringify({ dbReachable: false, reason: 'verifier error: ' + e.message.slice(0, 150), checkedAt: new Date().toISOString() }, null, 2));
  } catch {}
  console.log('[verify-migrations] verifier error (status file written): ' + e.message);
});
