export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// STEP 0 diagnostic (temporary, branch-only). Returns counts + project refs only.
// Never returns key material.

const YNFTZ_URL = 'https://ynftzpgjsnoyjovotpua.supabase.co';

function jwtRef(key) {
  try {
    const pl = JSON.parse(Buffer.from(String(key).split('.')[1], 'base64url').toString('utf8'));
    return { role: pl.role || '?', ref: pl.ref || '?' };
  } catch {
    return { role: 'not-a-jwt', ref: '?' };
  }
}

async function topicsCensus(url, key) {
  try {
    const c = createClient(url, key, { auth: { persistSession: false } });
    const { count, error } = await c.from('topics').select('id', { count: 'exact', head: true });
    if (error) return { error: error.message };
    const { data: sample, error: e2 } = await c
      .from('topics')
      .select('name, category')
      .order('created_at', { ascending: false })
      .limit(6);
    const { count: artCount, error: e3 } = await c.from('articles').select('id', { count: 'exact', head: true });
    const { count: pubCount, error: e4 } = await c
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');
    return {
      topicsCount: count,
      articlesCount: artCount,
      publishedCount: pubCount,
      newestTopics: (sample || []).map(t => t.name),
      errors: [e2 && e2.message, e3 && e3.message, e4 && e4.message].filter(Boolean),
    };
  } catch (e) {
    return { error: e.message };
  }
}

export async function GET() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const runtimeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '(unset)';

  const result = {
    runtimeUrlRef: runtimeUrl.includes('supabase.co') ? runtimeUrl.replace('https://', '').split('.')[0] : runtimeUrl,
    anonKey: jwtRef(anonKey),
    serviceKey: jwtRef(serviceKey),
    anon_census_on_ynftz: anonKey ? await topicsCensus(YNFTZ_URL, anonKey) : { error: 'no anon key in runtime env' },
    service_census_on_ynftz: serviceKey ? await topicsCensus(YNFTZ_URL, serviceKey) : { error: 'no service key in runtime env' },
  };
  return NextResponse.json(result);
}
