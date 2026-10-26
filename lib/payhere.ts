import "server-only";

export const PAYHERE_DISABLED_MESSAGE =
  "PayHere is disabled for the current MVP. Use COD/manual checkout.";

export function isPayHereEnabled() {
  return false;
}
