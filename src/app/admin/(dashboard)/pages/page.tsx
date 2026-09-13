import { PageHeader } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { PagesEditor, type PageRow } from "./pages-editor";

export const metadata = { title: "Pages" };

const ORDER = [
  "about",
  "contact",
  "size-guide",
  "shipping",
  "returns",
  "privacy",
  "terms",
];

export default async function PagesPage() {
  await requireAdmin();

  const db = createAdminClient();
  const { data: pages } = await db.from("pages").select("*");

  const rows: PageRow[] = (pages ?? [])
    .map((page) => ({
      id: page.id,
      slug: page.slug,
      title: page.title,
      body: page.body,
      seoTitle: page.seo_title,
      seoDescription: page.seo_description,
      isPublished: page.is_published,
      updatedAt: page.updated_at,
    }))
    .sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));

  return (
    <>
      <PageHeader
        title="Pages"
        description="Markdown. Everything here is live on the site as soon as you save."
      />
      <PagesEditor pages={rows} />
    </>
  );
}
