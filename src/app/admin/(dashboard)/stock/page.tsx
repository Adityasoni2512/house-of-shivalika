import { PageHeader } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { StockTable, type StockRow } from "./stock-table";

export const metadata = { title: "Stock" };

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const filter = params.filter ?? "all";
  const query = params.q?.trim() ?? "";

  const db = createAdminClient();

  let builder = db
    .from("product_variants")
    .select(
      "id, stock_qty, is_active, sizes(label, position), products(id, name, sku, slug, status, product_images(url, position))",
    )
    .eq("is_active", true);

  if (filter === "out") builder = builder.eq("stock_qty", 0);
  if (filter === "low") builder = builder.gt("stock_qty", 0).lte("stock_qty", 3);

  const { data: variants } = await builder;

  let rows: StockRow[] = (variants ?? [])
    .filter((v) => v.products !== null)
    .map((v) => {
      const images = [...(v.products?.product_images ?? [])].sort(
        (a, b) => a.position - b.position,
      );

      return {
        variantId: v.id,
        productId: v.products!.id,
        productName: v.products!.name,
        sku: v.products!.sku,
        productStatus: v.products!.status,
        imageUrl: images[0]?.url ?? null,
        sizeLabel: v.sizes?.label ?? "—",
        sizePosition: v.sizes?.position ?? 0,
        stockQty: v.stock_qty,
      };
    });

  if (query) {
    const needle = query.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.productName.toLowerCase().includes(needle) ||
        r.sku.toLowerCase().includes(needle),
    );
  }

  rows.sort(
    (a, b) =>
      a.productName.localeCompare(b.productName) ||
      a.sizePosition - b.sizePosition,
  );

  const outOfStock = rows.filter((r) => r.stockQty === 0).length;
  const lowStock = rows.filter((r) => r.stockQty > 0 && r.stockQty <= 3).length;

  return (
    <>
      <PageHeader
        title="Stock"
        description="Every size across every product. Stock is not decremented automatically — update it here after each WhatsApp order."
      />
      <StockTable
        rows={rows}
        filter={filter}
        query={query}
        outOfStock={outOfStock}
        lowStock={lowStock}
      />
    </>
  );
}
