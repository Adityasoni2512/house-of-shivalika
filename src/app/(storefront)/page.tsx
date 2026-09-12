import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { ProductGrid } from "@/components/storefront/product-card";
import { buttonVariants } from "@/components/ui/button";
import { getActiveBanners, getCategoryTree, getProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    title: `${settings.brand_name} — ${settings.brand_tagline}`,
    description: settings.brand_tagline,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const [settings, banners, tree, newArrivals, featured] = await Promise.all([
    getSettings(),
    getActiveBanners(),
    getCategoryTree(),
    getProducts({ sort: "newest", limit: 8 }),
    getProducts({ limit: 4 }),
  ]);

  const hero = banners[0] ?? null;
  const topCategories = tree.filter((c) => c.image_url).slice(0, 4);
  const featuredProducts = featured.products.filter((p) =>
    newArrivals.products.every((n) => n.id !== p.id),
  );

  return (
    <>
      {/* ---- Hero ---- */}
      {hero ? (
        <section className="relative">
          <div className="relative aspect-[4/5] w-full sm:aspect-[16/9] lg:aspect-[21/9]">
            <Image
              src={hero.image_desktop}
              alt={hero.title ?? ""}
              fill
              priority
              sizes="100vw"
              className="hidden object-cover sm:block"
            />
            <Image
              src={hero.image_mobile ?? hero.image_desktop}
              alt={hero.title ?? ""}
              fill
              priority
              sizes="100vw"
              className="object-cover sm:hidden"
            />
            <div className="absolute inset-0 bg-ink/15" />
          </div>

          <div className="absolute inset-0 flex items-center">
            <div className="container-page">
              <div className="max-w-lg text-paper">
                {hero.subtitle ? (
                  <p className="label-caps">{hero.subtitle}</p>
                ) : null}
                {hero.title ? (
                  <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
                    {hero.title}
                  </h1>
                ) : null}
                {hero.cta_label && hero.cta_url ? (
                  <Link
                    href={hero.cta_url}
                    className="label-caps mt-8 inline-block border border-paper px-8 py-3.5 text-paper transition-colors hover:bg-paper hover:text-ink"
                  >
                    {hero.cta_label}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* No banner configured yet — a quiet typographic hero, not a broken page */
        <section className="border-b border-line">
          <div className="container-page py-24 text-center lg:py-36">
            <p className="label-caps text-ink-muted">{settings.brand_tagline}</p>
            <h1 className="mt-6 font-serif text-5xl md:text-7xl">
              {settings.brand_name}
            </h1>
            <Link href="/shop" className={`${buttonVariants()} mt-10`}>
              Shop the collection
            </Link>
          </div>
        </section>
      )}

      {/* ---- New arrivals ---- */}
      {newArrivals.products.length > 0 ? (
        <section className="container-page section-y">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="label-caps text-ink-muted">Just in</p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl">New arrivals</h2>
            </div>
            <Link
              href="/shop"
              className="label-caps hidden text-accent underline underline-offset-4 sm:block"
            >
              View all
            </Link>
          </div>

          <ProductGrid products={newArrivals.products} priorityCount={4} />

          <div className="mt-10 text-center sm:hidden">
            <Link href="/shop" className={buttonVariants({ variant: "secondary" })}>
              View all
            </Link>
          </div>
        </section>
      ) : null}

      {/* ---- Shop by category ---- */}
      {topCategories.length > 0 ? (
        <section className="border-y border-line bg-surface">
          <div className="container-page section-y">
            <h2 className="mb-10 text-center font-serif text-3xl md:text-4xl">
              Shop by category
            </h2>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {topCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/shop/${category.path.join("/")}`}
                  className="group block"
                >
                  <div className="ratio-product relative">
                    <Image
                      src={category.image_url!}
                      alt={category.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-opacity duration-300 group-hover:opacity-90"
                    />
                  </div>
                  <h3 className="label-caps mt-3 text-center">{category.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---- Featured ---- */}
      {featuredProducts.length > 0 ? (
        <section className="container-page section-y">
          <div className="mb-10">
            <p className="label-caps text-ink-muted">Chosen for you</p>
            <h2 className="mt-2 font-serif text-3xl md:text-4xl">Featured</h2>
          </div>
          <ProductGrid products={featuredProducts} priorityCount={0} />
        </section>
      ) : null}

      {/* ---- Brand story ---- */}
      <section className="border-t border-line bg-surface">
        <div className="container-page section-y">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-caps text-ink-muted">Our story</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl">
              {settings.brand_tagline}
            </h2>
            <Link
              href="/about"
              className="label-caps mt-8 inline-block text-accent underline underline-offset-4"
            >
              Read more
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Instagram ---- */}
      {settings.instagram_url ? (
        <section className="container-page section-y text-center">
          <p className="label-caps text-ink-muted">Follow along</p>
          <h2 className="mt-3 font-serif text-2xl md:text-3xl">
            @{settings.instagram_url.replace(/\/$/, "").split("/").pop()}
          </h2>
          <a
            href={settings.instagram_url}
            target="_blank"
            rel="noreferrer noopener"
            className={`${buttonVariants({ variant: "secondary" })} mt-6`}
          >
            Visit Instagram
          </a>
        </section>
      ) : null}
    </>
  );
}
