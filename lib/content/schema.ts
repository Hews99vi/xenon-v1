import { z } from "zod";

export const audienceSchema = z.enum(["women", "men", "unisex"]);
export type Audience = z.infer<typeof audienceSchema>;
export function matchesAudience(value: Audience | null, audience?: string) {
  return !audience || value === audience || value === "unisex";
}
export function safeLink(value: string) {
  if (!value) return true;
  if (/[\u0000-\u0020\\]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return ["https:", "mailto:", "tel:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
const link = z
  .string()
  .max(2000)
  .refine(
    safeLink,
    "Choose an internal page or a valid HTTPS, email, or phone link.",
  );
const copy = z.string().max(5000);
export const linkSchema = z.object({ label: z.string().max(80), href: link });
export const imageSchema = z.object({
  src: z
    .string()
    .max(2000)
    .refine(
      (v) =>
        !v || (safeLink(v) && (v.startsWith("/") || v.startsWith("https:"))),
      "Use a local or HTTPS image.",
    ),
  mobileSrc: z
    .string()
    .max(2000)
    .refine(
      (v) =>
        !v || (safeLink(v) && (v.startsWith("/") || v.startsWith("https:"))),
      "Use a local or HTTPS image.",
    ),
  alt: z.string().max(250),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});
const base = {
  id: z.string().min(1),
  enabled: z.boolean(),
  title: z.string().max(160),
  body: copy,
  eyebrow: z.string().max(100),
};
const campaign = {
  image: imageSchema,
  primary: linkSchema,
  secondary: linkSchema,
};
const tile = z.object({
  id: z.string().min(1),
  enabled: z.boolean().default(true),
  title: z.string().max(100),
  body: copy,
  image: imageSchema,
  link: linkSchema,
  audience: z.enum(["all", "women", "men", "unisex"]),
});
export const sectionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("hero"), ...campaign }),
  z.object({ ...base, type: z.literal("campaign"), ...campaign }),
  z.object({
    ...base,
    type: z.literal("products"),
    source: z.enum(["newest", "featured", "category", "manual"]),
    category: z.string(),
    productIds: z.array(z.string().uuid()).max(24),
    audience: z.enum(["all", "women", "men"]),
    link: linkSchema,
  }),
  z.object({
    ...base,
    type: z.literal("categories"),
    source: z.enum(["all", "manual"]).default("all"),
    categoryIds: z.array(z.string().uuid()).max(30),
    audience: z.enum(["all", "women", "men"]),
    link: linkSchema,
  }),
  z.object({
    ...base,
    type: z.literal("occasions"),
    items: z.array(tile).max(20),
    audience: z.enum(["all", "women", "men"]),
  }),
  z.object({
    ...base,
    type: z.literal("story"),
    image: imageSchema,
    values: z.array(z.string().max(160)).max(8),
    link: linkSchema,
  }),
]);
export const siteSchema = z
  .object({
    version: z.literal(1),
    legacyAssets: z.array(z.string().max(2000)).max(1000).default([]),
    announcement: z.object({
      enabled: z.boolean(),
      text: z.string().max(250),
      href: link,
    }),
    navigation: z
      .array(
        linkSchema.extend({
          audience: z.enum(["all", "women", "men"]),
          children: z.array(linkSchema).max(20),
        }),
      )
      .max(8),
    footer: z.object({
      tagline: z.string().max(160),
      supportEmail: z.string().email().or(z.literal("")),
      supportPhone: z.string().max(50),
      instagramUrl: link,
      tiktokUrl: link,
      whatsappNumber: z.string().max(50),
      columns: z
        .array(
          z.object({
            title: z.string().max(60),
            links: z.array(linkSchema).max(20),
          }),
        )
        .max(4),
    }),
    newsletter: z.object({
      enabled: z.boolean(),
      title: z.string().max(100),
      body: copy,
    }),
    sections: z.array(sectionSchema).max(24),
  })
  .superRefine((site, ctx) => {
    if (new Set(site.sections.map((s) => s.id)).size !== site.sections.length)
      ctx.addIssue({
        code: "custom",
        path: ["sections"],
        message: "Section IDs must be unique.",
      });
    for (const [index, section] of site.sections.entries()) {
      if (
        section.type === "occasions" &&
        new Set(section.items.map((item) => item.id)).size !==
          section.items.length
      )
        ctx.addIssue({
          code: "custom",
          path: ["sections", index, "items"],
          message: "Tile IDs must be unique.",
        });
      const ids =
        section.type === "products"
          ? section.productIds
          : section.type === "categories"
            ? section.categoryIds
            : [];
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({
          code: "custom",
          path: ["sections", index],
          message: "Selections must be unique.",
        });
    }
    if (site.sections.filter((s) => s.type === "hero" && s.enabled).length > 1)
      ctx.addIssue({
        code: "custom",
        path: ["sections"],
        message: "Only one hero can be active.",
      });
  });
