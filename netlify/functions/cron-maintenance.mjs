/**
 * Nightly maintenance trigger.
 *
 * Netlify's scheduler can only invoke a Netlify Function, not a Next.js route
 * handler. This is a thin shim: it calls our own /api/cron with the shared
 * secret and returns whatever that reports.
 *
 * The real work lives in src/app/api/cron/route.ts — keep-alive so the Supabase
 * free tier never pauses, analytics rollup, event pruning, invite expiry.
 */

export default async () => {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("CRON_SECRET is not set — skipping maintenance run");
    return new Response("CRON_SECRET not configured", { status: 500 });
  }

  // URL is injected by Netlify and is the site's primary address.
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_URL ||
    ""
  ).replace(/\/$/, "");

  if (!base) {
    console.error("No site URL available — skipping maintenance run");
    return new Response("Site URL not resolved", { status: 500 });
  }

  try {
    const response = await fetch(`${base}/api/cron`, {
      headers: { authorization: `Bearer ${secret}` },
    });

    const body = await response.text();
    console.log(`Maintenance run ${response.status}: ${body}`);

    return new Response(body, {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Maintenance run failed:", error);
    return new Response("Maintenance run failed", { status: 500 });
  }
};

// 19:00 UTC = 00:30 IST — quiet hours for an Indian storefront.
export const config = {
  schedule: "0 19 * * *",
};
