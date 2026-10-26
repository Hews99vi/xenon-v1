import { describe, expect, it } from "vitest";
import { imageFileError, imageManifestSchema, imageSnapshot } from "@/lib/productImages";
import { productSchema, productVariantSchema } from "@/lib/adminSchemas";

const key = "10000000-0000-4000-8000-000000000001";
describe("product gallery boundaries", () => {
  it("does not turn blank optional prices into zero during an image-only save", () => {
    const product = productSchema.parse({ name: "Image fixture", slug: "image-fixture", sku: "IMAGE-FIXTURE", basePrice: 1000, salePrice: "", status: "active", categoryId: key, isFeatured: false });
    expect(product.salePrice).toBe("");
    expect(productVariantSchema.parse({ sku: "IMAGE-VARIANT", price: "", stockQuantity: 1, isActive: true }).price).toBe("");
    expect(productVariantSchema.parse({ sku: "IMAGE-VARIANT", price: "0", stockQuantity: 1, isActive: true }).price).toBe(0);
  });
  it("rejects duplicate rows and missing file references", () => {
    expect(imageManifestSchema.safeParse([{ key, altText: "" }]).success).toBe(false);
    expect(imageManifestSchema.safeParse([{ key, id: key, altText: "A" }, { key, id: key, altText: "A" }]).success).toBe(false);
  });
  it("supports empty galleries, retained IDs and replacements", () => {
    expect(imageManifestSchema.parse([])).toEqual([]);
    expect(imageManifestSchema.parse([{ key, id: key, fileKey: key, altText: " new photo " }])[0].altText).toBe("new photo");
  });
  it("limits uploaded files without imposing a five-image gallery limit", () => {
    expect(imageManifestSchema.safeParse(Array.from({ length: 8 }, (_, i) => ({ key: `10000000-0000-4000-8000-${String(i).padStart(12,"0")}`, id: `20000000-0000-4000-8000-${String(i).padStart(12,"0")}`, altText: "" }))).success).toBe(true);
    expect(imageFileError(Array.from({ length: 6 }, () => ({ type: "image/png", size: 1 })))).toContain("5 images");
  });
  it("rejects invalid MIME, empty, oversized and aggregate uploads", () => {
    expect(imageFileError([{ type: "image/svg+xml", size: 10 }])).toContain("JPG");
    expect(imageFileError([{ type: "image/png", size: 0 }])).toContain("empty");
    expect(imageFileError([{ type: "image/png", size: 6 * 1024 * 1024 }])).toContain("5 MiB");
    expect(imageFileError([{ type: "image/png", size: 5 * 1024 * 1024 }, { type: "image/jpeg", size: 5 * 1024 * 1024 }])).toContain("9 MiB");
  });
  it("canonicalizes snapshots independently of display ordering", () => {
    const row = { id: key, image_url: "https://example.com/a.png", alt_text: null, sort_order: 0, is_primary: true };
    const other = { ...row, id: "20000000-0000-4000-8000-000000000001" };
    expect(imageSnapshot([other, row])).toEqual([row, other]);
  });
});
