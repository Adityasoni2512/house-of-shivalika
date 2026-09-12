import "server-only";

import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Editable globals, stored as key/value JSON so the team can change them from
 * the admin panel without a deploy. Read through `cache()` so a page that needs
 * settings in three places still only hits the database once per request.
 */

export type SiteSettings = {
  brand_name: string;
  brand_tagline: string;
  whatsapp_number: string;
  announcement_enabled: boolean;
  announcement_text: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  contact_hours: string;
  instagram_url: string;
  shipping_flat_rate: number;
  free_shipping_threshold: number;
  shipping_note: string;
  ga4_id: string;
  meta_pixel_id: string;
  google_ads_id: string;
  google_ads_conversion_label: string;
  gstin: string;
  review_invite_days: number;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: "House of Shivalika",
  brand_tagline: "Considered clothing for everyday women",
  whatsapp_number: "",
  announcement_enabled: false,
  announcement_text: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  contact_hours: "",
  instagram_url: "",
  shipping_flat_rate: 0,
  free_shipping_threshold: 0,
  shipping_note: "",
  ga4_id: "",
  meta_pixel_id: "",
  google_ads_id: "",
  google_ads_conversion_label: "",
  gstin: "",
  review_invite_days: 60,
};

export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const db = createAdminClient();
    const { data } = await db.from("site_settings").select("key, value");

    const settings = { ...DEFAULT_SETTINGS };

    for (const row of data ?? []) {
      if (!(row.key in settings)) continue;

      const key = row.key as keyof SiteSettings;
      const value = row.value;

      // Values are jsonb, so they arrive already typed — but a hand-edited row
      // could be anything, so coerce defensively rather than trusting it.
      const expected = typeof DEFAULT_SETTINGS[key];

      if (expected === "string" && typeof value === "string") {
        (settings[key] as string) = value;
      } else if (expected === "number" && typeof value === "number") {
        (settings[key] as number) = value;
      } else if (expected === "boolean" && typeof value === "boolean") {
        (settings[key] as boolean) = value;
      }
    }

    return settings;
  } catch {
    // A missing database must never take the storefront down.
    return DEFAULT_SETTINGS;
  }
});

/** Digits-only WhatsApp number, or null when not configured. */
export function whatsappNumber(settings: SiteSettings): string | null {
  const digits = settings.whatsapp_number.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}
