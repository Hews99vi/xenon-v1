import { describe, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabaseServer", () => ({ createServerSupabaseClient: client }));
import { validateCartItemsAction } from "@/app/cart/actions";
describe("cart request failures", () => {
  it("preserves the cart when the inventory query fails", async () => {
    client.mockResolvedValue({
      from: () => ({
        select: () => ({
          in: async () => ({
            data: null,
            error: { message: "Database timeout" },
          }),
        }),
      }),
    });
    const result = await validateCartItemsAction([
      { variantId: "22222222-2222-4222-8222-222222222222", quantity: 1 },
    ]);
    expect(result.ok).toBe(false);
    expect(result.removedVariantIds).toEqual([]);
    expect(result.message).toContain("could not be checked");
  });
});
