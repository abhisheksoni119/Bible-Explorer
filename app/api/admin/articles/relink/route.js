export const dynamic = 'force-dynamic';

import { NextResponse }      from 'next/server';
import { supabaseAdmin as supabase } from '../../../../../lib/supabaseAdminClient.js';
import { stripArticleLinks, enrichContent } from '../../../../../lib/seoEnrich.js';
import { interlinkArticle }  from '../../../../../lib/interlinker.js';

/**
 * POST /api/admin/articles/relink
 * Body (all optional):
 *   ids    – string[]  specific article IDs; omit to re-link ALL non-rejected
 *   smart  – boolean   use smart interlinker (default true)
 *   force  – boolean   reserved for future use (no link-count cap exists)
 *
 * Strips old injected links, re-runs the full pipeline:
 *   1. Smart internal linking (Related, Explore More, contextual)
 *   2. Bible verse blockquotes + /bible/ links
 * Updates link_count and updated_at.
 */
export async function POST(request) {
  try {
    const body    = await request.json().catch(() => ({}));
    const { ids, smart = true, force = false, preview = false, apply = false } = body;

    // 1. Fetch all published articles as the enrichment pool
    //    (drafts and rejected are never link targets — their URLs are not public)
    const pool = await fetchPool();

    // 2. Determine targets
    const targetSet = Array.isArray(ids) && ids.length > 0 ? new Set(ids) : null;
    const targets   = targetSet
      ? pool.filter(a => targetSet.has(a.id))
      : pool.filter(a => a.status === 'published');

    if (targets.length === 0) {
      return NextResponse.json({ updated: 0, message: 'No articles to re-link.' });
    }

    // ── Preview mode: compute proposals, save nothing ─────────────────────
    if (preview && !apply) {
      const results = [];
      for (const article of targets.slice(0, 100)) {
        try {
          const { data: full } = await supabase
            .from('articles')
            .select('id, slug, title, content, topic_id, link_count, status')
            .eq('id', article.id)
            .single();
          if (!full) continue;
          const stripped = stripArticleLinks(full.content || '');
          const poolEntry = pool.find(p => p.id === article.id);
          const { html: linked, linksAdded, insertAnchors } = interlinkArticle(
            { ...full, content: stripped, category: poolEntry?.category || '', parentTopicId: poolEntry?.parent_topic_id || null },
            pool
          );
          results.push({
            id: article.id,
            slug: article.slug,
            title: article.title,
            linksAdded,
            insertAnchors: (insertAnchors || []).slice(0, 3),
          });
        } catch (err) {
          results.push({ id: article.id, slug: article.slug, error: err.message });
        }
      }
      return NextResponse.json({
        preview: true,
        totalArticles: results.length,
        results,
        message: `Preview: ${results.filter(r => r.linksAdded > 0).length} of ${results.length} articles would receive new internal links.`,
      });
    }

    // ── Apply mode: snapshot + save ────────────────────────────────────────
    let updated = 0;
    const errors = [];

    for (const article of targets) {
      try {
        // Fetch full content for this article
        const { data: full, error: fErr } = await supabase
          .from('articles')
          .select('id, slug, title, content, topic_id, link_count, status')
          .eq('id', article.id)
          .single();

        if (fErr || !full) throw new Error(fErr?.message || 'Not found');

        // Rollback safety: snapshot the pre-change content (best-effort —
        // skipped gracefully when the revisions table is not installed).
        try {
          await supabase.from('article_revisions').insert({
            article_id: article.id,
            content: full.content || '',
            meta_title: null,
            meta_description: null,
            source: 'relink',
          });
        } catch { /* revisions table optional */ }

        // No link count ceiling — re-link all articles regardless of existing count

        // Strip old links
        const stripped = stripArticleLinks(full.content || '');

        let html = stripped;
        let linksAdded = 0;

        // Smart interlinking
        if (smart) {
          const { html: linked, linksAdded: n } = interlinkArticle(
            { ...full, content: stripped, category: article.category, parentTopicId: article.parent_topic_id || null },
            pool
          );
          html       = linked;
          linksAdded = n;
        }

        // Bible verse enrichment (blockquotes + /bible/ links)
        const { html: enriched } = await enrichContent(html);
        html = enriched;

        // Save back
        const { error: updateErr } = await supabase
          .from('articles')
          .update({ content: html, link_count: linksAdded, updated_at: new Date().toISOString() })
          .eq('id', article.id);

        if (updateErr) {
          // Retry without updated_at
          const { error: e2 } = await supabase
            .from('articles')
            .update({ content: html, link_count: linksAdded })
            .eq('id', article.id);
          if (e2) throw new Error(e2.message);
        }

        updated++;
      } catch (err) {
        errors.push({ id: article.id, slug: article.slug, error: err.message });
      }
    }

    return NextResponse.json({
      updated,
      total:   targets.length,
      errors:  errors.length > 0 ? errors : undefined,
      message: `Re-linked ${updated} of ${targets.length} articles.`,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Fetch pool (paginated, incl. category + is_pillar) ──────────────────────

async function fetchPool() {
  const all  = [];
  let   from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, topic_id, link_count, status, topics(category, is_pillar, parent_id)')
      .eq('status', 'published')
      .order('id', { ascending: true })       // stable order so duplicate-URL dedup picks the same winner across runs
      .range(from, from + 999);

    if (error || !data?.length) break;

    for (const row of data) {
      all.push({
        id:              row.id,
        slug:            row.slug,
        title:           row.title,
        topic_id:        row.topic_id,
        parent_topic_id: row.topics?.parent_id || null,
        category:        row.topics?.category || '',
        is_pillar:       !!row.topics?.is_pillar,
        link_count:      row.link_count || 0,
        status:          row.status,
      });
    }

    if (data.length < 1000) break;
    from += 1000;
  }

  return all;
}
// step0-rebuild-marker
