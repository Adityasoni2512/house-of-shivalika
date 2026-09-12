import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-20">
      <div className="max-w-md text-center">
        <p className="label-caps text-ink-muted">Error 404</p>

        <h1 className="mt-5 font-serif text-4xl md:text-5xl">
          We could not find that page
        </h1>

        <p className="mt-5 text-sm text-ink-muted">
          The link may be old, or the piece may no longer be available.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className={buttonVariants()}>
            Shop the collection
          </Link>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
