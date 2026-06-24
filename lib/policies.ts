import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { supabasePublic } from "./supabasePublic";

export type PublicPolicyPage = {
  title: string;
  slug: string;
  content: string;
  updatedAt: string;
};

export async function getPolicyBySlug(slug: string) {
  const { data } = await supabasePublic
    .from("policy_pages")
    .select("title, slug, content, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    title: data.title,
    slug: data.slug,
    content: data.content,
    updatedAt: data.updated_at,
  } satisfies PublicPolicyPage;
}

export async function renderPolicyMarkdown(markdown: string) {
  const html = marked.parse(markdown, {
    async: false,
    gfm: true,
  });

  return DOMPurify.sanitize(html);
}
