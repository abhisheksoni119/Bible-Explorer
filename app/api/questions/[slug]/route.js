import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma.js';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const question = await prisma.question.findUnique({
      where: { slug },
      include: {
        topic: {
          select: { id: true, name: true, slug: true, description: true },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('GET /api/questions/[slug]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// step0-rebuild-marker
