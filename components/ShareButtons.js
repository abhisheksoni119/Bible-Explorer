// Server component — renders 5 share buttons. Each is a plain anchor tag
// (target=_blank) so it works without JavaScript. URL templates per the spec.
//
// Props:
//   path  — site-relative path of the page being shared (e.g. "/tools/daily-bible-verse/")
//   title — page title to share
//   compact — boolean; if true, render smaller buttons (used "below title")

const SITE = 'https://bibleverseinsights.com';

function buildLinks(url, title) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    { name: 'Facebook',  bg: '#1877f2', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: 'Twitter',   bg: '#000000', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { name: 'WhatsApp',  bg: '#25d366', href: `https://api.whatsapp.com/send?text=${t}%20${u}` },
    { name: 'Telegram',  bg: '#0088cc', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { name: 'Pinterest', bg: '#bd081c', href: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}` },
  ];
}

export default function ShareButtons({ path, title, compact = false, label = 'Share:' }) {
  const url   = `${SITE}${path || '/'}`;
  const links = buildLinks(url, title || 'Bible Verse Insights');
  const padding = compact ? '0.35rem 0.75rem' : '0.5rem 1rem';
  const fontSize = compact ? '0.78rem' : '0.85rem';

  return (
    <div
      role="group"
      aria-label="Share this page"
      style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
        alignItems: 'center', margin: compact ? '0.75rem 0' : '1.25rem 0',
      }}
    >
      <span style={{ fontSize: '0.85rem', color: '#6b5c45', fontWeight: 500 }}>{label}</span>
      {links.map(link => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${link.name}`}
          style={{
            backgroundColor: link.bg, color: 'white',
            padding, borderRadius: '0.375rem',
            fontSize, fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-block',
            lineHeight: 1.2,
          }}
        >
          {link.name}
        </a>
      ))}
    </div>
  );
}
// step0-rebuild-marker
