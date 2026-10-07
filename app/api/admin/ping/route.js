export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pingSitemaps } from '../../../../lib/sitemapPing.js';

/**
 * POST /api/admin/ping
 * Triggers sitemap pings only — does not touch content or links.
 */
export async function POST() {
  await pingSitemaps();
  return NextResponse.json({ ok: true, pinged: ['/sitemap.xml', '/sitemap-recent.xml'] });
}
// step0-rebuild-marker
