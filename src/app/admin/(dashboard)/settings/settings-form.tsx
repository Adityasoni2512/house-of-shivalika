"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Card, CardHeader } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import {
  saveSettingsAction,
  type SettingsActionState,
} from "@/lib/actions/settings";
import type { SiteSettings } from "@/lib/settings";

function SaveBar() {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 mt-5 border border-line bg-surface px-5 py-4">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction] = useActionState<SettingsActionState, FormData>(
    saveSettingsAction,
    {},
  );

  useEffect(() => {
    if (state.ok) toast.success("Settings saved");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="max-w-3xl">
      <div className="space-y-5">
        {/* ---- Brand ---- */}
        <Card>
          <CardHeader title="Brand" />
          <div className="space-y-4 p-5">
            <Field label="Brand name" htmlFor="brand_name">
              <Input id="brand_name" name="brand_name" defaultValue={settings.brand_name} />
            </Field>

            <Field
              label="Tagline"
              htmlFor="brand_tagline"
              hint="Used in the site description and social previews"
            >
              <Input
                id="brand_tagline"
                name="brand_tagline"
                defaultValue={settings.brand_tagline}
              />
            </Field>

            <Field
              label="Instagram URL"
              htmlFor="instagram_url"
              hint="Footer link and Organization schema"
            >
              <Input
                id="instagram_url"
                name="instagram_url"
                defaultValue={settings.instagram_url}
                placeholder="https://instagram.com/…"
              />
            </Field>
          </div>
        </Card>

        {/* ---- WhatsApp ---- */}
        <Card>
          <CardHeader title="WhatsApp" />
          <div className="space-y-4 p-5">
            <Field
              label="Order number"
              htmlFor="whatsapp_number"
              required
              hint="Country code, digits only. India: 91 followed by the 10-digit mobile."
            >
              <Input
                id="whatsapp_number"
                name="whatsapp_number"
                defaultValue={settings.whatsapp_number}
                placeholder="919876543210"
                className="font-mono tabular-nums"
              />
            </Field>

            {!settings.whatsapp_number ? (
              <p className="border border-sale/30 bg-sale/5 px-3 py-2 text-xs text-sale">
                No number set. The site cannot take orders until this is filled in —
                the WhatsApp buttons will be hidden.
              </p>
            ) : null}
          </div>
        </Card>

        {/* ---- Announcement bar ---- */}
        <Card>
          <CardHeader title="Announcement bar" />
          <div className="space-y-4 p-5">
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="announcement_enabled"
                defaultChecked={settings.announcement_enabled}
                className="size-4 accent-[var(--color-ink)]"
              />
              Show the announcement bar
            </label>

            <Field label="Text" htmlFor="announcement_text">
              <Input
                id="announcement_text"
                name="announcement_text"
                defaultValue={settings.announcement_text}
                placeholder="Free shipping on orders above ₹1,499"
                maxLength={160}
              />
            </Field>
          </div>
        </Card>

        {/* ---- Shipping ---- */}
        <Card>
          <CardHeader title="Shipping" />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Flat rate (₹)"
                htmlFor="shipping_flat_rate"
                hint="0 means free"
              >
                <Input
                  id="shipping_flat_rate"
                  name="shipping_flat_rate"
                  type="number"
                  min={0}
                  step="1"
                  defaultValue={settings.shipping_flat_rate}
                  className="tabular-nums"
                />
              </Field>

              <Field
                label="Free above (₹)"
                htmlFor="free_shipping_threshold"
                hint="0 disables the threshold"
              >
                <Input
                  id="free_shipping_threshold"
                  name="free_shipping_threshold"
                  type="number"
                  min={0}
                  step="1"
                  defaultValue={settings.free_shipping_threshold}
                  className="tabular-nums"
                />
              </Field>
            </div>

            <Field
              label="Cart note"
              htmlFor="shipping_note"
              hint="Shown in the cart summary"
            >
              <Input
                id="shipping_note"
                name="shipping_note"
                defaultValue={settings.shipping_note}
                maxLength={200}
              />
            </Field>
          </div>
        </Card>

        {/* ---- Contact ---- */}
        <Card>
          <CardHeader title="Contact" />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" htmlFor="contact_email">
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  defaultValue={settings.contact_email}
                />
              </Field>

              <Field label="Phone" htmlFor="contact_phone">
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  defaultValue={settings.contact_phone}
                />
              </Field>
            </div>

            <Field label="Hours" htmlFor="contact_hours">
              <Input
                id="contact_hours"
                name="contact_hours"
                defaultValue={settings.contact_hours}
              />
            </Field>

            <Field label="Address" htmlFor="contact_address">
              <Textarea
                id="contact_address"
                name="contact_address"
                rows={3}
                defaultValue={settings.contact_address}
              />
            </Field>
          </div>
        </Card>

        {/* ---- Analytics ---- */}
        <Card>
          <CardHeader title="Analytics & ad tags" />
          <div className="space-y-4 p-5">
            <p className="text-xs text-ink-muted">
              These load only after a visitor accepts cookies. Your own
              first-party analytics runs regardless — it is anonymous and stores
              no personal data.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="GA4 Measurement ID" htmlFor="ga4_id" hint="G-XXXXXXXXXX">
                <Input
                  id="ga4_id"
                  name="ga4_id"
                  defaultValue={settings.ga4_id}
                  className="font-mono"
                />
              </Field>

              <Field label="Meta Pixel ID" htmlFor="meta_pixel_id" hint="Numeric">
                <Input
                  id="meta_pixel_id"
                  name="meta_pixel_id"
                  defaultValue={settings.meta_pixel_id}
                  className="font-mono"
                />
              </Field>

              <Field label="Google Ads ID" htmlFor="google_ads_id" hint="AW-123456789">
                <Input
                  id="google_ads_id"
                  name="google_ads_id"
                  defaultValue={settings.google_ads_id}
                  className="font-mono"
                />
              </Field>

              <Field
                label="Conversion label"
                htmlFor="google_ads_conversion_label"
                hint="Fired on WhatsApp click"
              >
                <Input
                  id="google_ads_conversion_label"
                  name="google_ads_conversion_label"
                  defaultValue={settings.google_ads_conversion_label}
                  className="font-mono"
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* ---- Other ---- */}
        <Card>
          <CardHeader title="Other" />
          <div className="space-y-4 p-5">
            <Field
              label="Review invite validity (days)"
              htmlFor="review_invite_days"
            >
              <Input
                id="review_invite_days"
                name="review_invite_days"
                type="number"
                min={1}
                max={365}
                defaultValue={settings.review_invite_days}
                className="w-32 tabular-nums"
              />
            </Field>

            <Field
              label="GSTIN"
              htmlFor="gstin"
              hint="Leave blank unless GST registration applies. Shown in the footer and on invoices when set."
            >
              <Input
                id="gstin"
                name="gstin"
                defaultValue={settings.gstin}
                className="font-mono"
              />
            </Field>
          </div>
        </Card>
      </div>

      <SaveBar />
    </form>
  );
}
