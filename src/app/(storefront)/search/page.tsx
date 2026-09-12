import Link from "next/link";
import type { Metadata } from "next";

import { ProductGrid } from "@/components/storefront/product-card";
import { TrackView } from "@/components/storefront/track-view";
import { buttonVariants } from "@/components/ui/button";
import { getProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;

  return {
    title: q ? `Search: ${q}` : "Search",
    // Search result pages have no standalone search value and risk thin-content
    // penalties, so they stay out of the index.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const { products, total } = query
    ? await getProducts({ search: query, limit: 48 })
    : { products: [], total: 0 };

  return (
    <div className="container-page py-10 lg:py-16">
      {query ? (
        <TrackView event="search" payload={{ search_query: query }} />
      ) : null}

      <header className="mb-10">
        <p className="label-caps text-ink-muted">Search</p>
        <h1 className="mt-2 font-serif text-3xl md:text-4xl">
          {query ? `“${query}”` : "Search"}
        </h1>
        {query ? (
          <p className="mt-3 text-sm text-ink-muted">
            {total} {total === 1 ? "result" : "results"}
          </p>
        ) : null}
      </header>

      {/* Re-search inline, so a near-miss does not need a trip to the header */}
      <form action="/search" className="mb-12 max-w-md">
        <label htmlFor="q" className="sr-only">
          Search products
        </label>
        <div className="flex items-center gap-3 border-b border-ink pb-2">
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="What are you looking for?"
            className="w-full bg-transparent text-lg placeholder:text-ink-muted/50 focus:outline-none"
          />
          <button type="submit" className="label-caps-sm text-accent">
            Search
          </button>
        </div>
      </form>

      {!query ? (
        <p className="text-sm text-ink-muted">
          Type something above to search the collection.
        </p>
      ) : products.length === 0 ? (
        <div className="border border-line bg-surface px-6 py-20 text-center">
          <p className="font-serif text-xl">Nothing found</p>
          <p className="mx-auto mt-3 max-w-sm text-sm text-ink-muted">
            We could not find anything matching “{query}”. Try a different word,
            or browse the full collection.
          </p>
          <Link
            href="/shop"
            className={`${buttonVariants({ variant: "secondary" })} mt-7`}
          >
            Shop all
          </Link>
        </div>
      ) : (
        <ProductGrid products={products} priorityCount={4} />
      )}
    </div>
  );
}
