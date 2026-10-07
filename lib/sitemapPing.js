/**
 * Ping Google with both sitemaps.
 * Fire-and-forget — never throws so it never breaks the caller.
 */
const SITE_URL = 'https://bibleverseinsights.com';

const SITEMAPS = [
  `${SITE_URL}/sitemap.xml`,
  `${SITE_URL}/sitemap-recent.xml`,
];

export async function pingSitemaps() {
  try {
    await Promise.allSettled(
      SITEMAPS.map(sm =>
        fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sm)}`, {
          method: 'GET',
          signal: AbortSignal.timeout(8000),
        }).catch(() => {})
      )
    );
  } catch {
    // intentionally silent
  }
}
// step0-rebuild-marker
