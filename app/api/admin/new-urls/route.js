export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdmin.js';

function isSchemaError(msg = '') {
  return msg.includes('schema cache') || msg.includes('column') || msg.includes('does not exist');
}

function buildUrl(appUrl, slug, category) {
  switch (category) {
    case 'questions':        return `${appUrl}/questions/${slug}/`;
    case 'topics':           return `${appUrl}/topics/${slug}/`;
    case 'guides':           return `${appUrl}/guides/${slug}/`;
    case 'bible-characters': return `${appUrl}/bible-characters/${slug}/`;
    case 'bible-verses':
      return `${appUrl}/bible-verses/${slug}/`;
    default:
      return `${appUrl}/${slug}/`;
  }
}

export async function GET(request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all';
  // `state` controls the exported-column filter:
  //   - 'new' (default): only un-exported URLs — same behavior as before.
  //   - 'all'           : full history including already-exported URLs.
  // Anything else falls back to 'new' so the previous default never breaks.
  const state = searchParams.get('state') === 'all' ? 'all' : 'new';

  let query = supabase
    .from('articles')
    .select('title, slug, created_at, exported, topics(category)')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (state === 'new') {
    query = query.eq('exported', false);
  }

  if (filter === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    query = query.gte('created_at', start.toISOString());
  } else if (filter === '3days') {
    const start = new Date();
    start.setDate(start.getDate() - 3);
    start.setHours(0, 0, 0, 0);
    query = query.gte('created_at', start.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    if (isSchemaError(error.message)) {
      return NextResponse.json({ missingColumn: true, data: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://bibleverseinsights.com').replace(/\/$/, '');

  const rows = (data || []).map(row => {
    const category = row.topics?.category || null;
    return {
      title: row.title,
      slug: row.slug,
      url: buildUrl(appUrl, row.slug, category),
      created_at: row.created_at,
      exported: !!row.exported,
    };
  });

  return NextResponse.json({ data: rows, count: rows.length, state });
}
// step0-rebuild-marker
