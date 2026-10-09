/**
 * Smart Internal Linking Engine — Bible Verse Insights
 *
 * Pillar / child topic-cluster strategy
 * ────────────────────────────────────────────────────────────────────────────
 *  • Identify the article's role in the cluster:
 *      - parent (its topic has child articles)         → emphasize child links
 *      - child  (its topic has a parent topic)         → link back to pillar +
 *                                                        2-3 sibling articles
 *  • Strict anchor rules (still enforced from the previous task):
 *      - NO single-word links, NO all-stopword phrases
 *      - Every phrase ≥ 2 content words, ideal 3-6 words
 *  • Three placement passes:
 *      1. INLINE phrase matching, in cluster-priority order
 *         (children first for parents; pillar+siblings first for children)
 *      2. MID-CONTENT inserts for unmatched cluster candidates
 *         (sentences distributed at paragraph midpoints, not appended at end)
 *      3. BOTTOM topic-cluster section
 *         (parents → "More in This Topic Cluster" listing children;
 *          children → "Related in This Cluster" listing pillar + siblings)
 *
 * Render-time markers
 * ────────────────────────────────────────────────────────────────────────────
 *  Inserted content uses class="cluster-insert" (paragraphs) and
 *  class="topic-cluster" (section), NOT the legacy data-injected="true"
 *  attribute. The latter is stripped by lib/articlePage.js sanitizeForDisplay
 *  to clean up old artifacts. The new markers survive that sanitizer and
 *  render to users. lib/seoEnrich.js stripArticleLinks knows about both
 *  marker schemes so re-linking is idempotent.
 *
 * Returns { html, linksAdded }
 */

const STOPWORDS = new Set([
  'the','a','an','in','of','for','to','and','or','is','are','was','were','be',
  'been','being','with','that','this','what','how','why','who','when','where',
  'does','do','did','can','will','would','should','have','has','had','from',
  'by','on','at','as','it','its','not','about','but','you','your','we','our',
  'they','their','into','than','more','some','all','one','also','just','very',
  'which','there','bible','god','lord','jesus','christ','holy','says','say',
  'mean','means','life','live','lives','people','person','true','truth','ways',
  'verse','verses','passage','passages','scripture','scriptures','word','words',
  'book','books','chapter','chapters','prayer','pray','prays','read','reads',
  'reading','believe','belief','believers','follower','followers','text','teach',
  'teaching','teachings','heart','hearts','soul','souls','mind','minds',
  'blessing','blessings','blessed','promise','promises','grace','mercy','love',
  'faith','hope','trust','peace','strength','power','according',
]);

// Anchor-text rules
const MIN_WORDS         = 2;
const MAX_WORDS         = 6;
const IDEAL_MIN         = 3;
const IDEAL_MAX         = 6;
const MIN_CONTENT_WORDS = 2;
const MAX_ANCHOR_WORDS  = 8;          // anchors longer than this get truncated (sanitizer caps at 10)

// Cluster-section sizing. Quality over quantity: a small number of genuinely
// useful contextual pointers is the ceiling for mid-content inserts. The
// bottom "Read More" cluster section remains list-based and is not counted
// against this budget.
const MAX_INSERTS              = 4;   // mid-content insert sentences (pass 2)
const BOTTOM_CHILDREN_COUNT    = 14;  // pillar bottom section: child links
const BOTTOM_SIBLINGS_COUNT    = 8;   // child bottom section: sibling links
const SIBLING_CONSIDERATION_CAP = 60; // for inline pass when parent has 1000+ kids

// Opening protection: the first two eligible paragraphs of an article are the
// hook — no inline anchors and no mid-content inserts may target them.
const PROTECTED_OPENING_PARAGRAPHS = 2;

// Verse-setup guard: a paragraph immediately followed by a Bible quotation
// blockquote is part of the verse setup. Inserting between it and the quote
// destroys the reading flow, so that position is always protected.
const BLOCKQUOTE_LOOKAHEAD = 80;

const DANGLING_ANCHOR_TAIL = /\s+(according|to|the|of|in|for|and|with|that|from|by|on|as|about|is|are)$/i;

function isProtectedInsertPosition(html, endOffset) {
  // True when the content right after this position opens with a Bible
  // quotation blockquote (verse setup → quote boundary) or another injected
  // insert paragraph (avoid stacking inserts back-to-back).
  const rest = html.slice(endOffset, endOffset + BLOCKQUOTE_LOOKAHEAD);
  if (/^\s*<blockquote/i.test(rest)) return true;
  if (/^\s*<p[^>]*class="cluster-insert"/i.test(rest)) return true;
  return false;
}

