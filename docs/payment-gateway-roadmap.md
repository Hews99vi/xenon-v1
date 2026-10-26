# Payment Gateway Roadmap

This document describes how Xenon should add online payment gateways later without mixing gateway logic into the current MVP checkout flow.

## Current Payment State

Active today:

- COD/manual order placement only.
- Checkout creates an order through the server-side checkout transaction.
- Orders use `payment_method = 'cod'`.
- Payment status starts as `pending`.
- Admins manually update order and payment statuses.
- Order confirmation email can be sent after COD/manual order creation.

Inactive and future-only:

- PayHere
- Koko
- Stripe
- Any other online payment gateway

The current MVP must not require gateway environment variables, generate gateway hashes, redirect customers to a gateway, or process live gateway webhooks.

## Existing Extension Points

The codebase already has future-safe boundaries that should be preserved:

- `lib/paymentMethods.ts` defines the active COD method and future provider names.
- `lib/payhere.ts` marks PayHere as disabled for the MVP.
- `app/api/payhere/checkout` and `app/api/payhere/notify` currently return disabled responses and must not become live without a dedicated gateway implementation.
- `public.payment_transactions` can store gateway events and raw provider payloads later.
- `public.release_order_stock(...)` restores inventory idempotently for cancelled or failed orders.
- `sendOrderConfirmationEmail(...)` can be reused later after verified payment success.

## Intended Future Architecture

When PayHere or another gateway is added, introduce a provider abstraction instead of wiring gateway logic directly into checkout UI or order actions.

Recommended shape:

```ts
type PaymentProviderName = "payhere" | "koko" | "stripe";

type CreatePaymentIntentInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: "LKR";
};

type CreatePaymentIntentResult = {
  provider: PaymentProviderName;
  redirectUrl?: string;
  formFields?: Record<string, string>;
  providerReference?: string;
};

interface PaymentProvider {
  name: PaymentProviderName;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult>;
  verifyWebhook(request: Request): Promise<VerifiedPaymentEvent>;
}
```

Future checkout flow:

1. Server validates the cart and recalculates prices.
2. Server creates the order and order items atomically.
3. Server creates a payment intent or gateway payload using the final server-calculated order total.
4. Customer is redirected or submitted to the provider only after the order exists.
5. Gateway webhook verifies the signature using the private merchant secret.
6. Verified success updates `orders.payment_status`, `orders.order_status`, and inserts/upserts `payment_transactions`.
7. Verified failure or expiry calls `release_order_stock(...)` if stock was reserved.
8. Confirmation email is sent only after COD/manual order creation or verified online payment success.

## Payment Transactions

Use `public.payment_transactions` for all future gateway callbacks:

- Store provider name.
- Store provider transaction/payment identifier.
- Store amount and currency.
- Store normalized status.
- Store raw payload as JSONB for audit/debugging.
- Use a unique provider transaction identifier and upsert behavior to make webhook processing idempotent.

Webhook handlers must be safe to receive the same event more than once.

## Stock Release And Recovery

Online gateways introduce abandoned, failed, or expired payments. Never reserve or deduct stock unless there is a release path.

Future gateway failure paths should reuse:

```sql
select public.release_order_stock(
  p_order_id := '<order-id>',
  p_cancel_order := true,
  p_payment_status := 'failed'
);
```

The function is designed to be idempotent through `orders.stock_released_at`, so calling it twice should not restore inventory twice.

## Email Reuse

`sendOrderConfirmationEmail(...)` should remain provider-agnostic.

Use it for:

- COD/manual order confirmation after successful order creation.
- Future PayHere/Koko/Stripe confirmation only after webhook verification confirms successful payment.

Do not send a paid-order email from a client redirect page. Redirect pages can be spoofed or refreshed.

## Future Environment Variables

These are future-only and must not be required for the current MVP:

```env
PAYHERE_MERCHANT_ID=
PAYHERE_SECRET=
PAYHERE_SANDBOX=true
NEXT_PUBLIC_SITE_URL=
```

Rules:

- `PAYHERE_SECRET` must stay server-only.
- Do not prefix merchant secrets with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SITE_URL` can be public because it is used to build return/cancel URLs.

## Security Rules

Never trust client amount.

Always calculate subtotal, discount, delivery fee, and grand total on the server.

Always verify gateway webhook signatures before updating orders.

Never expose merchant secrets to client components, browser payloads, logs, or public env vars.

Never mark an order as paid from a browser redirect alone.

Never deduct or reserve stock without a release/recovery path.

Never return raw gateway, Supabase, or Postgres error messages directly to customers.

## PayHere Implementation Checklist

When PayHere is intentionally implemented later:

1. Add a `PayHereProvider` that implements the shared payment provider interface.
2. Read `PAYHERE_MERCHANT_ID`, `PAYHERE_SECRET`, and `PAYHERE_SANDBOX` only in server-only code.
3. Generate PayHere payloads only from server-calculated order totals.
4. Replace disabled PayHere route behavior with provider-backed logic.
5. Verify PayHere IPN signatures before updating order status.
6. Upsert `payment_transactions` using PayHere payment/transaction identifiers.
7. On success, mark the order paid/confirmed and send confirmation email.
8. On failure/cancellation/expiry, call `release_order_stock(...)`.
9. Keep COD/manual checkout available and independent.
