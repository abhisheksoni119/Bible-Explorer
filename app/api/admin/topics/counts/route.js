export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../../lib/supabaseAdmin.js';

// PostgREST caps single responses at 1000 rows — must paginate.
async function fetchAllPaginated(table, select) {
  const batchSize = 1000;
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + batchSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return all;
}

// GET /api/admin/topics/counts
// Simple per-category breakdown:
//   { categories: { questions: { total, published, missing } }, uncategorized, totals }
//
// "missing" = topics whose live state is NOT published (no article OR draft).
// Generation is blocked ONLY by published articles — drafts are auto-replaced
// when the user runs generation again.
export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
  }

  try {
    const [topics, articles] = await Promise.all([
      fetchAllPaginated('topics', 'id, category'),
      fetchAllPaginated('articles', 'topic_id, status'),
    ]);

    // Set of topic_ids that have a PUBLISHED article — these are the only
    // ones considered "done". Anything else (draft / rejected / no article)
    // is "missing" from the user's perspective.
    const publishedTopicIds = new Set(
      articles.filter(a => a.status === 'published').map(a => a.topic_id).filter(Boolean)
    );

    const KNOWN_CATEGORIES = ['questions', 'topics', 'guides', 'bible-verses', 'bible-characters'];
    const categories = Object.fromEntries(
      KNOWN_CATEGORIES.map(c => [c, { total: 0, published: 0, missing: 0 }])
    );
    let uncategorized = 0;

    for (const t of topics) {
      if (!t.category) { uncategorized++; continue; }
      if (!categories[t.category]) categories[t.category] = { total: 0, published: 0, missing: 0 };
      const bucket = categories[t.category];
      bucket.total++;
      if (publishedTopicIds.has(t.id)) bucket.published++;
      else                              bucket.missing++;
    }

    return NextResponse.json({
      categories,
      uncategorized,
      totals: {
        topics:    topics.length,
        articles:  articles.length,
        published: publishedTopicIds.size,
      },
    });
  } catch (err) {
    console.error('[topics/counts]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
