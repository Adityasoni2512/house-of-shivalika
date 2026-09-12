"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Input, Select } from "@/components/ui/input";

/**
 * Filter state lives in the URL, not in component state — so a filtered view is
 * shareable, survives a refresh, and works with the back button.
 */
export function ProductFilters({
  categories,
  defaultQuery,
  defaultStatus,
  defaultCategory,
}: {
  categories: { id: string; name: string; depth: number }[];
  defaultQuery: string;
  defaultStatus: string;
  defaultCategory: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(defaultQuery);

  function apply(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // any filter change returns to page 1

    startTransition(() => {
      router.push(`/admin/products?${params.toString()}`);
    });
  }

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    if (query === defaultQuery) return;

    const timer = setTimeout(() => apply({ q: query }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasFilters = Boolean(defaultQuery || defaultStatus || defaultCategory);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or SKU"
          aria-label="Search products"
          className="pl-9"
        />
      </div>

      <Select
        value={defaultStatus}
        onChange={(e) => apply({ status: e.target.value })}
        aria-label="Filter by status"
        className="w-40"
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </Select>

      <Select
        value={defaultCategory}
        onChange={(e) => apply({ category: e.target.value })}
        aria-label="Filter by category"
        className="w-52"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {"— ".repeat(c.depth)}
            {c.name}
          </option>
        ))}
      </Select>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            startTransition(() => router.push("/admin/products"));
          }}
          className="label-caps-sm flex items-center gap-1 px-2 py-2 text-ink-muted transition-colors hover:text-ink"
        >
          <X className="size-3.5" /> Clear
        </button>
      ) : null}
    </div>
  );
}
