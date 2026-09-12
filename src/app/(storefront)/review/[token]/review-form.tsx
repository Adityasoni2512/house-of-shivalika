"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { submitReviewAction } from "@/lib/actions/reviews";

type Photo = { public_id: string; url: string };

const MAX_PHOTOS = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function ReviewForm({
  token,
  productName,
  productImage,
  defaultName,
  cloudinaryReady,
}: {
  token: string;
  productName: string;
  productImage: string | null;
  defaultName: string;
  cloudinaryReady: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX_PHOTOS} photos`);
      return;
    }

    const accepted = Array.from(files)
      .slice(0, room)
      .filter((file) => {
        if (!ACCEPTED.includes(file.type)) {
          toast.error(`${file.name}: images only`);
          return false;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name}: larger than 5 MB`);
          return false;
        }
        return true;
      });

    if (accepted.length === 0) return;

    setUploading(true);
    try {
      const uploaded: Photo[] = [];

      for (const file of accepted) {
        const sigResponse = await fetch("/api/upload-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: "reviews" }),
        });

        if (!sigResponse.ok) throw new Error("Could not start the upload");

        const sig = await sigResponse.json();
        const form = new FormData();
        form.append("file", file);
        form.append("api_key", sig.apiKey);
        form.append("timestamp", String(sig.timestamp));
        form.append("folder", sig.folder);
        form.append("signature", sig.signature);

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
          { method: "POST", body: form },
        );

        if (!uploadResponse.ok) throw new Error("Upload failed");

        const data = await uploadResponse.json();
        uploaded.push({ public_id: data.public_id, url: data.secure_url });
      }

      setPhotos((prev) => [...prev, ...uploaded]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function submit(formData: FormData) {
    setError(null);

    if (rating === 0) {
      setError("Please choose a rating");
      return;
    }

    startTransition(async () => {
      const result = await submitReviewAction({
        token,
        rating,
        reviewerName: String(formData.get("reviewerName") ?? ""),
        title: String(formData.get("title") ?? ""),
        body: String(formData.get("body") ?? ""),
        images: photos,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="border border-line bg-surface px-6 py-12 text-center">
        <h2 className="font-serif text-2xl">Thank you</h2>
        <p className="mx-auto mt-4 max-w-sm text-sm text-ink-muted">
          Your review has been received. We check every review before it appears
          on the site, so it may take a day or two to show up.
        </p>
        <Link href="/shop" className={`${buttonVariants()} mt-8`}>
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-7">
      {productImage ? (
        <div className="flex items-center gap-4 border border-line bg-surface p-4">
          <div className="relative size-16 shrink-0 overflow-hidden bg-accent-soft">
            <Image
              src={productImage}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
          <p className="text-sm font-medium">{productName}</p>
        </div>
      ) : null}

      {/* Rating */}
      <fieldset>
        <legend className="label-caps">
          Your rating <span className="text-sale">*</span>
        </legend>
        <div
          className="mt-3 flex gap-1"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              aria-pressed={rating === star}
              className="p-1 transition-transform hover:scale-110"
            >
              <svg
                viewBox="0 0 20 20"
                className={
                  star <= (hovered || rating) ? "size-8 fill-ink" : "size-8 fill-line"
                }
                aria-hidden="true"
              >
                <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.1l-4.94 2.6.94-5.5-4-3.9 5.53-.8z" />
              </svg>
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Your name" htmlFor="reviewerName" required>
        <Input
          id="reviewerName"
          name="reviewerName"
          defaultValue={defaultName}
          required
          maxLength={80}
        />
      </Field>

      <Field label="Title" htmlFor="title" hint="Optional">
        <Input id="title" name="title" maxLength={120} />
      </Field>

      <Field
        label="Your review"
        htmlFor="body"
        hint="How is the fit, the fabric, the colour?"
      >
        <Textarea id="body" name="body" rows={5} maxLength={2000} />
      </Field>

      {/* Photos */}
      {cloudinaryReady ? (
        <div>
          <p className="label-caps">Photos</p>
          <p className="mt-1 text-xs text-ink-muted">
            Up to {MAX_PHOTOS}. Photos from real customers help other people
            more than anything else on the page.
          </p>

          {photos.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {photos.map((photo, index) => (
                <li key={photo.public_id} className="relative size-20">
                  <Image
                    src={photo.url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPhotos((prev) => prev.filter((_, i) => i !== index))
                    }
                    aria-label="Remove photo"
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-1 text-paper"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED.join(",")}
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            id="review-photos"
          />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={uploading || photos.length >= MAX_PHOTOS}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <ImagePlus className="size-4" /> Add photos
              </>
            )}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="border border-sale/30 bg-sale/5 px-3 py-2.5 text-xs text-sale"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" full size="lg" disabled={pending || uploading}>
        {pending ? "Sending…" : "Submit review"}
      </Button>

      <p className="text-xs leading-relaxed text-ink-muted">
        By submitting you agree that your review, name and any photos may be
        shown publicly on this website.
      </p>
    </form>
  );
}