// Contextual insertion (pass 2). MIN_PARAGRAPH_OVERLAP is the minimum number
// of meaningful keywords a paragraph must share with a candidate before we
// will insert a contextual sentence after that paragraph. If no paragraph in
// the body meets the threshold, the candidate is skipped — we never force.
const MIN_PARAGRAPH_OVERLAP = 1;
const MIN_PARAGRAPH_LENGTH  = 40;     // skip very short paragraphs (e.g. lone verse refs)

// Smaller stopword set for paragraph/candidate keyword overlap. Unlike
// STOPWORDS above this DOES NOT filter out topical bible vocabulary
// (love, faith, hope, grace, prayer, etc.) — those words are exactly what
// indicates contextual relevance between a paragraph and a candidate article.
const BASIC_STOPWORDS = new Set([
  'the','this','that','with','from','your','they','their','them','have','been',
  'were','will','would','should','could','what','when','where','which','while',
  'about','these','those','then','than','more','most','some','also','just','very',
  'such','many','much','here','there','only','even','same','into','upon','over',
  'under','through','because','still','again','being','make','makes','made',
  'made','take','takes','taken','give','gives','given','find','finds','found',
  'know','known','kept','keep','keeps','call','called','calls','tell','told',
  'tells','look','looks','looked','come','came','coming','goes','going','went',
  'said','says','say','like','want','wants','wanted','need','needs','needed',
  'each','every','both','either','neither','none','other','others','well','best',
  'good','better','great','small','little','first','last','next','still','always',
  'never','often','sometimes','perhaps','really','rather','quite','very','too',
  'true','truly','clearly','simply','actually',
]);

// Sentence templates by candidate category. The {LINK} placeholder is replaced
// with a properly-anchored hyperlink whose visible text is the candidate's
// title — so the inserted sentence reads as natural prose that introduces the
// linked topic, not a generic "see X" stub. Multiple templates per category
// keep the page from feeling templated when several inserts land nearby; a
// deterministic hash of the candidate's slug picks the variant so re-linking
// stays idempotent.
const INSERT_TEMPLATES = {
  'bible-verses': [
    'For Scripture that speaks directly to this, see {LINK}.',
    'A helpful collection of passages on this can be found in {LINK}.',
    'The Bible has more to say on this — see {LINK}.',
  ],
  'topics': [
    'A fuller treatment of this idea is given in {LINK}.',
    'This theme is explored at greater length in {LINK}.',
    'For background on the wider topic, read {LINK}.',
  ],
  'questions': [
    'A closely related question many readers ask is {LINK}.',
    'This naturally raises the question of {LINK}.',
    'For more on this, see the related question {LINK}.',
  ],
  'bible-characters': [
    'A clear biblical example of this is found in the life of {LINK}.',
    'This same pattern shows up in the story of {LINK}.',
    'For a person whose life embodies this, consider {LINK}.',
  ],
  'guides': [
    'For practical steps on this, see the guide on {LINK}.',
    'A step-by-step walkthrough is available in {LINK}.',
    'For applying this in everyday life, read {LINK}.',
  ],
  'default': [
    'For a deeper look at this, see {LINK}.',
    'Further reading on this topic: {LINK}.',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isContentWord(w) {
  return w.length >= 3 && !STOPWORDS.has(w);
}

// Slugs must be lowercase alphanumerics + hyphens (the same shape produced by
// lib/generator.js sanitiseSlug). Any other shape — empty, uppercase, spaces,
// HTML-meaningful chars — would yield broken anchor targets, so we reject the
// slug at URL build time and let the caller skip the candidate.
const VALID_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function isValidSlug(slug) {
  return typeof slug === 'string' && slug.length > 0 && slug.length <= 200 && VALID_SLUG_RE.test(slug);
}

/**
 * articleUrl(a) — return a clean canonical URL for `a`, or null if `a` does
 * not have enough valid data to produce a usable link. Returning null is the
 * "skip this candidate" signal for every caller.
 */
function articleUrl(a) {
  if (!a || !isValidSlug(a.slug)) return null;
  const cat = a.category || '';
  if (cat === 'questions')         return `/questions/${a.slug}/`;
  if (cat === 'topics')            return `/topics/${a.slug}/`;
  if (cat === 'bible-verses')      return `/bible-verses/${a.slug}/`;
  if (cat === 'bible-characters')  return `/bible-characters/${a.slug}/`;
  return `/guides/${a.slug}/`;
}

function isValidPhrase(phrase) {
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS || words.length > MAX_WORDS) return false;
  return words.filter(isContentWord).length >= MIN_CONTENT_WORDS;
}

function scorePhrase(phrase, source) {
  const words   = phrase.split(/\s+/).filter(Boolean);
  const content = words.filter(isContentWord).length;
  let lenScore  = 0;
  if (words.length >= IDEAL_MIN && words.length <= IDEAL_MAX) lenScore = 10;
  else if (words.length === 2)                                lenScore = 4;
  return lenScore + content * 2 + (source === 'title' ? 2 : 0);
}

function ngrams(words, minN, maxN) {
  const out = [];
  const max = Math.min(maxN, words.length);
  for (let n = max; n >= minN; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      out.push(words.slice(i, i + n).join(' '));
    }
  }
  return out;
}

