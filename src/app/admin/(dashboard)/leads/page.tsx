import { PageHeader } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, whatsappNumber } from "@/lib/settings";

import { LeadsTable, type LeadRow } from "./leads-table";

export const metadata = { title: "Leads" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();

  const { status } = await searchParams;
  const db = createAdminClient();

  let builder = db
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) {
    builder = builder.eq(
      "status",
      status as "new" | "contacted" | "converted" | "lost",
    );
  }

  const [{ data: leads }, settings] = await Promise.all([builder, getSettings()]);

  const rows: LeadRow[] = (leads ?? []).map((lead) => ({
    id: lead.id,
    ref: `LEAD-${lead.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    name: lead.name,
    phone: lead.phone,
    pincode: lead.pincode,
    cartTotal: lead.cart_total === null ? 0 : Number(lead.cart_total),
    itemCount: lead.item_count ?? 0,
    status: lead.status,
    adminNotes: lead.admin_notes,
    createdAt: lead.created_at,
    convertedOrderId: lead.converted_order_id,
    utmSource: lead.utm_source,
    cart: Array.isArray(lead.cart_snapshot)
      ? (lead.cart_snapshot as unknown as LeadRow["cart"])
      : [],
  }));

  const counts = {
    all: rows.length,
    new: rows.filter((r) => r.status === "new").length,
  };

  return (
    <>
      <PageHeader
        title="Leads"
        description="Captured the moment someone submits the WhatsApp form — including those who never send the message."
      />
      <LeadsTable
        leads={rows}
        activeStatus={status ?? ""}
        counts={counts}
        whatsappNumber={whatsappNumber(settings)}
        brandName={settings.brand_name}
      />
    </>
  );
}
