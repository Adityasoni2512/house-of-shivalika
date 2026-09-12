"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadedImage = {
  public_id: string;
  url: string;
  alt_text: string | null;
  position: number;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

async function uploadOne(file: File, folder: string): Promise<UploadedImage> {
  const sigResponse = await fetch("/api/upload-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });

  if (!sigResponse.ok) {
    const body = await sigResponse.json().catch(() => ({}));
    throw new Error(body.error ?? "Could not start the upload");
  }

  const { cloudName, apiKey, timestamp, folder: signedFolder, signature } =
    await sigResponse.json();

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", signedFolder);
  form.append("signature", signature);

  // Straight to Cloudinary — the bytes never touch our server.
  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: form },
  );

  if (!uploadResponse.ok) {
    throw new Error("Cloudinary rejected the upload");
  }

  const data = await uploadResponse.json();
  return {
    public_id: data.public_id,
    url: data.secure_url,
    alt_text: null,
    position: 0,
  };
}

export function ImageUploader({
  images,
  onChange,
  folder = "products",
  max = 8,
  cloudinaryReady,
  aspect = "portrait",
}: {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  folder?: string;
  max?: number;
  cloudinaryReady: boolean;
  aspect?: "portrait" | "landscape";
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const room = max - images.length;

    if (room <= 0) {
      toast.error(`Maximum ${max} images`);
      return;
    }

    const accepted: File[] = [];
    for (const file of files.slice(0, room)) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`${file.name}: only JPEG, PNG, WebP or AVIF`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: larger than 10 MB`);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    setUploading(true);
    try {
      const results = await Promise.all(
        accepted.map((file) => uploadOne(file, folder)),
      );

      onChange(
        [...images, ...results].map((img, index) => ({ ...img, position: index })),
      );
      toast.success(`${results.length} image${results.length === 1 ? "" : "s"} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((img, i) => ({ ...img, position: i })));
  }

  function remove(index: number) {
    onChange(
      images.filter((_, i) => i !== index).map((img, i) => ({ ...img, position: i })),
    );
  }

  function setAlt(index: number, value: string) {
    const next = [...images];
    next[index] = { ...next[index], alt_text: value || null };
    onChange(next);
  }

  if (!cloudinaryReady) {
    return (
      <div className="border border-dashed border-line bg-paper p-6 text-center">
        <p className="text-sm font-medium text-ink">Cloudinary is not connected</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs text-ink-muted">
          Add <code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code>,{" "}
          <code>CLOUDINARY_API_KEY</code> and <code>CLOUDINARY_API_SECRET</code> to{" "}
          <code>.env.local</code>, then restart the dev server. See
          SETUP_CHECKLIST.md §1.1.
        </p>
        <p className="mt-3 text-xs text-ink-muted">
          Everything else on this page works without it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.public_id} className="border border-line bg-surface">
              <div
                className={cn(
                  "relative overflow-hidden bg-accent-soft",
                  aspect === "portrait" ? "aspect-[3/4]" : "aspect-[21/9]",
                )}
              >
                <Image
                  src={image.url}
                  alt={image.alt_text ?? ""}
                  fill
                  sizes="(max-width: 640px) 50vw, 200px"
                  className="object-cover"
                />
                {index === 0 ? (
                  <span className="label-caps-sm absolute left-1.5 top-1.5 bg-ink px-1.5 py-0.5 text-paper">
                    Primary
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-line px-1.5 py-1">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move image earlier"
                    className="p-1 text-ink-muted hover:text-ink disabled:opacity-30"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label="Move image later"
                    className="p-1 text-ink-muted hover:text-ink disabled:opacity-30"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="Remove image"
                  className="p-1 text-ink-muted hover:text-sale"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <input
                type="text"
                value={image.alt_text ?? ""}
                onChange={(e) => setAlt(index, e.target.value)}
                placeholder="Alt text"
                aria-label={`Alt text for image ${index + 1}`}
                className="w-full border-t border-line bg-transparent px-2 py-1.5 text-xs placeholder:text-ink-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        id={`upload-${folder}`}
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading || images.length >= max}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <ImagePlus className="size-4" /> Add images
            </>
          )}
        </Button>

        <p className="text-xs text-ink-muted">
          {images.length}/{max} · first image is the one shown in the grid
          {aspect === "portrait" ? " · 3:4 portrait" : ""}
        </p>
      </div>
    </div>
  );
}
