"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  type CategoryFormValues,
  type CategoryInput,
  categorySchema,
  slugify,
} from "@/lib/adminSchemas";
import type { CategoryActionState } from "./actions";

type CategoryFormProps = {
  action: (
    prevState: CategoryActionState,
    formData: FormData,
  ) => Promise<CategoryActionState>;
  submitLabel: string;
  defaultValues?: Partial<CategoryInput> & {
    imageUrl?: string | null;
  };
};

const defaultState: CategoryActionState = {
  ok: false,
  message: "",
};

export function CategoryForm({
  action,
  submitLabel,
  defaultValues,
}: CategoryFormProps) {
  const [state, formAction, isPending] = useActionState(action, defaultState);
  const [slugEdited, setSlugEdited] = useState(Boolean(defaultValues?.slug));
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: defaultValues?.name || "",
      slug: defaultValues?.slug || "",
      description: defaultValues?.description || "",
      isActive: defaultValues?.isActive ?? true,
      sortOrder: defaultValues?.sortOrder ?? 0,
    },
  });

  const name = useWatch({ control, name: "name" }) || "";

  useEffect(() => {
    if (!slugEdited) {
      setValue("slug", slugify(name), { shouldValidate: true });
    }
  }, [name, setValue, slugEdited]);

  return (
    <form action={formAction} className="space-y-6">
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

      <Field label="Description" error={errors.description?.message}>
        <textarea className="admin-input min-h-32 py-3" {...register("description")} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Image" hint="PNG, JPG, or WebP stored in Supabase Storage.">
          <input
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="admin-file"
          />
          {defaultValues?.imageUrl ? (
            <p className="mt-2 text-xs text-neutral-600">Current image is saved.</p>
          ) : null}
        </Field>

        <Field label="Sort order" error={errors.sortOrder?.message}>
          <input
            className="admin-input"
            type="number"
            min="0"
            {...register("sortOrder")}
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-black">
        <input
          type="checkbox"
          className="h-4 w-4 accent-black"
          {...register("isActive")}
        />
        Active category
      </label>

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

      <button className="admin-button" type="submit" disabled={isPending}>
        {isPending ? "Saving" : submitLabel}
      </button>
    </form>
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
