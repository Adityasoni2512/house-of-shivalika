import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AddToCart } from "@/components/storefront/add-to-cart";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductGrid } from "@/components/storefront/product-card";
import { ProductReviews } from "@/components/storefront/product-reviews";
import { TrackProductView } from "@/components/storefront/track-view";
import { Accordion } from "@/components/storefront/accordion";
import {
  getProductBySlug,
  getProductReviews,
  getProducts,
} from "@/lib/queries";
import { getSettings, whatsappNumber } from "@/lib/settings";
import { discountPercent, formatPrice } from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSettings(),
  ]);

  if (!product) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  const title =
    product.seoTitle ??
    `${product.name}${product.categoryName ? ` — ${product.categoryName}` : ""}`;

  const description =
    product.seoDescription ??
    product.shortDescription ??
    `${product.name} from ${settings.brand_name}. ${formatPrice(product.price)}.`;

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: product.primaryImage
        ? [{ url: product.primaryImage, alt: product.primaryAlt }]
        : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSettings(),
  ]);

  if (!product) notFound();

  const [reviewData, related] = await Promise.all([
    getProductReviews(product.id),
    getProducts({ categoryIds: [product.categoryId], limit: 5 }),
  ]);

  const relatedProducts = related.products
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const discount = discountPercent(product.mrp, product.price);
  const number = whatsappNumber(settings);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  /*
   * Product structured data. aggregateRating is deliberately omitted — the
   * client opted out of review rich snippets, and publishing rating markup on a
   * thin review base invites a manual penalty. Re-enable once reviews are real
   * and numerous.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    sku: product.sku,
    image: product.images.map((image) => image.url),
    brand: { "@type": "Brand", name: settings.brand_name },
    color: product.colourName ?? undefined,
    material: product.fabric ?? undefined,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/product/${product.slug}`,
      priceCurrency: "INR",
      price: product.price,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: settings.brand_name },
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${siteUrl}/shop` },
      ...(product.categorySlugPath.length > 0
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: product.categoryName,
              item: `${siteUrl}/shop/${product.categorySlugPath.join("/")}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.categorySlugPath.length > 0 ? 4 : 3,
        name: product.name,
        item: `${siteUrl}/product/${product.slug}`,
      },
    ],
  };

  const details: { label: string; value: string }[] = [
    product.fabric ? { label: "Fabric", value: product.fabric } : null,
    product.colourName ? { label: "Colour", value: product.colourName } : null,
    product.occasion ? { label: "Occasion", value: product.occasion } : null,
    { label: "SKU", value: product.sku },
    ...Object.entries(product.attributes).map(([label, value]) => ({
      label,
      value: String(value),
    })),
  ].filter((d): d is { label: string; value: string } => d !== null);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <TrackProductView productId={product.id} categoryId={product.categoryId} />

      <div className="container-page py-8 lg:py-12">
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
              <Link href="/shop" className="transition-colors hover:text-accent">
                Shop
              </Link>
            </li>
            {product.categorySlugPath.length > 0 ? (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href={`/shop/${product.categorySlugPath.join("/")}`}
                    className="transition-colors hover:text-accent"
                  >
                    {product.categoryName}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden>/</li>
            <li className="text-ink">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="lg:pt-4">
            <h1 className="font-serif text-3xl leading-tight md:text-4xl">
              {product.name}
            </h1>

            {/* Price block */}
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-xl tabular-nums">
                {formatPrice(product.price)}
              </span>
              {discount ? (
                <>
                  <span className="text-sm text-ink-muted line-through tabular-nums">
                    {formatPrice(product.mrp)}
                  </span>
                  <span className="label-caps-sm bg-sale px-2 py-1 text-white">
                    −{discount}%
                  </span>
                </>
              ) : null}
            </div>

            <p className="mt-1 text-xs text-ink-muted">Inclusive of all taxes</p>

            {product.shortDescription ? (
              <p className="mt-6 text-sm leading-relaxed text-ink-muted">
                {product.shortDescription}
              </p>
            ) : null}

            <div className="mt-8">
              <AddToCart
                productId={product.id}
                slug={product.slug}
                name={product.name}
                sku={product.sku}
                price={product.price}
                imageUrl={product.primaryImage}
                variants={product.variants}
                whatsappAvailable={Boolean(number)}
              />
            </div>

            {/* Accordions */}
            <div className="mt-10 border-t border-line">
              {product.description ? (
                <Accordion title="Description" defaultOpen>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                    {product.description}
                  </p>
                </Accordion>
              ) : null}

              {details.length > 0 ? (
                <Accordion title="Details">
                  <dl className="space-y-2 text-sm">
                    {details.map((detail) => (
                      <div key={detail.label} className="flex gap-3">
                        <dt className="w-28 shrink-0 text-ink-muted">
                          {detail.label}
                        </dt>
                        <dd>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Accordion>
              ) : null}

              {product.care ? (
                <Accordion title="Care">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                    {product.care}
                  </p>
                </Accordion>
              ) : null}

              <Accordion title="Shipping & returns">
                <p className="text-sm leading-relaxed text-ink-muted">
                  {settings.shipping_note ||
                    "Shipping and delivery details are confirmed over WhatsApp."}
                </p>
                <p className="mt-3 flex gap-4 text-sm">
                  <Link
                    href="/shipping"
                    className="text-accent underline underline-offset-4"
                  >
                    Shipping policy
                  </Link>
                  <Link
                    href="/returns"
                    className="text-accent underline underline-offset-4"
                  >
                    Returns
                  </Link>
                </p>
              </Accordion>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <ProductReviews
          count={reviewData.count}
          average={reviewData.average}
          distribution={reviewData.distribution}
          reviews={reviewData.reviews}
        />

        {/* Related */}
        {relatedProducts.length > 0 ? (
          <section className="section-y">
            <h2 className="mb-10 font-serif text-2xl md:text-3xl">
              You may also like
            </h2>
            <ProductGrid products={relatedProducts} priorityCount={0} />
          </section>
        ) : null}
      </div>
    </>
  );
}
