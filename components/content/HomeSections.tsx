import Link from "next/link";
import { ContentImage } from "./ContentImage";
import { ProductRow } from "./ProductRow";
import { getActiveCategories, getProductSummaries } from "@/lib/storefront";
import {
  matchesAudience,
  emptyImage,
  type ContentSection,
  type ContentLink,
  audienceLink,
} from "@/lib/content/schema";
export async function HomeSections({
  sections,
}: {
  sections: ContentSection[];
}) {
  return (
    <>
      {await Promise.all(
        sections
          .filter((s) => s.enabled)
          .map(async (s) => {
            if (s.type === "hero" || s.type === "campaign")
              return (
                <section key={s.id} className={`campaign-gallery ${s.type === "hero" ? "campaign-hero" : "campaign-secondary"}`}>
                  <div className="campaign-copy">
                    {s.type === "hero" ? <h1 className="campaign-heading">{s.title}</h1> : <h2 className="campaign-heading">{s.title}</h2>}
                    {s.eyebrow && <p>{s.eyebrow}</p>}
                    {s.body && <p>{s.body}</p>}
                    <div className="campaign-actions">
                      <Action link={s.primary}/>
                      <Action link={s.secondary} outline/>
                    </div>
                  </div>
                  <ContentImage image={s.image} priority={s.type === "hero"} className="campaign-media"/>
                </section>
              );
            if (s.type === "products") {
              let products;
              try {
                products = await getProductSummaries({
                  limit: s.source === "manual" ? s.productIds.length : 12,
                  featuredOnly: s.source === "featured",
                  categorySlug:
                    s.source === "category" ? s.category : undefined,
                  productIds: s.source === "manual" ? s.productIds : undefined,
                  audience: s.audience,
                });
              } catch {
                return (
                  <section key={s.id} className="x-container py-10">
                    <h2 className="section-heading">{s.title}</h2>
                    <p className="mt-4 text-neutral-600">
                      Products are temporarily unavailable. Please try again
                      shortly.
                    </p>
                  </section>
                );
              }
              return products.length ? (
                <ProductRow
                  key={s.id}
                  products={products}
                  title={s.title}
                  eyebrow={s.eyebrow}
                  body={s.body}
                  link={s.link}
                />
              ) : null;
            }
            if (s.type === "categories") {
              const all = await getActiveCategories();
              const categories = (
                s.source === "manual"
                  ? s.categoryIds.flatMap((id) =>
                      all.filter((c) => c.id === id),
                    )
                  : all
              ).filter((c) =>
                matchesAudience(
                  c.audience || null,
                  s.audience === "all" ? undefined : s.audience,
                ),
              );
              if (!categories.length) return null;
              return (
                <section key={s.id} className="content-section">
                  <Heading
                    title={s.title}
                    eyebrow={s.eyebrow}
                    body={s.body}
                    link={s.link}
                  />
                  <div className="tile-row">
                    {categories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/categories/${c.slug}${s.audience !== "all" ? `?gender=${s.audience}` : ""}`}
                        className="content-tile"
                      >
                        <ContentImage
                          image={{
                            ...emptyImage,
                            src: c.imageUrl || "",
                            alt: c.name,
                          }}
                          className="absolute inset-0 h-full w-full"
                        />
                        <div className="tile-overlay" />
                        <h3>{c.name}</h3>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            }
            if (s.type === "occasions") {
              const items = s.items.filter(
                (i) =>
                  i.enabled &&
                  (s.audience === "all" ||
                    i.audience === "all" ||
                    i.audience === s.audience ||
                    i.audience === "unisex"),
              );
              if (!items.length) return null;
              return (
                <section key={s.id} className="content-section">
                  <Heading title={s.title} eyebrow={s.eyebrow} body={s.body} />
                  <div className="tile-row">
                    {items.map((i) => {
                      const href = audienceLink(
                        i.link.href,
                        s.audience !== "all" ? s.audience : i.audience,
                      );
                      return (
                        <div className="content-tile" key={i.id}>
                          <ContentImage
                            image={i.image}
                            className="absolute inset-0 h-full w-full"
                          />
                          <div className="tile-overlay" />
                          <div className="relative z-10 mt-auto p-4 text-white">
                            <h3 className="!static line-clamp-2 !p-0">
                              {i.title}
                            </h3>
                            {i.body && (
                              <p className="mt-2 line-clamp-2 text-sm">
                                {i.body}
                              </p>
                            )}
                            {href && (
                              <Link
                                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
                                href={href}
                              >
                                {i.link.label || i.title}
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            }
            if (s.type === "story")
              return (
                <section key={s.id} id="atelier" className="bg-[var(--x-smoke)]">
                  <div
                    className={`x-container story-section ${!s.image.src ? "!grid-cols-1" : ""}`}
                  >
                    <div>
                      <Heading
                        title={s.title}
                        eyebrow={s.eyebrow}
                        body={s.body}
                        inset={false}
                      />
                      {s.values.filter(Boolean).length > 0 && (
                        <ul className="story-values">
                          {s.values.filter(Boolean).map((v, i) => (
                            <li
                              key={i}
                              
                            >
                              {v}
                            </li>
                          ))}
                        </ul>
                      )}
                      <Action link={s.link} />
                    </div>
                    {s.image.src && (
                      <ContentImage
                        image={s.image}
                        className="aspect-[4/3] max-h-[480px] w-full"
                      />
                    )}
                  </div>
                </section>
              );
            return null;
          }),
      )}
    </>
  );
}
function Action({link, outline = false}: {link: ContentLink; outline?: boolean}) {
  return link.label && link.href ? <Link className={outline ? "section-link" : "store-button"} href={link.href}>{link.label}</Link> : null;
}
export function Heading({
  title,
  eyebrow,
  body,
  link,
  inset = true,
}: {
  title: string;
  eyebrow?: string;
  body?: string;
  link?: ContentLink;
  inset?: boolean;
}) {
  return (
    <div
      className={`section-header ${inset ? "x-container" : ""}`}
    >
      <div>
        <h2 className="section-heading">{title}</h2>
        {eyebrow && <p className="mt-3 text-sm text-neutral-600">{eyebrow}</p>}
        {body && (
          <p className="mt-3 max-w-xl text-base text-neutral-600">{body}</p>
        )}
      </div>
      {link?.label && link.href && (
        <Link
          href={link.href}
          className="section-link"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}
