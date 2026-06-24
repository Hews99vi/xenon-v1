import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a URL-safe slug."),
  description: z.string().trim().optional(),
  isActive: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().min(0, "Sort order cannot be negative."),
});

export const productStatusSchema = z.enum([
  "draft",
  "active",
  "out_of_stock",
  "archived",
]);

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters."),
    slug: z
      .string()
      .trim()
      .min(2, "Slug is required.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a URL-safe slug."),
    description: z.string().trim().optional(),
    shortDescription: z.string().trim().optional(),
    basePrice: z.coerce.number().min(0, "Price cannot be negative."),
    salePrice: z.coerce.number().min(0).optional().or(z.literal("")),
    sku: z.string().trim().min(2, "SKU is required."),
    status: productStatusSchema,
    isFeatured: z.coerce.boolean(),
    categoryId: z.string().uuid("Select a category."),
    seoTitle: z.string().trim().optional(),
    seoDescription: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.salePrice === "" ||
      data.salePrice === undefined ||
      Number(data.salePrice) <= data.basePrice,
    {
      message: "Sale price must be lower than or equal to the base price.",
      path: ["salePrice"],
    },
  );

export const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  color: z.string().trim().optional(),
  size: z.string().trim().optional(),
  sku: z.string().trim().min(2, "Variant SKU is required."),
  price: z.coerce.number().min(0, "Variant price cannot be negative.").optional().or(z.literal("")),
  stockQuantity: z.coerce
    .number()
    .int("Stock must be a whole number.")
    .min(0, "Stock cannot be negative."),
  isActive: z.coerce.boolean(),
});

export const productVariantsSchema = z
  .array(productVariantSchema)
  .min(1, "At least one variant is required.")
  .superRefine((variants, context) => {
    const combinations = new Set<string>();

    variants.forEach((variant, index) => {
      const color = (variant.color || "").trim().toLowerCase();
      const size = (variant.size || "Free Size").trim().toLowerCase();
      const key = `${color}:${size}`;

      if (combinations.has(key)) {
        context.addIssue({
          code: "custom",
          message: "Each color and size combination must be unique.",
          path: [index, "size"],
        });
      }

      combinations.add(key);
    });
  });

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type CategoryFormValues = z.input<typeof categorySchema>;
export type ProductFormValues = z.input<typeof productSchema>;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
