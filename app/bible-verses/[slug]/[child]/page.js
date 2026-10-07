export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { topicSlug } from '../../../../lib/topicSlug.js';
import { ARTICLE_STYLES } from '../../../../lib/articlePage.js';
import { JsonLd, buildArticleSchema, buildFAQSchema } from '../../../../lib/seoSchema.js';

const SITE_URL = 'https://bibleverseinsights.com';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}

async function resolveChild(parentSlug, childSlug) {
  const supabase = getSupabase();
  if (!supabase) return {};

  const { data: allParents } = await supabase
    .from('topics')
    .select('id, name')
    .eq('category', 'bible-verses')
    .is('parent_id', null);

  const parentTopic = (allParents || []).find(t => topicSlug(t.name) === parentSlug);
  if (!parentTopic) return {};

  const { data: siblings } = await supabase
    .from('topics')
    .select('id, name')
    .eq('parent_id', parentTopic.id)
    .order('name');

  const childTopic = (siblings || []).find(t => topicSlug(t.name) === childSlug);
  if (!childTopic) return { parentTopic };

  const { data: articles } = await supabase
    .from('articles')
    .select('id, slug, title, meta_description, content, meta_title, keywords, created_at')
    .eq('topic_id', childTopic.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const siblingLinks = (siblings || []).filter(t => t.id !== childTopic.id);

  return {
    articles:    articles || [],
    parentTopic,
    childTopic,
    siblings:    siblingLinks,
  };
}

export async function generateMetadata({ params }) {
  const { slug, child } = await params;
  const { articles, parentTopic, childTopic } = await resolveChild(slug, child);

  if (!parentTopic || !childTopic) return { title: 'Not Found', robots: { index: false } };

  // Canonical must point at the final route that returns HTTP 200, not the
  // legacy `/bible-verses-about-…` URL — middleware 301-redirects that to
  // `/bible-verses/<slug>/<child>/`, and a canonical pointing at a redirect
  // is exactly the duplicate-content signal we are trying to eliminate.
  const canonical = `${SITE_URL}/bible-verses/${slug}/${child}/`;
  const primary   = articles[0];

  return {
    title:       primary?.meta_title || `Bible Verses About ${childTopic.name} | Bible Verse Insights`,
    description: primary?.meta_description || `Explore Bible verses about ${childTopic.name}. Scripture passages and in-depth commentary.`,
    keywords:    primary && Array.isArray(primary.keywords) ? primary.keywords.join(', ') : undefined,
    alternates:  { canonical },
    robots:      { index: true, follow: true },
    openGraph: {
      title:       primary?.meta_title || `Bible Verses About ${childTopic.name}`,
      description: primary?.meta_description || `Explore Bible verses about ${childTopic.name}.`,
      url:         canonical,
      siteName:    'Bible Verse Insights',
      type:        primary ? 'article' : 'website',
    },
  };
}

const RELATED_CATEGORIES = [
  { href: '/guides/',    label: 'Bible Guides' },
  { href: '/questions/', label: 'Bible Questions' },
];

export default async function BibleVersesChildPage({ params }) {
  const { slug, child } = await params;
  const { articles, parentTopic, childTopic, siblings } = await resolveChild(slug, child);

  if (!parentTopic || !childTopic) notFound();
  const hasArticles = articles.length > 0;
  const singleArticle = articles.length === 1 ? articles[0] : null;

  // Auto-generated JSON-LD: Article + optional FAQPage (single-article path only).
  const articleSchema = singleArticle
    ? buildArticleSchema({
        article: singleArticle,
        url:     `${SITE_URL}/bible-verses/${slug}/${child}/`,
      })
    : null;
  const faqSchema = singleArticle ? buildFAQSchema(singleArticle.content || '') : null;

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={faqSchema} />
      {hasArticles && <style suppressHydrationWarning>{ARTICLE_STYLES}</style>}

      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2.5rem 1rem' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#8b7355', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: '#b8860b', textDecoration: 'none' }}>Home</Link>
          <span>›</span>
          <Link href="/bible-verses/" style={{ color: '#b8860b', textDecoration: 'none' }}>Bible Verses</Link>
          <span>›</span>
          <Link href={`/bible-verses-about-${slug}/`} style={{ color: '#b8860b', textDecoration: 'none' }}>
            {parentTopic.name}
          </Link>
          <span>›</span>
          <span style={{ color: '#8b7355' }}>{childTopic.name}</span>
        </div>

        {/* ── Single article: show content inline ── */}
        {singleArticle ? (
          <>
            <article style={{ backgroundColor: 'white', border: '1px solid #e8dfc8', borderRadius: '1rem', padding: 'clamp(1.5rem, 5vw, 2.5rem)', boxShadow: '0 2px 12px rgba(30,45,74,0.06)' }}>

              <Link href="/bible-verses/" style={{ textDecoration: 'none' }}>
                <span style={{ display: 'inline-block', backgroundColor: '#f5f0e8', color: '#8b7355', fontSize: '0.78rem', padding: '0.2rem 0.75rem', borderRadius: '1rem', border: '1px solid #e8dfc8', marginBottom: '1rem' }}>
                  Bible Verses
                </span>
              </Link>

              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '2rem', lineHeight: 1.3 }}>
                {singleArticle.title}
              </h1>

              <div
                className="prose-content article-prose"
                dangerouslySetInnerHTML={{ __html: singleArticle.content || '' }}
              />
            </article>
          </>
        ) : articles.length > 1 ? (
          /* ── Multiple articles: listing ── */
          <>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem', lineHeight: 1.3 }}>
              Bible Verses About {childTopic.name}
            </h1>
            <p style={{ color: '#6b5c45', fontSize: '1rem', lineHeight: 1.75, marginBottom: '2rem' }}>
              Browse all Bible verse articles about {childTopic.name} below.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
              {articles.map(article => (
                <div key={article.id} style={{ backgroundColor: 'white', border: '1px solid #e8dfc8', borderRadius: '0.875rem', padding: '1.5rem' }}>
                  <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 'bold', color: '#2c4270', margin: '0 0 0.625rem' }}>
                    {article.title}
                  </h2>
                  {article.meta_description && (
                    <p style={{ color: '#6b5c45', fontSize: '0.875rem', lineHeight: 1.65, margin: '0 0 1rem' }}>
                      {article.meta_description.length > 140
                        ? article.meta_description.slice(0, 140) + '…'
                        : article.meta_description}
                    </p>
                  )}
                  <span style={{ color: '#b8860b', fontSize: '0.875rem', fontWeight: '500' }}>Read →</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* ── No published articles yet: topic landing page ── */
          <div>
            <Link href="/bible-verses/" style={{ textDecoration: 'none' }}>
              <span style={{ display: 'inline-block', backgroundColor: '#f5f0e8', color: '#8b7355', fontSize: '0.78rem', padding: '0.2rem 0.75rem', borderRadius: '1rem', border: '1px solid #e8dfc8', marginBottom: '1rem' }}>
                Bible Verses
              </span>
            </Link>

            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.75rem', lineHeight: 1.3 }}>
              Bible Verses About {childTopic.name}
            </h1>

            <p style={{ color: '#6b5c45', fontSize: '1rem', lineHeight: 1.75, marginBottom: '2rem', maxWidth: '40rem' }}>
              We're working on an in-depth collection of Bible verses about {childTopic.name}. In the meantime, explore related topics below.
            </p>
          </div>
        )}

        {/* ── Internal linking ── */}
        <div style={{ marginTop: '2rem', display: 'grid', gap: '1.5rem' }}>

          <div style={{ borderTop: '1px solid #e8dfc8', paddingTop: '1.5rem' }}>
            <p style={{ color: '#6b5c45', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              More on {parentTopic.name}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <Link
                href={`/bible-verses-about-${slug}/`}
                style={{ padding: '0.4rem 1rem', background: '#2c4270', color: 'white', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500' }}
              >
                ← All {parentTopic.name} verses
              </Link>
              {siblings.slice(0, 5).map(s => (
                <Link
                  key={s.id}
                  href={`/bible-verses-about-${slug}/${topicSlug(s.name)}/`}
                  style={{ padding: '0.4rem 1rem', background: '#f5f0e8', color: '#2c4270', border: '1px solid #e8dfc8', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e8dfc8', paddingTop: '1.5rem' }}>
            <p style={{ color: '#6b5c45', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Explore More
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <Link href="/bible-verses/" style={{ padding: '0.4rem 1rem', background: '#f5f0e8', color: '#2c4270', border: '1px solid #e8dfc8', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}>
                All Bible Verses
              </Link>
              {RELATED_CATEGORIES.map(cat => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  style={{ padding: '0.4rem 1rem', background: '#f5f0e8', color: '#2c4270', border: '1px solid #e8dfc8', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
// step0-rebuild-marker
