"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart/useCart";
import { formatPrice } from "@/components/storefront/ProductCard";

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    items,
    hasHydrated,
    hydrateCart,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCart();
  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () =>
      items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );

  useEffect(() => {
    if (!hasHydrated) {
      hydrateCart();
    }
  }, [hasHydrated, hydrateCart]);

  return (
    <>
      <button
        type="button"
        className="border border-black bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-neutral-100"
        onClick={() => setIsOpen(true)}
      >
        Cart ({itemCount})
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close cart overlay"
            className="absolute inset-0 bg-black/45"
            type="button"
            onClick={() => setIsOpen(false)}
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-black bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-black bg-white px-5 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-600">
                  Shopping cart
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-black">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </h2>
              </div>
              <button
                type="button"
                className="border border-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {items.length ? (
                <div className="space-y-4">
                  {items.map((item) => (
                    <article
                      key={item.variantId}
                      className="grid grid-cols-[5.5rem_1fr] gap-4 border border-black bg-white p-3"
                    >
                      <Link
                        href={`/products/${item.slug}`}
                        className="aspect-[4/5] overflow-hidden border border-neutral-300 bg-neutral-100"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full bg-[linear-gradient(135deg,#fff_0%,#fff_45%,#0a0a0a_45%,#0a0a0a_55%,#fff_55%,#f4f4f4_100%)]" />
                        )}
                      </Link>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/products/${item.slug}`}
                              className="font-semibold text-black hover:underline"
                              onClick={() => setIsOpen(false)}
                            >
                              {item.name}
                            </Link>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                              {[item.color, item.size || "Free Size"]
                                .filter(Boolean)
                                .join(" / ")}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="text-xs font-semibold uppercase tracking-[0.16em] underline"
                            onClick={() => removeItem(item.variantId)}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex items-center border border-black">
                            <button
                              type="button"
                              className="h-9 w-9 border-r border-black text-lg"
                              onClick={() =>
                                updateQuantity(item.variantId, item.quantity - 1)
                              }
                            >
                              -
                            </button>
                            <input
                              aria-label={`Quantity for ${item.name}`}
                              className="h-9 w-12 bg-white text-center text-sm outline-none"
                              min="1"
                              max={item.stockQuantity}
                              type="number"
                              value={item.quantity}
                              onChange={(event) =>
                                updateQuantity(
                                  item.variantId,
                                  Number(event.target.value),
                                )
                              }
                            />
                            <button
                              type="button"
                              className="h-9 w-9 border-l border-black text-lg disabled:text-neutral-400"
                              disabled={item.quantity >= item.stockQuantity}
                              onClick={() =>
                                updateQuantity(item.variantId, item.quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-semibold">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {item.stockQuantity} available
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="border border-black bg-white p-8 text-center text-sm text-neutral-600">
                  Your cart is empty.
                </div>
              )}
            </div>

            <div className="border-t border-black bg-white p-5">
              <div className="space-y-3 text-sm">
                <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
                <SummaryRow label="Delivery fee" value="Calculated at checkout" />
                <SummaryRow label="Discount" value="Promo code later" />
              </div>

              <div className="mt-5 grid gap-3">
                <Link
                  href="/checkout"
                  className={`border border-black px-5 py-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-white ${
                    items.length
                      ? "bg-black hover:bg-neutral-800"
                      : "pointer-events-none bg-neutral-500"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  Checkout
                </Link>
                <button
                  type="button"
                  className="border border-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em]"
                  disabled={!items.length}
                  onClick={clearCart}
                >
                  Clear cart
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-neutral-600">{label}</span>
      <span className="font-semibold text-black">{value}</span>
    </div>
  );
}
