"use client";

import { Plus, Minus, ZoomIn } from "lucide-react";
import { useMemo, useState, useRef } from "react";
import { StoreImage as Image } from "@/components/content/StoreImage";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ProductDetail } from "@/lib/storefront";
import { useCart } from "@/lib/cart/useCart";
import { formatPrice, resolveProductPrice, swatchColor } from "./ProductCard";

export function ProductDetailClient({
  product,
  sizeGuideHtml,
  returnsHtml,
}: {
  product: ProductDetail;
  sizeGuideHtml?: string;
  returnsHtml?: string;
}) {
  const guideTrigger = useRef<HTMLButtonElement>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const addItem = useCart((state) => state.addItem);
  const images = useMemo(() => {
    const seen = new Set<string>();
    const uniqueImages = product.images.filter((image) => {
      const identity = image.imageUrl;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });

    return uniqueImages.length
      ? uniqueImages
      : [
          {
            id: "placeholder",
            imageUrl: "",
            altText: product.name,
            isPrimary: true,
          },
        ];
  }, [product.images, product.name]);

  const variants = useMemo(
    () => product.variants.filter((v) => v.isActive),
    [product.variants],
  );
  const colors = useMemo(
    () =>
      Array.from(
        new Set(variants.map((v) => v.color).filter(Boolean)),
      ) as string[],
    [variants],
  );
  const sizes = useMemo(
    () => Array.from(new Set(variants.map((v) => v.size || "Free Size"))),
    [variants],
  );

  const firstAvailableVariant =
    variants.find((variant) => variant.stockQuantity > 0) || variants[0];
  const [selectedColor, setSelectedColor] = useState(
    firstAvailableVariant?.color || colors[0] || "",
  );
  const [selectedSize, setSelectedSize] = useState(
    firstAvailableVariant?.size || sizes[0] || "Free Size",
  );
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  const selectedVariant = variants.find((variant) => {
    const colorMatches = colors.length ? variant.color === selectedColor : true;
    const sizeMatches = (variant.size || "Free Size") === selectedSize;
    return colorMatches && sizeMatches;
  });

  const price = resolveProductPrice(
    selectedVariant?.price,
    product.salePrice,
    product.basePrice,
  );
  const inStock = Boolean(selectedVariant && selectedVariant.stockQuantity > 0);
  const maxQuantity = selectedVariant?.stockQuantity || 1;

  function updateQuantity(nextQuantity: number) {
    setQuantity(Math.max(1, Math.min(nextQuantity, maxQuantity)));
  }

  function selectColor(color: string) {
    setSelectedColor(color);
    const matchingVariant = variants.find(
      (variant) =>
        variant.color === color &&
        (variant.size || "Free Size") === selectedSize &&
        variant.stockQuantity > 0,
    );

    if (!matchingVariant) {
      const nextVariant = variants.find(
        (variant) => variant.color === color && variant.stockQuantity > 0,
      );
      if (nextVariant) setSelectedSize(nextVariant.size || "Free Size");
    }
    setQuantity(1);
  }

  function addToCart() {
    if (!selectedVariant) {
      setMessage({ text: "Select an available option.", ok: false });
      return;
    }

    if (!inStock) {
      setMessage({ text: "This option is out of stock.", ok: false });
      return;
    }

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      slug: product.slug,
      image: images[0]?.imageUrl || null,
      color: selectedVariant.color,
      size: selectedVariant.size || "Free Size",
      price,
      quantity,
      stockQuantity: selectedVariant.stockQuantity,
    });

    setMessage({ text: "Added to cart.", ok: true });
  }

  return (
    <div className="x-container bg-white py-6 text-black sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:items-start lg:gap-16">
        <ProductGallery images={images} productName={product.name} />

        <aside className="pb-12 lg:sticky lg:top-28 lg:py-3">
          <header className="border-b border-black/10 pb-6">
            <h1 className="max-w-[22ch] text-[clamp(1.9rem,3vw,3rem)] font-normal leading-[1.12] tracking-[-0.035em]">
              {product.name}
            </h1>

            <div className="mt-4 flex items-baseline gap-3">
              <p className="text-lg font-normal tabular-nums text-black">
                {formatPrice(price)}
              </p>
              {product.salePrice !== null &&
              product.salePrice < product.basePrice ? (
                <p className="text-xs font-medium text-neutral-400 line-through">
                  {formatPrice(product.basePrice)}
                </p>
              ) : null}
            </div>
          </header>

          <div className="space-y-6 py-6">
            {colors.length ? (
              <div>
                <ProductLabel label="Color" value={selectedColor} />
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => selectColor(color)}
                      className={[
                        "min-h-11 min-w-11 border px-2 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
                        selectedColor === color
                          ? "border-white ring-1 ring-black ring-offset-2"
                          : "border-black/20 hover:border-black/60",
                      ].join(" ")}
                      style={{ backgroundColor: swatchColor(color) }}
                      aria-label={`Select ${color}`}
                      aria-pressed={selectedColor === color}
                    >
                      {!swatchColor(color) && (
                        <span className="text-xs">{color}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between gap-4">
                <ProductLabel label="Select size" value={selectedSize} />
                {sizeGuideHtml && (
                  <button
                    ref={guideTrigger}
                    type="button"
                    className="min-h-11 text-sm underline"
                    onClick={() => setGuideOpen(true)}
                  >
                    Size guide
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const available = variants.some((variant) => {
                    const colorMatches = colors.length
                      ? variant.color === selectedColor
                      : true;
                    return (
                      colorMatches &&
                      (variant.size || "Free Size") === size &&
                      variant.stockQuantity > 0
                    );
                  });

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setQuantity(1);
                      }}
                      disabled={!available}
                      className={[
                        "min-h-12 min-w-14 border px-4 py-3 text-sm transition-colors",
                        selectedSize === size
                          ? "border-black bg-black text-white"
                          : "border-black/15 bg-white text-black hover:border-black",
                        available
                          ? ""
                          : "cursor-not-allowed text-neutral-300 line-through",
                      ].join(" ")}
                      aria-pressed={selectedSize === size}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-end justify-between gap-5">
              <div>
                <ProductLabel label="Quantity" value={`${quantity}`} />
                <div className="mt-3 inline-flex overflow-hidden border border-black/20 bg-white">
                  <button
                    type="button"
                    onClick={() => updateQuantity(quantity - 1)}
                    disabled={quantity <= 1}
                    className="grid h-10 w-10 place-items-center text-base transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:text-neutral-300"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} strokeWidth={1.5}/>
                  </button>
                  <span className="grid h-10 w-10 place-items-center border-x border-black/10 text-xs font-bold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(quantity + 1)}
                    disabled={!inStock || quantity >= maxQuantity}
                    className="grid h-10 w-10 place-items-center text-base transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:text-neutral-300"
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} strokeWidth={1.5}/>
                  </button>
                </div>
              </div>

              <p className="pb-3 text-right text-xs font-bold uppercase tracking-[0.13em] text-neutral-500">
                {selectedVariant
                  ? inStock
                    ? "In stock"
                    : "Out of stock"
                  : "Unavailable"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="store-button w-full"
            disabled={!selectedVariant || !inStock}
            onClick={addToCart}
            id="add-to-cart-btn"
          >
            {inStock ? "Add to bag" : "Sold out"}
          </button>

          <div className="min-h-6" aria-live="polite">
            {message ? (
              <p
                className={[
                  "mt-3 text-center text-xs font-bold uppercase tracking-[0.12em]",
                  message.ok ? "text-neutral-600" : "text-red-600",
                ].join(" ")}
                role="status"
              >
                {message.text}
              </p>
            ) : null}
          </div>

          {(product.description || product.shortDescription) && <div className="mt-2 border-t border-neutral-200"><ProductAccordion title="Product details">{product.description || product.shortDescription}</ProductAccordion></div>}

          {returnsHtml && (
            <details className="mt-4 border-t py-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Returns & exchanges
              </summary>
              <div
                className="markdown-content mt-3"
                dangerouslySetInnerHTML={{ __html: returnsHtml }}
              />
              <Link
                className="mt-3 block text-sm underline"
                href="/return-policy"
              >
                Read returns policy
              </Link>
            </details>
          )}
          <p className="mt-4 text-sm text-neutral-500">
            Delivery calculated at checkout.
          </p>
          <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
            <DialogContent
              finalFocus={guideTrigger}
              className="max-h-[85svh] overflow-auto rounded-none bg-white p-6 sm:max-w-2xl"
            >
              <DialogTitle className="text-2xl font-semibold">
                Size guide
              </DialogTitle>
              <div
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: sizeGuideHtml || "" }}
              />
            </DialogContent>
          </Dialog>
          <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
            <strong className="text-sm">{formatPrice(price)}</strong>
            <button
              className="store-button flex-1"
              disabled={!inStock}
              onClick={addToCart}
            >
              {inStock ? "Add to bag" : "Sold out"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ProductGallery({
  images,
  productName,
}: {
  images: ProductDetail["images"];
  productName: string;
}) {
  const zoomTrigger = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState(0),
    [zoom, setZoom] = useState(false);
  return (
    <div className="min-w-0">
      <button
        ref={zoomTrigger}
        type="button"
        className="relative block aspect-[3/4] w-full bg-neutral-100 lg:max-h-[760px]"
        aria-label="Zoom product image"
        onClick={() => setZoom(true)}
      >
        <ProductImage
          image={images[selected]}
          productName={productName}
          priority
          sizes="(min-width:1024px) 55vw, 100vw"
        />
        <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 bg-white px-3 py-2 text-xs">
          Zoom <ZoomIn size={15} strokeWidth={1.5}/>
        </span>
      </button>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-auto p-1">
          {images.map((image, i) => (
            <button
              type="button"
              key={image.id}
              onClick={() => setSelected(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={selected === i}
              className={`relative h-24 w-20 shrink-0 border-2 ${selected === i ? "border-black" : "border-transparent"}`}
            >
              <ProductImage
                image={image}
                productName={productName}
                priority={false}
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent
          finalFocus={zoomTrigger}
          className="h-[90svh] max-w-[95vw] rounded-none bg-white sm:max-w-4xl"
        >
          <DialogTitle className="sr-only">
            {productName} — image {selected + 1}
          </DialogTitle>
          <div className="relative h-full w-full">
            <ProductImage
              image={images[selected]}
              productName={productName}
              priority
              sizes="90vw"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductImage({
  image,
  productName,
  priority,
  sizes,
}: {
  image: ProductDetail["images"][number];
  productName: string;
  priority: boolean;
  sizes: string;
}) {
  if (!image.imageUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Image
          src="/logo/black xenon png.png"
          alt=""
          aria-hidden="true"
          width={160}
          height={48}
          className="h-auto w-32 object-contain opacity-20"
        />
      </div>
    );
  }

  return (
    <Image
      src={image.imageUrl}
      alt={image.altText || productName}
      fill
      preload={priority}
      sizes={sizes}
      className="object-contain"
    />
  );
}

function ProductLabel({ label, value }: { label: string; value?: string }) {
  return (
    <p className="text-sm font-medium text-neutral-600">
      {label}
      {value ? <span className="ml-2 text-black">/ {value}</span> : null}
    </p>
  );
}

function ProductAccordion({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group border-b border-black/12 py-5" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-black">
        {title}
        <Plus size={17} strokeWidth={1.5} className="text-neutral-600 transition-transform group-open:rotate-45"/>
      </summary>
      <div className="mt-4 max-w-[34rem] text-base leading-7 text-neutral-600">
        {children}
      </div>
    </details>
  );
}
