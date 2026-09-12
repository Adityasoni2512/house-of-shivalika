import { PageHeader } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";

import { OrderForm, type CatalogueVariant, type OrderFormValues } from "../order-form";
import { loadCatalogue } from "../catalogue";

export const metadata = { title: "New order" };

type LeadCartLine = {
  productId?: string;
  variantId?: string;
  name: string;
  sku: string;
  sizeLabel: string;
  qty: number;
  price: number;
};

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  await requireAdmin();

  const { lead: leadId } = await searchParams;
  const db = createAdminClient();

  const [catalogue, settings, leadResult] = await Promise.all([
    loadCatalogue(),
    getSettings(),
    leadId
      ? db.from("leads").select("*").eq("id", leadId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const lead = leadResult.data;
  const cart: LeadCartLine[] = Array.isArray(lead?.cart_snapshot)
    ? (lead.cart_snapshot as unknown as LeadCartLine[])
    : [];

  const byVariant = new Map<string, CatalogueVariant>(
    catalogue.map((entry) => [entry.variantId, entry]),
  );

  const initial: OrderFormValues = {
    id: null,
    orderNumber: null,
    leadId: lead?.id ?? null,
    customerName: lead?.name ?? "",
    customerPhone: lead?.phone ?? "",
    customerEmail: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: lead?.pincode ?? "",
    status: "confirmed",
    discount: "0",
    shippingCharge: String(settings.shipping_flat_rate || 0),
    paymentNote: "",
    courierName: "",
    trackingNumber: "",
    adminNotes: lead ? `Converted from lead ${lead.id.slice(0, 8)}` : "",
    items: cart.map((line) => {
      const match = line.variantId ? byVariant.get(line.variantId) : undefined;

      return {
        productId: line.productId ?? match?.productId ?? null,
        variantId: line.variantId ?? null,
        productName: line.name,
        sku: line.sku,
        sizeLabel: line.sizeLabel,
        imageUrl: match?.imageUrl ?? null,
        // Current catalogue price wins over the snapshot — the snapshot may be
        // stale, and the admin can still override it per line.
        unitPrice: String(match?.price ?? line.price),
        qty: String(line.qty),
      };
    }),
  };

  return (
    <>
      <PageHeader
        title="New order"
        description={
          lead
            ? `Pre-filled from ${lead.name}'s enquiry. Check the prices before saving.`
            : "Record an order agreed over WhatsApp."
        }
      />
      <OrderForm initial={initial} catalogue={catalogue} />
    </>
  );
}
