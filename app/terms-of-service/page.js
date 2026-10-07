export const metadata = {
  title: 'Terms of Service | Bible Verse Insights',
  description:
    'The Terms of Service for Bible Verse Insights — content use, intellectual property, disclaimers, and limitation of liability for visitors to bibleverseinsights.com.',
  alternates: { canonical: 'https://bibleverseinsights.com/terms-of-service/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Terms of Service | Bible Verse Insights',
    description:
      'Terms governing use of bibleverseinsights.com — content, intellectual property, disclaimers, and limitation of liability.',
    url: 'https://bibleverseinsights.com/terms-of-service/',
    siteName: 'Bible Verse Insights',
    type: 'article',
  },
};

export default function TermsOfServicePage() {
  return (
    <article className="prose-content" style={{
      maxWidth: '46rem', margin: '0 auto', padding: '2.5rem 1rem 3rem',
      color: '#1a1208', lineHeight: 1.7, fontSize: '1rem',
    }}>
      <h1 style={{ fontFamily: 'Georgia, serif', color: '#1e2d4a', fontSize: '2rem', lineHeight: 1.2, marginBottom: '0.4rem' }}>
        Terms of Service
      </h1>
      <p style={{ color: '#6b6253', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
        Last updated: May 2026
      </p>

      <p>Welcome to Bible Verse Insights.</p>
      <p>By accessing this website, you agree to comply with these Terms of Service.</p>

      <h2>Content</h2>
      <p>
        All articles, devotionals, Bible references, and content published on this website are for
        informational and inspirational purposes only.
      </p>

      <h2>Intellectual Property</h2>
      <p>
        Content on this website may not be copied, reproduced, or redistributed without permission.
      </p>

      <h2>External Links</h2>
      <p>
        We may include links to third-party websites. We are not responsible for their content or practices.
      </p>

      <h2>Disclaimer</h2>
      <p>
        While we strive for accuracy, we do not guarantee that all content is error-free or complete.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        Bible Verse Insights shall not be held liable for any damages arising from the use of this website.
      </p>

      <h2>Changes</h2>
      <p>We may update these Terms at any time without prior notice.</p>

      <h2>Contact</h2>
      <p>For questions regarding these Terms, contact us through our website.</p>
    </article>
  );
}
// step0-rebuild-marker
