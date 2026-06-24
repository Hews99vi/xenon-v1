/* eslint-disable @next/next/no-img-element */
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
      <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8">
        <div className="mb-8 border-b border-black pb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
            Journal
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-black">
            Blog
          </h1>
        </div>

        {posts.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article key={post.id} className="group border border-black bg-white">
                <Link href={`/blog/${post.slug}`}>
                  <div className="aspect-[4/3] overflow-hidden border-b border-black bg-neutral-100">
                    {post.coverImageUrl ? (
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full bg-[linear-gradient(135deg,#fff_0%,#fff_45%,#0a0a0a_45%,#0a0a0a_55%,#fff_55%,#f4f4f4_100%)]" />
                    )}
                  </div>
                </Link>
                <div className="p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    {post.publishedAt
                      ? new Intl.DateTimeFormat("en-LK", {
                          dateStyle: "medium",
                        }).format(new Date(post.publishedAt))
                      : "Xenon"}
                  </p>
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="text-xl font-semibold text-black group-hover:underline">
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
          <div className="border border-black bg-white p-8 text-center text-sm text-neutral-600">
            Published posts will appear here.
          </div>
        )}
      </div>
    </section>
  );
}
