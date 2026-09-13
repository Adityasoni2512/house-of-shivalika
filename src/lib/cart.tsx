"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

import {
  createBrowserStore,
  useBrowserStore,
  useHasHydrated,
} from "@/lib/browser-store";

/**
 * The cart lives entirely in the browser.
 *
 * Nothing is written to the database until the lead form is submitted, which is
 * the whole point of the WhatsApp model: no accounts, no server-side sessions,
 * no abandoned-cart rows to clean up.
 *
 * Backed by useSyncExternalStore so the server and the first client render
 * agree on an empty cart, then the real contents arrive without a mismatch.
 */

const STORAGE_KEY = "hos.cart.v1";

export type CartLine = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  sku: string;
  sizeLabel: string;
  price: number;
  imageUrl: string | null;
  qty: number;
  /** Stock at the time of adding — advisory only, re-checked server-side. */
  maxQty: number;
};

const EMPTY: CartLine[] = [];

function parseCart(raw: string | null): CartLine[] {
  if (!raw) return EMPTY;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    // Defensive: a stale schema from an older build must not crash the cart.
    const lines = parsed.filter(
      (line): line is CartLine =>
        typeof line?.variantId === "string" &&
        typeof line?.productId === "string" &&
        typeof line?.price === "number" &&
        typeof line?.qty === "number" &&
        line.qty > 0,
    );

    return lines.length > 0 ? lines : EMPTY;
  } catch {
    return EMPTY;
  }
}

const cartStore = createBrowserStore<CartLine[]>({
  key: STORAGE_KEY,
  parse: parseCart,
  serverValue: EMPTY,
});

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  isHydrated: boolean;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useBrowserStore(cartStore);
  const isHydrated = useHasHydrated();

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    const current = cartStore.read();
    const existing = current.find((l) => l.variantId === line.variantId);
    const cap = line.maxQty || 99;

    cartStore.write(
      existing
        ? current.map((l) =>
            l.variantId === line.variantId
              ? { ...l, ...line, qty: Math.min(l.qty + qty, cap) }
              : l,
          )
        : [...current, { ...line, qty: Math.min(qty, cap) }],
    );
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    const current = cartStore.read();

    cartStore.write(
      qty <= 0
        ? current.filter((l) => l.variantId !== variantId)
        : current.map((l) =>
            l.variantId === variantId
              ? { ...l, qty: Math.min(qty, l.maxQty || 99) }
              : l,
          ),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    cartStore.write(cartStore.read().filter((l) => l.variantId !== variantId));
  }, []);

  const clear = useCallback(() => cartStore.write(EMPTY), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    return { lines, itemCount, subtotal, isHydrated, add, setQty, remove, clear };
  }, [lines, isHydrated, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside a CartProvider");
  return context;
}
