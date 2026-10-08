export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdminClient.js';
import { callOpenRouter } from '../../../../lib/generator.js';

export async function POST(request) {
  try {
    const { article_id } = await request.json();
    if (!article_id) return NextResponse.json({ error: 'article_id is required' }, { status: 400 });

    const [{ data: article }, { data: topics }] = await Promise.all([
      supabase.from('articles').select('id, title, content, topic_id').eq('id', article_id).single(),
      supabase.from('topics').select('*').order('name'),
    ]);

    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    if (!topics?.length) return NextResponse.json({ error: 'No topics found' }, { status: 404 });

    const contentSnippet = (article.content || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 800);

    // is_pillar may be absent from DB — treat undefined as false
    const topicList = topics.map(t =>
      `- id: ${t.id} | name: ${t.name} | category: ${t.category}${t.is_pillar ? ' [ALREADY PILLAR]' : ''}`
    ).join('\n');

    const prompt = `You are a Bible content strategist. Given an article, identify which topic from the database would best serve as its "pillar topic" — the broad, authoritative topic this article supports.

Article Title: "${article.title}"
Article Content (excerpt): "${contentSnippet}"

Available topics:
${topicList}

Instructions:
1. Pick the SINGLE best pillar topic from the list above that this article directly supports
2. Prefer broad, foundational topics (e.g. "Faith", "Prayer", "David") over narrow ones
3. If the article's current topic is clearly the best pillar, suggest that one
4. Return ONLY this JSON — no markdown, no explanation outside the JSON:
{
  "topic_id": "exact-uuid-from-list",
  "topic_name": "exact name from list",
  "reason": "One sentence explaining why this is the best pillar topic"
}`;

    const raw = await callOpenRouter([
      { role: 'system', content: 'You are a Bible content strategist. You always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    let suggestion;
    try { suggestion = JSON.parse(raw); }
    catch { return NextResponse.json({ error: 'AI returned invalid JSON', raw }, { status: 500 }); }

    const matchedTopic = topics.find(t => t.id === suggestion.topic_id || t.name === suggestion.topic_name);
    if (!matchedTopic) {
      return NextResponse.json({ error: 'AI suggested a topic not in the database', raw: suggestion }, { status: 422 });
    }

    return NextResponse.json({
      topic_id:   matchedTopic.id,
      topic_name: matchedTopic.name,
      category:   matchedTopic.category,
      is_pillar:  matchedTopic.is_pillar || false,
      reason:     suggestion.reason,
    });
  } catch (err) {
    console.error('[suggest-pillar]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
