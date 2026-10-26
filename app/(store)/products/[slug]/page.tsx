import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductRow } from "@/components/content/ProductRow";
import { getPageContent } from "@/lib/content/server";
import { renderPolicyMarkdown } from "@/lib/policies";
import { ProductDetailClient } from "@/components/storefront/ProductDetailClient";
import { absoluteUrl } from "@/lib/seo";
import {
  getAllProductSlugs,
  getProductBySlug,
  getProductSummaries,
} from "@/lib/storefront";

export const revalidate = 300;

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {};
  }

  return {
    title: product.seoTitle || `${product.name} | Xenon`,
    description:
      product.seoDescription ||
      product.shortDescription ||
      product.description ||
      "Luxury black-and-white fashion by Xenon. Crafted in Sri Lanka.",
    alternates: {
      canonical: absoluteUrl(`/products/${product.slug}`),
    },
    openGraph: {
      title: product.seoTitle || product.name,
      description:
        product.seoDescription ||
        product.shortDescription ||
        product.description ||
        undefined,
      url: absoluteUrl(`/products/${product.slug}`),
      type: "website",
      images: product.primaryImage ? [product.primaryImage] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const categoryProducts = (
    await getProductSummaries({
      categorySlug: product.categorySlug || undefined,
      limit: 12,
    })
  ).filter((item) => item.id !== product.id);

  const fallbackProducts =
    categoryProducts.length < 4
      ? (await getProductSummaries({ limit: 12 })).filter(
          (item) => item.id !== product.id,
        )
      : [];

  const relatedProducts = Array.from(
    new Map(
      [...categoryProducts, ...fallbackProducts].map((item) => [item.id, item]),
    ).values(),
  ).slice(0, 12);

  const [guide, returns] = await Promise.all([getPageContent("page", "size-guide"), getPageContent("page", "return-policy")]);
  const sizeGuideHtml=guide?.body.trim() ? await renderPolicyMarkdown(guide.body) : undefined;
  const returnsHtml=returns ? await renderPolicyMarkdown(returns.body) : undefined;

  /* Schema.org JSON-LD */
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.seoDescription ||
      product.shortDescription ||
      product.description ||
      undefined,
    image: product.images.map((img) => img.imageUrl),
    sku: product.variants[0]?.sku,
    category: product.categoryName || undefined,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: "LKR",
      price: String(product.salePrice ?? product.basePrice),
      availability: product.variants.some((v) => v.isActive && v.stockQuantity > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <section className="bg-white pb-20 lg:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g,"\\u003c") }}
      />

      {/* ── Breadcrumb ── */}
      <div className="hidden border-b border-black/8 px-5 py-4 sm:px-6 lg:block">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 overflow-x-auto whitespace-nowrap"
        >
          <Link href="/" className="xenon-label text-[--xenon-muted] hover:text-[--xenon-black] transition-colors">
            Xenon
          </Link>
          <span className="xenon-label text-neutral-300">/</span>
          <Link href="/products" className="xenon-label text-[--xenon-muted] hover:text-[--xenon-black] transition-colors">
            Collection
          </Link>
          {product.categoryName && (
            <>
              <span className="xenon-label text-neutral-300">/</span>
              <Link
                href={`/categories/${product.categorySlug}`}
                className="xenon-label text-[--xenon-muted] hover:text-[--xenon-black] transition-colors"
              >
                {product.categoryName}
              </Link>
            </>
          )}
          <span className="xenon-label text-neutral-300">/</span>
          <span className="xenon-label text-[--xenon-black]">{product.name}</span>
        </nav>
      </div>

      {/* ── Product detail ── */}
      <ProductDetailClient product={product} sizeGuideHtml={sizeGuideHtml} returnsHtml={returnsHtml} />

      {/* ── Related products ── */}
      <ProductRow
        products={relatedProducts}
        title="You may also like"
        link={{label:"Shop all",href:"/products"}}
      />
    </section>
  );
}
