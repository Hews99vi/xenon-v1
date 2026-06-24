/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/ProductCard";
import { absoluteUrl } from "@/lib/seo";
import {
  getAllCategorySlugs,
  getCategoryBySlug,
  getProductSummaries,
} from "@/lib/storefront";

export const revalidate = 300;

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {};
  }

  return {
    title: `${category.name} | Xenon`,
    description:
      category.description ||
      `Shop ${category.name} from the Xenon collection.`,
    alternates: {
      canonical: absoluteUrl(`/categories/${category.slug}`),
    },
    openGraph: {
      title: `${category.name} | Xenon`,
      description: category.description || undefined,
      url: absoluteUrl(`/categories/${category.slug}`),
      type: "website",
      images: category.imageUrl ? [category.imageUrl] : undefined,
    },
  };
}

export async function generateStaticParams() {
  const slugs = await getAllCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const [category, products] = await Promise.all([
    getCategoryBySlug(slug),
    getProductSummaries({ categorySlug: slug }),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8">
        <div className="mb-8 grid gap-8 border-b border-black pb-8 lg:grid-cols-[1fr_24rem]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
              Category
            </p>
            <h1 className="text-4xl font-semibold tracking-normal text-black">
              {category.name}
            </h1>
            {category.description ? (
              <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-700">
                {category.description}
              </p>
            ) : null}
          </div>
          {category.imageUrl ? (
            <div className="aspect-[4/3] overflow-hidden border border-black bg-white">
              <img
                src={category.imageUrl}
                alt={category.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        {products.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="border border-black bg-white p-8 text-sm text-neutral-600">
            No active products in this category yet.
          </div>
        )}
      </div>
    </section>
  );
}
