"use client";

/**
 * First-party, anonymous event tracking.
 *
 * No IP is stored, no fingerprinting, no cross-site identifiers — just a random
 * UUID in localStorage and a session id that rotates after 30 minutes idle.
 * That is what lets this run without cookie consent under the DPDP Act; GA4 and
 * Meta Pixel are gated behind consent separately.
 *
 * Events are buffered and flushed in batches so we never fire one request per
 * interaction.
 */

export type EventType =
  | "page_view"
  | "product_view"
  | "category_view"
  | "search"
  | "size_select"
  | "add_to_cart"
  | "remove_from_cart"
  | "cart_view"
  | "lead_form_open"
  | "lead_submitted"
  | "whatsapp_click";

export type EventPayload = {
  product_id?: string;
  category_id?: string;
  size_label?: string;
  search_query?: string;
  value?: number;
  meta?: Record<string, unknown>;
};

const VISITOR_KEY = "hos.visitor";
const SESSION_KEY = "hos.session";
const SESSION_TS_KEY = "hos.session.ts";
const SESSION_IDLE_MS = 30 * 60 * 1000;
const BATCH_SIZE = 5;
const FLUSH_DELAY_MS = 3000;

type QueuedEvent = EventPayload & {
  event_type: EventType;
  path: string;
  occurred_at: string;
};

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Older browsers, or crypto unavailable in an exotic context.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked — tracking degrades to per-request anonymity */
  }
}

function getVisitorId(): string {
  let id = readStore(VISITOR_KEY);
  if (!id) {
    id = uuid();
    writeStore(VISITOR_KEY, id);
  }
  return id;
}

function getSessionId(): string {
  const now = Date.now();
  const lastSeen = Number(readStore(SESSION_TS_KEY) ?? 0);
  let id = readStore(SESSION_KEY);

  if (!id || !lastSeen || now - lastSeen > SESSION_IDLE_MS) {
    id = uuid();
    writeStore(SESSION_KEY, id);
  }

  writeStore(SESSION_TS_KEY, String(now));
  return id;
}

function deviceType(): "mobile" | "tablet" | "desktop" {
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function utmParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source") ?? undefined,
      utm_medium: params.get("utm_medium") ?? undefined,
      utm_campaign: params.get("utm_campaign") ?? undefined,
    };
  } catch {
    return {};
  }
}

function referrerHost(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const url = new URL(document.referrer);
    if (url.host === window.location.host) return undefined;
    return url.host;
  } catch {
    return undefined;
  }
}

function flush(useBeacon = false) {
  if (queue.length === 0) return;

  const events = queue;
  queue = [];

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const body = JSON.stringify({
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    device_type: deviceType(),
    referrer_host: referrerHost(),
    ...utmParams(),
    events,
  });

  try {
    // sendBeacon survives the page unloading — a plain fetch does not.
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* analytics must never surface an error to the customer */
    });
  } catch {
    /* no-op */
  }
}

function bindListeners() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;

  const flushOnHide = () => {
    if (document.visibilityState === "hidden") flush(true);
  };

  document.addEventListener("visibilitychange", flushOnHide);
  window.addEventListener("pagehide", () => flush(true));
}

/** Queue an event. Safe to call from anywhere, including during SSR (no-ops). */
export function track(event: EventType, payload: EventPayload = {}) {
  if (typeof window === "undefined") return;

  bindListeners();

  queue.push({
    ...payload,
    event_type: event,
    path: window.location.pathname,
    occurred_at: new Date().toISOString(),
  });

  if (queue.length >= BATCH_SIZE) {
    flush();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => flush(), FLUSH_DELAY_MS);
  }
}

/** Force a flush — used before a WhatsApp redirect takes the user away. */
export function flushNow() {
  flush(true);
}
