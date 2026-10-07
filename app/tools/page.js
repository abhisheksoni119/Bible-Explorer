import Link from 'next/link';
import BibleGamesLink from '../../components/BibleGamesLink.js';

export const metadata = {
  title: 'Bible Tools — Generators, Finders & Daily Verse | Bible Verse Insights',
  description:
    'Free Bible tools: verse generator, verse finder by keyword, daily Bible verse, prayer generator, emotion-based verse finder, and chapter summaries. Plus interactive Bible games online.',
  alternates: { canonical: 'https://bibleverseinsights.com/tools/' },
  robots: { index: true, follow: true },
};

const TOOLS = [
  {
    href: '/tools/bible-verse-generator/',
    title: 'Bible Verse Generator',
    desc:  'Enter any topic or emotion and receive a fitting King James Bible verse with a short pastoral explanation.',
    cta:   'Use Tool',
  },
  {
    href: '/tools/bible-verse-finder/',
    title: 'Bible Verse Finder',
    desc:  'Search by keyword and find 5–10 hand-picked KJV verses on the topic, ready to read or share.',
    cta:   'Use Tool',
  },
  {
    href: '/tools/daily-bible-verse/',
    title: 'Daily Bible Verse',
    desc:  'A new verse every day, drawn from the most beloved passages of the Bible. Perfect for morning devotions.',
    cta:   'Use Tool',
  },
  {
    href: '/tools/prayer-generator/',
    title: 'Prayer Generator',
    desc:  'Describe a situation — anxiety, grief, gratitude, a decision — and receive a short, heartfelt Christian prayer.',
    cta:   'Use Tool',
  },
  {
    href: '/tools/bible-emotion-finder/',
    title: 'Bible Emotion Finder',
    desc:  'Choose how you feel — anxious, joyful, lonely, grateful — and find Scripture that meets you there.',
    cta:   'Use Tool',
  },
  {
    href: '/tools/bible-chapter-summary/',
    title: 'Bible Chapter Summary',
    desc:  'Pick any book and chapter and get a clear 4–6 sentence summary plus the full KJV chapter text.',
    cta:   'Use Tool',
  },
];

const CARD_STYLE = {
  backgroundColor: 'white', border: '1px solid #e8dfc8',
  borderRadius: '0.875rem', padding: '1.5rem',
  display: 'flex', flexDirection: 'column', gap: '0.75rem',
  height: '100%', boxSizing: 'border-box',
};

const BUTTON = {
  display: 'inline-block', marginTop: 'auto',
  backgroundColor: '#1e2d4a', color: 'white',
  padding: '0.55rem 1.25rem', borderRadius: '0.5rem',
  fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem',
  textAlign: 'center',
};

const PLAY_BUTTON = { ...BUTTON, backgroundColor: '#d4a017', color: '#1a1208' };

export default function ToolsIndex() {
  return (
    <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
      {/* Breadcrumbs */}
      <p style={{ fontSize: '0.85rem', color: '#8b7355', marginBottom: '0.75rem' }}>
        <Link href="/" style={{ color: '#8b7355', textDecoration: 'none' }}>Home</Link>
        {' › '}Tools
      </p>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2.25rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem' }}>
        Bible Tools
      </h1>
      <p style={{ color: '#6b5c45', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem' }}>
        Free, fast, ad-light tools to help you study Scripture, encourage your spirit, and pray with intention. Generate a verse for any topic, find passages by keyword or emotion, read a daily Bible verse, summarise any chapter, and even explore fun and interactive Bible games online — all in one place.
      </p>

      {/* Tool grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {TOOLS.map(t => (
          <div key={t.href} style={CARD_STYLE}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.15rem', fontWeight: 'bold', color: '#2c4270', margin: 0 }}>
              {t.title}
            </h2>
            <p style={{ color: '#6b5c45', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              {t.desc}
            </p>
            <Link href={t.href} style={BUTTON}>{t.cta}</Link>
          </div>
        ))}

        {/* Bible Games — external partner card */}
        <div style={{ ...CARD_STYLE, borderColor: '#d4a017', backgroundColor: '#fffdf7' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.15rem', fontWeight: 'bold', color: '#b8860b', margin: 0 }}>
            Bible Games Online
          </h2>
          <p style={{ color: '#6b5c45', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            Play interactive Bible-based games and quizzes to test your knowledge and grow your faith.
          </p>
          <BibleGamesLink style={PLAY_BUTTON}>Play Now</BibleGamesLink>
        </div>
      </div>

      {/* SEO long-form */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#1e2d4a', marginBottom: '0.75rem' }}>
          Why use these tools?
        </h2>
        <div style={{ color: '#4a4035', fontSize: '0.97rem', lineHeight: 1.75 }}>
          <p>
            The Bible is a living book — every page rewards attention. But sometimes you simply need a verse fast: a friend is in the hospital, you are heading into a hard conversation, or a child asks a question over breakfast. These six tools are built for those moments. Each one gives you something to read, something to pray, or something to share in less than thirty seconds.
          </p>
          <p>
            The <Link href="/tools/bible-verse-generator/" style={{ color: '#b8860b' }}>Bible Verse Generator</Link> takes any topic — even an unusual one like &ldquo;jealousy at work&rdquo; or &ldquo;a sick parent&rdquo; — and returns a single fitting KJV verse with a short pastoral note. The <Link href="/tools/bible-verse-finder/" style={{ color: '#b8860b' }}>Bible Verse Finder</Link> goes wider: type a keyword like &ldquo;hope&rdquo; or &ldquo;forgiveness&rdquo; and it shows five to ten hand-picked verses you can copy into a card or post.
          </p>
          <p>
            For daily devotion, the <Link href="/tools/daily-bible-verse/" style={{ color: '#b8860b' }}>Daily Bible Verse</Link> rotates through the most beloved passages in Scripture — a fresh one every morning. The <Link href="/tools/prayer-generator/" style={{ color: '#b8860b' }}>Prayer Generator</Link> writes a short, reverent prayer for any situation you describe, perfect when words feel hard to find. The <Link href="/tools/bible-emotion-finder/" style={{ color: '#b8860b' }}>Bible Emotion Finder</Link> lets you start from how you feel — anxious, grateful, weary, joyful — and meets you there with Scripture.
          </p>
          <p>
            Finally, the <Link href="/tools/bible-chapter-summary/" style={{ color: '#b8860b' }}>Bible Chapter Summary</Link> gives you a clear, faithful overview of any chapter in the King James Bible plus the full chapter text underneath, so you can read the whole passage in context without ever leaving the page. And when you&rsquo;re ready for something playful, our <BibleGamesLink style={{ color: '#b8860b', textDecoration: 'underline' }}>interactive Bible games online</BibleGamesLink> let you test your knowledge of Scripture in quiz, trivia, and puzzle format.
          </p>
          <p>
            Looking for deeper study? Browse our{' '}
            <Link href="/topics/" style={{ color: '#b8860b' }}>study topics</Link>,{' '}
            <Link href="/guides/" style={{ color: '#b8860b' }}>guides</Link>,{' '}
            <Link href="/questions/" style={{ color: '#b8860b' }}>answered questions</Link>, or{' '}
            <Link href="/bible/john/1/" style={{ color: '#b8860b' }}>read the Bible</Link> chapter by chapter.
          </p>
        </div>
      </section>
    </div>
  );
}
// step0-rebuild-marker
