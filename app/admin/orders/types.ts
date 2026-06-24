export const orderStatusOptions = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const paymentStatusOptions = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;

export type OrderStatus = (typeof orderStatusOptions)[number];
export type PaymentStatus = (typeof paymentStatusOptions)[number];

export function formatMoney(value: number | string | null | undefined) {
  return `LKR ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
