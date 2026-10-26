import { listContent } from "@/lib/content/server";
import { contentPath } from "@/lib/content/schema";
import { supabasePublic } from "@/lib/supabasePublic";
import { getPublishedBlogSlugs } from "@/lib/blog";
import { absoluteUrl } from "@/lib/seo";
import { getAllCategorySlugs, getAllProductSlugs } from "@/lib/storefront";

export const revalidate = 300;

export async function GET() {
  const [productSlugs, categorySlugs, blogSlugs, pageDocuments] = await Promise.all([
    getAllProductSlugs(),
    getAllCategorySlugs(),
    getPublishedBlogSlugs(),
    listContent("page"),
  ]);
  const pageSlugs=pageDocuments===null?(await supabasePublic.from("policy_pages").select("slug").eq("status","published")).data?.map(p=>p.slug)||[]:pageDocuments.filter(d=>d.published_revision_id).map(d=>d.slug);
  const urls = [
    { loc: absoluteUrl("/"), priority: "1.0" },
    { loc: absoluteUrl("/products"), priority: "0.9" },
    { loc: absoluteUrl("/blog"), priority: "0.7" },
    ...pageSlugs.map(slug=>({loc:absoluteUrl(contentPath("page",slug)),priority:"0.3"})),
    ...categorySlugs.map((slug) => ({
      loc: absoluteUrl(`/categories/${slug}`),
      priority: "0.8",
    })),
    ...productSlugs.map((slug) => ({
      loc: absoluteUrl(`/products/${slug}`),
      priority: "0.8",
    })),
    ...blogSlugs.map((slug) => ({
      loc: absoluteUrl(`/blog/${slug}`),
      priority: "0.6",
    })),
  ];
  const lastmod = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
