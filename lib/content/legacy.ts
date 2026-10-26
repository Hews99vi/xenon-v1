import {
  defaultSite,
  emptyImage,
  emptyLink,
  newSection,
  type SiteContent,
  type PageContent,
  type ContentImage,
  type ContentSection,
} from "./schema.ts";
export type LegacyRow = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const object = (v: unknown): LegacyRow =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as LegacyRow) : {};
function image(row: LegacyRow): ContentImage {
  const position = str(object(row.metadata).objectPosition).match(
    /^(\d+)%\s+(\d+)%$/,
  );
  return {
    ...emptyImage,
    src: str(row.image_url || row.cover_image_url),
    mobileSrc: str(row.mobile_image_url),
    alt: str(row.title || row.name),
    x: position ? Math.min(100, Number(position[1])) : 50,
    y: position ? Math.min(100, Number(position[2])) : 50,
  };
}
export function importLegacySite(data: {
  banners: LegacyRow[];
  sections: LegacyRow[];
  items: LegacyRow[];
  settings: LegacyRow[];
  categories: LegacyRow[];
  pages?: LegacyRow[];
}): SiteContent {
  const site = structuredClone(defaultSite);
  site.legacyAssets = [
    ...new Set(
      [...data.banners, ...data.items, ...data.categories]
        .flatMap((row) => [row.image_url, row.mobile_image_url])
        .filter((v): v is string => typeof v === "string" && Boolean(v)),
    ),
  ];
  const settings = object(
    data.settings.find((s) => s.key === "contact_and_policies")?.value,
  );
  site.announcement = {
    enabled: Boolean(settings.announcementText),
    text: str(settings.announcementText),
    href: "",
  };
  for (const key of [
    "supportEmail",
    "supportPhone",
    "instagramUrl",
    "tiktokUrl",
    "whatsappNumber",
  ] as const)
    site.footer[key] = str(settings[key]);
  if(data.pages)site.footer.columns=site.footer.columns.map(column=>({...column,links:column.links.filter(link=>!["/return-policy","/shipping-policy","/privacy-policy","/terms"].includes(link.href)||data.pages!.some(p=>p.status==="published"&&`/${canonicalPageSlug(str(p.slug))}`===link.href))}));
  const now = Date.now();
  const banners = [...data.banners].sort(
    (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
  );
  for (const placement of [
    "home_hero",
    "home_editorial",
    "home_campaign_secondary",
  ]) {
    const candidates = banners.filter((b) => b.placement === placement);
    const current = candidates.find(
      (b) =>
        b.is_active &&
        (!b.starts_at || Date.parse(str(b.starts_at)) <= now) &&
        (!b.ends_at || Date.parse(str(b.ends_at)) >= now),
    );
    for (const b of candidates) {
      const section = newSection(
        placement === "home_hero" ? "hero" : "campaign",
        str(b.id),
      );
      if (section.type !== "hero" && section.type !== "campaign") continue;
      Object.assign(section, {
        enabled: b === current,
        title: str(b.title),
        body: str(b.subtitle),
        eyebrow: str(b.eyebrow),
        image: image(b),
        primary: { label: str(b.cta_label), href: canonicalDestination(str(b.cta_url)) },
        secondary: {
          label: str(b.secondary_cta_label),
          href: canonicalDestination(str(b.secondary_cta_url)),
        },
      });
      site.sections.push(section);
    }
  }
  const latest = {
    ...newSection("products", "latest"),
    enabled: true,
    title: "Shop the latest styles",
  } as ContentSection;
  site.sections.splice(site.sections[0]?.type === "hero" ? 1 : 0, 0, latest);
  const classified = data.categories.some((c) => c.audience);
  for (const audience of classified
    ? (["women", "men"] as const)
    : (["all"] as const)) {
    const section = newSection("categories", `categories-${audience}`);
    if (section.type === "categories")
      Object.assign(section, {
        title: audience === "all" ? "Shop by category" : `Shop ${audience}`,
        enabled: true,
        audience,
      });
    site.sections.push(section);
  }
  for (const row of data.sections) {
    const items = data.items
      .filter((i) => i.section_id === row.id)
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
    const meta = object(row.metadata);
    if (row.section_key === "home_occasions") {
      const section = newSection("occasions", str(row.id));
      if (section.type === "occasions")
        Object.assign(section, {
          enabled: Boolean(row.is_active),
          title: str(row.title),
          body: str(row.body),
          eyebrow: str(row.micro_label),
          items: items.map((i) => ({
            id: str(i.id),
            enabled: Boolean(i.is_active),
            title: str(i.title),
            body: str(i.subtitle),
            image: image(i),
            link: { label: str(i.cta_label), href: canonicalDestination(str(i.cta_url)) },
            audience: ["women", "men", "unisex"].includes(
              str(object(i.metadata).gender),
            )
              ? str(object(i.metadata).gender)
              : "all",
          })),
        });
      site.sections.push(section);
    } else if (row.section_key === "home_atelier") {
      const section = newSection("story", str(row.id));
      if (section.type === "story")
        Object.assign(section, {
          enabled: Boolean(row.is_active),
          title: str(row.title),
          body: str(row.body),
          eyebrow: str(row.micro_label),
          image: items.some((i) => i.is_active)
            ? image(items.find((i) => i.is_active)!)
            : { ...emptyImage },
          values: Array.isArray(meta.values)
            ? meta.values.filter((v) => typeof v === "string")
            : [],
          link: row.cta_url
            ? { label: str(row.cta_label), href: canonicalDestination(str(row.cta_url)) }
            : { ...emptyLink },
        });
      site.sections.push(section);
    }
  }
  const accessories = data.categories.find(
    (c) => c.slug === "accessories" && c.is_active,
  );
  if (accessories) {
    const section = newSection("products", "accessories");
    if (section.type === "products")
      Object.assign(section, {
        enabled: true,
        title: "Accessories",
        source: "category",
        category: "accessories",
        link: { label: "Shop accessories", href: "/categories/accessories" },
      });
    const story = site.sections.findIndex((s) => s.type === "story");
    site.sections.splice(story < 0 ? site.sections.length : story, 0, section);
  }
  for (const nav of site.navigation.filter((n) => n.audience !== "all"))
    nav.children = data.categories
      .filter(
        (c) =>
          c.is_active &&
          (c.audience === nav.audience || c.audience === "unisex"),
      )
      .map((c) => ({
        label: str(c.name),
        href: `/categories/${str(c.slug)}?gender=${nav.audience}`,
      }));
  return site;
}
export function importLegacyPage(row: LegacyRow): PageContent {
  return {
    version: 1,
    title: str(row.title),
    body: str(row.content),
    excerpt: str(row.excerpt),
    image: image(row),
    seoTitle: str(row.seo_title),
    seoDescription: str(row.seo_description),
  };
}

export function canonicalPageSlug(slug: string) {return slug === "returns-policy" ? "return-policy" : slug === "terms-and-conditions" ? "terms" : slug;}

export function canonicalDestination(href:string){
  if(!href.startsWith("/products?"))return href;
  const url=new URL(href,"https://xenon.invalid"),audience=url.searchParams.get("category");
  if(audience==="women"||audience==="men"){url.searchParams.delete("category");url.searchParams.set("gender",audience);}
  return `${url.pathname}${url.search}${url.hash}`;
}
