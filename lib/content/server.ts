import "server-only";
import { cache } from "react";
import { cookies, draftMode } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { supabasePublic } from "@/lib/supabasePublic";
import { importLegacySite, importLegacyPage } from "./legacy";
import {
  siteSchema,
  pageSchema,
  type ContentKind,
  type SiteContent,
  type PageContent,
} from "./schema";
export type ContentDocument = {
  id: string;
  key: string;
  kind: ContentKind;
  slug: string;
  draft_revision_id: string | null;
  published_revision_id: string | null;
  updated_at: string;
};
export function missingContentSchema(
  error: { code?: string; message?: string } | null,
) {
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    Boolean(error?.message?.includes("Could not find the table"))
  );
}
export const requireAdmin = cache(async () => {
  const db = await createServerSupabaseClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Admin access required.");
  const { data: profile } = await db
    .from("admin_profiles")
    .select("id,full_name,role")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!profile) throw new Error("Admin access required.");
  return { db, user, profile };
});
export const isContentPreview = cache(async () => {
  if (!(await draftMode()).isEnabled) return false;
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
});
export const getPreviewTarget = cache(async () => {
  if (!(await isContentPreview())) return null;
  try {
    const target = JSON.parse(
      (await cookies()).get("xenon-content-preview")?.value || "null",
    );
    return target &&
      typeof target.key === "string" &&
      /^[0-9a-f-]{36}$/i.test(target.revision)
      ? (target as { key: string; revision: string })
      : null;
  } catch {
    return null;
  }
});
export const readDocument = cache(async (key: string) => {
  const target = await getPreviewTarget();
  const preview = target?.key === key;
  const db = preview ? (await requireAdmin()).db : supabasePublic;
  const { data, error } = await db
    .from("content_documents")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (missingContentSchema(error))
    return { state: "legacy" as const, payload: null, document: null };
  if (error)
    throw new Error(
      "Website content is temporarily unavailable. Please try again.",
    );
  const doc = data as ContentDocument | null;
  const revisionId = preview ? target?.revision : doc?.published_revision_id;
  if (!doc || !revisionId)
    return { state: "empty" as const, payload: null, document: doc };
  const revision = await db
    .from("content_revisions")
    .select("payload,published_at")
    .eq("id", revisionId)
    .eq("document_id", doc.id)
    .single();
  if (revision.error)
    throw new Error("Website content could not be loaded. Please try again.");
  return {
    state: "ready" as const,
    payload: revision.data.payload as unknown,
    document: doc,
    publishedAt: revision.data.published_at as string | null,
  };
});
export const readLegacySite = cache(async (): Promise<SiteContent> => {
  const results = await Promise.all(
    [
      "banners",
      "homepage_sections",
      "homepage_section_items",
      "site_settings",
      "categories",
      "policy_pages",
    ].map((table) => supabasePublic.from(table).select("*")),
  );
  for (const result of results)
    if (result.error && !missingContentSchema(result.error))
      throw new Error("Website content is temporarily unavailable.");
  return importLegacySite({
    banners: results[0].data || [],
    sections: results[1].data || [],
    items: results[2].data || [],
    settings: results[3].data || [],
    categories: results[4].data || [],
    pages: results[5].data || [],
  });
});
export const contentSystemInitialized = cache(async () => {
  const { data, error } = await supabasePublic.rpc("has_site_document");
  if (error && !["PGRST202", "42883"].includes(error.code))
    throw new Error("Website content is temporarily unavailable.");
  return data === true;
});
export const getSiteContent = cache(async () => {
  const result = await readDocument("site");
  // Compatibility is used only before the one-time import, never for hidden content.
  if (result.state === "legacy") return readLegacySite();
  if (result.state === "empty" && !result.document) {
    if (await contentSystemInitialized())
      throw new Error("Website content has not been published.");
    return readLegacySite();
  }
  if (!result.payload)
    throw new Error("Website content has not been published.");
  return siteSchema.parse(result.payload);
});
export const getPageContent = cache(
  async (
    kind: "page" | "journal",
    slug: string,
  ): Promise<PageContent | null> => {
    const result = await readDocument(`${kind}:${slug}`);
    if (
      result.state === "legacy" ||
      (result.state === "empty" &&
        !result.document &&
        !(await contentSystemInitialized()))
    ) {
      const { data, error } = await supabasePublic
        .from(kind === "page" ? "policy_pages" : "blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw new Error("Page temporarily unavailable.");
      if (data) return importLegacyPage(data);
      const alias =
        kind === "page" && slug === "return-policy"
          ? "returns-policy"
          : kind === "page" && slug === "terms"
            ? "terms-and-conditions"
            : null;
      if (alias) {
        const result = await supabasePublic
          .from("policy_pages")
          .select("*")
          .eq("slug", alias)
          .eq("status", "published")
          .maybeSingle();
        if (result.error) throw new Error("Page temporarily unavailable.");
        return result.data ? importLegacyPage(result.data) : null;
      }
      return null;
    }
    return result.payload ? pageSchema.parse(result.payload) : null;
  },
);
export async function listContent(kind: "page" | "journal") {
  const { data, error } = await supabasePublic
    .from("content_documents")
    .select("*")
    .eq("kind", kind)
    .order("created_at", { ascending: false });
  if (missingContentSchema(error)) return null;
  if (error) throw new Error("Content could not be loaded.");
  return (data || []) as ContentDocument[];
}
export const getAvailableAudiences = cache(async () => {
  const results = await Promise.all(
    ["women", "men"].map(async (audience) => {
      const { data, error } = await supabasePublic
        .from("products")
        .select("id")
        .eq("status", "active")
        .in("audience", [audience, "unisex"])
        .limit(1);
      if (error && error.code !== "42703" && error.code !== "PGRST204")
        throw new Error("Navigation is temporarily unavailable.");
      return data?.length ? audience : null;
    }),
  );
  return results.filter((value): value is string => Boolean(value));
});
