import { PageHeader } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Everything here is live on the site the moment you save. No deploy needed."
      />
      <SettingsForm settings={settings} />
    </>
  );
}
