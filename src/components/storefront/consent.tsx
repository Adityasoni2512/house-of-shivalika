"use client";

import Script from "next/script";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Cookie consent, and the ad/analytics tags it gates.
 *
 * Our own first-party analytics runs regardless: it is anonymous, stores no IP,
 * and does no cross-site tracking, which is defensible under the DPDP Act.
 * GA4, Meta Pixel and Google Ads are genuinely third-party tracking, so they
 * are not injected at all until someone accepts.
 */

const STORAGE_KEY = "hos.consent";

type ConsentValue = "accepted" | "declined" | null;

const ConsentContext = createContext<{
  consent: ConsentValue;
  open: () => void;
}>({ consent: null, open: () => {} });

export function useConsent() {
  return useContext(ConsentContext);
}

export function ConsentProvider({
  ga4Id,
  metaPixelId,
  googleAdsId,
  children,
}: {
  ga4Id: string;
  metaPixelId: string;
  googleAdsId: string;
  children: React.ReactNode;
}) {
  const [consent, setConsent] = useState<ConsentValue>(null);
  const [decided, setDecided] = useState(true); // assume decided until we know
  const [forceOpen, setForceOpen] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage blocked — we cannot record a choice, so we cannot claim consent.
    }

    if (stored === "accepted" || stored === "declined") {
      setConsent(stored);
      setDecided(true);
    } else {
      setDecided(false);
    }
  }, []);

  const choose = useCallback((value: "accepted" | "declined") => {
    setConsent(value);
    setDecided(true);
    setForceOpen(false);

    try {
      window.localStorage.setItem(STORAGE_KEY, value);
      window.localStorage.setItem(`${STORAGE_KEY}.at`, new Date().toISOString());
    } catch {
      /* no-op */
    }
  }, []);

  const open = useCallback(() => setForceOpen(true), []);

  const showBanner = !decided || forceOpen;
  const tagsEnabled = consent === "accepted";
  const hasAnyTag = Boolean(ga4Id || metaPixelId || googleAdsId);

  return (
    <ConsentContext.Provider value={{ consent, open }}>
      {children}

      {tagsEnabled && ga4Id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${ga4Id}');${
              googleAdsId ? `gtag('config','${googleAdsId}');` : ""
            }`}
          </Script>
        </>
      ) : null}

      {tagsEnabled && metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}

      {showBanner && hasAnyTag ? (
        <div
          role="dialog"
          aria-label="Cookie preferences"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface"
        >
          <div className="container-page flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
              We use cookies from Google and Meta to understand how our
              advertising performs. Our own site statistics are anonymous and do
              not identify you. See our{" "}
              <a href="/privacy" className="underline underline-offset-2">
                privacy policy
              </a>
              .
            </p>

            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="secondary" onClick={() => choose("declined")}>
                Decline
              </Button>
              <Button size="sm" onClick={() => choose("accepted")}>
                Accept
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConsentContext.Provider>
  );
}

/** Footer link so a visitor can change their mind. */
export function ConsentReopenButton() {
  const { open, consent } = useConsent();

  if (consent === null) return null;

  return (
    <button
      type="button"
      onClick={open}
      className="text-xs text-ink-muted underline underline-offset-4 transition-colors hover:text-accent"
    >
      Cookie preferences
    </button>
  );
}
