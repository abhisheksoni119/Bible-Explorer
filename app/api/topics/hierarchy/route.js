export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdmin.js';

// ── STEP 0 temporary instrumentation (production, remove after) ─────────────
const captures = [];
function jwtRole(v) {
  try {
    const pl = JSON.parse(Buffer.from(String(v).split('.')[1], 'base64url').toString('utf8'));
    return pl.role + '@' + pl.ref;
  } catch { return 'not-jwt'; }
}
function installCapture() {
  const orig = globalThis.fetch;
  globalThis.fetch = async function (input, init) {
    const res = await orig(input, init);
    try {
      const url = typeof input === 'string' ? input : input.url;
      if (String(url).includes('rest/v1')) {
        let rows = null, first2 = null;
        try {
          const body = await res.clone().json();
          if (Array.isArray(body)) { rows = body.length; first2 = body.slice(0, 2).map(r => r.name || r.id); }
        } catch {}
        const auth = init && init.headers ? (init.headers.Authorization || init.headers.authorization) : null;
        captures.push({ url: String(url).slice(0, 140), authRole: auth ? jwtRole(String(auth).replace('Bearer ', '')) : '(none)', status: res.status, rows, first2 });
      }
    } catch {}
    return res;
  };
}
// ────────────────────────────────────────────────────────────────────────────

async function fetchAllTopics() {
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

async function fetchPublishedCounts() {
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
  installCapture();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || null;

  const [{ data, error }, countMap] = await Promise.all([
    fetchAllTopics(),
    fetchPublishedCounts(),
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

  const singletonUrl = supabaseAdmin && supabaseAdmin.supabaseUrl ? supabaseAdmin.supabaseUrl : '(n/a)';

  return NextResponse.json({
    _step0: {
      fetchedTopics: all.length,
      outputNodes: hierarchy.length + orphanNodes.length,
      singletonUrlRef: String(singletonUrl).includes('supabase.co')
        ? String(singletonUrl).replace('https://', '').split('.')[0]
        : singletonUrl,
      capturedRequests: captures,
    },
    nodes: [...hierarchy, ...orphanNodes],
  });
}
