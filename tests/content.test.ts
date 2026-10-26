import { describe, expect, it } from "vitest";
import {
  audienceLink,
  audienceValues,
  defaultSite,
  matchesAudience,
  newSection,
  safeLink,
  siteSchema,
} from "@/lib/content/schema";
import { importLegacySite } from "@/lib/content/legacy";
import { incompleteLinks } from "@/lib/content/validation";
const emptyLegacy = {
  banners: [],
  sections: [],
  items: [],
  settings: [],
  categories: [],
};
describe("structured website content", () => {
  it("keeps missing campaigns and deleted occasion items empty, without demo content", () => {
    const site = importLegacySite({
      ...emptyLegacy,
      sections: [
        {
          id: "occasions",
          section_key: "home_occasions",
          title: "",
          body: "",
          is_active: false,
        },
      ],
    });
    expect(
      site.sections.some((s) => s.type === "hero" || s.type === "campaign"),
    ).toBe(false);
    expect(site.sections.find((s) => s.type === "occasions")).toMatchObject({
      enabled: false,
      title: "",
      body: "",
      items: [],
    });
    expect(siteSchema.safeParse(site).success).toBe(true);
  });
  it("preserves inactive banners, mobile imagery, optional copy and secondary buttons", () => {
    const site = importLegacySite({
      ...emptyLegacy,
      banners: [
        {
          id: "hero",
          placement: "home_hero",
          is_active: true,
          title: "Campaign",
          subtitle: "",
          image_url: "/desktop.jpg",
          mobile_image_url: "/mobile.jpg",
          secondary_cta_label: "Explore",
          secondary_cta_url: "/products",
        },
        {
          id: "older",
          placement: "home_hero",
          is_active: false,
          title: "Older",
          image_url: "/old.jpg",
        },
      ],
    });
    expect(site.sections.find((s) => s.id === "hero")).toMatchObject({
      enabled: true,
      body: "",
      image: { src: "/desktop.jpg", mobileSrc: "/mobile.jpg" },
      secondary: { label: "Explore", href: "/products" },
    });
    expect(site.sections.find((s) => s.id === "older")).toMatchObject({
      enabled: false,
    });
    expect(site.legacyAssets).toContain("/old.jpg");
  });
  it("preserves hidden tiles and their assigned audience during migration", () => {
    const site = importLegacySite({
      ...emptyLegacy,
      sections: [
        {
          id: "row",
          section_key: "home_occasions",
          title: "Occasions",
          is_active: true,
        },
      ],
      items: [
        {
          id: "tile",
          section_id: "row",
          is_active: false,
          title: "Evening",
          metadata: { gender: "men" },
          cta_url: "/products?category=evening",
        },
      ],
    });
    expect(site.sections.find((s) => s.type === "occasions")).toMatchObject({
      items: [{ enabled: false, audience: "men" }],
    });
  });
  it("allows empty manual selection without restoring all categories", () => {
    const section = newSection("categories", "categories");
    expect(
      siteSchema.parse({
        ...defaultSite,
        sections: [{ ...section, source: "manual", categoryIds: [] }],
      }).sections[0],
    ).toMatchObject({ source: "manual", categoryIds: [] });
  });
  it("rejects duplicate sections, multiple active heroes and repeated selections", () => {
    const hero = { ...newSection("hero", "hero"), enabled: true };
    expect(
      siteSchema.safeParse({ ...defaultSite, sections: [hero, hero] }).success,
    ).toBe(false);
    const row = newSection("products", "products");
    const id = "20000000-0000-4000-8000-000000000001";
    expect(
      siteSchema.safeParse({
        ...defaultSite,
        sections: [{ ...row, productIds: [id, id] }],
      }).success,
    ).toBe(false);
  });
  it("rejects unsafe destinations while allowing supported internal and external links", () => {
    for (const value of [
      "javascript:alert(1)",
      "//evil.example",
      "/\\evil.example",
      "data:text/html,test",
      "https://example.com/\n",
    ])
      expect(safeLink(value)).toBe(false);
    for (const value of [
      "",
      "/products?gender=women",
      "https://example.com/campaign",
      "mailto:support@example.com",
      "tel:+94123456789",
    ])
      expect(safeLink(value)).toBe(true);
    expect(
      incompleteLinks({
        ...defaultSite,
        navigation: [
          { label: "Broken", href: "", audience: "all", children: [] },
        ],
      }),
    ).toHaveLength(1);
  });
});
describe("explicit audience routing", () => {
  it("includes unisex in Women and Men, and keeps unassigned products in All", () => {
    expect(audienceValues("women")).toEqual(["women", "unisex"]);
    expect(audienceValues("men")).toEqual(["men", "unisex"]);
    expect(audienceValues("all")).toBeNull();
    expect(matchesAudience(null)).toBe(true);
    expect(matchesAudience(null, "women")).toBe(false);
    expect(matchesAudience("unisex", "men")).toBe(true);
  });
  it("uses occasion audience without dropping existing catalog query filters", () => {
    expect(
      audienceLink("/products?category=evening&sort=price-asc", "women"),
    ).toBe("/products?category=evening&sort=price-asc&gender=women");
    expect(audienceLink("/categories/signature?size=M", "men")).toBe(
      "/categories/signature?size=M&gender=men",
    );
    expect(audienceLink("https://example.com", "women")).toBe(
      "https://example.com",
    );
    expect(audienceLink("/pages/story", "women")).toBe("/pages/story");
  });
});
