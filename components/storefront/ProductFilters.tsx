"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CategorySummary, ProductSummary } from "@/lib/storefront";
import { ProductCard } from "./ProductCard";

type ProductFiltersProps = {
  initialProducts: ProductSummary[];
  categories: CategorySummary[];
  colors: string[];
  sizes: string[];
  selectedFilters: {
    category: string;
    color: string;
    size: string;
    maxPrice: string;
    search: string;
  };
};

export function ProductFilters({
  initialProducts,
  categories,
  colors,
  sizes,
  selectedFilters,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(selectedFilters.search);

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (search === selectedFilters.search) {
      return;
    }

    const timeout = window.setTimeout(() => {
      updateFilter("q", search);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search, selectedFilters.search, updateFilter]);

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      const effectivePrice = product.salePrice || product.basePrice;

      if (selectedFilters.color && !product.colors.includes(selectedFilters.color)) {
        return false;
      }

      if (selectedFilters.size && !product.sizes.includes(selectedFilters.size)) {
        return false;
      }

      if (
        selectedFilters.maxPrice &&
        effectivePrice > Number(selectedFilters.maxPrice)
      ) {
        return false;
      }

      return true;
    });
  }, [
    initialProducts,
    selectedFilters.color,
    selectedFilters.maxPrice,
    selectedFilters.size,
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside className="border border-black bg-white p-5 lg:sticky lg:top-6 lg:h-fit">
        <p className="mb-5 border-b border-black pb-4 text-xs font-semibold uppercase tracking-[0.28em]">
          Filter
        </p>

        <div className="space-y-5">
          <FilterField label="Search">
            <input
              className="store-input"
              placeholder="Name or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </FilterField>

          <FilterField label="Category">
            <select
              className="store-input"
              value={selectedFilters.category}
              onChange={(event) => updateFilter("category", event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Color">
            <select
              className="store-input"
              value={selectedFilters.color}
              onChange={(event) => updateFilter("color", event.target.value)}
            >
              <option value="">All colors</option>
              {colors.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Size">
            <select
              className="store-input"
              value={selectedFilters.size}
              onChange={(event) => updateFilter("size", event.target.value)}
            >
              <option value="">All sizes</option>
              {sizes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Max price">
            <input
              className="store-input"
              min="0"
              placeholder="LKR"
              type="number"
              value={selectedFilters.maxPrice}
              onChange={(event) => updateFilter("maxPrice", event.target.value)}
            />
          </FilterField>

          <button
            className="w-full border border-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em]"
            type="button"
            onClick={() => {
              setSearch("");
              startTransition(() => {
                router.replace(pathname, { scroll: false });
              });
            }}
          >
            Reset
          </button>
        </div>
      </aside>

      <div>
        <div className="mb-5 flex items-center justify-between border-b border-black pb-4 text-xs uppercase tracking-[0.22em]">
          <span>
            {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
          </span>
          <span>{isPending ? "Updating" : "Ready"}</span>
        </div>

        {filteredProducts.length ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="border border-black bg-white p-8 text-center text-sm text-neutral-600">
            No products match these filters.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-neutral-600">
        {label}
      </span>
      {children}
    </label>
  );
}
