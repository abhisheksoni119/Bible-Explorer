export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// STEP 0 diagnostic v2 (temporary, branch-only). Bisection of the hierarchy query.
// Returns counts/refs only — never key material.

const YNFTZ_URL = 'https://ynftzpgjsnoyjovotpua.supabase.co';

function jwtRef(key) {
  try {
    const pl = JSON.parse(Buffer.from(String(key).split('.')[1], 'base64url').toString('utf8'));
    return { role: pl.role || '?', ref: pl.ref || '?' };
  } catch {
    return { role: 'not-a-jwt', ref: '?' };
  }
}

async function runStep(url, key, label, buildQuery) {
  try {
    const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error, count } = await buildQuery(c);
    return {
      label,
      error: error ? error.message : null,
      rowCount: data ? data.length : null,
      exactCount: count === undefined || count === null ? '(not requested)' : count,
      first3: data ? data.slice(0, 3).map(r => r.name || r.id) : null,
    };
  } catch (e) {
    return { label, error: e.message };
  }
}

export async function GET() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const runtimeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  const steps = [];

  // 1. exact replica of lib/supabaseAdmin.js + fetchAllTopics
  steps.push(await runStep(YNFTZ_URL, serviceKey, 'REPLICA service+allcols+order+range', c =>
    c.from('topics').select('id, name, category, parent_id, is_pillar').order('name').range(0, 999)));

  // 2. same minus range
  steps.push(await runStep(YNFTZ_URL, serviceKey, 'service+allcols+order (no range)', c =>
    c.from('topics').select('id, name, category, parent_id, is_pillar').order('name')));

  // 3. same minus order
  steps.push(await runStep(YNFTZ_URL, serviceKey, 'service+allcols (no order/range)', c =>
    c.from('topics').select('id, name, category, parent_id, is_pillar')));

  // 4. minimal columns
  steps.push(await runStep(YNFTZ_URL, serviceKey, 'service+id-only', c =>
    c.from('topics').select('id')));

  // 5. anon equivalent of hierarchy query
  steps.push(await runStep(YNFTZ_URL, anonKey, 'ANON+allcols+order+range', c =>
    c.from('topics').select('id, name, category, parent_id, is_pillar').order('name').range(0, 999)));

  // 6. what the guides page does (anon topics for guides category)
  steps.push(await runStep(YNFTZ_URL, anonKey, 'ANON guides-category topics', c =>
    c.from('topics').select('id').eq('category', 'guides')));

  const result = {
    runtimeUrlRef: runtimeUrl ? (runtimeUrl.includes('supabase.co') ? runtimeUrl.replace('https://', '').split('.')[0] : runtimeUrl) : '(unset)',
    anonKey: jwtRef(anonKey),
    serviceKey: jwtRef(serviceKey),
    steps,
  };
  return NextResponse.json(result);
}
