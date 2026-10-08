export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// STEP 0: URL pinned to the verified production project (public URL, not a
// secret). The runtime NEXT_PUBLIC_SUPABASE_URL on this deployment still
// resolves to a stale legacy database for server routes — see reconciliation.
const SUPABASE_URL = 'https://ynftzpgjsnoyjovotpua.supabase.co';

function getClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}

async function fetchAllTopics() {
  const supabase = getClient();
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const batchSize = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('topics')
      .select('id, name, category, parent_id, is_pillar')
      .order('name')
      .range(from, from + batchSize - 1);
    if (error) return { data: null, error };
    all = all.concat(data || []);
    if (!data || data.length < batchSize) break;
    from += batchSize;
  }
  return { data: all, error: null };
}

async function fetchPublishedCounts(supabase) {
  const batchSize = 5000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('articles')
      .select('topic_id')
      .eq('status', 'published')
      .not('topic_id', 'is', null)
      .range(from, from + batchSize - 1);
    if (error) break;
    all = all.concat(data || []);
    if (!data || data.length < batchSize) break;
    from += batchSize;
  }
  // Build topic_id → count map
  const countMap = {};
  for (const row of all) {
    countMap[row.topic_id] = (countMap[row.topic_id] || 0) + 1;
  }
  return countMap;
}

function buildNode(topic, countMap) {
  const count = countMap[topic.id] || 0;
  return {
    id:            topic.id,
    name:          topic.name,
    category:      topic.category,
    is_pillar:     topic.is_pillar,
    is_created:    count > 0,
    article_count: count,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || null;

  const [{ data, error }, countMap] = await Promise.all([
    fetchAllTopics(getClient()),
    fetchPublishedCounts(getClient()),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all      = data || [];
  const filtered = category ? all.filter(t => t.category === category) : all;

  const parents  = filtered.filter(t => !t.parent_id).sort((a, b) => a.name.localeCompare(b.name));
  const children = filtered.filter(t =>  t.parent_id);

  const childMap = {};
  for (const c of children) {
    if (!childMap[c.parent_id]) childMap[c.parent_id] = [];
    childMap[c.parent_id].push(buildNode(c, countMap));
  }
  for (const id of Object.keys(childMap)) {
    childMap[id].sort((a, b) => a.name.localeCompare(b.name));
  }

  const hierarchy = parents.map(p => ({
    ...buildNode(p, countMap),
    children: childMap[p.id] || [],
  }));

  const orphans = children.filter(c => !filtered.find(p => p.id === c.parent_id));
  const orphanNodes = orphans.map(o => ({
    ...buildNode(o, countMap),
    children: [],
    _orphan:  true,
  }));

  return NextResponse.json([...hierarchy, ...orphanNodes]);
}
