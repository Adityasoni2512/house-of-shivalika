import { PageHeader } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { SizesManager } from "./sizes-manager";

export const metadata = { title: "Sizes" };

export default async function SizesPage() {
  await requireAdmin();

  const db = createAdminClient();

  const { data: sizes } = await db
    .from("sizes")
    .select("id, label, position, is_active")
    .order("position");

  // How many product variants use each size — drives whether delete is allowed.
  const { data: variants } = await db.from("product_variants").select("size_id");

  const usage = new Map<string, number>();
  for (const v of variants ?? []) {
    usage.set(v.size_id, (usage.get(v.size_id) ?? 0) + 1);
  }

  const rows = (sizes ?? []).map((s) => ({
    ...s,
    usageCount: usage.get(s.id) ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Sizes"
        description="The size library. Each product picks which of these apply, so add every size you will ever stock here first."
      />
      <SizesManager sizes={rows} />
    </>
  );
}
