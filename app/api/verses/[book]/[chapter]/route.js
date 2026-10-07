import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma.js';

/**
 * GET /api/verses/[book]/[chapter]
 * Returns all verses for a given book and chapter,
 * ordered by verse number, including any explanations.
 *
 * GET /api/verses/[book]/[chapter]?verse=16
 * Returns a single verse by book, chapter, and verse number.
 */
export async function GET(request, { params }) {
  const { book, chapter } = await params;
  const chapterNum = parseInt(chapter, 10);
  const { searchParams } = new URL(request.url);
  const verseParam = searchParams.get('verse');

  if (isNaN(chapterNum)) {
    return NextResponse.json({ error: 'Invalid chapter number' }, { status: 400 });
  }

  try {
    if (verseParam !== null) {
      const verseNum = parseInt(verseParam, 10);
      if (isNaN(verseNum)) {
        return NextResponse.json({ error: 'Invalid verse number' }, { status: 400 });
      }

      const bibleVerse = await prisma.bibleVerse.findUnique({
        where: { book_chapter_verse: { book, chapter: chapterNum, verse: verseNum } },
        include: { explanations: true },
      });

      if (!bibleVerse) {
        return NextResponse.json({ error: 'Verse not found' }, { status: 404 });
      }

      return NextResponse.json(bibleVerse);
    }

    const verses = await prisma.bibleVerse.findMany({
      where: { book, chapter: chapterNum },
      include: { explanations: true },
      orderBy: { verse: 'asc' },
    });

    return NextResponse.json({ book, chapter: chapterNum, verses });
  } catch (error) {
    console.error('GET /api/verses/[book]/[chapter]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// step0-rebuild-marker
