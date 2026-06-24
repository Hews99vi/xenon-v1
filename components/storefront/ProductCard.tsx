/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ProductSummary } from "@/lib/storefront";

export function formatPrice(value: number) {
  return `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <article className="group border border-black bg-white">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="aspect-[4/5] overflow-hidden border-b border-black bg-neutral-100">
          {product.primaryImage ? (
            <img
              src={product.primaryImage}
              alt={product.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fff_0%,#fff_45%,#0a0a0a_45%,#0a0a0a_55%,#fff_55%,#f4f4f4_100%)] text-xs uppercase tracking-[0.24em]">
              Xenon
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-neutral-500">
          {product.categoryName || "Collection"}
        </p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="text-base font-semibold text-black transition group-hover:underline">
            {product.name}
          </h3>
        </Link>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {product.salePrice ? (
            <>
              <span className="font-semibold">{formatPrice(product.salePrice)}</span>
              <span className="text-neutral-500 line-through">
                {formatPrice(product.basePrice)}
              </span>
            </>
          ) : (
            <span className="font-semibold">{formatPrice(product.basePrice)}</span>
          )}
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="mt-4 inline-flex w-full items-center justify-center border border-black bg-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800"
        >
          Quick view
        </Link>
      </div>
    </article>
  );
}
