import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, with later Tailwind classes winning. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format paise-free rupee amounts: 1299 -> "₹1,299", 1299.5 -> "₹1,299.50" */
export function formatPrice(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";

  const hasPaise = n % 1 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(n);
}

/** Whole-number discount percentage, or null when there is no genuine discount. */
export function discountPercent(
  mrp: number | string | null | undefined,
  price: number | string | null | undefined,
): number | null {
  const m = typeof mrp === "string" ? Number(mrp) : mrp;
  const p = typeof price === "string" ? Number(price) : price;

  if (!m || !p || Number.isNaN(m) || Number.isNaN(p)) return null;
  if (m <= p) return null;

  const pct = Math.round(((m - p) / m) * 100);
  return pct > 0 ? pct : null;
}

/** URL-safe slug from arbitrary text. Always overridable by the admin. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "12 Sep 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** "12 Sep 2026, 3:45 pm" */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Normalise an Indian mobile number to bare 10 digits.
 * Accepts "+91 98765 43210", "09876543210", "919876543210".
 * Returns null when it is not a plausible Indian mobile.
 */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  let local = digits;
  if (local.length === 12 && local.startsWith("91")) local = local.slice(2);
  else if (local.length === 11 && local.startsWith("0")) local = local.slice(1);

  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

/** Clamp a number into a range. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
