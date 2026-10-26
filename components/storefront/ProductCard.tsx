"use client";

import { useRef, useState } from "react";
import { StoreImage as Image } from "@/components/content/StoreImage";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getQuickAddProduct } from "@/app/cart/actions";
import type { ProductDetail, ProductSummary } from "@/lib/storefront";
import { useCart } from "@/lib/cart/useCart";

export function formatPrice(value: number) {
  return `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function resolveProductPrice(
  variantPrice: number | null | undefined,
  salePrice: number | null,
  basePrice: number,
) {
  return typeof variantPrice === "number" && variantPrice >= 0
    ? variantPrice
    : (salePrice ?? basePrice);
}

const colorMap: Record<string, string> = {
  black: "#050505",
  white: "#f8f8f8",
  ivory: "#f2eadc",
  cream: "#efe4cf",
  grey: "#9a9a9a",
  gray: "#9a9a9a",
  navy: "#101a33",
  blue: "#244f9e",
  red: "#b91c1c",
  pink: "#f3a7bd",
  green: "#2f6f4e",
  yellow: "#f4ca34",
  brown: "#6f4e37",
};

export function swatchColor(color: string) {
  return (
    colorMap[color.trim().toLowerCase()] ||
    (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color) ? color : undefined)
  );
}

export function variantLabel(product: ProductSummary) {
  if (product.shortDescription) return product.shortDescription;

  const colors = product.colors.slice(0, 2).join(" / ");
  const sizes = product.sizes.slice(0, 2).join(" / ");

  if (colors && sizes) return `${colors} - ${sizes}`;
  if (colors) return colors;
  if (sizes) return sizes;
  return product.categoryName || "Xenon";
}

export function productHref(product: ProductSummary) {
  return `/products/${product.slug}`;
}

type ProductCardProps = {
  product: ProductSummary;
  imageSizes?: string;
  dense?: boolean;
};

export function ProductCard({
  product,
  imageSizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
}: ProductCardProps) {
  const quickTrigger = useRef<HTMLButtonElement>(null);
  const addItem = useCart((s) => s.addItem);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [choice, setChoice] = useState("");
  const [pending, setPending] = useState(false);
  const price = product.salePrice ?? product.basePrice;
  const sale =
    product.salePrice !== null && product.salePrice < product.basePrice;
  function add(variant: {
    id: string;
    color: string | null;
    size: string | null;
    price: number | null;
    stockQuantity: number;
  }) {
    addItem({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      slug: product.slug,
      image: product.primaryImage,
      color: variant.color,
      size: variant.size || "Free Size",
      price: resolveProductPrice(
        variant.price,
        product.salePrice,
        product.basePrice,
      ),
      quantity: 1,
      stockQuantity: variant.stockQuantity,
    });
    setMessage("Added to bag");
    setOpen(false);
  }
  async function quickAdd() {
    setMessage("");
    if (product.quickAddVariant) {
      add(product.quickAddVariant);
      return;
    }
    setOpen(true);
    setPending(true);
    setChoice("");
    try {
      const value = await getQuickAddProduct(product.slug);
      setDetail(value);
      if (!value) setMessage("This product is currently unavailable.");
    } catch {
      setMessage("Could not load options. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="product-card group">
      <div className="relative overflow-hidden bg-neutral-100">
        <Link
          href={productHref(product)}
          className="relative block aspect-[3/4]"
          aria-label={product.name}
        >
          {product.primaryImage ? (
            <Image
              src={product.primaryImage}
              alt={product.name}
              fill
              sizes={imageSizes}
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-sm text-neutral-500">
              Image coming soon
            </div>
          )}
        </Link>
        {sale && (
          <span className="absolute left-2 top-2 bg-black px-2 py-1 text-xs font-semibold text-white">
            Sale
          </span>
        )}
        <button
          ref={quickTrigger}
          type="button"
          className="quick-add-button"
          onClick={quickAdd}
          disabled={product.inStock === false}
        >
          {product.inStock === false
            ? "Sold out"
            : product.quickAddVariant
              ? "Quick add"
              : "Choose options"}
        </button>
      </div>
      <div className="product-card-info">
        <Link
          title={product.name}
          className="product-card-name hover:underline"
          href={productHref(product)}
        >
          {product.name}
        </Link>
        <p className="product-card-option line-clamp-2">
          {variantLabel(product)}
        </p>
        <div className="product-card-price">
          <span>{formatPrice(price)}</span>
          {sale && (
            <s className="text-neutral-500">{formatPrice(product.basePrice)}</s>
          )}
        </div>
        {product.colors.length > 0 && (
          <div
            className="mt-3 flex flex-wrap gap-1.5"
            aria-label={`Colors: ${product.colors.join(", ")}`}
          >
            {product.colors.slice(0, 6).map((color) =>
              swatchColor(color) ? (
                <span
                  key={color}
                  className="h-3.5 w-3.5 border border-black/20"
                  style={{ backgroundColor: swatchColor(color) }}
                  title={color}
                />
              ) : (
                <span
                  key={color}
                  className="max-w-full break-words text-xs text-neutral-600"
                >
                  {color}
                </span>
              ),
            )}
          </div>
        )}
        <p className="mt-1 text-xs" role="status">
          {message}
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          finalFocus={quickTrigger}
          className="rounded-none bg-white p-6 sm:max-w-lg"
        >
          <DialogTitle className="pr-8 text-xl font-semibold">
            {product.name}
          </DialogTitle>
          <DialogDescription>
            Choose an available color and size.
          </DialogDescription>
          {pending ? (
            <p role="status">Loading options…</p>
          ) : (
            <>
              <label className="editor-field">
                <span>Color / size</span>
                <select
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                >
                  <option value="">Select an option</option>
                  {detail?.variants
                    .filter((v) => v.isActive)
                    .map((v) => (
                      <option
                        key={v.id}
                        value={v.id}
                        disabled={!v.stockQuantity}
                      >
                        {[v.color, v.size || "Free Size"]
                          .filter(Boolean)
                          .join(" / ")}{" "}
                        ·{" "}
                        {formatPrice(
                          resolveProductPrice(
                            v.price,
                            product.salePrice,
                            product.basePrice,
                          ),
                        )}
                        {!v.stockQuantity ? " — Sold out" : ""}
                      </option>
                    ))}
                </select>
              </label>
              {message && <p role="status">{message}</p>}
              <button
                className="store-button"
                disabled={!choice}
                onClick={() => {
                  const v = detail?.variants.find((v) => v.id === choice);
                  if (v && v.isActive && v.stockQuantity > 0) add(v);
                }}
              >
                Add to bag
              </button>
              <Link
                className="py-2 text-sm underline"
                href={productHref(product)}
              >
                View product details
              </Link>
            </>
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
}
