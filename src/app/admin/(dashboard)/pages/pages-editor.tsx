"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/admin/shell";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { savePageAction } from "@/lib/actions/content";
import { cn, formatDateTime } from "@/lib/utils";

export type PageRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  updatedAt: string;
};

/** Pages that are legal commitments and must be read before launch. */
const NEEDS_REVIEW = new Set(["shipping", "returns", "privacy", "terms"]);

export function PagesEditor({ pages }: { pages: PageRow[] }) {
  const [activeSlug, setActiveSlug] = useState(pages[0]?.slug ?? "");
  const active = pages.find((p) => p.slug === activeSlug) ?? pages[0];

  if (!active) {
    return (
      <Card>
        <p className="p-8 text-center text-sm text-ink-muted">
          No pages found. Re-run the seed migration.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[14rem_1fr]">
      <nav aria-label="Pages">
        <ul className="space-y-0.5">
          {pages.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => setActiveSlug(page.slug)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xs px-3 py-2.5 text-left text-sm transition-colors",
                  page.slug === active.slug
                    ? "bg-ink text-paper"
                    : "text-ink-muted hover:bg-accent-soft hover:text-ink",
                )}
              >
                <span className="truncate">{page.title}</span>
                {!page.isPublished ? (
                  <span className="label-caps-sm shrink-0 opacity-70">Draft</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <PageForm key={active.id} page={active} />
    </div>
  );
}

function PageForm({ page }: { page: PageRow }) {
  const [body, setBody] = useState(page.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await savePageAction(page.id, {
        slug: page.slug,
        title: String(formData.get("title") ?? ""),
        body,
        seo_title: String(formData.get("seo_title") ?? ""),
        seo_description: String(formData.get("seo_description") ?? ""),
        is_published: formData.get("is_published") === "on",
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Page saved");
    });
  }

  return (
    <Card>
      <CardHeader
        title={page.title}
        action={
          <Link
            href={`/${page.slug}`}
            target="_blank"
            rel="noreferrer"
            className="label-caps-sm inline-flex items-center gap-1.5 text-accent"
          >
            View <ExternalLink className="size-3.5" />
          </Link>
        }
      />

      <form action={submit} className="space-y-5 p-5">
        {NEEDS_REVIEW.has(page.slug) ? (
          <p className="border border-[#8a6d3b]/30 bg-[#8a6d3b]/5 px-3 py-2.5 text-xs text-[#8a6d3b]">
            This page is a commitment to customers. Read it carefully and confirm
            the terms are ones you can actually honour before launch.
          </p>
        ) : null}

        <Field label="Title" htmlFor="title" required>
          <Input id="title" name="title" defaultValue={page.title} required />
        </Field>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="body" className="label-caps">
              Content
            </label>
            <span className="text-xs text-ink-muted">
              Markdown · {body.length} characters
            </span>
          </div>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={22}
            className="mt-2 font-mono text-xs leading-relaxed"
          />
          <p className="mt-2 text-xs text-ink-muted">
            <code>## Heading</code> · <code>**bold**</code> ·{" "}
            <code>- list item</code> · <code>[link](/shop)</code> · tables
            supported
          </p>
        </div>

        <details className="border-t border-line pt-4">
          <summary className="label-caps cursor-pointer text-ink-muted">
            SEO
          </summary>
          <div className="mt-4 space-y-4">
            <Field
              label="Page title"
              htmlFor="seo_title"
              hint="Defaults to the title above"
            >
              <Input
                id="seo_title"
                name="seo_title"
                defaultValue={page.seoTitle ?? ""}
                maxLength={70}
              />
            </Field>

            <Field label="Meta description" htmlFor="seo_description">
              <Textarea
                id="seo_description"
                name="seo_description"
                rows={2}
                defaultValue={page.seoDescription ?? ""}
                maxLength={200}
              />
            </Field>
          </div>
        </details>

        <label className="flex items-center gap-2.5 border-t border-line pt-4 text-sm">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={page.isPublished}
            className="size-4 accent-[var(--color-ink)]"
          />
          Published
        </label>

        {error ? (
          <p role="alert" className="border border-sale/30 bg-sale/5 px-3 py-2 text-xs text-sale">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3 border-t border-line pt-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save page"}
          </Button>
          <span className="text-xs text-ink-muted">
            Last saved {formatDateTime(page.updatedAt)}
          </span>
        </div>
      </form>
    </Card>
  );
}
