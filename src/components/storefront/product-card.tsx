import Image from "next/image";
import Link from "next/link";

import type { ProductCard as ProductCardData } from "@/lib/queries";
import { cn, discountPercent, formatPrice } from "@/lib/utils";

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardData;
  /** Only ever true for the first row — everything else lazy-loads. */
  priority?: boolean;
}) {
  const discount = discountPercent(product.mrp, product.price);

  return (
    <article className="group">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="ratio-product relative">
          {product.primaryImage ? (
            <>
              <Image
                src={product.primaryImage}
                alt={product.primaryAlt}
                fill
                priority={priority}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={cn(
                  "object-cover transition-opacity duration-300",
                  product.hoverImage ? "group-hover:opacity-0" : "",
                )}
              />

              {/* Second image revealed on hover — desktop only, no layout cost */}
              {product.hoverImage ? (
                <Image
                  src={product.hoverImage}
                  alt=""
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="hidden object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:block"
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="label-caps-sm text-ink-muted/60">No image</span>
            </div>
          )}

          {discount ? (
            <span className="label-caps-sm absolute left-0 top-0 bg-sale px-2 py-1 text-white">
              −{discount}%
            </span>
          ) : null}

          {!product.inStock ? (
            <div className="absolute inset-0 flex items-center justify-center bg-paper/70">
              <span className="label-caps border border-ink bg-paper px-3 py-1.5">
                Sold out
              </span>
            </div>
          ) : null}
        </div>

        <div className="pt-3">
          <h3 className="text-sm leading-snug">{product.name}</h3>

          {product.colourName ? (
            <p className="mt-0.5 text-xs text-ink-muted">{product.colourName}</p>
          ) : null}

          <p className="mt-1.5 flex items-baseline gap-2 text-sm">
            <span className="tabular-nums">{formatPrice(product.price)}</span>
            {discount ? (
              <span className="text-xs text-ink-muted line-through tabular-nums">
                {formatPrice(product.mrp)}
              </span>
            ) : null}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({
  products,
  priorityCount = 4,
}: {
  products: ProductCardData[];
  priorityCount?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}
