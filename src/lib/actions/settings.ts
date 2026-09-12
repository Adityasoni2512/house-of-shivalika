"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

export type SettingsActionState = { ok?: boolean; error?: string };

const settingsSchema = z.object({
  brand_name: z.string().trim().max(80),
  brand_tagline: z.string().trim().max(160),
  whatsapp_number: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || v.length >= 10, {
      message: "Enter the full number including country code, e.g. 919876543210",
    }),
  announcement_enabled: z.boolean(),
  announcement_text: z.string().trim().max(160),
  contact_email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Enter a valid email address",
    }),
  contact_phone: z.string().trim().max(40),
  contact_address: z.string().trim().max(400),
  contact_hours: z.string().trim().max(120),
  instagram_url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\//.test(v), {
      message: "Instagram URL must start with https://",
    }),
  shipping_flat_rate: z.coerce.number().min(0),
  free_shipping_threshold: z.coerce.number().min(0),
  shipping_note: z.string().trim().max(200),
  ga4_id: z
    .string()
    .trim()
    .refine((v) => v === "" || /^G-[A-Z0-9]+$/i.test(v), {
      message: "GA4 IDs look like G-XXXXXXXXXX",
    }),
  meta_pixel_id: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{6,20}$/.test(v), {
      message: "Meta Pixel IDs are numeric",
    }),
  google_ads_id: z
    .string()
    .trim()
    .refine((v) => v === "" || /^AW-[0-9]+$/i.test(v), {
      message: "Google Ads IDs look like AW-123456789",
    }),
  google_ads_conversion_label: z.string().trim().max(60),
  gstin: z.string().trim().max(20),
  review_invite_days: z.coerce.number().int().min(1).max(365),
});

export async function saveSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const raw: Record<string, unknown> = {};

  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
    const expected = typeof DEFAULT_SETTINGS[key];
    raw[key] =
      expected === "boolean" ? formData.get(key) === "on" : (formData.get(key) ?? "");
  }

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Check the values and try again" };
  }

  const db = createAdminClient();
  const admin = await requireAdmin();

  const rows = Object.entries(parsed.data).map(([key, value]) => ({
    key,
    value: value as never,
    updated_by: admin.id,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return { error: "Could not save settings" };

  // Settings reach almost every page — revalidate the whole tree.
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");

  return { ok: true };
}
