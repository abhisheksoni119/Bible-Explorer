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
  title: 'Bible Verses | Bible Verse Insights',
  description: 'Browse Bible verse articles organised by topic.',
  // Self-referencing canonical so this category index isn't treated as a
  // duplicate of the homepage (the root layout sets canonical='/' which
  // every page silently inherits unless it sets its own).
  alternates: { canonical: 'https://bibleverseinsights.com/bible-verses/' },
  robots: { index: true, follow: true },
};

export default async function BibleVersesPage() {
  if (!isCategoryActive('bible-verses')) notFound();

  const supabase = getSupabase();
  let articles = [];

  if (supabase) {
    const batchSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, meta_description, created_at, topics!inner(category)')
        .eq('topics.category', 'bible-verses')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);
      if (error || !data?.length) break;
      articles = articles.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
  }

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: '#8b7355', marginBottom: '0.75rem' }}>
          <Link href="/" style={{ color: '#8b7355', textDecoration: 'none' }}>Home</Link>
          {' › '}Bible Verses
        </p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2.25rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem' }}>
          Bible Verses
        </h1>
        <p style={{ color: '#6b5c45', fontSize: '1rem', lineHeight: 1.7 }}>
          Browse Bible verse articles organised by topic.
        </p>
      </div>

      {articles.length === 0 ? (
        <p style={{ color: '#8b7355', fontStyle: 'italic' }}>
          No published Bible verse articles yet.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {articles.map(article => (
            <Link key={article.id} href={`/bible-verses/${article.slug}/`} style={{ textDecoration: 'none' }}>
              <div style={{
                backgroundColor: 'white', border: '1px solid #e8dfc8',
                borderRadius: '0.875rem', padding: '1.5rem', cursor: 'pointer',
                height: '100%', boxSizing: 'border-box',
              }}>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.05rem', fontWeight: 'bold', color: '#2c4270', margin: '0 0 0.5rem' }}>
                  {article.title}
                </h2>
                {article.meta_description && (
                  <p style={{ color: '#6b5c45', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                    {article.meta_description.length > 120
                      ? article.meta_description.slice(0, 120) + '…'
                      : article.meta_description}
                  </p>
                )}
                <p style={{ margin: 0, color: '#b8860b', fontSize: '0.85rem' }}>Read →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
// step0-rebuild-marker
