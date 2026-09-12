import type { Metadata } from "next";

import { getSettings, whatsappNumber } from "@/lib/settings";

import { CartView } from "./cart-view";

export const metadata: Metadata = {
  title: "Cart",
  // Never index a cart — it is per-visitor and has no search value.
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const settings = await getSettings();
  const number = whatsappNumber(settings);

  return (
    <CartView
      whatsappNumber={number}
      brandName={settings.brand_name}
      shippingNote={settings.shipping_note}
      flatRate={settings.shipping_flat_rate}
      freeThreshold={settings.free_shipping_threshold}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
    />
  );
}
