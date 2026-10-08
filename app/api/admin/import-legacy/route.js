export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdminClient.js';
import { markdownToHtml } from '../../../../lib/markdownToHtml.js';
import { topicContent, questionContent } from '../../../../lib/content.js';

export async function POST() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const contentPath = path.join(process.cwd(), 'data', 'content.json');
    const raw = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));

    const { data: existing, error: fetchErr } = await supabase
      .from('articles')
      .select('slug');
    if (fetchErr) throw new Error(fetchErr.message);
    const existingSlugs = new Set((existing || []).map(r => r.slug));

    const toInsert = [];
    const skipped  = [];

    for (const [slug, mdContent] of Object.entries(topicContent)) {
      if (existingSlugs.has(slug)) { skipped.push(slug); continue; }
      const titleMap = {
        faith: 'Faith', grace: 'Grace', hope: 'Hope', love: 'Love',
        patience: 'Patience', prayer: 'Prayer', salvation: 'Salvation', wisdom: 'Wisdom',
      };
      toInsert.push({
        slug,
        title:   titleMap[slug] || slug.charAt(0).toUpperCase() + slug.slice(1),
        content: markdownToHtml(mdContent),
        status:  'draft',
      });
    }

    for (const q of (raw.questions || [])) {
      if (existingSlugs.has(q.slug)) { skipped.push(q.slug); continue; }
      const extra = questionContent?.[q.slug] || '';
      const mdContent = extra || q.content || '';
      toInsert.push({
        slug:     q.slug,
        title:    q.title,
        content:  mdContent ? markdownToHtml(mdContent) : null,
        status:   'draft',
      });
    }

    const legacyQuestions = [
      { slug: 'why-is-patience-important',      title: 'Why is patience important in the Bible?',    category: 'questions' },
      { slug: 'what-does-bible-say-about-faith', title: 'What does the Bible say about faith?',        category: 'questions' },
      { slug: 'what-is-biblical-love',           title: 'What is biblical love?',                      category: 'questions' },
    ];
    for (const q of legacyQuestions) {
      if (existingSlugs.has(q.slug)) { skipped.push(q.slug); continue; }
      const mdContent = questionContent?.[q.slug] || '';
      toInsert.push({
        slug:     q.slug,
        title:    q.title,
        content:  mdContent ? markdownToHtml(mdContent) : null,
        status:   'draft',
      });
    }

    for (const g of (raw.guides || [])) {
      if (existingSlugs.has(g.slug)) { skipped.push(g.slug); continue; }
      toInsert.push({
        slug:     g.slug,
        title:    g.title,
        content:  g.content ? markdownToHtml(g.content) : null,
        status:   'draft',
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped:  skipped.length,
        message:  `Nothing to import — all ${skipped.length} legacy articles already exist in the database.`,
      });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('articles')
      .insert(toInsert)
      .select('id, slug');

    if (insertErr) throw new Error(insertErr.message);

    return NextResponse.json({
      imported: inserted?.length || 0,
      skipped:  skipped.length,
      message:  `Imported ${inserted?.length || 0} legacy articles as drafts. ${skipped.length} already existed.`,
      details:  inserted?.map(r => ({ slug: r.slug })) || [],
    });
  } catch (err) {
    console.error('[import-legacy]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
