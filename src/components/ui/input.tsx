import * as React from "react";

import { cn } from "@/lib/utils";

const fieldBase = cn(
  "w-full border border-line bg-surface text-ink",
  "px-3.5 py-2.5 text-[0.9375rem] leading-normal rounded-xs",
  "placeholder:text-ink-muted/60",
  "transition-colors duration-200",
  "hover:border-ink-muted/50",
  "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
  "disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-60",
  "aria-[invalid=true]:border-sale aria-[invalid=true]:ring-sale",
);

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(fieldBase, "resize-y", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      fieldBase,
      "h-11 cursor-pointer appearance-none bg-no-repeat pr-10",
      // chevron as an inline data URI so no network request and no icon import
      "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22 fill=%22none%22><path d=%22M1 1.5L6 6.5L11 1.5%22 stroke=%22%2378716b%22 stroke-width=%221.5%22/></svg>')]",
      "bg-[position:right_0.875rem_center]",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export { fieldBase };
