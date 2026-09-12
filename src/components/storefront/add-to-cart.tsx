"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export type Variant = {
  id: string;
  sizeId: string;
  label: string;
  stock: number;
};

const LOW_STOCK = 3;

export function AddToCart({
  productId,
  slug,
  name,
  sku,
  price,
  imageUrl,
  variants,
  whatsappAvailable,
}: {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  imageUrl: string | null;
  variants: Variant[];
  whatsappAvailable: boolean;
}) {
  const router = useRouter();
  const { add } = useCart();

  const inStockVariants = variants.filter((v) => v.stock > 0);
  const [selectedId, setSelectedId] = useState<string | null>(
    inStockVariants.length === 1 ? inStockVariants[0].id : null,
  );
  const [qty, setQty] = useState(1);

  const selected = variants.find((v) => v.id === selectedId) ?? null;
  const soldOut = inStockVariants.length === 0;

  function choose(variant: Variant) {
    if (variant.stock === 0) return;
    setSelectedId(variant.id);
    setQty(1);
    track("size_select", { product_id: productId, size_label: variant.label });
  }

  function addLine(): boolean {
    if (!selected) {
      toast.error("Choose a size first");
      return false;
    }

    add(
      {
        productId,
        variantId: selected.id,
        slug,
        name,
        sku,
        sizeLabel: selected.label,
        price,
        imageUrl,
        maxQty: selected.stock,
      },
      qty,
    );

    track("add_to_cart", {
      product_id: productId,
      size_label: selected.label,
      value: price * qty,
    });

    return true;
  }

  if (soldOut) {
    return (
      <div className="border border-line bg-surface px-5 py-6 text-center">
        <p className="label-caps">Sold out</p>
        <p className="mt-2 text-sm text-ink-muted">
          Every size is currently unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Size selector */}
      <div>
        <div className="flex items-baseline justify-between">
          <p className="label-caps">Size</p>
          <a
            href="/size-guide"
            className="text-xs text-accent underline underline-offset-4"
          >
            Size guide
          </a>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {variants.map((variant) => {
            const unavailable = variant.stock === 0;
            const active = variant.id === selectedId;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => choose(variant)}
                disabled={unavailable}
                aria-pressed={active}
                aria-label={
                  unavailable
                    ? `Size ${variant.label}, sold out`
                    : `Size ${variant.label}`
                }
                className={cn(
                  "label-caps-sm relative min-w-12 rounded-full border px-4 py-2.5 transition-colors",
                  active && "border-ink bg-ink text-paper",
                  !active && !unavailable && "border-line hover:border-ink",
                  unavailable &&
                    "cursor-not-allowed border-line text-ink-muted/50 line-through",
                )}
              >
                {variant.label}
              </button>
            );
          })}
        </div>

        {selected && selected.stock <= LOW_STOCK ? (
          <p className="mt-3 text-xs text-sale">
            Only {selected.stock} left in {selected.label}
          </p>
        ) : null}
      </div>

      {/* Quantity */}
      {selected ? (
        <div>
          <p className="label-caps">Quantity</p>
          <div className="mt-3 inline-flex items-center border border-line">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
              className="p-3 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-10 text-center text-sm tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(selected.stock, q + 1))}
              disabled={qty >= selected.stock}
              aria-label="Increase quantity"
              className="p-3 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="space-y-2.5">
        <Button
          full
          size="lg"
          disabled={!selected}
          onClick={() => {
            if (addLine()) toast.success(`${name} added to cart`);
          }}
        >
          {selected ? "Add to cart" : "Select a size"}
        </Button>

        {whatsappAvailable ? (
          <Button
            full
            size="lg"
            variant="secondary"
            disabled={!selected}
            onClick={() => {
              if (addLine()) router.push("/cart");
            }}
          >
            Order on WhatsApp
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-ink-muted">
        Orders are confirmed over WhatsApp — no online payment. We will reply with
        availability and delivery details.
      </p>
    </div>
  );
}
