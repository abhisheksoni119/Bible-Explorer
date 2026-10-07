export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { headers } from 'next/headers';
import ShareButtons from '../../../components/ShareButtons.js';
import { generatePrayerForSituation } from '../../../lib/aiTools.js';
import { clientIpFromHeaders } from '../../../lib/rateLimit.js';
import { PRAYER_SITUATIONS } from '../../../lib/toolsData.js';

const BASE_URL = 'https://bibleverseinsights.com/tools/prayer-generator/';

export async function generateMetadata({ searchParams }) {
  const sp        = (await searchParams) || {};
  const situation = (sp.situation || '').toString().slice(0, 200).trim();
  return {
    title: situation ? `A Prayer for: ${situation} | Bible Verse Insights` : 'Prayer Generator — A Heartfelt Christian Prayer for Any Situation',
    description:
      'Describe your situation and instantly receive a short, reverent Christian prayer. Free tool for moments when words feel hard to find.',
    alternates: { canonical: BASE_URL },
    robots: situation ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function PrayerGeneratorPage({ searchParams }) {
  const sp        = (await searchParams) || {};
  const situation = (sp.situation || '').toString().slice(0, 200).trim();
  const ip        = situation ? clientIpFromHeaders(await headers()) : null;
  const result    = situation ? await generatePrayerForSituation(situation, { clientIp: ip }) : null;
  const path      = situation ? `/tools/prayer-generator/?situation=${encodeURIComponent(situation)}` : '/tools/prayer-generator/';
  const title     = situation ? `A prayer for: ${situation}` : 'Prayer Generator';

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
      <p style={{ fontSize: '0.85rem', color: '#8b7355', marginBottom: '0.75rem' }}>
        <Link href="/" style={{ color: '#8b7355', textDecoration: 'none' }}>Home</Link>
        {' › '}<Link href="/tools/" style={{ color: '#8b7355', textDecoration: 'none' }}>Tools</Link>
        {' › '}Prayer Generator
      </p>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem' }}>
        Prayer Generator
      </h1>
      <ShareButtons path={path} title={title} compact />

      <form method="get" style={{ margin: '1.25rem 0 1.5rem' }}>
        <label htmlFor="situation" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Describe the situation</label>
        <textarea
          id="situation"
          name="situation"
          defaultValue={situation}
          placeholder="Describe the situation… e.g. anxiety about a medical test, a friend going through divorce, gratitude for a new job"
          maxLength={200}
          required
          rows={3}
          style={{
            display: 'block', width: '100%', boxSizing: 'border-box',
            padding: '0.6rem 0.85rem',
            border: '1px solid #d4c5a9', borderRadius: '0.5rem',
            fontSize: '1rem', backgroundColor: 'white',
            fontFamily: 'inherit', resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#8b7355' }}>Up to 200 characters.</span>
          <button type="submit" style={{
            backgroundColor: '#1e2d4a', color: 'white',
            padding: '0.6rem 1.5rem', borderRadius: '0.5rem',
            border: 'none', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
          }}>
            Write My Prayer
          </button>
        </div>
      </form>

      {/* Quick-pick suggestions */}
      {!situation && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#6b5c45', margin: '0 0 0.5rem' }}>Or pick a suggestion:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {PRAYER_SITUATIONS.map(s => (
              <Link key={s} href={`/tools/prayer-generator/?situation=${encodeURIComponent(s)}`} style={{
                display: 'inline-block', backgroundColor: 'white',
                border: '1px solid #d4c5a9', borderRadius: '2rem',
                padding: '0.35rem 0.85rem', fontSize: '0.82rem',
                color: '#2c4270', fontFamily: 'Georgia, serif',
                textDecoration: 'none',
              }}>
                {s}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        result.error ? (
          <div style={{ backgroundColor: '#fdf3f3', border: '1px solid #e9c8c8', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', color: '#8b3a3a' }}>
            {result.error}
          </div>
        ) : (
          <div style={{ backgroundColor: '#fffdf7', border: '1px solid #e8dfc8', borderLeft: '4px solid #b8860b', borderRadius: '0.75rem', padding: '1.5rem 1.75rem', marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#8b7355', fontStyle: 'italic' }}>
              A prayer for: {situation}
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.05rem', color: '#2c4270', lineHeight: 1.85, margin: 0, whiteSpace: 'pre-wrap' }}>
              {result.prayer}
            </p>
          </div>
        )
      )}

      {/* SEO intro */}
      <section style={{ color: '#4a4035', fontSize: '0.97rem', lineHeight: 1.75, marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', color: '#1e2d4a', margin: '0 0 0.75rem' }}>
          When you don&rsquo;t know what to pray
        </h2>
        <p>
          Prayer is meant to be honest, not eloquent. But there are moments — a midnight diagnosis, a hard conversation tomorrow, a friend in grief — when even honest words won&rsquo;t come. The Prayer Generator is a small tool for those moments. You describe the situation in a sentence or two, and it writes a short, reverent Christian prayer (four to eight sentences) you can read aloud, send to a friend, or use as the opening of your own longer prayer.
        </p>
        <p>
          Every prayer is written fresh for the situation you describe. They address God reverently, draw on the themes of Scripture, and end with &ldquo;In Jesus&rsquo; name, Amen.&rdquo; They are meant to give you words to start with, not to replace your own voice. After reading the generated prayer, take a quiet moment to make it your own — add the names, the specifics, the parts only you and God know.
        </p>
        <p>
          For a Bible verse to pair with your prayer, try the{' '}
          <Link href="/tools/bible-verse-generator/" style={{ color: '#b8860b' }}>Bible Verse Generator</Link> on the same topic. To read what Scripture says about prayer itself, see our{' '}
          <Link href="/topics/" style={{ color: '#b8860b' }}>study topics</Link> and{' '}
          <Link href="/questions/" style={{ color: '#b8860b' }}>answered questions</Link>. For a daily rhythm, the{' '}
          <Link href="/tools/daily-bible-verse/" style={{ color: '#b8860b' }}>Daily Bible Verse</Link> is a simple way to start each morning with Scripture.
        </p>
      </section>

      <ShareButtons path={path} title={title} label="Share this tool:" />
    </div>
  );
}
// step0-rebuild-marker
