"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/content/server";
import {
  siteSchema,
  pageSchema,
  type ContentKind,
  contentPath,
} from "@/lib/content/schema";
import { siteLinks, incompleteLinks } from "@/lib/content/validation";
import {
  createUploadPath,
  validateImageFile,
  getImageUploadErrorMessage,
} from "@/lib/adminImageUploads";
const identity = z.object({
  kind: z.enum(["site", "page", "journal"]),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
});
function fail(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (message.includes("CONTENT_CONFLICT"))
    return {
      ok: false as const,
      message:
        "Another editor changed this document. Reload before saving; your edits have not been published.",
    };
  if (message.includes("Admin access"))
    return {
      ok: false as const,
      message: "Your session expired. Sign in again.",
    };
  const uploadError = getImageUploadErrorMessage(error);
  if (uploadError) return { ok: false as const, message: uploadError };
  console.error("[WebsiteEditor]", message);
  return {
    ok: false as const,
    message: "The change could not be saved. Please try again.",
  };
}
export async function saveDraft(input: {
  kind: ContentKind;
  slug: string;
  payload: unknown;
  expected: string | null;
}) {
  try {
    const { db } = await requireAdmin();
    const parsedIdentity = identity.parse(input);
    const setup = await db
      .from("content_documents")
      .select("id")
      .eq("key", "site")
      .not("published_revision_id", "is", null)
      .maybeSingle();
    if (setup.error) throw setup.error;
    if (!setup.data)
      return {
        ok: false as const,
        message:
          "Import the current website before saving drafts. Run npm run content:import -- --apply after applying the migration.",
      };
    const parsed = (input.kind === "site" ? siteSchema : pageSchema).safeParse(
      input.payload,
    );
    if (!parsed.success)
      return {
        ok: false as const,
        message: "Check the highlighted fields.",
        errors: Object.fromEntries(
          parsed.error.issues.map((e) => [e.path.join("."), e.message]),
        ),
      };
    const key =
      input.kind === "site"
        ? "site"
        : `${parsedIdentity.kind}:${parsedIdentity.slug}`;
    const { data: revision, error } = await db.rpc("save_content_draft", {
      p_key: key,
      p_kind: parsedIdentity.kind,
      p_slug: parsedIdentity.slug,
      p_payload: parsed.data,
      p_expected: input.expected,
    });
    if (error) throw error;
    const { data: doc, error: docError } = await db
      .from("content_documents")
      .select("id")
      .eq("key", key)
      .single();
    if (docError) throw docError;
    revalidatePath("/admin/website");
    return {
      ok: true as const,
      message: "Draft saved. Your live website has not changed.",
      revision: String(revision),
      documentId: String(doc.id),
    };
  } catch (error) {
    return fail(error);
  }
}
export async function publishDraft(documentId: string, expected: string) {
  try {
    const { db } = await requireAdmin();
    const { data: doc, error: docError } = await db
      .from("content_documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (docError) throw docError;
    const { data: revision, error: revisionError } = await db
      .from("content_revisions")
      .select("payload")
      .eq("id", expected)
      .eq("document_id", documentId)
      .single();
    if (revisionError) throw revisionError;
    const payload = (doc.kind === "site" ? siteSchema : pageSchema).parse(
      revision.payload,
    );
    if (doc.kind === "site") {
      const site = siteSchema.parse(payload);
      if (incompleteLinks(site).length)
        return {
          ok: false as const,
          message:
            "Every link needs both text and a destination. Clear both fields to remove an optional button.",
        };
      const internal = siteLinks(site)
        .filter((l) => l.href.startsWith("/"))
        .map((l) => new URL(l.href, "https://xenon.invalid"));
      const productSlugs = internal.flatMap(
        (url) => url.pathname.match(/^\/products\/([^/]+)$/)?.[1] || [],
      );
      const categorySlugs = [
        ...new Set([
          ...internal.flatMap(
            (url) =>
              url.pathname.match(/^\/categories\/([^/]+)$/)?.[1] ||
              url.searchParams.get("category") ||
              [],
          ),
          ...site.sections.flatMap((s) =>
            s.type === "products" && s.source === "category" && s.enabled
              ? s.category
              : [],
          ),
        ]),
      ];
      const categoryIds = site.sections.flatMap((s) =>
        s.enabled && s.type === "categories" && s.source === "manual"
          ? s.categoryIds
          : [],
      );
      const pageKeys = internal.flatMap((url) => {
        const path = url.pathname.replace(/\/$/, "");
        const journal = path.match(/^\/blog\/([^/]+)$/)?.[1],
          page = path.match(/^\/pages\/([^/]+)$/)?.[1];
        return journal
          ? `journal:${journal}`
          : page
            ? `page:${page}`
            : [
                  "/return-policy",
                  "/shipping-policy",
                  "/privacy-policy",
                  "/terms",
                  "/size-guide",
                ].includes(path)
              ? `page:${path.slice(1)}`
              : [];
      });
      const [
        { data: categories, error: categoryError },
        { data: products, error: productError },
        { data: pages, error: pageError },
      ] = await Promise.all([
        categorySlugs.length
          ? db
              .from("categories")
              .select("id,slug")
              .in("slug", categorySlugs)
              .eq("is_active", true)
          : Promise.resolve({ data: [], error: null }),
        productSlugs.length
          ? db
              .from("products")
              .select("id,slug")
              .in("slug", productSlugs)
              .eq("status", "active")
          : Promise.resolve({ data: [], error: null }),
        pageKeys.length
          ? db
              .from("content_documents")
              .select("kind,slug")
              .in("key", pageKeys)
              .not("published_revision_id", "is", null)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (categoryError || productError || pageError)
        throw categoryError || productError || pageError;
      if (categoryIds.length) {
        const result = await db
          .from("categories")
          .select("id")
          .in("id", categoryIds)
          .eq("is_active", true);
        if (result.error) throw result.error;
        if (
          new Set(result.data?.map((c) => c.id)).size !==
          new Set(categoryIds).size
        )
          return {
            ok: false as const,
            message:
              "A selected category is unavailable. Update the selection before publishing.",
          };
      }
      const pagePaths = new Set(
        (pages || []).map((p) => contentPath(p.kind, p.slug)),
      );
      for (const link of siteLinks(site).filter((l) =>
        l.href.startsWith("/"),
      )) {
        const url = new URL(link.href, "https://xenon.invalid");
        const path = url.pathname.replace(/\/$/, "") || "/";
        const productSlug = path.match(/^\/products\/([^/]+)$/)?.[1],
          categorySlug = path.match(/^\/categories\/([^/]+)$/)?.[1],
          queryCategory = url.searchParams.get("category");
        const exists = productSlug
          ? (products || []).some((p) => p.slug === productSlug)
          : categorySlug
            ? (categories || []).some((c) => c.slug === categorySlug)
            : ["/", "/products", "/blog", "/checkout"].includes(path) ||
              pagePaths.has(path);
        if (
          !exists ||
          (queryCategory &&
            !(categories || []).some((c) => c.slug === queryCategory))
        )
          return {
            ok: false as const,
            message: `The link “${link.label}” points to an unavailable destination (${link.href}). Publish the page or update the link.`,
          };
      }
      for (const section of site.sections.filter((s) => s.enabled)) {
        if (
          (section.type === "hero" || section.type === "campaign") &&
          (!section.image.src || !section.title)
        )
          return {
            ok: false as const,
            message: "Enabled campaigns need a heading and image.",
          };
        if (
          section.type === "products" &&
          section.source === "manual" &&
          section.productIds.length
        ) {
          const { data, error } = await db
            .from("products")
            .select("id")
            .in("id", section.productIds)
            .eq("status", "active");
          if (error || data?.length !== section.productIds.length)
            return {
              ok: false as const,
              message:
                "A selected product is unavailable. Update the product selection before publishing.",
            };
        }
        if (
          section.type === "products" &&
          section.source === "category" &&
          !(categories || []).some((c) => c.slug === section.category)
        )
          return {
            ok: false as const,
            message: "Choose a category for each category-based product row.",
          };
      }
    }
    if (doc.kind !== "site" && !pageSchema.parse(payload).body.trim())
      return {
        ok: false as const,
        message: "Add page content before publishing.",
      };
    const { error } = await db.rpc("publish_content", {
      p_document_id: documentId,
      p_expected: expected,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    revalidatePath("/sitemap.xml");
    return {
      ok: true as const,
      message: "Published. The website now shows this revision.",
    };
  } catch (error) {
    return fail(error);
  }
}
export async function restoreDraft(
  documentId: string,
  revisionId: string,
  expected: string | null,
) {
  try {
    const { db } = await requireAdmin();
    const { data, error } = await db.rpc("restore_content_draft", {
      p_document_id: documentId,
      p_revision_id: revisionId,
      p_expected: expected,
    });
    if (error) throw error;
    revalidatePath("/admin/website");
    return {
      ok: true as const,
      message: "Revision restored as a draft. Preview it before publishing.",
      revision: String(data),
    };
  } catch (error) {
    return fail(error);
  }
}
export async function uploadContentImage(form: FormData) {
  try {
    const { db } = await requireAdmin();
    const file = form.get("image");
    if (!(file instanceof File) || !file.size)
      return { ok: false as const, message: "Choose an image." };
    validateImageFile(file, "Website image");
    const path = createUploadPath("website", file);
    const { error } = await db.storage
      .from("banner-images")
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    if (error) throw error;
    return {
      ok: true as const,
      url: db.storage.from("banner-images").getPublicUrl(path).data.publicUrl,
      message: "Image uploaded.",
    };
  } catch (error) {
    return fail(error);
  }
}
export async function listMedia(
  input: { source?: string; page?: number; search?: string } = {},
) {
  const { db } = await requireAdmin();
  const source = z
    .enum(["website", "banners", "homepage", "products", "categories"])
    .parse(input.source || "website");
  const page = z
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(input.page || 1),
    search = z
      .string()
      .max(120)
      .parse(input.search || "");
  const bucket =
    source === "products"
      ? "product-images"
      : source === "categories"
        ? "category-images"
        : "banner-images";
  const { data, error } = await db.storage
    .from(bucket)
    .list(source, {
      limit: 24,
      offset: (page - 1) * 24,
      search,
      sortBy: { column: "created_at", order: "desc" },
    });
  if (error) throw new Error("Media could not be loaded.");
  return {
    items: (data || [])
      .filter((f) => f.id)
      .map((f) => ({
        name: f.name,
        url: db.storage.from(bucket).getPublicUrl(`${source}/${f.name}`).data
          .publicUrl,
      })),
    hasMore: data?.length === 24,
  };
}

export async function searchCatalog(
  kind: "products" | "categories",
  term: string,
  page = 1,
  selectedIds: string[] = [],
) {
  const { db } = await requireAdmin();
  const table = z.enum(["products", "categories"]).parse(kind);
  const search = z
    .string()
    .max(120)
    .parse(term)
    .replace(/[,()%\\"']/g, " ")
    .trim();
  const current = z.number().int().min(1).max(100000).parse(page);
  const selected = z.array(z.string().uuid()).max(30).parse(selectedIds);
  let query = db
    .from(table)
    .select("id,name,slug", { count: "exact" })
    .order("name")
    .order("id")
    .range((current - 1) * 25, current * 25 - 1);
  query =
    table === "products"
      ? query.eq("status", "active")
      : query.eq("is_active", true);
  if (search) query = query.ilike("name", `%${search}%`);
  const [result, chosen] = await Promise.all([
    query,
    selected.length
      ? db.from(table).select("id,name,slug").in("id", selected)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (result.error || chosen.error)
    throw new Error("Catalog options could not be loaded.");
  return {
    options: result.data || [],
    selected: chosen.data || [],
    count: result.count || 0,
  };
}
