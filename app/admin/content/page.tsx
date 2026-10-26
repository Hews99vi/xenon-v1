import Link from "next/link";
import { AdminLayout } from "../AdminLayout";
import { requireAdmin, missingContentSchema } from "@/lib/content/server";
export default async function ContentList({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; page?: string }>;
}) {
  const { q = "", kind = "page", page = "1" } = await searchParams;
  const current = Math.max(1, parseInt(page) || 1);
  const { db } = await requireAdmin();
  let query = db
    .from("content_documents")
    .select("*", { count: "exact" })
    .eq("kind", kind === "journal" ? "journal" : "page")
    .order("updated_at", { ascending: false })
    .range((current - 1) * 25, current * 25 - 1);
  if (q) query = query.ilike("slug", `%${q.replace(/[%_]/g, "\\$&")}%`);
  const { data, error, count } = await query;
  return (
    <AdminLayout
      title="Pages & journal"
      action={
        <Link
          className="admin-button"
          href={`/admin/website?key=new&kind=${kind === "journal" ? "journal" : "page"}`}
        >
          New {kind === "journal" ? "entry" : "page"}
        </Link>
      }
    >
      <form className="mb-5 flex flex-wrap gap-3">
        <input
          className="admin-input max-w-sm"
          name="q"
          aria-label="Search pages"
          placeholder="Search by slug"
          defaultValue={q}
        />
        <select
          className="admin-input max-w-48"
          name="kind"
          aria-label="Content type"
          defaultValue={kind}
        >
          <option value="page">Pages</option>
          <option value="journal">Journal</option>
        </select>
        <button className="admin-button">Filter</button>
      </form>
      {error ? (
        <p role="alert">
          {missingContentSchema(error)
            ? "Apply the content migration and import existing content to enable this editor."
            : "Could not load content."}
        </p>
      ) : (
        <div className="admin-panel divide-y">
          {data?.map((d) => (
            <Link
              key={d.id}
              className="flex flex-wrap justify-between gap-2 py-4"
              href={`/admin/website?key=${encodeURIComponent(d.key)}`}
            >
              <strong>{d.slug}</strong>
              <span>
                {d.published_revision_id === d.draft_revision_id
                  ? "Published"
                  : "Draft changes"}{" "}
                →
              </span>
            </Link>
          ))}
          {!data?.length && <p>No matching content.</p>}
          <div className="flex items-center justify-between pt-4">
            <span>
              {count || 0} documents · Page {current}
            </span>
            <div className="flex gap-4">
              {current > 1 && (
                <Link
                  href={`?kind=${kind}&q=${encodeURIComponent(q)}&page=${current - 1}`}
                >
                  Previous
                </Link>
              )}
              {current * 25 < (count || 0) && (
                <Link
                  href={`?kind=${kind}&q=${encodeURIComponent(q)}&page=${current + 1}`}
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
