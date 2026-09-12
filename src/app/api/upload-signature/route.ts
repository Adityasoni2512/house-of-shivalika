import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/auth";
import { createUploadSignature, isCloudinaryConfigured } from "@/lib/cloudinary";

const ALLOWED_FOLDERS = new Set(["products", "categories", "banners", "reviews"]);

/**
 * Issues a short-lived Cloudinary upload signature.
 *
 * Admin-only, except `reviews`, which customers use from an invite link. The
 * folder is validated against a fixed allow-list so a caller cannot write
 * anywhere they like inside the account.
 */
export async function POST(request: Request) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary is not configured. Add the keys to .env.local." },
      { status: 503 },
    );
  }

  let folder = "products";
  try {
    const body = await request.json();
    if (typeof body?.folder === "string") folder = body.folder;
  } catch {
    // Empty body is fine — default to products.
  }

  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }

  // Review photos come from customers holding a valid invite; everything else
  // is admin-only. The invite token itself is checked by the review action.
  if (folder !== "reviews") {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authorised" }, { status: 401 });
    }
  }

  try {
    return NextResponse.json(createUploadSignature(folder));
  } catch {
    return NextResponse.json(
      { error: "Could not create an upload signature" },
      { status: 500 },
    );
  }
}
