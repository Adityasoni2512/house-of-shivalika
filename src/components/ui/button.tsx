import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Square-ish, uppercase, widely tracked. Hover is a colour shift only —
 * never a transform, never a shadow.
 */
const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "label-caps rounded-xs border transition-colors duration-200",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        primary:
          "border-ink bg-ink text-paper hover:bg-accent hover:border-accent",
        secondary:
          "border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
        ghost:
          "border-transparent bg-transparent text-ink hover:bg-accent-soft",
        link: "border-transparent bg-transparent text-accent underline underline-offset-4 hover:text-ink",
        danger:
          "border-sale bg-sale text-white hover:bg-transparent hover:text-sale",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-7",
        lg: "h-13 px-9",
        icon: "h-10 w-10 px-0",
      },
      full: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      full: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, full }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
