import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-xs label-caps-sm px-2 py-1",
  {
    variants: {
      variant: {
        /** Discount percentage on product cards. The only use of --color-sale. */
        sale: "bg-sale text-white",
        neutral: "bg-accent-soft text-ink",
        outline: "border border-line text-ink-muted",
        success: "bg-success/10 text-success",
        warning: "bg-[#8a6d3b]/10 text-[#8a6d3b]",
        muted: "bg-ink/5 text-ink-muted",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Maps a workflow status to a badge variant, used across the admin tables. */
export function statusVariant(
  status: string,
): NonNullable<VariantProps<typeof badgeVariants>["variant"]> {
  switch (status) {
    case "active":
    case "approved":
    case "delivered":
    case "converted":
      return "success";
    case "pending":
    case "new":
    case "confirmed":
    case "packed":
    case "shipped":
    case "contacted":
      return "warning";
    case "rejected":
    case "cancelled":
    case "returned":
    case "lost":
    case "revoked":
      return "sale";
    default:
      return "muted";
  }
}

export { badgeVariants };
