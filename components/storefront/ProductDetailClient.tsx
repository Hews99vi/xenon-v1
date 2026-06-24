/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import type { ProductDetail } from "@/lib/storefront";
import { useCart } from "@/lib/cart/useCart";
import { formatPrice } from "./ProductCard";

export function ProductDetailClient({ product }: { product: ProductDetail }) {
  const addItem = useCart((state) => state.addItem);
  const images = product.images.length
    ? product.images
    : [
        {
          id: "placeholder",
          imageUrl: "",
          altText: product.name,
          isPrimary: true,
        },
      ];
  const [activeImage, setActiveImage] = useState(images[0]);
  const colors = useMemo(
    () => Array.from(new Set(product.variants.map((variant) => variant.color).filter(Boolean))),
    [product.variants],
  ) as string[];
  const sizes = useMemo(
    () => Array.from(new Set(product.variants.map((variant) => variant.size || "Free Size"))),
    [product.variants],
  );
  const [selectedColor, setSelectedColor] = useState(colors[0] || "");
  const [selectedSize, setSelectedSize] = useState(sizes[0] || "Free Size");
  const [message, setMessage] = useState("");

  const selectedVariant = product.variants.find((variant) => {
    const colorMatches = colors.length ? variant.color === selectedColor : true;
    const sizeMatches = (variant.size || "Free Size") === selectedSize;
    return colorMatches && sizeMatches;
  });

  function addToCart() {
    if (!selectedVariant) {
      setMessage("Select an available variant.");
      return;
    }

    const cartItem = {
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      slug: product.slug,
      image: images[0]?.imageUrl || null,
      color: selectedVariant.color,
      size: selectedVariant.size || "Free Size",
      price: selectedVariant.price || product.salePrice || product.basePrice,
      quantity: 1,
      stockQuantity: selectedVariant.stockQuantity,
    };
    addItem(cartItem);
    setMessage("Added to cart.");
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        <div className="aspect-[4/5] overflow-hidden border border-black bg-white">
          {activeImage.imageUrl ? (
            <img
              src={activeImage.imageUrl}
              alt={activeImage.altText || product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fff_0%,#fff_45%,#0a0a0a_45%,#0a0a0a_55%,#fff_55%,#f4f4f4_100%)] text-xs uppercase tracking-[0.24em]">
              Xenon
            </div>
          )}
        </div>

        {images.length > 1 ? (
          <div className="mt-4 grid grid-cols-5 gap-3">
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                className={`aspect-square overflow-hidden border ${
                  activeImage.id === image.id ? "border-black" : "border-neutral-300"
                }`}
                onClick={() => setActiveImage(image)}
              >
                <img
                  src={image.imageUrl}
                  alt={image.altText || product.name}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border border-black bg-white p-6 lg:p-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
          {product.categoryName || "Xenon"}
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-black">
          {product.name}
        </h1>
        <div className="mt-5 flex items-center gap-3 text-lg">
          {product.salePrice ? (
            <>
              <span className="font-semibold">{formatPrice(product.salePrice)}</span>
              <span className="text-neutral-500 line-through">
                {formatPrice(product.basePrice)}
              </span>
            </>
          ) : (
            <span className="font-semibold">{formatPrice(product.basePrice)}</span>
          )}
        </div>
        {product.description ? (
          <p className="mt-6 text-sm leading-7 text-neutral-700">
            {product.description}
          </p>
        ) : null}

        <div className="mt-8 space-y-5 border-t border-black pt-6">
          {colors.length ? (
            <VariantGroup label="Color">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`border px-4 py-3 text-xs uppercase tracking-[0.18em] ${
                    selectedColor === color
                      ? "border-black bg-black text-white"
                      : "border-black bg-white text-black"
                  }`}
                  onClick={() => setSelectedColor(color)}
                >
                  {color}
                </button>
              ))}
            </VariantGroup>
          ) : null}

          <VariantGroup label="Size">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                className={`border px-4 py-3 text-xs uppercase tracking-[0.18em] ${
                  selectedSize === size
                    ? "border-black bg-black text-white"
                    : "border-black bg-white text-black"
                }`}
                onClick={() => setSelectedSize(size)}
              >
                {size}
              </button>
            ))}
          </VariantGroup>

          <div className="text-sm text-neutral-700">
            {selectedVariant ? (
              <span>
                SKU {selectedVariant.sku} · {selectedVariant.stockQuantity} in stock
              </span>
            ) : (
              <span>This combination is unavailable.</span>
            )}
          </div>
        </div>

        <button
          className="mt-8 w-full border border-black bg-black px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-neutral-800 disabled:bg-neutral-500"
          type="button"
          disabled={!selectedVariant || selectedVariant.stockQuantity <= 0}
          onClick={addToCart}
        >
          Add to cart
        </button>

        {message ? (
          <p className="mt-4 border border-black bg-neutral-100 px-4 py-3 text-sm">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function VariantGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-600">
        {label}
      </p>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  );
}
