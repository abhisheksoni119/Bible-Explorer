export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../../../lib/supabaseAdminClient.js';
import { callOpenRouter } from '../../../../../../lib/generator.js';
import { enrichContent } from '../../../../../../lib/seoEnrich.js';

const SYSTEM_PROMPT = `You are a senior Christian content editor with 15 years of experience improving Bible study articles. You rewrite content to sound genuinely human — not robotic, not generic, not AI-generated. You keep the original meaning and doctrinal stance intact while making the writing more engaging, clearer, and practically valuable. You respond with the improved HTML only, exactly as instructed.`;

const USER_PROMPT = (title, category, content) => `Improve and restructure this Christian article titled "${title}" (category: ${category}).

CURRENT CONTENT (HTML):
${content}

IMPROVEMENT REQUIREMENTS:

STRUCTURE — add these if missing:
- SEO-optimised headings (use <h2> for main sections, <h3> for subsections)
- <h2>What This Means for You</h2> — specific, concrete application to real life
- <h2>How to Apply This</h2> — 3–4 practical steps, each grounded in Scripture

WRITING QUALITY:
- Rewrite to sound natural and human — like a thoughtful pastor or trusted friend wrote it
- Vary sentence length deliberately: short punchy sentences mixed with longer nuanced ones
- Use contractions naturally (it's, you're, we've, isn't, didn't)
- Speak directly to the reader: "you", "your", "we", "us" — never "one" or generic "Christians"
- Keep every Bible verse and reference exactly as written — do not invent new ones
- Cut any padding or repetition — every paragraph must add distinct value
- Acknowledge difficulty honestly where appropriate — faith is hard sometimes

BANNED PHRASES — never use:
- "In today's world" / "In a world where" / "In today's fast-paced"
- "It's important to note" / "It is worth noting" / "It goes without saying"
- "Delve into" / "Dive into" / "Embark on" / "Journey into"
- "Let's explore" / "Let's look at" / "Let's dive"
- "Transformative" / "Game-changer" / "Holistic" / "Robust"
- "At the end of the day" / "The bottom line is"
- "As we can see" / "As mentioned above"
- "In conclusion," / "To sum up," as paragraph openers

KEEP INTACT:
- Original meaning and doctrinal stance (evangelical, biblically faithful)
- All Bible verse references (Book Chapter:Verse format)
- HTML tag structure: only p, h2, h3, ul, ol, li, strong, blockquote
- Format directly quoted Bible verse text as: <blockquote>"Verse text" (Book Chapter:Verse)</blockquote>
- Do NOT add h1 tags or markdown

RETURN: The improved article as a valid HTML string only. No JSON wrapper. No explanation. No preamble. Start with a <p> or <h2> tag.`;

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
    }

    const { data: article, error: articleError } = await supabase
      .from('articles').select('*, topics(name, category)').eq('id', id).single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    if (!article.content?.trim()) {
      return NextResponse.json({ error: 'Article has no content to upgrade' }, { status: 400 });
    }

    const improvedHtml = await callOpenRouter([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: USER_PROMPT(article.title, article.topics?.category || '', article.content) },
    ], { json: false });

    const { html: enrichedContent } = await enrichContent(improvedHtml);

    return NextResponse.json({ content: enrichedContent });
  } catch (err) {
    console.error('[upgrade]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
