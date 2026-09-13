"use client";

import { useSyncExternalStore } from "react";

/**
 * SSR-safe reader for browser storage.
 *
 * The naive approach — read storage in a useEffect and setState — renders once
 * with the wrong value and then again with the right one, which flashes and
 * triggers cascading renders. useSyncExternalStore is the primitive designed
 * for exactly this: the server snapshot is used during SSR and hydration, the
 * client snapshot thereafter, with no mismatch and no extra render pass.
 *
 * Every storage access is wrapped: localStorage throws in private windows and
 * when site data is blocked, and a shop must not break because of it.
 */

type Listener = () => void;

export type BrowserStore<T> = {
  subscribe: (listener: Listener) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  write: (value: T) => void;
  read: () => T;
};

export function createBrowserStore<T>(options: {
  key: string;
  area?: "local" | "session";
  parse: (raw: string | null) => T;
  serialize?: (value: T) => string;
  serverValue: T;
}): BrowserStore<T> {
  const {
    key,
    area = "local",
    parse,
    serialize = JSON.stringify,
    serverValue,
  } = options;

  const listeners = new Set<Listener>();

  let cachedRaw: string | null | undefined;
  let cachedValue: T = serverValue;
  let primed = false;

  function storage(): Storage | null {
    try {
      return area === "local" ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  }

  function readRaw(): string | null {
    try {
      return storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Must return a referentially stable value for unchanged storage — returning
   * a fresh object every call makes useSyncExternalStore loop forever.
   */
  function getSnapshot(): T {
    const raw = readRaw();
    if (!primed || raw !== cachedRaw) {
      cachedRaw = raw;
      cachedValue = parse(raw);
      primed = true;
    }
    return cachedValue;
  }

  function getServerSnapshot(): T {
    return serverValue;
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  function subscribe(listener: Listener) {
    listeners.add(listener);

    // Keep multiple tabs in sync.
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) emit();
    };

    try {
      window.addEventListener("storage", onStorage);
    } catch {
      /* no-op */
    }

    return () => {
      listeners.delete(listener);
      try {
        window.removeEventListener("storage", onStorage);
      } catch {
        /* no-op */
      }
    };
  }

  function write(value: T) {
    // Update the cache first so a read immediately after a write is correct
    // even when storage itself is unavailable — the store still works in
    // memory for the life of the page.
    cachedValue = value;
    cachedRaw = undefined;
    primed = false;

    try {
      storage()?.setItem(key, serialize(value));
      cachedRaw = readRaw();
      cachedValue = value;
      primed = true;
    } catch {
      // Quota exceeded or storage blocked: keep the in-memory value.
      primed = true;
      cachedRaw = null;
    }

    emit();
  }

  return { subscribe, getSnapshot, getServerSnapshot, write, read: getSnapshot };
}

export function useBrowserStore<T>(store: BrowserStore<T>): T {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

/**
 * True once the client has taken over from the server snapshot. Use it to hold
 * back UI that would otherwise flash the empty server state.
 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
