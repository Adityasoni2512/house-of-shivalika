import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Markdown } from "@/components/storefront/markdown";
import { getPage } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const revalidate = 300;

/** Only these slugs resolve here — arbitrary pages cannot be invented by URL. */
const CONTENT_SLUGS = [
  "about",
  "contact",
  "size-guide",
  "shipping",
  "returns",
  "privacy",
  "terms",
] as const;

export function generateStaticParams() {
  return CONTENT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (!CONTENT_SLUGS.includes(slug as (typeof CONTENT_SLUGS)[number])) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  const page = await getPage(slug);
  if (!page) return { title: "Not found", robots: { index: false, follow: false } };

  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? undefined,
    alternates: { canonical: `/${slug}` },
  };
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!CONTENT_SLUGS.includes(slug as (typeof CONTENT_SLUGS)[number])) {
    notFound();
  }

  const [page, settings] = await Promise.all([getPage(slug), getSettings()]);
  if (!page) notFound();

  return (
    <div className="container-page py-12 lg:py-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-4xl md:text-5xl">{page.title}</h1>

        <div className="mt-10">
          <Markdown content={page.body} />
        </div>

        {slug === "contact" ? (
          <dl className="mt-12 space-y-4 border-t border-line pt-8 text-sm">
            {settings.contact_email ? (
              <div>
                <dt className="label-caps text-ink-muted">Email</dt>
                <dd className="mt-1">
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="text-accent underline underline-offset-4"
                  >
                    {settings.contact_email}
                  </a>
                </dd>
              </div>
            ) : null}

            {settings.contact_phone ? (
              <div>
                <dt className="label-caps text-ink-muted">Phone</dt>
                <dd className="mt-1">{settings.contact_phone}</dd>
              </div>
            ) : null}

            {settings.contact_hours ? (
              <div>
                <dt className="label-caps text-ink-muted">Hours</dt>
                <dd className="mt-1">{settings.contact_hours}</dd>
              </div>
            ) : null}

            {settings.contact_address ? (
              <div>
                <dt className="label-caps text-ink-muted">Address</dt>
                <dd className="mt-1 whitespace-pre-line">
                  {settings.contact_address}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </div>
  );
}
