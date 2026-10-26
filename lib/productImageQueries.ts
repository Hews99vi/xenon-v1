import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { savedProductImageSchema } from "./productImages";

export async function readProductImages(db: SupabaseClient, productId: string) {
  const { data, error } = await db.from("product_images")
    .select("id,image_url,alt_text,sort_order,is_primary").eq("product_id", productId)
    .order("is_primary", { ascending: false }).order("sort_order").order("id");
  if (error) throw new Error("Product images could not be loaded. Reload the page and try again.");
  return z.array(savedProductImageSchema).parse(data);
}
