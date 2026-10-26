import { z } from "zod";

export const MAX_PRODUCT_IMAGE_FILES = 5;
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_BATCH_BYTES = 9 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const savedProductImageSchema = z.object({
  id: z.string().uuid(),
  image_url: z.string().min(1),
  alt_text: z.string().nullable(),
  sort_order: z.number().int().nonnegative(),
  is_primary: z.boolean(),
});
export type SavedProductImage = z.infer<typeof savedProductImageSchema>;
export const imageManifestSchema = z.array(z.object({
  key: z.string().uuid(),
  id: z.string().uuid().optional(),
  fileKey: z.string().uuid().optional(),
  altText: z.string().trim(),
}).strict()).superRefine((images, ctx) => {
  for (const field of ["key", "id", "fileKey"] as const) {
    const values = images.map(i => i[field]).filter(Boolean);
    if (new Set(values).size !== values.length) ctx.addIssue({ code: "custom", message: "An image appears more than once." });
  }
  if (images.some(i => !i.id && !i.fileKey)) ctx.addIssue({ code: "custom", message: "Choose a file for each new image." });
});
export type ImageManifest = z.infer<typeof imageManifestSchema>;

export function imageSnapshot(images: SavedProductImage[]) {
  return [...images].sort((a, b) => a.id.localeCompare(b.id));
}

export function imageFileError(files: Pick<File, "size" | "type">[]) {
  if (files.length > MAX_PRODUCT_IMAGE_FILES) return "Add or replace no more than 5 images per save.";
  if (files.some(f => !PRODUCT_IMAGE_TYPES.includes(f.type))) return "Choose JPG, PNG or WebP images.";
  if (files.some(f => f.size === 0)) return "An image is empty. Choose another file.";
  if (files.some(f => f.size > MAX_PRODUCT_IMAGE_BYTES)) return "Each image must be 5 MiB or smaller.";
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_PRODUCT_IMAGE_BATCH_BYTES) return "Selected files exceed 9 MiB combined. Save fewer files at a time.";
  return "";
}
