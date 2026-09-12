import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { buildCategoryTree, flattenTree } from "@/lib/categories";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { ProductForm, type ProductFormValues } from "../product-form";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const db = createAdminClient();

  const [{ data: product }, { data: categories }, { data: sizes }] =
    await Promise.all([
      db
        .from("products")
        .select("*, product_images(*), product_variants(*)")
        .eq("id", id)
        .maybeSingle(),
      db.from("categories").select("*").eq("is_active", true).order("position"),
      db.from("sizes").select("id, label").eq("is_active", true).order("position"),
    ]);

  if (!product) notFound();

  const attributes =
    product.attributes && typeof product.attributes === "object"
      ? (product.attributes as Record<string, string>)
      : {};

  const initial: ProductFormValues = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    category_id: product.category_id,
    price: String(product.price),
    mrp: product.mrp === null ? "" : String(product.mrp),
    short_description: product.short_description ?? "",
    description: product.description ?? "",
    colour_name: product.colour_name ?? "",
    colour_hex: product.colour_hex ?? "",
    fabric: product.fabric ?? "",
    care: product.care ?? "",
    occasion: product.occasion ?? "",
    attributes,
    status: product.status as ProductFormValues["status"],
    is_featured: product.is_featured,
    seo_title: product.seo_title ?? "",
    seo_description: product.seo_description ?? "",
    images: [...product.product_images]
      .sort((a, b) => a.position - b.position)
      .map((image, index) => ({
        public_id: image.public_id,
        url: image.url,
        alt_text: image.alt_text,
        position: index,
      })),
    variants: product.product_variants.map((variant) => ({
      size_id: variant.size_id,
      stock_qty: String(variant.stock_qty),
      is_active: variant.is_active,
    })),
  };

  return (
    <>
      <PageHeader
        title={product.name}
        description={`SKU ${product.sku}`}
        action={
          <div className="flex items-center gap-3">
            <Badge variant={statusVariant(product.status)}>{product.status}</Badge>
            {product.status === "active" ? (
              <Link
                href={`/product/${product.slug}`}
                target="_blank"
                rel="noreferrer"
                className="label-caps text-accent underline underline-offset-4"
              >
                View on site
              </Link>
            ) : null}
          </div>
        }
      />

      <ProductForm
        initial={initial}
        categories={flattenTree(buildCategoryTree(categories ?? [])).map((c) => ({
          id: c.id,
          name: c.name,
          depth: c.depth,
        }))}
        sizes={sizes ?? []}
        cloudinaryReady={isCloudinaryConfigured()}
      />
    </>
  );
}
