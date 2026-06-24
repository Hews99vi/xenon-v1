import { absoluteUrl } from "@/lib/seo";

export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/

Sitemap: ${absoluteUrl("/sitemap.xml")}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
