/**
 * Internal Linking Engine for Bible Verse Insights.
 *
 * Detects Bible references (e.g. John 3:16) and converts them into internal
 * hyperlinks — improving SEO and navigation.
 *
 * NOTE: The previous keyword-link map (single-word entries like "faith",
 * "love", "hope", "grace", "prayer") was removed because it violated the
 * project's strict internal-linking rules: no single-word links, no
 * stopwords. All article ↔ article interlinking now flows through the
 * Smart Internal Linker (lib/interlinker.js) which enforces multi-word,
 * multi-content-word phrases.
 *
 * Public API:
 *   addInternalLinks(html, options?)  — for HTML strings (from markdownToHtml)
 *   addLinksToText(text, options?)    — for plain text fields (escapes first)
 */

// ─── Bible Book Name → URL Slug ──────────────────────────────────────────────
// Longer / multi-word names first so the regex matches them before shorter ones.

const BOOK_MAP = {
  'song of solomon': 'songofsolomon',
  '1 thessalonians': '1thessalonians',
  '2 thessalonians': '2thessalonians',
  '1 corinthians': '1corinthians',
  '2 corinthians': '2corinthians',
  '1 chronicles': '1chronicles',
  '2 chronicles': '2chronicles',
  '1 timothy': '1timothy',
  '2 timothy': '2timothy',
  '1 samuel': '1samuel',
  '2 samuel': '2samuel',
  '1 peter': '1peter',
  '2 peter': '2peter',
  '1 kings': '1kings',
  '2 kings': '2kings',
  '1 john': '1john',
  '2 john': '2john',
  '3 john': '3john',
  'philippians': 'philippians',
  'ecclesiastes': 'ecclesiastes',
  'lamentations': 'lamentations',
  'zephaniah': 'zephaniah',
  'deuteronomy': 'deuteronomy',
  'revelation': 'revelation',
  'colossians': 'colossians',
  'zechariah': 'zechariah',
  'habakkuk': 'habakkuk',
  'nehemiah': 'nehemiah',
  'leviticus': 'leviticus',
  'ephesians': 'ephesians',
  'galatians': 'galatians',
  'proverbs': 'proverbs',
  'obadiah': 'obadiah',
  'matthew': 'matthew',
  'numbers': 'numbers',
  'malachi': 'malachi',
  'isaiah': 'isaiah',
  'ezekiel': 'ezekiel',
  'hebrews': 'hebrews',
  'philemon': 'philemon',
  'genesis': 'genesis',
  'haggai': 'haggai',
  'psalms': 'psalms',
  'psalm': 'psalms',
  'nahum': 'nahum',
  'romans': 'romans',
  'judges': 'judges',
  'daniel': 'daniel',
  'joshua': 'joshua',
  'micah': 'micah',
  'hosea': 'hosea',
  'james': 'james',
  'titus': 'titus',
  'exodus': 'exodus',
  'esther': 'esther',
  'jonah': 'jonah',
  'amos': 'amos',
  'mark': 'mark',
  'luke': 'luke',
  'john': 'john',
  'acts': 'acts',
  'joel': 'joel',
  'jude': 'jude',
  'ruth': 'ruth',
  'job': 'job',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Build Regexes Once at Module Level for Performance ───────────────────────

const _bookNames = Object.keys(BOOK_MAP).sort((a, b) => b.length - a.length);
const _bookPattern = _bookNames.map(escapeRegex).join('|');

// Bible reference: "John 3:16" or "Philippians 3:5-6"
// Word boundaries ensure "Johnathan 3:16" does NOT match "John".
const BIBLE_REF_RE = new RegExp(
  `\\b(${_bookPattern})\\s+(\\d{1,3}):(\\d{1,3})(?:-\\d{1,3})?\\b`,
  'gi'
);

// ─── HTML Tokenizer ───────────────────────────────────────────────────────────

/**
 * Split an HTML string into {type:'text'|'tag', value} tokens.
 * Allows safe processing of text nodes only, leaving tags intact.
 */
function tokenizeHtml(html) {
  const tokens = [];
  let lastIndex = 0;
  const tagRe = /<[^>]*>/g;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ type: 'text', value: html.slice(lastIndex, m.index) });
    }
    tokens.push({ type: 'tag', value: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < html.length) {
    tokens.push({ type: 'text', value: html.slice(lastIndex) });
  }
  return tokens;
}

// ─── Text Node Processor ──────────────────────────────────────────────────────

/**
 * Inject Bible reference links into a single plain-text segment.
 * Every Bible-ref occurrence (e.g. "John 3:16") becomes an internal link.
 *
 * Single-word keyword linking has been intentionally removed — it violated
 * the project's strict rules (no single-word links, no stopwords). All
 * article ↔ article linking now goes through lib/interlinker.js.
 */
function processTextNode(text, _usedKeywords, excludeUrls) {
  return text.replace(BIBLE_REF_RE, (match, book, chapter) => {
    const slug = BOOK_MAP[book.toLowerCase()];
    if (!slug) return match;
    const url = `/bible/${slug}/${chapter}/`;
    if (excludeUrls && excludeUrls.has(url)) return match;
    return `<a href="${url}" class="internal-link">${match}</a>`;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add internal links to an HTML string.
 *
 * - Bible references (John 3:16, Romans 8:28, …) → /bible/{book}/{chapter}/
 * - Existing <a> tags are never modified
 * - Sentences are never broken
 *
 * @param {string} html           HTML string, e.g. from markdownToHtml()
 * @param {object} [options]
 * @param {string[]} [options.exclude]  URLs to skip
 * @returns {string}
 */
export function addInternalLinks(html, options = {}) {
  if (!html) return html;
  const excludeUrls = options.exclude ? new Set(options.exclude) : null;
  const tokens = tokenizeHtml(html);
  let insideAnchor = 0;

  return tokens.map((t) => {
    if (t.type === 'tag') {
      if (/^<a[\s>]/i.test(t.value)) insideAnchor++;
      if (/^<\/a>/i.test(t.value)) insideAnchor = Math.max(0, insideAnchor - 1);
      return t.value;
    }
    if (insideAnchor > 0) return t.value;
    return processTextNode(t.value, null, excludeUrls);
  }).join('');
}

/**
 * Convenience wrapper for plain text fields (non-HTML).
 * HTML-escapes the text first, then injects internal links.
 *
 * @param {string} text           Plain text string
 * @param {object} [options]      Same as addInternalLinks options
 * @returns {string}  HTML-safe string with links injected
 */
export function addLinksToText(text, options = {}) {
  if (!text) return text;
  return addInternalLinks(escapeHtml(text), options);
}
// step0-rebuild-marker
