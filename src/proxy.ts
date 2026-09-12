import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js proxy (renamed from middleware in Next 16).
 *
 * Refreshes the Supabase session cookie on every request and gates /admin.
 *
 * This is a first line of defence only — it checks that *someone* is signed in.
 * Whether that user is an active admin is re-checked server-side in
 * `requireAdmin()` on every admin page and server action. Never trust
 * middleware alone: it does not run on all runtimes in all configurations.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  // Without config we cannot verify anyone — fail closed on /admin.
  if (!url || !anonKey) {
    if (request.nextUrl.pathname.startsWith("/admin")) {
      return new NextResponse("Supabase environment variables are not configured.", {
        status: 500,
      });
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touching getUser() is what refreshes an expiring session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const isAdminArea = pathname.startsWith("/admin");

  if (isAdminArea && !isLoginPage && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isLoginPage && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Keeping the storefront
     * in scope is deliberate: it keeps the session cookie fresh for an admin
     * browsing the live site.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
