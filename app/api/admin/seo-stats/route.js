export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdmin.js';

function isSchemaError(msg = '') {
  return msg.includes('schema cache') || msg.includes('column') || msg.includes('does not exist');
}

/**
 * GET /api/admin/seo-stats
 *
 * Returns all SEO dashboard data in a single call:
 *  - overall      : total/completed/remaining/pct from topics
 *  - byCategory   : per-category topic counts
 *  - pillars      : total / completed pillar topics
 *  - pillarTopics : full list of pillar topics with article_created status
 *  - missing      : top 20 topics where article_created = false
 *  - recentArticles: last 10 published/draft articles
 *  - lowLinks     : 10 articles with lowest link_count
 *
 * Defensive: all is_pillar / article_created queries silently fallback to 0
 * when those columns don't yet exist in the schema.
 */
export async function GET() {
  try {
    // ── 1. Fetch all topic rows (paginated) ──────────────────────────────────
    // We need category + article_created + is_pillar + name + id to compute all stats in JS.
    const allTopics   = await fetchAllTopics();
    const hasCreated  = allTopics.length > 0 && 'article_created' in allTopics[0];
    const hasPillar   = allTopics.length > 0 && 'is_pillar' in allTopics[0];

    // ── 2. Overall progress ──────────────────────────────────────────────────
    const total     = allTopics.length;
    const completed = hasCreated ? allTopics.filter(t => t.article_created).length : 0;
    const remaining = total - completed;
    const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

    // ── 3. Category breakdown ────────────────────────────────────────────────
    const catMap = {};
    for (const t of allTopics) {
      const cat = t.category || 'uncategorised';
      if (!catMap[cat]) catMap[cat] = { total: 0, completed: 0 };
      catMap[cat].total++;
      if (hasCreated && t.article_created) catMap[cat].completed++;
    }
    const byCategory = Object.entries(catMap)
      .map(([category, v]) => ({ category, ...v, remaining: v.total - v.completed }))
      .sort((a, b) => b.total - a.total);

    // ── 4. Pillar status ─────────────────────────────────────────────────────
    const pillarTopicsAll = hasPillar
      ? allTopics.filter(t => t.is_pillar)
      : [];
    const pillars = {
      total:     pillarTopicsAll.length,
      completed: hasCreated ? pillarTopicsAll.filter(t => t.article_created).length : 0,
    };

    // ── 5. Pillar topics list (for Pillar View panel) ─────────────────────────
    const pillarTopics = pillarTopicsAll.map(t => ({
      id:              t.id,
      name:            t.name,
      category:        t.category,
      article_created: !!t.article_created,
    }));

    // ── 6. Missing articles (not created, top 20) ────────────────────────────
    const missing = (hasCreated
      ? allTopics.filter(t => !t.article_created)
      : allTopics
    ).slice(0, 20).map(t => ({ id: t.id, name: t.name, category: t.category || '' }));

    // ── 7. Recently created articles (last 10) ───────────────────────────────
    const { data: recentRaw } = await supabase
      .from('articles')
      .select('id, title, slug, status, created_at, topics(category)')
      .in('status', ['published', 'draft'])
      .order('created_at', { ascending: false })
      .limit(10);

    const recentArticles = (recentRaw || []).map(a => ({
      id:         a.id,
      title:      a.title,
      slug:       a.slug,
      status:     a.status,
      category:   a.topics?.category || '',
      created_at: a.created_at,
    }));

    // ── 8. Low-link articles (needs interlinking) ─────────────────────────────
    const { data: lowRaw } = await supabase
      .from('articles')
      .select('id, title, slug, link_count, status, topics(category)')
      .neq('status', 'rejected')
      .order('link_count', { ascending: true })
      .limit(10);

    const lowLinks = (lowRaw || []).map(a => ({
      id:         a.id,
      title:      a.title,
      slug:       a.slug,
      link_count: a.link_count || 0,
      status:     a.status,
      category:   a.topics?.category || '',
    }));

    return NextResponse.json({
      overall:        { total, completed, remaining, pct },
      byCategory,
      pillars,
      pillarTopics,
      missing,
      recentArticles,
      lowLinks,
    });
  } catch (err) {
    console.error('[seo-stats]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Paginated topic fetch ───────────────────────────────────────────────────

async function fetchAllTopics() {
  const all  = [];
  let   from = 0;

  // Try with is_pillar first; fall back to without it
  let cols = 'id, name, category, article_created, is_pillar';

  while (true) {
    const { data, error } = await supabase
      .from('topics')
      .select(cols)
      .range(from, from + 999);

    if (error) {
      if (isSchemaError(error.message) && cols.includes('is_pillar')) {
        // Retry without is_pillar
        cols = 'id, name, category, article_created';
        continue;
      }
      if (isSchemaError(error.message) && cols.includes('article_created')) {
        // Retry with minimal columns
        cols = 'id, name, category';
        continue;
      }
      break; // Non-schema error — stop
    }

    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  return all;
}
// step0-rebuild-marker