export const pageSchema = z.object({
  version: z.literal(1),
  title: z.string().min(2).max(160),
  body: z.string().max(100000),
  excerpt: z.string().max(500),
  image: imageSchema,
  seoTitle: z.string().max(160),
  seoDescription: z.string().max(300),
});
export type SiteContent = z.infer<typeof siteSchema>;
export type ContentSection = z.infer<typeof sectionSchema>;
export type ContentImage = z.infer<typeof imageSchema>;
export type ContentLink = z.infer<typeof linkSchema>;
export type PageContent = z.infer<typeof pageSchema>;
export type ContentKind = "site" | "page" | "journal";
export const emptyImage: ContentImage = {
  src: "",
  mobileSrc: "",
  alt: "",
  x: 50,
  y: 50,
};
export const emptyLink: ContentLink = { label: "", href: "" };
export function newSection(
  type: ContentSection["type"],
  id: string,
): ContentSection {
  const base = { id, type, enabled: false, title: "", body: "", eyebrow: "" };
  if (type === "hero" || type === "campaign")
    return {
      ...base,
      type,
      image: { ...emptyImage },
      primary: { ...emptyLink },
      secondary: { ...emptyLink },
    };
  if (type === "products")
    return {
      ...base,
      type,
      source: "newest",
      category: "",
      productIds: [],
      audience: "all",
      link: { label: "Shop all", href: "/products" },
    };
  if (type === "categories")
    return {
      ...base,
      type,
      source: "all",
      categoryIds: [],
      audience: "all",
      link: { ...emptyLink },
    };
  if (type === "occasions")
    return { ...base, type, items: [], audience: "all" };
  return {
    ...base,
    type: "story",
    image: { ...emptyImage },
    values: [],
    link: { ...emptyLink },
  };
}
export const defaultSite: SiteContent = {
  version: 1,
  legacyAssets: [],
  announcement: { enabled: false, text: "", href: "" },
  navigation: [
    {
      label: "Women",
      href: "/products?gender=women",
      audience: "women",
      children: [],
    },
    {
      label: "Men",
      href: "/products?gender=men",
      audience: "men",
      children: [],
    },
    {
      label: "Accessories",
      href: "/products?category=accessories",
      audience: "all",
      children: [],
    },
    {
      label: "New Arrivals",
      href: "/products?tag=new",
      audience: "all",
      children: [],
    },
  ],
  footer: {
    tagline: "Xenon",
    supportEmail: "",
    supportPhone: "",
    instagramUrl: "",
    tiktokUrl: "",
    whatsappNumber: "",
    columns: [
      {
        title: "Shop",
        links: [
          { label: "All products", href: "/products" },
          { label: "New arrivals", href: "/products?tag=new" },
        ],
      },
      {
        title: "Information",
        links: [
          { label: "Delivery", href: "/shipping-policy" },
          { label: "Returns", href: "/return-policy" },
          { label: "Privacy", href: "/privacy-policy" },
          { label: "Terms", href: "/terms" },
        ],
      },
      { title: "Explore", links: [{ label: "Journal", href: "/blog" }] },
    ],
  },
  newsletter: {
    enabled: true,
    title: "Stay in the know",
    body: "News and new arrivals from Xenon.",
  },
  sections: [],
};
export function contentPath(kind: ContentKind, slug: string) {
  if (kind === "site") return "/";
  if (kind === "journal") return `/blog/${slug}`;
  return [
    "return-policy",
    "shipping-policy",
    "privacy-policy",
    "terms",
    "size-guide",
  ].includes(slug)
    ? `/${slug}`
    : `/pages/${slug}`;
}
export function audienceValues(gender?: string): Audience[] | null {
  return gender === "women" || gender === "men" ? [gender, "unisex"] : null;
}

export function audienceLink(href: string, audience: string) {
  if (
    !["women", "men"].includes(audience) ||
    !/^\/(products(?:\?|$)|categories\/)/.test(href)
  )
    return href;
  const url = new URL(href, "https://xenon.invalid");
  url.searchParams.set("gender", audience);
  return `${url.pathname}${url.search}${url.hash}`;
}
