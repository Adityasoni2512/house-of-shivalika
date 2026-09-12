import "server-only";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types.generated";

export type AdminRow = Database["public"]["Tables"]["admins"]["Row"];

/**
 * Returns the signed-in admin, or null.
 *
 * Two checks, both required: a valid Supabase Auth session, *and* an active row
 * in public.admins. Deactivating an admin therefore locks them out immediately
 * without having to delete their auth user.
 */
export async function getCurrentAdmin(): Promise<AdminRow | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const db = createAdminClient();
  const { data: admin } = await db
    .from("admins")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return admin ?? null;
}

/**
 * Guard for admin pages and server actions. Redirects to login when there is no
 * active admin. Call this at the top of every admin page and every mutating
 * action — middleware is not sufficient on its own.
 */
export async function requireAdmin(): Promise<AdminRow> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Records the sign-in time. Failure here must never block a login. */
export async function touchLastLogin(adminId: string): Promise<void> {
  try {
    const db = createAdminClient();
    await db
      .from("admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", adminId);
  } catch {
    // Non-critical.
  }
}
