import { ContentImage } from "@/components/content/ContentImage";
import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBlogPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog | Xenon",
  description: "Read the Xenon journal.",
  alternates: {
    canonical: absoluteUrl("/blog"),
  },
  openGraph: {
    title: "Blog | Xenon",
    description: "Read the Xenon journal.",
    url: absoluteUrl("/blog"),
    type: "website",
  },
};

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <section className="bg-background">
      <div className="x-container py-12">
        <div className="mb-10 border-b border-neutral-200 pb-8">
          <h1 className="text-4xl font-normal tracking-tight sm:text-5xl">The journal</h1>
        </div>

        {posts.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article key={post.id} className="group min-w-0 bg-white">
                <Link href={`/blog/${post.slug}`}>
                  <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
                    {post.coverImageUrl ? (
                      <ContentImage image={post.contentImage}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full bg-neutral-100" />
                    )}
                  </div>
                </Link>
                <div className="py-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    {post.publishedAt
                      ? new Intl.DateTimeFormat("en-LK", {
                          dateStyle: "medium",
                        }).format(new Date(post.publishedAt))
                      : "Xenon"}
                  </p>
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="text-2xl font-normal tracking-tight text-black group-hover:underline">
                      {post.title}
                    </h2>
                  </Link>
                  {post.excerpt ? (
                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-neutral-700">
                      {post.excerpt}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-neutral-50 px-6 py-20 text-center text-sm text-neutral-600">
            Published posts will appear here.
          </div>
        )}
      </div>
    </section>
  );
}
