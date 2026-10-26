import { beforeEach, describe, expect, it, vi } from "vitest";
const { from, rpc, calls, state } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  calls: [] as unknown[][],
  state: { error: false },
}));
vi.mock("@/lib/supabasePublic", () => ({ supabasePublic: { from, rpc } }));
import { getProductSummariesPage } from "@/lib/storefront";
beforeEach(() => {
  calls.length = 0;
  state.error = false;
  from.mockImplementation((table: string) => {
    const query = {
      select: (...args: unknown[]) => {
        calls.push([table, "select", ...args]);
        return query;
      },
      eq: (...args: unknown[]) => {
        calls.push([table, "eq", ...args]);
        return query;
      },
      in: (...args: unknown[]) => {
        calls.push([table, "in", ...args]);
        return query;
      },
      or: (...args: unknown[]) => {
        calls.push([table, "or", ...args]);
        return query;
      },
      ilike: (...args: unknown[]) => {
        calls.push([table, "ilike", ...args]);
        return query;
      },
      gte: (...args: unknown[]) => {
        calls.push([table, "gte", ...args]);
        return query;
      },
      lte: (...args: unknown[]) => {
        calls.push([table, "lte", ...args]);
        return query;
      },
      order: (...args: unknown[]) => {
        calls.push([table, "order", ...args]);
        return query;
      },
      range: (...args: unknown[]) => {
        calls.push([table, "range", ...args]);
        return query;
      },
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: [],
          count: 0,
          error: state.error ? { message: "Database timeout" } : null,
        }).then(resolve),
    };
    return query;
  });
});
describe("catalog audience queries", () => {
  it("combines audience with search, variant filters, price sorting, and pagination", async () => {
    await getProductSummariesPage({
      audience: "women",
      search: "linen",
      color: "Black",
      size: "M",
      minPrice: 1000,
      maxPrice: 5000,
      sort: "price-asc",
      page: 2,
      pageSize: 24,
    });
    expect(calls).toContainEqual([
      "products",
      "in",
      "audience",
      ["women", "unisex"],
    ]);
    expect(calls).toContainEqual([
      "products",
      "eq",
      "product_variants.is_active",
      true,
    ]);
    expect(calls).toContainEqual([
      "products",
      "eq",
      "product_variants.size",
      "M",
    ]);
    expect(calls).toContainEqual([
      "products",
      "ilike",
      "product_variants.color",
      "Black",
    ]);
    expect(calls).toContainEqual(["products", "gte", "effective_price", 1000]);
    expect(calls).toContainEqual(["products", "lte", "effective_price", 5000]);
    expect(calls).toContainEqual([
      "products",
      "order",
      "effective_price",
      { ascending: true },
    ]);
    expect(calls).toContainEqual(["products", "range", 24, 47]);
  });
  it("does not classify or exclude legacy products in All Products", async () => {
    await getProductSummariesPage({ audience: "all" });
    expect(
      calls.some((call) => call[1] === "in" && call[2] === "audience"),
    ).toBe(false);
  });
  it("does not replace a failed request with an empty collection", async () => {
    state.error = true;
    await expect(getProductSummariesPage({ audience: "men" })).rejects.toThrow(
      "Products could not be loaded",
    );
  });
  it("does not restore products after the last manual selection is removed", async () => {
    const result = await getProductSummariesPage({ productIds: [] });
    expect(result.products).toEqual([]);
    expect(calls.some((call) => call[1] === "range")).toBe(false);
  });
});
