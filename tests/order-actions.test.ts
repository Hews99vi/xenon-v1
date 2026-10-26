import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabaseServer", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("order stock release action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the stock release RPC when cancelling a valid order", async () => {
    const orderId = "66666666-6666-4666-8666-666666666666";
    const orderQuery = {
      select: vi.fn(() => orderQuery),
      eq: vi.fn(() => orderQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { order_status: "pending" },
        error: null,
      }),
    };
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => orderQuery),
      rpc: mocks.rpc,
    });

    const formData = new FormData();
    formData.set("orderId", orderId);
    formData.set("orderStatus", "cancelled");
    formData.set("paymentStatus", "pending");

    const { updateOrderStatusesAction } = await import("@/app/admin/orders/actions");
    const result = await updateOrderStatusesAction({ ok: true, message: "" }, formData);

    expect(result).toMatchObject({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith("release_order_stock", {
      p_order_id: orderId,
      p_cancel_order: true,
      p_payment_status: "pending",
    });
  });
});
