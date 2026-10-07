import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma.js';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const topic = await prisma.topic.findUnique({
      where: { slug },
      include: {
        questions: {
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(topic);
  } catch (error) {
    console.error('GET /api/topics/[slug]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// step0-rebuild-marker
