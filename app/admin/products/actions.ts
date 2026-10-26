"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/content/server";
import { readProductImages } from "@/lib/productImageQueries";
import { enqueueImageCleanup, retryImageCleanup } from "@/lib/productImageStorage";
import { imageManifestSchema, savedProductImageSchema, imageSnapshot, imageFileError, type SavedProductImage } from "@/lib/productImages";
import {
  productSchema,
  productVariantsSchema,
  type ProductInput,
} from "@/lib/adminSchemas";
import { logActionError } from "@/lib/actionErrors";
import {
  createUploadPath,
  getImageUploadErrorMessage,
  validateImageFile,
} from "@/lib/adminImageUploads";
import { removeStorageFilesFromPublicUrls } from "@/lib/adminStorageCleanup";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export type ProductActionState = {
  ok: boolean;
  message: string;
  code?: "validation" | "conflict" | "configuration" | "unknown" | "error";
  images?: SavedProductImage[];
  snapshot?: SavedProductImage[];
  productId?: string;
  cleanupPending?: boolean;
};

const defaultState: ProductActionState = {
  ok: false,
  message: "",
};

function toBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function getProductPayload(product: ProductInput) {
  return {
    audience: product.audience || null,
    category_id: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description || null,
    short_description: product.shortDescription || null,
    base_price: product.basePrice,
    sale_price:
      product.salePrice === "" || product.salePrice === undefined
        ? null
        : product.salePrice,
    sku: product.sku,
    status: product.status,
    is_featured: product.isFeatured,
    seo_title: product.seoTitle || null,
    seo_description: product.seoDescription || null,
  };
}

function parseVariants(formData: FormData, basePrice: number) {
  const rawVariants = String(formData.get("variantsJson") || "[]");
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawVariants);
  } catch {
    return {
      ok: false as const,
      message: "Invalid variant data.",
      variants: [],
    };
  }

  const parsed = productVariantsSchema.safeParse(parsedJson);

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message || "Invalid variant data.",
      variants: [],
    };
  }

  const skuSet = new Set<string>();
  for (const variant of parsed.data) {
    const sku = variant.sku.trim().toLowerCase();
    if (skuSet.has(sku)) {
      return {
        ok: false as const,
        message: "Each variant SKU must be unique.",
        variants: [],
      };
    }
    skuSet.add(sku);
  }

  return {
    ok: true as const,
    message: "",
    variants: parsed.data.map((variant) => ({
      id: variant.id,
      color: variant.color?.trim() || null,
      size: variant.size?.trim() || "Free Size",
      sku: variant.sku.trim(),
      price:
        variant.price === "" || variant.price === undefined
          ? basePrice
          : Number(variant.price),
      stock_quantity: variant.stockQuantity,
      is_active: variant.isActive,
    })),
  };
}

const resultSchema = z.object({
  product_id: z.string().uuid(), slug: z.string(),
  images: z.array(savedProductImageSchema), snapshot: z.array(savedProductImageSchema),
});

function parseProduct(formData: FormData) {
  return productSchema.safeParse({
    audience: formData.get("audience") || "", name: formData.get("name"), slug: formData.get("slug"),
    description: formData.get("description"), shortDescription: formData.get("shortDescription"),
    basePrice: formData.get("basePrice"), salePrice: formData.get("salePrice") || "", sku: formData.get("sku"),
    status: formData.get("status"), isFeatured: toBoolean(formData.get("isFeatured")), categoryId: formData.get("categoryId"),
    seoTitle: formData.get("seoTitle"), seoDescription: formData.get("seoDescription"),
  });
}

function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? String(error.code) : "";
}
function errorText(error: unknown) {
  return error && typeof error === "object" && "message" in error ? String(error.message) : "";
}

async function validateFileBytes(file: File) {
  validateImageFile(file, "Product image");
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid = file.type === "image/jpeg" ? b[0] === 255 && b[1] === 216 && b[2] === 255
    : file.type === "image/png" ? [137,80,78,71,13,10,26,10].every((v,i) => b[i] === v)
    : String.fromCharCode(...b.slice(0,4)) === "RIFF" && String.fromCharCode(...b.slice(8,12)) === "WEBP";
  if (!valid) throw new Error("An image does not match its file type. Choose a valid JPG, PNG or WebP.");
}

