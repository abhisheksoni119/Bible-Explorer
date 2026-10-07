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
  title: 'Study Topics | Bible Verse Insights',
  description: 'Explore key themes of the Christian faith — each topic draws together Scripture, explanation, and practical application.',
  alternates: { canonical: 'https://bibleverseinsights.com/topics/' },
  robots: { index: true, follow: true },
};

export default async function TopicsPage() {
  if (!isCategoryActive('topics')) notFound();

  let articles = [];
  const supabase = getSupabase();

  if (supabase) {
    const { data: topicRows } = await supabase
      .from('topics')
      .select('id')
      .eq('category', 'topics');

    const topicIds = (topicRows || []).map(t => t.id);

    if (topicIds.length > 0) {
      const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, meta_description, created_at')
        .in('topic_id', topicIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[TopicsPage] Supabase error:', error.message);
      } else {
        articles = data || [];
      }
    }
  }

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2.25rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem' }}>
          Study Topics
        </h1>
        <p style={{ color: '#6b5c45', fontSize: '1rem', lineHeight: 1.7 }}>
          Explore key themes of the Christian faith — each topic draws together Scripture, explanation, and practical application.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {articles.map((article) => (
          <Link key={article.slug} href={`/topics/${article.slug}/`} style={{ textDecoration: 'none' }}>
            <div style={{
              backgroundColor: 'white', border: '1px solid #e8dfc8',
              borderRadius: '0.875rem', padding: '1.5rem',
              height: '100%', cursor: 'pointer',
            }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.15rem', fontWeight: 'bold', color: '#2c4270', marginBottom: '0.625rem', margin: '0 0 0.625rem' }}>
                {article.title}
              </h2>
              {article.meta_description && (
                <p style={{ color: '#6b5c45', fontSize: '0.875rem', lineHeight: 1.65, margin: '0 0 1rem' }}>
                  {article.meta_description.length > 140
                    ? article.meta_description.slice(0, 140) + '…'
                    : article.meta_description}
                </p>
              )}
              <div style={{ marginTop: 'auto', color: '#b8860b', fontSize: '0.875rem', fontWeight: '500' }}>
                Explore topic →
              </div>
            </div>
          </Link>
        ))}
        {articles.length === 0 && (
          <p style={{ color: '#8b7355', fontStyle: 'italic' }}>No topics published yet.</p>
        )}
      </div>
    </div>
  );
}
// step0-rebuild-marker
