export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdminClient.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic_id = searchParams.get('topic_id');

    let query = supabase
      .from('content_ideas')
      .select('*')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (topic_id) query = query.eq('topic_id', topic_id);

    const { data, error } = await query;

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('column')) {
        return NextResponse.json({ error: 'content_ideas table needs setup. Run supabase-ideas-setup.sql in your Supabase SQL Editor.' }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
