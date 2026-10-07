export const metadata = {
  title: 'Privacy Policy | Bible Verse Insights',
  description:
    'Read the Privacy Policy for Bible Verse Insights — how we handle browser, device, cookie, and analytics information for visitors to our site.',
  alternates: { canonical: 'https://bibleverseinsights.com/privacy-policy/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Privacy Policy | Bible Verse Insights',
    description:
      'How Bible Verse Insights collects, uses, and discloses information about visitors to bibleverseinsights.com.',
    url: 'https://bibleverseinsights.com/privacy-policy/',
    siteName: 'Bible Verse Insights',
    type: 'article',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose-content" style={{
      maxWidth: '46rem', margin: '0 auto', padding: '2.5rem 1rem 3rem',
      color: '#1a1208', lineHeight: 1.7, fontSize: '1rem',
    }}>
      <h1 style={{ fontFamily: 'Georgia, serif', color: '#1e2d4a', fontSize: '2rem', lineHeight: 1.2, marginBottom: '0.4rem' }}>
        Privacy Policy
      </h1>
      <p style={{ color: '#6b6253', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
        Last updated: May 2026
      </p>

      <p>
        Bible Verse Insights (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates{' '}
        <a href="https://bibleverseinsights.com" style={{ color: '#1a56db' }}>https://bibleverseinsights.com</a>.
      </p>
      <p>
        This page informs visitors regarding our policies with the collection, use, and disclosure of personal
        information for users of the website.
      </p>

      <h2>Information We Collect</h2>
      <p>We may collect:</p>
      <ul>
        <li>Browser type</li>
        <li>Device information</li>
        <li>IP address</li>
        <li>Cookies and usage data</li>
      </ul>

      <h2>Google AdSense &amp; Advertising</h2>
      <p>
        We may use third-party advertising services such as Google AdSense that use cookies to serve ads based
        on a user&apos;s prior visits to this website and other websites.
      </p>
      <p>Google may use advertising cookies to provide personalized ads.</p>
      <p>
        Users may opt out of personalized advertising by visiting{' '}
        <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#1a56db' }}>
          https://www.google.com/settings/ads
        </a>.
      </p>

      <h2>Analytics</h2>
      <p>
        We may use analytics tools such as Google Analytics to understand website traffic and improve our
        content.
      </p>

      <h2>External Links</h2>
      <p>
        Our website may contain links to external websites. We are not responsible for the privacy practices
        of those websites.
      </p>

      <h2>Children&apos;s Privacy</h2>
      <p>This website is not directed toward children under 13.</p>

      <h2>Consent</h2>
      <p>By using our website, you consent to our Privacy Policy.</p>

      <h2>Contact</h2>
      <p>If you have any questions, contact us through our website contact form.</p>
    </article>
  );
}
// step0-rebuild-marker
