import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/storefront/ProductDetailClient";
import { absoluteUrl } from "@/lib/seo";
import { getAllProductSlugs, getProductBySlug } from "@/lib/storefront";

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
      "Luxury black-and-white commerce by Xenon.",
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
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.seoDescription ||
      product.shortDescription ||
      product.description ||
      undefined,
    image: product.images.map((image) => image.imageUrl),
    sku: product.variants[0]?.sku,
    category: product.categoryName || undefined,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: "LKR",
      price: String(product.salePrice || product.basePrice),
      availability: product.variants.some((variant) => variant.stockQuantity > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <section className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8">
        <ProductDetailClient product={product} />
      </div>
    </section>
  );
}
