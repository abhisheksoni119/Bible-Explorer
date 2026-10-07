export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchChapter } from '../../../../lib/bible.js';
import { findBook, BIBLE_BOOKS } from '../../../../lib/bible.js';
import { bibleNotes } from '../../../../lib/db.js';
import { addLinksToText } from '../../../../lib/internalLinks.js';

export async function generateMetadata({ params }) {
  const { book: bookParam, chapter } = await params;
  const book = findBook(bookParam);
  if (!book) return { title: 'Not Found' };
  return {
    title: `${book.name} ${chapter}`,
    alternates: { canonical: `/bible/${bookParam}/${chapter}/` },
  };
}

function ChapterNav({ book, chapter, totalChapters }) {
  const prev = chapter > 1 ? chapter - 1 : null;
  const next = chapter < totalChapters ? chapter + 1 : null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
      {prev ? (
        <Link href={`/bible/${book.id}/${prev}/`} style={{
          backgroundColor: 'white', border: '1px solid #e8dfc8',
          color: '#2c4270', padding: '0.5rem 1rem', borderRadius: '0.5rem',
          textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500',
        }}>
          ← Ch {prev}
        </Link>
      ) : <div />}
      <span style={{ color: '#8b7355', fontSize: '0.875rem' }}>
        Chapter {chapter} of {totalChapters}
      </span>
      {next ? (
        <Link href={`/bible/${book.id}/${next}/`} style={{
          backgroundColor: 'white', border: '1px solid #e8dfc8',
          color: '#2c4270', padding: '0.5rem 1rem', borderRadius: '0.5rem',
          textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500',
        }}>
          Ch {next} →
        </Link>
      ) : <div />}
    </div>
  );
}

function BookSelector({ currentBook }) {
  const otBooks = BIBLE_BOOKS.filter(b => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter(b => b.testament === 'NT');
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e8dfc8', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
      <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#8b7355', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem', fontWeight: '600' }}>
        Old Testament
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.25rem' }}>
        {otBooks.map(b => (
          <Link key={b.id} href={`/bible/${b.id}/1/`} style={{
            padding: '0.25rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.8rem',
            textDecoration: 'none', fontWeight: b.id === currentBook.id ? '600' : '400',
            backgroundColor: b.id === currentBook.id ? '#1e2d4a' : '#f5f0e8',
            color: b.id === currentBook.id ? 'white' : '#4a4035',
            border: '1px solid',
            borderColor: b.id === currentBook.id ? '#1e2d4a' : '#e8dfc8',
          }}>
            {b.name}
          </Link>
        ))}
      </div>
      <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#8b7355', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem', fontWeight: '600' }}>
        New Testament
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {ntBooks.map(b => (
          <Link key={b.id} href={`/bible/${b.id}/1/`} style={{
            padding: '0.25rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.8rem',
            textDecoration: 'none', fontWeight: b.id === currentBook.id ? '600' : '400',
            backgroundColor: b.id === currentBook.id ? '#1e2d4a' : '#f5f0e8',
            color: b.id === currentBook.id ? 'white' : '#4a4035',
            border: '1px solid',
            borderColor: b.id === currentBook.id ? '#1e2d4a' : '#e8dfc8',
          }}>
            {b.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ExplanationPanel({ notes }) {
  if (!notes) return null;
  const pStyle = { fontSize: '0.9rem', lineHeight: 1.7, color: '#2a2015', margin: 0, fontFamily: 'Georgia, serif' };
  const labelStyle = { fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#b8860b', fontWeight: '600', marginBottom: '0.5rem' };
  return (
    <div style={{ backgroundColor: '#f5f0e8', border: '1px solid #e8dfc8', borderRadius: '0.875rem', padding: '1.5rem', marginBottom: '1.25rem' }}>
      <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '1.25rem' }}>
        Study Notes
      </h3>
      {notes.overview && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={labelStyle}>Overview</div>
          <p style={pStyle} dangerouslySetInnerHTML={{ __html: addLinksToText(notes.overview) }} />
        </div>
      )}
      {notes.context && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={labelStyle}>Historical Context</div>
          <p style={pStyle} dangerouslySetInnerHTML={{ __html: addLinksToText(notes.context) }} />
        </div>
      )}
      {notes.application && (
        <div>
          <div style={labelStyle}>Application</div>
          <p style={pStyle} dangerouslySetInnerHTML={{ __html: addLinksToText(notes.application) }} />
        </div>
      )}
    </div>
  );
}

export default async function BibleChapterPage({ params }) {
  const { book: bookParam, chapter: chapterParam } = await params;
  const book = findBook(bookParam);
  if (!book) notFound();

  const chapter = parseInt(chapterParam, 10);
  if (isNaN(chapter) || chapter < 1 || chapter > book.chapters) notFound();

  const [data, notes] = await Promise.all([
    fetchChapter(book.id, chapter),
    Promise.resolve(bibleNotes.findByReference(book.id, chapter)),
  ]);

  return (
    <div style={{ maxWidth: '84rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <aside className="bible-sidebar">
          <BookSelector currentBook={book} />
        </aside>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/" style={{ color: '#b8860b', textDecoration: 'none', fontSize: '0.875rem' }}>Home</Link>
            <span style={{ color: '#8b7355', margin: '0 0.5rem' }}>›</span>
            <span style={{ color: '#4a4035', fontSize: '0.875rem' }}>{book.name} {chapter}</span>
          </div>

          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.5rem' }}>
            {book.name}
          </h1>
          <p style={{ color: '#8b7355', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Chapter {chapter} · King James Version
          </p>

          <ChapterNav book={book} chapter={chapter} totalChapters={book.chapters} />

          <div style={{ display: 'grid', gridTemplateColumns: notes ? '1fr minmax(0,300px)' : '1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: 'white', border: '1px solid #e8dfc8', borderRadius: '1rem', padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
              {data ? (
                <div style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  {data.verses?.map((v) => (
                    <div key={v.verse} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.875rem', lineHeight: 1.9 }}>
                      <span style={{
                        minWidth: '1.75rem', color: '#b8860b',
                        fontSize: '0.75rem', fontWeight: '600',
                        paddingTop: '0.25rem', flexShrink: 0, textAlign: 'right',
                      }}>
                        {v.verse}
                      </span>
                      <span style={{ color: '#1a1208', fontSize: '1.05rem' }}>
                        {v.text.trim()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#8b7355' }}>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    Could not load this chapter.
                  </p>
                  <p style={{ fontSize: '0.875rem' }}>Please check your connection and try again.</p>
                </div>
              )}
            </div>

            {notes && (
              <div style={{ position: 'sticky', top: '1.5rem' }}>
                <ExplanationPanel notes={notes} />
              </div>
            )}
          </div>

          <ChapterNav book={book} chapter={chapter} totalChapters={book.chapters} />

          <div className="bible-mobile-nav">
            <details style={{ backgroundColor: 'white', border: '1px solid #e8dfc8', borderRadius: '0.75rem', padding: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: '600', color: '#1e2d4a', fontSize: '0.9rem', listStyle: 'none' }}>
                📚 Browse all books
              </summary>
              <div style={{ marginTop: '1rem' }}>
                <BookSelector currentBook={book} />
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
// step0-rebuild-marker
