"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, X, Plus, Minus } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart/useCart";
import type { CartItem } from "@/lib/cart/types";
import { formatPrice } from "@/components/storefront/ProductCard";
import { validateCartItemsAction } from "@/app/cart/actions";

export function CartDrawer() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const hasValidatedHydratedCart = useRef(false);
  const {
    items,
    hasHydrated,
    hydrateCart,
    removeItem,
    updateQuantity,
    replaceItems,
    clearCart,
  } = useCart();

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );

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

      setIsValidating(true);
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
      })).finally(() => setIsValidating(false));

      if (!result.ok) {
        setCartNotice(result.message);
        return result;
      }

      replaceItems(result.items);

      if (result.message) {
        setCartNotice(result.message);
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

  async function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen);

    if (nextOpen && hasHydrated && items.length) {
      await validateCartSnapshot(items);
    }
  }

  async function handleCheckout() {
    const result = await validateCartSnapshot(items);

    if (!result.ok || !result.items.length) {
      return;
    }

    setIsOpen(false);
    router.push("/checkout");
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => void handleOpenChange(open)}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label={`Open cart, ${itemCount} items`}
            className="inline-flex min-h-11 items-center justify-center gap-2 text-[13px] transition-opacity duration-200 hover:opacity-70"
            id="cart-drawer-trigger"
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
            <span className="hidden sm:inline">Bag ({itemCount})</span>
            {itemCount>0&&<span className="text-xs sm:hidden">{itemCount}</span>}
          </button>
        }
      />

      <SheetContent
        side="right"
        showCloseButton={false}
        className="z-[90] w-full max-w-[31rem] gap-0 border-l border-black/10 bg-white p-0 text-black shadow-xl sm:w-[31rem]"
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex items-center justify-between border-b border-black/12 px-5 py-5 sm:px-6">
            <div>
              <SheetTitle className="text-2xl font-normal tracking-tight text-black">
                Your bag
              </SheetTitle>
              <SheetDescription className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </SheetDescription>
            </div>
            <SheetClose
              render={
                <button
                  type="button"
                  aria-label="Close cart"
                  className="grid h-10 w-10 place-items-center text-black transition-opacity hover:opacity-55"
                />
              }
            >
              <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </SheetClose>
          </header>

          {cartNotice ? (
            <div role="status" className="border-b border-black/12 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-neutral-600 sm:px-6">
              {cartNotice}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.length ? (
              <div className="divide-y divide-black/10">
                {items.map((item) => (
                  <article key={item.variantId} className="grid grid-cols-[5.6rem_1fr] gap-4 px-5 py-5 sm:grid-cols-[6.2rem_1fr] sm:px-6">
                    <Link
                      href={`/products/${item.slug}`}
                      className="block aspect-[3/4] overflow-hidden bg-[#efefef]"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <img
                            src="/logo/black xenon png.png"
                            alt=""
                            aria-hidden="true"
                            className="h-auto w-12 object-contain opacity-20"
                          />
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="block"
                          >
                            <h3 className="text-[0.86rem] font-bold leading-tight text-black transition-opacity hover:opacity-60">
                              {item.name}
                            </h3>
                          </Link>
                          <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                            {[item.color, item.size || "Free Size"].filter(Boolean).join(" / ")}
                          </p>
                        </div>

                        <button
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          className="min-h-11 text-xs text-neutral-600 underline hover:text-black"
                          onClick={() => removeItem(item.variantId)}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-4">
                        <div className="inline-flex border border-black">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            className="grid h-11 w-11 place-items-center text-base leading-none disabled:opacity-30"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus size={15} strokeWidth={1.5}/>
                          </button>
                          <span
                            className="grid h-11 w-11 place-items-center border-x border-black text-xs font-black"
                            aria-label={`Quantity: ${item.quantity}`}
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            className="grid h-11 w-11 place-items-center text-base leading-none disabled:opacity-30"
                            disabled={item.quantity >= item.stockQuantity}
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          >
                            <Plus size={15} strokeWidth={1.5}/>
                          </button>
                        </div>

                        <p className="text-[0.78rem] font-black uppercase tracking-[0.04em] text-black">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-full flex-col items-start justify-center px-5 py-16 sm:px-6">
                <p className="text-3xl font-normal leading-tight tracking-tight">
                  Your bag is empty.
                </p>
                <p className="mt-4 max-w-[18rem] text-[0.88rem] font-medium leading-6 text-neutral-500">
                  Explore the collection and find your next piece.
                </p>
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      href="/products"
                      className="mt-7 inline-flex bg-black px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-neutral-800"
                    />
                  }
                >
                  Continue shopping
                </SheetClose>
              </div>
            )}
          </div>

          {items.length ? (
            <footer className="border-t border-black/12 bg-white px-5 py-5 sm:px-6">
              <div className="space-y-3 border-b border-black/12 pb-5">
                <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
                <SummaryRow label="Delivery" value="Calculated at checkout" muted />
              </div>

              <p className="py-4 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                Delivery calculated at checkout. Discounts apply at checkout.
              </p>

              <button
                type="button"
                className="block w-full bg-black px-6 py-4 text-center text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800 disabled:bg-neutral-500"
                disabled={isValidating}
                onClick={() => void handleCheckout()}
              >
                {isValidating ? "Checking bag…" : "Checkout"}
              </button>

              <div className="mt-4 flex items-center justify-between gap-4">
                <button
                  type="button"
                  className="min-h-11 text-xs text-neutral-600 underline hover:text-black"
                  onClick={() => { if (window.confirm("Remove all items from your bag?")) clearCart(); }}
                >
                  Clear bag
                </button>
                <SheetClose
                  render={
                    <button
                      type="button"
                      className="text-xs font-black uppercase tracking-[0.16em] text-black transition-opacity hover:opacity-55"
                    />
                  }
                >
                  Continue shopping
                </SheetClose>
              </div>
            </footer>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>
      <span
        className={[
          "text-[0.76rem] font-black uppercase tracking-[0.04em]",
          muted ? "text-neutral-500" : "text-black",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
