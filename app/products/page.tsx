import type { Metadata } from "next";
import { ProductFilters } from "@/components/storefront/ProductFilters";
import { absoluteUrl } from "@/lib/seo";
import { getActiveCategories, getProductSummaries } from "@/lib/storefront";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Products | Xenon",
  description: "Shop the Xenon product collection.",
  alternates: {
    canonical: absoluteUrl("/products"),
  },
  openGraph: {
    title: "Products | Xenon",
    description: "Shop the Xenon product collection.",
    url: absoluteUrl("/products"),
    type: "website",
  },
};

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    color?: string;
    size?: string;
    maxPrice?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const {
    q = "",
    category = "",
    color = "",
    size = "",
    maxPrice = "",
  } = await searchParams;
  const [products, categories] = await Promise.all([
    getProductSummaries({
      categorySlug: category || undefined,
      search: q || undefined,
      limit: 60,
    }),
    getActiveCategories(),
  ]);
  const colors = Array.from(new Set(products.flatMap((product) => product.colors))).sort();
  const sizes = Array.from(new Set(products.flatMap((product) => product.sizes))).sort();

  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8">
        <div className="mb-8 border-b border-black pb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
            Collection
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-black">
            Products
          </h1>
        </div>

        <ProductFilters
          key={[q, category, color, size, maxPrice].join(":")}
          initialProducts={products}
          categories={categories}
          colors={colors}
          sizes={sizes}
          selectedFilters={{
            category,
            color,
            size,
            maxPrice,
            search: q,
          }}
        />
      </div>
    </section>
  );
}
