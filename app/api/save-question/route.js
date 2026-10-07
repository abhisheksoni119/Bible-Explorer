export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      slug,
      contentHtml,
      summary,
      metaTitle,
      metaDescription,
      keywords,
      relatedSlugs,
      topicId,
    } = body;

    // ── Validate required fields ─────────────────────────────────────────────
    if (!title?.trim())       return NextResponse.json({ error: 'title is required' },       { status: 400 });
    if (!slug?.trim())        return NextResponse.json({ error: 'slug is required' },        { status: 400 });
    if (!contentHtml?.trim()) return NextResponse.json({ error: 'contentHtml is required' }, { status: 400 });

    // ── Guard against duplicate slugs ────────────────────────────────────────
    const existing = await prisma.question.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: `A question with slug "${slug}" already exists.` },
        { status: 409 }
      );
    }

    // ── Validate topicId if provided ─────────────────────────────────────────
    if (topicId) {
      const topic = await prisma.topic.findUnique({ where: { id: topicId } });
      if (!topic) {
        return NextResponse.json({ error: `Topic id ${topicId} not found` }, { status: 400 });
      }
    }

    // ── Persist ──────────────────────────────────────────────────────────────
    const question = await prisma.question.create({
      data: {
        title:           title.trim(),
        slug:            slug.trim(),
        contentHtml:     contentHtml.trim(),
        summary:         summary?.trim() ?? null,
        metaTitle:       metaTitle?.trim() ?? null,
        metaDescription: metaDescription?.trim() ?? null,
        keywords:        Array.isArray(keywords) ? keywords : [],
        relatedSlugs:    Array.isArray(relatedSlugs) ? relatedSlugs : [],
        topicId:         topicId ?? null,
      },
      include: { topic: { select: { name: true, slug: true } } },
    });

    return NextResponse.json({ success: true, question }, { status: 201 });
  } catch (err) {
    console.error('[save-question]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
