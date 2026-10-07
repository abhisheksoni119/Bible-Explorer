export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../../lib/supabaseAdmin.js';

function isSchemaError(msg = '') {
  return msg.includes('does not exist') || msg.includes('column') || msg.includes('schema cache');
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const allowed = ['is_pillar', 'article_created', 'name', 'category'];
    const filtered = {};
    for (const key of allowed) {
      if (key in updates) filtered[key] = updates[key];
    }

    if (!Object.keys(filtered).length) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    let { data, error } = await supabase
      .from('topics')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();

    // If a new column (is_pillar / article_created) doesn't exist, retry with only safe fields
    if (error && isSchemaError(error.message)) {
      console.warn('[topics PATCH] schema error — stripping new columns:', error.message);
      const safe = { ...filtered };
      delete safe.is_pillar;
      delete safe.article_created;

      if (!Object.keys(safe).length) {
        return NextResponse.json(
          { warning: 'Column not yet available in DB — run supabase-setup.sql to enable pillar tracking', id },
          { status: 202 }
        );
      }

      ({ data, error } = await supabase.from('topics').update(safe).eq('id', id).select().single());
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
