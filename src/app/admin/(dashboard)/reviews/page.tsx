import Link from "next/link";

import { PageHeader } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

import { ReviewsQueue, type ReviewRow } from "./reviews-queue";

export const metadata = { title: "Reviews" };

const FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();

  const { status = "pending" } = await searchParams;
  const db = createAdminClient();

  let builder = db
    .from("reviews")
    .select("*, review_images(url, position), products(name, slug)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") {
    builder = builder.eq("status", status as "pending" | "approved" | "rejected");
  }

  const [{ data: reviews }, { count: pendingCount }] = await Promise.all([
    builder,
    db
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const rows: ReviewRow[] = (reviews ?? []).map((review) => ({
    id: review.id,
    productName: review.products?.name ?? "Unknown product",
    productSlug: review.products?.slug ?? null,
    reviewerName: review.reviewer_name,
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status,
    isVerifiedBuyer: review.is_verified_buyer,
    adminNote: review.admin_note,
    createdAt: review.created_at,
    images: [...review.review_images]
      .sort((a, b) => a.position - b.position)
      .map((image) => image.url),
  }));

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Nothing is public until you approve it. Reviews only arrive through invite links, so there is no spam to wade through."
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/reviews?status=${filter.value}`}
            className={cn(
              "label-caps-sm rounded-xs border px-3 py-2.5 transition-colors",
              status === filter.value
                ? "border-ink bg-ink text-paper"
                : "border-line text-ink-muted hover:border-ink-muted/50 hover:text-ink",
            )}
          >
            {filter.label}
            {filter.value === "pending" && (pendingCount ?? 0) > 0
              ? ` (${pendingCount})`
              : ""}
          </Link>
        ))}
      </div>

      <ReviewsQueue reviews={rows} />
    </>
  );
}
