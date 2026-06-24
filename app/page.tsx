/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/storefront/ProductCard";
import { absoluteUrl } from "@/lib/seo";
import {
  getActiveCategories,
  getHeroBanners,
  getProductSummaries,
} from "@/lib/storefront";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Xenon | Luxury Black-and-White Commerce",
  description:
    "Shop Xenon collections, featured products, and monochrome luxury essentials.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: "Xenon",
    description:
      "Shop Xenon collections, featured products, and monochrome luxury essentials.",
    url: absoluteUrl("/"),
    type: "website",
  },
};

export default async function Home() {
  const [banners, featuredProducts, categories] = await Promise.all([
    getHeroBanners(),
    getProductSummaries({ featuredOnly: true }),
    getActiveCategories(4),
  ]);
  const hero = banners[0];

  return (
    <div className="bg-background">
      <section className="border-b border-black bg-white">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center gap-10 px-6 py-12 sm:px-8 lg:grid-cols-[1fr_0.92fr]">
          <div className="max-w-2xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
              Black and white luxury commerce
            </p>
            <h1 className="text-5xl font-semibold leading-none tracking-normal text-black sm:text-6xl lg:text-7xl">
              {hero?.title || "Xenon"}
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-neutral-700 sm:text-lg">
              {hero?.subtitle ||
                "A refined edit of monochrome silhouettes, precise tailoring, and considered accessories."}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href={hero?.ctaUrl || "/products"}
                className="inline-flex items-center justify-center border border-black bg-black px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-neutral-800"
              >
                {hero?.ctaLabel || "Shop now"}
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center border border-black bg-white px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-black transition hover:bg-neutral-100"
              >
                View collection
              </Link>
            </div>
          </div>

          <div className="border border-black bg-background p-4">
            <div className="aspect-[4/5] overflow-hidden border border-black bg-neutral-100">
              {hero?.imageUrl ? (
                <img
                  src={hero.imageUrl}
                  alt={hero.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fff_0%,#fff_45%,#0a0a0a_45%,#0a0a0a_55%,#fff_55%,#f4f4f4_100%)] text-xs uppercase tracking-[0.24em]">
                  Xenon
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-8">
        <div className="mb-8 flex flex-col gap-4 border-b border-black pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
              Featured
            </p>
            <h2 className="text-3xl font-semibold">Selected pieces</h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-semibold uppercase tracking-[0.22em] underline"
          >
            Shop all
          </Link>
        </div>

        {featuredProducts.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="border border-black bg-white p-8 text-sm text-neutral-600">
            Featured products will appear here once marked active and featured.
          </div>
        )}
      </section>

      <section className="border-t border-black bg-white">
        <div className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-8">
          <div className="mb-8 border-b border-black pb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
              Categories
            </p>
            <h2 className="text-3xl font-semibold">Explore the edit</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group border border-black bg-background"
              >
                <div className="aspect-[4/3] overflow-hidden border-b border-black bg-neutral-100">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full bg-[linear-gradient(135deg,#fff_0%,#fff_45%,#0a0a0a_45%,#0a0a0a_55%,#fff_55%,#f4f4f4_100%)]" />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-600">
                    {category.description || "Discover monochrome essentials."}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
