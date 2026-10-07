export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_KEY = () =>
  process.env.OPENROUTER_API_KEY || process.env.Open_Router_API;

const MODEL = 'openai/gpt-4.1-mini';

async function callOpenRouter(messages) {
  const apiKey = OPENROUTER_KEY();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://bibleverseinsights.com',
      'X-Title':      'Bible Verse Insights',
    },
    body: JSON.stringify({
      model:           MODEL,
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('OpenRouter returned empty content');
  return content;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { topic, count = 3 } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const safeCount = Math.min(Math.max(parseInt(count, 10) || 3, 1), 5);

    // Fetch all existing question titles to avoid duplication
    const [topicRecord, allQuestions] = await Promise.all([
      prisma.topic.findFirst({
        where: {
          OR: [
            { name: { equals: topic.trim(), mode: 'insensitive' } },
            { slug: topic.trim().toLowerCase().replace(/\s+/g, '-') },
          ],
        },
      }),
      prisma.question.findMany({
        select: { title: true, slug: true, topicId: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    const sameTopicTitles = topicRecord
      ? allQuestions
          .filter((q) => q.topicId === topicRecord.id)
          .map((q) => `  - ${q.title}`)
          .join('\n')
      : '  (none yet)';

    const prompt = `You are a biblical content strategist for a Bible study website.

TOPIC: ${topicRecord?.name ?? topic.trim()}

EXISTING ARTICLES IN THIS TOPIC (do NOT duplicate or overlap):
${sameTopicTitles || '  (none yet)'}

Generate exactly ${safeCount} distinct, non-overlapping question ideas for new Bible study articles on this topic.
Each idea should target a different search intent or angle.

Return ONLY this JSON:
{
  "ideas": [
    { "title": "Question title as a natural search query?", "keywords": ["keyword1", "keyword2", "keyword3"] },
    ...
  ]
}

RULES:
- Titles must be complete questions (start with What/How/Why/Who/Can/Does/Is)
- Each title targets a unique search intent
- 3 keywords per idea, matching real search queries
- Evangelical, biblically faithful stance
- Return ONLY the JSON — no markdown, no commentary`;

    const raw = await callOpenRouter([
      {
        role:    'system',
        content: 'You are a biblical content strategist. Respond with valid JSON only.',
      },
      { role: 'user', content: prompt },
    ]);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw }, { status: 500 });
    }

    const ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
    if (!ideas.length) {
      return NextResponse.json({ error: 'No ideas returned by AI', raw }, { status: 422 });
    }

    return NextResponse.json({
      topic:     topicRecord?.name ?? topic.trim(),
      topicId:   topicRecord?.id ?? null,
      topicSlug: topicRecord?.slug ?? null,
      ideas:     ideas.slice(0, safeCount).map((idea) => ({
        title:    idea.title ?? '',
        keywords: Array.isArray(idea.keywords) ? idea.keywords : [],
      })),
    });
  } catch (err) {
    console.error('[generate-ideas]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
