import * as React from "react";

import { cn } from "@/lib/utils";

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("label-caps block text-ink", className)} {...props}>
      {children}
      {required ? <span className="ml-1 text-sale">*</span> : null}
    </label>
  );
}

/**
 * Form field wrapper. Wires label, hint and error to the control via
 * aria-describedby so errors are announced, not just coloured red.
 */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}

      {children}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-sale">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Describedby ids for a field, so controls can be wired up consistently. */
export function fieldAria(id: string, hint?: string, error?: string) {
  const ids = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": ids || undefined,
  } as const;
}
