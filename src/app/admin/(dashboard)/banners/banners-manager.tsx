"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState } from "@/components/admin/shell";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  deleteBannerAction,
  saveBannerAction,
  toggleBannerAction,
} from "@/lib/actions/content";
import { formatDate } from "@/lib/utils";

export type BannerRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageDesktop: string;
  imageMobile: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  position: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export function BannersManager({
  banners,
  cloudinaryReady,
}: {
  banners: BannerRow[];
  cloudinaryReady: boolean;
}) {
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle(banner: BannerRow) {
    startTransition(async () => {
      const result = await toggleBannerAction(banner.id, !banner.isActive);
      if (result.error) toast.error(result.error);
      else toast.success(banner.isActive ? "Deactivated" : "Activated");
    });
  }

  function remove(banner: BannerRow) {
    if (!confirm("Delete this banner? This cannot be undone.")) return;

    startTransition(async () => {
      const result = await deleteBannerAction(banner.id);
      if (result.error) toast.error(result.error);
      else toast.success("Banner deleted");
    });
  }

  if (creating || editing) {
    return (
      <BannerForm
        banner={editing}
        nextPosition={banners.length + 1}
        cloudinaryReady={cloudinaryReady}
        onDone={() => {
          setEditing(null);
          setCreating(false);
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title={`${banners.length} banners`}
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New banner
          </Button>
        }
      />

      {banners.length === 0 ? (
        <EmptyState
          title="No banners yet"
          description="Without a banner the homepage shows a clean typographic hero instead — which looks deliberate, not broken."
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              Create the first banner
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {banners.map((banner) => (
            <li
              key={banner.id}
              className={`flex flex-wrap items-center gap-4 p-5 ${pending ? "opacity-60" : ""}`}
            >
              <div className="relative h-16 w-32 shrink-0 overflow-hidden bg-accent-soft">
                <Image
                  src={banner.imageDesktop}
                  alt=""
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {banner.title ?? (
                    <span className="text-ink-muted">Untitled banner</span>
                  )}
                </p>
                {banner.subtitle ? (
                  <p className="text-xs text-ink-muted">{banner.subtitle}</p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant={banner.isActive ? "success" : "muted"}>
                    {banner.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {banner.startsAt || banner.endsAt ? (
                    <span className="text-xs text-ink-muted">
                      {banner.startsAt ? formatDate(banner.startsAt) : "—"} →{" "}
                      {banner.endsAt ? formatDate(banner.endsAt) : "—"}
                    </span>
                  ) : null}
                  {banner.ctaLabel ? (
                    <span className="text-xs text-ink-muted">
                      CTA: {banner.ctaLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => toggle(banner)}>
                  {banner.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditing(banner)}
                  aria-label="Edit banner"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(banner)}
                  aria-label="Delete banner"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function BannerForm({
  banner,
  nextPosition,
  cloudinaryReady,
  onDone,
}: {
  banner: BannerRow | null;
  nextPosition: number;
  cloudinaryReady: boolean;
  onDone: () => void;
}) {
  const isEdit = banner !== null;

  const [desktop, setDesktop] = useState<UploadedImage[]>(
    banner?.imageDesktop
      ? [{ public_id: "existing-desktop", url: banner.imageDesktop, alt_text: null, position: 0 }]
      : [],
  );
  const [mobile, setMobile] = useState<UploadedImage[]>(
    banner?.imageMobile
      ? [{ public_id: "existing-mobile", url: banner.imageMobile, alt_text: null, position: 0 }]
      : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);

    if (desktop.length === 0) {
      setError("A desktop image is required");
      return;
    }

    startTransition(async () => {
      const result = await saveBannerAction(banner?.id ?? null, {
        title: String(formData.get("title") ?? ""),
        subtitle: String(formData.get("subtitle") ?? ""),
        image_desktop: desktop[0].url,
        image_mobile: mobile[0]?.url ?? "",
        cta_label: String(formData.get("cta_label") ?? ""),
        cta_url: String(formData.get("cta_url") ?? ""),
        position: String(formData.get("position") ?? nextPosition),
        is_active: formData.get("is_active") === "on",
        starts_at: String(formData.get("starts_at") ?? ""),
        ends_at: String(formData.get("ends_at") ?? ""),
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Banner saved" : "Banner created");
      onDone();
    });
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader title={isEdit ? "Edit banner" : "New banner"} />

      <form action={submit} className="space-y-5 p-5">
        <div>
          <p className="label-caps">Desktop image</p>
          <p className="mt-1 text-xs text-ink-muted">
            Wide crop, around 2400×1000px.
          </p>
          <div className="mt-3">
            <ImageUploader
              images={desktop}
              onChange={setDesktop}
              folder="banners"
              max={1}
              aspect="landscape"
              cloudinaryReady={cloudinaryReady}
            />
          </div>
        </div>

        <div>
          <p className="label-caps">Mobile image</p>
          <p className="mt-1 text-xs text-ink-muted">
            Optional. Taller crop, around 1200×1500px. Falls back to the desktop
            image.
          </p>
          <div className="mt-3">
            <ImageUploader
              images={mobile}
              onChange={setMobile}
              folder="banners"
              max={1}
              cloudinaryReady={cloudinaryReady}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Headline" htmlFor="title">
            <Input id="title" name="title" defaultValue={banner?.title ?? ""} />
          </Field>

          <Field label="Eyebrow" htmlFor="subtitle" hint="Small text above">
            <Input
              id="subtitle"
              name="subtitle"
              defaultValue={banner?.subtitle ?? ""}
            />
          </Field>

          <Field label="Button label" htmlFor="cta_label">
            <Input
              id="cta_label"
              name="cta_label"
              defaultValue={banner?.ctaLabel ?? ""}
              placeholder="Shop now"
            />
          </Field>

          <Field label="Button link" htmlFor="cta_url">
            <Input
              id="cta_url"
              name="cta_url"
              defaultValue={banner?.ctaUrl ?? ""}
              placeholder="/shop"
            />
          </Field>

          <Field label="Starts" htmlFor="starts_at" hint="Optional">
            <Input
              id="starts_at"
              name="starts_at"
              type="date"
              defaultValue={banner?.startsAt?.slice(0, 10) ?? ""}
            />
          </Field>

          <Field label="Ends" htmlFor="ends_at" hint="Optional">
            <Input
              id="ends_at"
              name="ends_at"
              type="date"
              defaultValue={banner?.endsAt?.slice(0, 10) ?? ""}
            />
          </Field>

          <Field label="Position" htmlFor="position" hint="Lower shows first">
            <Input
              id="position"
              name="position"
              type="number"
              min={0}
              defaultValue={banner?.position ?? nextPosition}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={banner?.isActive ?? true}
            className="size-4 accent-[var(--color-ink)]"
          />
          Active
        </label>

        {error ? (
          <p role="alert" className="border border-sale/30 bg-sale/5 px-3 py-2 text-xs text-sale">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save banner" : "Create banner"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
