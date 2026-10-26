import { beforeEach, describe, expect, it } from "vitest";
import { useCart } from "@/lib/cart/useCart";
import { validateCartItemsAction } from "@/app/cart/actions";

const item = {
  productId: "11111111-1111-4111-8111-111111111111",
  variantId: "22222222-2222-4222-8222-222222222222",
  name: "Test shirt",
  slug: "test-shirt",
  image: null,
  color: "Black",
  size: "M",
  price: 1000,
  quantity: 1,
  stockQuantity: 3,
};

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) || null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    },
  });
  useCart.setState({ items: [], hasHydrated: false });
});

describe("cart state", () => {
  it("merges duplicate variants and caps quantity at stock", () => {
    useCart.getState().addItem({ ...item, quantity: 2 });
    useCart.getState().addItem({ ...item, quantity: 2 });

    expect(useCart.getState().items).toHaveLength(1);
    expect(useCart.getState().items[0].quantity).toBe(3);
  });

  it("never allows an invalid quantity during updates", () => {
    useCart.getState().addItem(item);
    useCart.getState().updateQuantity(item.variantId, Number.NaN);

    expect(useCart.getState().items[0].quantity).toBe(1);
  });

  it("ignores corrupt saved carts and invalid items", () => {
    for (const stored of ["{broken", '{"items":[]}', '[null,{"price":-1}]']) {
      window.localStorage.setItem("xenon-cart", stored);
      useCart.getState().hydrateCart();
      expect(useCart.getState().items).toEqual([]);
      expect(useCart.getState().hasHydrated).toBe(true);
    }
  });

  it("keeps the cart usable when browser storage is blocked", () => {
    window.localStorage.setItem = () => {
      throw new Error("Storage blocked");
    };
    expect(() => useCart.getState().addItem(item)).not.toThrow();
    expect(useCart.getState().items).toEqual([item]);
  });
});

describe("cart server validation", () => {
  it("rejects malformed variant identifiers before querying the database", async () => {
    const result = await validateCartItemsAction([
      { variantId: "not-a-uuid", quantity: 1 },
    ]);

    expect(result).toMatchObject({ ok: false, items: [] });
    expect(result.message).toContain("Cart could not be checked");
  });

  it("treats an empty cart as valid and does not require a database lookup", async () => {
    await expect(validateCartItemsAction([])).resolves.toMatchObject({
      ok: true,
      items: [],
      message: "",
    });
  });
});
