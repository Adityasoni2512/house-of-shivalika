"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";

export type ReviewActionState = {
  ok?: boolean;
  error?: string;
  token?: string;
  url?: string;
};

/* -------------------------------------------------------------------------- */
/* Invites (admin)                                                            */
/* -------------------------------------------------------------------------- */

export async function createReviewInviteAction(input: {
  productId: string;
  orderId?: string | null;
  customerName?: string;
  customerPhone?: string;
}): Promise<ReviewActionState> {
  const admin = await requireAdmin();

  const parsed = z
    .object({
      productId: z.string().uuid("Choose a product"),
      orderId: z.string().uuid().nullable().optional(),
      customerName: z.string().trim().max(80).optional(),
      customerPhone: z.string().trim().max(20).optional(),
    })
    .safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details" };
  }

  const settings = await getSettings();
  const db = createAdminClient();

  // 32 bytes of CSPRNG, base64url — not guessable, not enumerable.
  const token = randomBytes(24).toString("base64url");

  const expiresAt = new Date(
    Date.now() + settings.review_invite_days * 864e5,
  ).toISOString();

  const { error } = await db.from("review_invites").insert({
    token,
    product_id: parsed.data.productId,
    order_id: parsed.data.orderId ?? null,
    customer_name: parsed.data.customerName?.trim() || null,
    customer_phone: parsed.data.customerPhone?.trim() || null,
    expires_at: expiresAt,
    created_by: admin.id,
  });

  if (error) return { error: "Could not create the invite" };

  revalidatePath("/admin/invites");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return { ok: true, token, url: `${siteUrl}/review/${token}` };
}

export async function revokeReviewInviteAction(
  id: string,
): Promise<ReviewActionState> {
  await requireAdmin();

  const db = createAdminClient();
  const { error } = await db
    .from("review_invites")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) return { error: "Could not revoke the invite" };

  revalidatePath("/admin/invites");
  return { ok: true };
}

export async function deleteReviewInviteAction(
  id: string,
): Promise<ReviewActionState> {
  await requireAdmin();

  const db = createAdminClient();
  const { error } = await db.from("review_invites").delete().eq("id", id);
  if (error) return { error: "Could not delete the invite" };

  revalidatePath("/admin/invites");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Moderation (admin)                                                         */
/* -------------------------------------------------------------------------- */

async function revalidateReviewSurfaces(productId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  revalidatePath("/");
  if (data?.slug) revalidatePath(`/product/${data.slug}`);
}

export async function moderateReviewAction(
  id: string,
  status: "approved" | "rejected" | "pending",
  adminNote?: string,
): Promise<ReviewActionState> {
  const admin = await requireAdmin();

  const db = createAdminClient();

  const { data: review } = await db
    .from("reviews")
    .select("product_id")
    .eq("id", id)
    .maybeSingle();

  if (!review) return { error: "Review not found" };

  const { error } = await db
    .from("reviews")
    .update({
      status,
      admin_note: adminNote?.trim() || null,
      approved_by: status === "approved" ? admin.id : null,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return { error: "Could not update the review" };

  await revalidateReviewSurfaces(review.product_id);
  return { ok: true };
}

export async function setVerifiedBuyerAction(
  id: string,
  verified: boolean,
): Promise<ReviewActionState> {
  await requireAdmin();

  const db = createAdminClient();

  const { data: review } = await db
    .from("reviews")
    .select("product_id")
    .eq("id", id)
    .maybeSingle();

  if (!review) return { error: "Review not found" };

  const { error } = await db
    .from("reviews")
    .update({ is_verified_buyer: verified })
    .eq("id", id);

  if (error) return { error: "Could not update the review" };

  await revalidateReviewSurfaces(review.product_id);
  return { ok: true };
}

export async function deleteReviewAction(
  id: string,
): Promise<ReviewActionState> {
  await requireAdmin();

  const db = createAdminClient();

  const { data: review } = await db
    .from("reviews")
    .select("product_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.from("reviews").delete().eq("id", id);
  if (error) return { error: "Could not delete the review" };

  if (review) await revalidateReviewSurfaces(review.product_id);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Submission (public, token-gated)                                           */
/* -------------------------------------------------------------------------- */

const submissionSchema = z.object({
  token: z.string().min(10).max(100),
  reviewerName: z.string().trim().min(1, "Please enter your name").max(80),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  title: z.string().trim().max(120),
  body: z.string().trim().max(2000),
  images: z
    .array(z.object({ public_id: z.string(), url: z.string().url() }))
    .max(4)
    .default([]),
});

export async function submitReviewAction(
  input: unknown,
): Promise<ReviewActionState> {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your review" };
  }

  const data = parsed.data;
  const db = createAdminClient();

  const { data: invite } = await db
    .from("review_invites")
    .select("id, product_id, status, expires_at, customer_name")
    .eq("token", data.token)
    .maybeSingle();

  if (!invite) return { error: "This review link is not valid." };
  if (invite.status === "used") {
    return { error: "This review link has already been used." };
  }
  if (invite.status === "revoked") {
    return { error: "This review link is no longer active." };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { error: "This review link has expired." };
  }

  const { data: review, error } = await db
    .from("reviews")
    .insert({
      product_id: invite.product_id,
      invite_id: invite.id,
      reviewer_name: data.reviewerName,
      rating: data.rating,
      title: data.title || null,
      body: data.body || null,
      status: "pending", // never public until an admin approves
    })
    .select("id")
    .single();

  if (error || !review) {
    // The UNIQUE constraint on invite_id is the real guard against a double
    // submit racing the status update below.
    return {
      error:
        error?.code === "23505"
          ? "A review has already been submitted using this link."
          : "Could not save your review. Please try again.",
    };
  }

  if (data.images.length > 0) {
    await db.from("review_images").insert(
      data.images.map((image, index) => ({
        review_id: review.id,
        public_id: image.public_id,
        url: image.url,
        position: index,
      })),
    );
  }

  await db
    .from("review_invites")
    .update({ status: "used", used_at: new Date().toISOString() })
    .eq("id", invite.id);

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");

  return { ok: true };
}
