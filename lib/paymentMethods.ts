export const ACTIVE_PAYMENT_METHODS = ["cod"] as const;

export type ActivePaymentMethod = (typeof ACTIVE_PAYMENT_METHODS)[number];

export const FUTURE_PAYMENT_PROVIDERS = ["payhere", "koko", "stripe"] as const;

export type FuturePaymentProvider = (typeof FUTURE_PAYMENT_PROVIDERS)[number];

export const PAYMENT_METHOD_LABELS: Record<ActivePaymentMethod, string> = {
  cod: "Cash on delivery",
};

export function isActivePaymentMethod(value: string): value is ActivePaymentMethod {
  return (ACTIVE_PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isFuturePaymentProvider(value: string): value is FuturePaymentProvider {
  return (FUTURE_PAYMENT_PROVIDERS as readonly string[]).includes(value);
}
