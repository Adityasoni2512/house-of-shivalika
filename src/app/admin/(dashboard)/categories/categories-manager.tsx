"use client";

import { useState, useTransition } from "react";
import { CornerDownRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, Table, Td, Th } from "@/components/admin/shell";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/lib/actions/categories";
import { slugify } from "@/lib/utils";

export type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  position: number;
  is_active: boolean;
  show_in_nav: boolean;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  depth: number;
  path: string[];
  childCount: number;
  productCount: number;
};

export function CategoriesManager({
  categories,
}: {
  categories: CategoryListItem[];
}) {
  const [editing, setEditing] = useState<CategoryListItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove(category: CategoryListItem) {
    if (!confirm(`Delete "${category.name}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (result.error) toast.error(result.error);
      else toast.success("Category deleted");
    });
  }

  const showForm = creating || editing !== null;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
      <Card>
        <CardHeader
          title={`${categories.length} categories`}
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
            >
              <Plus className="size-4" /> New
            </Button>
          }
        />

        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Create your top-level categories first, then nest subcategories underneath."
            action={
              <Button size="sm" onClick={() => setCreating(true)}>
                Create the first category
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>URL</Th>
                <Th className="text-right">Products</Th>
                <Th>Nav</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className={pending ? "opacity-60" : undefined}>
                  <Td>
                    <span
                      className="flex items-center gap-1.5"
                      style={{ paddingLeft: `${category.depth * 1.25}rem` }}
                    >
                      {category.depth > 0 ? (
                        <CornerDownRight
                          className="size-3.5 shrink-0 text-ink-muted"
                          aria-hidden
                        />
                      ) : null}
                      <span className="font-medium">{category.name}</span>
                    </span>
                  </Td>

                  <Td className="font-mono text-xs text-ink-muted">
                    /shop/{category.path.join("/")}
                  </Td>

                  <Td className="text-right tabular-nums">
                    {category.productCount || "—"}
                  </Td>

                  <Td>
                    {category.show_in_nav ? (
                      <Badge variant="neutral">Shown</Badge>
                    ) : (
                      <Badge variant="muted">Hidden</Badge>
                    )}
                  </Td>

                  <Td>
                    <Badge variant={category.is_active ? "success" : "muted"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Td>

                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => {
                          setCreating(false);
                          setEditing(category);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => remove(category)}
                        disabled={
                          pending ||
                          category.childCount > 0 ||
                          category.productCount > 0
                        }
                        title={
                          category.childCount > 0
                            ? "Has subcategories"
                            : category.productCount > 0
                              ? "Has products"
                              : "Delete category"
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {showForm ? (
        <CategoryForm
          key={editing?.id ?? "new"}
          category={editing}
          categories={categories}
          onDone={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      ) : (
        <Card className="h-fit">
          <CardHeader title="Category tree" />
          <div className="space-y-3 p-5 text-xs text-ink-muted">
            <p>
              Categories nest without limit. A child of <em>Kurtas</em> called{" "}
              <em>Cotton</em> lives at <code>/shop/kurtas/cotton</code>.
            </p>
            <p>
              This is also how menswear arrives later: add a top-level{" "}
              <em>Men</em> category and nothing that already exists changes URL.
            </p>
            <p>
              A category with products or subcategories cannot be deleted.
              Deactivate it instead — it disappears from the site but nothing
              breaks.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function CategoryForm({
  category,
  categories,
  onDone,
}: {
  category: CategoryListItem | null;
  categories: CategoryListItem[];
  onDone: () => void;
}) {
  const isEdit = category !== null;
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Cannot parent to self or to a descendant — the server enforces this too.
  const parentOptions = categories.filter((c) => {
    if (!category) return true;
    if (c.id === category.id) return false;
    return !c.path.slice(0, -1).includes(category.slug);
  });

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateCategoryAction(category.id, {}, formData)
        : await createCategoryAction({}, formData);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(isEdit ? "Category updated" : "Category created");
        onDone();
      }
    });
  }

  return (
    <Card className="h-fit">
      <CardHeader title={isEdit ? "Edit category" : "New category"} />

      <form action={handleSubmit} className="space-y-4 p-5">
        <Field label="Name" htmlFor="name" required>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            required
            maxLength={80}
          />
        </Field>

        <Field
          label="Slug"
          htmlFor="slug"
          required
          hint={`/shop/${slug || "…"}`}
        >
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            onBlur={(e) => setSlug(slugify(e.target.value))}
            required
          />
        </Field>

        <Field label="Parent" htmlFor="parent_id">
          <Select
            id="parent_id"
            name="parent_id"
            defaultValue={category?.parent_id ?? "none"}
          >
            <option value="none">No parent (top level)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(c.depth)}
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={category?.description ?? ""}
          />
        </Field>

        <Field
          label="Tile image URL"
          htmlFor="image_url"
          hint="Used on the homepage category tiles"
        >
          <Input
            id="image_url"
            name="image_url"
            defaultValue={category?.image_url ?? ""}
          />
        </Field>

        <Field label="Position" htmlFor="position" hint="Lower numbers first">
          <Input
            id="position"
            name="position"
            type="number"
            min={0}
            defaultValue={category?.position ?? 0}
          />
        </Field>

        <div className="space-y-2.5 border-t border-line pt-4">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={category?.is_active ?? true}
              className="size-4 accent-[var(--color-ink)]"
            />
            Active
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="show_in_nav"
              defaultChecked={category?.show_in_nav ?? true}
              className="size-4 accent-[var(--color-ink)]"
            />
            Show in main navigation
          </label>
        </div>

        <details className="border-t border-line pt-4">
          <summary className="label-caps cursor-pointer text-ink-muted">
            SEO overrides
          </summary>
          <div className="mt-4 space-y-4">
            <Field label="SEO title" htmlFor="seo_title">
              <Input
                id="seo_title"
                name="seo_title"
                defaultValue={category?.seo_title ?? ""}
              />
            </Field>
            <Field label="Meta description" htmlFor="seo_description">
              <Textarea
                id="seo_description"
                name="seo_description"
                rows={2}
                defaultValue={category?.seo_description ?? ""}
              />
            </Field>
          </div>
        </details>

        {error ? (
          <p role="alert" className="text-xs text-sale">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
