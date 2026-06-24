"use server";

import crypto from "crypto";
import { z } from "zod";
import { createPayHereCheckoutPayload } from "@/lib/payhere";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const checkoutSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required."),
    phone: z.string().trim().min(7, "Phone number is required."),
    email: z.string().trim().email("Use a valid email.").optional().or(z.literal("")),
    addressLine1: z.string().trim().min(3, "Address line 1 is required."),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().min(2, "City is required."),
    district: z.string().uuid("Select a delivery district."),
    postalCode: z.string().trim().optional(),
    deliveryNote: z.string().trim().optional(),
    promoCode: z.string().trim().optional(),
    paymentMethod: z.enum(["cod", "payhere"]),
    items: z.array(checkoutItemSchema).min(1, "Your cart is empty."),
  })
  .refine((data) => data.paymentMethod !== "payhere" || Boolean(data.email), {
    message: "Email is required for PayHere payments.",
    path: ["email"],
  });

type CheckoutInput = z.infer<typeof checkoutSchema>;

type PromoRow = {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
};

type CheckoutTransactionResult = {
  order_id: string;
  order_number: string;
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  grand_total: number;
};

export type PromoResult = {
  ok: boolean;
  message: string;
  promo?: {
    id: string;
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    discountAmount: number;
  };
};

export type CheckoutResult =
  | {
      ok: true;
      paymentMethod: "cod";
      orderNumber: string;
      redirectUrl: string;
    }
  | {
      ok: true;
      paymentMethod: "payhere";
      orderNumber: string;
      payhere: {
        actionUrl: string;
        params: Record<string, string>;
      };
    }
  | {
      ok: false;
      message: string;
    };

export async function getDeliveryFeeAction(deliveryZoneId: string) {
  if (!deliveryZoneId) {
    return { ok: false, fee: 0, message: "Select a delivery district." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("delivery_fee")
    .eq("id", deliveryZoneId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, fee: 0, message: "Delivery zone was not found." };
  }

  return { ok: true, fee: Number(data.delivery_fee), message: "" };
}

export async function validatePromoCodeAction(
  code: string,
  subtotal: number,
): Promise<PromoResult> {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    return { ok: false, message: "Enter a promo code." };
  }

  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("promo_codes")
    .select(
      "id, code, discount_type, discount_value, minimum_order_amount, max_discount_amount, usage_limit, used_count",
    )
    .eq("code", normalizedCode)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Promo code is invalid or expired." };
  }

  const promo = data as PromoRow;

  if (promo.usage_limit !== null && promo.used_count >= promo.usage_limit) {
    return { ok: false, message: "Promo code usage limit has been reached." };
  }

  if (subtotal < Number(promo.minimum_order_amount)) {
    return {
      ok: false,
      message: `Minimum order is LKR ${Number(promo.minimum_order_amount).toLocaleString("en-LK")}.`,
    };
  }

  let discountAmount =
    promo.discount_type === "percentage"
      ? subtotal * (Number(promo.discount_value) / 100)
      : Number(promo.discount_value);

  if (promo.max_discount_amount !== null) {
    discountAmount = Math.min(discountAmount, Number(promo.max_discount_amount));
  }

  discountAmount = Math.min(discountAmount, subtotal);

  return {
    ok: true,
    message: "Promo code applied.",
    promo: {
      id: promo.id,
      code: promo.code,
      discountType: promo.discount_type,
      discountValue: Number(promo.discount_value),
      discountAmount: roundMoney(discountAmount),
    },
  };
}

export async function submitCheckoutAction(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid checkout details.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const orderNumber = createOrderNumber();
  const { firstName, lastName } = splitName(parsed.data.fullName);

  const { data: checkoutData, error: checkoutError } = await supabase.rpc(
    "checkout_transaction",
    {
      payload: {
        order_number: orderNumber,
        customer_email: parsed.data.email || "guest@xenon.local",
        customer_phone: parsed.data.phone,
        customer_first_name: firstName,
        customer_last_name: lastName,
        shipping_address_line1: parsed.data.addressLine1,
        shipping_address_line2: parsed.data.addressLine2 || null,
        shipping_city: parsed.data.city,
        shipping_postal_code: parsed.data.postalCode || null,
        delivery_zone_id: parsed.data.district,
        promo_code: parsed.data.promoCode || null,
        payment_method: parsed.data.paymentMethod,
        customer_notes: parsed.data.deliveryNote || null,
        items: parsed.data.items.map((item) => ({
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity,
        })),
      },
    },
  );

  if (checkoutError || !checkoutData) {
    return {
      ok: false,
      message: getCheckoutErrorMessage(checkoutError?.message),
    };
  }

  const checkout = checkoutData as CheckoutTransactionResult;

  if (parsed.data.paymentMethod === "cod") {
    return {
      ok: true,
      paymentMethod: "cod",
      orderNumber: checkout.order_number,
      redirectUrl: `/payment/success?order=${encodeURIComponent(checkout.order_number)}`,
    };
  }

  const payhere = createPayHereCheckoutPayload({
    orderId: checkout.order_number,
    items: `Xenon order ${checkout.order_number}`,
    amount: Number(checkout.grand_total),
    firstName,
    lastName,
    email: parsed.data.email || "guest@xenon.local",
    phone: parsed.data.phone,
    address: [parsed.data.addressLine1, parsed.data.addressLine2]
      .filter(Boolean)
      .join(", "),
    city: parsed.data.city,
    country: "Sri Lanka",
  });

  const { error: transactionError } = await supabase
    .from("payment_transactions")
    .insert({
      order_id: checkout.order_id,
      provider: "payhere",
      merchant_id: payhere.params.merchant_id,
      amount: Number(checkout.grand_total),
      currency: "LKR",
      status: "pending",
      raw_payload: payhere.params,
    });

  if (transactionError) {
    return {
      ok: false,
      message: "Could not initialize payment. Please contact support with your order number.",
    };
  }

  return {
    ok: true,
    paymentMethod: "payhere",
    orderNumber: checkout.order_number,
    payhere,
  };
}

function createOrderNumber() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `XEN-${stamp}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() || "Guest";
  const lastName = parts.join(" ") || firstName;

  return { firstName, lastName };
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getCheckoutErrorMessage(message?: string) {
  if (!message) {
    return "Could not place order. Please try again.";
  }

  if (message.includes("delivery_zone_not_found")) {
    return "Delivery zone was not found.";
  }

  if (message.includes("cart_empty")) {
    return "Your cart is empty.";
  }

  if (
    message.includes("cart_item_unavailable") ||
    message.includes("insufficient_stock")
  ) {
    return "One or more cart items are no longer available in the requested quantity.";
  }

  if (message.includes("promo_invalid")) {
    return "Promo code is invalid or expired.";
  }

  if (message.includes("promo_usage_limit_reached")) {
    return "Promo code usage limit has been reached.";
  }

  if (message.includes("promo_minimum_not_met")) {
    return "Your order does not meet the promo code minimum.";
  }

  return "Could not place order. Please try again.";
}
