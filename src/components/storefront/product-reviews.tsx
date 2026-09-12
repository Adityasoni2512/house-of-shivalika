import Image from "next/image";

import { cn, formatDate } from "@/lib/utils";

export function Stars({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const dimension = size === "md" ? "size-4" : "size-3.5";

  return (
    <span
      className="inline-flex gap-0.5"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 20 20"
          className={cn(dimension, star <= Math.round(rating) ? "fill-ink" : "fill-line")}
          aria-hidden="true"
          focusable="false"
        >
          <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.1l-4.94 2.6.94-5.5-4-3.9 5.53-.8z" />
        </svg>
      ))}
    </span>
  );
}

export type ReviewItem = {
  id: string;
  reviewerName: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedBuyer: boolean;
  createdAt: string;
  images: string[];
};

export function ProductReviews({
  count,
  average,
  distribution,
  reviews,
}: {
  count: number;
  average: number;
  distribution: { stars: number; count: number }[];
  reviews: ReviewItem[];
}) {
  if (count === 0) {
    return (
      <section id="reviews" className="section-y border-t border-line">
        <h2 className="font-serif text-2xl md:text-3xl">Reviews</h2>
        <p className="mt-4 max-w-md text-sm text-ink-muted">
          No reviews yet. We invite customers to review after their order
          arrives, so every review here comes from someone who actually bought
          the piece.
        </p>
      </section>
    );
  }

  return (
    <section id="reviews" className="section-y border-t border-line">
      <h2 className="font-serif text-2xl md:text-3xl">
        Reviews
        <span className="ml-3 align-middle text-sm text-ink-muted">({count})</span>
      </h2>

      <div className="mt-8 grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-16">
        {/* Summary */}
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-4xl">{average.toFixed(1)}</span>
            <Stars rating={average} size="md" />
          </div>

          <p className="mt-2 text-xs text-ink-muted">
            Based on {count} {count === 1 ? "review" : "reviews"}
          </p>

          <div className="mt-6 space-y-1.5">
            {distribution.map((row) => {
              const pct = count > 0 ? (row.count / count) * 100 : 0;

              return (
                <div key={row.stars} className="flex items-center gap-2.5 text-xs">
                  <span className="w-3 tabular-nums text-ink-muted">{row.stars}</span>
                  <div className="h-1.5 flex-1 bg-line">
                    <div
                      className="h-full bg-ink"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  </div>
                  <span className="w-6 text-right tabular-nums text-ink-muted">
                    {row.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* List */}
        <ul className="space-y-8">
          {reviews.map((review) => (
            <li key={review.id} className="border-b border-line pb-8 last:border-0">
              <div className="flex flex-wrap items-center gap-3">
                <Stars rating={review.rating} />
                <span className="text-sm font-medium">{review.reviewerName}</span>
                {review.isVerifiedBuyer ? (
                  <span className="label-caps-sm bg-success/10 px-2 py-0.5 text-success">
                    Verified buyer
                  </span>
                ) : null}
                <span className="text-xs text-ink-muted">
                  {formatDate(review.createdAt)}
                </span>
              </div>

              {review.title ? (
                <p className="mt-3 text-sm font-medium">{review.title}</p>
              ) : null}

              {review.body ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                  {review.body}
                </p>
              ) : null}

              {review.images.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {review.images.map((url) => (
                    <li key={url} className="relative size-20 overflow-hidden bg-accent-soft">
                      <Image
                        src={url}
                        alt={`Photo from ${review.reviewerName}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
