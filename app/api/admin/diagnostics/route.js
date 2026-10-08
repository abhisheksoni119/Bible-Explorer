export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdminClient.js';

const ALL_CATEGORIES = ['bible-verses', 'bible-characters', 'questions', 'guides', 'topics'];

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const [
      { data: topicsRaw,    error: topicsErr    },
      { data: articlesRaw,  error: articlesErr  },
    ] = await Promise.all([
      supabase.from('topics').select('id, name, category, article_created'),
      supabase.from('articles').select('id, slug, status, topic_id').limit(5000),
    ]);

    if (topicsErr)   return NextResponse.json({ error: topicsErr.message },   { status: 500 });
    if (articlesErr) return NextResponse.json({ error: articlesErr.message }, { status: 500 });

    const topics   = topicsRaw   || [];
    const articles = articlesRaw || [];

    // Build topic ID → category map
    const topicCatMap = {};
    for (const t of topics) {
      topicCatMap[t.id] = t.category;
    }

    // Counts per category
    const catStats = {};
    for (const cat of ALL_CATEGORIES) {
      catStats[cat] = { topics: 0, articles_total: 0, articles_published: 0, articles_draft: 0 };
    }
    catStats['_uncategorised'] = { topics: 0, articles_total: 0, articles_published: 0, articles_draft: 0 };

    for (const t of topics) {
      const key = ALL_CATEGORIES.includes(t.category) ? t.category : '_uncategorised';
      catStats[key].topics++;
    }

    // Articles with a matching topic
    let nullTopicTotal     = 0;
    let nullTopicPublished = 0;

    for (const a of articles) {
      if (!a.topic_id) {
        nullTopicTotal++;
        if (a.status === 'published') nullTopicPublished++;
        continue;
      }
      const cat = topicCatMap[a.topic_id];
      const key = cat && ALL_CATEGORIES.includes(cat) ? cat : '_uncategorised';
      catStats[key].articles_total++;
      if (a.status === 'published') catStats[key].articles_published++;
      if (a.status === 'draft')     catStats[key].articles_draft++;
    }

    return NextResponse.json({
      summary: {
        total_topics:            topics.length,
        total_articles:          articles.length,
        articles_null_topic_id:  nullTopicTotal,
        published_null_topic_id: nullTopicPublished,
      },
      by_category: catStats,
    });
  } catch (err) {
    console.error('[diagnostics]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
