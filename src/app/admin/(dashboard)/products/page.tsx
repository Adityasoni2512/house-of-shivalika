import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/admin/shell";
import { buttonVariants } from "@/components/ui/button";
import { buildCategoryTree, flattenTree } from "@/lib/categories";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { ProductsTable, type ProductListItem } from "./products-table";
import { ProductFilters } from "./product-filters";

export const metadata = { title: "Products" };

const PAGE_SIZE = 25;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    page?: string;
  }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const query = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const category = params.category ?? "";

  const db = createAdminClient();

  let builder = db
    .from("products")
    // Must stay a single string literal — concatenation defeats supabase-js
    // type inference and collapses the row type to GenericStringError.
    .select(
      "id, name, slug, sku, price, mrp, status, is_featured, created_at, categories(name), product_images(url, position), product_variants(stock_qty)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (query) builder = builder.or(`name.ilike.%${query}%,sku.ilike.%${query}%`);
  if (status) builder = builder.eq("status", status);
  if (category) builder = builder.eq("category_id", category);

  const [{ data: products, count }, { data: categories }] = await Promise.all([
    builder,
    db.from("categories").select("*").order("position"),
  ]);

  const categoryOptions = flattenTree(buildCategoryTree(categories ?? [])).map(
    (c) => ({ id: c.id, name: c.name, depth: c.depth }),
  );

  const rows: ProductListItem[] = (products ?? []).map((p) => {
    const images = [...(p.product_images ?? [])].sort(
      (a, b) => a.position - b.position,
    );

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      price: Number(p.price),
      mrp: p.mrp === null ? null : Number(p.mrp),
      status: p.status,
      is_featured: p.is_featured,
      categoryName: p.categories?.name ?? "—",
      imageUrl: images[0]?.url ?? null,
      totalStock: (p.product_variants ?? []).reduce(
        (sum, v) => sum + v.stock_qty,
        0,
      ),
      variantCount: (p.product_variants ?? []).length,
    };
  });

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Products"
        description={
          total > 0
            ? `${total} product${total === 1 ? "" : "s"}. Each colourway is its own product — use Duplicate to create the next one.`
            : "Each colourway is its own product."
        }
        action={
          <Link href="/admin/products/new" className={buttonVariants()}>
            <Plus className="size-4" /> New product
          </Link>
        }
      />

      <ProductFilters
        categories={categoryOptions}
        defaultQuery={query}
        defaultStatus={status}
        defaultCategory={category}
      />

      <ProductsTable
        products={rows}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </>
  );
}
