import Link from "next/link";
import { Toaster } from "sonner";

import { requireAdmin } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";

import { AdminNav } from "./_components/admin-nav";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Re-checked here even though middleware already gated the route.
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
          <div className="border-b border-line px-6 py-5">
            <Link href="/admin" className="font-serif text-lg leading-tight">
              House of Shivalika
            </Link>
            <p className="label-caps-sm mt-1 text-ink-muted">Admin</p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-5">
            <AdminNav />
          </div>

          <div className="border-t border-line px-6 py-4">
            <p className="truncate text-xs font-medium text-ink">
              {admin.full_name ?? "Admin"}
            </p>
            <p className="truncate text-xs text-ink-muted">{admin.email}</p>

            <form action={signOutAction} className="mt-3">
              <button
                type="submit"
                className="label-caps-sm text-ink-muted transition-colors hover:text-sale"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          {/* Mobile header — admin is desktop-first, this is a courtesy */}
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-5 py-3 lg:hidden">
            <Link href="/admin" className="font-serif text-base">
              House of Shivalika
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="label-caps-sm text-ink-muted">
                Sign out
              </button>
            </form>
          </header>

          <div className="lg:hidden">
            <div className="overflow-x-auto border-b border-line bg-surface px-3 py-2">
              <AdminNav layout="horizontal" />
            </div>
          </div>

          <main className="px-5 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "2px",
            border: "1px solid var(--color-line)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.8125rem",
          },
        }}
      />
    </div>
  );
}