function buildPhrases(candidate) {
  const titleWords = (candidate.title || '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(Boolean);
  const slugWords = (candidate.slug || '').split('-').filter(Boolean);

  const scored = new Map();
  const consider = (phrase, source) => {
    if (!isValidPhrase(phrase)) return;
    const s = scorePhrase(phrase, source);
    if (!scored.has(phrase) || scored.get(phrase) < s) scored.set(phrase, s);
  };
  for (const p of ngrams(titleWords, MIN_WORDS, MAX_WORDS)) consider(p, 'title');
  for (const p of ngrams(slugWords,  MIN_WORDS, MAX_WORDS)) consider(p, 'slug');

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .map(([p]) => p);
}

function tokenizeHtml(html) {
  const tokens = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) { tokens.push({ type: 'text', value: html.slice(i) }); break; }
      tokens.push({ type: 'tag', value: html.slice(i, end + 1) });
      i = end + 1;
    } else {
      const next = html.indexOf('<', i);
      const end  = next === -1 ? html.length : next;
      tokens.push({ type: 'text', value: html.slice(i, end) });
      i = end;
    }
  }
  return tokens;
}

function buildPhraseRegex(phrase) {
  const words = phrase.split(/\s+/).filter(Boolean);
  const parts = words.map(w => `${escapeRegex(w)}(?:['\u2019]s?)?`);
  return new RegExp(`(?<![a-zA-Z])(${parts.join('\\s+')})(?![a-zA-Z])`, 'i');
}

/**
 * Replace the first occurrence of `phrase` in `html` with an internal link.
 *
 * If `allowedSpans` is provided (an array of [startOffset, endOffset] pairs in
 * the html string), the match is only accepted when its full span lies inside
 * one of those ranges. Pass 1 uses this to require that an inline link land
 * inside a paragraph that shares a topical keyword with the link target —
 * preventing "first lexical match anywhere" placements that produce
 * irrelevant anchors. Pass `null` to skip the contextual check (legacy mode).
 */
function replaceFirstPhrase(html, phrase, linkUrl, allowedSpans = null) {
  if (Array.isArray(allowedSpans) && allowedSpans.length === 0) {
    return { html, replaced: false, anchorText: null };
  }
  const re = buildPhraseRegex(phrase);
  let i = 0, skipDepth = 0, replaced = false, anchorText = null, out = '';

  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) { out += html.slice(i); break; }
      const tag = html.slice(i, end + 1);
      if (/^<(a|blockquote|h[1-6])[\s>]/i.test(tag)) skipDepth++;
      if (/^<\/(a|blockquote|h[1-6])>/i.test(tag))   skipDepth = Math.max(0, skipDepth - 1);
      out += tag;
      i = end + 1;
      continue;
    }
    const next = html.indexOf('<', i);
    const end  = next === -1 ? html.length : next;
    const text = html.slice(i, end);

    if (replaced || skipDepth > 0) { out += text; i = end; continue; }

    const m = re.exec(text);
    if (!m) { out += text; i = end; continue; }

    const matchStart = i + m.index;
    const matchEnd   = matchStart + m[0].length;
    const inAllowed  = !allowedSpans
      ? true
      : allowedSpans.some(([s, e]) => matchStart >= s && matchEnd <= e);

    if (!inAllowed) { out += text; i = end; continue; }

    out += text.slice(0, m.index);
    out += `<a href="${linkUrl}" class="article-link" style="color:#1a56db;text-decoration:underline">${m[1]}</a>`;
    out += text.slice(m.index + m[0].length);
    replaced = true;
    anchorText = m[1];
    i = end;
  }
  return { html: out, replaced, anchorText };
}

