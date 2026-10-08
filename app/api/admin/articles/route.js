export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdminClient.js';
import { sanitizeForPg } from '../../../../lib/sanitizeForPg.js';

const OPTIONAL_COLS = ['meta_title', 'meta_description', 'keywords', 'related_slugs'];

function isSchemaError(msg = '') {
  return msg.includes('schema cache') || msg.includes('column') || msg.includes('does not exist');
}

function stripOptional(obj) {
  const copy = { ...obj };
  for (const k of OPTIONAL_COLS) delete copy[k];
  return copy;
}

async function buildArticlesQuery(status, category, topicId, limit) {
  // Resolve topic IDs for category filter upfront
  let topicIds = null;
  if (category) {
    const { data: topicRows } = await supabase
      .from('topics')
      .select('id')
      .eq('category', category);
    topicIds = (topicRows || []).map(t => t.id);
    if (!topicIds.length) return { data: [], error: null };
  }

  // Try with is_pillar in join; fall back to without it if column absent
  for (const joinSelect of ['*, topics(name, category, is_pillar)', '*, topics(name, category)']) {
    let q = supabase
      .from('articles')
      .select(joinSelect)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status)   q = q.eq('status', status);
    if (topicId)  q = q.eq('topic_id', topicId);
    else if (topicIds) q = q.in('topic_id', topicIds);

    const { data, error } = await q;

    if (!error) return { data: data || [], error: null };
    if (!isSchemaError(error.message)) return { data: null, error };
    console.warn('[articles GET] is_pillar absent — retrying without it');
  }

  return { data: [], error: null };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status   = searchParams.get('status')   || '';
  const category = searchParams.get('category') || '';
  const topicId  = searchParams.get('topic_id') || '';
  const limit    = parseInt(searchParams.get('limit') || '200', 10);

  const { data, error } = await buildArticlesQuery(status, category, topicId, limit);

  if (error) {
    console.error('[articles GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title, slug, content, meta_title, meta_description,
      keywords, related_slugs, topic_id, status = 'draft',
      author_name, author_slug,
      language: rawLang,
      // _meta is a client-only hint from the generate route — never insert into DB
      _meta: _ignoredMeta,
      ...rest
    } = body;

    const language = (rawLang || 'en').toString().toLowerCase().trim();

    if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!slug?.trim())  return NextResponse.json({ error: 'slug is required' },  { status: 400 });

    // THE ONE RULE: PUBLISHED is sacred. Anything else is auto-replaced.
    // 1) Topic check
    if (topic_id) {
      const { data: existing } = await supabase
        .from('articles')
        .select('id, title, slug, status, language, topics(category)')
        .eq('topic_id', topic_id)
        .limit(1);
      const e = existing?.[0];
      if (e) {
        if (e.status === 'published') {
          return NextResponse.json(
            {
              error: `A PUBLISHED article already exists for this topic ("${e.title}"). Cannot recreate live content.`,
              code: 'PUBLISHED_ARTICLE_EXISTS',
              existingArticle: {
                id: e.id, title: e.title, slug: e.slug, status: e.status,
                language: e.language, category: e.topics?.category || null,
              },
            },
            { status: 409 }
          );
        }
        // Auto-delete the existing draft/rejected so the new save proceeds.
        await supabase.from('articles').delete().eq('id', e.id).neq('status', 'published');
      }
    }

    // 2) Slug check (covers slugs that aren't tied to topic_id)
    {
      const { data: slugRow } = await supabase
        .from('articles')
        .select('id, title, slug, status, language, topics(category)')
        .eq('slug', slug.trim())
        .limit(1);
      const s = slugRow?.[0];
      if (s) {
        if (s.status === 'published') {
          return NextResponse.json(
            {
              error: `Slug "${s.slug}" is already used by a PUBLISHED article. Cannot recreate live content.`,
              code: 'PUBLISHED_SLUG_EXISTS',
              existingArticle: {
                id: s.id, title: s.title, slug: s.slug, status: s.status,
                language: s.language, category: s.topics?.category || null,
              },
            },
            { status: 409 }
          );
        }
        await supabase.from('articles').delete().eq('id', s.id).neq('status', 'published');
      }
    }

    // Strip NUL bytes / lone surrogates / unprintable control chars that
    // PostgreSQL rejects with "unsupported Unicode escape sequence". The AI
    // occasionally emits these inside HTML content or keyword strings.
    const insertData = sanitizeForPg({
      title:            title.trim(),
      slug:             slug.trim(),
      content:          content          || null,
      meta_title:       meta_title       || null,
      meta_description: meta_description || null,
      keywords:         Array.isArray(keywords)      ? keywords      : [],
      related_slugs:    Array.isArray(related_slugs) ? related_slugs : [],
      topic_id:         topic_id || null,
      author_name:      author_name || 'BVI Team',
      author_slug:      author_slug || 'bvi-team',
      language,
      status,
    });

    // Try insert — fall back on schema errors by removing optional columns
    let { data, error } = await supabase
      .from('articles')
      .insert(insertData)
      .select('*, topics(name, category, is_pillar)')
      .single();

    if (error && isSchemaError(error.message)) {
      console.warn('[articles POST] schema fallback pass 1 — retrying with topics(name, category)');
      ({ data, error } = await supabase
        .from('articles')
        .insert(insertData)
        .select('*, topics(name, category)')
        .single());
    }

    if (error && isSchemaError(error.message)) {
      console.warn('[articles POST] schema fallback pass 2 — removing optional SEO columns');
      const safe = stripOptional(insertData);
      ({ data, error } = await supabase
        .from('articles')
        .insert(safe)
        .select('*, topics(name, category)')
        .single());
    }

    if (error) {
      if (error.code === '23505') {
        // After the auto-delete pass above, a 23505 here can only mean a
        // PUBLISHED article won the race — surface that loudly to the UI.
        const constraint = (error.constraint || error.details || '').toString();
        const isTopicConflict = constraint.includes('unique_topic_article') || constraint.includes('topic_id');

        const lookupQuery = supabase
          .from('articles')
          .select('id, title, slug, status, language, topics(category)')
          .limit(1);
        const { data: conflictRows } = isTopicConflict && topic_id
          ? await lookupQuery.eq('topic_id', topic_id)
          : await lookupQuery.eq('slug', slug);
        const existing = conflictRows?.[0]
          ? {
              id:       conflictRows[0].id,
              title:    conflictRows[0].title,
              slug:     conflictRows[0].slug,
              status:   conflictRows[0].status,
              language: conflictRows[0].language,
              category: conflictRows[0].topics?.category || null,
            }
          : null;

        if (isTopicConflict) {
          return NextResponse.json(
            {
              error: `A PUBLISHED article already exists for this topic. Cannot recreate live content.`,
              code: 'PUBLISHED_ARTICLE_EXISTS',
              existingArticle: existing,
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            error: `Slug "${slug}" is already used by a PUBLISHED article. Cannot recreate live content.`,
            code: 'PUBLISHED_SLUG_EXISTS',
            existingArticle: existing,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark topic as article_created = true — fire-and-forget; silently skip if column absent
    if (topic_id) {
      supabase
        .from('topics')
        .update({ article_created: true })
        .eq('id', topic_id)
        .then(({ error: upErr }) => {
          if (upErr && !isSchemaError(upErr.message)) {
            console.warn('[articles POST] article_created update failed:', upErr.message);
          }
        });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
