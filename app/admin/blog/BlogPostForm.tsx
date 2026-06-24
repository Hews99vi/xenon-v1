"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { slugify } from "@/lib/adminSchemas";
import type { BlogPostActionState } from "./actions";

const blogFormSchema = z.object({
  title: z.string().trim().min(2, "Title is required."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a URL-safe slug."),
  excerpt: z.string().trim().optional(),
  content: z.string().trim().min(1, "Content is required."),
  seoTitle: z.string().trim().optional(),
  seoDescription: z.string().trim().optional(),
  status: z.enum(["draft", "published"]),
});

type BlogFormValues = z.input<typeof blogFormSchema>;

type BlogPostFormProps = {
  action: (
    prevState: BlogPostActionState,
    formData: FormData,
  ) => Promise<BlogPostActionState>;
  submitLabel: string;
  defaultValues?: Partial<BlogFormValues> & {
    coverImageUrl?: string | null;
  };
};

const initialState: BlogPostActionState = {
  ok: false,
  message: "",
};

export function BlogPostForm({
  action,
  submitLabel,
  defaultValues,
}: BlogPostFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [slugEdited, setSlugEdited] = useState(Boolean(defaultValues?.slug));
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      slug: defaultValues?.slug || "",
      excerpt: defaultValues?.excerpt || "",
      content: defaultValues?.content || "",
      seoTitle: defaultValues?.seoTitle || "",
      seoDescription: defaultValues?.seoDescription || "",
      status: defaultValues?.status || "draft",
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

      <Field label="Excerpt" error={errors.excerpt?.message}>
        <textarea className="admin-input min-h-24 py-3" {...register("excerpt")} />
      </Field>

      <Field label="Content Markdown" error={errors.content?.message}>
        <textarea
          className="admin-input min-h-80 py-3 font-mono"
          placeholder="Write Markdown here..."
          {...register("content")}
        />
      </Field>

      <Field label="Cover image">
        <input
          className="admin-file"
          name="coverImage"
          type="file"
          accept="image/png,image/jpeg,image/webp"
        />
        {defaultValues?.coverImageUrl ? (
          <p className="mt-2 text-xs text-neutral-500">Current cover image is saved.</p>
        ) : null}
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="SEO title" error={errors.seoTitle?.message}>
          <input className="admin-input" {...register("seoTitle")} />
        </Field>
        <Field label="SEO description" error={errors.seoDescription?.message}>
          <input className="admin-input" {...register("seoDescription")} />
        </Field>
      </div>

      <Field label="Status" error={errors.status?.message}>
        <select className="admin-input" {...register("status")}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
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
