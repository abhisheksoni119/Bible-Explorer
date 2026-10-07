export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { headers } from 'next/headers';
import ShareButtons from '../../../components/ShareButtons.js';
import { BIBLE_BOOKS, findBook, fetchChapter } from '../../../lib/bible.js';
import { generateChapterSummary } from '../../../lib/aiTools.js';
import { clientIpFromHeaders } from '../../../lib/rateLimit.js';

const BASE_URL = 'https://bibleverseinsights.com/tools/bible-chapter-summary/';

export async function generateMetadata({ searchParams }) {
  const sp        = (await searchParams) || {};
  const bookId    = (sp.book || '').toString().toLowerCase().trim();
  const chapterIn = parseInt(sp.chapter, 10);
  const book      = bookId ? findBook(bookId) : null;
  const chapter   = book && Number.isFinite(chapterIn) && chapterIn >= 1 && chapterIn <= book.chapters ? chapterIn : null;
  return {
    title: book && chapter
      ? `${book.name} ${chapter} — Summary & KJV Text | Bible Verse Insights`
      : 'Bible Chapter Summary — Quick KJV Chapter Overviews',
    description:
      'Pick any book and chapter of the King James Bible and get a clear 4–6 sentence summary, key themes, and the full chapter text — all in one place.',
    alternates: { canonical: BASE_URL },
    robots: (book && chapter) ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function ChapterSummaryPage({ searchParams }) {
  const sp        = (await searchParams) || {};
  const bookId    = (sp.book || '').toString().toLowerCase().trim();
  const chapterIn = parseInt(sp.chapter, 10);
  const book      = bookId ? findBook(bookId) : null;
  const chapter   = book && Number.isFinite(chapterIn) && chapterIn >= 1 && chapterIn <= book.chapters
    ? chapterIn : null;

  // Run summary + chapter fetch in parallel
  let summaryResult = null;
  let chapterData   = null;
  if (book && chapter) {
    const ip = clientIpFromHeaders(await headers());
    [summaryResult, chapterData] = await Promise.all([
      generateChapterSummary(book.name, chapter, { clientIp: ip }),
      fetchChapter(book.id, chapter),
    ]);
  }

  const path  = book && chapter
    ? `/tools/bible-chapter-summary/?book=${book.id}&chapter=${chapter}`
    : '/tools/bible-chapter-summary/';
  const title = book && chapter
    ? `${book.name} ${chapter} — Summary & KJV Text`
    : 'Bible Chapter Summary';

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
      <p style={{ fontSize: '0.85rem', color: '#8b7355', marginBottom: '0.75rem' }}>
        <Link href="/" style={{ color: '#8b7355', textDecoration: 'none' }}>Home</Link>
        {' › '}<Link href="/tools/" style={{ color: '#8b7355', textDecoration: 'none' }}>Tools</Link>
        {' › '}Bible Chapter Summary
      </p>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem' }}>
        Bible Chapter Summary
      </h1>
      <ShareButtons path={path} title={title} compact />

      {/* Picker */}
      <form method="get" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end', margin: '1.25rem 0 1.5rem' }}>
        <div style={{ flex: '2 1 200px' }}>
          <label htmlFor="book" style={{ display: 'block', fontSize: '0.85rem', color: '#6b5c45', marginBottom: '0.25rem' }}>Book</label>
          <select id="book" name="book" defaultValue={book?.id || ''} required style={{
            width: '100%', padding: '0.6rem 0.75rem',
            border: '1px solid #d4c5a9', borderRadius: '0.5rem',
            fontSize: '0.95rem', backgroundColor: 'white',
          }}>
            <option value="">— Select a book —</option>
            <optgroup label="Old Testament">
              {BIBLE_BOOKS.filter(b => b.testament === 'OT').map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </optgroup>
            <optgroup label="New Testament">
              {BIBLE_BOOKS.filter(b => b.testament === 'NT').map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div style={{ flex: '1 1 110px' }}>
          <label htmlFor="chapter" style={{ display: 'block', fontSize: '0.85rem', color: '#6b5c45', marginBottom: '0.25rem' }}>Chapter</label>
          <input id="chapter" type="number" name="chapter" min={1} max={150} defaultValue={chapter || ''} required style={{
            width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem',
            border: '1px solid #d4c5a9', borderRadius: '0.5rem',
            fontSize: '0.95rem', backgroundColor: 'white',
          }} />
        </div>
        <button type="submit" style={{
          backgroundColor: '#1e2d4a', color: 'white',
          padding: '0.6rem 1.5rem', borderRadius: '0.5rem',
          border: 'none', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
        }}>
          Summarise
        </button>
      </form>

      {/* Validation note when book selected but invalid chapter */}
      {bookId && !book && (
        <div style={{ backgroundColor: '#fdf3f3', border: '1px solid #e9c8c8', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', color: '#8b3a3a' }}>
          That book wasn&rsquo;t recognised. Pick one from the dropdown.
        </div>
      )}
      {book && Number.isFinite(chapterIn) && !chapter && (
        <div style={{ backgroundColor: '#fdf3f3', border: '1px solid #e9c8c8', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', color: '#8b3a3a' }}>
          {book.name} has chapters 1–{book.chapters}. You asked for chapter {chapterIn}.
        </div>
      )}

      {/* Summary card */}
      {book && chapter && summaryResult && (
        summaryResult.error ? (
          <div style={{ backgroundColor: '#fdf3f3', border: '1px solid #e9c8c8', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', color: '#8b3a3a' }}>
            {summaryResult.error}
          </div>
        ) : (
          <section style={{ backgroundColor: '#fffdf7', border: '1px solid #e8dfc8', borderLeft: '4px solid #b8860b', borderRadius: '0.75rem', padding: '1.5rem 1.75rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', color: '#1e2d4a', margin: '0 0 0.75rem' }}>
              Summary of {book.name} {chapter}
            </h2>
            <p style={{ color: '#4a4035', lineHeight: 1.75, margin: '0 0 1rem 0' }}>
              {summaryResult.summary}
            </p>
            {summaryResult.themes?.length > 0 && (
              <>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#8b7355', fontWeight: 600 }}>Key themes:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {summaryResult.themes.map((t, i) => (
                    <span key={i} style={{
                      display: 'inline-block', backgroundColor: 'white',
                      border: '1px solid #d4c5a9', borderRadius: '2rem',
                      padding: '0.3rem 0.85rem', fontSize: '0.82rem',
                      color: '#2c4270', fontFamily: 'Georgia, serif',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>
        )
      )}

      {/* Full KJV chapter text */}
      {book && chapter && chapterData?.verses && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', color: '#1e2d4a', margin: '0 0 1rem' }}>
            {book.name} {chapter} (KJV)
          </h2>
          <div style={{ backgroundColor: 'white', border: '1px solid #e8dfc8', borderRadius: '0.75rem', padding: '1.5rem 1.75rem' }}>
            {chapterData.verses.map((v, i) => (
              <p key={i} style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#1a1208', lineHeight: 1.85, margin: '0 0 0.65rem 0' }}>
                <sup style={{ color: '#b8860b', fontWeight: 700, marginRight: '0.35rem' }}>{v.verse}</sup>
                {v.text}
              </p>
            ))}
            <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: '#8b7355' }}>
              <Link href={`/bible/${book.id}/${chapter}/`} style={{ color: '#b8860b' }}>
                Read {book.name} {chapter} in our Bible reader →
              </Link>
            </p>
          </div>
        </section>
      )}

      {book && chapter && !chapterData && (
        <div style={{ backgroundColor: '#fdf3f3', border: '1px solid #e9c8c8', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', color: '#8b3a3a' }}>
          Couldn&rsquo;t fetch the chapter text right now. The summary is above.
        </div>
      )}

      {/* SEO intro */}
      <section style={{ color: '#4a4035', fontSize: '0.97rem', lineHeight: 1.75, marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', color: '#1e2d4a', margin: '0 0 0.75rem' }}>
          Read smarter, not faster
        </h2>
        <p>
          Some chapters of the Bible are short and self-contained; others are long, layered, and full of names and movement that can be hard to keep straight. The Bible Chapter Summary tool gives you both ends at once — a clear four-to-six sentence overview at the top, and the full King James chapter text right below it. You see the forest before you walk into the trees.
        </p>
        <p>
          The summary highlights the central message and lists three to five key themes for the chapter. The full chapter text is shown verse by verse, exactly as it appears in the public-domain KJV translation, so you can quote any line with full confidence. Whether you&rsquo;re preparing a Bible study, catching up on a daily reading plan, or just curious about a chapter someone quoted to you, this tool gets you to the meaning fast — without skipping the actual words of Scripture.
        </p>
        <p>
          When you&rsquo;re done with one chapter, the link beneath the chapter text takes you straight into our{' '}
          <Link href="/bible/john/1/" style={{ color: '#b8860b' }}>full Bible reader</Link>, where you can move chapter to chapter. To go from a chapter to a single memorable verse, try the{' '}
          <Link href="/tools/bible-verse-finder/" style={{ color: '#b8860b' }}>Bible Verse Finder</Link>. To read a verse on a specific topic, use the{' '}
          <Link href="/tools/bible-verse-generator/" style={{ color: '#b8860b' }}>Bible Verse Generator</Link>. And to start tomorrow with Scripture, bookmark the{' '}
          <Link href="/tools/daily-bible-verse/" style={{ color: '#b8860b' }}>Daily Bible Verse</Link>.
        </p>
      </section>

      <ShareButtons path={path} title={title} label="Share this tool:" />
    </div>
  );
}
// step0-rebuild-marker