async function saveProduct(productId: string | null, formData: FormData): Promise<ProductActionState> {
  const parsed = parseProduct(formData);
  if (!parsed.success) return { ok: false, code: "validation", message: parsed.error.issues[0]?.message || "Check the product details." };
  const variants = parseVariants(formData, parsed.data.basePrice);
  if (!variants.ok) return { ok: false, code: "validation", message: variants.message };
  let manifest: z.infer<typeof imageManifestSchema>;
  let expected: SavedProductImage[];
  const files = new Map<string, File>();
  try {
    manifest = imageManifestSchema.parse(JSON.parse(String(formData.get("imageManifest"))));
    expected = z.array(savedProductImageSchema).parse(JSON.parse(String(formData.get("imageSnapshot"))));
    for (const image of manifest) {
      if (!image.fileKey) continue;
      const values = formData.getAll(`image-file-${image.fileKey}`);
      if (values.length !== 1 || !(values[0] instanceof File)) throw new Error("Choose a file for each new or replaced image.");
      files.set(image.fileKey, values[0]);
    }
    const suppliedKeys = [...formData.keys()].filter(key => key.startsWith("image-file-"));
    if (new Set(suppliedKeys).size !== files.size) throw new Error("The selected image files do not match the gallery.");
    const fileError = imageFileError([...files.values()]);
    if (fileError) throw new Error(fileError);
    for (const file of files.values()) await validateFileBytes(file);
  } catch (error) {
    return { ok: false, code: "validation", message: error instanceof z.ZodError || error instanceof SyntaxError ? "Image data is invalid. Reload images before saving." : errorText(error) || "Check the image files." };
  }
  const uploaded: string[] = [];
  let saveRequested = false;
  let db: Awaited<ReturnType<typeof requireAdmin>>["db"] | undefined;
  let oldSlug: string | undefined;
  let result: z.infer<typeof resultSchema>;
  try {
    db = (await requireAdmin()).db;
    // Check required migration and stale edits before uploading; the RPC repeats
    // this check under a transaction lock to cover concurrent saves.
    const snapshot = await db.rpc("product_image_snapshot", { p_product_id: productId });
    if (snapshot.error) throw snapshot.error;
    if (JSON.stringify(imageSnapshot(z.array(savedProductImageSchema).parse(snapshot.data))) !== JSON.stringify(imageSnapshot(expected))) {
      return { ok: false, code: "conflict", message: "Another editor changed these images. Reload images before saving; your edits are still here." };
    }
    const currentImages = productId ? await readProductImages(db, productId) : [];
    const byId = new Map(currentImages.map(image => [image.id, image]));
    if (manifest.some(image => image.id && !byId.has(image.id))) return { ok: false, code: "validation", message: "An image does not belong to this product. Reload images." };
    if (productId) {
      const product = await db.from("products").select("slug").eq("id", productId).single();
      if (product.error) throw product.error;
      oldSlug = product.data.slug;
    }
    const imagePayload = [];
    for (const image of manifest) {
      let url = image.id ? byId.get(image.id)?.image_url : undefined;
      if (image.fileKey) {
        const file = files.get(image.fileKey);
        if (!file) throw new Error("An image file is missing.");
        const path = createUploadPath("products", file);
        url = db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
        const reservation = await db.rpc("reserve_product_image_upload", { p_url: url, p_product_id: productId });
        if (reservation.error) throw reservation.error;
        uploaded.push(url);
        const upload = await db.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
        if (upload.error) throw upload.error;
      }
      imagePayload.push({ id: image.id, image_url: url, alt_text: image.altText });
    }
    saveRequested = true;
    const saved = await db.rpc("admin_upsert_product_v2", {
      p_product_id: productId, p_product: getProductPayload(parsed.data), p_variants: variants.variants,
      p_images: imagePayload, p_expected_images: imageSnapshot(expected),
    });
    if (saved.error) throw saved.error;
    result = resultSchema.parse(saved.data);
  } catch (error) {
    let cleanupPending = uploaded.length > 0;
    if (db && uploaded.length) {
      try { await enqueueImageCleanup(db, uploaded, productId); cleanupPending = (await retryImageCleanup(db, productId)).pending; }
      catch { console.error("[ProductImages] Newly uploaded files need a cleanup retry."); }
    }
    if (errorText(error).includes("PRODUCT_IMAGES_CONFLICT")) return { ok: false, cleanupPending, code: "conflict", message: "Another editor changed these images. Reload images before saving; your edits are still here." };
    if (["PGRST202", "42883", "PGRST205", "42P01"].includes(errorCode(error))) return { ok: false, cleanupPending, code: "configuration", message: "Image management is not installed in this database. Apply product-image-management.sql after content-management.sql, then retry." };
    logActionError("saveProductImages", error);
    const uploadMessage = getImageUploadErrorMessage(error);
    if (uploadMessage) return { ok: false, cleanupPending, code: "validation", message: uploadMessage };
    if (!saveRequested && uploaded.length) return { ok: false, cleanupPending, code: "error", message: "Images could not be uploaded. Your product was not changed. Your edits are kept." };
    if (!errorCode(error) && saveRequested) return { ok: false, cleanupPending, code: "unknown", message: "The save status could not be confirmed. Your edits are kept. Reload the product before trying again." };
    return { ok: false, cleanupPending, code: "error", message: "Product could not be saved. Check your session and details, then try again. Your edits are kept." };
  }
  let cleanupPending = true;
  try { cleanupPending = (await retryImageCleanup(db, result.product_id)).pending; }
  catch { console.error("[ProductImages] Saved product has pending cleanup."); }
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${result.product_id}/edit`);
  revalidatePath("/products");
  revalidatePath("/", "layout");
  if (oldSlug) revalidatePath(`/products/${oldSlug}`);
  revalidatePath(`/products/${result.slug}`);
  return { ok: true, message: cleanupPending ? "Product saved; some unused files could not be removed. Retry cleanup." : productId ? "Product updated." : "Product created.",
    images: result.images, snapshot: result.snapshot, productId: result.product_id, cleanupPending };
}

export async function createProductAction(prevState: ProductActionState = defaultState, formData: FormData): Promise<ProductActionState> {
  void prevState;
  return saveProduct(null, formData);
}
export async function updateProductAction(productId: string, prevState: ProductActionState = defaultState, formData: FormData): Promise<ProductActionState> {
  void prevState;
  if (!z.string().uuid().safeParse(productId).success) return { ok: false, message: "Choose a valid product." };
  return saveProduct(productId, formData);
}
export async function reloadProductImagesAction(productId: string) {
  try {
    if (!z.string().uuid().safeParse(productId).success) throw new Error("Invalid product.");
    const { db } = await requireAdmin();
    return { ok: true as const, images: await readProductImages(db, productId), message: "Images reloaded." };
  } catch { return { ok: false as const, message: "Images could not be reloaded. Check your session and try again." }; }
}
export async function retryProductImageCleanupAction(productId: string | null) {
  try {
    if (productId && !z.string().uuid().safeParse(productId).success) throw new Error("Invalid product.");
    const { db } = await requireAdmin();
    const result = await retryImageCleanup(db, productId);
    return { ok: !result.pending, pending: result.pending, message: result.pending ? "Some unused files could not be removed. You can retry cleanup." : "Unused image cleanup complete. Referenced images were kept." };
  } catch { return { ok: false, pending: true, message: "Cleanup could not be completed. Check your session and try again." }; }
}

export async function deleteProductAction(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  const { data: productImages, error: imagesError } = await supabase
    .from("product_images")
    .select("image_url")
    .eq("product_id", id);

  if (imagesError) {
    logActionError("deleteProductAction:getImages", imagesError);
  }

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    logActionError("deleteProductAction", error);
    return;
  }

  await removeStorageFilesFromPublicUrls(
    supabase,
    "product-images",
    (productImages || []).map((image) => image.image_url),
    "deleteProductAction",
  );

  revalidatePath("/admin/products");
  revalidatePath("/products"); // Revalidate storefront product listing
  revalidatePath("/", "layout"); // Revalidate homepage (for featured products)
}
