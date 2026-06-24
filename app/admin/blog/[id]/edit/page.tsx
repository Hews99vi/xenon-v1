import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLayout } from "../../../AdminLayout";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { BlogPostForm } from "../../BlogPostForm";
import { updateBlogPostAction } from "../../actions";

type EditBlogPostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, content, cover_image_url, seo_title, seo_description, status")
    .eq("id", id)
    .maybeSingle();

  if (!post) {
    notFound();
  }

  const action = updateBlogPostAction.bind(null, id);

  return (
    <AdminLayout
      title="Edit blog post"
      action={
        <Link href="/admin/blog" className="border border-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em]">
          Back
        </Link>
      }
    >
      <div className="max-w-5xl">
        <BlogPostForm
          action={action}
          submitLabel="Update post"
          defaultValues={{
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt || "",
            content: post.content || "",
            coverImageUrl: post.cover_image_url,
            seoTitle: post.seo_title || "",
            seoDescription: post.seo_description || "",
            status: post.status as "draft" | "published",
          }}
        />
      </div>
    </AdminLayout>
  );
}
