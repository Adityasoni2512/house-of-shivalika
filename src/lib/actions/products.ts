"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { productSchema, type ProductInput } from "@/lib/schemas/catalogue";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

export type ProductActionState = { ok?: boolean; error?: string; id?: string };

function revalidateProduct(slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/admin/stock");
  revalidatePath("/shop", "layout");
  revalidatePath("/");
  if (slug) revalidatePath(`/product/${slug}`);
}

/**
 * A product write spans three tables. Postgres has no multi-statement
 * transaction over PostgREST, so images and variants are replaced with
 * delete-then-insert and the product row is written last-but-one. Worst case on
 * a partial failure is a product with stale children, which the admin can fix
 * by saving again — never a lost product or a corrupted order.
 */
async function writeChildren(
  db: ReturnType<typeof createAdminClient>,
  productId: string,
  input: ProductInput,
): Promise<string | null> {
  const { error: imageDeleteError } = await db
    .from("product_images")
    .delete()
    .eq("product_id", productId);
  if (imageDeleteError) return "Could not update the images";

  if (input.images.length > 0) {
    const { error } = await db.from("product_images").insert(
      input.images.map((image, index) => ({
        product_id: productId,
        public_id: image.public_id,
        url: image.url,
        alt_text: image.alt_text ?? null,
        position: index,
      })),
    );
    if (error) return "Could not save the images";
  }

  // Variants carry stock, so they are reconciled rather than replaced —
  // deleting and re-inserting would lose the stock count on every save.
  const { data: existing } = await db
    .from("product_variants")
    .select("id, size_id")
    .eq("product_id", productId);

  const existingBySize = new Map((existing ?? []).map((v) => [v.size_id, v.id]));
  const keptSizeIds = new Set(input.variants.map((v) => v.size_id));

  const toRemove = (existing ?? [])
    .filter((v) => !keptSizeIds.has(v.size_id))
    .map((v) => v.id);

  if (toRemove.length > 0) {
    const { error } = await db
      .from("product_variants")
      .delete()
      .in("id", toRemove);
    if (error) return "Could not remove unused sizes";
  }

  for (const variant of input.variants) {
    const existingId = existingBySize.get(variant.size_id);

    if (existingId) {
      const { error } = await db
        .from("product_variants")
        .update({
          stock_qty: variant.stock_qty,
          sku: variant.sku ?? null,
          is_active: variant.is_active,
        })
        .eq("id", existingId);
      if (error) return "Could not update stock";
    } else {
      const { error } = await db.from("product_variants").insert({
        product_id: productId,
        size_id: variant.size_id,
        stock_qty: variant.stock_qty,
        sku: variant.sku ?? null,
        is_active: variant.is_active,
      });
      if (error) return "Could not add a size";
    }
  }

  return null;
}

function friendlyError(code?: string, message?: string): string {
  if (code === "23505") {
    if (message?.includes("slug")) return "That slug is already taken";
    if (message?.includes("sku")) return "That SKU is already used";
    return "A product with those details already exists";
  }
  if (code === "23514") return "Check the price and MRP values";
  return "Could not save the product";
}

