export const dynamic = 'force-dynamic';

import { getNoStoreSupabase, articleUrl } from '../../lib/articlePage.js';

const SITE_URL = 'https://bibleverseinsights.com';

export async function GET() {
  const supabase = getNoStoreSupabase();

  let articles = [];
  if (supabase) {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('articles')
      .select('slug, created_at, topics(category)')
      .eq('status', 'published')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(300);
    articles = data || [];
  }

  const urls = articles.map(a => {
    const loc         = `${SITE_URL}${articleUrl(a.slug, a.topics?.category)}`;
    const lastmod     = new Date(a.created_at || Date.now()).toISOString().split('T')[0];
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800',
    },
  });
}
// step0-rebuild-marker