/**
 * Compute the byte-offset spans (within `html`) of <p>...</p> blocks whose
 * inner text shares at least one themed keyword with `cKeys`. Used by pass 1
 * to gate inline matching to contextually relevant paragraphs only.
 *
 * Protected positions are always excluded:
 *   - the opening paragraphs (the article hook)
 *   - paragraphs immediately followed by a Bible quotation blockquote
 *     (verse setup → quote boundary)
 *
 * When `requireKeywordOverlap` is false (cluster-priority candidates), every
 * non-protected paragraph qualifies; topical relevance is guaranteed by the
 * cluster relationship itself.
 *
 * Returns:
 *   - an array of [start, end] spans (possibly empty — meaning no paragraph
 *     in the body is on-topic for this candidate, so do NOT inline-link it).
 */
function contextualParagraphSpans(html, cKeys, requireKeywordOverlap = true) {
  const spans = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  let idx = 0;
  while ((m = re.exec(html)) !== null) {
    const inner = m[1];
    const innerStart = m.index + m[0].indexOf('>') + 1;
    const innerEnd   = m.index + m[0].length - '</p>'.length;
    const isProtected = idx < PROTECTED_OPENING_PARAGRAPHS ||
      /^\s*<blockquote/i.test(html.slice(innerEnd, innerEnd + BLOCKQUOTE_LOOKAHEAD));
    idx++;
    if (isProtected) continue;
    if (inner.replace(/<[^>]+>/g, '').trim().length < MIN_PARAGRAPH_LENGTH) continue;
    if (requireKeywordOverlap) {
      const pKeys = paragraphKeywords(inner);
      let overlap = 0;
      for (const k of cKeys) { if (pKeys.has(k)) { overlap++; break; } }
      if (overlap < 1) continue;
    }
    spans.push([innerStart, innerEnd]);
  }
  return spans;
}

// ─── Contextual mid-content insertion ────────────────────────────────────────

/**
 * Extract the keyword set from a chunk of paragraph text.
 *  - Strip HTML tags
 *  - Lowercase
 *  - Keep only alphabetic words ≥ 4 chars
 *  - Drop BASIC_STOPWORDS (but KEEP topical bible vocabulary like love, faith,
 *    grace, prayer — those words are the actual signal of relevance)
 */
function paragraphKeywords(text) {
  const cleaned = text.replace(/<[^>]+>/g, ' ').toLowerCase();
  const words = cleaned.match(/\b[a-z]{4,}\b/g) || [];
  return new Set(words.filter(w => !BASIC_STOPWORDS.has(w)));
}

/**
 * The candidate's themed keyword set, drawn from its title and slug.
 */
function candidateKeywords(c) {
  const titleWords = (c.title || '').toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const slugWords  = (c.slug  || '').split('-').filter(w => w.length >= 4);
  return new Set([...titleWords, ...slugWords].filter(w => !BASIC_STOPWORDS.has(w)));
}

/**
 * Tokenize the body's <p> blocks into analyzable paragraphs.
 * Skips very short paragraphs (e.g. lone verse references) which can't
 * meaningfully establish context.
 */
function analyzeContent(html) {
  const paras = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  let idx = 0;
  while ((m = re.exec(html)) !== null) {
    const inner = m[1];
    if (inner.replace(/<[^>]+>/g, '').trim().length < MIN_PARAGRAPH_LENGTH) continue;
    paras.push({
      idx: idx++,
      start: m.index,
      end: m.index + m[0].length,
      keywords: paragraphKeywords(inner),
    });
  }
  return paras;
}

/**
 * Find the paragraph in `paragraphs` that best matches `candidate` by
 * keyword overlap. Skips paragraphs already used by a previous insert
 * so two contextual sentences don't pile up on the same paragraph.
 *
 * Returns { paragraph, overlap } if any paragraph meets MIN_PARAGRAPH_OVERLAP,
 * otherwise null — and a null result means we DO NOT INSERT this candidate.
 * That's the "don't force" guarantee.
 */
