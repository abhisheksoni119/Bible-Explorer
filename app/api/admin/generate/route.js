export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdminClient.js';
import { sanitiseSlug, getPrompt, buildTitleHint, callOpenRouter, enforceArticleMeta, candidateSlugs } from '../../../../lib/generator.js';
import { enrichContent } from '../../../../lib/seoEnrich.js';
import { sanitizeForPg } from '../../../../lib/sanitizeForPg.js';

const AUTHOR_NAME = 'BVI Team';
const AUTHOR_SLUG = 'bvi-team';

// THE ONE RULE:
//   PUBLISHED articles are sacred — never touched, never overwritten.
//   Anything else (draft / rejected) is auto-deleted before generation.

// Returns the single article (if any) currently attached to this topic.
// The DB UNIQUE(topic_id) constraint guarantees at most one row.
async function getExistingArticleForTopic(topicId) {
  if (!topicId) return null;
  const { data } = await supabase
    .from('articles')
    .select('id, title, slug, status, language, topics(category)')
    .eq('topic_id', topicId)
    .limit(1);
  if (!data?.length) return null;
  const a = data[0];
  return {
    id: a.id, title: a.title, slug: a.slug, status: a.status, language: a.language,
    category: a.topics?.category || null,
  };
}

// Owner of a given slug, or null. Same shape as above.
async function getArticleBySlug(slug) {
  if (!slug) return null;
  const { data } = await supabase
    .from('articles')
    .select('id, title, slug, status, language, topics(category)')
    .eq('slug', slug)
    .limit(1);
  if (!data?.length) return null;
  const a = data[0];
  return {
    id: a.id, title: a.title, slug: a.slug, status: a.status, language: a.language,
    category: a.topics?.category || null,
  };
}

// Defense-in-depth: only deletes if the row is NOT published. The .neq()
// makes it impossible for a stale snapshot to delete live content.
async function deleteNonPublishedArticle(id) {
  if (!id) return;
  await supabase.from('articles').delete().eq('id', id).neq('status', 'published');
}

// Returns a 409 NextResponse for a published collision, or null if not blocking.
function publishedCollision(existing, kind) {
  if (!existing || existing.status !== 'published') return null;
  return NextResponse.json(
    {
      error: kind === 'slug'
        ? `Slug "${existing.slug}" is already used by a PUBLISHED article. Cannot recreate live content.`
        : `A PUBLISHED article already exists for this topic ("${existing.title}"). Cannot recreate live content.`,
      code: kind === 'slug' ? 'PUBLISHED_SLUG_EXISTS' : 'PUBLISHED_ARTICLE_EXISTS',
      existingArticle: existing,
    },
    { status: 409 },
  );
}

export async function POST(request) {
  try {
    const { topicId, topicName, idea, language: rawLang } = await request.json();
    const language = (rawLang || 'en').toString().toLowerCase().trim();

    if (!topicName?.trim()) return NextResponse.json({ error: 'topicName is required' }, { status: 400 });

    let category = 'questions';
    let isPillar = false;
    let articleCreated = false;

    if (topicId) {
      const { data: topic } = await supabase
        .from('topics')
        .select('id, name, category, is_pillar, article_created')
        .eq('id', topicId)
        .single();
      if (topic?.category)        category       = topic.category;
      if (topic?.is_pillar)       isPillar       = true;
      if (topic?.article_created) articleCreated = true;
    }

    // Step 1: topic-level check. Block PUBLISHED, auto-delete draft.
    if (topicId) {
      const existing = await getExistingArticleForTopic(topicId);
      const blocked = publishedCollision(existing, 'topic');
      if (blocked) return blocked;
      if (existing) await deleteNonPublishedArticle(existing.id);
    }

    // Step 2: predictable-slug pre-check. Block PUBLISHED, auto-delete drafts.
    const candidates = candidateSlugs(category, topicName.trim());
    for (const cand of candidates) {
      const owner = await getArticleBySlug(cand);
      if (!owner) continue;
      const blocked = publishedCollision(owner, 'slug');
      if (blocked) return blocked;
      await deleteNonPublishedArticle(owner.id);
    }

    // Step 3: AI generation
    const contentPrompt = getPrompt(category, topicName.trim(), idea);
    const titleHint     = buildTitleHint(category, topicName.trim());
    const prompt = `${contentPrompt}${titleHint}

Return ONLY this JSON object (no markdown, no code fences, no commentary outside the JSON):
{
  "title":            "Specific, compelling article title",
  "slug":             "url-friendly-slug-lowercase-hyphens-only",
  "meta_title":       "SEO title under 60 chars",
  "meta_description": "140-155 char meta description that makes someone want to click",
  "keywords":         ["3-5 keyword strings"],
  "content":          "<p>Full article HTML. Allowed tags: p, h2, h3, ul, ol, li, strong, blockquote. Format quoted Bible verses as <blockquote>\\"Verse text\\" (Book Chapter:Verse)</blockquote>. Do NOT use h1. Do NOT use markdown. All double-quotes inside must be escaped as \\".</p>"
}

HARD RULES:
- Doctrinal stance: evangelical, biblically faithful (KJV for all Bible quotes)
- Slug: lowercase letters and hyphens only, no underscores, no numbers unless essential
- content field: valid HTML string only — no broken tags, no markdown
- Return ONLY the JSON — nothing before or after it`;

    const raw = await callOpenRouter([
      { role: 'system', content: `You are a senior Christian content writer with 15 years of experience writing for major Bible study publications. Your writing is human, direct, and grounded in Scripture. You always respond with valid JSON only, exactly as specified.` },
      { role: 'user',   content: prompt },
    ]);

    let generated;
    try { generated = JSON.parse(raw); }
    catch { return NextResponse.json({ error: 'AI returned invalid JSON', raw }, { status: 500 }); }

    const enforced = enforceArticleMeta(category, topicName.trim());
    const finalTitle = enforced?.title ?? generated.title ?? topicName.trim();
    const rawSlug    = enforced?.slug  ?? sanitiseSlug(generated.slug || generated.title || topicName.trim());
    const baseSlug   = sanitiseSlug(rawSlug);
    if (!baseSlug) return NextResponse.json({ error: 'Could not generate a valid slug' }, { status: 422 });

    // Step 4: post-AI slug check. Same rule — published blocks, drafts get deleted.
    const slugOwner = await getArticleBySlug(baseSlug);
    if (slugOwner) {
      const blocked = publishedCollision(slugOwner, 'slug');
      if (blocked) return blocked;
      await deleteNonPublishedArticle(slugOwner.id);
    }

    const { html: enrichedContent } = await enrichContent(generated.content || '');

    // Pre-sanitize the preview so the values the user sees are exactly what
    // will be inserted (the save endpoint also sanitizes as a safety net).
    return NextResponse.json(sanitizeForPg({
      title:            finalTitle,
      slug:             baseSlug,
      meta_title:       generated.meta_title,
      meta_description: generated.meta_description,
      keywords:         Array.isArray(generated.keywords) ? generated.keywords : [],
      content:          enrichedContent,
      topic_id:         topicId || null,
      language,
      status:           'draft',
      author_name:      AUTHOR_NAME,
      author_slug:      AUTHOR_SLUG,
      _meta: { is_pillar: isPillar, article_created: articleCreated, category },
    }));
  } catch (err) {
    console.error('[admin/generate]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
