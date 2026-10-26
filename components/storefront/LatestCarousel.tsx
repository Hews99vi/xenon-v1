"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductSummary } from "@/lib/storefront";
import { ProductCard } from "./ProductCard";

type LatestCarouselProps = {
  products: ProductSummary[];
  heading?: string;
  compact?: boolean;
};


export function LatestCarousel({
  products,
  heading = "Shop The Latest Styles",
  compact = false,
}: LatestCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const visibleProducts = useMemo(() => {
    return products.slice(0, 12);
  }, [products]);

  const updateScrollState = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const frame = window.requestAnimationFrame(updateScrollState);
    emblaApi.on("select", updateScrollState);
    emblaApi.on("reInit", updateScrollState);

    return () => {
      window.cancelAnimationFrame(frame);
      emblaApi.off("select", updateScrollState);
      emblaApi.off("reInit", updateScrollState);
    };
  }, [emblaApi, updateScrollState]);

  return (
    <section
      className={[
        "bg-[#fbfaf8] text-black",
        compact
          ? "pb-14 pt-16 sm:pb-20 sm:pt-20"
          : "pb-8 pt-5 sm:pb-10 sm:pt-6",
      ].join(" ")}
      aria-label={heading}
    >
      <div className={compact ? "x-gutter" : "px-2 sm:px-4 lg:px-6"}>
        <div className={compact ? "mb-6 flex items-end justify-between gap-5" : "mb-3 flex items-end justify-between gap-3"}>
          <h2 className={[
            "font-black uppercase italic leading-none tracking-[-0.01em] text-black",
            compact
              ? "text-[clamp(1.45rem,2.5vw,2.25rem)]"
              : "text-[clamp(1rem,1.9vw,1.65rem)]",
          ].join(" ")}>
            {heading}
          </h2>

          <div className={compact ? "flex shrink-0 items-center gap-3" : "flex shrink-0 items-center gap-2"}>
            <Link
              href="/products"
              className={[
                "font-black uppercase tracking-[0.14em] text-black transition-opacity hover:opacity-55",
                compact ? "text-xs" : "text-xs",
              ].join(" ")}
            >
              Shop All
            </Link>
            <div className="flex items-center gap-1.5" aria-label="Latest styles carousel controls">
              <button
                type="button"
                onClick={() => emblaApi?.scrollPrev()}
                disabled={!canScrollPrev}
                className={[
                  "grid place-items-center rounded-full border border-black/15 text-black transition-opacity enabled:hover:border-black disabled:opacity-25",
                  compact ? "h-9 w-9" : "h-7 w-7",
                ].join(" ")}
                aria-label="Previous products"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => emblaApi?.scrollNext()}
                disabled={!canScrollNext}
                className={[
                  "grid place-items-center rounded-full border border-black/15 text-black transition-opacity enabled:hover:border-black disabled:opacity-25",
                  compact ? "h-9 w-9" : "h-7 w-7",
                ].join(" ")}
                aria-label="Next products"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {visibleProducts.length ? (
        <div
          ref={emblaRef}
          className={compact ? "overflow-hidden x-gutter" : "overflow-hidden px-2 sm:px-4 lg:px-6"}
        >
          <div className="-ml-1 flex touch-pan-y">
            {visibleProducts.map((product) => (
              <div
                key={product.id}
                className={[
                  "min-w-0 pl-1",
                  compact
                    ? "flex-[0_0_46%] sm:flex-[0_0_32%] lg:flex-[0_0_24%]"
                    : "flex-[0_0_25%]",
                ].join(" ")}
              >
                <ProductCard
                  product={product}
                  imageSizes={
                    compact
                      ? "(min-width: 1024px) 24vw, (min-width: 640px) 32vw, 46vw"
                      : "(min-width: 1024px) 25vw, (min-width: 640px) 42vw, 74vw"
                  }
                  dense={!compact}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="x-gutter">
          <div className="border-y border-black/10 py-12 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
            Featured products will appear here.
          </div>
        </div>
      )}
    </section>
  );
}
