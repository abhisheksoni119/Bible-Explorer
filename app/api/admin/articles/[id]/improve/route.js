export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../../../lib/supabaseAdminClient.js';
import { callOpenRouter } from '../../../../../../lib/generator.js';
import { enrichContent } from '../../../../../../lib/seoEnrich.js';

const IMPROVE_SYSTEM_PROMPT = `You are a senior Christian content editor with 15 years of experience improving Bible study articles. You rewrite content to sound genuinely human — not robotic, not generic, not AI-generated. You keep the original meaning and doctrinal stance intact while making the writing more engaging, clearer, and practically valuable. You respond with the improved HTML only, exactly as instructed.`;

const IMPROVE_USER_PROMPT = (title, category, content) => `Improve this Christian article titled "${title}" (category: ${category}).

CURRENT CONTENT (HTML):
${content}

IMPROVEMENT REQUIREMENTS:

WRITING QUALITY:
- Rewrite to sound natural and human — like a thoughtful pastor or trusted friend wrote it
- Vary sentence length deliberately (short punchy sentences mixed with longer, more nuanced ones)
- Use contractions naturally (it's, you're, we've, isn't, didn't)
- Speak directly to the reader with "you", "your", "we", "us"
- Keep the same Bible verses and references — do not invent new ones
- Every paragraph must add distinct value — cut any padding or repetition
- Acknowledge difficulty honestly where appropriate — faith is hard sometimes

STRUCTURE — add these sections if missing (using <h2> headings):
- "What This Means for You" — specific, concrete application to real life
- "How to Apply This" — 3–4 practical steps, each grounded in Scripture

BANNED PHRASES — never use any of these:
- "In today's world" / "In a world where" / "In today's fast-paced"
- "It's important to note" / "It is worth noting" / "It goes without saying"
- "Delve into" / "Dive into" / "Embark on" / "Journey into"
- "Let's explore" / "Let's look at" / "Let's dive"
- "Transformative" / "Game-changer" / "Holistic" / "Robust"
- "At the end of the day" / "The bottom line is"
- "As we can see" / "As mentioned above"
- "In conclusion," / "To sum up," (as paragraph openers)
- Any sentence that just restates the topic without adding meaning

KEEP INTACT:
- Original meaning and doctrinal stance (evangelical, biblically faithful)
- All Bible verse references (Book Chapter:Verse format)
- HTML tag structure: use only p, h2, h3, ul, ol, li, strong, blockquote
- Format any directly quoted Bible verse text as: <blockquote>"Verse text" (Book Chapter:Verse)</blockquote>
- Do NOT add h1 tags
- Do NOT add markdown

RETURN: The improved article as a valid HTML string only. No JSON wrapper. No explanation. No preamble. Just the HTML content starting with a <p> or <h2> tag.`;

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
      return NextResponse.json({ error: 'Article has no content to improve' }, { status: 400 });
    }

    const improvedHtml = await callOpenRouter([
      { role: 'system', content: IMPROVE_SYSTEM_PROMPT },
      { role: 'user',   content: IMPROVE_USER_PROMPT(article.title, article.topics?.category || '', article.content) },
    ], { json: false });

    const { html: enrichedContent } = await enrichContent(improvedHtml);

    const { data: updated, error: updateError } = await supabase
      .from('articles')
      .update({ content: enrichedContent })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[improve]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
