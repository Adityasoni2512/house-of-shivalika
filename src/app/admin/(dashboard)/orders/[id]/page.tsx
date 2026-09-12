import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/shell";
import { Badge, statusVariant } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";

import { OrderForm, type OrderFormValues } from "../order-form";
import { loadCatalogue } from "../catalogue";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const db = createAdminClient();

  const [{ data: order }, catalogue] = await Promise.all([
    db.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle(),
    loadCatalogue(),
  ]);

  if (!order) notFound();

  const initial: OrderFormValues = {
    id: order.id,
    orderNumber: order.order_number,
    leadId: order.lead_id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email ?? "",
    addressLine1: order.address_line1 ?? "",
    addressLine2: order.address_line2 ?? "",
    city: order.city ?? "",
    state: order.state ?? "",
    pincode: order.pincode ?? "",
    status: order.status,
    discount: String(order.discount),
    shippingCharge: String(order.shipping_charge),
    paymentNote: order.payment_note ?? "",
    courierName: order.courier_name ?? "",
    trackingNumber: order.tracking_number ?? "",
    adminNotes: order.admin_notes ?? "",
    items: order.order_items.map((item) => ({
      productId: item.product_id,
      variantId: item.variant_id,
      productName: item.product_name,
      sku: item.sku ?? "",
      sizeLabel: item.size_label ?? "",
      imageUrl: item.image_url,
      unitPrice: String(item.unit_price),
      qty: String(item.qty),
    })),
  };

  return (
    <>
      <PageHeader
        title={order.order_number}
        description={`Created ${formatDateTime(order.created_at)}`}
        action={<Badge variant={statusVariant(order.status)}>{order.status}</Badge>}
      />
      <OrderForm initial={initial} catalogue={catalogue} />
    </>
  );
}
