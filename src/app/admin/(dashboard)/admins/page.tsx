import { PageHeader } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { AdminsManager, type AdminRowView } from "./admins-manager";

export const metadata = { title: "Admins" };

export default async function AdminsPage() {
  const currentAdmin = await requireAdmin();

  const db = createAdminClient();
  const { data: admins } = await db
    .from("admins")
    .select("*")
    .order("created_at");

  const rows: AdminRowView[] = (admins ?? []).map((admin) => ({
    id: admin.id,
    email: admin.email,
    fullName: admin.full_name,
    isActive: admin.is_active,
    lastLoginAt: admin.last_login_at,
    createdAt: admin.created_at,
    isSelf: admin.id === currentAdmin.id,
  }));

  return (
    <>
      <PageHeader
        title="Admins"
        description="Everyone here has identical access. There are no roles."
      />
      <AdminsManager admins={rows} />
    </>
  );
}
