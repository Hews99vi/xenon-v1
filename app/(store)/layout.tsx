import { SiteHeader } from "@/components/storefront/SiteHeader";
import { SiteFooter } from "@/components/storefront/SiteFooter";
import {
  getSiteContent,
  getAvailableAudiences,
  isContentPreview,
  getPreviewTarget,
} from "@/lib/content/server";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return (await isContentPreview())
    ? { robots: { index: false, follow: false } }
    : {};
}
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, audiences, preview] = await Promise.all([
    getSiteContent(),
    getAvailableAudiences(),
    isContentPreview(),
  ]);
  const target = await getPreviewTarget();
  return (
    <div
      data-content-preview={preview ? target?.revision : undefined}
      className="storefront flex min-h-screen flex-col"
    >
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {preview && (
        <div className="preview-bar flex flex-wrap items-center justify-center gap-4 bg-amber-100 px-4 py-2 text-sm text-black">
          <strong>Draft preview · Only visible to admins</strong>
          <form action="/api/content-preview/exit" method="post">
            <button className="underline">Exit preview</button>
          </form>
        </div>
      )}
      <div className="relative flex flex-1 flex-col">
        <SiteHeader
          site={site}
          audiences={audiences}
        />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter site={site} />
      </div>
    </div>
  );
}
