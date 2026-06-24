/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublishedBlogPostBySlug,
  getPublishedBlogSlugs,
  renderMarkdown,
} from "@/lib/blog";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 300;

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = await getPublishedBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.seoTitle || `${post.title} | Xenon`,
    description: post.seoDescription || post.excerpt || "Xenon journal.",
    alternates: {
      canonical: absoluteUrl(`/blog/${post.slug}`),
    },
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || undefined,
      url: absoluteUrl(`/blog/${post.slug}`),
      type: "article",
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const html = await renderMarkdown(post.content || "");
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt || undefined,
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.publishedAt || undefined,
    author: {
      "@type": "Organization",
      name: "Xenon",
    },
    publisher: {
      "@type": "Organization",
      name: "Xenon",
    },
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
  };

  return (
    <article className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <div className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-8">
        <header className="border-b border-black pb-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
            {post.publishedAt
              ? new Intl.DateTimeFormat("en-LK", {
                  dateStyle: "medium",
                }).format(new Date(post.publishedAt))
              : "Journal"}
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-black sm:text-5xl">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="mt-6 text-lg leading-8 text-neutral-700">{post.excerpt}</p>
          ) : null}
        </header>

        {post.coverImageUrl ? (
          <div className="my-8 aspect-[16/9] overflow-hidden border border-black bg-white">
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </article>
  );
}
