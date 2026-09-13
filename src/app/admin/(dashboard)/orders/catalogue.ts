import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import type { CatalogueVariant } from "./order-form";

/**
 * Flat list of every sellable product × size, for the order line picker.
 *
 * Archived products are excluded but drafts are kept: an order can legitimately
 * be recorded for something not yet published on the site.
 */
export async function loadCatalogue(): Promise<CatalogueVariant[]> {
  const db = createAdminClient();

  const { data } = await db
    .from("product_variants")
    .select(
      "id, stock_qty, is_active, sizes(label, position), products(id, name, sku, price, status, product_images(url, position))",
    )
    .eq("is_active", true);

  return (data ?? [])
    .filter((variant) => variant.products && variant.products.status !== "archived")
    .map((variant) => {
      const images = [...(variant.products?.product_images ?? [])].sort(
        (a, b) => a.position - b.position,
      );

      return {
        variantId: variant.id,
        productId: variant.products!.id,
        productName: variant.products!.name,
        sku: variant.products!.sku,
        sizeLabel: variant.sizes?.label ?? "—",
        price: Number(variant.products!.price),
        stock: variant.stock_qty,
        imageUrl: images[0]?.url ?? null,
        sizePosition: variant.sizes?.position ?? 0,
      };
    })
    .sort(
      (a, b) =>
        a.productName.localeCompare(b.productName) ||
        a.sizePosition - b.sizePosition,
    )
    .map((entry) => {
      const { sizePosition, ...rest } = entry;
      void sizePosition;
      return rest;
    });
}
