"use client";

import Image from "next/image";
import { useState } from "react";
import { X, ZoomIn } from "lucide-react";

import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  productName,
}: {
  images: { url: string; alt: string }[];
  productName: string;
}) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (images.length === 0) {
    return (
      <div className="ratio-product flex items-center justify-center">
        <span className="label-caps-sm text-ink-muted/60">No image</span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <>
      <div className="flex gap-3 lg:gap-4">
        {/* Thumbnail rail — desktop */}
        {images.length > 1 ? (
          <div className="hidden w-16 shrink-0 flex-col gap-2 lg:flex">
            {images.map((image, index) => (
              <button
                key={image.url}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View image ${index + 1} of ${images.length}`}
                aria-current={index === active}
                className={cn(
                  "ratio-product relative w-full border transition-colors",
                  index === active ? "border-ink" : "border-transparent hover:border-line",
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}

        {/* Main image */}
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="Zoom image"
            className="group ratio-product relative block w-full cursor-zoom-in"
          >
            <Image
              src={current.url}
              alt={current.alt || productName}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
            <span className="absolute bottom-3 right-3 hidden rounded-full bg-paper/90 p-2 opacity-0 transition-opacity group-hover:opacity-100 lg:block">
              <ZoomIn className="size-4" strokeWidth={1.5} />
            </span>
          </button>

          {/* Dots — mobile */}
          {images.length > 1 ? (
            <div className="mt-3 flex justify-center gap-1.5 lg:hidden">
              {images.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Go to image ${index + 1}`}
                  aria-current={index === active}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    index === active ? "bg-ink" : "bg-line",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Zoom lightbox */}
      {zoomed ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-paper"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} enlarged`}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close"
            className="absolute right-5 top-5 z-10 p-2"
          >
            <X className="size-6" strokeWidth={1.5} />
          </button>

          <div className="relative h-full w-full">
            <Image
              src={current.url}
              alt={current.alt || productName}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {images.length > 1 ? (
            <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
              {images.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`View image ${index + 1}`}
                  className={cn(
                    "relative size-14 border transition-colors",
                    index === active ? "border-ink" : "border-line",
                  )}
                >
                  <Image src={image.url} alt="" fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
