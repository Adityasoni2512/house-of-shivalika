"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { touchLastLogin } from "@/lib/auth";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  /*
   * nullish, not optional: formData.get() returns null for a field that is not
   * present, and z.optional() only permits undefined. The login form omits the
   * hidden `next` input entirely when there is no redirect target, so
   * .optional() here rejected every sign-in that started at /admin/login
   * directly — while sign-ins arriving via /admin (which appends ?next=) passed.
   */
  next: z.string().nullish(),
});

export type SignInState = { error?: string };

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    /*
     * Only surface messages for fields the user can actually see and fix.
     * Anything else is our bug, not theirs — show something neutral rather
     * than a raw validation message like "expected string, received null".
     */
    const visible = parsed.error.issues.find(
      (issue) => issue.path[0] === "email" || issue.path[0] === "password",
    );

    if (!visible) {
      console.error("signInAction: unexpected validation failure", parsed.error.issues);
    }

    return { error: visible?.message ?? "Something went wrong. Please try again." };
  }

  const { email, password, next } = parsed.data;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Deliberately vague: never reveal whether an email exists.
  if (error || !data.user) {
    return { error: "Incorrect email or password" };
  }

  // A valid Supabase session is not enough — they must be an active admin.
  const db = createAdminClient();
  const { data: admin } = await db
    .from("admins")
    .select("id, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!admin || !admin.is_active) {
    await supabase.auth.signOut();
    return { error: "This account does not have admin access" };
  }

  await touchLastLogin(admin.id);

  // Only allow same-origin relative paths, so ?next= cannot be used for an
  // open redirect to another site.
  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  redirect(target);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
