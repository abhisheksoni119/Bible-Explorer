export const dynamic = 'force-dynamic';

import { getNoStoreSupabase, articleUrl } from '../lib/articlePage.js';

const SITE_URL = 'https://bibleverseinsights.com';

const TOOL_PAGES = [
  '/tools/',
  '/tools/bible-verse-generator/',
  '/tools/bible-verse-finder/',
  '/tools/daily-bible-verse/',
  '/tools/prayer-generator/',
  '/tools/bible-emotion-finder/',
  '/tools/bible-chapter-summary/',
];

const STATIC_LEGAL_PAGES = [
  '/privacy-policy/',
  '/terms-of-service/',
];

// Stable lastModified for tool pages so we don't churn search-engine recrawl
// signals on every sitemap fetch. Bump this when tool content meaningfully
// changes (data files, page copy, new tools).
const TOOLS_LAST_MODIFIED = new Date('2026-05-02T00:00:00Z');

export default async function sitemap() {
  // Tools section — always included even if Supabase is unavailable.
  const toolEntries = TOOL_PAGES.map((p) => ({
    url:             `${SITE_URL}${p}`,
    lastModified:    p === '/tools/daily-bible-verse/' ? new Date() : TOOLS_LAST_MODIFIED,
    changeFrequency: p === '/tools/daily-bible-verse/' ? 'daily' : 'weekly',
    priority:        p === '/tools/' ? 0.8 : 0.7,
  }));

  const legalEntries = STATIC_LEGAL_PAGES.map((p) => ({
    url:             `${SITE_URL}${p}`,
    lastModified:    TOOLS_LAST_MODIFIED,
    changeFrequency: 'yearly',
    priority:        0.3,
  }));

  const supabase = getNoStoreSupabase();
  if (!supabase) return [...toolEntries, ...legalEntries];

  const { data } = await supabase
    .from('articles')
    .select('slug, created_at, topics(category)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(5000);

  const articles = data || [];

  const articleEntries = articles
    .map((a) => ({
      url:             `${SITE_URL}${articleUrl(a.slug, a.topics?.category)}`,
      lastModified:    new Date(a.created_at || Date.now()),
      changeFrequency: 'monthly',
      priority:        0.85,
    }))
    // Safeguard: never emit duplicate URLs, even if the data contains
    // variants that collide after URL assembly.
    .filter((entry, i, arr) => arr.findIndex(e => e.url === entry.url) === i);

  return [...toolEntries, ...legalEntries, ...articleEntries];
}
// step0-rebuild-marker
