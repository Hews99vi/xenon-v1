"use server";

import { z } from "zod";
import type { CartItem } from "@/lib/cart/types";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const cartValidationItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const cartValidationSchema = z.array(cartValidationItemSchema).max(100);

type VariantRow = {
  id: string;
  product_id: string;
  color: string | null;
  size: string | null;
  price: number | null;
  stock_quantity: number;
  is_active: boolean;
  products:
    | {
        id: string;
        name: string;
        slug: string;
        base_price: number;
        sale_price: number | null;
        status: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
        base_price: number;
        sale_price: number | null;
        status: string;
      }[];
};

export type CartValidationResult = {
  ok: boolean;
  items: CartItem[];
  removedVariantIds: string[];
  adjustedVariantIds: string[];
  refreshedVariantIds: string[];
  message: string;
};

export async function validateCartItemsAction(
  input: z.infer<typeof cartValidationItemSchema>[],
): Promise<CartValidationResult> {
  const parsed = cartValidationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      items: [],
      removedVariantIds: [],
      adjustedVariantIds: [],
      refreshedVariantIds: [],
      message: "Cart could not be checked. Please refresh and try again.",
    };
  }

  const requestedItems = mergeRequestedItems(parsed.data);

  if (!requestedItems.length) {
    return {
      ok: true,
      items: [],
      removedVariantIds: [],
      adjustedVariantIds: [],
      refreshedVariantIds: [],
      message: "",
    };
  }

  const supabase = await createServerSupabaseClient();
  const variantIds = requestedItems.map((item) => item.variantId);
  const { data: variants, error } = await supabase
    .from("product_variants")
    .select(
      "id, product_id, color, size, price, stock_quantity, is_active, products!inner(id, name, slug, base_price, sale_price, status)",
    )
    .in("id", variantIds);

  if (error)
    return {
      ok: false,
      items: [],
      removedVariantIds: [],
      adjustedVariantIds: [],
      refreshedVariantIds: [],
      message: "Cart could not be checked. Please try again.",
    };

  const variantMap = new Map(
    ((variants || []) as unknown as VariantRow[]).map((variant) => [
      variant.id,
      variant,
    ]),
  );
  const productIds = Array.from(
    new Set(
      ((variants || []) as unknown as VariantRow[]).map(
        (variant) => variant.product_id,
      ),
    ),
  );
  const primaryImages = await getPrimaryImages(productIds);
  const items: CartItem[] = [];
  const removedVariantIds: string[] = [];
  const adjustedVariantIds: string[] = [];
  const refreshedVariantIds: string[] = [];

  for (const requestedItem of requestedItems) {
    const variant = variantMap.get(requestedItem.variantId);
    const product = normalizeProductRow(variant?.products);

    if (
      !variant ||
      !product ||
      !variant.is_active ||
      variant.stock_quantity <= 0 ||
      product.status !== "active"
    ) {
      removedVariantIds.push(requestedItem.variantId);
      continue;
    }

    const quantity = Math.min(requestedItem.quantity, variant.stock_quantity);

    if (quantity !== requestedItem.quantity) {
      adjustedVariantIds.push(requestedItem.variantId);
    }

    refreshedVariantIds.push(requestedItem.variantId);
    items.push({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      slug: product.slug,
      image: primaryImages.get(product.id) || null,
      color: variant.color,
      size: variant.size || "Free Size",
      price: Number(variant.price ?? product.sale_price ?? product.base_price),
      quantity,
      stockQuantity: Number(variant.stock_quantity),
    });
  }

  return {
    ok: true,
    items,
    removedVariantIds,
    adjustedVariantIds,
    refreshedVariantIds,
    message: getValidationMessage(
      removedVariantIds.length,
      adjustedVariantIds.length,
    ),
  };
}

function mergeRequestedItems(
  items: z.infer<typeof cartValidationItemSchema>[],
) {
  const merged = new Map<string, { variantId: string; quantity: number }>();

  for (const item of items) {
    const existing = merged.get(item.variantId);
    merged.set(item.variantId, {
      variantId: item.variantId,
      quantity: (existing?.quantity || 0) + item.quantity,
    });
  }

  return Array.from(merged.values());
}

async function getPrimaryImages(productIds: string[]) {
  if (!productIds.length) {
    return new Map<string, string>();
  }

  const supabase = await createServerSupabaseClient();
  const { data: images } = await supabase
    .from("product_images")
    .select("product_id, image_url, is_primary, sort_order")
    .in("product_id", productIds)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });
  const imageMap = new Map<string, string>();

  for (const image of (images || []) as {
    product_id: string;
    image_url: string;
  }[]) {
    if (!imageMap.has(image.product_id)) {
      imageMap.set(image.product_id, image.image_url);
    }
  }

  return imageMap;
}

function normalizeProductRow(product: VariantRow["products"] | undefined) {
  if (Array.isArray(product)) {
    return product[0] || null;
  }

  return product || null;
}

function getValidationMessage(removedCount: number, adjustedCount: number) {
  if (removedCount > 0 && adjustedCount > 0) {
    return "Your edit was updated. Some items changed or sold out.";
  }

  if (removedCount > 0) {
    return "Some items are no longer available and were removed.";
  }

  if (adjustedCount > 0) {
    return "Some quantities were updated to match current stock.";
  }

  return "";
}

export async function getQuickAddProduct(slug: string) {
  const { getProductBySlug } = await import("@/lib/storefront");
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  return getProductBySlug(slug);
}
