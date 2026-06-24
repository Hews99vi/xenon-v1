import Link from "next/link";
import { AdminLayout } from "../../AdminLayout";
import { BlogPostForm } from "../BlogPostForm";
import { createBlogPostAction } from "../actions";

export default function NewBlogPostPage() {
  return (
    <AdminLayout
      title="New blog post"
      action={
        <Link href="/admin/blog" className="border border-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em]">
          Back
        </Link>
      }
    >
      <div className="max-w-5xl">
        <BlogPostForm action={createBlogPostAction} submitLabel="Create post" />
      </div>
    </AdminLayout>
  );
}
