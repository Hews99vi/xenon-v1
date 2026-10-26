import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function getStoragePathFromPublicUrl(
  publicUrl: string | null | undefined,
  bucket: string,
) {
  if (!publicUrl || !supabaseUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(publicUrl);
    const parsedSupabaseUrl = new URL(supabaseUrl);
    const publicBucketPrefix = `/storage/v1/object/public/${bucket}/`;

    if (
      parsedUrl.origin !== parsedSupabaseUrl.origin ||
      !parsedUrl.pathname.startsWith(publicBucketPrefix)
    ) {
      return null;
    }

    const path = parsedUrl.pathname.slice(publicBucketPrefix.length);
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

export async function removeStorageFilesFromPublicUrls(
  supabase: SupabaseClient,
  bucket: string,
  publicUrls: Array<string | null | undefined>,
  context: string,
) {
  try {
    // The database trigger also protects storage deletions, including direct API requests.
    const urls = publicUrls.filter((url): url is string => Boolean(url));
    const { data: retained, error: retentionError } = await supabase.rpc(
      "retained_content_assets",
      { p_urls: urls },
    );
    if (retentionError) {
      console.error("[StorageCleanup] Retention check failed; assets kept.", {
        context,
      });
      return;
    }
    const protectedUrls = new Set((retained || []) as string[]);
    const paths = Array.from(
      new Set(
        publicUrls
          .filter((url) => !url || !protectedUrls.has(url))
          .map((url) => getStoragePathFromPublicUrl(url, bucket))
          .filter((path): path is string => Boolean(path)),
      ),
    );

    if (!paths.length) {
      return;
    }

    const { error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      console.error("[StorageCleanup]", {
        context,
        bucket,
        error: error.message,
      });
    }
  } catch (error) {
    console.error("[StorageCleanup]", {
      context,
      bucket,
      error: error instanceof Error ? error.message : "Unknown storage error",
    });
  }
}
