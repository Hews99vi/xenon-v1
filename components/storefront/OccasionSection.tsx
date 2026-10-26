"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import type { HomepageSection } from "@/lib/storefront";

type Gender = "men" | "women";

type Occasion = {
  name: string;
  copy: string;
  slug: string;
  image: string;
  objectPosition: string;
  ctaLabel: string;
  ctaHref: string;
};

const fallbackOccasions: Occasion[] = [
  {
    name: "WORK",
    copy: "Sharp essentials for long days.",
    slug: "work",
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1100&q=85",
    objectPosition: "42% 18%",
    ctaLabel: "Shop Now",
    ctaHref: "/products?q=work",
  },
  {
    name: "EVENING",
    copy: "Quiet pieces after dark.",
    slug: "evening",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1100&q=85",
    objectPosition: "54% 16%",
    ctaLabel: "Shop Now",
    ctaHref: "/products?q=evening",
  },
  {
    name: "WEEKEND",
    copy: "Relaxed silhouettes, refined.",
    slug: "weekend",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=85",
    objectPosition: "62% 20%",
    ctaLabel: "Shop Now",
    ctaHref: "/products?q=weekend",
  },
  {
    name: "TRAVEL",
    copy: "Movement without noise.",
    slug: "travel",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1100&q=85",
    objectPosition: "48% 22%",
    ctaLabel: "Shop Now",
    ctaHref: "/products?q=travel",
  },
];

export function OccasionSection({ section }: { section?: HomepageSection | null }) {
  const defaultGender = section?.metadata.defaultGender === "women" ? "women" : "men";
  const [gender, setGender] = useState<Gender>(defaultGender);
  const occasions = getOccasions(section);
  const microLabel = section?.microLabel || "STYLE CODES";
  const title = section?.title || "SHOP BY OCCASION";

  return (
    <section className="bg-[#fbfaf8] pb-10 pt-3 text-black sm:pb-12 sm:pt-4" aria-label="Shop by occasion">
      <div className="px-2 sm:px-4 lg:px-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
              {microLabel}
            </p>
            <h2 className="text-[clamp(1rem,1.9vw,1.65rem)] font-black uppercase italic leading-none tracking-[-0.01em] text-black">
              {title}
            </h2>
          </div>

          <div className="flex shrink-0 border border-black text-xs font-black uppercase tracking-[0.12em]">
            {(["men", "women"] as const).map((item) => (
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
        </div>
      </div>

      <div className="overflow-x-auto px-2 scrollbar-none sm:px-4 lg:px-6">
        <div className="-ml-1 flex min-w-full touch-pan-x">
          {occasions.map((occasion) => (
            <div
              key={`${gender}-${occasion.slug}`}
              className="min-w-0 flex-[0_0_25%] pl-1"
            >
              <OccasionTile occasion={occasion} gender={gender} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function getOccasions(section?: HomepageSection | null): Occasion[] {
  if (!section?.items.length) {
    return fallbackOccasions;
  }

  return section.items.map((item) => ({
    name: item.title,
    copy: item.subtitle || "",
    slug: slugify(item.title),
    image: item.imageUrl || "/images/hero.png",
    objectPosition:
      typeof item.metadata.objectPosition === "string"
        ? item.metadata.objectPosition
        : "50% 50%",
    ctaLabel: item.ctaLabel || "Shop Now",
    ctaHref: item.ctaUrl || `/products?q=${encodeURIComponent(item.title.toLowerCase())}`,
  }));
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function OccasionTile({
  occasion,
  gender,
}: {
  occasion: Occasion;
  gender: Gender;
}) {
  return (
    <Link
      href={withGender(occasion.ctaHref, gender)}
      className="group relative block aspect-[3/4] overflow-hidden bg-black lg:aspect-[4/5]"
      aria-label={`Shop ${gender} ${occasion.name}`}
    >
      <img
        src={occasion.image}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        style={{ objectPosition: occasion.objectPosition }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-95"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.42) 42%, rgba(0,0,0,0.06) 78%)",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 px-3 pb-3 text-white sm:px-4 sm:pb-4">
        <h3 className="text-[clamp(0.82rem,1.6vw,1.35rem)] font-black uppercase italic leading-[0.92] tracking-[-0.02em]">
          {occasion.name}
        </h3>
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover:max-h-24 group-hover:opacity-100 group-focus-visible:max-h-24 group-focus-visible:opacity-100">
          <p className="mt-3 max-w-[15rem] text-[0.78rem] font-medium leading-5 text-white/82">
            {occasion.copy}
          </p>
          <span className="mt-3 inline-flex bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-black">
            {occasion.ctaLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

function withGender(href: string, gender: Gender) {
  if (!href.startsWith("/products")) {
    return href;
  }

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}gender=${gender}`;
}
