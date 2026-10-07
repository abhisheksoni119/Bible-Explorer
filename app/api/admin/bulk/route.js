export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdmin.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { ids, action, status } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No article IDs provided.' }, { status: 400 });
    }

    if (action === 'set-status') {
      if (!status) {
        return NextResponse.json({ error: 'status is required for set-status action.' }, { status: 400 });
      }
      const { error } = await supabase
        .from('articles')
        .update({ status })
        .in('id', ids);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        message: `${ids.length} article${ids.length !== 1 ? 's' : ''} set to "${status}".`,
        updated: ids.length,
      });
    }

    if (action === 'delete') {
      const { data: deleted, error } = await supabase
        .from('articles')
        .delete()
        .in('id', ids)
        .select('id');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const actualCount = deleted?.length ?? 0;
      if (actualCount === 0) {
        return NextResponse.json(
          { error: 'Delete was blocked by the database. Add SUPABASE_SERVICE_ROLE_KEY to your secrets to enable admin deletes.' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        message: `${actualCount} article${actualCount !== 1 ? 's' : ''} deleted.`,
        deleted: actualCount,
      });
    }

    return NextResponse.json({ error: `Unknown action: "${action}"` }, { status: 400 });
  } catch (err) {
    console.error('[admin/bulk]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// step0-rebuild-marker
