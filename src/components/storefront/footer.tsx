import Link from "next/link";

import { ConsentReopenButton } from "./consent";

import type { NavCategory } from "./header";

/** lucide-react dropped brand icons, so the glyph is inlined. */
function InstagramGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer({
  categories,
  brandName,
  tagline,
  instagramUrl,
  contactEmail,
  contactPhone,
  gstin,
}: {
  categories: NavCategory[];
  brandName: string;
  tagline: string;
  instagramUrl: string;
  contactEmail: string;
  contactPhone: string;
  gstin: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="container-page py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div className="lg:pr-8">
            <p className="font-serif text-xl">{brandName}</p>
            <p className="mt-3 max-w-xs text-sm text-ink-muted">{tagline}</p>

            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="label-caps mt-6 inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-accent"
              >
                <InstagramGlyph />
                Instagram
              </a>
            ) : null}
          </div>

          {/* Shop */}
          <div>
            <h2 className="label-caps text-ink-muted">Shop</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/shop" className="text-sm transition-colors hover:text-accent">
                  All products
                </Link>
              </li>
              {categories.slice(0, 6).map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/shop/${category.path.join("/")}`}
                    className="text-sm transition-colors hover:text-accent"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h2 className="label-caps text-ink-muted">Help</h2>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "/size-guide", label: "Size guide" },
                { href: "/shipping", label: "Shipping" },
                { href: "/returns", label: "Returns & exchange" },
                { href: "/contact", label: "Contact us" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm transition-colors hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h2 className="label-caps text-ink-muted">Company</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/about" className="text-sm transition-colors hover:text-accent">
                  About us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm transition-colors hover:text-accent">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm transition-colors hover:text-accent">
                  Terms of service
                </Link>
              </li>
            </ul>

            {contactEmail || contactPhone ? (
              <div className="mt-6 space-y-1 text-sm text-ink-muted">
                {contactEmail ? (
                  <p>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="transition-colors hover:text-accent"
                    >
                      {contactEmail}
                    </a>
                  </p>
                ) : null}
                {contactPhone ? (
                  <p>
                    <a
                      href={`tel:${contactPhone.replace(/\s/g, "")}`}
                      className="transition-colors hover:text-accent"
                    >
                      {contactPhone}
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <p className="text-xs text-ink-muted">
            © {year} {brandName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {gstin ? (
              <p className="text-xs text-ink-muted">GSTIN: {gstin}</p>
            ) : null}
            <ConsentReopenButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
