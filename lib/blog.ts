import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { supabasePublic } from "./supabasePublic";

export type PublishedBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
};

export async function getPublishedBlogPosts() {
  const { data } = await supabasePublic
    .from("blog_posts")
    .select("id, title, slug, excerpt, content, cover_image_url, seo_title, seo_description, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);

  return ((data || []) as BlogPostRow[]).map(mapBlogPost);
}

export async function getPublishedBlogPostBySlug(slug: string) {
  const { data } = await supabasePublic
    .from("blog_posts")
    .select("id, title, slug, excerpt, content, cover_image_url, seo_title, seo_description, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return data ? mapBlogPost(data as BlogPostRow) : null;
}

export async function getPublishedBlogSlugs() {
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
    seoTitle: post.seo_title,
    seoDescription: post.seo_description,
    publishedAt: post.published_at,
  };
}
