"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/admin/shell";
import { Stars } from "@/components/storefront/product-reviews";
import {
  deleteReviewAction,
  moderateReviewAction,
  setVerifiedBuyerAction,
} from "@/lib/actions/reviews";
import { formatDateTime } from "@/lib/utils";

export type ReviewRow = {
  id: string;
  productName: string;
  productSlug: string | null;
  reviewerName: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  isVerifiedBuyer: boolean;
  adminNote: string | null;
  createdAt: string;
  images: string[];
};

export function ReviewsQueue({ reviews }: { reviews: ReviewRow[] }) {
  const [pending, startTransition] = useTransition();

  function moderate(review: ReviewRow, status: "approved" | "rejected" | "pending") {
    startTransition(async () => {
      const result = await moderateReviewAction(review.id, status);
      if (result.error) toast.error(result.error);
      else
        toast.success(
          status === "approved"
            ? "Published"
            : status === "rejected"
              ? "Rejected"
              : "Moved back to pending",
        );
    });
  }

  function toggleVerified(review: ReviewRow) {
    startTransition(async () => {
      const result = await setVerifiedBuyerAction(review.id, !review.isVerifiedBuyer);
      if (result.error) toast.error(result.error);
      else
        toast.success(
          review.isVerifiedBuyer
            ? "Verified badge removed"
            : "Marked as verified buyer",
        );
    });
  }

  function remove(review: ReviewRow) {
    if (
      !confirm(
        `Permanently delete this review from ${review.reviewerName}?\n\nThis cannot be undone. Rejecting keeps it on record instead.`,
      )
    )
      return;

    startTransition(async () => {
      const result = await deleteReviewAction(review.id);
      if (result.error) toast.error(result.error);
      else toast.success("Review deleted");
    });
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Nothing here"
          description="Reviews appear once a customer opens an invite link and submits one. Generate invites from the Invites page after an order is delivered."
          action={
            <Link
              href="/admin/invites"
              className="label-caps text-accent underline underline-offset-4"
            >
              Go to invites
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id}>
          <Card className={pending ? "opacity-60" : undefined}>
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <Stars rating={review.rating} />
                    <span className="text-sm font-medium">
                      {review.reviewerName}
                    </span>
                    {review.isVerifiedBuyer ? (
                      <Badge variant="success">Verified buyer</Badge>
                    ) : null}
                    <Badge variant={statusVariant(review.status)}>
                      {review.status}
                    </Badge>
                  </div>

                  <p className="mt-1.5 text-xs text-ink-muted">
                    {review.productSlug ? (
                      <Link
                        href={`/product/${review.productSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline underline-offset-4"
                      >
                        {review.productName}
                      </Link>
                    ) : (
                      review.productName
                    )}
                    {" · "}
                    {formatDateTime(review.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {review.status !== "approved" ? (
                    <Button
                      size="sm"
                      onClick={() => moderate(review, "approved")}
                      disabled={pending}
                    >
                      <Check className="size-4" /> Publish
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => moderate(review, "pending")}
                      disabled={pending}
                    >
                      Unpublish
                    </Button>
                  )}

                  {review.status !== "rejected" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => moderate(review, "rejected")}
                      disabled={pending}
                    >
                      <X className="size-4" /> Reject
                    </Button>
                  ) : null}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleVerified(review)}
                    disabled={pending}
                  >
                    {review.isVerifiedBuyer ? "Unverify" : "Mark verified"}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(review)}
                    disabled={pending}
                    aria-label="Delete review"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {review.title ? (
                <p className="mt-4 text-sm font-medium">{review.title}</p>
              ) : null}

              {review.body ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                  {review.body}
                </p>
              ) : null}

              {review.images.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {review.images.map((url) => (
                    <li
                      key={url}
                      className="relative size-24 overflow-hidden bg-accent-soft"
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
