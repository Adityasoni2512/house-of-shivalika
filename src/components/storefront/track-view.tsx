"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { track, type EventPayload, type EventType } from "@/lib/analytics";

/**
 * Fires a single event on mount. Used for page_view, category_view and search.
 * Keyed on pathname so client-side navigation between two products still counts
 * as two views.
 *
 * The payload is serialised into the effect's dependency list rather than held
 * in a ref: refs must not be written during render, and the payload is a small
 * flat object so stringifying it is cheap.
 */
export function TrackView({
  event,
  payload,
}: {
  event: EventType;
  payload?: EventPayload;
}) {
  const pathname = usePathname();
  const fired = useRef<string | null>(null);
  const payloadKey = payload ? JSON.stringify(payload) : "";

  useEffect(() => {
    const key = `${pathname}|${event}|${payloadKey}`;
    if (fired.current === key) return;

    fired.current = key;
    track(event, payloadKey ? (JSON.parse(payloadKey) as EventPayload) : undefined);
  }, [event, pathname, payloadKey]);

  return null;
}

/**
 * Product views need a dwell threshold — without it, scrolling past a product
 * in a grid or bouncing straight off would count as a view and make the
 * view-to-WhatsApp conversion rate meaningless.
 */
export function TrackProductView({
  productId,
  categoryId,
  dwellMs = 2000,
}: {
  productId: string;
  categoryId?: string;
  dwellMs?: number;
}) {
  const fired = useRef<string | null>(null);

  useEffect(() => {
    if (fired.current === productId) return;

    const timer = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      fired.current = productId;
      track("product_view", { product_id: productId, category_id: categoryId });
    }, dwellMs);

    return () => clearTimeout(timer);
  }, [productId, categoryId, dwellMs]);

  return null;
}
