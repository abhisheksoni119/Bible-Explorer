export const dynamic = 'force-dynamic';

import Link from 'next/link';
import ShareButtons from '../../../components/ShareButtons.js';
import { EMOTIONS, getEmotion, getTopicByKey } from '../../../lib/toolsData.js';

export const metadata = {
  title: 'Bible Emotion Finder — KJV Verses for How You Feel',
  description:
    'Pick how you feel — anxious, joyful, lonely, grateful, angry, weary — and instantly find King James Bible verses that meet you there.',
  alternates: { canonical: 'https://bibleverseinsights.com/tools/bible-emotion-finder/' },
  robots: { index: true, follow: true },
};

export default async function EmotionFinderPage({ searchParams }) {
  const sp      = (await searchParams) || {};
  const id      = (sp.emotion || '').toString().slice(0, 30).trim();
  const emotion = id ? getEmotion(id) : null;
  const topic   = emotion ? getTopicByKey(emotion.topicKey) : null;
  const path    = id ? `/tools/bible-emotion-finder/?emotion=${encodeURIComponent(id)}` : '/tools/bible-emotion-finder/';
  const title   = emotion ? `Bible verses for when you feel ${emotion.label}` : 'Bible Emotion Finder';

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
      <p style={{ fontSize: '0.85rem', color: '#8b7355', marginBottom: '0.75rem' }}>
        <Link href="/" style={{ color: '#8b7355', textDecoration: 'none' }}>Home</Link>
        {' › '}<Link href="/tools/" style={{ color: '#8b7355', textDecoration: 'none' }}>Tools</Link>
        {' › '}Bible Emotion Finder
      </p>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem' }}>
        Bible Emotion Finder
      </h1>
      <ShareButtons path={path} title={title} compact />

      {/* Emotion picker — all rendered as links so the page is fully server-rendered */}
      <div style={{ margin: '1.25rem 0 1.5rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#6b5c45', margin: '0 0 0.5rem' }}>I feel…</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {EMOTIONS.map(e => {
            const active = e.id === id;
            return (
              <Link key={e.id} href={`/tools/bible-emotion-finder/?emotion=${e.id}`} style={{
                display: 'inline-block',
                backgroundColor: active ? '#1e2d4a' : 'white',
                color: active ? 'white' : '#2c4270',
                border: '1px solid #d4c5a9', borderRadius: '2rem',
                padding: '0.4rem 0.95rem', fontSize: '0.85rem',
                fontFamily: 'Georgia, serif', fontWeight: 500,
                textDecoration: 'none',
              }}>
                {e.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Result */}
      {emotion && topic && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.35rem', color: '#1e2d4a', margin: '0 0 1rem' }}>
            When you feel {emotion.label.toLowerCase()}
          </h2>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {topic.verses.map((v, i) => (
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
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6b5c45' }}>
            Need words to pray about this? Try the{' '}
            <Link href={`/tools/prayer-generator/?situation=${encodeURIComponent(emotion.label.toLowerCase())}`} style={{ color: '#b8860b' }}>
              Prayer Generator for {emotion.label.toLowerCase()}
            </Link>.
          </p>
        </div>
      )}

      {emotion && !topic && (
        <p style={{ color: '#8b3a3a', marginBottom: '1.5rem' }}>
          Sorry, that emotion isn&rsquo;t available. Pick one from the list above.
        </p>
      )}

      {/* SEO intro */}
      <section style={{ color: '#4a4035', fontSize: '0.97rem', lineHeight: 1.75, marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', color: '#1e2d4a', margin: '0 0 0.75rem' }}>
          Scripture for every season of feeling
        </h2>
        <p>
          The Bible is not afraid of human emotion. Its psalms grieve and rage and rejoice; its prophets feel weary and abandoned; its apostles describe joy and sorrow in the same breath. The Bible Emotion Finder is built on that honesty. Pick how you feel right now — anxious, afraid, sad, lonely, angry, guilty, hopeless, weak, confused, unloved, thankful, joyful, doubting, restless, or tempted — and the tool returns five to seven King James verses that speak directly to that feeling.
        </p>
        <p>
          The mapping is curated: each emotion is paired with a topic our editors believe Scripture addresses most clearly for that feeling. &ldquo;Anxious&rdquo; goes to verses on anxiety and casting your cares; &ldquo;guilty&rdquo; goes to verses on God&rsquo;s forgiveness; &ldquo;weary&rdquo; goes to verses on God&rsquo;s strength. The verses are exactly the same hand-picked sets used by the{' '}
          <Link href="/tools/bible-verse-finder/" style={{ color: '#b8860b' }}>Bible Verse Finder</Link>, so you can switch between the two depending on whether you want to start from a feeling or from a word.
        </p>
        <p>
          Once you&rsquo;ve found verses that speak to you, the next step is prayer. Use the{' '}
          <Link href="/tools/prayer-generator/" style={{ color: '#b8860b' }}>Prayer Generator</Link> to write a short prayer for the same emotion. Or read the{' '}
          <Link href="/tools/daily-bible-verse/" style={{ color: '#b8860b' }}>Daily Bible Verse</Link> to start tomorrow with Scripture. For longer reading, browse our{' '}
          <Link href="/topics/" style={{ color: '#b8860b' }}>study topics</Link> and{' '}
          <Link href="/bible-verses/" style={{ color: '#b8860b' }}>verse articles</Link>.
        </p>
      </section>

      <ShareButtons path={path} title={title} label="Share this tool:" />
    </div>
  );
}
// step0-rebuild-marker
