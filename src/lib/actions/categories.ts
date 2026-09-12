"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { categorySchema } from "@/lib/schemas/catalogue";
import { createAdminClient } from "@/lib/supabase/admin";

export type CategoryActionState = { ok?: boolean; error?: string; id?: string };

function revalidateCategories() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
}

function parseForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    parent_id: formData.get("parent_id"),
    description: formData.get("description") ?? "",
    image_url: formData.get("image_url") ?? "",
    position: formData.get("position") ?? 0,
    is_active: formData.get("is_active") === "on",
    show_in_nav: formData.get("show_in_nav") === "on",
    seo_title: formData.get("seo_title") ?? "",
    seo_description: formData.get("seo_description") ?? "",
  });
}

/**
 * Walks up from `candidateParentId` looking for `categoryId`.
 * A category cannot be moved beneath its own descendant — that would detach the
 * whole subtree from the root and make it unreachable from the nav.
 */
async function wouldCreateCycle(
  db: ReturnType<typeof createAdminClient>,
  categoryId: string,
  candidateParentId: string | null,
): Promise<boolean> {
  if (!candidateParentId) return false;
  if (candidateParentId === categoryId) return true;

  let cursor: string | null = candidateParentId;

  // Bounded so a pre-existing bad cycle cannot hang the request.
  for (let depth = 0; depth < 25; depth += 1) {
    if (!cursor) break;

    // Explicit annotation breaks the circular inference between `cursor` and
    // the query result it is derived from.
    const currentId: string = cursor;

    const { data } = await db
      .from("categories")
      .select("parent_id")
      .eq("id", currentId)
      .maybeSingle();

    const parent: string | null = data?.parent_id ?? null;
    if (parent === categoryId) return true;
    cursor = parent;
  }

  return false;
}

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category" };
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("categories")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already taken"
          : "Could not save the category",
    };
  }

  revalidateCategories();
  return { ok: true, id: data.id };
}

export async function updateCategoryAction(
  id: string,
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category" };
  }

  const db = createAdminClient();

  if (await wouldCreateCycle(db, id, parsed.data.parent_id)) {
    return { error: "A category cannot sit inside itself or its own subcategory" };
  }

  const { error } = await db.from("categories").update(parsed.data).eq("id", id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already taken"
          : "Could not update the category",
    };
  }

  revalidateCategories();
  return { ok: true, id };
}

/**
 * Blocked while anything still points at the category. The products FK is
 * ON DELETE RESTRICT so the database would refuse anyway — this just turns a
 * raw constraint violation into a sentence the admin can act on.
 */
export async function deleteCategoryAction(
  id: string,
): Promise<CategoryActionState> {
  await requireAdmin();

  const db = createAdminClient();

  const [{ count: productCount }, { count: childCount }] = await Promise.all([
    db.from("products").select("*", { count: "exact", head: true }).eq("category_id", id),
    db.from("categories").select("*", { count: "exact", head: true }).eq("parent_id", id),
  ]);

  if ((childCount ?? 0) > 0) {
    return {
      error: `This category has ${childCount} subcategor${childCount === 1 ? "y" : "ies"}. Move or delete those first.`,
    };
  }

  if ((productCount ?? 0) > 0) {
    return {
      error: `${productCount} product${productCount === 1 ? "" : "s"} still use this category. Reassign them first, or deactivate the category instead.`,
    };
  }

  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) return { error: "Could not delete the category" };

  revalidateCategories();
  return { ok: true };
}

export async function reorderCategoriesAction(
  orderedIds: string[],
): Promise<CategoryActionState> {
  await requireAdmin();

  const db = createAdminClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      db.from("categories").update({ position: index + 1 }).eq("id", id),
    ),
  );

  if (results.some((r) => r.error)) {
    return { error: "Could not reorder categories" };
  }

  revalidateCategories();
  return { ok: true };
}
