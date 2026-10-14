export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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
    global: { fetch: (input, init) => {
      const headers = new Headers(init && init.headers);
      headers.set('x-step0-nocache', String(Date.now()));
      return fetch(input, { ...init, cache: 'no-store', headers });
    } },
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

  // ── Recursive tree construction (any depth) ──────────────────────────────
  // The previous two-level builder silently dropped every topic below depth 2
  // (grandchildren and deeper), which is why the admin showed only the
  // parentless roots. Attach children recursively with a visited-set guard
  // so a corrupted parent cycle can never cause infinite recursion.
  const byParent = new Map();
  for (const t of filtered) {
    if (!t.parent_id) continue;
    if (!byParent.has(t.parent_id)) byParent.set(t.parent_id, []);
    byParent.get(t.parent_id).push(t);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  const idSet = new Set(filtered.map(t => t.id));

  function attach(t, branchVisited) {
    const kids = (byParent.get(t.id) || [])
      .filter(k => !branchVisited.has(k.id)) // cycle guard
      .map(k => attach(k, new Set([...branchVisited, k.id])));
    return { ...buildNode(t, countMap), children: kids };
  }

  // Roots = parentless topics, plus orphans whose parent is missing from the
  // filtered set (rendered at top level, flagged) — preserves old behavior.
  const roots = filtered
    .filter(t => !t.parent_id || !idSet.has(t.parent_id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const tree = roots.map(t => {
    const node = attach(t, new Set([t.id]));
    if (t.parent_id && !idSet.has(t.parent_id)) node._orphan = true;
    return node;
  });

  return NextResponse.json(tree);
}
