"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
];

/**
 * All filter state is in the URL, never component state — so a filtered view is
 * shareable, indexable, survives refresh, and the back button behaves.
 */
export function StorefrontFilters({
  basePath,
  sizes,
  colours,
  maxPrice,
  resultCount,
}: {
  basePath: string;
  sizes: string[];
  colours: string[];
  maxPrice: number;
  resultCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const activeSizes = searchParams.getAll("size");
  const activeColours = searchParams.getAll("colour");
  const activeSort = searchParams.get("sort") ?? "newest";
  const inStockOnly = searchParams.get("stock") === "in";
  const priceMax = searchParams.get("max");

  const activeCount =
    activeSizes.length +
    activeColours.length +
    (inStockOnly ? 1 : 0) +
    (priceMax ? 1 : 0);

  function push(params: URLSearchParams) {
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath));
  }

  function toggleMulti(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(key);

    params.delete(key);
    for (const v of current) {
      if (v !== value) params.append(key, v);
    }
    if (!current.includes(value)) params.append(key, value);

    push(params);
  }

  function setSingle(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    push(params);
  }

  function clearAll() {
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    push(params);
  }

  const panel = (
    <div className="space-y-8">
      {sizes.length > 0 ? (
        <fieldset>
          <legend className="label-caps text-ink-muted">Size</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {sizes.map((size) => {
              const active = activeSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleMulti("size", size)}
                  aria-pressed={active}
                  className={cn(
                    "label-caps-sm min-w-11 rounded-full border px-3 py-2 transition-colors",
                    active
                      ? "border-ink bg-ink text-paper"
                      : "border-line hover:border-ink",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {colours.length > 0 ? (
        <fieldset>
          <legend className="label-caps text-ink-muted">Colour</legend>
          <div className="mt-3 space-y-1.5">
            {colours.map((colour) => (
              <label key={colour} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={activeColours.includes(colour)}
                  onChange={() => toggleMulti("colour", colour)}
                  className="size-4 accent-[var(--color-ink)]"
                />
                {colour}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="label-caps text-ink-muted">Price</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {[1000, 2000, 3000, 5000]
            .filter((limit) => limit < maxPrice)
            .map((limit) => {
              const active = priceMax === String(limit);
              return (
                <button
                  key={limit}
                  type="button"
                  onClick={() => setSingle("max", active ? null : String(limit))}
                  aria-pressed={active}
                  className={cn(
                    "label-caps-sm rounded-full border px-3 py-2 transition-colors",
                    active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
                  )}
                >
                  Under ₹{limit.toLocaleString("en-IN")}
                </button>
              );
            })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label-caps text-ink-muted">Availability</legend>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={() => setSingle("stock", inStockOnly ? null : "in")}
            className="size-4 accent-[var(--color-ink)]"
          />
          In stock only
        </label>
      </fieldset>

      {activeCount > 0 ? (
        <button
          type="button"
          onClick={clearAll}
          className="label-caps-sm text-accent underline underline-offset-4"
        >
          Clear all filters
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Mobile control bar */}
      <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="size-4" />
          Filter{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>

        <select
          value={activeSort}
          onChange={(e) => setSingle("sort", e.target.value)}
          aria-label="Sort products"
          className="label-caps-sm cursor-pointer border-none bg-transparent py-2 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop rail */}
      <div className="hidden lg:block">
        <div className="mb-8 flex items-center justify-between border-b border-line pb-4">
          <p className="text-xs text-ink-muted">
            {resultCount} {resultCount === 1 ? "product" : "products"}
          </p>
          <select
            value={activeSort}
            onChange={(e) => setSingle("sort", e.target.value)}
            aria-label="Sort products"
            className="label-caps-sm cursor-pointer border-none bg-transparent py-1 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </div>
        {panel}
      </div>

      {/* Mobile sheet */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/30"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-paper">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-paper px-6 py-4">
              <span className="label-caps">Filters</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="-mr-2 p-2"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="px-6 py-6">{panel}</div>

            <div className="sticky bottom-0 border-t border-line bg-paper px-6 py-4">
              <Button full onClick={() => setOpen(false)}>
                Show {resultCount} {resultCount === 1 ? "product" : "products"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
