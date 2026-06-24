"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type FormEvent, useActionState, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  type ProductInput,
  type ProductFormValues,
  type ProductVariantInput,
  productSchema,
  slugify,
} from "@/lib/adminSchemas";
import type { ProductActionState } from "./actions";

type CategoryOption = {
  id: string;
  name: string;
};

type ProductFormProps = {
  categories: CategoryOption[];
  action: (
    prevState: ProductActionState,
    formData: FormData,
  ) => Promise<ProductActionState>;
  submitLabel?: string;
  defaultValues?: ProductInput & {
    variants?: ProductVariantInput[];
  };
};

const defaultState: ProductActionState = {
  ok: false,
  message: "",
};

function createDefaultVariant(sku = ""): ProductVariantInput {
  return {
    color: "",
    size: "Free Size",
    sku,
    price: "",
    stockQuantity: 0,
    isActive: true,
  };
}

export function ProductForm({
  categories,
  action,
  submitLabel = "Create product",
  defaultValues,
}: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, defaultState);
  const [slugEdited, setSlugEdited] = useState(Boolean(defaultValues?.slug));
  const [imageCount, setImageCount] = useState(0);
  const [variants, setVariants] = useState<ProductVariantInput[]>(
    defaultValues?.variants?.length
      ? defaultValues.variants
      : [createDefaultVariant(defaultValues?.sku)],
  );
  const [variantError, setVariantError] = useState("");
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      slug: defaultValues?.slug || "",
      description: defaultValues?.description || "",
      shortDescription: defaultValues?.shortDescription || "",
      basePrice: defaultValues?.basePrice || 0,
      salePrice: defaultValues?.salePrice ?? "",
      sku: defaultValues?.sku || "",
      status: defaultValues?.status || "draft",
      isFeatured: defaultValues?.isFeatured || false,
      categoryId: defaultValues?.categoryId || categories[0]?.id || "",
      seoTitle: defaultValues?.seoTitle || "",
      seoDescription: defaultValues?.seoDescription || "",
    },
  });

  const name = useWatch({ control, name: "name" }) || "";
  const basePrice = useWatch({ control, name: "basePrice" }) || 0;

  useEffect(() => {
    if (!slugEdited) {
      setValue("slug", slugify(name), { shouldValidate: true });
    }
  }, [name, setValue, slugEdited]);

  function updateVariant(
    index: number,
    field: keyof ProductVariantInput,
    value: string | number | boolean,
  ) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              [field]: value,
            }
          : variant,
      ),
    );
    setVariantError("");
  }

  function addVariant() {
    setVariants((current) => [...current, createDefaultVariant()]);
    setVariantError("");
  }

  function removeVariant(index: number) {
    setVariants((current) => {
      if (current.length === 1) {
        setVariantError("At least one variant is required.");
        return current;
      }

      return current.filter((_, variantIndex) => variantIndex !== index);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!variants.length) {
      event.preventDefault();
      setVariantError("At least one variant is required.");
      return;
    }

    const combinations = new Set<string>();
    for (const variant of variants) {
      const color = (variant.color || "").trim().toLowerCase();
      const size = (variant.size || "Free Size").trim().toLowerCase();
      const key = `${color}:${size}`;

      if (combinations.has(key)) {
        event.preventDefault();
        setVariantError("Each color and size combination must be unique.");
        return;
      }

      combinations.add(key);
    }

    setVariantError("");
  }

  return (
    <form action={formAction} className="space-y-6" onSubmit={handleSubmit}>
      <input name="variantsJson" type="hidden" value={JSON.stringify(variants)} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" error={errors.name?.message}>
          <input className="admin-input" {...register("name")} />
        </Field>

        <Field label="Slug" error={errors.slug?.message}>
          <input
            className="admin-input"
            {...register("slug", {
              onChange: () => setSlugEdited(true),
            })}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" error={errors.categoryId?.message}>
          <select className="admin-input" {...register("categoryId")}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="SKU" error={errors.sku?.message}>
          <input className="admin-input" {...register("sku")} />
        </Field>
      </div>

      <Field label="Short description" error={errors.shortDescription?.message}>
        <input className="admin-input" {...register("shortDescription")} />
      </Field>

      <Field label="Description" error={errors.description?.message}>
        <textarea className="admin-input min-h-36 py-3" {...register("description")} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Price" error={errors.basePrice?.message}>
          <input
            className="admin-input"
            type="number"
            min="0"
            step="0.01"
            {...register("basePrice")}
          />
        </Field>

        <Field label="Sale price" error={errors.salePrice?.message}>
          <input
            className="admin-input"
            type="number"
            min="0"
            step="0.01"
            {...register("salePrice")}
          />
        </Field>

        <Field label="Status" error={errors.status?.message}>
          <select className="admin-input" {...register("status")}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="out_of_stock">Out of stock</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
      </div>

      <Field
        label="Product images"
        hint={`${imageCount}/5 selected. New uploads are appended. First image is primary.`}
      >
        <input
          name="images"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="admin-file"
          onChange={(event) => setImageCount(event.target.files?.length || 0)}
        />
        {imageCount > 5 ? (
          <span className="mt-2 block text-xs text-red-700">
            Select no more than 5 images.
          </span>
        ) : null}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="SEO title" error={errors.seoTitle?.message}>
          <input className="admin-input" {...register("seoTitle")} />
        </Field>

        <Field label="SEO description" error={errors.seoDescription?.message}>
          <input className="admin-input" {...register("seoDescription")} />
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-black">
        <input
          type="checkbox"
          className="h-4 w-4 accent-black"
          {...register("isFeatured")}
        />
        Featured product
      </label>

      <section className="border border-black bg-neutral-50 p-4">
        <div className="mb-4 flex flex-col gap-3 border-b border-black pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em]">
              Variants
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Empty size values are saved as Free Size. Empty prices use the
              product price ({Number(basePrice || 0).toLocaleString()}).
            </p>
          </div>
          <button
            className="border border-black bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]"
            type="button"
            onClick={addVariant}
          >
            Add variant
          </button>
        </div>

        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div
              className="grid gap-4 border border-neutral-300 bg-white p-4 lg:grid-cols-[1fr_1fr_1.2fr_1fr_1fr_auto_auto]"
              key={`${variant.id || "new"}-${index}`}
            >
              <VariantField label="Color">
                <input
                  className="admin-input"
                  value={variant.color || ""}
                  onChange={(event) =>
                    updateVariant(index, "color", event.target.value)
                  }
                />
              </VariantField>

              <VariantField label="Size">
                <input
                  className="admin-input"
                  placeholder="Free Size"
                  value={variant.size || ""}
                  onChange={(event) =>
                    updateVariant(index, "size", event.target.value)
                  }
                />
              </VariantField>

              <VariantField label="SKU">
                <input
                  className="admin-input"
                  required
                  value={variant.sku}
                  onChange={(event) =>
                    updateVariant(index, "sku", event.target.value)
                  }
                />
              </VariantField>

              <VariantField label="Price">
                <input
                  className="admin-input"
                  min="0"
                  step="0.01"
                  type="number"
                  placeholder={String(basePrice || 0)}
                  value={variant.price === undefined ? "" : variant.price}
                  onChange={(event) =>
                    updateVariant(index, "price", event.target.value)
                  }
                />
              </VariantField>

              <VariantField label="Stock">
                <input
                  className="admin-input"
                  min="0"
                  step="1"
                  type="number"
                  value={variant.stockQuantity}
                  onChange={(event) =>
                    updateVariant(index, "stockQuantity", event.target.value)
                  }
                />
              </VariantField>

              <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium">
                <input
                  checked={variant.isActive}
                  className="h-4 w-4 accent-black"
                  type="checkbox"
                  onChange={(event) =>
                    updateVariant(index, "isActive", event.target.checked)
                  }
                />
                Active
              </label>

              <button
                className="self-end border border-black px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em]"
                type="button"
                onClick={() => removeVariant(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {variantError ? (
          <p className="mt-4 border border-black bg-white px-4 py-3 text-sm text-black">
            {variantError}
          </p>
        ) : null}
      </section>

      {state.message ? (
        <p
          className={`border px-4 py-3 text-sm ${
            state.ok
              ? "border-black bg-white text-black"
              : "border-black bg-neutral-100 text-black"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button className="admin-button" type="submit" disabled={isPending || imageCount > 5}>
        {isPending ? "Saving" : submitLabel}
      </button>
    </form>
  );
}

function VariantField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-neutral-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-neutral-700">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-2 block text-xs text-neutral-500">{hint}</span> : null}
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
