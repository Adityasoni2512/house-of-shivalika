"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type StockActionState = { ok?: boolean; error?: string; value?: number };

function revalidateStock(slug?: string | null) {
  revalidatePath("/admin/stock");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/shop", "layout");
  if (slug) revalidatePath(`/product/${slug}`);
}

async function slugForVariant(
  db: ReturnType<typeof createAdminClient>,
  variantId: string,
): Promise<string | null> {
  const { data } = await db
    .from("product_variants")
    .select("products(slug)")
    .eq("id", variantId)
    .maybeSingle();

  return data?.products?.slug ?? null;
}

export async function setStockAction(
  variantId: string,
  quantity: number,
): Promise<StockActionState> {
  await requireAdmin();

  if (!Number.isInteger(quantity) || quantity < 0) {
    return { error: "Stock must be zero or a whole number" };
  }

  const db = createAdminClient();
  const slug = await slugForVariant(db, variantId);

  const { error } = await db
    .from("product_variants")
    .update({ stock_qty: quantity })
    .eq("id", variantId);

  if (error) return { error: "Could not update stock" };

  revalidateStock(slug);
  return { ok: true, value: quantity };
}

/**
 * Relative adjustment, used by the −/+ buttons and by order fulfilment.
 *
 * Read-then-write is a race in theory: two admins decrementing at the same
 * instant could both read 5 and both write 4. In practice this is a two-person
 * team working from WhatsApp conversations, and the alternative — a Postgres
 * function for an atomic delta — is not worth the migration here. Clamped at
 * zero so a double-decrement can never produce negative stock.
 */
export async function adjustStockAction(
  variantId: string,
  delta: number,
): Promise<StockActionState> {
  await requireAdmin();

  const db = createAdminClient();

  const { data: variant, error: readError } = await db
    .from("product_variants")
    .select("stock_qty, products(slug)")
    .eq("id", variantId)
    .maybeSingle();

  if (readError || !variant) return { error: "Could not find that size" };

  const next = Math.max(0, variant.stock_qty + delta);

  const { error } = await db
    .from("product_variants")
    .update({ stock_qty: next })
    .eq("id", variantId);

  if (error) return { error: "Could not update stock" };

  revalidateStock(variant.products?.slug ?? null);
  return { ok: true, value: next };
}

/** Bulk save from the stock screen — one round trip per changed row. */
export async function bulkSetStockAction(
  updates: { variantId: string; quantity: number }[],
): Promise<StockActionState> {
  await requireAdmin();

  const invalid = updates.find(
    (u) => !Number.isInteger(u.quantity) || u.quantity < 0,
  );
  if (invalid) return { error: "Stock must be zero or a whole number" };

  const db = createAdminClient();

  const results = await Promise.all(
    updates.map((u) =>
      db
        .from("product_variants")
        .update({ stock_qty: u.quantity })
        .eq("id", u.variantId),
    ),
  );

  if (results.some((r) => r.error)) {
    return { error: "Some rows could not be saved. Refresh and try again." };
  }

  revalidateStock();
  return { ok: true };
}