function bestParagraphForCandidate(paragraphs, candidate, usedPositions) {
  const cKeys = candidateKeywords(candidate);
  if (cKeys.size === 0) return null;
  let best = null;
  for (const p of paragraphs) {
    if (usedPositions.has(p.end)) continue;
    let overlap = 0;
    for (const k of cKeys) if (p.keywords.has(k)) overlap++;
    if (overlap < MIN_PARAGRAPH_OVERLAP) continue;
    if (!best || overlap > best.overlap) best = { paragraph: p, overlap };
  }
  return best;
}

/**
 * Truncate a candidate title for use as anchor text.
 * The articlePage.js sanitizer unwraps any anchor with > 10 words; we keep
 * a slightly tighter cap and try to break at a natural punctuation point.
 * Falls back to a humanized slug if the title is missing/empty so we never
 * render literal "undefined" in user-visible HTML.
 */
function safeAnchorTitle(candidate) {
  const titleStr = (candidate && typeof candidate.title === 'string') ? candidate.title.trim() : '';
  const fallback = (candidate && candidate.slug)
    ? candidate.slug.replace(/-/g, ' ').replace(/\b([a-z])/g, (_, c) => c.toUpperCase())
    : 'this article';
  const title = titleStr || fallback;
  const words = title.split(/\s+/).filter(Boolean);

  // Never emit an anchor that ends on a dangling connector or an incomplete
  // phrase fragment (e.g. "…According"). Trim from the tail while the last
  // word is a dangling connector; if that collapses below two words, keep
  // the full title instead (the display sanitizer tolerates up to 10 words).
  function trimDangling(text) {
    let w = text.split(/\s+/).filter(Boolean);
    while (w.length > 0 && DANGLING_ANCHOR_TAIL.test(' ' + w.join(' '))) w.pop();
    return w.join(' ');
  }

  if (words.length <= MAX_ANCHOR_WORDS) {
    const trimmed = trimDangling(title);
    return trimmed.split(/\s+/).filter(Boolean).length >= 2 ? trimmed : title;
  }

  // Prefer a natural punctuation segment (before , : ; or ?) when it fits.
  const m = title.match(/^([^,:;]+)[,:;]/);
  if (m) {
    const seg = trimDangling(m[1].trim());
    const segWords = seg.split(/\s+/).filter(Boolean);
    if (segWords.length >= 2 && segWords.length <= MAX_ANCHOR_WORDS) return seg;
  }

  // Word-boundary truncation that never ends on a dangling connector.
  const cut = trimDangling(words.slice(0, MAX_ANCHOR_WORDS).join(' '));
  const cutWords = cut.split(/\s+/).filter(Boolean);
  if (cutWords.length >= 2) return cut;

  // Last resort: the full title (display sanitizer caps at 10 words).
  return title;
}

/**
 * Deterministic non-cryptographic string hash — used to pick a template
 * variant per candidate so re-links produce stable output.
 */
function simpleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildContextualInsert(candidate) {
  const templates = INSERT_TEMPLATES[candidate.category] || INSERT_TEMPLATES.default;
  const tpl       = templates[simpleHash(candidate.slug || candidate.id || '') % templates.length];
  const rawUrl    = candidate.url || articleUrl(candidate);
  if (!rawUrl) return '';                         // never emit a broken anchor
  const url       = escapeHtml(rawUrl);
  const anchor    = `<a href="${url}" class="article-link" style="color:#1a56db;text-decoration:underline">${escapeHtml(safeAnchorTitle(candidate))}</a>`;
  const sentence  = tpl.replace('{LINK}', anchor);
  return `<p class="cluster-insert" style="margin:1.25rem 0;padding:0.6rem 0.9rem;background:#faf7ee;border-left:3px solid #b8860b;border-radius:0 0.4rem 0.4rem 0;font-style:italic;color:#3a2e1a">${sentence}</p>`;
}

// ─── Bottom cluster section ─────────────────────────────────────────────────

