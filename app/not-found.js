import Link from 'next/link';

export const metadata = {
  title: 'Page Not Found — Bible Verse Insights',
};

export default function NotFound() {
  return (
    <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '4rem 1rem', textAlign: 'center' }}>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: '4rem', color: '#b8860b', marginBottom: '0.5rem', lineHeight: 1 }}>
        404
      </p>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.75rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '1rem' }}>
        Page Not Found
      </h1>
      <p style={{ color: '#6b5c45', lineHeight: 1.7, marginBottom: '2.5rem' }}>
        The page you&apos;re looking for doesn&apos;t exist. It may have been moved or the URL may be incorrect.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <Link href="/" style={{
          backgroundColor: '#1e2d4a', color: 'white',
          padding: '0.7rem 1.75rem', borderRadius: '0.5rem',
          textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem',
        }}>
          Go to Homepage
        </Link>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
          <Link href="/topics/" style={{ color: '#b8860b', textDecoration: 'none', fontSize: '0.9rem' }}>Browse Topics</Link>
          <Link href="/questions/" style={{ color: '#b8860b', textDecoration: 'none', fontSize: '0.9rem' }}>Questions</Link>
          <Link href="/guides/" style={{ color: '#b8860b', textDecoration: 'none', fontSize: '0.9rem' }}>Study Guides</Link>
          <Link href="/bible/john/1/" style={{ color: '#b8860b', textDecoration: 'none', fontSize: '0.9rem' }}>Read Bible</Link>
        </div>
      </div>

      <blockquote style={{
        marginTop: '3rem', padding: '1.5rem', backgroundColor: '#fffdf7',
        border: '1px solid #e8dfc8', borderLeft: '4px solid #b8860b',
        borderRadius: '0.625rem', fontFamily: 'Georgia, serif',
        fontStyle: 'italic', color: '#2c4270', lineHeight: 1.8,
      }}>
        &ldquo;Thy word is a lamp unto my feet, and a light unto my path.&rdquo;
        <footer style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontStyle: 'normal', color: '#b8860b', fontWeight: '600' }}>
          — Psalm 119:105
        </footer>
      </blockquote>
    </div>
  );
}
// step0-rebuild-marker
