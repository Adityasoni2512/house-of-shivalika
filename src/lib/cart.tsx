"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * The cart lives entirely in the browser.
 *
 * Nothing is written to the database until the lead form is submitted, which is
 * the whole point of the WhatsApp model: no accounts, no server-side sessions,
 * no abandoned-cart rows to clean up. localStorage can throw (private windows,
 * blocked site data), so every access is wrapped — a broken storage API must
 * degrade to an in-memory cart, never a crash.
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

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Defensive: a stale schema from an older build must not crash the cart.
    return parsed.filter(
      (line): line is CartLine =>
        typeof line?.variantId === "string" &&
        typeof line?.productId === "string" &&
        typeof line?.price === "number" &&
        typeof line?.qty === "number" &&
        line.qty > 0,
    );
  } catch {
    return [];
  }
}

function writeStorage(lines: CartLine[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Quota exceeded or storage blocked — the in-memory cart still works.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read after mount so server and client render the same empty cart first —
  // reading during render would cause a hydration mismatch.
  useEffect(() => {
    setLines(readStorage());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) writeStorage(lines);
  }, [lines, isHydrated]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setLines(readStorage());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === line.variantId);

      if (existing) {
        const nextQty = Math.min(existing.qty + qty, line.maxQty || 99);
        return prev.map((l) =>
          l.variantId === line.variantId ? { ...l, ...line, qty: nextQty } : l,
        );
      }

      return [...prev, { ...line, qty: Math.min(qty, line.maxQty || 99) }];
    });
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.variantId !== variantId)
        : prev.map((l) =>
            l.variantId === variantId
              ? { ...l, qty: Math.min(qty, l.maxQty || 99) }
              : l,
          ),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

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
