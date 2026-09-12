"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, Table, Td, Th } from "@/components/admin/shell";
import { Input } from "@/components/ui/input";
import { adjustStockAction, bulkSetStockAction } from "@/lib/actions/stock";
import { cn } from "@/lib/utils";

export type StockRow = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  productStatus: string;
  imageUrl: string | null;
  sizeLabel: string;
  sizePosition: number;
  stockQty: number;
};

const FILTERS = [
  { value: "all", label: "All sizes" },
  { value: "low", label: "Low (1–3)" },
  { value: "out", label: "Sold out" },
];

export function StockTable({
  rows,
  filter,
  query,
  outOfStock,
  lowStock,
}: {
  rows: StockRow[];
  filter: string;
  query: string;
  outOfStock: number;
  lowStock: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  /** Local edits, keyed by variant id, not yet written. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (search === query) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("q", search);
      else params.delete("q");
      router.push(`/admin/stock?${params.toString()}`);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("filter");
    else params.set("filter", value);
    router.push(`/admin/stock?${params.toString()}`);
  }

  function adjust(row: StockRow, delta: number) {
    startTransition(async () => {
      const result = await adjustStockAction(row.variantId, delta);
      if (result.error) toast.error(result.error);
    });
  }

  function saveAll() {
    const updates = Object.entries(drafts)
      .map(([variantId, value]) => ({ variantId, quantity: Number(value) }))
      .filter(
        (u) =>
          Number.isInteger(u.quantity) &&
          u.quantity >= 0 &&
          u.quantity !== rows.find((r) => r.variantId === u.variantId)?.stockQty,
      );

    if (updates.length === 0) {
      toast.info("Nothing changed");
      return;
    }

    startTransition(async () => {
      const result = await bulkSetStockAction(updates);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${updates.length} row${updates.length === 1 ? "" : "s"} saved`);
        setDrafts({});
      }
    });
  }

  const dirtyCount = Object.entries(drafts).filter(([variantId, value]) => {
    const row = rows.find((r) => r.variantId === variantId);
    return row && Number(value) !== row.stockQty && value !== "";
  }).length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product or SKU"
            aria-label="Search stock"
            className="pl-9"
          />
        </div>

        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "label-caps-sm rounded-xs border px-3 py-2.5 transition-colors",
                filter === f.value
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink-muted hover:border-ink-muted/50 hover:text-ink",
              )}
            >
              {f.label}
              {f.value === "out" && outOfStock > 0 ? ` (${outOfStock})` : ""}
              {f.value === "low" && lowStock > 0 ? ` (${lowStock})` : ""}
            </button>
          ))}
        </div>

        {dirtyCount > 0 ? (
          <Button onClick={saveAll} disabled={pending}>
            {pending ? "Saving…" : `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}`}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader
          title={`${rows.length} size${rows.length === 1 ? "" : "s"}`}
          action={
            <span className="text-xs text-ink-muted">
              Type a number to edit, or use −/+ for a quick adjustment
            </span>
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            title={
              filter === "out"
                ? "Nothing is sold out"
                : filter === "low"
                  ? "Nothing is running low"
                  : "No stock to show"
            }
            description={
              filter === "all"
                ? "Add products with sizes and they will appear here."
                : "Clear the filter to see everything."
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-14" />
                <Th>Product</Th>
                <Th>Size</Th>
                <Th className="w-44 text-center">Stock</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const draft = drafts[row.variantId];
                const current = draft !== undefined ? draft : String(row.stockQty);
                const dirty = draft !== undefined && Number(draft) !== row.stockQty;

                return (
                  <tr
                    key={row.variantId}
                    className={cn(
                      pending ? "opacity-60" : undefined,
                      dirty ? "bg-accent-soft/40" : undefined,
                    )}
                  >
                    <Td>
                      <div className="relative h-12 w-9 overflow-hidden bg-accent-soft">
                        {row.imageUrl ? (
                          <Image
                            src={row.imageUrl}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                    </Td>

                    <Td>
                      <Link
                        href={`/admin/products/${row.productId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {row.productName}
                      </Link>
                      <div className="font-mono text-xs text-ink-muted">
                        {row.sku}
                      </div>
                    </Td>

                    <Td>
                      <span className="label-caps">{row.sizeLabel}</span>
                    </Td>

                    <Td>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => adjust(row, -1)}
                          disabled={pending || row.stockQty === 0}
                          aria-label={`Decrease stock for ${row.productName} size ${row.sizeLabel}`}
                        >
                          <Minus className="size-4" />
                        </Button>

                        <Input
                          type="number"
                          min={0}
                          value={current}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.variantId]: e.target.value,
                            }))
                          }
                          aria-label={`Stock for ${row.productName} size ${row.sizeLabel}`}
                          className="h-9 w-20 text-center tabular-nums"
                        />

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => adjust(row, 1)}
                          disabled={pending}
                          aria-label={`Increase stock for ${row.productName} size ${row.sizeLabel}`}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </Td>

                    <Td>
                      {row.stockQty === 0 ? (
                        <Badge variant="sale">Sold out</Badge>
                      ) : row.stockQty <= 3 ? (
                        <Badge variant="warning">Low</Badge>
                      ) : (
                        <Badge variant="success">In stock</Badge>
                      )}
                      {row.productStatus !== "active" ? (
                        <span className="ml-1.5 text-xs text-ink-muted">
                          ({row.productStatus})
                        </span>
                      ) : null}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
