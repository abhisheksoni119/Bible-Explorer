export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../../../lib/supabaseAdminClient.js';
import { interlinkArticle }  from '../../../../../../lib/interlinker.js';
import { stripArticleLinks, enrichContent } from '../../../../../../lib/seoEnrich.js';

/**
 * POST /api/admin/articles/[id]/interlink
 *
 * Pipeline:
 *  1. Strip ALL existing injected links (article-links + verse-refs)
 *  2. Run smart interlinker  (contextual + mid-content + Related Articles + Explore More)
 *  3. Re-run enrichContent   (re-injects Bible verse blockquotes + /bible/ links)
 *  4. Save back to DB, update link_count + updated_at
 *
 * No link-count cap — links as many relevant articles as possible.
 */
export async function POST(_req, { params }) {
  try {
    const { id } = await params;
    const body = await _req.json().catch(() => ({}));
    // Review-first: default is preview (compute + report, save nothing).
    // apply=true snapshots the live version and persists the relinked content.
    const apply = body.apply === true;

    // 1. Fetch the target article
    const { data: article, error: artErr } = await supabase
      .from('articles')
      .select('id, slug, title, content, topic_id, link_count, status')
      .eq('id', id)
      .single();

    if (artErr || !article) {
      return NextResponse.json({ error: artErr?.message || 'Article not found' }, { status: 404 });
    }

    // 2. Fetch pool (all published articles with category + pillar + parent_id info)
    const pool = await fetchPool();

    // 3. Strip all old links (article-links AND verse-refs — both will be re-added)
    const stripped = stripArticleLinks(article.content || '');

    // 4. Resolve category and parent topic id for hierarchy-aware linking
    const poolEntry = pool.find(p => p.id === article.id);
    const category  = poolEntry?.category || '';
    const parentTopicId = poolEntry?.parent_topic_id || null;

    // 5. Smart interlinking
    const { html: linked, linksAdded, inlineAnchors, insertAnchors } = interlinkArticle(
      { ...article, content: stripped, category, parentTopicId },
      pool
    );

    // 5. Re-inject Bible verse blockquotes + /bible/ reference links
    const { html } = await enrichContent(linked);

    // ── Preview mode: report the proposal, save nothing ───────────────────
    if (!apply) {
      const anchors = [...inlineAnchors, ...insertAnchors].slice(0, 12);
      return NextResponse.json({
        preview: true,
        id,
        slug: article.slug,
        title: article.title,
        linksAdded,
        anchors,
        message: `Preview: ${linksAdded} internal link(s) would be added to "${article.title}".`,
      });
    }

    // ── Apply mode: rollback snapshot, then save ──────────────────────────
    try {
      await supabase.from('article_revisions').insert({
        article_id: id,
        content: article.content || '',
        meta_title: article.meta_title || null,
        meta_description: null,
        source: 'interlink',
      });
    } catch { /* revisions table optional */ }

    // 6. Save back
    let saved, saveErr;
    ({ data: saved, error: saveErr } = await supabase
      .from('articles')
      .update({ content: html, link_count: linksAdded, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single());

    if (saveErr) {
      // Retry without updated_at if column absent
      ({ data: saved, error: saveErr } = await supabase
        .from('articles')
        .update({ content: html, link_count: linksAdded })
        .eq('id', id)
        .select()
        .single());
    }

    if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });

    return NextResponse.json({ ...saved, linksAdded, message: `Added ${linksAdded} internal links.` });
  } catch (err) {
    console.error('[interlink]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchPool() {
  const all  = [];
  let   from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, topic_id, link_count, topics(category, is_pillar, parent_id)')
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
      });
    }

    if (data.length < 1000) break;
    from += 1000;
  }

  return all;
}

function resolveCategory(article, pool) {
  const match = pool.find(p => p.id === article.id);
  return match?.category || '';
}
// step0-rebuild-marker
