export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { headers } from 'next/headers';
import ShareButtons from '../../../components/ShareButtons.js';
import { generateVerseForTopic } from '../../../lib/aiTools.js';
import { clientIpFromHeaders } from '../../../lib/rateLimit.js';

const BASE_URL = 'https://bibleverseinsights.com/tools/bible-verse-generator/';

export async function generateMetadata({ searchParams }) {
  const sp    = (await searchParams) || {};
  const topic = (sp.topic || '').toString().slice(0, 60).trim();
  return {
    title: topic ? `Bible Verse for "${topic}" | Bible Verse Insights` : 'Bible Verse Generator — Get a KJV Verse for Any Topic',
    description:
      'Enter any topic or emotion and instantly receive a King James Bible verse with a short pastoral explanation. Free, fast, no sign-up.',
    alternates: { canonical: BASE_URL },
    // Indexable only at the base URL; AI-generated query states are noindex
    // to prevent crawlers from inflating AI spend and creating thin duplicates.
    robots: topic ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function VerseGeneratorPage({ searchParams }) {
  const sp     = (await searchParams) || {};
  const topic  = (sp.topic || '').toString().slice(0, 60).trim();
  const ip     = topic ? clientIpFromHeaders(await headers()) : null;
  const result = topic ? await generateVerseForTopic(topic, { clientIp: ip }) : null;
  const path   = topic ? `/tools/bible-verse-generator/?topic=${encodeURIComponent(topic)}` : '/tools/bible-verse-generator/';
  const title  = topic ? `Bible Verse for "${topic}" — Bible Verse Insights` : 'Bible Verse Generator';

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
      <p style={{ fontSize: '0.85rem', color: '#8b7355', marginBottom: '0.75rem' }}>
        <Link href="/" style={{ color: '#8b7355', textDecoration: 'none' }}>Home</Link>
        {' › '}<Link href="/tools/" style={{ color: '#8b7355', textDecoration: 'none' }}>Tools</Link>
        {' › '}Bible Verse Generator
      </p>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem' }}>
        Bible Verse Generator
      </h1>
      <ShareButtons path={path} title={title} compact />

      {/* Tool form */}
      <form method="get" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '1.25rem 0 1.5rem' }}>
        <label htmlFor="topic" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Topic</label>
        <input
          id="topic"
          type="text"
          name="topic"
          defaultValue={topic}
          placeholder="e.g. love, anxiety, gratitude, a sick friend"
          maxLength={60}
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
          Generate Verse
        </button>
      </form>

      {/* Result */}
      {result && (
        result.error ? (
          <div style={{ backgroundColor: '#fdf3f3', border: '1px solid #e9c8c8', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', color: '#8b3a3a' }}>
            {result.error}
          </div>
        ) : (
          <div style={{ backgroundColor: '#fffdf7', border: '1px solid #e8dfc8', borderLeft: '4px solid #b8860b', borderRadius: '0.75rem', padding: '1.5rem 1.75rem', marginBottom: '1.5rem' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1.15rem', color: '#2c4270', lineHeight: 1.75, margin: '0 0 0.75rem 0' }}>
              &ldquo;{result.verse}&rdquo;
            </p>
            <p style={{ margin: '0 0 1rem 0', fontWeight: 600, color: '#b8860b', fontFamily: 'Georgia, serif' }}>
              — {result.ref}
            </p>
            <p style={{ margin: 0, color: '#4a4035', lineHeight: 1.7 }}>
              {result.explanation}
            </p>
          </div>
        )
      )}

      {/* SEO intro / context */}
      <section style={{ color: '#4a4035', fontSize: '0.97rem', lineHeight: 1.75, marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', color: '#1e2d4a', margin: '0 0 0.75rem' }}>
          How the Bible Verse Generator works
        </h2>
        <p>
          Type any word, phrase, or short situation into the box above — anything from a single emotion like &ldquo;hope&rdquo; or &ldquo;loneliness&rdquo; to a whole circumstance like &ldquo;preparing for surgery&rdquo; or &ldquo;forgiving a parent.&rdquo; The generator selects one well-known King James Bible verse that speaks directly to what you typed and adds a brief two- or three-sentence note explaining how the verse applies. Every verse comes from the public-domain KJV translation, with the reference shown in full so you can look it up in any Bible.
        </p>
        <p>
          This tool is designed for the moments when you need Scripture quickly — before a hard conversation, in the middle of a sleepless night, when a friend texts asking for prayer. It is not a replacement for sitting with the Bible itself; rather, it&rsquo;s a doorway. Once you have a verse, the next step is always to open the chapter it lives in and read the surrounding context. You can do that immediately on our site by visiting the{' '}
          <Link href="/bible/john/1/" style={{ color: '#b8860b' }}>Read Bible</Link> section.
        </p>
        <p>
          If you&rsquo;d rather start from how you feel, try the{' '}
          <Link href="/tools/bible-emotion-finder/" style={{ color: '#b8860b' }}>Bible Emotion Finder</Link>. If you want a list of verses on a single topic, try the{' '}
          <Link href="/tools/bible-verse-finder/" style={{ color: '#b8860b' }}>Bible Verse Finder</Link>. And for a fresh verse every morning, bookmark the{' '}
          <Link href="/tools/daily-bible-verse/" style={{ color: '#b8860b' }}>Daily Bible Verse</Link>.
        </p>
        <p>
          For longer reading, our <Link href="/topics/" style={{ color: '#b8860b' }}>study topics</Link>,{' '}
          <Link href="/guides/" style={{ color: '#b8860b' }}>guides</Link>, and{' '}
          <Link href="/bible-verses/" style={{ color: '#b8860b' }}>Bible verse articles</Link>{' '}
          go deeper on the themes most often searched here. Every page is free and ad-light.
        </p>
      </section>

      <ShareButtons path={path} title={title} label="Share this tool:" />
    </div>
  );
}
// step0-rebuild-marker
