import { describe, expect, it } from "vitest";

describe("admin action validation", () => {
  it("returns an explicit error for an unidentified banner", async () => {
    const { updateBannerAction } = await import("@/app/admin/banners/actions");
    const result = await updateBannerAction({ ok: true, message: "" }, new FormData());

    expect(result).toEqual({
      ok: false,
      message: "Banner could not be identified.",
    });
  });

  it("returns an explicit error for an invalid homepage section", async () => {
    const { updateHomepageSectionAction } = await import("@/app/admin/homepage/actions");
    const result = await updateHomepageSectionAction({ ok: true, message: "" }, new FormData());

    expect(result.ok).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("rejects invalid product data before any admin write", async () => {
    const { createProductAction } = await import("@/app/admin/products/actions");
    const result = await createProductAction({ ok: true, message: "" }, new FormData());

    expect(result.ok).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("rejects invalid category data before any admin write", async () => {
    const { createCategoryAction } = await import("@/app/admin/categories/actions");
    const result = await createCategoryAction({ ok: true, message: "" }, new FormData());

    expect(result.ok).toBe(false);
    expect(result.message).toBeTruthy();
  });
});
