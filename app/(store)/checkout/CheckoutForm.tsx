"use client";

/* eslint-disable @next/next/no-img-element */

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { formatPrice } from "@/components/storefront/ProductCard";
import { validateCartItemsAction } from "@/app/cart/actions";
import type { CartItem } from "@/lib/cart/types";
import { useCart } from "@/lib/cart/useCart";
import { ACTIVE_PAYMENT_METHODS } from "@/lib/paymentMethods";
import {
  getDeliveryFeeAction,
  submitCheckoutAction,
  validatePromoCodeAction,
  type PromoResult,
} from "./actions";

type DeliveryZone = {
  id: string;
  name: string;
  district: string | null;
  city: string | null;
  delivery_fee: number;
};

type CheckoutFormProps = {
  deliveryZones: DeliveryZone[];
};

const checkoutFormSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  phone: z.string().trim().min(7, "Phone number is required."),
  email: z
    .string()
    .trim()
    .email("Use a valid email.")
    .optional()
    .or(z.literal("")),
  addressLine1: z.string().trim().min(3, "Address line 1 is required."),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2, "City is required."),
  district: z.string().uuid("Select a delivery district."),
  postalCode: z.string().trim().optional(),
  deliveryNote: z.string().trim().optional(),
  promoCode: z.string().trim().optional(),
  paymentMethod: z.enum(ACTIVE_PAYMENT_METHODS),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export function CheckoutForm({ deliveryZones }: CheckoutFormProps) {
  const router = useRouter();
  const { items, hasHydrated, hydrateCart, replaceItems, clearCart } =
    useCart();
  const [deliveryQuote, setDeliveryQuote] = useState<{
    district: string;
    fee: number | null;
    failed?: boolean;
  }>({ district: "", fee: null });
  const [deliveryAttempt, setDeliveryAttempt] = useState(0);
  const [promo, setPromo] = useState<(NonNullable<PromoResult["promo"]> & { quotedSubtotal: number }) | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const submissionInFlight = useRef(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasValidatedHydratedCart = useRef(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      district: "",
      postalCode: "",
      deliveryNote: "",
      promoCode: "",
      paymentMethod: "cod",
    },
  });

  const district = useWatch({ control, name: "district" });
  const deliveryFee =
    deliveryQuote.district === district ? deliveryQuote.fee : null;
  const promoCode = useWatch({ control, name: "promoCode" });
  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );
  const promoMatches = promo?.code === (promoCode || "").trim().toUpperCase() && promo?.quotedSubtotal === subtotal;
  const discount = promoMatches ? promo?.discountAmount || 0 : 0;
  const total = Math.max(0, subtotal - discount + (deliveryFee ?? 0));

  useEffect(() => {
    if (!hasHydrated) {
      hydrateCart();
    }
  }, [hasHydrated, hydrateCart]);

  const validateCartSnapshot = useCallback(
    async (cartItems: CartItem[]) => {
      if (!cartItems.length) {
        return { ok: true, items: [] as CartItem[], message: "" };
      }

      const result = await validateCartItemsAction(
        cartItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      ).catch(() => ({
        ok: false,
        items: [] as CartItem[],
        removedVariantIds: [],
        adjustedVariantIds: [],
        refreshedVariantIds: [],
        message: "Cart could not be checked. Please try again.",
      }));

      if (!result.ok) {
        setMessage(result.message);
        return result;
      }

      replaceItems(result.items);

      if (result.message) {
        setMessage(result.message);
      }

      return result;
    },
    [replaceItems],
  );

  useEffect(() => {
    if (!hasHydrated || hasValidatedHydratedCart.current || !items.length) {
      return;
    }

    hasValidatedHydratedCart.current = true;
    void validateCartSnapshot(items);
  }, [hasHydrated, items, validateCartSnapshot]);

  useEffect(() => {
    let cancelled = false;
    if (district)
      void getDeliveryFeeAction(district)
        .then((result) => {
          if (cancelled) return;
          setDeliveryQuote({
            district,
            fee: result.ok ? result.fee : null,
            failed: !result.ok,
          });
          setMessage(result.ok ? "" : result.message);
        })
        .catch(() => {
          if (!cancelled)
            setDeliveryQuote({ district, fee: null, failed: true });
          if (!cancelled)
            setMessage(
              "Delivery could not be calculated. Retry the delivery quote.",
            );
        });
    return () => {
      cancelled = true;
    };
  }, [district, deliveryAttempt]);

  async function applyPromoCode() {
    if (isApplyingPromo) return;
    setMessage("");
    setIsApplyingPromo(true);
    try {
      const result = await validatePromoCodeAction(promoCode || "", subtotal);
      setPromo(result.ok && result.promo ? { ...result.promo, quotedSubtotal: subtotal } : null);
      setMessage(result.message);
    } catch {
      setPromo(null);
      setMessage("The promotion could not be checked. Please try again.");
    } finally {
      setIsApplyingPromo(false);
    }
  }

  async function onSubmit(values: CheckoutFormValues) {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    setMessage("");
    try {
      if (!items.length) { setMessage("Your bag is empty."); return; }
      const validation = await validateCartSnapshot(items);
      if (!validation.ok || !validation.items.length) {
        setMessage(validation.message || "Your bag is empty."); return;
      }
      const result = await submitCheckoutAction({
        ...values,
        items: validation.items.map(item => ({productId:item.productId,variantId:item.variantId,quantity:item.quantity})),
      });
      if (!result.ok) { setMessage(result.message); return; }
      clearCart();
      router.push(result.redirectUrl);
    } catch {
      setMessage("We could not confirm the order status. Your bag is saved. Contact the store before trying again to avoid placing a duplicate order.");
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start">
      <form
        className="order-2 space-y-7 bg-white text-black lg:pr-10"
        onSubmit={(event) => { void handleSubmit(onSubmit)(event); }}
        noValidate
      >
        <div className="hairline-heavy-b pb-5">
          <h1 className="text-3xl font-normal tracking-tight sm:text-4xl">
            Delivery details
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            Place your order with cash on delivery. We will contact you before
            dispatch.
          </p>
        </div>

        <fieldset disabled={isSubmitting} className="min-w-0 space-y-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="checkout-fullName"
            label="Full name"
            error={errors.fullName?.message}
          >
            <input
              className="store-input"
              {...fieldA11y("checkout-fullName", errors.fullName?.message)}
              autoComplete="name"
              {...register("fullName")}
            />
          </Field>
          <Field
            id="checkout-phone"
            label="Phone"
            error={errors.phone?.message}
          >
            <input
              className="store-input"
              {...fieldA11y("checkout-phone", errors.phone?.message)}
              type="tel" autoComplete="tel"
              {...register("phone")}
            />
          </Field>
        </div>

        <Field
          id="checkout-email"
          label="Email optional"
          error={errors.email?.message}
        >
          <input
            className="store-input"
            type="email"
            {...fieldA11y("checkout-email", errors.email?.message)}
            autoComplete="email"
            {...register("email")}
          />
        </Field>

        <Field
          id="checkout-addressLine1"
          label="Address line 1"
          error={errors.addressLine1?.message}
        >
          <input
            className="store-input"
            {...fieldA11y(
              "checkout-addressLine1",
              errors.addressLine1?.message,
            )}
            autoComplete="address-line1"
            {...register("addressLine1")}
          />
        </Field>

        <Field
          id="checkout-addressLine2"
          label="Address line 2"
          error={errors.addressLine2?.message}
        >
          <input
            className="store-input"
            {...fieldA11y(
              "checkout-addressLine2",
              errors.addressLine2?.message,
            )}
            autoComplete="address-line2"
            {...register("addressLine2")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="checkout-city" label="City" error={errors.city?.message}>
            <input
              className="store-input"
              {...fieldA11y("checkout-city", errors.city?.message)}
              autoComplete="address-level2"
              {...register("city")}
            />
          </Field>
          <Field
            id="checkout-district"
            label="District"
            error={errors.district?.message}
          >
            <select
              className="store-input"
              {...fieldA11y("checkout-district", errors.district?.message)}
              {...register("district", {
                onChange: (event) =>
                  setDeliveryQuote({ district: event.target.value, fee: null }),
              })}
            >
              <option value="">Select district</option>
              {deliveryZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="checkout-postalCode"
            label="Postal code"
            error={errors.postalCode?.message}
          >
            <input
              className="store-input"
              {...fieldA11y("checkout-postalCode", errors.postalCode?.message)}
              autoComplete="postal-code"
              {...register("postalCode")}
            />
          </Field>
        </div>

        <Field
          id="checkout-deliveryNote"
          label="Delivery note"
          error={errors.deliveryNote?.message}
        >
          <textarea
            className="store-input min-h-28 py-3"
            {...fieldA11y(
              "checkout-deliveryNote",
              errors.deliveryNote?.message,
            )}
            {...register("deliveryNote")}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field
            id="checkout-promoCode"
            label="Promo code"
            error={errors.promoCode?.message}
          >
            <input
              className="store-input"
              {...fieldA11y("checkout-promoCode", errors.promoCode?.message)}
              {...register("promoCode", { onChange: () => { setPromo(null); setMessage(""); } })}
            />
          </Field>
          <button
            className="self-end border border-black bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] transition hover:bg-black hover:text-white"
            type="button"
            onClick={() => void applyPromoCode()}
            disabled={isApplyingPromo}
          >
            {isApplyingPromo ? "Checking…" : "Apply"}
          </button>
        </div>

        <div className="hairline border-black/15 bg-white p-4">
          <p className="micro-label mb-3">Payment method</p>
          <input type="hidden" value="cod" {...register("paymentMethod")} />
          <div className="flex items-start justify-between gap-4 border border-black bg-[#fbfaf8] p-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-black">
                Cash on delivery
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                We will contact you before dispatch
              </p>
            </div>
            <span className="border border-black bg-black px-2 py-1 text-xs font-black uppercase tracking-[0.16em] text-white">
              Active
            </span>
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
            Pay when your order arrives.
          </p>
        </div>

        </fieldset>
        {promo && !promoMatches && <p role="status" className="text-sm text-neutral-600">Your bag changed. Apply the promotion again to refresh the estimate.</p>}
        {!deliveryZones.length && <p role="alert" className="text-sm text-red-800">Delivery is currently unavailable. Please contact the store before placing an order.</p>}
        {deliveryQuote.district === district && deliveryQuote.failed && (
          <button
            className="admin-secondary"
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setDeliveryQuote({ district, fee: null });
              setMessage("");
              setDeliveryAttempt(attempt => attempt + 1);
            }}
          >
            Retry delivery quote
          </button>
        )}
        {message ? (
          <p
            className="border border-black bg-white px-4 py-3 text-sm font-medium text-black"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}

        <button
          className="store-button w-full"
          type="submit"
          disabled={isSubmitting || !items.length || !deliveryZones.length || Boolean(district && deliveryFee === null)}
        >
          {isSubmitting ? "Placing order" : "Place order"}
        </button>
      </form>

      <aside className="order-1 h-fit bg-[var(--x-smoke)] p-5 lg:order-3 lg:sticky lg:top-28 sm:p-7">
        <details open className="checkout-summary">
          <summary className="mb-4 cursor-pointer text-sm font-semibold">
            Order summary · {formatPrice(total)}
          </summary>

          <div className="space-y-4">
            {items.length ? (
              items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex gap-3 border-b border-neutral-200 pb-4"
                >
                  <div className="h-20 w-16 shrink-0 overflow-hidden border border-neutral-300 bg-neutral-100">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black uppercase leading-tight tracking-[0.08em] text-black">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                      {[item.color, item.size || "Free Size"]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                    <p className="mt-2 text-sm font-medium text-neutral-700">
                      {item.quantity} x {formatPrice(item.price)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm font-medium text-neutral-600">
                Your cart is empty.
              </p>
            )}
          </div>

          <div className="mt-5 space-y-3 border-t border-black pt-5 text-sm">
            <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
            <SummaryRow
              label="Delivery"
              value={
                district
                  ? deliveryFee === null
                    ? deliveryQuote.failed
                      ? "Unavailable"
                      : "Calculating…"
                    : formatPrice(deliveryFee)
                  : "Select a district"
              }
            />
            <SummaryRow label="Discount" value={`-${formatPrice(discount)}`} />
            <div className="flex items-center justify-between border-t border-black pt-4 text-base font-black uppercase tracking-[0.08em]">
              <span>{deliveryFee === null ? "Estimated total" : "Total"}</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </details>
      </aside>
    </div>
  );
}

function fieldA11y(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <label
        className="mb-2 block text-sm font-medium text-neutral-700"
        htmlFor={id}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-2 block text-xs font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-neutral-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
