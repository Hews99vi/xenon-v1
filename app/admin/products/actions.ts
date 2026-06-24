"use server";

import { revalidatePath } from "next/cache";
import { productSchema, productVariantsSchema } from "@/lib/adminSchemas";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export type ProductActionState = {
  ok: boolean;
  message: string;
};

const defaultState: ProductActionState = {
  ok: false,
  message: "",
};

function toBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function sanitizeFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
}

async function uploadProductImages(files: File[]) {
  const supabase = await createServerSupabaseClient();

  return Promise.all(
    files.map(async (file) => {
      const path = `products/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return {
        image_url: data.publicUrl,
        alt_text: file.name,
      };
    }),
  );
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

export async function createProductAction(
  prevState: ProductActionState = defaultState,
  formData: FormData,
): Promise<ProductActionState> {
  void prevState;
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    shortDescription: formData.get("shortDescription"),
    basePrice: formData.get("basePrice"),
    salePrice: formData.get("salePrice") || "",
    sku: formData.get("sku"),
    status: formData.get("status"),
    isFeatured: toBoolean(formData.get("isFeatured")),
    categoryId: formData.get("categoryId"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid product data.",
    };
  }

  const images = formData
    .getAll("images")
    .filter((image): image is File => image instanceof File && image.size > 0);

  if (images.length > 5) {
    return { ok: false, message: "Upload a maximum of 5 product images." };
  }

  const variants = parseVariants(formData, parsed.data.basePrice);

  if (!variants.ok) {
    return { ok: false, message: variants.message };
  }

  try {
    const uploadedImages = await uploadProductImages(images);
    const supabase = await createServerSupabaseClient();
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        category_id: parsed.data.categoryId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        short_description: parsed.data.shortDescription || null,
        base_price: parsed.data.basePrice,
        sale_price:
          parsed.data.salePrice === "" || parsed.data.salePrice === undefined
            ? null
            : parsed.data.salePrice,
        sku: parsed.data.sku,
        status: parsed.data.status,
        is_featured: parsed.data.isFeatured,
        seo_title: parsed.data.seoTitle || null,
        seo_description: parsed.data.seoDescription || null,
      })
      .select("id")
      .single();

    if (error || !product) {
      logActionError("createProductAction", error);
      return { ok: false, message: getActionErrorMessage("create product") };
    }

    if (uploadedImages.length) {
      const { error: imagesError } = await supabase.from("product_images").insert(
        uploadedImages.map((image, index) => ({
          product_id: product.id,
          image_url: image.image_url,
          alt_text: image.alt_text,
          sort_order: index,
          is_primary: index === 0,
        })),
      );

      if (imagesError) {
        logActionError("createProductAction", imagesError);
        return { ok: false, message: getActionErrorMessage("create product") };
      }
    }

    const { error: variantsError } = await supabase.from("product_variants").insert(
      variants.variants.map((variant) => ({
        product_id: product.id,
        ...variant,
      })),
    );

    if (variantsError) {
      logActionError("createProductAction", variantsError);
      return { ok: false, message: getActionErrorMessage("create product") };
    }

    revalidatePath("/admin/products");
    return { ok: true, message: "Product created." };
  } catch (error) {
    logActionError("createProductAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("create product"),
    };
  }
}

export async function updateProductAction(
  productId: string,
  prevState: ProductActionState = defaultState,
  formData: FormData,
): Promise<ProductActionState> {
  void prevState;
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    shortDescription: formData.get("shortDescription"),
    basePrice: formData.get("basePrice"),
    salePrice: formData.get("salePrice") || "",
    sku: formData.get("sku"),
    status: formData.get("status"),
    isFeatured: toBoolean(formData.get("isFeatured")),
    categoryId: formData.get("categoryId"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid product data.",
    };
  }

  const images = formData
    .getAll("images")
    .filter((image): image is File => image instanceof File && image.size > 0);

  if (images.length > 5) {
    return { ok: false, message: "Upload a maximum of 5 product images." };
  }

  const variants = parseVariants(formData, parsed.data.basePrice);

  if (!variants.ok) {
    return { ok: false, message: variants.message };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("products")
      .update({
        category_id: parsed.data.categoryId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        short_description: parsed.data.shortDescription || null,
        base_price: parsed.data.basePrice,
        sale_price:
          parsed.data.salePrice === "" || parsed.data.salePrice === undefined
            ? null
            : parsed.data.salePrice,
        sku: parsed.data.sku,
        status: parsed.data.status,
        is_featured: parsed.data.isFeatured,
        seo_title: parsed.data.seoTitle || null,
        seo_description: parsed.data.seoDescription || null,
      })
      .eq("id", productId);

    if (error) {
      logActionError("updateProductAction", error);
      return { ok: false, message: getActionErrorMessage("update product") };
    }

    const uploadedImages = await uploadProductImages(images);

    if (uploadedImages.length) {
      const { count } = await supabase
        .from("product_images")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId);

      const { error: imagesError } = await supabase.from("product_images").insert(
        uploadedImages.map((image, index) => ({
          product_id: productId,
          image_url: image.image_url,
          alt_text: image.alt_text,
          sort_order: (count || 0) + index,
          is_primary: (count || 0) === 0 && index === 0,
        })),
      );

      if (imagesError) {
        logActionError("updateProductAction", imagesError);
        return { ok: false, message: getActionErrorMessage("update product") };
      }
    }

    const { data: existingVariants, error: existingVariantsError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);

    if (existingVariantsError) {
      logActionError("updateProductAction", existingVariantsError);
      return { ok: false, message: getActionErrorMessage("update product") };
    }

    const submittedExistingIds = new Set(
      variants.variants
        .map((variant) => variant.id)
        .filter((id): id is string => Boolean(id)),
    );
    const variantIdsToDelete = (existingVariants || [])
      .map((variant) => variant.id)
      .filter((id) => !submittedExistingIds.has(id));

    if (variantIdsToDelete.length) {
      const { error: deleteVariantsError } = await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", productId)
        .in("id", variantIdsToDelete);

      if (deleteVariantsError) {
        logActionError("updateProductAction", deleteVariantsError);
        return { ok: false, message: getActionErrorMessage("update product") };
      }
    }

    for (const variant of variants.variants.filter((item) => item.id)) {
      const { id, ...variantFields } = variant;
      const { error: variantError } = await supabase
        .from("product_variants")
        .update(variantFields)
        .eq("product_id", productId)
        .eq("id", id);

      if (variantError) {
        logActionError("updateProductAction", variantError);
        return { ok: false, message: getActionErrorMessage("update product") };
      }
    }

    const newVariants = variants.variants.filter((variant) => !variant.id);
    if (newVariants.length) {
      const { error: variantsError } = await supabase.from("product_variants").insert(
        newVariants.map((variant) => ({
          product_id: productId,
          color: variant.color,
          size: variant.size,
          sku: variant.sku,
          price: variant.price,
          stock_quantity: variant.stock_quantity,
          is_active: variant.is_active,
        })),
      );

      if (variantsError) {
        logActionError("updateProductAction", variantsError);
        return { ok: false, message: getActionErrorMessage("update product") };
      }
    }

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}/edit`);
    return { ok: true, message: "Product updated." };
  } catch (error) {
    logActionError("updateProductAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("update product"),
    };
  }
}

export async function deleteProductAction(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/admin/products");
}
