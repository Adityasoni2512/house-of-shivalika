"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";

import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

export type NavCategory = {
  name: string;
  slug: string;
  path: string[];
  children: { name: string; slug: string; path: string[] }[];
};

export function Header({
  categories,
  brandName,
  announcement,
}: {
  categories: NavCategory[];
  brandName: string;
  announcement: string | null;
}) {
  const { itemCount, isHydrated } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  // Lock body scroll behind the mobile drawer.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    try {
      setAnnouncementDismissed(
        window.sessionStorage.getItem("hos.announcement.dismissed") === "1",
      );
    } catch {
      // Storage blocked — just show the bar.
    }
  }, []);

  function dismissAnnouncement() {
    setAnnouncementDismissed(true);
    try {
      window.sessionStorage.setItem("hos.announcement.dismissed", "1");
    } catch {
      /* no-op */
    }
  }

  return (
    <>
      {announcement && !announcementDismissed ? (
        <div className="relative bg-ink text-paper">
          <p className="label-caps-sm px-10 py-2.5 text-center">{announcement}</p>
          <button
            type="button"
            onClick={dismissAnnouncement}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="container-page">
          <div className="flex h-16 items-center justify-between gap-4 lg:h-20">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="-ml-2 p-2 lg:hidden"
            >
              <Menu className="size-5" strokeWidth={1.5} />
            </button>

            {/* Wordmark */}
            <Link
              href="/"
              className="font-serif text-xl leading-none lg:text-2xl lg:shrink-0"
            >
              {brandName}
            </Link>

            {/* Desktop nav */}
            <nav className="hidden flex-1 justify-center lg:flex">
              <ul className="flex items-center gap-8">
                <li>
                  <Link href="/shop" className="label-caps transition-colors hover:text-accent">
                    Shop all
                  </Link>
                </li>
                {categories.map((category) => (
                  <li key={category.slug} className="group relative">
                    <Link
                      href={`/shop/${category.path.join("/")}`}
                      className="label-caps inline-block py-6 transition-colors hover:text-accent"
                    >
                      {category.name}
                    </Link>

                    {category.children.length > 0 ? (
                      <div className="invisible absolute left-1/2 top-full z-10 -translate-x-1/2 border border-line bg-surface py-2 opacity-0 shadow-sm transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                        <ul className="min-w-44">
                          {category.children.map((child) => (
                            <li key={child.slug}>
                              <Link
                                href={`/shop/${child.path.join("/")}`}
                                className="block whitespace-nowrap px-5 py-2 text-sm transition-colors hover:bg-accent-soft"
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="p-2 transition-colors hover:text-accent"
              >
                <Search className="size-5" strokeWidth={1.5} />
              </button>

              <Link
                href="/cart"
                aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
                className="relative p-2 transition-colors hover:text-accent"
              >
                <ShoppingBag className="size-5" strokeWidth={1.5} />
                {isHydrated && itemCount > 0 ? (
                  <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[0.5625rem] font-medium text-paper tabular-nums">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen ? (
        <SearchOverlay onClose={() => setSearchOpen(false)} />
      ) : null}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          menuOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          tabIndex={menuOpen ? 0 : -1}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className={cn(
            "absolute inset-0 bg-ink/30 transition-opacity duration-200",
            menuOpen ? "opacity-100" : "opacity-0",
          )}
        />

        <div
          className={cn(
            "absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-paper transition-transform duration-200",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <span className="font-serif text-lg">{brandName}</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="-mr-2 p-2"
              tabIndex={menuOpen ? 0 : -1}
            >
              <X className="size-5" strokeWidth={1.5} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-6 py-6">
            <ul className="space-y-1">
              <li>
                <Link
                  href="/shop"
                  onClick={() => setMenuOpen(false)}
                  tabIndex={menuOpen ? 0 : -1}
                  className="label-caps block py-3"
                >
                  Shop all
                </Link>
              </li>

              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/shop/${category.path.join("/")}`}
                    onClick={() => setMenuOpen(false)}
                    tabIndex={menuOpen ? 0 : -1}
                    className="label-caps block py-3"
                  >
                    {category.name}
                  </Link>

                  {category.children.length > 0 ? (
                    <ul className="mb-2 ml-4 space-y-1 border-l border-line pl-4">
                      {category.children.map((child) => (
                        <li key={child.slug}>
                          <Link
                            href={`/shop/${child.path.join("/")}`}
                            onClick={() => setMenuOpen(false)}
                            tabIndex={menuOpen ? 0 : -1}
                            className="block py-2 text-sm text-ink-muted"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>

            <hr className="my-6 border-line" />

            <ul className="space-y-1">
              {[
                { href: "/about", label: "About" },
                { href: "/size-guide", label: "Size guide" },
                { href: "/shipping", label: "Shipping" },
                { href: "/returns", label: "Returns" },
                { href: "/contact", label: "Contact" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    tabIndex={menuOpen ? 0 : -1}
                    className="block py-2 text-sm text-ink-muted"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-paper">
      <div className="container-page">
        <div className="flex h-16 items-center justify-end lg:h-20">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="-mr-2 p-2"
          >
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>

        <form action="/search" className="mx-auto mt-8 max-w-xl lg:mt-20">
          <label htmlFor="site-search" className="label-caps text-ink-muted">
            Search
          </label>
          <div className="mt-3 flex items-center gap-3 border-b border-ink pb-3">
            <Search className="size-5 shrink-0 text-ink-muted" strokeWidth={1.5} />
            <input
              id="site-search"
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking for?"
              autoFocus
              autoComplete="off"
              className="w-full bg-transparent font-serif text-2xl placeholder:text-ink-muted/50 focus:outline-none lg:text-3xl"
            />
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Press Enter to search
          </p>
        </form>
      </div>
    </div>
  );
}
