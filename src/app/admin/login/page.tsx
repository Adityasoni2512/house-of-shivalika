import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="font-serif text-3xl">House of Shivalika</h1>
          <p className="label-caps mt-3 text-ink-muted">Admin</p>
        </div>

        <div className="mt-10 border border-line bg-surface p-8">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Authorised access only.
        </p>
      </div>
    </main>
  );
}
