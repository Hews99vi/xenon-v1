import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { getPageContent, readDocument } from "./content/server";

export type PublicPolicyPage = {
  title: string;
  slug: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  updatedAt: string;
};

export async function getPolicyBySlug(slug: string) {
  const page = await getPageContent("page", slug);
  if (!page) return null;
  const result = await readDocument(`page:${slug}`);
  return {
    title: page.title,
    slug,
    content: page.body,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    updatedAt:
      ("publishedAt" in result && result.publishedAt) ||
      result.document?.updated_at ||
      new Date().toISOString(),
  } satisfies PublicPolicyPage;
}

export async function renderPolicyMarkdown(markdown: string) {
  const html = marked.parse(markdown, {
    async: false,
    gfm: true,
  });

  return DOMPurify.sanitize(html);
}
