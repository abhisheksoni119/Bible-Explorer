export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { isCategoryActive } from '../../lib/categories.js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}

export const metadata = {
  title: 'Study Guides | Bible Verse Insights',
  description: 'In-depth Bible study guides to help you read, understand, and apply Scripture.',
  alternates: { canonical: 'https://bibleverseinsights.com/guides/' },
  robots: { index: true, follow: true },
};

const GUIDE_ICONS = ['📖', '🕊️', '✝️', '📜', '🙏', '⚓', '💡', '🌿'];

export default async function GuidesPage() {
  if (!isCategoryActive('guides')) notFound();

  let articles = [];
  const supabase = getSupabase();

  if (supabase) {
    const { data: topicRows } = await supabase
      .from('topics')
      .select('id')
      .eq('category', 'guides');

    const topicIds = (topicRows || []).map(t => t.id);

    if (topicIds.length > 0) {
      const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, meta_description, created_at')
        .in('topic_id', topicIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[GuidesPage] Supabase error:', error.message);
      } else {
        articles = data || [];
      }
    }
  }

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2.25rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem' }}>
          Study Guides
        </h1>
        <p style={{ color: '#6b5c45', fontSize: '1rem', lineHeight: 1.7 }}>
          In-depth guides to help you read, understand, and apply the Bible. Whether you are just starting out or looking to go deeper, these guides are for you.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {articles.map((article, i) => (
          <Link key={article.slug} href={`/guides/${article.slug}/`} style={{ textDecoration: 'none' }}>
            <div style={{
              backgroundColor: 'white', border: '1px solid #e8dfc8',
              borderRadius: '0.875rem', padding: '1.625rem',
              height: '100%', cursor: 'pointer',
            }}>
              <div style={{ color: '#d4a017', fontSize: '1.5rem', marginBottom: '0.75rem' }}>
                {GUIDE_ICONS[i % GUIDE_ICONS.length]}
              </div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.5rem', margin: '0 0 0.5rem' }}>
                {article.title}
              </h2>
              {article.meta_description && (
                <p style={{ color: '#6b5c45', fontSize: '0.85rem', lineHeight: 1.5, margin: '0.5rem 0 0' }}>
                  {article.meta_description.length > 100
                    ? article.meta_description.slice(0, 100) + '…'
                    : article.meta_description}
                </p>
              )}
            </div>
          </Link>
        ))}
        {articles.length === 0 && (
          <p style={{ color: '#8b7355', fontStyle: 'italic' }}>No guides published yet.</p>
        )}
      </div>
    </div>
  );
}
// step0-rebuild-marker
