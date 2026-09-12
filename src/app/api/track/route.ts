import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Analytics ingest.
 *
 * Deliberately permissive about failure: analytics must never break a page or
 * slow a customer down. Unknown event types are dropped silently rather than
 * rejected, and every response is 204 regardless.
 */

const EVENT_TYPES = [
  "page_view",
  "product_view",
  "category_view",
  "search",
  "size_select",
  "add_to_cart",
  "remove_from_cart",
  "cart_view",
  "lead_form_open",
  "lead_submitted",
  "whatsapp_click",
] as const;

const batchSchema = z.object({
  visitor_id: z.string().uuid(),
  session_id: z.string().uuid(),
  device_type: z.enum(["mobile", "tablet", "desktop"]).optional(),
  referrer_host: z.string().max(255).optional(),
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(120).optional(),
  events: z
    .array(
      z.object({
        event_type: z.enum(EVENT_TYPES),
        path: z.string().max(512).optional(),
        product_id: z.string().uuid().optional(),
        category_id: z.string().uuid().optional(),
        size_label: z.string().max(40).optional(),
        search_query: z.string().max(200).optional(),
        value: z.number().optional(),
        meta: z.record(z.string(), z.unknown()).optional(),
        occurred_at: z.string().optional(),
      }),
    )
    .min(1)
    .max(50),
});

/** Crawlers would otherwise inflate every product view count. */
const BOT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|headless|lighthouse|pingdom|gtmetrix/i;

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT_PATTERN.test(userAgent)) {
    return new NextResponse(null, { status: 204 });
  }

  let parsed;
  try {
    parsed = batchSchema.safeParse(await request.json());
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  if (!parsed.success) {
    return new NextResponse(null, { status: 204 });
  }

  const batch = parsed.data;

  const rows = batch.events.map((event) => ({
    visitor_id: batch.visitor_id,
    session_id: batch.session_id,
    event_type: event.event_type,
    product_id: event.product_id ?? null,
    category_id: event.category_id ?? null,
    size_label: event.size_label ?? null,
    search_query: event.search_query ?? null,
    path: event.path ?? null,
    referrer_host: batch.referrer_host ?? null,
    utm_source: batch.utm_source ?? null,
    utm_medium: batch.utm_medium ?? null,
    utm_campaign: batch.utm_campaign ?? null,
    device_type: batch.device_type ?? null,
    value: event.value ?? null,
    meta: (event.meta ?? {}) as never,
    created_at: event.occurred_at ?? new Date().toISOString(),
  }));

  try {
    const db = createAdminClient();
    await db.from("analytics_events").insert(rows);
  } catch {
    // Swallowed on purpose — a failed insert must not surface to the customer.
  }

  return new NextResponse(null, { status: 204 });
}