function buildClusterListBlock(heading, items, usedUrls) {
  if (items.length === 0) return '';
  const lis = [];
  for (const item of items) {
    if (!item || !item.title) continue;          // skip invalid item
    const url = articleUrl(item);
    if (!url) continue;                           // skip invalid slug/url
    if (usedUrls.has(url)) continue;              // per-item dedup inside one list
    usedUrls.add(url);
    lis.push(
      `<li style="padding:0.4rem 0;border-bottom:1px solid #f0ebe0"><a href="${escapeHtml(url)}" class="article-link" style="color:#1a56db;text-decoration:none;font-family:Georgia,serif">→ ${escapeHtml(item.title)}</a></li>`
    );
  }
  if (lis.length === 0) return '';
  return `<h3 style="margin-top:0;font-family:Georgia,serif;font-size:1rem;color:#1e2d4a;border-top:none;padding-top:0">${escapeHtml(heading)}</h3><ul style="list-style:none;padding:0;margin:0 0 1rem 0">${lis.join('')}</ul>`;
}

/**
 * Build the bottom "topic cluster" navigation section.
 *
 * - For PARENT articles (their topic has child articles):
 *     "More in This Topic Cluster" listing up to BOTTOM_CHILDREN_COUNT children
 *
 * - For CHILD articles (their topic has a pillar parent):
 *     "Related in This Cluster" listing the pillar mate (if any) + up to
 *     BOTTOM_SIBLINGS_COUNT siblings
 *
 * Articles already linked inline or via mid-content insert are skipped to
 * avoid duplicate URLs. Heading text is intentionally NOT one of the legacy
 * phrases ("Related Articles", "Explore More", etc) so it survives the
 * articlePage.js sanitizer.
 */
