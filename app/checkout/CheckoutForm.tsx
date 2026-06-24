"use client";

/* eslint-disable @next/next/no-img-element */

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { formatPrice } from "@/components/storefront/ProductCard";
import { useCart } from "@/lib/cart/useCart";
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

const checkoutFormSchema = z
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
  })
  .refine((data) => data.paymentMethod !== "payhere" || Boolean(data.email), {
    message: "Email is required for PayHere payments.",
    path: ["email"],
  });

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export function CheckoutForm({ deliveryZones }: CheckoutFormProps) {
  const router = useRouter();
  const { items, hasHydrated, hydrateCart, clearCart } = useCart();
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [promo, setPromo] = useState<PromoResult["promo"] | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const promoCode = useWatch({ control, name: "promoCode" });
  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );
  const discount = promo?.discountAmount || 0;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  useEffect(() => {
    if (!hasHydrated) {
      hydrateCart();
    }
  }, [hasHydrated, hydrateCart]);

  useEffect(() => {
    async function fetchDeliveryFee() {
      if (!district) {
        setDeliveryFee(0);
        return;
      }

      const result = await getDeliveryFeeAction(district);
      setDeliveryFee(result.ok ? result.fee : 0);
      setMessage(result.ok ? "" : result.message);
    }

    void fetchDeliveryFee();
  }, [district]);

  async function applyPromoCode() {
    setMessage("");
    const result = await validatePromoCodeAction(promoCode || "", subtotal);

    if (!result.ok) {
      setPromo(null);
      setMessage(result.message);
      return;
    }

    setPromo(result.promo || null);
    setMessage(result.message);
  }

  async function onSubmit(values: CheckoutFormValues) {
    setMessage("");

    if (!items.length) {
      setMessage("Your cart is empty.");
      return;
    }

    setIsSubmitting(true);
    const result = await submitCheckoutAction({
      ...values,
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    if (result.paymentMethod === "cod") {
      clearCart();
      router.push(result.redirectUrl);
      return;
    }

    submitPayHereForm(result.payhere.actionUrl, result.payhere.params);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <form
        className="space-y-6 border border-black bg-white p-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="border-b border-black pb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-neutral-600">
            Guest checkout
          </p>
          <h1 className="text-3xl font-semibold text-black">Delivery details</h1>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" error={errors.fullName?.message}>
            <input className="store-input" {...register("fullName")} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <input className="store-input" {...register("phone")} />
          </Field>
        </div>

        <Field label="Email optional, required for PayHere" error={errors.email?.message}>
          <input className="store-input" type="email" {...register("email")} />
        </Field>

        <Field label="Address line 1" error={errors.addressLine1?.message}>
          <input className="store-input" {...register("addressLine1")} />
        </Field>

        <Field label="Address line 2" error={errors.addressLine2?.message}>
          <input className="store-input" {...register("addressLine2")} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="City" error={errors.city?.message}>
            <input className="store-input" {...register("city")} />
          </Field>
          <Field label="District" error={errors.district?.message}>
            <select className="store-input" {...register("district")}>
              <option value="">Select district</option>
              {deliveryZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Postal code" error={errors.postalCode?.message}>
            <input className="store-input" {...register("postalCode")} />
          </Field>
        </div>

        <Field label="Delivery note" error={errors.deliveryNote?.message}>
          <textarea className="store-input min-h-28 py-3" {...register("deliveryNote")} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Promo code" error={errors.promoCode?.message}>
            <input className="store-input" {...register("promoCode")} />
          </Field>
          <button
            className="self-end border border-black bg-white px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em]"
            type="button"
            onClick={() => void applyPromoCode()}
          >
            Apply
          </button>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-600">
            Payment method
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 border border-black p-4 text-sm font-medium">
              <input
                className="h-4 w-4 accent-black"
                type="radio"
                value="cod"
                {...register("paymentMethod")}
              />
              Cash on delivery
            </label>
            <label className="flex items-center gap-3 border border-black p-4 text-sm font-medium">
              <input
                className="h-4 w-4 accent-black"
                type="radio"
                value="payhere"
                {...register("paymentMethod")}
              />
              PayHere
            </label>
          </div>
        </div>

        {message ? (
          <p className="border border-black bg-neutral-100 px-4 py-3 text-sm">
            {message}
          </p>
        ) : null}

        <button
          className="w-full border border-black bg-black px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-neutral-800 disabled:bg-neutral-500"
          type="submit"
          disabled={isSubmitting || !items.length}
        >
          {isSubmitting ? "Placing order" : "Place order"}
        </button>
      </form>

      <aside className="h-fit border border-black bg-white p-5 lg:sticky lg:top-6">
        <p className="mb-5 border-b border-black pb-4 text-xs font-semibold uppercase tracking-[0.28em]">
          Order summary
        </p>

        <div className="space-y-4">
          {items.length ? (
            items.map((item) => (
              <div key={item.variantId} className="flex gap-3 border-b border-neutral-200 pb-4">
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
                  <p className="font-semibold text-black">{item.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                    {[item.color, item.size || "Free Size"].filter(Boolean).join(" / ")}
                  </p>
                  <p className="mt-2 text-sm text-neutral-700">
                    {item.quantity} x {formatPrice(item.price)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-600">Your cart is empty.</p>
          )}
        </div>

        <div className="mt-5 space-y-3 border-t border-black pt-5 text-sm">
          <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
          <SummaryRow label="Delivery" value={formatPrice(deliveryFee)} />
          <SummaryRow label="Discount" value={`-${formatPrice(discount)}`} />
          <div className="flex items-center justify-between border-t border-black pt-4 text-base font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-neutral-700">
        {label}
      </span>
      {children}
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
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

function submitPayHereForm(actionUrl: string, params: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = actionUrl;

  Object.entries(params).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
