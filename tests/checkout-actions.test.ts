import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  consumeCheckoutAttempt: vi.fn(),
  sendOrderConfirmationEmail: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/checkoutRateLimit", () => ({
  createCheckoutRateLimitIdentifier: () => "checkout-test",
  consumeCheckoutAttempt: mocks.consumeCheckoutAttempt,
}));
vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: { rpc: mocks.rpc },
}));
vi.mock("@/lib/supabaseServer", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("@/lib/email/orderConfirmation", () => ({
  sendOrderConfirmationEmail: mocks.sendOrderConfirmationEmail,
}));

const validInput = {
  fullName: "Ada Lovelace",
  phone: "0771234567",
  email: "ada@example.com",
  addressLine1: "1 Main Street",
  addressLine2: "",
  city: "Colombo",
  district: "33333333-3333-4333-8333-333333333333",
  postalCode: "00100",
  deliveryNote: "",
  promoCode: "",
  paymentMethod: "cod" as const,
  items: [
    {
      productId: "11111111-1111-4111-8111-111111111111",
      variantId: "22222222-2222-4222-8222-222222222222",
      quantity: 1,
    },
  ],
};

describe("checkout action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "127.0.0.1" }));
    mocks.consumeCheckoutAttempt.mockResolvedValue({ allowed: true, unavailable: false });
    mocks.sendOrderConfirmationEmail.mockResolvedValue({ ok: true });
    mocks.rpc.mockResolvedValue({
      data: {
        order_id: "44444444-4444-4444-8444-444444444444",
        order_number: "XEN-TEST-001",
        subtotal: 1000,
        discount_total: 0,
        delivery_fee: 450,
        grand_total: 1450,
      },
      error: null,
    });
    const productQuery = {
      select: vi.fn(() => productQuery),
      in: vi.fn(() => productQuery),
      eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => productQuery),
    });
  });

  it("rejects invalid checkout input before calling the transaction RPC", async () => {
    const { submitCheckoutAction } = await import("@/app/(store)/checkout/actions");
    const result = await submitCheckoutAction({ ...validInput, phone: "" });

    expect(result).toMatchObject({ ok: false });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("sends normalized checkout data to the database transaction", async () => {
    const { submitCheckoutAction } = await import("@/app/(store)/checkout/actions");
    const result = await submitCheckoutAction(validInput);

    expect(result).toMatchObject({ ok: true, orderNumber: "XEN-TEST-001" });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "checkout_transaction",
      expect.objectContaining({
        payload: expect.objectContaining({
          payment_method: "cod",
          customer_first_name: "Ada",
          customer_last_name: "Lovelace",
          items: [{
            product_id: validInput.items[0].productId,
            variant_id: validInput.items[0].variantId,
            quantity: 1,
          }],
        }),
      }),
    );
  });

  it("calculates percentage promo discounts with a maximum cap", async () => {
    const promoQuery = {
      select: vi.fn(() => promoQuery),
      eq: vi.fn(() => promoQuery),
      or: vi.fn(() => promoQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "55555555-5555-4555-8555-555555555555",
          code: "SAVE20",
          discount_type: "percentage",
          discount_value: 20,
          minimum_order_amount: 1000,
          max_discount_amount: 250,
          usage_limit: 100,
          used_count: 1,
        },
        error: null,
      }),
    };
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => promoQuery),
    });

    const { validatePromoCodeAction } = await import("@/app/(store)/checkout/actions");
    const result = await validatePromoCodeAction(" save20 ", 2000);

    expect(result).toMatchObject({ ok: true, promo: { discountAmount: 250 } });
  });
});
