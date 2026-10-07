export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Supports the env var name the user specified; falls back to the secret already set in Replit
const OPENROUTER_KEY = () =>
  process.env.OPENROUTER_API_KEY || process.env.Open_Router_API;

// Model — gpt-4.1-mini gives strong JSON output at low cost via OpenRouter
const MODEL = 'openai/gpt-4.1-mini';

// Sanitise an AI-produced slug to URL-safe lowercase-hyphens
function sanitiseSlug(raw = '') {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Call OpenRouter and return parsed JSON content
async function callOpenRouter(messages) {
  const apiKey = OPENROUTER_KEY();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${apiKey}`,
      'Content-Type':   'application/json',
      'HTTP-Referer':   'https://bibleverseinsights.com',
      'X-Title':        'Bible Verse Insights',
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
    const { topic, keywords } = body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    // ── 1. Resolve topic record & all existing questions in one round-trip ──
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
        select: { slug: true, title: true, topicId: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    const existingSlugs = new Set(allQuestions.map((q) => q.slug));

    const sameTopicQs = topicRecord
      ? allQuestions.filter((q) => q.topicId === topicRecord.id)
      : [];

    const otherQs = topicRecord
      ? allQuestions.filter((q) => q.topicId !== topicRecord.id)
      : allQuestions;

    const keywordsStr = Array.isArray(keywords)
      ? keywords.join(', ')
      : typeof keywords === 'string'
      ? keywords
      : '';

    // ── 2. Build the generation prompt ──────────────────────────────────────
    const userPrompt = `You are an expert biblical content writer creating SEO-optimized articles for a Bible study website.

TOPIC: ${topicRecord?.name ?? topic.trim()}
FOCUS KEYWORDS: ${keywordsStr || '(derive from topic)'}

EXISTING QUESTIONS IN THIS TOPIC — do NOT duplicate these:
${sameTopicQs.length ? sameTopicQs.map((q) => `  - ${q.slug}: ${q.title}`).join('\n') : '  (none yet)'}

OTHER EXISTING QUESTIONS — pick 2–3 slugs from this list for relatedSlugs:
${otherQs.length ? otherQs.map((q) => `  - ${q.slug}: ${q.title}`).join('\n') : '  (none yet)'}

Generate ONE comprehensive, theologically sound, SEO-optimized Bible question article. Return ONLY a JSON object with these exact fields:

{
  "title":           "A clear question title (e.g. 'What does the Bible say about forgiveness?')",
  "slug":            "url-friendly-slug-derived-from-title",
  "metaTitle":       "SEO title under 60 characters, keyword-rich",
  "metaDescription": "Compelling 140–155 character meta description including the primary keyword",
  "summary":         "2–3 sentence article summary for internal use",
  "keywords":        ["3–5 target keyword strings"],
  "relatedSlugs":    ["2–3 slugs chosen from the OTHER EXISTING QUESTIONS list"],
  "contentHtml":     "<p>Full article HTML, 500–700 words, 3–5 Bible verse citations in Book Chapter:Verse format</p>"
}

RULES:
- contentHtml uses only <p>, <ul>, <li>, <strong> tags
- Cite Bible verses as: BookName Chapter:Verse (e.g. John 3:16, Romans 8:28–29)
- relatedSlugs must come ONLY from the OTHER EXISTING QUESTIONS list above
- slug must be lowercase, hyphens only, no leading digit
- Doctrinal stance: evangelical, biblically faithful
- Return ONLY the JSON object — no markdown fences, no commentary`;

    // ── 3. Call OpenRouter ───────────────────────────────────────────────────
    const raw = await callOpenRouter([
      {
        role:    'system',
        content: 'You are a biblical content expert. Always respond with a valid JSON object only — no markdown, no extra text.',
      },
      { role: 'user', content: userPrompt },
    ]);

    let generated;
    try {
      generated = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON', raw },
        { status: 500 }
      );
    }

    // ── 4. Validate required fields ─────────────────────────────────────────
    const REQUIRED = ['title', 'slug', 'metaTitle', 'metaDescription', 'summary', 'keywords', 'relatedSlugs', 'contentHtml'];
    const missing = REQUIRED.filter((f) => !generated[f]);
    if (missing.length) {
      return NextResponse.json(
        { error: `AI response missing fields: ${missing.join(', ')}`, generated },
        { status: 422 }
      );
    }

    // ── 5. Sanitise & de-duplicate slug ─────────────────────────────────────
    const slug = sanitiseSlug(generated.slug);
    if (!slug) {
      return NextResponse.json({ error: 'Generated slug is empty after sanitisation' }, { status: 422 });
    }
    if (existingSlugs.has(slug)) {
      return NextResponse.json(
        { error: `Slug already exists: "${slug}" — regenerate or choose a different angle`, slug },
        { status: 409 }
      );
    }

    // ── 6. Validate relatedSlugs — keep only slugs that exist ───────────────
    const validRelatedSlugs = (generated.relatedSlugs ?? []).filter(
      (s) => typeof s === 'string' && existingSlugs.has(s)
    );

    // ── 7. Return preview (not yet saved) ───────────────────────────────────
    return NextResponse.json({
      title:           generated.title,
      slug,
      metaTitle:       generated.metaTitle,
      metaDescription: generated.metaDescription,
      summary:         generated.summary,
      keywords:        Array.isArray(generated.keywords) ? generated.keywords : [],
      relatedSlugs:    validRelatedSlugs,
      contentHtml:     generated.contentHtml,
      topicId:         topicRecord?.id ?? null,
      topicName:       topicRecord?.name ?? null,
      topicSlug:       topicRecord?.slug ?? null,
    });
  } catch (err) {
    console.error('[generate-question]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
