export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { articleUrl } from '../lib/articlePage.js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}

const FEATURED_PASSAGES = [
  { book: 'john',         chapter: 3,  label: 'John 3',    desc: 'Born Again — Jesus and Nicodemus' },
  { book: 'psalms',       chapter: 23, label: 'Psalm 23',  desc: 'The Lord Is My Shepherd' },
  { book: 'romans',       chapter: 8,  label: 'Romans 8',  desc: 'No Condemnation in Christ' },
  { book: 'matthew',      chapter: 5,  label: 'Matthew 5', desc: 'The Sermon on the Mount' },
  { book: 'genesis',      chapter: 1,  label: 'Genesis 1', desc: 'In the Beginning — Creation' },
  { book: '1corinthians', chapter: 13, label: '1 Cor 13',  desc: 'The Love Chapter' },
];

// ─── Small shared UI pieces ──────────────────────────────────────────────────

function SectionHeader({ title, href, linkLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', fontWeight: 'bold', color: '#1e2d4a', margin: 0 }}>
        {title}
      </h2>
      {href && (
        <Link href={href} style={{ color: '#b8860b', fontSize: '0.875rem', textDecoration: 'none', fontWeight: '500' }}>
          {linkLabel || 'View all →'}
        </Link>
      )}
    </div>
  );
}

function ArticleRow({ href, title }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        backgroundColor: 'white', border: '1px solid #e8dfc8',
        borderRadius: '0.5rem', padding: '0.875rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#2c4270', fontWeight: '500', fontFamily: 'Georgia, serif', fontSize: '0.95rem' }}>{title}</span>
        <span style={{ color: '#b8860b', flexShrink: 0 }}>→</span>
      </div>
    </Link>
  );
}

function ArticleCard({ href, title, category }) {
  const catLabel = category ? category.replace(/-/g, ' ') : '';
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        backgroundColor: 'white', border: '1px solid #e8dfc8',
        borderRadius: '0.75rem', padding: '1.1rem 1.25rem',
        height: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem',
      }}>
        {catLabel && (
          <span style={{ fontSize: '0.72rem', color: '#8b7355', textTransform: 'capitalize', fontWeight: '600' }}>
            {catLabel}
          </span>
        )}
        <span style={{ color: '#1e2d4a', fontFamily: 'Georgia, serif', fontSize: '0.95rem', fontWeight: '500', lineHeight: 1.4 }}>
          {title}
        </span>
        <span style={{ color: '#b8860b', fontSize: '0.8rem', marginTop: 'auto' }}>Read →</span>
      </div>
    </Link>
  );
}

// ─── Data fetching ────────────────────────────────────────────────────────────

