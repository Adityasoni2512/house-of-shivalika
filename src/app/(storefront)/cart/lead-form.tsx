"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { submitLeadAction } from "@/lib/actions/leads";
import { track } from "@/lib/analytics";
import { useCart } from "@/lib/cart";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Captures name, phone and pincode, saves the lead, then hands off to WhatsApp.
 *
 * The lead is written *before* the redirect, so an abandoned handoff still
 * leaves the team something to follow up on.
 */
export function LeadForm({
  whatsappNumber,
  brandName,
  siteUrl,
  onClose,
  onSent,
}: {
  whatsappNumber: string;
  brandName: string;
  siteUrl: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { lines, subtotal, clear } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<{ name: string; size: string }[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, pending]);

  function handleSubmit(formData: FormData) {
    setError(null);
    setUnavailable([]);

    let visitorId: string | null = null;
    let utm = {};
    try {
      visitorId = window.localStorage.getItem("hos.visitor");
      const params = new URLSearchParams(window.location.search);
      utm = {
        source: params.get("utm_source"),
        medium: params.get("utm_medium"),
        campaign: params.get("utm_campaign"),
      };
    } catch {
      /* storage or URL unavailable — the lead still saves */
    }

    startTransition(async () => {
      const result = await submitLeadAction({
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        pincode: String(formData.get("pincode") ?? ""),
        visitorId,
        utm,
        lines: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          slug: line.slug,
          name: line.name,
          sku: line.sku,
          sizeLabel: line.sizeLabel,
          price: line.price,
          qty: line.qty,
        })),
      });

      if (!result.ok) {
        setError(result.error);
        setUnavailable(result.unavailable ?? []);
        return;
      }

      track("lead_submitted", { value: result.subtotal });
      track("whatsapp_click", { value: result.subtotal });

      // Server-verified lines and prices, never the localStorage copy.
      const message = buildOrderMessage({
        lines: result.lines,
        subtotal: result.subtotal,
        customerName: String(formData.get("name") ?? ""),
        customerPhone: String(formData.get("phone") ?? ""),
        pincode: String(formData.get("pincode") ?? "") || undefined,
        leadRef: result.leadRef,
        siteUrl,
        brandName,
      });

      // New tab, so the customer keeps the site open behind WhatsApp.
      window.open(buildWhatsAppUrl(whatsappNumber, message), "_blank", "noopener");

      clear();
      toast.success("Opening WhatsApp…");
      onSent();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-form-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !pending && onClose()}
        className="absolute inset-0 bg-ink/40"
      />

      <div className="relative w-full max-w-md bg-paper">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="lead-form-title" className="label-caps">
            Almost there
          </h2>
          <button
            type="button"
            onClick={() => !pending && onClose()}
            aria-label="Close"
            className="-mr-2 p-2 text-ink-muted transition-colors hover:text-ink"
          >
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>

        <form action={handleSubmit} className="space-y-5 px-6 py-6">
          <p className="text-sm text-ink-muted">
            A few details so we can confirm your order, then we will open
            WhatsApp with everything filled in.
          </p>

          <Field label="Your name" htmlFor="lead-name" required>
            <Input id="lead-name" name="name" required autoFocus maxLength={80} />
          </Field>

          <Field
            label="Phone"
            htmlFor="lead-phone"
            required
            hint="10-digit Indian mobile"
          >
            <Input
              id="lead-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              placeholder="98765 43210"
            />
          </Field>

          <Field
            label="Pincode"
            htmlFor="lead-pincode"
            hint="Helps us confirm delivery time"
          >
            <Input
              id="lead-pincode"
              name="pincode"
              inputMode="numeric"
              maxLength={6}
              placeholder="560001"
            />
          </Field>

          {error ? (
            <div
              role="alert"
              className="border border-sale/30 bg-sale/5 px-3 py-2.5 text-xs text-sale"
            >
              <p>{error}</p>
              {unavailable.length > 0 ? (
                <ul className="mt-1.5 list-inside list-disc">
                  {unavailable.map((item) => (
                    <li key={`${item.name}-${item.size}`}>
                      {item.name} — size {item.size}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" full size="lg" disabled={pending}>
            {pending ? "Just a moment…" : "Continue to WhatsApp"}
          </Button>

          <p className="text-xs leading-relaxed text-ink-muted">
            By continuing you agree to us contacting you about this order. We do
            not take payment on this site. See our{" "}
            <a href="/privacy" className="underline underline-offset-2">
              privacy policy
            </a>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
