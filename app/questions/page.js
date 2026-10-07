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
  title: 'Biblical Questions | Bible Verse Insights',
  description: 'Scripture-grounded answers to common questions about faith, salvation, prayer, and the Christian life.',
  alternates: { canonical: 'https://bibleverseinsights.com/questions/' },
  robots: { index: true, follow: true },
};

export default async function QuestionsPage() {
  if (!isCategoryActive('questions')) notFound();

  let articles = [];
  const supabase = getSupabase();

  if (supabase) {
    const { data: topicRows } = await supabase
      .from('topics')
      .select('id')
      .eq('category', 'questions');

    const topicIds = (topicRows || []).map(t => t.id);

    if (topicIds.length > 0) {
      const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, meta_description, created_at')
        .in('topic_id', topicIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[QuestionsPage] Supabase error:', error.message);
      } else {
        articles = data || [];
      }
    }
  }

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2.25rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem' }}>
          Biblical Questions
        </h1>
        <p style={{ color: '#6b5c45', fontSize: '1rem', lineHeight: 1.7 }}>
          Clear, Scripture-grounded answers to common questions about faith, salvation, prayer, and the Christian life.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {articles.map((article) => (
          <Link key={article.slug} href={`/questions/${article.slug}/`} style={{ textDecoration: 'none' }}>
            <div style={{
              backgroundColor: 'white', border: '1px solid #e8dfc8',
              borderRadius: '0.75rem', padding: '1.25rem 1.5rem',
              transition: 'border-color 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.05rem', fontWeight: '600', color: '#2c4270', margin: '0 0 0.375rem' }}>
                    {article.title}
                  </h2>
                  {article.meta_description && (
                    <p style={{ margin: 0, color: '#6b5c45', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {article.meta_description.length > 120
                        ? article.meta_description.slice(0, 120) + '…'
                        : article.meta_description}
                    </p>
                  )}
                </div>
                <span style={{ color: '#b8860b', flexShrink: 0, fontSize: '1.1rem' }}>→</span>
              </div>
            </div>
          </Link>
        ))}
        {articles.length === 0 && (
          <p style={{ color: '#8b7355', fontStyle: 'italic' }}>No questions published yet.</p>
        )}
      </div>
    </div>
  );
}
// step0-rebuild-marker