export default async function Home() {
  const supabase = getSupabase();

  let recentGuides        = [];
  let recentQuestions     = [];
  let trendingArticles    = [];
  let recentlyAdded       = [];
  let bibleVerseArticles  = [];
  let bibleCharArticles   = [];
  let exploreTopics       = [];
  let popularTopics       = [];
  let youMayAlsoLike      = [];

  if (supabase) {
    // Step 1 — fetch ALL topics in one query
    const { data: allTopicsData, error: topicsError } = await supabase
      .from('topics')
      .select('id, name, category')
      .order('name');
    if (topicsError) console.error('[Home] topics query failed:', topicsError.message);
    const allTopics = Array.isArray(allTopicsData) ? allTopicsData : [];

    const byCategory = (cat) =>
      allTopics.filter(t => t.category?.toLowerCase() === cat.toLowerCase()).map(t => t.id);

    const guideTopicIds       = byCategory('guides');
    const questionTopicIds    = byCategory('questions');
    const bibleVersesTopicIds = byCategory('Bible-Verses');
    const bibleCharsTopicIds  = byCategory('Bible-Characters');

    // "Explore Topics" — topics category entries (show distinct topic names)
    exploreTopics = allTopics
      .filter(t => t.category?.toLowerCase() === 'topics')
      .slice(0, 6);

    // "Popular Topics" — mix of all categories as nav tags (max 12)
    popularTopics = allTopics.slice(0, 12);

    // Cutoff for "Recently Added"
    const cutoff72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    // Step 2 — all article queries in parallel
    const articleQuery = (topicIds, limit = 5) =>
      topicIds.length > 0
        ? supabase.from('articles').select('slug, title, topics(name, category)')
            .in('topic_id', topicIds).eq('status', 'published')
            .order('created_at', { ascending: false }).limit(limit)
        : Promise.resolve({ data: [] });

    const [
      guidesRes,
      questionsRes,
      trendingRes,
      recentRes,
      bibleVersesRes,
      bibleCharsRes,
    ] = await Promise.all([
      articleQuery(guideTopicIds, 5),
      articleQuery(questionTopicIds, 5),
      // Trending = highest link_count (most interlinked = most authoritative)
      supabase.from('articles').select('slug, title, topics(name, category)')
        .eq('status', 'published')
        .order('link_count', { ascending: false }).limit(6),
      // Recently added = last 72h, newest first
      supabase.from('articles').select('slug, title, topics(name, category)')
        .eq('status', 'published')
        .gte('created_at', cutoff72h)
        .order('created_at', { ascending: false }).limit(6),
      articleQuery(bibleVersesTopicIds, 6),
      articleQuery(bibleCharsTopicIds, 6),
    ]);

    recentGuides       = guidesRes.data       || [];
    recentQuestions    = questionsRes.data    || [];
    trendingArticles   = trendingRes.data     || [];
    recentlyAdded      = recentRes.data       || [];
    bibleVerseArticles = bibleVersesRes.data  || [];
    bibleCharArticles  = bibleCharsRes.data   || [];

    // "You May Also Like" — grab a mix of topics, questions, guides (2 each)
    const mixIds = [
      ...byCategory('topics'),
      ...questionTopicIds.slice(0, 3),
      ...guideTopicIds.slice(0, 3),
    ];
    if (mixIds.length > 0) {
      const { data: mixData } = await supabase.from('articles')
        .select('slug, title, topics(name, category)')
        .in('topic_id', mixIds).eq('status', 'published')
        .order('created_at', { ascending: false }).limit(6);
      youMayAlsoLike = mixData || [];
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const grid6 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' };
  const secWrap = { marginBottom: '3rem' };

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 1rem' }}>

      {/* ── 1. Hero ── */}
      <section style={{
        background: 'linear-gradient(135deg, #1e2d4a 0%, #2c4270 100%)',
        borderRadius: '0 0 1.5rem 1.5rem',
        padding: '4rem 2rem', textAlign: 'center',
        marginBottom: '3rem', color: 'white',
      }}>
        <p style={{ color: '#d4a017', fontSize: '0.9rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'Georgia, serif' }}>
          Thy word is a lamp unto my feet — Psalm 119:105
        </p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 'bold', marginBottom: '1.25rem', lineHeight: 1.2 }}>
          Explore the Word of God
        </h1>
        <p style={{ color: '#c8d8e8', fontSize: '1.1rem', maxWidth: '40rem', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          Read the King James Bible, study topics, find answers to spiritual questions, and grow in your faith through carefully curated guides.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/bible/john/1/" style={{
            backgroundColor: '#d4a017', color: '#1a1208',
            padding: '0.75rem 2rem', borderRadius: '0.5rem',
            fontWeight: 'bold', textDecoration: 'none', fontSize: '1rem',
          }}>Start Reading →</Link>
          <Link href="/guides/" style={{
            backgroundColor: 'transparent', color: 'white',
            padding: '0.75rem 2rem', borderRadius: '0.5rem',
            fontWeight: '500', textDecoration: 'none', fontSize: '1rem',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>Browse Guides</Link>
        </div>
      </section>

      {/* ── 2. Trending Now ── */}
      {trendingArticles.length > 0 && (
        <section style={secWrap}>
          <SectionHeader title="Trending Now" />
          <div style={grid6}>
            {trendingArticles.map(a => (
              <ArticleCard
                key={a.slug}
                href={articleUrl(a.slug, a.topics?.category)}
                title={a.title}
                category={a.topics?.category}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Recently Added ── */}
      {recentlyAdded.length > 0 && (
        <section style={secWrap}>
          <SectionHeader title="Recently Added" />
          <div style={grid6}>
            {recentlyAdded.map(a => (
              <ArticleCard
                key={a.slug}
                href={articleUrl(a.slug, a.topics?.category)}
                title={a.title}
                category={a.topics?.category}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── John 3:16 quote ── */}
      <section style={{
        backgroundColor: '#fffdf7', border: '1px solid #e8dfc8',
        borderLeft: '4px solid #b8860b', borderRadius: '0.75rem',
        padding: '1.75rem 2rem', marginBottom: '3rem', textAlign: 'center',
      }}>
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1.15rem', color: '#2c4270', lineHeight: 1.8, margin: '0 0 0.75rem 0' }}>
          &ldquo;For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.&rdquo;
        </p>
        <p style={{ margin: 0 }}>
          <Link href="/bible/john/3/" style={{ color: '#b8860b', fontWeight: '600', textDecoration: 'none', fontSize: '0.95rem', fontFamily: 'Georgia, serif' }}>
            John 3:16 — Read in context →
          </Link>
        </p>
      </section>

      {/* ── 4. Featured Passages ── */}
      <section style={secWrap}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.75rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '1.5rem', textAlign: 'center' }}>
          Featured Passages
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {FEATURED_PASSAGES.map(({ book, chapter, label, desc }) => (
            <Link key={`${book}-${chapter}`} href={`/bible/${book}/${chapter}/`} className="passage-card" style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: 'white', border: '1px solid #e8dfc8', borderRadius: '0.75rem', padding: '1.25rem' }}>
                <div style={{ color: '#d4a017', fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.4rem' }}>{label}</div>
                <div style={{ color: '#4a4035', fontSize: '0.9rem', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 5 & 6. Study Guides + Questions Answered ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
        <section>
          <SectionHeader title="Study Guides" href="/guides/" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {recentGuides.length === 0
              ? <p style={{ color: '#8b7355', fontSize: '0.875rem', fontStyle: 'italic' }}>No guides published yet.</p>
              : recentGuides.map(a => <ArticleRow key={a.slug} href={`/guides/${a.slug}/`} title={a.title} />)
            }
          </div>
        </section>
        <section>
          <SectionHeader title="Questions Answered" href="/questions/" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {recentQuestions.length === 0
              ? <p style={{ color: '#8b7355', fontSize: '0.875rem', fontStyle: 'italic' }}>No questions published yet.</p>
              : recentQuestions.map(a => <ArticleRow key={a.slug} href={`/questions/${a.slug}/`} title={a.title} />)
            }
          </div>
        </section>
      </div>

      {/* ── 7. Explore Topics ── */}
      {exploreTopics.length > 0 && (
        <section style={secWrap}>
          <SectionHeader title="Explore Topics" href="/topics/" />
          <div style={grid6}>
            {exploreTopics.map(t => (
              <Link key={t.id} href={`/topics/`} style={{ textDecoration: 'none' }}>
                <div style={{
                  backgroundColor: 'white', border: '1px solid #e8dfc8',
                  borderRadius: '0.75rem', padding: '1.1rem 1.25rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ color: '#1e2d4a', fontFamily: 'Georgia, serif', fontSize: '0.95rem', fontWeight: '500' }}>{t.name}</span>
                  <span style={{ color: '#b8860b' }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 8. Bible Verses ── */}
      {bibleVerseArticles.length > 0 && (
        <section style={secWrap}>
          <SectionHeader title="Bible Verses" href="/bible-verses/" />
          <div style={grid6}>
            {bibleVerseArticles.map(a => (
              <ArticleCard
                key={a.slug}
                href={articleUrl(a.slug, a.topics?.category)}
                title={a.title}
                category="Bible Verses"
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 9. Bible Characters ── */}
      {bibleCharArticles.length > 0 && (
        <section style={secWrap}>
          <SectionHeader title="Bible Characters" href="/bible-characters/" />
          <div style={grid6}>
            {bibleCharArticles.map(a => (
              <ArticleCard
                key={a.slug}
                href={articleUrl(a.slug, a.topics?.category)}
                title={a.title}
                category="Bible Characters"
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 10. Popular Topics ── */}
      {popularTopics.length > 0 && (
        <section style={{ ...secWrap, backgroundColor: '#f9f5ee', border: '1px solid #e8dfc8', borderRadius: '1rem', padding: '1.75rem 2rem' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '1.25rem', margin: '0 0 1.25rem 0' }}>
            Popular Topics
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
            {popularTopics.map(t => {
              const cat = t.category?.toLowerCase();
              const href = cat === 'guides' ? '/guides/' : cat === 'questions' ? '/questions/' : cat === 'topics' ? '/topics/' : cat === 'bible-verses' ? '/bible-verses/' : cat === 'bible-characters' ? '/bible-characters/' : '/topics/';
              return (
                <Link key={t.id} href={href} style={{ textDecoration: 'none' }}>
                  <span style={{
                    display: 'inline-block', backgroundColor: 'white',
                    border: '1px solid #d4c5a9', borderRadius: '2rem',
                    padding: '0.4rem 1rem', fontSize: '0.875rem',
                    color: '#2c4270', fontWeight: '500', fontFamily: 'Georgia, serif',
                  }}>
                    {t.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 11. You May Also Like ── */}
      {youMayAlsoLike.length > 0 && (
        <section style={secWrap}>
          <SectionHeader title="You May Also Like" />
          <div style={grid6}>
            {youMayAlsoLike.map(a => (
              <ArticleCard
                key={a.slug}
                href={articleUrl(a.slug, a.topics?.category)}
                title={a.title}
                category={a.topics?.category}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 12. CTA ── */}
      <section style={{
        backgroundColor: '#f5f0e8', border: '1px solid #e8dfc8',
        borderRadius: '1rem', padding: '2.5rem', textAlign: 'center', marginBottom: '3rem',
      }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#1e2d4a', marginBottom: '0.75rem' }}>
          Have a Question?
        </h2>
        <p style={{ color: '#6b5c45', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Browse our library of answered questions about faith, salvation, prayer, and more.
        </p>
        <Link href="/questions/" style={{
          backgroundColor: '#1e2d4a', color: 'white',
          padding: '0.65rem 1.75rem', borderRadius: '0.5rem',
          fontWeight: '500', textDecoration: 'none', fontSize: '0.95rem',
          display: 'inline-block',
        }}>Browse Questions</Link>
      </section>

    </div>
  );
}
