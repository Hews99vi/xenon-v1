import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoragePathFromPublicUrl } from "./adminStorageCleanup";

export async function enqueueImageCleanup(db: SupabaseClient, urls: string[], productId: string | null) {
  const owned = urls.filter(url => getStoragePathFromPublicUrl(url, "product-images"));
  if (!owned.length) return;
  const { error } = await db.rpc("enqueue_product_image_cleanup", { p_urls: owned, p_product_id: productId });
  if (error) throw new Error("Unused image cleanup could not be scheduled.");
}

export async function retryImageCleanup(db: SupabaseClient, productId: string | null) {
  const query = db.from("product_image_cleanup_jobs").select("asset_key,image_url,attempts")
    .eq("state", "pending").lte("not_before", new Date().toISOString());
  const { data, error } = await (productId ? query.or(`product_id.eq.${productId},product_id.is.null`) : query.is("product_id", null))
    .order("updated_at").limit(50);
  if (error) return { pending: true };
  for (const job of data || []) {
    try {
      const { data: allowed, error: checkError } = await db.rpc("product_image_cleanup_allowed", { p_key: job.asset_key });
      if (checkError) throw checkError;
      if (!allowed) continue;
      const path = getStoragePathFromPublicUrl(job.image_url, "product-images");
      if (!path) {
        const result = await db.from("product_image_cleanup_jobs").update({ state: "retained", last_error: null }).eq("asset_key", job.asset_key);
        if (result.error) throw result.error;
        continue;
      }
      const removed = await db.storage.from("product-images").remove([path]);
      if (removed.error) throw removed.error;
      const finished = await db.rpc("product_image_cleanup_finish", { p_key: job.asset_key });
      if (finished.error || !finished.data) throw new Error("Storage deletion could not be confirmed.");
    } catch {
      const result = await db.from("product_image_cleanup_jobs").update({
        attempts: job.attempts + 1, last_error: "Storage cleanup failed; retry required.",
      }).eq("asset_key", job.asset_key).eq("state", "pending");
      if (result.error) console.error("[ProductImages] Cleanup retry could not be recorded.");
    }
  }
  const remaining = db.from("product_image_cleanup_jobs").select("asset_key", { count: "exact", head: true }).eq("state", "pending").lte("not_before", new Date().toISOString());
  const result = await (productId ? remaining.or(`product_id.eq.${productId},product_id.is.null`) : remaining.is("product_id", null));
  return { pending: Boolean(result.error || result.count) };
}
