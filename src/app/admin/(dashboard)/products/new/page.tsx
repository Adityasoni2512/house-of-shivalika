import { PageHeader } from "@/components/admin/shell";
import { buildCategoryTree, flattenTree } from "@/lib/categories";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { ProductForm, type ProductFormValues } from "../product-form";

export const metadata = { title: "New product" };

const emptyProduct: ProductFormValues = {
  id: null,
  name: "",
  slug: "",
  sku: "",
  category_id: "",
  price: "",
  mrp: "",
  short_description: "",
  description: "",
  colour_name: "",
  colour_hex: "",
  fabric: "",
  care: "",
  occasion: "",
  attributes: {},
  status: "draft",
  is_featured: false,
  seo_title: "",
  seo_description: "",
  images: [],
  variants: [],
};

export default async function NewProductPage() {
  await requireAdmin();

  const db = createAdminClient();

  const [{ data: categories }, { data: sizes }] = await Promise.all([
    db.from("categories").select("*").eq("is_active", true).order("position"),
    db
      .from("sizes")
      .select("id, label")
      .eq("is_active", true)
      .order("position"),
  ]);

  return (
    <>
      <PageHeader
        title="New product"
        description="Save as a draft at any point. A product needs an image and at least one size before it can go live."
      />
      <ProductForm
        initial={emptyProduct}
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
