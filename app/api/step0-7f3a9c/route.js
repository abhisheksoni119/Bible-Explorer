export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

// STEP 0 diagnostic v3 (temporary, branch-only). Interrogates the actual
// supabaseAdmin singleton vs fresh clients. Returns refs/counts only.

const YNFTZ_URL = 'https://ynftzpgjsnoyjovotpua.supabase.co';

function jwtRef(key) {
  try {
    const pl = JSON.parse(Buffer.from(String(key).split('.')[1], 'base64url').toString('utf8'));
    return { role: pl.role || '?', ref: pl.ref || '?' };
  } catch {
    return { role: 'not-a-jwt', ref: '?' };
  }
}

async function topicsSample(client, label) {
  try {
    const { data, error } = await client
      .from('topics')
      .select('id, name, category, parent_id, is_pillar')
      .order('name')
      .range(0, 999);
    if (error) return { label, error: error.message };
    return {
      label,
      rowCount: data.length,
      first3: data.slice(0, 3).map(r => r.name),
      germanCount: data.filter(r => /[äöüÄÖÜß]/.test(r.name)).length,
    };
  } catch (e) {
    return { label, error: e.message };
  }
}

export async function GET() {
  const runtimeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '(unset)';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // 1. What does the deployed singleton hold, and what does it see?
  const singletonUrl = supabaseAdmin && supabaseAdmin.supabaseUrl ? supabaseAdmin.supabaseUrl : '(n/a)';
  const viaSingleton = supabaseAdmin ? await topicsSample(supabaseAdmin, 'VIA supabaseAdmin singleton') : { label: 'singleton null' };

  // 2. Fresh client on the runtime env URL with runtime service key
  const freshRuntime = serviceKey && runtimeUrl !== '(unset)'
    ? await topicsSample(createClient(runtimeUrl, serviceKey, { auth: { persistSession: false } }), 'FRESH runtime-url + service-key')
    : { label: 'skipped (missing url/key)' };

  // 3. Fresh client hardcoded to ynftz with runtime service key
  const freshHardcoded = serviceKey
    ? await topicsSample(createClient(YNFTZ_URL, serviceKey, { auth: { persistSession: false } }), 'FRESH hardcoded-ynftz + service-key')
    : { label: 'skipped (missing key)' };

  return NextResponse.json({
    singletonUrlRef: String(singletonUrl).includes('supabase.co')
      ? String(singletonUrl).replace('https://', '').split('.')[0]
      : singletonUrl,
    runtimeUrlRef: runtimeUrl.includes('supabase.co') ? runtimeUrl.replace('https://', '').split('.')[0] : runtimeUrl,
    serviceKey: jwtRef(serviceKey),
    viaSingleton,
    freshRuntime,
    freshHardcoded,
  });
}
