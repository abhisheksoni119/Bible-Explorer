export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdminClient.js';

function isSchemaError(msg = '') {
  return msg.includes('schema cache') || msg.includes('column') || msg.includes('does not exist');
}

export async function POST() {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('articles')
    .update({ exported: true })
    .eq('status', 'published')
    .eq('exported', false)
    .select('id');

  if (error) {
    if (isSchemaError(error.message)) {
      return NextResponse.json({ missingColumn: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: (data || []).length });
}
// step0-rebuild-marker
