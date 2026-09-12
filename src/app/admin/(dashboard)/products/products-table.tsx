"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Table, Td, Th } from "@/components/admin/shell";
import {
  deleteProductAction,
  duplicateProductAction,
  setProductStatusAction,
} from "@/lib/actions/products";
import { discountPercent, formatPrice } from "@/lib/utils";

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  mrp: number | null;
  status: string;
  is_featured: boolean;
  categoryName: string;
  imageUrl: string | null;
  totalStock: number;
  variantCount: number;
};

export function ProductsTable({
  products,
  page,
  totalPages,
  total,
}: {
  products: ProductListItem[];
  page: number;
  totalPages: number;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`/admin/products?${params.toString()}`);
  }

  function duplicate(product: ProductListItem) {
    startTransition(async () => {
      const result = await duplicateProductAction(product.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Duplicated as a draft");
        if (result.id) router.push(`/admin/products/${result.id}`);
      }
    });
  }

  function changeStatus(product: ProductListItem, status: string) {
    startTransition(async () => {
      const result = await setProductStatusAction(
        product.id,
        status as "draft" | "active" | "archived",
      );
      if (result.error) toast.error(result.error);
      else toast.success(`Moved to ${status}`);
    });
  }

  function remove(product: ProductListItem) {
    const confirmed = confirm(
      `Delete "${product.name}"?\n\nThis also deletes its images and reviews. Past orders keep their own record and are unaffected.\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (result.error) toast.error(result.error);
      else toast.success("Product deleted");
    });
  }

  if (products.length === 0) {
    return (
      <Card>
        <EmptyState
          title={total === 0 ? "No products yet" : "Nothing matches those filters"}
          description={
            total === 0
              ? "Create your first product. You will need a category and at least one size before it can go live."
              : "Try clearing the search or filters."
          }
          action={
            total === 0 ? (
              <Link
                href="/admin/products/new"
                className="label-caps text-accent underline underline-offset-4"
              >
                Create the first product
              </Link>
            ) : null
          }
        />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th className="w-16" />
              <Th>Product</Th>
              <Th>Category</Th>
              <Th className="text-right">Price</Th>
              <Th className="text-right">Stock</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const discount = discountPercent(product.mrp, product.price);

              return (
                <tr key={product.id} className={pending ? "opacity-60" : undefined}>
                  <Td>
                    <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-accent-soft">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                  </Td>

                  <Td>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-xs text-ink-muted">
                        {product.sku}
                      </span>
                      {product.is_featured ? (
                        <Badge variant="neutral">Featured</Badge>
                      ) : null}
                    </div>
                  </Td>

                  <Td className="text-ink-muted">{product.categoryName}</Td>

                  <Td className="text-right">
                    <span className="tabular-nums">
                      {formatPrice(product.price)}
                    </span>
                    {discount ? (
                      <span className="ml-1.5 text-xs text-sale">−{discount}%</span>
                    ) : null}
                  </Td>

                  <Td className="text-right">
                    {product.variantCount === 0 ? (
                      <span className="text-xs text-ink-muted">No sizes</span>
                    ) : product.totalStock === 0 ? (
                      <Badge variant="sale">Sold out</Badge>
                    ) : (
                      <span className="tabular-nums">
                        {product.totalStock}
                        <span className="ml-1 text-xs text-ink-muted">
                          / {product.variantCount} sizes
                        </span>
                      </span>
                    )}
                  </Td>

                  <Td>
                    <select
                      value={product.status}
                      onChange={(e) => changeStatus(product, e.target.value)}
                      disabled={pending}
                      aria-label={`Status for ${product.name}`}
                      className="cursor-pointer border-none bg-transparent p-0 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                    <div className="mt-0.5">
                      <Badge variant={statusVariant(product.status)}>
                        {product.status}
                      </Badge>
                    </div>
                  </Td>

                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => duplicate(product)}
                        disabled={pending}
                        title="Duplicate — the usual way to add another colourway"
                        aria-label={`Duplicate ${product.name}`}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Link
                        href={`/admin/products/${product.id}`}
                        aria-label={`Edit ${product.name}`}
                        className="inline-flex size-10 items-center justify-center text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink"
                      >
                        <MoreHorizontal className="size-4" />
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(product)}
                        disabled={pending}
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-ink-muted">
            Page {page} of {totalPages} · {total} products
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
