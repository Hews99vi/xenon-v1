import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { emptyImage, type ContentImage } from "./content/schema";
import { supabasePublic } from "./supabasePublic";
import { getPageContent, listContent, readDocument } from "./content/server";

export type PublishedBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  coverImageUrl: string | null;
  contentImage: ContentImage;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
};

export async function getPublishedBlogPosts() {
  const docs = await listContent("journal");
  if (docs !== null) {
    const posts = await Promise.all(
      docs.map(async (d) => {
        const [p, result] = await Promise.all([
          getPageContent("journal", d.slug),
          readDocument(d.key),
        ]);
        return p
          ? {
              id: d.id,
              title: p.title,
              slug: d.slug,
              excerpt: p.excerpt,
              content: p.body,
              coverImageUrl: p.image.src,
              contentImage: p.image,
              seoTitle: p.seoTitle,
              seoDescription: p.seoDescription,
              publishedAt: "publishedAt" in result ? result.publishedAt : null,
            }
          : null;
      }),
    );
    return posts.filter((p): p is NonNullable<typeof p> => Boolean(p));
  }

  const { data } = await supabasePublic
    .from("blog_posts")
    .select(
      "id, title, slug, excerpt, content, cover_image_url, seo_title, seo_description, published_at",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);

  return ((data || []) as BlogPostRow[]).map(mapBlogPost);
}

export async function getPublishedBlogPostBySlug(slug: string) {
  const [p, result] = await Promise.all([
    getPageContent("journal", slug),
    readDocument(`journal:${slug}`),
  ]);
  return p
    ? {
        id: slug,
        title: p.title,
        slug,
        excerpt: p.excerpt,
        content: p.body,
        coverImageUrl: p.image.src,
        contentImage: p.image,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        publishedAt: "publishedAt" in result ? result.publishedAt : null,
      }
    : null;
}

export async function getPublishedBlogSlugs() {
  const docs = await listContent("journal");
  if (docs !== null)
    return docs.filter((d) => d.published_revision_id).map((d) => d.slug);
  const { data } = await supabasePublic
    .from("blog_posts")
    .select("slug")
    .eq("status", "published");

  return ((data || []) as { slug: string }[]).map((post) => post.slug);
}

export async function renderMarkdown(markdown: string) {
  const html = marked.parse(markdown, {
    async: false,
    gfm: true,
  });

  return DOMPurify.sanitize(html);
}

type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
};

function mapBlogPost(post: BlogPostRow): PublishedBlogPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImageUrl: post.cover_image_url,
    contentImage: {
      ...emptyImage,
      src: post.cover_image_url || "",
      alt: post.title,
    },
    seoTitle: post.seo_title,
    seoDescription: post.seo_description,
    publishedAt: post.published_at,
  };
}
