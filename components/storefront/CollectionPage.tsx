import { notFound } from "next/navigation";
import { ProductFilters } from "./ProductFilters";
import {
  getActiveCategories,
  getProductSummariesPage,
  getProductFilterOptions,
  type ProductSortOption,
} from "@/lib/storefront";
export type CollectionParams = {
  q?: string;
  category?: string;
  tag?: string;
  color?: string;
  size?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
  gender?: string;
};
export async function CollectionPage({
  params,
  categorySlug,
}: {
  params: CollectionParams;
  categorySlug?: string;
}) {
  const q = params.q || "",
    category = categorySlug || params.category || "",
    gender = ["women", "men"].includes(params.gender || "")
      ? params.gender!
      : "",
    tag = params.tag || "";
  const sort: ProductSortOption = ["price-asc", "price-desc"].includes(
    params.sort || "",
  )
    ? (params.sort as ProductSortOption)
    : "newest";
  const page = Math.max(1, parseInt(params.page || "1") || 1);
  const price = (v?: string) =>
    v && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined;
  const [result, categories, options] = await Promise.all([
    getProductSummariesPage({
      search: q,
      categorySlug: category || undefined,
      audience: gender,
      color: params.color,
      size: params.size,
      minPrice: price(params.minPrice),
      maxPrice: price(params.maxPrice),
      sort,
      page,
      pageSize: 24,
    }),
    getActiveCategories(),
    getProductFilterOptions({
      search: q,
      categorySlug: category || undefined,
      audience: gender,
    }),
  ]);
  const active = categories.find((c) => c.slug === category);
  if (categorySlug && !active) notFound();
  const title = q
    ? `Results for “${q}”`
    : active?.name ||
      (gender
        ? `${gender === "women" ? "Women's" : "Men's"} collection`
        : tag === "new"
          ? "New arrivals"
          : "The collection");
  return (
    <section className="bg-white">
      <div className="x-container pb-7 pt-10 sm:pt-14">
        <h1 className="text-4xl font-normal tracking-[-0.035em] sm:text-5xl">
          {title}
        </h1>
        {active?.description && (
          <p className="mt-3 max-w-xl text-base text-neutral-600">
            {active.description}
          </p>
        )}
      </div>
      <div className="x-container pb-16">
        <ProductFilters
          initialProducts={result.products}
          categories={categories}
          colors={options.colors}
          sizes={options.sizes}
          pagination={result}
          selectedFilters={{
            category,
            color: params.color || "",
            size: params.size || "",
            minPrice: params.minPrice || "",
            maxPrice: params.maxPrice || "",
            search: q,
            sort,
            gender,
          }}
        />
      </div>
    </section>
  );
}
