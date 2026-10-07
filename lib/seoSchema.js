/**
 * Auto-generated JSON-LD structured data for SEO.
 *
 * One small server component (<JsonLd>) plus three pure builders:
 *   - buildArticleSchema({ article, url })   → schema.org/Article
 *   - buildFAQSchema(html)                   → schema.org/FAQPage  (or null)
 *   - buildWebSiteSchema()                   → schema.org/WebSite
 *
 * Wire these in once at the shared layout / article factory and every page
 * gets the right structured data automatically — no per-page boilerplate.
 */

const SITE_URL  = 'https://bibleverseinsights.com';
const SITE_NAME = 'Bible Verse Insights';

/**
 * Server component that emits a JSON-LD <script>. Safely escapes "</" so a
 * stray `</script>` inside the JSON cannot break out of the script tag.
 */
export function JsonLd({ data }) {
  if (!data) return null;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

/**
 * Build an Article JSON-LD object from a DB row.
 * Required by user spec: headline, datePublished, author.
 */
export function buildArticleSchema({ article, url }) {
  if (!article) return null;
  const headline      = article.meta_title || article.title;
  const datePublished = article.created_at || undefined;
  const dateModified  = article.updated_at || article.created_at || undefined;
  const description   = article.meta_description || undefined;

  // Author: prefer the article's own author_name column when present,
  // otherwise attribute to the site itself as an Organization.
  const author = article.author_name
    ? { '@type': 'Person',       name: article.author_name }
    : { '@type': 'Organization', name: SITE_NAME, url: SITE_URL };

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'Article',
    headline,
    datePublished,
    dateModified,
    author,
    publisher: {
      '@type': 'Organization',
      name:    SITE_NAME,
      url:     SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id':   url,
    },
    url,
  };
  if (description) schema.description = description;

  // Strip undefined keys so the JSON output is clean.
  for (const k of Object.keys(schema)) {
    if (schema[k] === undefined) delete schema[k];
  }
  return schema;
}

/**
 * Detect FAQ-style content in an article HTML body.
 *
 * Heuristic: any <h2> or <h3> whose plain-text content ends with "?" is
 * treated as a question. The answer is everything that follows up to the
 * next h2/h3 (or end of content), with all tags stripped to plain text.
 *
 * Returns a FAQPage JSON-LD object, or null if fewer than 2 Q/A pairs were
 * found (Google considers a single Q/A weak signal — require at least 2).
 */
export function buildFAQSchema(html) {
  if (!html || typeof html !== 'string') return null;

  const headingRe = /<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings = [];
  let m;
  while ((m = headingRe.exec(html)) !== null) {
    headings.push({ start: m.index, end: m.index + m[0].length, text: stripTags(m[2]).trim() });
  }
  if (headings.length === 0) return null;

  const faqs = [];
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (!h.text.endsWith('?')) continue;
    const answerStart = h.end;
    const answerEnd   = i + 1 < headings.length ? headings[i + 1].start : html.length;
    const answerHtml  = html.slice(answerStart, answerEnd);
    const answerText  = stripTags(answerHtml).replace(/\s+/g, ' ').trim();
    if (answerText.length < 20) continue; // skip headings with no real answer
    faqs.push({ q: h.text, a: answerText });
  }
  if (faqs.length < 2) return null;

  return {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name:    q,
      acceptedAnswer: {
        '@type': 'Answer',
        text:    a,
      },
    })),
  };
}

/**
 * Build a WebSite JSON-LD object. Emitted globally from the root layout so
 * every page (homepage, category indexes, articles, bible chapters) carries it.
 */
export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type':    'WebSite',
    name:       SITE_NAME,
    url:        SITE_URL + '/',
    publisher: {
      '@type': 'Organization',
      name:    SITE_NAME,
      url:     SITE_URL,
    },
    inLanguage: 'en',
  };
}

// ── internal helpers ──────────────────────────────────────────────────────────

function stripTags(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
// step0-rebuild-marker
