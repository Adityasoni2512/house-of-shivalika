import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Nightly maintenance.
 *
 * 1. Keeps the Supabase project awake. The free tier pauses after 7 days with
 *    no activity, and a paused project means every page errors until someone
 *    restores it from the dashboard.
 * 2. Rolls raw analytics events into analytics_daily, then prunes rows older
 *    than the retention window — which is what keeps the database inside the
 *    500 MB free tier indefinitely.
 */

const RETENTION_DAYS = 180;
const ROLLUP_LOOKBACK_DAYS = 3; // re-roll recent days in case of late events

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(request.url).searchParams.get("secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const db = createAdminClient();
  const result: Record<string, unknown> = { ranAt: new Date().toISOString() };

  // 1. Keep-alive — a trivial query is enough to reset the idle timer.
  try {
    const { count } = await db
      .from("site_settings")
      .select("*", { count: "exact", head: true });
    result.keepAlive = { ok: true, settingsRows: count ?? 0 };
  } catch {
    result.keepAlive = { ok: false };
  }

  // 2. Roll up recent days.
  try {
    const since = new Date(Date.now() - ROLLUP_LOOKBACK_DAYS * 864e5);
    since.setUTCHours(0, 0, 0, 0);

    const { data: events } = await db
      .from("analytics_events")
      .select("product_id, event_type, created_at")
      .gte("created_at", since.toISOString())
      .not("product_id", "is", null)
      .in("event_type", ["product_view", "add_to_cart", "whatsapp_click"])
      .limit(100000);

    const buckets = new Map<
      string,
      { day: string; productId: string; views: number; carts: number; clicks: number }
    >();

    for (const event of events ?? []) {
      if (!event.product_id) continue;

      const day = event.created_at.slice(0, 10);
      const key = `${day}:${event.product_id}`;

      const bucket = buckets.get(key) ?? {
        day,
        productId: event.product_id,
        views: 0,
        carts: 0,
        clicks: 0,
      };

      if (event.event_type === "product_view") bucket.views += 1;
      if (event.event_type === "add_to_cart") bucket.carts += 1;
      if (event.event_type === "whatsapp_click") bucket.clicks += 1;

      buckets.set(key, bucket);
    }

    if (buckets.size > 0) {
      const { error } = await db.from("analytics_daily").upsert(
        [...buckets.values()].map((bucket) => ({
          day: bucket.day,
          product_id: bucket.productId,
          views: bucket.views,
          add_to_carts: bucket.carts,
          whatsapp_clicks: bucket.clicks,
        })),
        { onConflict: "day,product_id" },
      );

      result.rollup = error
        ? { ok: false, error: error.message }
        : { ok: true, rows: buckets.size };
    } else {
      result.rollup = { ok: true, rows: 0 };
    }
  } catch (error) {
    result.rollup = {
      ok: false,
      error: error instanceof Error ? error.message : "unknown",
    };
  }

  // 3. Prune raw events past the retention window.
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 864e5).toISOString();
    const { error } = await db
      .from("analytics_events")
      .delete()
      .lt("created_at", cutoff);

    result.prune = error
      ? { ok: false, error: error.message }
      : { ok: true, olderThan: cutoff };
  } catch {
    result.prune = { ok: false };
  }

  // 4. Expire review invites that are past their date.
  try {
    const { error } = await db
      .from("review_invites")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    result.invites = { ok: !error };
  } catch {
    result.invites = { ok: false };
  }

  return NextResponse.json(result);
}