function buildBottomSection({ isParent, hasParent, children, pillarMates, siblings, usedUrls }) {
  const blocks = [];
  let added = 0;

  if (isParent && children.length > 0) {
    const items = children
      .filter(c => !usedUrls.has(articleUrl(c)))
      .slice(0, BOTTOM_CHILDREN_COUNT);
    const block = buildClusterListBlock('More in This Topic Cluster', items, usedUrls);
    if (block) { blocks.push(block); added += items.length; }
  }

  if (hasParent) {
    const pillarItems = pillarMates
      .filter(p => !usedUrls.has(articleUrl(p)))
      .slice(0, 1);
    const sibItems = siblings
      .filter(s => !usedUrls.has(articleUrl(s)))
      .slice(0, BOTTOM_SIBLINGS_COUNT);
    const headerItems = [...pillarItems, ...sibItems];
    const block = buildClusterListBlock('Related in This Cluster', headerItems, usedUrls);
    if (block) { blocks.push(block); added += headerItems.length; }
  }

  if (blocks.length === 0) return { html: '', added: 0 };
  return {
    html: `<section class="topic-cluster" style="margin-top:2rem;padding:1.25rem 1.5rem;background:#faf7ee;border:1px solid #e8dfc8;border-radius:0.75rem">${blocks.join('')}</section>`,
    added,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * interlinkArticle(article, pool)
 *
 * @param article  { id, slug, title, content, topic_id, category, parentTopicId }
 * @param pool     Array of { id, slug, title, topic_id, parent_topic_id, category, is_pillar }
 * @returns        { html, linksAdded }
 */
export function interlinkArticle(article, pool) {
  // Fail-safe input guard: malformed callers must NOT crash the pipeline.
  // Returning the original (or empty) content with linksAdded=0 lets bulk
  // relinking skip a single bad row and continue the batch.
  if (!article || typeof article !== 'object') {
    return { html: '', linksAdded: 0 };
  }
  if (!Array.isArray(pool)) pool = [];

  // Self lookup — also recover is_pillar / parent_topic_id from the pool entry.
  const selfId           = article.id;
  const selfFromPool     = pool.find(p => p && p.id === selfId) || {};
  const selfTopic        = article.topic_id    || selfFromPool.topic_id        || null;
  const selfParentTopic  = article.parentTopicId || article.parent_topic_id
                          || selfFromPool.parent_topic_id || null;
  const selfCategory     = article.category    || selfFromPool.category        || '';

  // De-facto pillar definition: any topic that is referenced as some other
  // article's parent_topic_id (the project's `topics.is_pillar` boolean is
  // currently unused). If a topic has child articles, it's a pillar.
  const pillarTopicIds = new Set();
  for (const a of pool) if (a.parent_topic_id) pillarTopicIds.add(a.parent_topic_id);

  const isParent  = !!(selfTopic && pillarTopicIds.has(selfTopic));
  const hasParent = !!selfParentTopic;

  // ── Tier the candidates ──────────────────────────────────────────────────
  const childArticles = []; // articles whose topic.parent_id === my topic_id
  const pillarMates   = []; // articles whose topic_id === my parent_topic_id
  const siblings      = []; // articles sharing my parent_topic_id (or topic_id)
  const cousins       = []; // same category, unrelated cluster
  const others        = [];

  // Per-pool dedup by URL: defends against duplicate (category, slug) rows
  // in the DB and prevents the same target from appearing in multiple tiers.
  const seenUrls = new Set();

  for (const a of pool) {
    if (!a || !a.title || !isValidSlug(a.slug)) continue;
    // Never link to drafts or rejected articles — those URLs are not public.
    if (a.status && a.status !== 'published') continue;
    if (a.id === selfId || a.slug === article.slug) continue;
    const aUrl = articleUrl(a);
    if (!aUrl) continue;                          // truly invalid → skip
    if (seenUrls.has(aUrl)) continue;             // duplicate target → skip
    seenUrls.add(aUrl);

    if (isParent && a.parent_topic_id === selfTopic) {
      childArticles.push(a);
    } else if (hasParent && a.topic_id === selfParentTopic) {
      pillarMates.push(a);
    } else if (hasParent && a.parent_topic_id === selfParentTopic) {
      siblings.push(a);
    } else if (a.topic_id === selfTopic) {
      siblings.push(a); // articles sharing the same exact topic
    } else if (a.category === selfCategory) {
      cousins.push(a);
    } else {
      others.push(a);
    }
  }

  // Score within each tier (existing relevance + cluster bonuses)
  const scoreOf = c => {
    let s = 1;
    if (c.topic_id && c.topic_id === selfTopic)                          s = 10;
    else if (selfParentTopic && c.parent_topic_id === selfParentTopic)   s = 6;
    else if (selfParentTopic && c.topic_id === selfParentTopic)          s = 5;
    else if (c.category === selfCategory)                                s = 3;
    if (c.is_pillar) s += 0.5;
    if (isParent  && c.parent_topic_id === selfTopic)        s += 25; // child of self
    if (hasParent && c.topic_id === selfParentTopic)         s += 20; // pillar mate
    return s;
  };
  const sortTier = arr => arr
    .map(c => ({ c, s: scoreOf(c) }))
    .sort((a, b) => b.s - a.s || a.c.title.localeCompare(b.c.title))
    .map(x => x.c);

  const sortedChildren = sortTier(childArticles);
  const sortedPillar   = sortTier(pillarMates);
  const sortedSiblings = sortTier(siblings).slice(0, SIBLING_CONSIDERATION_CAP);
  const sortedCousins  = sortTier(cousins);
  const sortedOthers   = sortTier(others);

  // Inline candidate ordering: children → pillar mate → siblings → cousins → rest.
  // For pillar pages this guarantees children are tried first, naturally
  // producing the >70% child-link ratio the strategy targets.
  // We also recompute the URL through articleUrl and drop any candidate whose
  // URL came back null (defense in depth — already filtered above).
  const orderedCandidates = [
    ...sortedChildren,
    ...sortedPillar,
    ...sortedSiblings,
    ...sortedCousins,
    ...sortedOthers,
  ]
    .map(c => ({ ...c, url: articleUrl(c) }))
    .filter(c => !!c.url);

  let html = typeof article.content === 'string' ? article.content : '';
  const usedUrls = new Set();

  // ── PASS 1: inline phrase matching (cluster-prioritized + context-gated) ──
  // For each candidate we (a) build allowed phrases (≥2 words, ≥2 content
  // words — never single-word, never all-stopword) and (b) compute the body
  // paragraphs that share at least one topical keyword with the candidate.
  // The phrase match must land INSIDE one of those paragraphs — otherwise we
  // skip the candidate for inline linking. This is the rule that prevents
  // "first lexical match anywhere" anchors like "with God" or "in the".
  // For cluster-priority candidates (this article's children, pillar mate, or
  // direct siblings) the topical relevance is guaranteed BY the cluster
  // structure itself — they're literally about the same topic. We skip the
  // paragraph keyword gate for those so they reliably get an inline anchor
  // even when the body prose doesn't repeat the candidate's title words. The
  // gate still applies to cousins/others where relevance is not guaranteed,
  // preventing the "with God" / "in the" garbage anchors of older versions.
  // OPENING + VERSE-SETUP PROTECTION (all candidates): the allowed paragraph
  // spans always exclude the opening paragraphs and any paragraph immediately
  // followed by a Bible quotation blockquote, so neither anchors nor inserts
  // can land in the hook or inside a verse setup → quote boundary.
  const isClusterPriorityCandidate = c =>
    (isParent  && c.parent_topic_id === selfTopic) ||
    (hasParent && c.topic_id        === selfParentTopic) ||
    (hasParent && c.parent_topic_id === selfParentTopic) ||
    (c.topic_id && c.topic_id === selfTopic);

  const inlineAnchors = [];
  const unmatchedAll = [];
  for (const candidate of orderedCandidates) {
    if (usedUrls.has(candidate.url)) continue;
    const phrases = buildPhrases(candidate);
    if (phrases.length === 0) continue;

    const clusterPriority = isClusterPriorityCandidate(candidate);
    const cKeys           = candidateKeywords(candidate);
    const allowedSpans    = contextualParagraphSpans(html, cKeys, !clusterPriority);

    let matched = false;
    for (const phrase of phrases) {
      const { html: newHtml, replaced, anchorText } = replaceFirstPhrase(html, phrase, candidate.url, allowedSpans);
      if (replaced) {
        html = newHtml;
        usedUrls.add(candidate.url);
        matched = true;
        if (anchorText) inlineAnchors.push(anchorText);
        break;
      }
    }
    if (!matched) unmatchedAll.push({ candidate, phrases, clusterPriority });
  }

  // ── PASS 2: contextual mid-content inserts ───────────────────────────────
  // Each unmatched cluster candidate is placed AFTER the body paragraph that
  // shares the most meaningful keywords with it. If no paragraph shares at
  // least MIN_PARAGRAPH_OVERLAP keyword with the candidate, the candidate is
  // skipped — we never force a sentence that has nothing to do with the
  // surrounding content. Sentence wording rotates through category-specific
  // templates (deterministic by slug hash) so re-links stay idempotent.
  // Pass 2 now considers EVERY unmatched candidate (not just cluster
  // priority). Cluster-priority candidates are tried first so they get the
  // best paragraph fits; cousins/others fill remaining contextual slots if
  // they share a real keyword with a paragraph (the bestParagraphForCandidate
  // overlap rule still guards quality). The MAX_INSERTS ceiling is large
  // enough that typical articles never hit it.
  const sortedUnmatched = [
    ...unmatchedAll.filter(x => x.clusterPriority),
    ...unmatchedAll.filter(x => !x.clusterPriority),
  ];
  const paragraphs    = analyzeContent(html);
  const usedPositions = new Set();
  const insertions    = [];
  const insertAnchors = [];
  for (const { candidate } of sortedUnmatched) {
    if (insertions.length >= MAX_INSERTS) break;
    if (usedUrls.has(candidate.url)) continue;
    const fit = bestParagraphForCandidate(paragraphs, candidate, usedPositions);
    if (!fit) continue;                    // no contextual home → don't force
    // Placement quality gates:
    //  - never in the opening paragraphs (the hook stays clean)
    //  - never directly before a Bible quotation blockquote (that paragraph
    //    is the verse setup — inserting between it and the quote destroys
    //    the reading flow)
    if (fit.paragraph.idx < PROTECTED_OPENING_PARAGRAPHS) continue;
    if (isProtectedInsertPosition(html, fit.paragraph.end)) continue;
    const insertHtml = buildContextualInsert(candidate);
    if (!insertHtml) continue;             // builder rejected → skip silently
    usedPositions.add(fit.paragraph.end);
    insertions.push({
      position: fit.paragraph.end,
      content:  insertHtml,
    });
    insertAnchors.push(safeAnchorTitle(candidate));
    usedUrls.add(candidate.url);
  }
  // Apply in reverse position order so earlier positions stay valid
  insertions.sort((a, b) => b.position - a.position);
  for (const { position, content } of insertions) {
    html = html.slice(0, position) + content + html.slice(position);
  }

  // ── PASS 3: bottom topic-cluster section ─────────────────────────────────
  const bottom = buildBottomSection({
    isParent, hasParent,
    children:    sortedChildren,
    pillarMates: sortedPillar,
    siblings:    sortedSiblings,
    usedUrls,
  });
  html += bottom.html;

  return { html, linksAdded: usedUrls.size, inlineAnchors, insertAnchors, insertCount: insertions.length };
}
// step0-rebuild-marker