export async function saveProductAction(
  productId: string | null,
  input: unknown,
): Promise<ProductActionState> {
  await requireAdmin();

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Check the product details" };
  }

  const data = parsed.data;
  const db = createAdminClient();

  const row = {
    name: data.name,
    slug: data.slug,
    sku: data.sku,
    category_id: data.category_id,
    price: data.price,
    mrp: data.mrp,
    short_description: data.short_description,
    description: data.description,
    colour_name: data.colour_name,
    colour_hex: data.colour_hex,
    fabric: data.fabric,
    care: data.care,
    occasion: data.occasion,
    attributes: data.attributes,
    status: data.status,
    is_featured: data.is_featured,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
  };

  let id = productId;

  if (id) {
    // published_at is set once, the first time a product goes active — it is
    // what "New Arrivals" sorts on, so re-activating must not jump the queue.
    const { data: current } = await db
      .from("products")
      .select("published_at, status")
      .eq("id", id)
      .single();

    const publishedAt =
      data.status === "active" && !current?.published_at
        ? new Date().toISOString()
        : current?.published_at ?? null;

    const { error } = await db
      .from("products")
      .update({ ...row, published_at: publishedAt })
      .eq("id", id);

    if (error) return { error: friendlyError(error.code, error.message) };
  } else {
    const { data: created, error } = await db
      .from("products")
      .insert({
        ...row,
        published_at: data.status === "active" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (error) return { error: friendlyError(error.code, error.message) };
    id = created.id;
  }

  const childError = await writeChildren(db, id, data);
  if (childError) return { error: childError, id };

  revalidateProduct(data.slug);
  return { ok: true, id };
}

export async function deleteProductAction(
  id: string,
): Promise<ProductActionState> {
  await requireAdmin();

  const db = createAdminClient();

  // Order items keep their snapshot columns, so deleting a product never
  // corrupts order history — but warn anyway, because reviews are lost.
  const { data: product } = await db
    .from("products")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.from("products").delete().eq("id", id);
  if (error) return { error: "Could not delete the product" };

  revalidateProduct(product?.slug);
  return { ok: true };
}

export async function setProductStatusAction(
  id: string,
  status: "draft" | "active" | "archived",
): Promise<ProductActionState> {
  await requireAdmin();

  const db = createAdminClient();

  if (status === "active") {
    // Guard the same invariants the form enforces — a product can also be
    // activated straight from the list, bypassing the form's validation.
    const [{ count: imageCount }, { count: variantCount }] = await Promise.all([
      db.from("product_images").select("*", { count: "exact", head: true }).eq("product_id", id),
      db.from("product_variants").select("*", { count: "exact", head: true }).eq("product_id", id),
    ]);

    if ((imageCount ?? 0) === 0) {
      return { error: "Add at least one image before making this product active" };
    }
    if ((variantCount ?? 0) === 0) {
      return { error: "Add at least one size before making this product active" };
    }
  }

  const { data: current } = await db
    .from("products")
    .select("published_at, slug")
    .eq("id", id)
    .single();

  const publishedAt =
    status === "active" && !current?.published_at
      ? new Date().toISOString()
      : current?.published_at ?? null;

  const { error } = await db
    .from("products")
    .update({ status, published_at: publishedAt })
    .eq("id", id);

  if (error) return { error: "Could not update the product" };

  revalidateProduct(current?.slug);
  return { ok: true };
}

/**
 * Duplicate a product, including images and sizes but with stock zeroed.
 * Essential here: every colourway is a separate product, so this is the normal
 * way a second colour gets created.
 */
export async function duplicateProductAction(
  id: string,
): Promise<ProductActionState> {
  await requireAdmin();

  const db = createAdminClient();

  const { data: source, error: readError } = await db
    .from("products")
    .select("*, product_images(*), product_variants(*)")
    .eq("id", id)
    .single();

  if (readError || !source) return { error: "Could not read the product" };

  // Find a free slug and SKU: "-copy", then "-copy-2", "-copy-3", ...
  let suffix = "copy";
  for (let attempt = 2; attempt <= 50; attempt += 1) {
    const candidate = slugify(`${source.slug}-${suffix}`);
    const { count } = await db
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("slug", candidate);

    if ((count ?? 0) === 0) break;
    suffix = `copy-${attempt}`;
  }

  const newSlug = slugify(`${source.slug}-${suffix}`);
  const newSku = `${source.sku}-${suffix.toUpperCase()}`;

  const { data: created, error: insertError } = await db
    .from("products")
    .insert({
      name: `${source.name} (copy)`,
      slug: newSlug,
      sku: newSku,
      category_id: source.category_id,
      price: source.price,
      mrp: source.mrp,
      short_description: source.short_description,
      description: source.description,
      colour_name: source.colour_name,
      colour_hex: source.colour_hex,
      fabric: source.fabric,
      care: source.care,
      occasion: source.occasion,
      attributes: source.attributes,
      status: "draft", // never publish a copy by accident
      is_featured: false,
      seo_title: source.seo_title,
      seo_description: source.seo_description,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { error: friendlyError(insertError?.code, insertError?.message) };
  }

  if (source.product_images.length > 0) {
    await db.from("product_images").insert(
      source.product_images
        .sort((a, b) => a.position - b.position)
        .map((image, index) => ({
          product_id: created.id,
          public_id: image.public_id,
          url: image.url,
          alt_text: image.alt_text,
          position: index,
        })),
    );
  }

  if (source.product_variants.length > 0) {
    await db.from("product_variants").insert(
      source.product_variants.map((variant) => ({
        product_id: created.id,
        size_id: variant.size_id,
        stock_qty: 0, // a copy has never been stocked
        is_active: variant.is_active,
      })),
    );
  }

  revalidateProduct();
  return { ok: true, id: created.id };
}
