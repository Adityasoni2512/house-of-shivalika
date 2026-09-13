import type { MetadataRoute } from "next";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildCategoryTree, flattenTree } from "@/lib/categories";

export const revalidate = 3600;

const CONTENT_PAGES = [
  "about",
  "contact",
  "size-guide",
  "shipping",
  "returns",
  "privacy",
  "terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const db = createAdminClient();

    const [{ data: products }, { data: categories }, { data: pages }] =
      await Promise.all([
        db
          .from("products")
          .select("slug, updated_at")
          .eq("status", "active")
          .order("published_at", { ascending: false }),
        db.from("categories").select("*").eq("is_active", true).order("position"),
        db.from("pages").select("slug, updated_at").eq("is_published", true),
      ]);

    for (const node of flattenTree(buildCategoryTree(categories ?? []))) {
      entries.push({
        url: `${base}/shop/${node.path.join("/")}`,
        lastModified: new Date(node.updated_at),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    for (const product of products ?? []) {
      entries.push({
        url: `${base}/product/${product.slug}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    const publishedSlugs = new Set((pages ?? []).map((p) => p.slug));
    for (const slug of CONTENT_PAGES) {
      if (!publishedSlugs.has(slug)) continue;
      const page = (pages ?? []).find((p) => p.slug === slug);
      entries.push({
        url: `${base}/${slug}`,
        lastModified: page ? new Date(page.updated_at) : undefined,
        changeFrequency: "monthly",
        priority: 0.4,
      });
    }
  } catch {
    // A database hiccup must not produce a broken sitemap — serve what we have.
  }

  return entries;
}
