export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdminClient.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_KEY = () => process.env.OPENROUTER_API_KEY || process.env.Open_Router_API;
const MODEL = 'openai/gpt-4.1-mini';

export async function POST(request) {
  try {
    const { topic_id, topic_name, category } = await request.json();

    if (!topic_name?.trim()) {
      return NextResponse.json({ error: 'topic_name is required' }, { status: 400 });
    }

    const apiKey = OPENROUTER_KEY();
    if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY is not set' }, { status: 500 });

    const prompt = `Generate 10 SEO-optimized Christian article titles for the topic "${topic_name.trim()}" in category "${category || 'general'}".

Include:
- problem-solving titles (e.g. "How to overcome X biblically")
- emotional / relatable titles (e.g. "When you feel X, the Bible says...")
- long-tail keyword titles (e.g. "Bible verses about X and Y")

Avoid generic, vague, or duplicate titles.

Return ONLY a JSON object in this exact format:
{
  "ideas": [
    "Title one here",
    "Title two here",
    "Title three here",
    "Title four here",
    "Title five here",
    "Title six here",
    "Title seven here",
    "Title eight here",
    "Title nine here",
    "Title ten here"
  ]
}`;

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bibleverseinsights.com',
        'X-Title':      'Bible Verse Insights',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a Christian content strategist. Respond with valid JSON only.' },
          { role: 'user',   content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `OpenRouter ${res.status}: ${text}` }, { status: 500 });
    }

    const aiData  = await res.json();
    const content = aiData.choices?.[0]?.message?.content ?? '';
    if (!content) return NextResponse.json({ error: 'AI returned empty response' }, { status: 500 });

    let parsed;
    try { parsed = JSON.parse(content); }
    catch { return NextResponse.json({ error: 'AI returned invalid JSON', raw: content }, { status: 500 }); }

    const ideas = Array.isArray(parsed.ideas) ? parsed.ideas.filter(Boolean) : [];
    if (!ideas.length) return NextResponse.json({ error: 'No ideas generated' }, { status: 500 });

    const rows = ideas.map(title => ({
      title:    title.trim(),
      topic_id: topic_id || null,
      category: category || null,
      used:     false,
    }));

    const { data: saved, error: insertError } = await supabase
      .from('content_ideas')
      .upsert(rows, { onConflict: 'topic_id,title', ignoreDuplicates: true })
      .select();

    if (insertError) {
      console.error('[generate-ideas] insert error:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ideas: saved || [], count: (saved || []).length });
  } catch (err) {
    console.error('[generate-ideas]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
