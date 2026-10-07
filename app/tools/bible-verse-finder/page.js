export const dynamic = 'force-dynamic';

import Link from 'next/link';
import ShareButtons from '../../../components/ShareButtons.js';
import { findTopicByKeyword, TOPICAL_VERSES } from '../../../lib/toolsData.js';

export const metadata = {
  title: 'Bible Verse Finder — Search KJV Scripture by Keyword',
  description:
    'Type a keyword like love, hope, healing, or fear, and instantly find 5–10 hand-picked King James Bible verses on the topic. Free, fast, no sign-up.',
  alternates: { canonical: 'https://bibleverseinsights.com/tools/bible-verse-finder/' },
  robots: { index: true, follow: true },
};

export default async function VerseFinderPage({ searchParams }) {
  const sp    = (await searchParams) || {};
  const q     = (sp.q || '').toString().slice(0, 40).trim();
  const match = q ? findTopicByKeyword(q) : null;
  const path  = q ? `/tools/bible-verse-finder/?q=${encodeURIComponent(q)}` : '/tools/bible-verse-finder/';
  const title = q && match ? `Bible verses about ${match.topic} — KJV` : 'Bible Verse Finder';

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
      <p style={{ fontSize: '0.85rem', color: '#8b7355', marginBottom: '0.75rem' }}>
        <Link href="/" style={{ color: '#8b7355', textDecoration: 'none' }}>Home</Link>
        {' › '}<Link href="/tools/" style={{ color: '#8b7355', textDecoration: 'none' }}>Tools</Link>
        {' › '}Bible Verse Finder
      </p>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem' }}>
        Bible Verse Finder
      </h1>
      <ShareButtons path={path} title={title} compact />

      <form method="get" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '1.25rem 0 1.5rem' }}>
        <label htmlFor="q" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Keyword</label>
        <input
          id="q"
          type="text"
          name="q"
          defaultValue={q}
          placeholder="e.g. love, hope, anxiety, forgiveness"
          maxLength={40}
          required
          style={{
            flex: '1 1 260px', minWidth: 0,
            padding: '0.6rem 0.85rem',
            border: '1px solid #d4c5a9', borderRadius: '0.5rem',
            fontSize: '1rem', backgroundColor: 'white',
          }}
        />
        <button type="submit" style={{
          backgroundColor: '#1e2d4a', color: 'white',
          padding: '0.6rem 1.5rem', borderRadius: '0.5rem',
          border: 'none', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
        }}>
          Find Verses
        </button>
      </form>

      {/* Results */}
      {q && !match && (
        <div style={{ backgroundColor: '#fdf3f3', border: '1px solid #e9c8c8', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', color: '#8b3a3a' }}>
          <p style={{ margin: 0 }}>No matching topic found for &ldquo;{q}&rdquo;. Try a broader keyword like one of these:</p>
          <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.9rem' }}>
            {TOPICAL_VERSES.slice(0, 12).map((t, i) => (
              <span key={t.topic}>
                {i > 0 && ', '}
                <Link href={`/tools/bible-verse-finder/?q=${t.topic}`} style={{ color: '#b8860b', textDecoration: 'none' }}>{t.topic}</Link>
              </span>
            ))}
          </p>
        </div>
      )}

      {match && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', color: '#1e2d4a', margin: '0 0 1rem', textTransform: 'capitalize' }}>
            {match.verses.length} Bible verses about {match.topic}
          </h2>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {match.verses.map((v, i) => (
              <li key={i} style={{ backgroundColor: 'white', border: '1px solid #e8dfc8', borderRadius: '0.75rem', padding: '1.1rem 1.25rem', marginBottom: '0.75rem' }}>
                <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1.05rem', color: '#2c4270', lineHeight: 1.75, margin: '0 0 0.5rem' }}>
                  &ldquo;{v.text}&rdquo;
                </p>
                <p style={{ margin: 0, fontWeight: 600, color: '#b8860b', fontFamily: 'Georgia, serif', fontSize: '0.9rem' }}>
                  — {v.ref}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* SEO intro */}
      <section style={{ color: '#4a4035', fontSize: '0.97rem', lineHeight: 1.75, marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', color: '#1e2d4a', margin: '0 0 0.75rem' }}>
          About the Bible Verse Finder
        </h2>
        <p>
          The Bible Verse Finder is a fast, hand-curated keyword index of the King James Bible. Instead of returning every match across 31,000+ verses, it surfaces the five to ten most well-known and pastorally useful passages on each topic — the ones a Bible teacher would reach for first. That keeps results meaningful rather than overwhelming.
        </p>
        <p>
          Currently the finder covers more than thirty common topics including love, faith, hope, peace, prayer, forgiveness, salvation, grace, strength, comfort, healing, fear, anxiety, money, marriage, family, friendship, wisdom, patience, kindness, anger, suffering, gratitude, and guidance. Each set of verses is checked against the public-domain KJV text, so you can quote them on a card, in a sermon, or in a message to a friend with full confidence.
        </p>
        <p>
          If your keyword doesn&rsquo;t match a curated topic, the finder suggests close alternatives. For more open-ended searching, try the{' '}
          <Link href="/tools/bible-verse-generator/" style={{ color: '#b8860b' }}>Bible Verse Generator</Link>, which uses AI to pick a single verse for any topic you describe. To start from a feeling rather than a word, use the{' '}
          <Link href="/tools/bible-emotion-finder/" style={{ color: '#b8860b' }}>Bible Emotion Finder</Link>. To go deeper on a passage, our{' '}
          <Link href="/topics/" style={{ color: '#b8860b' }}>study topics</Link> and{' '}
          <Link href="/bible-verses/" style={{ color: '#b8860b' }}>verse articles</Link> walk through the meaning, context, and application of the most-asked-about verses.
        </p>
      </section>

      <ShareButtons path={path} title={title} label="Share this tool:" />
    </div>
  );
}
// step0-rebuild-marker
