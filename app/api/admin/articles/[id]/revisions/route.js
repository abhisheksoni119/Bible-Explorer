export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../../lib/supabaseAdminClient.js';

// Article revisions — rollback support for AI/content edits.
// Graceful by design: if the article_revisions table has not been created
// yet (see docs/migrations/001_article_revisions.sql), every response is
// { available: false } and the UI hides the feature. Nothing breaks.

function unavailable(reason) {
  return NextResponse.json({ available: false, reason }, { status: 200 });
}

export async function GET(request, { params }) {
  if (!supabase) return unavailable('Supabase not configured');
  const { id } = await params;

  try {
    const { data, error } = await supabase
      .from('article_revisions')
      .select('id, content, meta_title, meta_description, source, created_at')
      .eq('article_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      if (/does not exist|schema cache/i.test(error.message)) {
        return unavailable('revisions table not created yet');
      }
      return unavailable(error.message);
    }

    const rows = (data || []).map(r => ({
      id: r.id,
      source: r.source,
      created_at: r.created_at,
      words: (String(r.content || '').match(/[A-Za-z']+/g) || []).length,
      content: r.content,
      meta_title: r.meta_title,
      meta_description: r.meta_description,
    }));

    return NextResponse.json({ available: true, revisions: rows });
  } catch (e) {
    return unavailable(e.message);
  }
}

export async function POST(request, { params }) {
  if (!supabase) return unavailable('Supabase not configured');
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const content = typeof body.content === 'string' ? body.content : '';
    if (!content.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const { error } = await supabase.from('article_revisions').insert({
      article_id: id,
      content,
      meta_title: body.meta_title || null,
      meta_description: body.meta_description || null,
      source: String(body.source || 'manual').slice(0, 40),
    });

    if (error) {
      if (/does not exist|schema cache/i.test(error.message)) {
        return unavailable('revisions table not created yet');
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ available: true, stored: true });
  } catch (e) {
    return unavailable(e.message);
  }
}
