import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./types.generated";

/**
 * Session-aware Supabase client, used only for admin authentication.
 *
 * This runs with the anon key and the signed-in user's session, so it can read
 * `auth.getUser()` but — with RLS deny-by-default on every table — it cannot
 * read application data. Data access always goes through `createAdminClient()`
 * after the session has been verified.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. Check .env.local");
  }
  if (!anonKey) {
    throw new Error("SUPABASE_ANON_KEY is not set. Check .env.local");
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
