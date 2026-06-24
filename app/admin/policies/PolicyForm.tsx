"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { slugify } from "@/lib/adminSchemas";
import type { PolicyActionState } from "./actions";

const policyFormSchema = z.object({
  title: z.string().trim().min(2, "Title is required."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a URL-safe slug."),
  content: z.string().trim().min(1, "Content is required."),
});

type PolicyFormValues = z.input<typeof policyFormSchema>;

type PolicyFormProps = {
  action: (
    prevState: PolicyActionState,
    formData: FormData,
  ) => Promise<PolicyActionState>;
  submitLabel: string;
  defaultValues?: Partial<PolicyFormValues>;
};

const initialState: PolicyActionState = {
  ok: false,
  message: "",
};

export function PolicyForm({
  action,
  submitLabel,
  defaultValues,
}: PolicyFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [slugEdited, setSlugEdited] = useState(Boolean(defaultValues?.slug));
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      slug: defaultValues?.slug || "",
      content: defaultValues?.content || "",
    },
  });
  const title = useWatch({ control, name: "title" }) || "";

  useEffect(() => {
    if (!slugEdited) {
      setValue("slug", slugify(title), { shouldValidate: true });
    }
  }, [setValue, slugEdited, title]);

  return (
    <form action={formAction} className="space-y-6 border border-black bg-white p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Title" error={errors.title?.message}>
          <input className="admin-input" {...register("title")} />
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

      <Field label="Content Markdown" error={errors.content?.message}>
        <textarea
          className="admin-input min-h-96 py-3 font-mono"
          placeholder="Write Markdown policy content..."
          {...register("content")}
        />
      </Field>

      {state.message ? (
        <p className="border border-black bg-neutral-100 px-4 py-3 text-sm">
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
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
        {label}
      </span>
      {children}
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
