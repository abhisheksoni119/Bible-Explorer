export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdminClient.js';

export async function GET() {
  const [
    { count: totalTopics },
    { count: totalArticles },
    { count: drafts },
    { count: published },
    { count: rejected },
  ] = await Promise.all([
    supabase.from('topics').select('*', { count: 'exact', head: true }),
    supabase.from('articles').select('*', { count: 'exact', head: true }),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  return NextResponse.json({ totalTopics, totalArticles, drafts, published, rejected });
}
// step0-rebuild-marker
