import { PageHeader } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";

import { InvitesManager, type InviteRow } from "./invites-manager";

export const metadata = { title: "Review invites" };

export default async function InvitesPage() {
  await requireAdmin();

  const db = createAdminClient();

  const [{ data: invites }, { data: products }, settings] = await Promise.all([
    db
      .from("review_invites")
      .select("*, products(name)")
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("products")
      .select("id, name, sku")
      .neq("status", "archived")
      .order("name"),
    getSettings(),
  ]);

  // eslint-disable-next-line react-hooks/purity -- async Server Component: reading the clock per request is the intent, not a render-purity violation
  const now = Date.now();

  const rows: InviteRow[] = (invites ?? []).map((invite) => ({
    id: invite.id,
    token: invite.token,
    productName: invite.products?.name ?? "Unknown product",
    customerName: invite.customer_name,
    customerPhone: invite.customer_phone,
    // A pending invite past its expiry reads as expired, without needing a job
    // to rewrite the column.
    status:
      invite.status === "pending" && new Date(invite.expires_at).getTime() < now
        ? "expired"
        : invite.status,
    expiresAt: invite.expires_at,
    usedAt: invite.used_at,
    createdAt: invite.created_at,
  }));

  return (
    <>
      <PageHeader
        title="Review invites"
        description="Generate a private link after an order is delivered and send it over WhatsApp. This is the only way a review can be submitted."
      />
      <InvitesManager
        invites={rows}
        products={products ?? []}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
        brandName={settings.brand_name}
        expiryDays={settings.review_invite_days}
      />
    </>
  );
}
