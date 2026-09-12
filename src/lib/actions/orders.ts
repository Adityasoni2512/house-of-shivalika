"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalisePhone } from "@/lib/utils";

export type OrderActionState = { ok?: boolean; error?: string; id?: string };

const ORDER_STATUSES = [
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

const itemSchema = z.object({
  productId: z.string().uuid().nullable(),
  variantId: z.string().uuid().nullable(),
  productName: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(60).nullable(),
  sizeLabel: z.string().trim().max(40).nullable(),
  imageUrl: z.string().nullable(),
  unitPrice: z.coerce.number().min(0),
  qty: z.coerce.number().int().min(1).max(999),
});

const orderSchema = z.object({
  leadId: z.string().uuid().nullable().optional(),
  customerName: z.string().trim().min(1, "Customer name is required").max(120),
  customerPhone: z.string().trim().min(1, "Phone is required"),
  customerEmail: z.string().trim().max(160),
  addressLine1: z.string().trim().max(200),
  addressLine2: z.string().trim().max(200),
  city: z.string().trim().max(80),
  state: z.string().trim().max(80),
  pincode: z.string().trim().max(10),
  status: z.enum(ORDER_STATUSES),
  discount: z.coerce.number().min(0),
  shippingCharge: z.coerce.number().min(0),
  paymentNote: z.string().trim().max(300),
  courierName: z.string().trim().max(120),
  trackingNumber: z.string().trim().max(120),
  adminNotes: z.string().trim().max(2000),
  items: z.array(itemSchema).min(1, "Add at least one item"),
});

function revalidateOrders(id?: string) {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/orders/${id}`);
}

function nullIfEmpty(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

export async function saveOrderAction(
  orderId: string | null,
  input: unknown,
): Promise<OrderActionState> {
  const admin = await requireAdmin();

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the order details" };
  }

  const data = parsed.data;
  const phone = normalisePhone(data.customerPhone);
  if (!phone) {
    return { error: "Enter a valid 10-digit Indian mobile number" };
  }

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0,
  );
  const total = Math.max(0, subtotal - data.discount + data.shippingCharge);

  const db = createAdminClient();

  const row = {
    lead_id: data.leadId ?? null,
    customer_name: data.customerName,
    customer_phone: phone,
    customer_email: nullIfEmpty(data.customerEmail),
    address_line1: nullIfEmpty(data.addressLine1),
    address_line2: nullIfEmpty(data.addressLine2),
    city: nullIfEmpty(data.city),
    state: nullIfEmpty(data.state),
    pincode: nullIfEmpty(data.pincode),
    status: data.status,
    subtotal,
    discount: data.discount,
    shipping_charge: data.shippingCharge,
    total,
    payment_note: nullIfEmpty(data.paymentNote),
    courier_name: nullIfEmpty(data.courierName),
    tracking_number: nullIfEmpty(data.trackingNumber),
    admin_notes: nullIfEmpty(data.adminNotes),
  };

  let id = orderId;

  if (id) {
    const { error } = await db.from("orders").update(row).eq("id", id);
    if (error) return { error: "Could not save the order" };

    // Items are replaced wholesale — they carry only snapshot data, so there is
    // nothing to preserve the way variant stock counts must be.
    await db.from("order_items").delete().eq("order_id", id);
  } else {
    const { data: created, error } = await db
      .from("orders")
      .insert({ ...row, created_by: admin.id })
      .select("id")
      .single();

    if (error || !created) return { error: "Could not create the order" };
    id = created.id;
  }

  const { error: itemsError } = await db.from("order_items").insert(
    data.items.map((item) => ({
      order_id: id!,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productName,
      sku: item.sku,
      size_label: item.sizeLabel,
      image_url: item.imageUrl,
      unit_price: item.unitPrice,
      qty: item.qty,
      line_total: item.unitPrice * item.qty,
    })),
  );

  if (itemsError) return { error: "Could not save the order items", id };

  // Mark the originating lead as converted, both directions.
  if (data.leadId) {
    await db
      .from("leads")
      .update({ status: "converted", converted_order_id: id })
      .eq("id", data.leadId);
  }

  revalidateOrders(id);
  return { ok: true, id };
}

export async function setOrderStatusAction(
  id: string,
  status: string,
): Promise<OrderActionState> {
  await requireAdmin();

  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
    return { error: "Unknown status" };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("orders")
    .update({ status: status as (typeof ORDER_STATUSES)[number] })
    .eq("id", id);

  if (error) return { error: "Could not update the order" };

  revalidateOrders(id);
  return { ok: true };
}

/**
 * Decrement stock for every line on an order.
 *
 * Never automatic. Orders arrive by WhatsApp and are entered by hand, so the
 * admin explicitly confirms when stock should move — silently decrementing on
 * save would double-count any order that gets edited.
 */
export async function decrementStockForOrderAction(
  orderId: string,
): Promise<OrderActionState & { adjusted?: number; skipped?: string[] }> {
  await requireAdmin();

  const db = createAdminClient();

  const { data: items } = await db
    .from("order_items")
    .select("variant_id, qty, product_name, size_label")
    .eq("order_id", orderId);

  if (!items || items.length === 0) {
    return { error: "This order has no items" };
  }

  let adjusted = 0;
  const skipped: string[] = [];

  for (const item of items) {
    if (!item.variant_id) {
      skipped.push(`${item.product_name} (no linked size)`);
      continue;
    }

    const { data: variant } = await db
      .from("product_variants")
      .select("stock_qty")
      .eq("id", item.variant_id)
      .maybeSingle();

    if (!variant) {
      skipped.push(`${item.product_name} (size no longer exists)`);
      continue;
    }

    const next = Math.max(0, variant.stock_qty - item.qty);

    const { error } = await db
      .from("product_variants")
      .update({ stock_qty: next })
      .eq("id", item.variant_id);

    if (error) skipped.push(item.product_name);
    else adjusted += 1;
  }

  revalidatePath("/admin/stock");
  revalidatePath("/admin/products");
  revalidatePath("/shop", "layout");
  revalidateOrders(orderId);

  return { ok: true, adjusted, skipped };
}

export async function deleteOrderAction(id: string): Promise<OrderActionState> {
  await requireAdmin();

  const db = createAdminClient();
  const { error } = await db.from("orders").delete().eq("id", id);
  if (error) return { error: "Could not delete the order" };

  revalidateOrders();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Leads                                                                      */
/* -------------------------------------------------------------------------- */

export async function setLeadStatusAction(
  id: string,
  status: string,
): Promise<OrderActionState> {
  await requireAdmin();

  if (!["new", "contacted", "converted", "lost"].includes(status)) {
    return { error: "Unknown status" };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("leads")
    .update({ status: status as "new" | "contacted" | "converted" | "lost" })
    .eq("id", id);

  if (error) return { error: "Could not update the lead" };

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true };
}

export async function setLeadNotesAction(
  id: string,
  notes: string,
): Promise<OrderActionState> {
  await requireAdmin();

  const db = createAdminClient();
  const { error } = await db
    .from("leads")
    .update({ admin_notes: notes.trim() === "" ? null : notes.trim() })
    .eq("id", id);

  if (error) return { error: "Could not save notes" };

  revalidatePath("/admin/leads");
  return { ok: true };
}

/**
 * Permanently delete a lead. Leads hold personal data (name, phone, pincode),
 * so an actual delete is required for DPDP erasure requests — soft-deleting
 * would not satisfy one.
 */
export async function deleteLeadAction(id: string): Promise<OrderActionState> {
  await requireAdmin();

  const db = createAdminClient();
  const { error } = await db.from("leads").delete().eq("id", id);
  if (error) return { error: "Could not delete the lead" };

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true };
}
