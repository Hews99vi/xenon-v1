import Link from "next/link";
import { AdminLayout } from "../AdminLayout";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { formatDate, titleCase } from "../orders/types";
import { deleteBlogPostAction } from "./actions";

type BlogAdminPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
};

export default async function AdminBlogPage({ searchParams }: BlogAdminPageProps) {
  const { status = "" } = await searchParams;
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, status, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: posts, error } = await query;

  return (
    <AdminLayout
      title="Blog"
      action={
        <Link href="/admin/blog/new" className="admin-button inline-flex">
          New post
        </Link>
      }
    >
      <form className="mb-6 grid gap-4 border border-black bg-white p-4 md:grid-cols-[16rem_auto]">
        <select className="admin-input" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button className="admin-button" type="submit">
          Filter
        </button>
      </form>

      {error ? (
        (console.error("[AdminBlogPage]", error),
        <p className="border border-black bg-white p-5 text-sm">
          Could not load blog posts.
        </p>)
      ) : (
        <div className="overflow-hidden border border-black bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-black bg-neutral-100 text-xs uppercase tracking-[0.18em]">
              <tr>
                <th className="px-4 py-4">Title</th>
                <th className="px-4 py-4">Slug</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Published</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {((posts || []) as BlogPost[]).map((post) => (
                <tr key={post.id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold">{post.title}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                      {post.excerpt || "No excerpt"}
                    </p>
                  </td>
                  <td className="px-4 py-4">{post.slug}</td>
                  <td className="px-4 py-4">{titleCase(post.status)}</td>
                  <td className="px-4 py-4">
                    {post.published_at ? formatDate(post.published_at) : "-"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        className="border border-black px-3 py-2 text-xs uppercase tracking-[0.16em]"
                      >
                        Edit
                      </Link>
                      <form action={deleteBlogPostAction}>
                        <input type="hidden" name="id" value={post.id} />
                        <button className="border border-black bg-black px-3 py-2 text-xs uppercase tracking-[0.16em] text-white">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!posts?.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-neutral-600" colSpan={5}>
                    No blog posts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
