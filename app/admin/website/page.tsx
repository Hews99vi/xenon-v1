import { adminPage } from "@/components/admin/AdminPagination";
import Link from "next/link";
import { AdminLayout } from "../AdminLayout";
import { WebsiteEditor } from "./WebsiteEditor";
import {
  requireAdmin,
  missingContentSchema,
  readLegacySite,
  type ContentDocument,
} from "@/lib/content/server";
import {
  defaultSite,
  emptyImage,
  type ContentKind,
  siteSchema,
  pageSchema,
} from "@/lib/content/schema";
export default async function WebsitePage({
  searchParams,
}: {
  searchParams: Promise<{
    key?: string;
    kind?: string;
    panel?: string;
    historyPage?: string;
  }>;
}) {
  const {
    key = "site",
    kind: requestedKind,
    panel,
    historyPage: rawHistoryPage,
  } = await searchParams;
  const historyPage = adminPage(rawHistoryPage);
  const { db } = await requireAdmin();
  const { data: docs, error } = await db
    .from("content_documents")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error)
    return (
      <AdminLayout title="Website">
        <div className="admin-panel">
          <h2>Website editor setup</h2>
          <p>
            {missingContentSchema(error)
              ? "Apply supabase/content-management.sql, then run npm run content:import -- --apply to import existing content. The storefront continues reading legacy content until setup is complete."
              : "Could not load the website editor. Please try again."}
          </p>
        </div>
      </AdminLayout>
    );
  const documents = (docs || []) as ContentDocument[];
  if (!documents.some((d) => d.key === "site" && d.published_revision_id))
    return (
      <AdminLayout title="Website editor setup">
        <div className="admin-panel space-y-4">
          <h2>Import your existing website first</h2>
          <p>
            Run npm run content:import to validate, then npm run content:import
            -- --apply. This preserves the live website before editing drafts.
          </p>
        </div>
      </AdminLayout>
    );
  const doc = documents.find((d) => d.key === key);
  const kind: ContentKind =
    doc?.kind ||
    (requestedKind === "journal"
      ? "journal"
      : key === "site"
        ? "site"
        : "page");
  const [revisionResult, historyResult, categories, products, pages] =
    await Promise.all([
      doc?.draft_revision_id
        ? db
            .from("content_revisions")
            .select("payload")
            .eq("id", doc.draft_revision_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
      doc
        ? db
            .from("content_revisions")
            .select("id,created_at,published_at,created_by", { count: "exact" })
            .eq("document_id", doc.id)
            .order("created_at", { ascending: false })
            .range((historyPage - 1) * 20, historyPage * 20 - 1)
        : Promise.resolve({ data: [], count: 0, error: null }),
      db.from("categories").select("id,name,slug").order("name"),
      db
        .from("products")
        .select("id,name,slug")
        .eq("status", "active")
        .order("name")
        .limit(25),
      db
        .from("content_documents")
        .select("kind,slug")
        .neq("kind", "site")
        .not("published_revision_id", "is", null),
    ]);
  if (
    revisionResult.error ||
    historyResult.error ||
    categories.error ||
    products.error ||
    pages.error
  )
    throw new Error(
      "Website editor data could not be loaded. Please try again.",
    );
  const revision = revisionResult.data,
    history = historyResult.data;
  const authors = [
    ...new Set((history || []).map((h) => h.created_by).filter(Boolean)),
  ];
  const profiles = authors.length
    ? await db.from("admin_profiles").select("id,full_name").in("id", authors)
    : { data: [] };
  const authorNames = new Map(
    (profiles.data || []).map((p) => [p.id, p.full_name]),
  );
  const parsedRevision = revision
    ? (kind === "site" ? siteSchema : pageSchema).safeParse(revision.payload)
    : null;
  if (parsedRevision && !parsedRevision.success)
    throw new Error(
      "This draft has invalid content. Restore a validated revision before editing.",
    );
  const initial =
    (parsedRevision?.success ? parsedRevision.data : null) ||
    (kind === "site"
      ? documents.length
        ? structuredClone(defaultSite)
        : await readLegacySite()
      : {
          version: 1,
          title: "",
          body: "",
          excerpt: "",
          image: { ...emptyImage },
          seoTitle: "",
          seoDescription: "",
        });
  return (
    <AdminLayout
      title="Website"
      action={
        <Link className="admin-button" href="/" target="_blank">
          View store ↗
        </Link>
      }
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link className="admin-secondary" href="/admin/website">
          Homepage & settings
        </Link>
        <Link
          className="admin-secondary"
          href="/admin/website?key=new&kind=page"
        >
          New page
        </Link>
        <Link
          className="admin-secondary"
          href="/admin/website?key=new&kind=journal"
        >
          New journal entry
        </Link>
        <details className="relative">
          <summary className="admin-secondary cursor-pointer">
            Existing pages
          </summary>
          <div className="absolute z-30 grid min-w-64 gap-2 border bg-white p-4 shadow-lg">
            {documents
              .filter((d) => d.kind !== "site")
              .map((d) => (
                <Link
                  key={d.id}
                  href={`/admin/website?key=${encodeURIComponent(d.key)}`}
                >
                  {d.slug}{" "}
                  {d.draft_revision_id !== d.published_revision_id
                    ? "· Draft"
                    : ""}
                </Link>
              ))}
          </div>
        </details>
      </div>
      <WebsiteEditor
        key={key}
        document={doc || null}
        kind={kind}
        initial={initial}
        history={(history || []).map((h) => ({
          ...h,
          authorName: h.created_by
            ? authorNames.get(h.created_by) || "Admin"
            : "Imported content",
        }))}
        historyPagination={{
          page: historyPage,
          total: historyResult.count || 0,
        }}
        categories={categories.data || []}
        products={products.data || []}
        pages={pages.data || []}
        initialPanel={panel}
      />
    </AdminLayout>
  );
}
