/**
 * Derive a URL-safe slug from a topic name.
 * Used on both frontend pages and admin generator to keep URLs consistent.
 */
export function topicSlug(name = '') {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
// step0-rebuild-marker
