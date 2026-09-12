"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { flushNow, track } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";

import { LeadForm } from "./lead-form";

export function CartView({
  whatsappNumber,
  brandName,
  shippingNote,
  flatRate,
  freeThreshold,
  siteUrl,
}: {
  whatsappNumber: string | null;
  brandName: string;
  shippingNote: string;
  flatRate: number;
  freeThreshold: number;
  siteUrl: string;
}) {
  const { lines, subtotal, itemCount, setQty, remove, isHydrated } = useCart();
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (isHydrated && lines.length > 0) {
      track("cart_view", { value: subtotal });
    }
    // Only on first hydration — not on every quantity tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  const qualifiesForFreeShipping =
    freeThreshold > 0 && subtotal >= freeThreshold;
  const shipping = qualifiesForFreeShipping ? 0 : flatRate;
  const total = subtotal + shipping;

  // Render nothing cart-shaped until localStorage has been read, or the server
  // HTML (empty cart) would flash before the real contents appear.
  if (!isHydrated) {
    return (
      <div className="container-page section-y">
        <h1 className="font-serif text-3xl md:text-4xl">Cart</h1>
        <div className="mt-10 h-40 animate-pulse bg-accent-soft/50" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page section-y">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-serif text-3xl md:text-4xl">Your cart is empty</h1>
          <p className="mt-4 text-sm text-ink-muted">
            Nothing here yet. Have a look at what is new.
          </p>
          <Link href="/shop" className={`${buttonVariants()} mt-8`}>
            Shop the collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 lg:py-16">
      <h1 className="font-serif text-3xl md:text-4xl">Cart</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </p>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
        {/* Lines */}
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-4 py-5">
              <Link
                href={`/product/${line.slug}`}
                className="relative h-28 w-21 shrink-0 overflow-hidden bg-accent-soft"
                style={{ width: "5.25rem" }}
              >
                {line.imageUrl ? (
                  <Image
                    src={line.imageUrl}
                    alt={line.name}
                    fill
                    sizes="84px"
                    className="object-cover"
                  />
                ) : null}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/product/${line.slug}`}
                        className="block text-sm leading-snug hover:text-accent"
                      >
                        {line.name}
                      </Link>
                      <p className="mt-1 text-xs text-ink-muted">
                        Size {line.sizeLabel} · {line.sku}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        remove(line.variantId);
                        track("remove_from_cart", { product_id: line.productId });
                        toast.success("Removed");
                      }}
                      aria-label={`Remove ${line.name}`}
                      className="-mr-1 shrink-0 p-1 text-ink-muted transition-colors hover:text-sale"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center border border-line">
                    <button
                      type="button"
                      onClick={() => setQty(line.variantId, line.qty - 1)}
                      aria-label="Decrease quantity"
                      className="p-2 text-ink-muted transition-colors hover:text-ink"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-8 text-center text-sm tabular-nums">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(line.variantId, line.qty + 1)}
                      disabled={line.qty >= line.maxQty}
                      aria-label="Increase quantity"
                      className="p-2 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  <span className="text-sm tabular-nums">
                    {formatPrice(line.price * line.qty)}
                  </span>
                </div>

                {line.qty >= line.maxQty ? (
                  <p className="mt-1.5 text-xs text-ink-muted">
                    Only {line.maxQty} available
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="border border-line bg-surface p-6">
            <h2 className="label-caps">Summary</h2>

            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping</dt>
                <dd className="tabular-nums">
                  {flatRate === 0 && freeThreshold === 0 ? (
                    <span className="text-ink-muted">Confirmed on WhatsApp</span>
                  ) : qualifiesForFreeShipping ? (
                    <span className="text-success">Free</span>
                  ) : (
                    formatPrice(shipping)
                  )}
                </dd>
              </div>

              {freeThreshold > 0 && !qualifiesForFreeShipping ? (
                <p className="pt-1 text-xs text-accent">
                  Add {formatPrice(freeThreshold - subtotal)} more for free
                  shipping
                </p>
              ) : null}

              <div className="flex justify-between border-t border-line pt-3 text-base">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(total)}</dd>
              </div>
            </dl>

            <p className="mt-2 text-xs text-ink-muted">Inclusive of all taxes</p>

            <div className="mt-6">
              {whatsappNumber ? (
                <Button
                  full
                  size="lg"
                  onClick={() => {
                    setFormOpen(true);
                    track("lead_form_open", { value: subtotal });
                  }}
                >
                  Continue on WhatsApp
                </Button>
              ) : (
                <p className="border border-line bg-paper px-4 py-3 text-xs text-ink-muted">
                  Ordering is not available yet — no WhatsApp number has been
                  configured.
                </p>
              )}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              {shippingNote ||
                "We will confirm availability, delivery and payment over WhatsApp. No payment is taken on this site."}
            </p>

            <Link
              href="/shop"
              className="label-caps-sm mt-5 block text-center text-accent underline underline-offset-4"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>

      {formOpen && whatsappNumber ? (
        <LeadForm
          whatsappNumber={whatsappNumber}
          brandName={brandName}
          siteUrl={siteUrl}
          onClose={() => setFormOpen(false)}
          onSent={() => {
            flushNow();
            setFormOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
