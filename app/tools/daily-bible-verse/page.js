import Link from 'next/link';
import ShareButtons from '../../../components/ShareButtons.js';
import { dailyVerseFor } from '../../../lib/toolsData.js';

// Cache the page for 1 hour at the edge — the verse only changes at midnight UTC,
// so this saves render time without ever serving yesterday's verse for long.
export const revalidate = 3600;

export const metadata = {
  title: 'Daily Bible Verse — A Fresh KJV Verse Every Day',
  description:
    'A new King James Bible verse every day, drawn from the most beloved passages of Scripture. Perfect for morning devotions, daily encouragement, and sharing with friends.',
  alternates: { canonical: 'https://bibleverseinsights.com/tools/daily-bible-verse/' },
  robots: { index: true, follow: true },
};

export default function DailyVersePage() {
  const today = new Date();
  const v     = dailyVerseFor(today);
  // Display the date in UTC so it always matches the verse-selection day
  // (dailyVerseFor uses UTC day-of-year). Otherwise visitors near midnight
  // in some timezones could see a date/verse mismatch.
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'UTC',
  });
  const path  = '/tools/daily-bible-verse/';
  const title = `Today's Bible Verse — ${v.ref} (KJV)`;

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
      <p style={{ fontSize: '0.85rem', color: '#8b7355', marginBottom: '0.75rem' }}>
        <Link href="/" style={{ color: '#8b7355', textDecoration: 'none' }}>Home</Link>
        {' › '}<Link href="/tools/" style={{ color: '#8b7355', textDecoration: 'none' }}>Tools</Link>
        {' › '}Daily Bible Verse
      </p>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.5rem' }}>
        Daily Bible Verse
      </h1>
      <p style={{ color: '#8b7355', fontSize: '0.9rem', marginBottom: '1rem' }}>
        {dateStr}
      </p>
      <ShareButtons path={path} title={title} compact />

      {/* The verse card */}
      <div style={{ backgroundColor: '#fffdf7', border: '1px solid #e8dfc8', borderLeft: '4px solid #b8860b', borderRadius: '0.875rem', padding: '2rem 2rem', margin: '1.25rem 0 2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1.3rem', color: '#2c4270', lineHeight: 1.75, margin: '0 0 1rem 0' }}>
          &ldquo;{v.text}&rdquo;
        </p>
        <p style={{ margin: 0, fontWeight: 700, color: '#b8860b', fontFamily: 'Georgia, serif', fontSize: '1.05rem' }}>
          — {v.ref}
        </p>
      </div>

      {/* SEO intro */}
      <section style={{ color: '#4a4035', fontSize: '0.97rem', lineHeight: 1.75, marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', color: '#1e2d4a', margin: '0 0 0.75rem' }}>
          A new verse every day
        </h2>
        <p>
          Each day, this page rotates to a new verse drawn from a curated list of the most beloved passages in the King James Bible. The selection is deterministic — every visitor on the same date sees the same verse — so you can return throughout the day to re-read it, share it, or use it for prayer. Tomorrow it will change, drawing from another well-known passage.
        </p>
        <p>
          The Daily Bible Verse is built for habit. Bookmark this page, add it to your morning routine, or share today&rsquo;s verse on social media using the buttons above. The full library covers eighty verses including John 3:16, Psalm 23, Philippians 4:13, Jeremiah 29:11, Proverbs 3:5, Romans 8:28, Isaiah 41:10, and many more — the verses Christians return to most often for comfort, strength, and direction.
        </p>
        <p>
          Want more? Use the{' '}
          <Link href="/tools/bible-verse-generator/" style={{ color: '#b8860b' }}>Bible Verse Generator</Link> for a verse on a specific topic, the{' '}
          <Link href="/tools/bible-emotion-finder/" style={{ color: '#b8860b' }}>Bible Emotion Finder</Link> to start from how you feel, or the{' '}
          <Link href="/tools/prayer-generator/" style={{ color: '#b8860b' }}>Prayer Generator</Link> to turn today&rsquo;s verse into a personal prayer. To read the surrounding chapter, visit our{' '}
          <Link href="/bible/john/1/" style={{ color: '#b8860b' }}>Read Bible</Link> section.
        </p>
        <p>
          Curated study around today&rsquo;s themes is available across our{' '}
          <Link href="/bible-verses/" style={{ color: '#b8860b' }}>Bible verse articles</Link>,{' '}
          <Link href="/topics/" style={{ color: '#b8860b' }}>study topics</Link>, and{' '}
          <Link href="/guides/" style={{ color: '#b8860b' }}>guides</Link>.
        </p>
      </section>

      <ShareButtons path={path} title={title} label="Share today's verse:" />
    </div>
  );
}
// step0-rebuild-marker
