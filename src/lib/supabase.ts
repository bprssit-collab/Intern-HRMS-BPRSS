/**
 * Supabase client initialization
 * Two modes:
 *  - Real Supabase (when NEXT_PUBLIC_SUPABASE_URL and keys are configured)
 *  - Local DB Adapter fallback (when credentials are placeholders/missing)
 */

import { createClient } from '@supabase/supabase-js';
import { LocalSupabaseClient } from './local-db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isPlaceholder =
  !supabaseUrl ||
  supabaseUrl.includes('YOUR_PROJECT_ID') ||
  !supabaseAnonKey ||
  supabaseAnonKey.includes('YOUR_SUPABASE') ||
  !serviceRoleKey ||
  serviceRoleKey.includes('YOUR_SUPABASE');

/** Public client - safe to use in client components */
export const supabase = isPlaceholder
  ? (new LocalSupabaseClient() as any)
  : createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin client - SERVER-SIDE ONLY.
 * Uses service role key to bypass RLS, or falls back to local database.
 */
export function createAdminClient() {
  if (isPlaceholder) {
    return new LocalSupabaseClient() as any;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
