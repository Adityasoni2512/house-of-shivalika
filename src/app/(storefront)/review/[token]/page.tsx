import type { Metadata } from "next";

import { createAdminClient } from "@/lib/supabase/admin";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { getSettings } from "@/lib/settings";

import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Write a review",
  robots: { index: false, follow: false },
};

type InviteState =
  | { valid: true; productName: string; productImage: string | null; customerName: string | null }
  | { valid: false; reason: string };

async function loadInvite(token: string): Promise<InviteState> {
  const db = createAdminClient();

  const { data: invite } = await db
    .from("review_invites")
    .select(
      "id, status, expires_at, customer_name, products(name, product_images(url, position))",
    )
    .eq("token", token)
    .maybeSingle();

  if (!invite || !invite.products) {
    return { valid: false, reason: "This review link is not valid." };
  }
  if (invite.status === "used") {
    return {
      valid: false,
      reason: "Thank you — a review has already been submitted using this link.",
    };
  }
  if (invite.status === "revoked") {
    return { valid: false, reason: "This review link is no longer active." };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { valid: false, reason: "This review link has expired." };
  }

  const images = [...(invite.products.product_images ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return {
    valid: true,
    productName: invite.products.name,
    productImage: images[0]?.url ?? null,
    customerName: invite.customer_name,
  };
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [invite, settings] = await Promise.all([loadInvite(token), getSettings()]);

  if (!invite.valid) {
    return (
      <div className="container-page section-y">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-serif text-3xl">Review link</h1>
          <p className="mt-4 text-sm text-ink-muted">{invite.reason}</p>
          <a
            href="/"
            className="label-caps mt-8 inline-block text-accent underline underline-offset-4"
          >
            Visit {settings.brand_name}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-12 lg:py-20">
      <div className="mx-auto max-w-lg">
        <p className="label-caps text-ink-muted">Your review</p>
        <h1 className="mt-3 font-serif text-3xl md:text-4xl">
          How was your {invite.productName}?
        </h1>
        <p className="mt-4 text-sm text-ink-muted">
          Thank you for shopping with {settings.brand_name}. Your review is
          checked by us before it appears on the site.
        </p>

        <div className="mt-10">
          <ReviewForm
            token={token}
            productName={invite.productName}
            productImage={invite.productImage}
            defaultName={invite.customerName ?? ""}
            cloudinaryReady={isCloudinaryConfigured()}
          />
        </div>
      </div>
    </div>
  );
}
