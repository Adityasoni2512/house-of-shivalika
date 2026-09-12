"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { sizeSchema } from "@/lib/schemas/catalogue";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionState = { ok?: boolean; error?: string };

/** Revalidate every surface a size can appear on. */
function revalidateSizes() {
  revalidatePath("/admin/sizes");
  revalidatePath("/admin/products");
  revalidatePath("/admin/stock");
  revalidatePath("/", "layout");
}

export async function createSizeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = sizeSchema.safeParse({
    label: formData.get("label"),
    position: formData.get("position") ?? 0,
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid size" };
  }

  const db = createAdminClient();
  const { error } = await db.from("sizes").insert(parsed.data);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That size label already exists"
          : "Could not save the size",
    };
  }

  revalidateSizes();
  return { ok: true };
}

export async function updateSizeAction(
  id: string,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = sizeSchema.safeParse({
    label: formData.get("label"),
    position: formData.get("position") ?? 0,
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid size" };
  }

  const db = createAdminClient();
  const { error } = await db.from("sizes").update(parsed.data).eq("id", id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That size label already exists"
          : "Could not update the size",
    };
  }

  revalidateSizes();
  return { ok: true };
}

/**
 * Deleting a size is blocked once any product uses it — the FK is ON DELETE
 * RESTRICT deliberately, so historical variants cannot be orphaned. Deactivate
 * instead, which hides it from new products without touching existing ones.
 */
export async function deleteSizeAction(id: string): Promise<ActionState> {
  await requireAdmin();

  const db = createAdminClient();

  const { count } = await db
    .from("product_variants")
    .select("*", { count: "exact", head: true })
    .eq("size_id", id);

  if ((count ?? 0) > 0) {
    return {
      error: `This size is used by ${count} product variant${count === 1 ? "" : "s"}. Deactivate it instead.`,
    };
  }

  const { error } = await db.from("sizes").delete().eq("id", id);
  if (error) return { error: "Could not delete the size" };

  revalidateSizes();
  return { ok: true };
}

export async function toggleSizeActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionState> {
  await requireAdmin();

  const db = createAdminClient();
  const { error } = await db
    .from("sizes")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: "Could not update the size" };

  revalidateSizes();
  return { ok: true };
}

export async function reorderSizesAction(
  orderedIds: string[],
): Promise<ActionState> {
  await requireAdmin();

  const db = createAdminClient();

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      db.from("sizes").update({ position: index + 1 }).eq("id", id),
    ),
  );

  if (results.some((r) => r.error)) return { error: "Could not reorder sizes" };

  revalidateSizes();
  return { ok: true };
}
