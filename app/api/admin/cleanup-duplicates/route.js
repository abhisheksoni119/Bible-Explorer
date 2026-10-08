export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdminClient.js';

const STATUS_RANK = { published: 0, draft: 1, rejected: 2 };

export async function POST() {
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  try {
    // Fetch all articles with topic_id in batches
    let all = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, status, topic_id, created_at')
        .not('topic_id', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, from + 999);
      if (error || !data?.length) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }

    // Group by topic_id
    const byTopic = {};
    for (const a of all) {
      if (!byTopic[a.topic_id]) byTopic[a.topic_id] = [];
      byTopic[a.topic_id].push(a);
    }

    // Collect IDs to delete — NEVER delete published articles
    const toDelete = [];
    for (const [, arts] of Object.entries(byTopic)) {
      if (arts.length <= 1) continue;
      arts.sort((a, b) => {
        const sr = (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
        if (sr !== 0) return sr;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      for (const dup of arts.slice(1)) {
        if (dup.status !== 'published') toDelete.push(dup.id);
      }
    }

    if (!toDelete.length) {
      return NextResponse.json({ scanned: all.length, duplicatesFound: 0, deleted: 0, errors: [] });
    }

    // Delete in batches of 100
    let deleted = 0;
    const errors = [];
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      const { data: deletedRows, error } = await supabase
        .from('articles').delete().in('id', batch).select('id');
      if (error) {
        errors.push(error.message);
      } else {
        deleted += deletedRows?.length ?? 0;
      }
    }

    const blocked = toDelete.length - deleted - errors.length;

    return NextResponse.json({
      scanned: all.length,
      duplicatesFound: toDelete.length,
      deleted,
      blocked: blocked > 0 ? blocked : 0,
      errors,
      note: blocked > 0
        ? 'Some deletes were silently blocked by RLS. Add SUPABASE_SERVICE_ROLE_KEY to your secrets to enable full cleanup.'
        : undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
