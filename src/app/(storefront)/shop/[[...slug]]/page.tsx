import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { StorefrontFilters } from "@/components/storefront/product-filters";
import { ProductGrid } from "@/components/storefront/product-card";
import { buttonVariants } from "@/components/ui/button";
import { descendantIds, findByPath, type CategoryNode } from "@/lib/categories";
import {
  getCategoryTree,
  getColourOptions,
  getProducts,
  getSizeOptions,
} from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const revalidate = 60;

const PAGE_SIZE = 24;

type SearchParams = {
  size?: string | string[];
  colour?: string | string[];
  max?: string;
  stock?: string;
  sort?: string;
  page?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function resolveCategory(slug: string[] | undefined) {
  if (!slug || slug.length === 0) return null;

  const tree = await getCategoryTree();
  const node = findByPath(tree, slug);
  return node;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getSettings();
  const category = await resolveCategory(slug);

  if (slug && slug.length > 0 && !category) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  if (!category) {
    return {
      title: "Shop all",
      description: `Browse the full ${settings.brand_name} collection.`,
      alternates: { canonical: "/shop" },
    };
  }

  return {
    title: category.seo_title ?? category.name,
    description:
      category.seo_description ??
      category.description ??
      `Shop ${category.name} at ${settings.brand_name}.`,
    // Filtered views canonicalise to the clean URL so facets cannot dilute it.
    alternates: { canonical: `/shop/${category.path.join("/")}` },
  };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const category = await resolveCategory(slug);
  if (slug && slug.length > 0 && !category) notFound();

  const tree = await getCategoryTree();
  const basePath = category ? `/shop/${category.path.join("/")}` : "/shop";

  // A category page shows its own products plus everything nested beneath it.
  const categoryIds = category
    ? [category.id, ...descendantIds(category)]
    : undefined;

  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const sizes = toArray(query.size);
  const colours = toArray(query.colour);
  const maxPrice = query.max ? Number(query.max) : undefined;

  const [{ products, total }, sizeOptions, colourOptions] = await Promise.all([
    getProducts({
      categoryIds,
      sizeLabels: sizes.length ? sizes : undefined,
      colours: colours.length ? colours : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      inStockOnly: query.stock === "in",
      sort: (query.sort as "newest" | "price-asc" | "price-desc" | "discount") ?? "newest",
      limit: PAGE_SIZE * page,
    }),
    getSizeOptions(),
    getColourOptions(),
  ]);

  const hasMore = products.length < total;
  const trail = category ? buildTrail(category, tree) : [];
  const childCategories = category ? category.children : tree;

  return (
    <div className="container-page py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
          <li>
            <Link href="/" className="transition-colors hover:text-accent">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            {category ? (
              <Link href="/shop" className="transition-colors hover:text-accent">
                Shop
              </Link>
            ) : (
              <span className="text-ink">Shop</span>
            )}
          </li>
          {trail.map((node, index) => (
            <li key={node.id} className="flex items-center gap-1.5">
              <span aria-hidden>/</span>
              {index === trail.length - 1 ? (
                <span className="text-ink">{node.name}</span>
              ) : (
                <Link
                  href={`/shop/${node.path.join("/")}`}
                  className="transition-colors hover:text-accent"
                >
                  {node.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl">
          {category ? category.name : "Shop all"}
        </h1>
        {category?.description ? (
          <p className="mt-3 max-w-2xl text-sm text-ink-muted">
            {category.description}
          </p>
        ) : null}
      </header>

      {/* Subcategory chips */}
      {childCategories.length > 0 ? (
        <div className="mb-8 flex flex-wrap gap-2">
          {childCategories.map((child) => (
            <Link
              key={child.id}
              href={`/shop/${child.path.join("/")}`}
              className="label-caps-sm rounded-full border border-line px-4 py-2 transition-colors hover:border-ink"
            >
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[13rem_1fr] lg:gap-12">
        <aside>
          <StorefrontFilters
            basePath={basePath}
            sizes={sizeOptions}
            colours={colourOptions}
            maxPrice={10000}
            resultCount={total}
          />
        </aside>

        <div>
          {products.length === 0 ? (
            <div className="border border-line bg-surface px-6 py-20 text-center">
              <p className="font-serif text-xl">Nothing here yet</p>
              <p className="mx-auto mt-3 max-w-sm text-sm text-ink-muted">
                Nothing matches those filters. Try widening them, or browse the
                full collection.
              </p>
              <Link
                href="/shop"
                className={`${buttonVariants({ variant: "secondary" })} mt-7`}
              >
                Shop all
              </Link>
            </div>
          ) : (
            <>
              <ProductGrid products={products} priorityCount={4} />

              {hasMore ? (
                <div className="mt-14 text-center">
                  <Link
                    href={`${basePath}?${buildPageQuery(query, page + 1)}`}
                    scroll={false}
                    className={buttonVariants({ variant: "secondary" })}
                  >
                    Load more
                  </Link>
                  <p className="mt-3 text-xs text-ink-muted">
                    Showing {products.length} of {total}
                  </p>
                </div>
              ) : (
                <p className="mt-14 text-center text-xs text-ink-muted">
                  Showing all {total} {total === 1 ? "product" : "products"}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function buildTrail(node: CategoryNode, tree: CategoryNode[]): CategoryNode[] {
  const trail: CategoryNode[] = [];

  const walk = (nodes: CategoryNode[], path: CategoryNode[]): boolean => {
    for (const candidate of nodes) {
      const next = [...path, candidate];
      if (candidate.id === node.id) {
        trail.push(...next);
        return true;
      }
      if (walk(candidate.children, next)) return true;
    }
    return false;
  };

  walk(tree, []);
  return trail;
}

/** Preserve every active filter when paginating. */
function buildPageQuery(query: SearchParams, page: number): string {
  const params = new URLSearchParams();

  for (const size of toArray(query.size)) params.append("size", size);
  for (const colour of toArray(query.colour)) params.append("colour", colour);
  if (query.max) params.set("max", query.max);
  if (query.stock) params.set("stock", query.stock);
  if (query.sort) params.set("sort", query.sort);
  params.set("page", String(page));

  return params.toString();
}
