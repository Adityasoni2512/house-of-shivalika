import { PageHeader } from "@/components/admin/shell";
import { buildCategoryTree, flattenTree } from "@/lib/categories";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { CategoriesManager } from "./categories-manager";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdmin();

  const db = createAdminClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    db.from("categories").select("*").order("position"),
    db.from("products").select("category_id"),
  ]);

  const productCounts = new Map<string, number>();
  for (const p of products ?? []) {
    productCounts.set(p.category_id, (productCounts.get(p.category_id) ?? 0) + 1);
  }

  const tree = buildCategoryTree(categories ?? []);
  const flat = flattenTree(tree).map((node) => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
    parent_id: node.parent_id,
    position: node.position,
    is_active: node.is_active,
    show_in_nav: node.show_in_nav,
    description: node.description,
    image_url: node.image_url,
    seo_title: node.seo_title,
    seo_description: node.seo_description,
    depth: node.depth,
    path: node.path,
    childCount: node.children.length,
    productCount: productCounts.get(node.id) ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Categories"
        description="Nested as deeply as you like. Slugs become URLs, so changing one after launch costs search ranking — get them right first."
      />
      <CategoriesManager categories={flat} />
    </>
  );
}
