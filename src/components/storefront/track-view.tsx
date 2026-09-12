"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { track, type EventPayload, type EventType } from "@/lib/analytics";

/**
 * Fires a single event on mount. Used for page_view, category_view and search.
 * Keyed on pathname so client-side navigation between two products still counts
 * as two views.
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
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  useEffect(() => {
    if (fired.current === pathname) return;
    fired.current = pathname;
    track(event, payloadRef.current);
  }, [event, pathname]);

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
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    const timer = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      fired.current = true;
      track("product_view", { product_id: productId, category_id: categoryId });
    }, dwellMs);

    return () => clearTimeout(timer);
  }, [productId, categoryId, dwellMs]);

  return null;
}
