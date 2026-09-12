import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types.generated";

/**
 * Service-role Supabase client.
 *
 * This key bypasses Row Level Security entirely, so it must never reach the
 * browser. The `server-only` import above turns any accidental client-component
 * import into a build error rather than a runtime leak.
 *
 * All application reads and writes go through here, from server components and
 * server actions, *after* our own authorisation checks. RLS is enabled on every
 * table with no policies purely as defence in depth.
 */

let cached: SupabaseClient<Database> | null = null;

export function createAdminClient(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. Check .env.local");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Check .env.local");
  }

  cached = createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cached;
}
