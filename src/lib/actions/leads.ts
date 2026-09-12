"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalisePhone } from "@/lib/utils";

/**
 * Lead capture at WhatsApp handoff.
 *
 * This is a public action — no auth. It runs before the customer leaves for
 * WhatsApp, which is the entire point: even if they never send the message, we
 * have their name, number and basket.
 */

const lineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  slug: z.string().max(200),
  name: z.string().max(200),
  sku: z.string().max(60),
  sizeLabel: z.string().max(40),
  price: z.number().min(0),
  qty: z.number().int().min(1).max(99),
});

const leadSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  phone: z.string().trim().min(1, "Please enter your phone number"),
  pincode: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || /^\d{6}$/.test(v), {
      message: "Enter a valid 6-digit pincode",
    }),
  lines: z.array(lineSchema).min(1, "Your cart is empty"),
  visitorId: z.string().uuid().nullable().optional(),
  utm: z
    .object({
      source: z.string().max(120).nullable().optional(),
      medium: z.string().max(120).nullable().optional(),
      campaign: z.string().max(120).nullable().optional(),
    })
    .optional(),
});

export type LeadResult =
  | {
      ok: true;
      leadRef: string;
      /** Prices and names as the server sees them — authoritative. */
      lines: {
        name: string;
        sku: string;
        sizeLabel: string;
        qty: number;
        price: number;
        slug: string;
      }[];
      subtotal: number;
    }
  | { ok: false; error: string; unavailable?: { name: string; size: string }[] };

export async function submitLeadAction(input: unknown): Promise<LeadResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details" };
  }

  const phone = normalisePhone(parsed.data.phone);
  if (!phone) {
    return { ok: false, error: "Enter a valid 10-digit Indian mobile number" };
  }

  const db = createAdminClient();
  const { lines, name, pincode } = parsed.data;

  /*
   * Re-price and re-check stock server-side. The cart is localStorage, so its
   * prices could be hours old or edited by hand — never trust them. Telling the
   * customer now beats an awkward WhatsApp conversation later.
   */
  const { data: variants, error: variantError } = await db
    .from("product_variants")
    .select(
      "id, stock_qty, is_active, sizes(label), products(id, name, sku, slug, price, status)",
    )
    .in(
      "id",
      lines.map((l) => l.variantId),
    );

  if (variantError) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  const byId = new Map((variants ?? []).map((v) => [v.id, v]));
  const unavailable: { name: string; size: string }[] = [];

  const checkedLines: {
    name: string;
    sku: string;
    sizeLabel: string;
    qty: number;
    price: number;
    slug: string;
    productId: string;
    variantId: string;
  }[] = [];

  for (const line of lines) {
    const variant = byId.get(line.variantId);

    if (
      !variant ||
      !variant.is_active ||
      !variant.products ||
      variant.products.status !== "active"
    ) {
      unavailable.push({ name: line.name, size: line.sizeLabel });
      continue;
    }

    if (variant.stock_qty < line.qty) {
      unavailable.push({
        name: variant.products.name,
        size: variant.sizes?.label ?? line.sizeLabel,
      });
      continue;
    }

    checkedLines.push({
      productId: variant.products.id,
      variantId: variant.id,
      name: variant.products.name,
      sku: variant.products.sku,
      slug: variant.products.slug,
      sizeLabel: variant.sizes?.label ?? line.sizeLabel,
      qty: line.qty,
      price: Number(variant.products.price),
    });
  }

  if (unavailable.length > 0) {
    return {
      ok: false,
      error:
        unavailable.length === lines.length
          ? "Those items are no longer available. Please refresh and try again."
          : "Some items in your cart are no longer available.",
      unavailable,
    };
  }

  const subtotal = checkedLines.reduce((sum, l) => sum + l.price * l.qty, 0);

  const { data: lead, error } = await db
    .from("leads")
    .insert({
      name,
      phone,
      pincode,
      cart_snapshot: checkedLines as never,
      cart_total: subtotal,
      item_count: checkedLines.reduce((sum, l) => sum + l.qty, 0),
      visitor_id: parsed.data.visitorId ?? null,
      utm_source: parsed.data.utm?.source ?? null,
      utm_medium: parsed.data.utm?.medium ?? null,
      utm_campaign: parsed.data.utm?.campaign ?? null,
    })
    .select("id, created_at")
    .single();

  if (error || !lead) {
    return { ok: false, error: "Could not save your details. Please try again." };
  }

  // Short human reference the admin can search on: LEAD-XXXXXX from the uuid.
  const leadRef = `LEAD-${lead.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

  return {
    ok: true,
    leadRef,
    subtotal,
    lines: checkedLines.map((l) => ({
      name: l.name,
      sku: l.sku,
      sizeLabel: l.sizeLabel,
      qty: l.qty,
      price: l.price,
      slug: l.slug,
    })),
  };
}
