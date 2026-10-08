import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Use service role key for admin routes (bypasses RLS).
// Falls back to anon key if service role key is not configured.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey        = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminKey = serviceRoleKey || anonKey;

export const supabaseAdmin = (supabaseUrl && adminKey)
  ? createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    })
  : null;
// step0-rebuild-marker
