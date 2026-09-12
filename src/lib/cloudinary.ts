import "server-only";

import { createHash } from "node:crypto";

/**
 * Signed Cloudinary uploads.
 *
 * The API secret never leaves the server. The browser asks an authenticated
 * route for a short-lived signature, then uploads the file straight to
 * Cloudinary — the bytes never pass through our server, which keeps us well
 * inside Netlify's function limits.
 */

export const CLOUDINARY_FOLDER = "house-of-shivalika";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export function createUploadSignature(subfolder: string): UploadSignature {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `${CLOUDINARY_FOLDER}/${subfolder}`;

  // Cloudinary signs the alphabetically sorted params, secret appended.
  const params: Record<string, string | number> = { folder, timestamp };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const signature = createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  return { cloudName, apiKey, timestamp, folder, signature };
}
