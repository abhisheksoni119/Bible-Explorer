// Centralized friendly copy for duplicate-article conflicts.
// After the simplification: drafts no longer block generation (they're
// auto-replaced), so the only conflict the UI can ever see is a collision
// with a PUBLISHED article. Live content is never overwritten.

export const DUPLICATE_COPY = {
  PUBLISHED_ARTICLE_EXISTS: 'A published article already exists for this topic — cannot recreate.',
  PUBLISHED_SLUG_EXISTS:    'That slug is already used by a published article — cannot recreate.',
};

export const DEFAULT_DUPLICATE_COPY = 'Already covered by a published article.';

export function friendlyDuplicateCopy({ code, fallback } = {}) {
  if (code && DUPLICATE_COPY[code]) return DUPLICATE_COPY[code];
  const raw = String(fallback || '');
  const lower = raw.toLowerCase();
  if (lower.includes('published') && lower.includes('slug'))    return DUPLICATE_COPY.PUBLISHED_SLUG_EXISTS;
  if (lower.includes('published') && lower.includes('article')) return DUPLICATE_COPY.PUBLISHED_ARTICLE_EXISTS;
  return raw || DEFAULT_DUPLICATE_COPY;
}
// step0-rebuild-marker
