"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardHeader } from "@/components/admin/shell";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { saveProductAction } from "@/lib/actions/products";
import { discountPercent, formatPrice, slugify } from "@/lib/utils";

export type SizeOption = { id: string; label: string };
export type CategoryOption = { id: string; name: string; depth: number };

export type ProductFormValues = {
  id: string | null;
  name: string;
  slug: string;
  sku: string;
  category_id: string;
  price: string;
  mrp: string;
  short_description: string;
  description: string;
  colour_name: string;
  colour_hex: string;
  fabric: string;
  care: string;
  occasion: string;
  attributes: Record<string, string>;
  status: "draft" | "active" | "archived";
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
  images: UploadedImage[];
  variants: { size_id: string; stock_qty: string; is_active: boolean }[];
};

export function ProductForm({
  initial,
  categories,
  sizes,
  cloudinaryReady,
}: {
  initial: ProductFormValues;
  categories: CategoryOption[];
  sizes: SizeOption[];
  cloudinaryReady: boolean;
}) {
  const router = useRouter();
  const isEdit = initial.id !== null;

  const [values, setValues] = useState<ProductFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  /* ---- sizes ---------------------------------------------------------- */

  const selectedSizeIds = new Set(values.variants.map((v) => v.size_id));

  function toggleSize(sizeId: string) {
    if (selectedSizeIds.has(sizeId)) {
      set(
        "variants",
        values.variants.filter((v) => v.size_id !== sizeId),
      );
    } else {
      set("variants", [
        ...values.variants,
        { size_id: sizeId, stock_qty: "0", is_active: true },
      ]);
    }
  }

  function setStock(sizeId: string, stock: string) {
    set(
      "variants",
      values.variants.map((v) =>
        v.size_id === sizeId ? { ...v, stock_qty: stock } : v,
      ),
    );
  }

  /* ---- custom attributes ---------------------------------------------- */

  const attributeEntries = Object.entries(values.attributes);

  function addAttribute() {
    set("attributes", { ...values.attributes, "": "" });
  }

  function updateAttribute(oldKey: string, newKey: string, value: string) {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(values.attributes)) {
      if (k === oldKey) next[newKey] = value;
      else next[k] = v;
    }
    set("attributes", next);
  }

  function removeAttribute(key: string) {
    const next = { ...values.attributes };
    delete next[key];
    set("attributes", next);
  }

  /* ---- submit --------------------------------------------------------- */

  function submit() {
    setError(null);

    const payload = {
      ...values,
      price: values.price,
      mrp: values.mrp,
      attributes: Object.fromEntries(
        Object.entries(values.attributes).filter(([k]) => k.trim() !== ""),
      ),
      variants: values.variants.map((v) => ({
        size_id: v.size_id,
        stock_qty: v.stock_qty,
        is_active: v.is_active,
      })),
      images: values.images.map((img, index) => ({ ...img, position: index })),
    };

    startTransition(async () => {
      const result = await saveProductAction(values.id, payload);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Product saved" : "Product created");

      if (!isEdit && result.id) router.push(`/admin/products/${result.id}`);
      else router.refresh();
    });
  }

  const priceNumber = Number(values.price) || 0;
  const mrpNumber = values.mrp === "" ? null : Number(values.mrp);
  const discount = discountPercent(mrpNumber, priceNumber);
  const totalStock = values.variants.reduce(
    (sum, v) => sum + (Number(v.stock_qty) || 0),
    0,
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-5 xl:grid-cols-[1fr_22rem]"
    >
      <div className="space-y-5">
        {/* ---- Basics ---- */}
        <Card>
          <CardHeader title="Basics" />
          <div className="space-y-4 p-5">
            <Field label="Product name" htmlFor="name" required>
              <Input
                id="name"
                value={values.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
                required
                maxLength={160}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Slug"
                htmlFor="slug"
                required
                hint={`/product/${values.slug || "…"}`}
              >
                <Input
                  id="slug"
                  value={values.slug}
                  onChange={(e) => {
                    set("slug", e.target.value);
                    setSlugTouched(true);
                  }}
                  onBlur={(e) => set("slug", slugify(e.target.value))}
                  required
                />
              </Field>

              <Field label="SKU" htmlFor="sku" required hint="e.g. HOS-1001">
                <Input
                  id="sku"
                  value={values.sku}
                  onChange={(e) => set("sku", e.target.value.toUpperCase())}
                  required
                  className="font-mono"
                />
              </Field>
            </div>

            <Field label="Category" htmlFor="category_id" required>
              <Select
                id="category_id"
                value={values.category_id}
                onChange={(e) => set("category_id", e.target.value)}
                required
              >
                <option value="">Choose a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {"— ".repeat(c.depth)}
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Short description"
              htmlFor="short_description"
              hint="One or two lines. Used as the meta description if no SEO override is set."
            >
              <Textarea
                id="short_description"
                value={values.short_description}
                onChange={(e) => set("short_description", e.target.value)}
                rows={2}
                maxLength={300}
              />
            </Field>

            <Field label="Full description" htmlFor="description">
              <Textarea
                id="description"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                rows={6}
              />
            </Field>
          </div>
        </Card>

        {/* ---- Pricing ---- */}
        <Card>
          <CardHeader title="Pricing" />
          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Selling price" htmlFor="price" required hint="Incl. GST">
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.price}
                  onChange={(e) => set("price", e.target.value)}
                  required
                  className="tabular-nums"
                />
              </Field>

              <Field label="MRP" htmlFor="mrp" hint="Shown struck through">
                <Input
                  id="mrp"
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.mrp}
                  onChange={(e) => set("mrp", e.target.value)}
                  className="tabular-nums"
                />
              </Field>

              <div className="flex items-end pb-1">
                {discount ? (
                  <p className="text-sm">
                    <span className="text-sale">−{discount}%</span>
                    <span className="ml-2 text-ink-muted line-through">
                      {formatPrice(mrpNumber)}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-ink-muted">
                    Set an MRP above the price to show a discount badge.
                  </p>
                )}
              </div>
            </div>

            {mrpNumber !== null && mrpNumber > 0 && mrpNumber < priceNumber ? (
              <p className="mt-3 text-xs text-sale">
                MRP is below the selling price — this will not save.
              </p>
            ) : null}
          </div>
        </Card>

        {/* ---- Images ---- */}
        <Card>
          <CardHeader title="Images" />
          <div className="p-5">
            <ImageUploader
              images={values.images}
              onChange={(images) => set("images", images)}
              folder="products"
              max={8}
              cloudinaryReady={cloudinaryReady}
            />
          </div>
        </Card>

        {/* ---- Sizes & stock ---- */}
        <Card>
          <CardHeader
            title="Sizes & stock"
            action={
              <span className="text-xs text-ink-muted">
                {totalStock} in stock across {values.variants.length} size
                {values.variants.length === 1 ? "" : "s"}
              </span>
            }
          />
          <div className="p-5">
            {sizes.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No sizes in the library yet. Add them under Sizes first.
              </p>
            ) : (
              <div className="space-y-2">
                {sizes.map((size) => {
                  const variant = values.variants.find((v) => v.size_id === size.id);
                  const selected = Boolean(variant);

                  return (
                    <div
                      key={size.id}
                      className="flex items-center gap-3 border border-line px-3 py-2"
                    >
                      <label className="flex flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSize(size.id)}
                          className="size-4 accent-[var(--color-ink)]"
                        />
                        <span className="label-caps w-16">{size.label}</span>
                      </label>

                      {selected ? (
                        <label className="flex items-center gap-2">
                          <span className="text-xs text-ink-muted">Stock</span>
                          <Input
                            type="number"
                            min={0}
                            value={variant?.stock_qty ?? "0"}
                            onChange={(e) => setStock(size.id, e.target.value)}
                            className="h-9 w-24 tabular-nums"
                            aria-label={`Stock for size ${size.label}`}
                          />
                        </label>
                      ) : (
                        <span className="text-xs text-ink-muted">Not stocked</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="mt-4 text-xs text-ink-muted">
              Stock is decremented by hand after each WhatsApp order — there is no
              checkout to do it automatically. The Stock screen is the fast way to
              do this daily.
            </p>
          </div>
        </Card>

        {/* ---- Details ---- */}
        <Card>
          <CardHeader title="Details" />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Colour name"
                htmlFor="colour_name"
                hint="Each colourway is a separate product"
              >
                <Input
                  id="colour_name"
                  value={values.colour_name}
                  onChange={(e) => set("colour_name", e.target.value)}
                />
              </Field>

              <Field
                label="Colour swatch"
                htmlFor="colour_hex"
                hint="Used by the colour filter"
              >
                <div className="flex gap-2">
                  <Input
                    id="colour_hex"
                    value={values.colour_hex}
                    onChange={(e) => set("colour_hex", e.target.value)}
                    placeholder="#8f6551"
                    className="font-mono"
                  />
                  <input
                    type="color"
                    value={values.colour_hex || "#8f6551"}
                    onChange={(e) => set("colour_hex", e.target.value)}
                    aria-label="Pick colour"
                    className="h-11 w-12 cursor-pointer border border-line bg-surface p-1"
                  />
                </div>
              </Field>
            </div>

            <Field label="Fabric" htmlFor="fabric">
              <Input
                id="fabric"
                value={values.fabric}
                onChange={(e) => set("fabric", e.target.value)}
              />
            </Field>

            <Field label="Care instructions" htmlFor="care">
              <Textarea
                id="care"
                value={values.care}
                onChange={(e) => set("care", e.target.value)}
                rows={2}
              />
            </Field>

            <Field label="Occasion" htmlFor="occasion">
              <Input
                id="occasion"
                value={values.occasion}
                onChange={(e) => set("occasion", e.target.value)}
              />
            </Field>

            {/* Escape hatch for fields added later without a migration. */}
            <div className="border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <p className="label-caps text-ink">Custom fields</p>
                <Button type="button" size="sm" variant="ghost" onClick={addAttribute}>
                  <Plus className="size-4" /> Add
                </Button>
              </div>

              {attributeEntries.length === 0 ? (
                <p className="mt-2 text-xs text-ink-muted">
                  Anything not covered above — sleeve length, neckline, work type.
                  These appear in the product details accordion.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {attributeEntries.map(([key, value], index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={key}
                        onChange={(e) => updateAttribute(key, e.target.value, value)}
                        placeholder="Label"
                        className="h-9 flex-1"
                        aria-label="Custom field label"
                      />
                      <Input
                        value={value}
                        onChange={(e) => updateAttribute(key, key, e.target.value)}
                        placeholder="Value"
                        className="h-9 flex-1"
                        aria-label="Custom field value"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeAttribute(key)}
                        aria-label="Remove custom field"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ---- Sidebar ---- */}
      <div className="space-y-5">
        <Card className="xl:sticky xl:top-6">
          <CardHeader title="Publish" />
          <div className="space-y-4 p-5">
            <Field label="Status" htmlFor="status">
              <Select
                id="status"
                value={values.status}
                onChange={(e) =>
                  set("status", e.target.value as ProductFormValues["status"])
                }
              >
                <option value="draft">Draft — not on the site</option>
                <option value="active">Active — live</option>
                <option value="archived">Archived — hidden</option>
              </Select>
            </Field>

            {values.status === "active" &&
            (values.images.length === 0 || values.variants.length === 0) ? (
              <p className="border border-sale/30 bg-sale/5 px-3 py-2 text-xs text-sale">
                An active product needs at least one image and one size.
              </p>
            ) : null}

            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={values.is_featured}
                onChange={(e) => set("is_featured", e.target.checked)}
                className="size-4 accent-[var(--color-ink)]"
              />
              Feature on the homepage
            </label>

            {error ? (
              <p role="alert" className="border border-sale/30 bg-sale/5 px-3 py-2 text-xs text-sale">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-line pt-4">
              <Button type="submit" full disabled={pending}>
                {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                full
                onClick={() => router.push("/admin/products")}
              >
                Back to products
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="SEO" />
          <div className="space-y-4 p-5">
            <Field
              label="Page title"
              htmlFor="seo_title"
              hint="Defaults to the product name"
            >
              <Input
                id="seo_title"
                value={values.seo_title}
                onChange={(e) => set("seo_title", e.target.value)}
                maxLength={70}
              />
            </Field>

            <Field
              label="Meta description"
              htmlFor="seo_description"
              hint="Defaults to the short description. Around 155 characters."
            >
              <Textarea
                id="seo_description"
                value={values.seo_description}
                onChange={(e) => set("seo_description", e.target.value)}
                rows={3}
                maxLength={200}
              />
            </Field>
          </div>
        </Card>
      </div>
    </form>
  );
}
