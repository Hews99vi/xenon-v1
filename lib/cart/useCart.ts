"use client";

import { create } from "zustand";
import type { CartItem } from "./types";

export type { CartItem };

type CartState = {
  items: CartItem[];
  hasHydrated: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, newQty: number) => void;
  replaceItems: (items: CartItem[]) => void;
  clearCart: () => void;
  hydrateCart: () => void;
};

const storageKey = "xenon-cart";

function clampQuantity(quantity: number, stockQuantity: number) {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.max(1, Math.min(quantity, stockQuantity));
}

function readCart() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CartItem =>
      Boolean(
        item &&
        typeof item === "object" &&
        typeof item.productId === "string" &&
        typeof item.variantId === "string" &&
        typeof item.name === "string" &&
        typeof item.slug === "string" &&
        [item.image, item.color, item.size].every(
          (value) => value == null || typeof value === "string",
        ) &&
        Number.isFinite(item.price) &&
        item.price >= 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        Number.isInteger(item.stockQuantity) &&
        item.stockQuantity >= 0,
      ),
    );
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    /* Keep the current cart usable when browser storage is unavailable. */
  }
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  hasHydrated: false,
  hydrateCart: () => {
    const items = readCart().map((item) => ({
      ...item,
      quantity: clampQuantity(item.quantity, item.stockQuantity),
    }));

    set({ items, hasHydrated: true });
  },
  addItem: (item) => {
    const items = get().items;
    const existingItem = items.find(
      (cartItem) => cartItem.variantId === item.variantId,
    );
    const nextItems = existingItem
      ? items.map((cartItem) =>
          cartItem.variantId === item.variantId
            ? {
                ...cartItem,
                ...item,
                quantity: clampQuantity(
                  cartItem.quantity + item.quantity,
                  item.stockQuantity,
                ),
              }
            : cartItem,
        )
      : [
          ...items,
          {
            ...item,
            quantity: clampQuantity(item.quantity, item.stockQuantity),
          },
        ];

    set({ items: nextItems });
    writeCart(nextItems);
  },
  removeItem: (variantId) => {
    const nextItems = get().items.filter(
      (item) => item.variantId !== variantId,
    );
    set({ items: nextItems });
    writeCart(nextItems);
  },
  updateQuantity: (variantId, newQty) => {
    const nextItems = get().items.map((item) =>
      item.variantId === variantId
        ? {
            ...item,
            quantity: clampQuantity(newQty, item.stockQuantity),
          }
        : item,
    );

    set({ items: nextItems });
    writeCart(nextItems);
  },
  replaceItems: (items) => {
    const nextItems = items.map((item) => ({
      ...item,
      quantity: clampQuantity(item.quantity, item.stockQuantity),
    }));

    set({ items: nextItems });
    writeCart(nextItems);
  },
  clearCart: () => {
    set({ items: [] });
    writeCart([]);
  },
}));
