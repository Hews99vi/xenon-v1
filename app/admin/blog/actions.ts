"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const blogPostSchema = z.object({
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

export type BlogPostActionState = {
  ok: boolean;
  message: string;
};

const defaultState: BlogPostActionState = {
  ok: false,
  message: "",
};

function sanitizeFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
}

async function uploadCoverImage(file: File) {
  if (!file.size) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const path = `blog/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
  const { error } = await supabase.storage
    .from("blog-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function createBlogPostAction(
  prevState: BlogPostActionState = defaultState,
  formData: FormData,
): Promise<BlogPostActionState> {
  void prevState;
  const parsed = blogPostSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid blog post.",
    };
  }

  try {
    const coverImage = formData.get("coverImage");
    const coverImageUrl =
      coverImage instanceof File ? await uploadCoverImage(coverImage) : null;
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("blog_posts").insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      excerpt: parsed.data.excerpt || null,
      content: parsed.data.content,
      cover_image_url: coverImageUrl,
      status: parsed.data.status,
      seo_title: parsed.data.seoTitle || null,
      seo_description: parsed.data.seoDescription || null,
      published_at:
        parsed.data.status === "published" ? new Date().toISOString() : null,
    });

    if (error) {
      logActionError("createBlogPostAction", error);
      return { ok: false, message: getActionErrorMessage("create blog post") };
    }

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    return { ok: true, message: "Blog post created." };
  } catch (error) {
    logActionError("createBlogPostAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("create blog post"),
    };
  }
}

export async function updateBlogPostAction(
  id: string,
  prevState: BlogPostActionState = defaultState,
  formData: FormData,
): Promise<BlogPostActionState> {
  void prevState;
  const parsed = blogPostSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid blog post.",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const coverImage = formData.get("coverImage");
    const coverImageUrl =
      coverImage instanceof File ? await uploadCoverImage(coverImage) : null;
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("published_at")
      .eq("id", id)
      .maybeSingle();
    const payload: Record<string, unknown> = {
      title: parsed.data.title,
      slug: parsed.data.slug,
      excerpt: parsed.data.excerpt || null,
      content: parsed.data.content,
      status: parsed.data.status,
      seo_title: parsed.data.seoTitle || null,
      seo_description: parsed.data.seoDescription || null,
      published_at:
        parsed.data.status === "published"
          ? existing?.published_at || new Date().toISOString()
          : null,
    };

    if (coverImageUrl) {
      payload.cover_image_url = coverImageUrl;
    }

    const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);

    if (error) {
      logActionError("updateBlogPostAction", error);
      return { ok: false, message: getActionErrorMessage("update blog post") };
    }

    revalidatePath("/admin/blog");
    revalidatePath(`/admin/blog/${id}/edit`);
    revalidatePath("/blog");
    return { ok: true, message: "Blog post updated." };
  } catch (error) {
    logActionError("updateBlogPostAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("update blog post"),
    };
  }
}

export async function deleteBlogPostAction(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  await supabase.from("blog_posts").delete().eq("id", id);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog");
}
