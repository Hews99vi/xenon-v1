/* eslint-disable @next/next/no-img-element */

import type { HomepageSection, HomepageSectionItem } from "@/lib/storefront";

const fallbackValues = [
  "CONSIDERED SILHOUETTES",
  "EVERYDAY LUXURY",
  "MEN AND WOMEN EDITS",
];

const fallbackTiles = [
  {
    label: "Fabric / Detail",
    src: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=1100&q=85",
    className: "col-span-5 aspect-[4/5] self-end sm:col-span-4 lg:col-span-5",
    objectPosition: "42% 20%",
  },
  {
    label: "Model / Editorial",
    src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1100&q=85",
    className: "col-span-7 aspect-[5/6] sm:col-span-5 lg:col-span-7",
    objectPosition: "58% 16%",
  },
  {
    label: "Product / Close-Up",
    src: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1100&q=85",
    className: "col-span-8 col-start-3 aspect-[16/9] sm:col-span-6 sm:col-start-4 lg:col-span-6 lg:col-start-6",
    objectPosition: "50% 28%",
  },
];

export function AtelierSection({ section }: { section?: HomepageSection | null }) {
  const values = getValues(section);
  const tiles = getTiles(section);
  const microLabel = section?.microLabel || "ATELIER";
  const title = section?.title || "PRECISION IN RESTRAINT";
  const body =
    section?.body ||
    "Xenon is built around monochrome silhouettes, clean construction, and everyday refinement.";

  return (
    <section id="atelier" className="w-full bg-black py-10 text-white sm:py-12 lg:py-16" aria-label="Atelier brand story">
      <div className="grid gap-7 px-2 sm:px-4 md:grid-cols-[0.78fr_1.22fr] md:gap-5 lg:px-6 lg:gap-8">
        <div className="flex flex-col justify-between md:min-h-[28rem] lg:min-h-[32rem]">
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/45">
              {microLabel}
            </p>
            <h2 className="max-w-[10ch] text-[clamp(2rem,4.3vw,5.5rem)] font-black uppercase italic leading-[0.9] tracking-[-0.025em] text-white">
              {title}
            </h2>
            <p className="mt-3 max-w-[28rem] text-[0.75rem] font-medium leading-5 text-white/62 sm:text-[0.82rem] sm:leading-6">
              {body}
            </p>
          </div>

          <div className="mt-6 border-t border-white/18">
            {values.map((value) => (
              <div
                key={value}
                className="flex items-center justify-between border-b border-white/18 py-3 text-xs font-black uppercase tracking-[0.14em] text-white"
              >
                <span>{value}</span>
                <span className="text-white/32" aria-hidden="true">+</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-1 self-end">
          {tiles.map((tile) => (
            <figure key={tile.label} className={`${tile.className} group relative overflow-hidden bg-white/8`}>
              <img
                src={tile.src}
                alt=""
                aria-hidden="true"
                decoding="async"
                className="h-full w-full object-cover opacity-82 grayscale transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                style={{ objectPosition: tile.objectPosition }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.58), rgba(0,0,0,0.04) 56%)",
                }}
                aria-hidden="true"
              />
              <figcaption className="absolute bottom-3 left-3 text-xs font-black uppercase tracking-[0.18em] text-white/70">
                {tile.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function getValues(section?: HomepageSection | null) {
  const values = section?.metadata.values;
  if (Array.isArray(values)) {
    const normalized = values.filter((value): value is string => typeof value === "string");
    if (normalized.length) {
      return normalized;
    }
  }

  return fallbackValues;
}

function getTiles(section?: HomepageSection | null) {
  if (!section?.items.length) {
    return fallbackTiles;
  }

  return section.items.map((item) => ({
    label: item.title,
    src: item.imageUrl || "/images/hero.png",
    className: getAtelierTileClass(item),
    objectPosition:
      typeof item.metadata.objectPosition === "string"
        ? item.metadata.objectPosition
        : "50% 50%",
  }));
}

function getAtelierTileClass(item: HomepageSectionItem) {
  switch (item.metadata.layout) {
    case "detail":
      return "col-span-5 aspect-[4/5] self-end sm:col-span-4 lg:col-span-5";
    case "wide":
      return "col-span-8 col-start-3 aspect-[16/9] sm:col-span-6 sm:col-start-4 lg:col-span-6 lg:col-start-6";
    case "editorial":
    default:
      return "col-span-7 aspect-[5/6] sm:col-span-5 lg:col-span-7";
  }
}
