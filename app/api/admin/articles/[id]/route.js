export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../../lib/supabaseAdmin.js';
import { pingSitemaps } from '../../../../../lib/sitemapPing.js';

const OPTIONAL_COLS = ['meta_title', 'meta_description', 'keywords', 'related_slugs'];

function isSchemaError(msg = '') {
  return msg.includes('schema cache') || msg.includes('column') || msg.includes('does not exist');
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from('articles')
    .select('*, topics(name, category)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const allowed = ['title', 'slug', 'content', 'meta_title', 'meta_description', 'keywords', 'related_slugs', 'status', 'topic_id'];
    const updates = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    // If slug is changing, fetch the current slug to record a redirect
    let oldSlug = null;
    if (updates.slug) {
      const { data: current } = await supabase
        .from('articles')
        .select('slug')
        .eq('id', id)
        .single();
      if (current && current.slug !== updates.slug) {
        oldSlug = current.slug;
      }
    }

    let { data, error } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error && isSchemaError(error.message)) {
      console.warn('[articles PATCH] schema fallback — retrying without optional SEO columns');
      const safeUpdates = { ...updates };
      for (const k of OPTIONAL_COLS) delete safeUpdates[k];
      ({ data, error } = await supabase.from('articles').update(safeUpdates).eq('id', id).select().single());
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Ping sitemaps when an article is published (fire-and-forget)
    if (updates.status === 'published') {
      pingSitemaps().catch(() => {});
    }

    // Record slug redirect so old URLs don't 404
    if (oldSlug && updates.slug) {
      const { error: redirectErr } = await supabase
        .from('slug_redirects')
        .upsert({ old_slug: oldSlug, new_slug: updates.slug }, { onConflict: 'old_slug' });
      if (redirectErr) {
        console.warn('[articles PATCH] slug_redirects table not found or insert failed — create it with: CREATE TABLE slug_redirects (old_slug TEXT PRIMARY KEY, new_slug TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());', redirectErr.message);
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  // Use .select('id') so we can detect if RLS silently blocked the delete (0 rows returned = not deleted)
  const { data, error } = await supabase.from('articles').delete().eq('id', id).select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) {
    return NextResponse.json(
      { error: 'Delete was blocked — the database did not remove this article. Add SUPABASE_SERVICE_ROLE_KEY to your secrets to enable admin deletes.' },
      { status: 403 }
    );
  }
  return NextResponse.json({ success: true });
}
// step0-rebuild-marker
