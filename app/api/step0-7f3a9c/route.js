export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// STEP 0 diagnostic v4 (temporary, branch-only): trace the actual network
// requests made by lib/supabaseAdmin.js + the exact hierarchy logic.
// Captures request target + auth-role + response row counts. No key values.

const captures = [];

function jwtRole(headerVal) {
  try {
    const pl = JSON.parse(Buffer.from(String(headerVal).split('.')[1], 'base64url').toString('utf8'));
    return `${pl.role}@${pl.ref}`;
  } catch {
    return 'not-jwt';
  }
}

function installCapture() {
  const orig = globalThis.fetch;
  globalThis.fetch = async function (input, init) {
    const res = await orig(input, init);
    try {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('supabase') || url.includes('rest/v1')) {
        const auth = init && init.headers ? (init.headers.Authorization || init.headers.authorization || (init.headers.get && init.headers.get('authorization'))) : null;
        let bodyRows = null;
        let first2 = null;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('json')) {
          try {
            const clone = res.clone();
            const body = await clone.json();
            if (Array.isArray(body)) {
              bodyRows = body.length;
              first2 = body.slice(0, 2).map(r => r.name || r.id);
            }
          } catch {}
        }
        captures.push({
          url: url.slice(0, 160),
          authRole: auth ? jwtRole(String(auth).replace('Bearer ', '')) : '(none)',
          status: res.status,
          rows: bodyRows,
          first2,
        });
      }
    } catch {}
    return res;
  };
  return orig;
}

export async function GET() {
  installCapture();

  // Dynamic import AFTER capture install — loads lib/supabaseAdmin.js fresh.
  const { supabaseAdmin } = await import('../../../lib/supabaseAdmin.js');

  const results = {};

  // A. What the singleton sees with the hierarchy's exact query
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('topics')
      .select('id, name, category, parent_id, is_pillar')
      .order('name')
      .range(0, 999);
    results.singletonHierarchyQuery = error ? { error: error.message } : { rows: data.length, first3: data.slice(0, 3).map(r => r.name) };
  } else {
    results.singletonHierarchyQuery = { error: 'supabaseAdmin is null' };
  }

  return NextResponse.json({ captures, results });
}
// step0-rebuild-marker
