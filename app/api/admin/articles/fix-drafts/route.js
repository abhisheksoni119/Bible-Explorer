export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../../lib/supabaseAdminClient.js';
import { enforceArticleMeta, sanitiseSlug } from '../../../../../lib/generator.js';

/**
 * POST /api/admin/articles/fix-drafts
 *
 * Scans all draft articles that have an associated topic and fixes their
 * title + slug to match the canonical format for that category.
 *
 * Only updates articles whose title or slug currently differs from the
 * correct format — so it is safe to run repeatedly.
 *
 * Body (all optional):
 *   { dryRun: true }  — report what would change without writing anything
 */
export async function POST(request) {
  try {
    const body     = await request.json().catch(() => ({}));
    const dryRun   = body.dryRun === true;

    // 1. Load all draft articles that have a topic_id
    const { data: drafts, error: draftsErr } = await supabase
      .from('articles')
      .select('id, title, slug, topic_id')
      .eq('status', 'draft')
      .not('topic_id', 'is', null);

    if (draftsErr) return NextResponse.json({ error: draftsErr.message }, { status: 500 });
    if (!drafts?.length) return NextResponse.json({ fixed: 0, skipped: 0, changes: [] });

    // 2. Load topic info (name + category) for all referenced topics
    const topicIds = [...new Set(drafts.map(a => a.topic_id))];
    const { data: topics, error: topicsErr } = await supabase
      .from('topics')
      .select('id, name, category')
      .in('id', topicIds);

    if (topicsErr) return NextResponse.json({ error: topicsErr.message }, { status: 500 });

    const topicMap = Object.fromEntries((topics || []).map(t => [t.id, t]));

    // 3. Load existing published slugs so we can avoid collisions when renaming
    const { data: published } = await supabase
      .from('articles')
      .select('slug')
      .eq('status', 'published');
    const publishedSlugs = new Set((published || []).map(a => a.slug));

    const changes  = [];
    const skipped  = [];

    for (const article of drafts) {
      const topic = topicMap[article.topic_id];
      if (!topic) { skipped.push({ id: article.id, reason: 'topic not found' }); continue; }

      const enforced = enforceArticleMeta(topic.category, topic.name);
      if (!enforced) { skipped.push({ id: article.id, reason: 'no strict format for category' }); continue; }

      const correctTitle = enforced.title;
      const baseSlug     = sanitiseSlug(enforced.slug);

      // Deduplicate slug if the correct slug is taken by a *published* article
      let correctSlug = baseSlug;
      if (publishedSlugs.has(correctSlug) && article.slug !== correctSlug) {
        let n = 2;
        while (publishedSlugs.has(`${baseSlug}-${n}`)) n++;
        correctSlug = `${baseSlug}-${n}`;
      }

      const titleOk = article.title === correctTitle;
      const slugOk  = article.slug  === correctSlug;
      if (titleOk && slugOk) { skipped.push({ id: article.id, reason: 'already correct' }); continue; }

      changes.push({
        id:        article.id,
        oldTitle:  article.title,
        newTitle:  correctTitle,
        oldSlug:   article.slug,
        newSlug:   correctSlug,
        category:  topic.category,
        topicName: topic.name,
      });

      if (!dryRun) {
        await supabase
          .from('articles')
          .update({ title: correctTitle, slug: correctSlug })
          .eq('id', article.id);
      }
    }

    return NextResponse.json({
      dryRun,
      fixed:   dryRun ? 0 : changes.length,
      wouldFix: dryRun ? changes.length : undefined,
      skipped: skipped.length,
      changes,
    });
  } catch (err) {
    console.error('[fix-drafts]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
