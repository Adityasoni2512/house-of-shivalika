import "server-only";

import { cache } from "react";

import { buildCategoryTree, type CategoryNode } from "@/lib/categories";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Storefront reads. Everything here returns only what is publicly visible —
 * active products, active categories, approved reviews — so a page can never
 * leak a draft by forgetting a filter.
 */

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp: number | null;
  colourName: string | null;
  primaryImage: string | null;
  hoverImage: string | null;
  primaryAlt: string;
  inStock: boolean;
  categorySlugPath: string[];
};

export type ProductDetail = ProductCard & {
  sku: string;
  shortDescription: string | null;
  description: string | null;
  fabric: string | null;
  care: string | null;
  occasion: string | null;
  colourHex: string | null;
  attributes: Record<string, string>;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string;
  categoryName: string;
  images: { url: string; alt: string }[];
  variants: { id: string; sizeId: string; label: string; stock: number }[];
};

const CARD_SELECT =
  "id, name, slug, price, mrp, colour_name, category_id, product_images(url, alt_text, position), product_variants(stock_qty, is_active)";

type CardRow = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  mrp: number | string | null;
  colour_name: string | null;
  category_id: string;
  product_images: { url: string; alt_text: string | null; position: number }[];
  product_variants: { stock_qty: number; is_active: boolean }[];
};

function toCard(row: CardRow, pathById: Map<string, string[]>): ProductCard {
  const images = [...row.product_images].sort((a, b) => a.position - b.position);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: Number(row.price),
    mrp: row.mrp === null ? null : Number(row.mrp),
    colourName: row.colour_name,
    primaryImage: images[0]?.url ?? null,
    hoverImage: images[1]?.url ?? null,
    primaryAlt: images[0]?.alt_text ?? row.name,
    inStock: row.product_variants.some((v) => v.is_active && v.stock_qty > 0),
    categorySlugPath: pathById.get(row.category_id) ?? [],
  };
}

/** Active category tree, used by the nav, listing pages and breadcrumbs. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const db = createAdminClient();
  const { data } = await db
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("position");

  return buildCategoryTree(data ?? []);
});

/** category id -> slug path, so a card can link to /shop/a/b. */
export const getCategoryPaths = cache(async (): Promise<Map<string, string[]>> => {
  const tree = await getCategoryTree();
  const map = new Map<string, string[]>();

  const walk = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      map.set(node.id, node.path);
      walk(node.children);
    }
  };

  walk(tree);
  return map;
});

export type ProductFilters = {
  categoryIds?: string[];
  sizeLabels?: string[];
  colours?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "discount";
  search?: string;
  limit?: number;
  offset?: number;
};

export async function getProducts(
  filters: ProductFilters = {},
): Promise<{ products: ProductCard[]; total: number }> {
  const db = createAdminClient();
  const pathById = await getCategoryPaths();

  let builder = db
    .from("products")
    .select(CARD_SELECT, { count: "exact" })
    .eq("status", "active");

  if (filters.categoryIds?.length) {
    builder = builder.in("category_id", filters.categoryIds);
  }
  if (filters.colours?.length) {
    builder = builder.in("colour_name", filters.colours);
  }
  if (filters.minPrice !== undefined) builder = builder.gte("price", filters.minPrice);
  if (filters.maxPrice !== undefined) builder = builder.lte("price", filters.maxPrice);

  if (filters.search) {
    // websearch_to_tsquery handles quoted phrases and OR the way users expect.
    builder = builder.textSearch("search_vector", filters.search, {
      type: "websearch",
      config: "english",
    });
  }

  switch (filters.sort) {
    case "price-asc":
      builder = builder.order("price", { ascending: true });
      break;
    case "price-desc":
      builder = builder.order("price", { ascending: false });
      break;
    default:
      builder = builder.order("published_at", {
        ascending: false,
        nullsFirst: false,
      });
  }

  const { data, count } = await builder;
  let products = (data ?? []).map((row) => toCard(row as CardRow, pathById));

  /*
   * Size and stock filtering happen here rather than in SQL: both need the
   * variant rows we already fetched, and a join-based filter would return one
   * product row per matching variant, requiring a de-dupe pass anyway.
   */
  if (filters.sizeLabels?.length) {
    const wanted = new Set(filters.sizeLabels);
    const { data: matching } = await db
      .from("product_variants")
      .select("product_id, sizes(label)")
      .gt("stock_qty", 0)
      .eq("is_active", true);

    const allowed = new Set(
      (matching ?? [])
        .filter((v) => v.sizes && wanted.has(v.sizes.label))
        .map((v) => v.product_id),
    );

    products = products.filter((p) => allowed.has(p.id));
  }

  if (filters.inStockOnly) {
    products = products.filter((p) => p.inStock);
  }

  if (filters.sort === "discount") {
    products.sort((a, b) => {
      const da = a.mrp && a.mrp > a.price ? (a.mrp - a.price) / a.mrp : 0;
      const dbv = b.mrp && b.mrp > b.price ? (b.mrp - b.price) / b.mrp : 0;
      return dbv - da;
    });
  }

  const total = filters.sizeLabels?.length || filters.inStockOnly
    ? products.length
    : (count ?? products.length);

  if (filters.offset !== undefined || filters.limit !== undefined) {
    const start = filters.offset ?? 0;
    const end = filters.limit ? start + filters.limit : undefined;
    products = products.slice(start, end);
  }

  return { products, total };
}

