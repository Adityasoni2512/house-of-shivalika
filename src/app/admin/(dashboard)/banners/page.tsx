import { PageHeader } from "@/components/admin/shell";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { BannersManager, type BannerRow } from "./banners-manager";

export const metadata = { title: "Banners" };

export default async function BannersPage() {
  await requireAdmin();

  const db = createAdminClient();
  const { data: banners } = await db
    .from("banners")
    .select("*")
    .order("position");

  const rows: BannerRow[] = (banners ?? []).map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    imageDesktop: banner.image_desktop,
    imageMobile: banner.image_mobile,
    ctaLabel: banner.cta_label,
    ctaUrl: banner.cta_url,
    position: banner.position,
    isActive: banner.is_active,
    startsAt: banner.starts_at,
    endsAt: banner.ends_at,
  }));

  return (
    <>
      <PageHeader
        title="Homepage banners"
        description="The hero at the top of the homepage. The first active banner is shown; schedule dates to swap them automatically."
      />
      <BannersManager
        banners={rows}
        cloudinaryReady={isCloudinaryConfigured()}
      />
    </>
  );
}
