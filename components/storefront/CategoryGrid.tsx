"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CategorySummary } from "@/lib/storefront";

type CategoryGridProps = {
  categories: CategorySummary[];
};

type CategoryTileData = {
  id: string;
  name: string;
  slug: string;
  image: string;
  objectPosition: string;
};

const fallbackImages = [
  { keywords: ["sports bra", "bra", "crop"], image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1100&q=85", objectPosition: "58% 18%" },
  { keywords: ["legging", "tight"], image: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=1100&q=85", objectPosition: "70% 24%" },
  { keywords: ["t-shirt", "tee", "shirt"], image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1100&q=85", objectPosition: "64% 20%" },
  { keywords: ["dress"], image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1100&q=85", objectPosition: "42% 18%" },
  { keywords: ["accessori", "bag", "hat"], image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1100&q=85", objectPosition: "50% 28%" },
  { keywords: ["pant", "jogger", "sweat"], image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1100&q=85", objectPosition: "52% 24%" },
  { keywords: ["short"], image: "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1100&q=85", objectPosition: "46% 24%" },
  { keywords: ["jacket", "hoodie", "outerwear"], image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1100&q=85", objectPosition: "36% 18%" },
];

function getFallbackImage(categoryName: string) {
  const lower = categoryName.toLowerCase();
  for (const fallback of fallbackImages) {
    if (fallback.keywords.some((k) => lower.includes(k))) {
      return fallback;
    }
  }
  // Generic high-contrast fashion fallback
  return { image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1100&q=85", objectPosition: "50% 50%" };
}

function isWomenCategory(category: CategorySummary) {
  return /women|woman|womens|woman's|women's|lady|girl/i.test(
    `${category.name} ${category.slug}`,
  );
}

function isMenCategory(category: CategorySummary) {
  const value = `${category.name} ${category.slug}`;
  return /(^|[\s-])(men|man|mens|man's|men's|boy|guy)([\s-]|$)/i.test(value);
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const [gender, setGender] = useState<"women" | "men">("women");
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const activeCategories = useMemo(() => {
    const womenCategories = categories.filter(isWomenCategory);
    const menCategories = categories.filter(
      (category) => isMenCategory(category) && !isWomenCategory(category),
    );
    const unisexCategories = categories.filter(
      (category) => !isWomenCategory(category) && !isMenCategory(category),
    );
    const genderCategories = gender === "women" ? womenCategories : menCategories;
    const tabCategories = genderCategories.length
      ? [...genderCategories, ...unisexCategories]
      : categories;

    return tabCategories.map((c) => {
      let image = c.imageUrl;
      let objectPosition = "50% 50%";

      if (!image) {
        const fallback = getFallbackImage(c.name);
        image = fallback.image;
        objectPosition = fallback.objectPosition;
      }

      // Clean up the name for the grid tile display (e.g. "Women's T-Shirts" -> "T-SHIRTS")
      const cleanName = c.name.replace(/women's |men's |womens |mens /gi, "").toUpperCase();

      return {
        id: c.id,
        name: cleanName,
        slug: c.slug,
        image,
        objectPosition,
      };
    });
  }, [categories, gender]);

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

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
    emblaApi.scrollTo(0);
    const frame = window.requestAnimationFrame(updateScrollState);

    return () => window.cancelAnimationFrame(frame);
  }, [activeCategories, emblaApi, updateScrollState]);

  // If there are literally no active categories (e.g. empty database), do not render the section
  if (!activeCategories.length) {
    return null;
  }

  return (
    <section className="bg-[#fbfaf8] py-8 text-black sm:py-10" aria-label="Shop by category">
      <div className="px-2 sm:px-4 lg:px-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
              BUILD YOUR STYLE
            </p>
            <h2 className="text-[clamp(1rem,1.9vw,1.65rem)] font-black uppercase italic leading-none tracking-[-0.01em] text-black">
              SHOP BY CATEGORY
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="flex border border-black text-xs font-black uppercase tracking-[0.12em]">
              {(["women", "men"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGender(item)}
                  className={[
                    "px-3 py-1.5 transition-colors",
                    gender === item ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-100",
                  ].join(" ")}
                  aria-pressed={gender === item}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1" aria-label="Category carousel controls">
              <button
                type="button"
                onClick={() => emblaApi?.scrollPrev()}
                disabled={!canScrollPrev}
                className="grid h-7 w-7 place-items-center rounded-full border border-black/15 text-black transition-opacity enabled:hover:border-black disabled:opacity-25"
                aria-label="Previous categories"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => emblaApi?.scrollNext()}
                disabled={!canScrollNext}
                className="grid h-7 w-7 place-items-center rounded-full border border-black/15 text-black transition-opacity enabled:hover:border-black disabled:opacity-25"
                aria-label="Next categories"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div ref={emblaRef} className="overflow-hidden px-2 sm:px-4 lg:px-6">
        <div className="-ml-1 flex touch-pan-y">
          {activeCategories.map((category) => (
            <div
              key={`${gender}-${category.id}`}
              className="min-w-0 flex-[0_0_25%] pl-1"
            >
              <CategoryTile category={category} />
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

function CategoryTile({ category }: { category: CategoryTileData }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group relative block aspect-[3/4] overflow-hidden bg-black"
      aria-label={`Shop ${category.name}`}
    >
      <img
        src={category.image}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        style={{ objectPosition: category.objectPosition }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-90"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.74) 0%, rgba(0,0,0,0.28) 42%, rgba(0,0,0,0.04) 76%)",
        }}
        aria-hidden="true"
      />
      <h3 className="absolute inset-x-0 bottom-0 px-2 pb-2 text-[clamp(0.82rem,1.6vw,1.35rem)] font-black uppercase italic leading-[0.92] tracking-[-0.02em] text-white sm:px-3 sm:pb-3">
        {category.name}
      </h3>
    </Link>
  );
}