export const getProductBySlug = cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const db = createAdminClient();
    const pathById = await getCategoryPaths();

    const { data } = await db
      .from("products")
      .select(
        "*, categories(id, name), product_images(url, alt_text, position), product_variants(id, size_id, stock_qty, is_active, sizes(label, position))",
      )
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (!data) return null;

    const images = [...data.product_images].sort((a, b) => a.position - b.position);
    const variants = data.product_variants
      .filter((v) => v.is_active && v.sizes)
      .sort((a, b) => (a.sizes?.position ?? 0) - (b.sizes?.position ?? 0));

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      sku: data.sku,
      price: Number(data.price),
      mrp: data.mrp === null ? null : Number(data.mrp),
      colourName: data.colour_name,
      colourHex: data.colour_hex,
      shortDescription: data.short_description,
      description: data.description,
      fabric: data.fabric,
      care: data.care,
      occasion: data.occasion,
      attributes:
        data.attributes && typeof data.attributes === "object"
          ? (data.attributes as Record<string, string>)
          : {},
      seoTitle: data.seo_title,
      seoDescription: data.seo_description,
      categoryId: data.category_id,
      categoryName: data.categories?.name ?? "",
      categorySlugPath: pathById.get(data.category_id) ?? [],
      primaryImage: images[0]?.url ?? null,
      hoverImage: images[1]?.url ?? null,
      primaryAlt: images[0]?.alt_text ?? data.name,
      images: images.map((image) => ({
        url: image.url,
        alt: image.alt_text ?? data.name,
      })),
      variants: variants.map((v) => ({
        id: v.id,
        sizeId: v.size_id,
        label: v.sizes!.label,
        stock: v.stock_qty,
      })),
      inStock: variants.some((v) => v.stock_qty > 0),
    };
  },
);

export const getActiveBanners = cache(async () => {
  const db = createAdminClient();
  const now = new Date().toISOString();

  const { data } = await db
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("position");

  // Scheduling is filtered here rather than in SQL so a null start or end date
  // means "no bound" instead of excluding the row.
  return (data ?? []).filter(
    (banner) =>
      (!banner.starts_at || banner.starts_at <= now) &&
      (!banner.ends_at || banner.ends_at >= now),
  );
});

export const getPage = cache(async (slug: string) => {
  const db = createAdminClient();
  const { data } = await db
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return data;
});

export async function getProductReviews(productId: string) {
  const db = createAdminClient();

  const { data } = await db
    .from("reviews")
    .select("*, review_images(url, position)")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const reviews = (data ?? []).map((review) => ({
    id: review.id,
    reviewerName: review.reviewer_name,
    rating: review.rating,
    title: review.title,
    body: review.body,
    isVerifiedBuyer: review.is_verified_buyer,
    createdAt: review.created_at,
    images: [...review.review_images]
      .sort((a, b) => a.position - b.position)
      .map((image) => image.url),
  }));

  const count = reviews.length;
  const average =
    count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));

  return { reviews, count, average, distribution };
}

/** Distinct colour names in the active catalogue, for the listing filter. */
export const getColourOptions = cache(async (): Promise<string[]> => {
  const db = createAdminClient();
  const { data } = await db
    .from("products")
    .select("colour_name")
    .eq("status", "active")
    .not("colour_name", "is", null);

  const unique = new Set(
    (data ?? []).map((r) => r.colour_name).filter((c): c is string => Boolean(c)),
  );

  return [...unique].sort();
});

export const getSizeOptions = cache(async (): Promise<string[]> => {
  const db = createAdminClient();
  const { data } = await db
    .from("sizes")
    .select("label")
    .eq("is_active", true)
    .order("position");

  return (data ?? []).map((s) => s.label);
});
