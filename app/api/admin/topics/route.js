export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdminClient.js';
import { CATEGORY_VALUES } from '../../../../lib/categories.js';

function isSchemaError(msg = '') {
  return msg.includes('does not exist') || msg.includes('column') || msg.includes('schema cache');
}

// Supabase returns at most 1000 rows per request — paginate to get everything
async function fetchAllTopics() {
  const batchSize = 1000;
  let all = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .order('category')
      .order('name')
      .range(from, from + batchSize - 1);

    if (error) return { data: null, error };
    all = all.concat(data || []);
    if (!data || data.length < batchSize) break;
    from += batchSize;
  }

  return { data: all, error: null };
}

// Paginate through ALL articles' (topic_id, language, status) — used to compute
// real-time creation status per topic per language so the UI never lies.
async function fetchArticleIndex() {
  const batchSize = 1000;
  let from = 0;
  // Map<topic_id, { langs: Set<string>, hasPublished: boolean, publishedLangs: Set<string> }>
  const idx = new Map();

  while (true) {
    const { data, error } = await supabase
      .from('articles')
      .select('topic_id, language, status')
      .not('topic_id', 'is', null)
      .range(from, from + batchSize - 1);
    if (error || !data?.length) break;

    for (const r of data) {
      if (!r.topic_id) continue;
      const lang = (r.language || 'en').toLowerCase();
      if (!idx.has(r.topic_id)) {
        idx.set(r.topic_id, { langs: new Set(), publishedLangs: new Set() });
      }
      const entry = idx.get(r.topic_id);
      entry.langs.add(lang);
      if (r.status === 'published') entry.publishedLangs.add(lang);
    }

    if (data.length < batchSize) break;
    from += batchSize;
  }
  return idx;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  // Optional: ?language=en — when present, article_created reflects ONLY that language
  const langFilter = (searchParams.get('language') || '').toLowerCase().trim();

  const [{ data, error }, articleIdx] = await Promise.all([
    fetchAllTopics(),
    fetchArticleIndex(),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Decorate each topic with real-time, language-aware creation status
  const decorated = (data || []).map(t => {
    const entry = articleIdx.get(t.id);
    const allLangs       = entry ? [...entry.langs] : [];
    const publishedLangs = entry ? [...entry.publishedLangs] : [];

    // article_created semantics:
    //   - if ?language=xx is passed → true ONLY when published in that language
    //   - otherwise → true when published in ANY language (matches old global behavior)
    const article_created = langFilter
      ? publishedLangs.includes(langFilter)
      : publishedLangs.length > 0;

    return {
      ...t,
      article_created,                 // real-time, never stale
      created_languages: allLangs,     // every language with any article (draft or published)
      published_languages: publishedLangs, // languages with a PUBLISHED article
    };
  });

  // Sort: pillar-first within each category (is_pillar may be undefined if column absent)
  const sorted = decorated.sort((a, b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    const ap = a.is_pillar ? 1 : 0;
    const bp = b.is_pillar ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(sorted);
}

export async function POST(request) {
  try {
    const { name, category, is_pillar = false, parent_id = null } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!CATEGORY_VALUES.includes(category)) {
      return NextResponse.json({ error: `category must be one of: ${CATEGORY_VALUES.join(', ')}` }, { status: 400 });
    }

    const row = { name: name.trim(), category, is_pillar: !!is_pillar };
    if (parent_id) row.parent_id = parent_id;

    // Try with is_pillar first; fall back to without it if column doesn't exist
    let { data, error } = await supabase
      .from('topics')
      .insert(row)
      .select()
      .single();

    if (error && isSchemaError(error.message)) {
      console.warn('[topics POST] is_pillar column absent — retrying without it');
      const fallbackRow = { name: name.trim(), category };
      if (parent_id) fallbackRow.parent_id = parent_id;
      ({ data, error } = await supabase
        .from('topics')
        .insert(fallbackRow)
        .select()
        .single());
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
