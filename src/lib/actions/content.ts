"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { bannerSchema, pageSchema } from "@/lib/schemas/catalogue";
import { createAdminClient } from "@/lib/supabase/admin";

export type ContentActionState = { ok?: boolean; error?: string; id?: string };

/* -------------------------------------------------------------------------- */
/* Banners                                                                    */
/* -------------------------------------------------------------------------- */

function revalidateBanners() {
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function saveBannerAction(
  bannerId: string | null,
  input: unknown,
): Promise<ContentActionState> {
  await requireAdmin();

  const parsed = bannerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the banner" };
  }

  const data = parsed.data;
  const row = {
    title: data.title,
    subtitle: data.subtitle,
    image_desktop: data.image_desktop,
    image_mobile: data.image_mobile,
    cta_label: data.cta_label,
    cta_url: data.cta_url,
    position: data.position,
    is_active: data.is_active,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
  };

  const db = createAdminClient();

  if (bannerId) {
    const { error } = await db.from("banners").update(row).eq("id", bannerId);
    if (error) return { error: "Could not save the banner" };
    revalidateBanners();
    return { ok: true, id: bannerId };
  }

  const { data: created, error } = await db
    .from("banners")
    .insert(row)
    .select("id")
    .single();

  if (error || !created) return { error: "Could not create the banner" };

  revalidateBanners();
  return { ok: true, id: created.id };
}

export async function deleteBannerAction(
  id: string,
): Promise<ContentActionState> {
  await requireAdmin();

  const db = createAdminClient();
  const { error } = await db.from("banners").delete().eq("id", id);
  if (error) return { error: "Could not delete the banner" };

  revalidateBanners();
  return { ok: true };
}

export async function toggleBannerAction(
  id: string,
  isActive: boolean,
): Promise<ContentActionState> {
  await requireAdmin();

  const db = createAdminClient();
  const { error } = await db
    .from("banners")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: "Could not update the banner" };

  revalidateBanners();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Pages                                                                      */
/* -------------------------------------------------------------------------- */

export async function savePageAction(
  pageId: string,
  input: unknown,
): Promise<ContentActionState> {
  const admin = await requireAdmin();

  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the page" };
  }

  const data = parsed.data;
  const db = createAdminClient();

  const { error } = await db
    .from("pages")
    .update({
      title: data.title,
      body: data.body,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      is_published: data.is_published,
      updated_by: admin.id,
    })
    .eq("id", pageId);

  if (error) return { error: "Could not save the page" };

  revalidatePath("/admin/pages");
  revalidatePath(`/${data.slug}`);
  revalidatePath("/", "layout");

  return { ok: true, id: pageId };
}

/* -------------------------------------------------------------------------- */
/* Admins                                                                     */
/* -------------------------------------------------------------------------- */

export async function createAdminAction(input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<ContentActionState> {
  const currentAdmin = await requireAdmin();

  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address" };
  }
  if (input.password.length < 10) {
    return { error: "Password must be at least 10 characters" };
  }

  const db = createAdminClient();

  const { data: created, error: authError } = await db.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName?.trim() || null },
  });

  if (authError || !created.user) {
    return {
      error: /already/i.test(authError?.message ?? "")
        ? "An account with that email already exists"
        : "Could not create the account",
    };
  }

  const { error } = await db.from("admins").insert({
    id: created.user.id,
    email,
    full_name: input.fullName?.trim() || null,
    created_by: currentAdmin.id,
  });

  if (error) {
    // Roll back the auth user so a failed insert does not leave an orphan that
    // can sign in but has no admin row.
    await db.auth.admin.deleteUser(created.user.id);
    return { error: "Could not create the admin record" };
  }

  revalidatePath("/admin/admins");
  return { ok: true, id: created.user.id };
}

export async function setAdminActiveAction(
  id: string,
  isActive: boolean,
): Promise<ContentActionState> {
  const currentAdmin = await requireAdmin();

  if (id === currentAdmin.id && !isActive) {
    return { error: "You cannot deactivate your own account" };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("admins")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: "Could not update the admin" };

  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function deleteAdminAction(
  id: string,
): Promise<ContentActionState> {
  const currentAdmin = await requireAdmin();

  if (id === currentAdmin.id) {
    return { error: "You cannot delete your own account" };
  }

  const db = createAdminClient();

  const { count } = await db
    .from("admins")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  if ((count ?? 0) <= 1) {
    return { error: "There must always be at least one active admin" };
  }

  const { error } = await db.from("admins").delete().eq("id", id);
  if (error) return { error: "Could not delete the admin" };

  // Cascade to auth so the login stops working too.
  await db.auth.admin.deleteUser(id).catch(() => {});

  revalidatePath("/admin/admins");
  return { ok: true };
}

/** Change your own password. */
export async function changePasswordAction(
  newPassword: string,
): Promise<ContentActionState> {
  const admin = await requireAdmin();

  if (newPassword.length < 10) {
    return { error: "Password must be at least 10 characters" };
  }

  const db = createAdminClient();
  const { error } = await db.auth.admin.updateUserById(admin.id, {
    password: newPassword,
  });

  if (error) return { error: "Could not change the password" };

  return { ok: true };
}
