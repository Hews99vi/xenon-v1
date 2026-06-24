"use client";

import { create } from "zustand";

export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  image: string | null;
  color: string | null;
  size: string | null;
  price: number;
  quantity: number;
  stockQuantity: number;
};

type CartState = {
  items: CartItem[];
  hasHydrated: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, newQty: number) => void;
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
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(items));
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
    const nextItems = get().items.filter((item) => item.variantId !== variantId);
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
  clearCart: () => {
    set({ items: [] });
    writeCart([]);
  },
}));
