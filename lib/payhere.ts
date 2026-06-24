import "server-only";

import crypto from "crypto";

export type PayHereCheckoutInput = {
  orderId: string;
  items: string;
  amount: number;
  currency?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
};

export type PayHereCheckoutPayload = {
  actionUrl: string;
  params: Record<string, string>;
};

export function createPayHereCheckoutPayload(
  input: PayHereCheckoutInput,
): PayHereCheckoutPayload {
  const merchantId = getPayHereMerchantId();
  const merchantSecret = getPayHereMerchantSecret();
  const siteUrl = getSiteUrl();
  const currency = input.currency || "LKR";
  const amount = input.amount.toFixed(2);

  return {
    actionUrl: getPayHereActionUrl(),
    params: {
      merchant_id: merchantId,
      return_url: `${siteUrl}/payment/success?order=${encodeURIComponent(input.orderId)}`,
      cancel_url: `${siteUrl}/payment/cancel?order=${encodeURIComponent(input.orderId)}`,
      notify_url: `${siteUrl}/api/payhere/notify`,
      order_id: input.orderId,
      items: input.items,
      currency,
      amount,
      first_name: input.firstName || "Guest",
      last_name: input.lastName || "Customer",
      email: input.email || "guest@xenon.local",
      phone: input.phone || "0000000000",
      address: input.address || "",
      city: input.city || "",
      country: input.country || "Sri Lanka",
      hash: generatePayHereCheckoutHash({
        merchantId,
        orderId: input.orderId,
        amount,
        currency,
        merchantSecret,
      }),
    },
  };
}

export function generatePayHereCheckoutHash({
  merchantId,
  orderId,
  amount,
  currency,
  merchantSecret,
}: {
  merchantId: string;
  orderId: string;
  amount: string;
  currency: string;
  merchantSecret: string;
}) {
  return md5(
    `${merchantId}${orderId}${amount}${currency}${md5(merchantSecret).toUpperCase()}`,
  ).toUpperCase();
}

export function generatePayHereNotificationHash({
  merchantId,
  orderId,
  amount,
  currency,
  statusCode,
  merchantSecret,
}: {
  merchantId: string;
  orderId: string;
  amount: string;
  currency: string;
  statusCode: string;
  merchantSecret: string;
}) {
  return md5(
    `${merchantId}${orderId}${amount}${currency}${statusCode}${md5(merchantSecret).toUpperCase()}`,
  ).toUpperCase();
}

export function getPayHereMerchantId() {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;

  if (!merchantId) {
    throw new Error("Missing PAYHERE_MERCHANT_ID environment variable.");
  }

  return merchantId;
}

export function getPayHereMerchantSecret() {
  const merchantSecret = process.env.PAYHERE_SECRET;

  if (!merchantSecret) {
    throw new Error("Missing PAYHERE_SECRET environment variable.");
  }

  return merchantSecret;
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function getPayHereActionUrl() {
  return process.env.PAYHERE_SANDBOX === "false"
    ? "https://www.payhere.lk/pay/checkout"
    : "https://sandbox.payhere.lk/pay/checkout";
}

function md5(value: string) {
  return crypto.createHash("md5").update(value).digest("hex");
}
