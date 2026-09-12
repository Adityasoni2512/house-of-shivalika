import { z } from "zod";

/*
 * Shared between client and server. The same schema validates the form in the
 * browser and again inside the server action — client validation is a courtesy,
 * never a control.
 */

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugField = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120, "Slug is too long")
  .regex(slugRegex, "Use lowercase letters, numbers and hyphens only");

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const money = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "string" ? v.trim() : v))
  .transform((v) => (v === "" ? null : Number(v)))
  .nullable()
  .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), {
    message: "Enter a valid amount",
  });

/* -------------------------------------------------------------------------- */
/* Sizes                                                                      */
/* -------------------------------------------------------------------------- */

export const sizeSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(20, "Keep size labels short"),
  position: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export type SizeInput = z.infer<typeof sizeSchema>;

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: slugField,
  parent_id: z
    .string()
    .trim()
    .transform((v) => (v === "" || v === "none" ? null : v))
    .nullable(),
  description: optionalText,
  image_url: optionalText,
  position: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  show_in_nav: z.boolean().default(true),
  seo_title: optionalText,
  seo_description: optionalText,
});

export type CategoryInput = z.infer<typeof categorySchema>;

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

export const productImageSchema = z.object({
  public_id: z.string().min(1),
  url: z.string().url(),
  alt_text: z.string().trim().max(160).nullable().optional(),
  position: z.number().int().min(0),
});

export const productVariantSchema = z.object({
  size_id: z.string().uuid(),
  stock_qty: z.coerce.number().int().min(0, "Stock cannot be negative"),
  sku: optionalText.optional(),
  is_active: z.boolean().default(true),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(160),
    slug: slugField,
    sku: z.string().trim().min(1, "SKU is required").max(60),
    category_id: z.string().uuid("Choose a category"),
    price: z.coerce.number().min(0, "Price is required"),
    mrp: money,

    short_description: optionalText,
    description: optionalText,
    colour_name: optionalText,
    colour_hex: optionalText,
    fabric: optionalText,
    care: optionalText,
    occasion: optionalText,

    attributes: z.record(z.string(), z.string()).default({}),

    status: z.enum(["draft", "active", "archived"]).default("draft"),
    is_featured: z.boolean().default(false),

    seo_title: optionalText,
    seo_description: optionalText,

    images: z.array(productImageSchema).default([]),
    variants: z.array(productVariantSchema).default([]),
  })
  .refine((d) => d.mrp === null || d.mrp >= d.price, {
    message: "MRP cannot be lower than the selling price",
    path: ["mrp"],
  })
  .refine((d) => d.status !== "active" || d.images.length > 0, {
    message: "Add at least one image before making a product active",
    path: ["images"],
  })
  .refine((d) => d.status !== "active" || d.variants.length > 0, {
    message: "Select at least one size before making a product active",
    path: ["variants"],
  });

export type ProductInput = z.infer<typeof productSchema>;

/* -------------------------------------------------------------------------- */
/* Stock                                                                      */
/* -------------------------------------------------------------------------- */

export const stockUpdateSchema = z.object({
  variant_id: z.string().uuid(),
  stock_qty: z.coerce.number().int().min(0, "Stock cannot be negative"),
});

/* -------------------------------------------------------------------------- */
/* Banners                                                                    */
/* -------------------------------------------------------------------------- */

export const bannerSchema = z.object({
  title: optionalText,
  subtitle: optionalText,
  image_desktop: z.string().url("A desktop image is required"),
  image_mobile: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  cta_label: optionalText,
  cta_url: optionalText,
  position: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  starts_at: optionalText,
  ends_at: optionalText,
});

export type BannerInput = z.infer<typeof bannerSchema>;

/* -------------------------------------------------------------------------- */
/* Pages                                                                      */
/* -------------------------------------------------------------------------- */

export const pageSchema = z.object({
  slug: slugField,
  title: z.string().trim().min(1, "Title is required").max(120),
  body: z.string().default(""),
  seo_title: optionalText,
  seo_description: optionalText,
  is_published: z.boolean().default(true),
});

export type PageInput = z.infer<typeof pageSchema>;
