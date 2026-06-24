"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { categorySchema } from "@/lib/adminSchemas";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export type CategoryActionState = {
  ok: boolean;
  message: string;
};

const initialState: CategoryActionState = {
  ok: false,
  message: "",
};

function toBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function sanitizeFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
}

async function uploadCategoryImage(file: File) {
  if (!file.size) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `categories/${crypto.randomUUID()}-${sanitizeFilename(file.name || `image.${extension}`)}`;

  const { error } = await supabase.storage
    .from("category-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("category-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function createCategoryAction(
  prevState: CategoryActionState = initialState,
  formData: FormData,
): Promise<CategoryActionState> {
  void prevState;
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    isActive: toBoolean(formData.get("isActive")),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid category data.",
    };
  }

  const image = formData.get("image");

  try {
    const imageUrl = image instanceof File ? await uploadCategoryImage(image) : null;
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("categories").insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      image_url: imageUrl,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
    });

    if (error) {
      logActionError("createCategoryAction", error);
      return { ok: false, message: getActionErrorMessage("create category") };
    }

    revalidatePath("/admin/categories");
    return { ok: true, message: "Category created." };
  } catch (error) {
    logActionError("createCategoryAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("create category"),
    };
  }
}

export async function updateCategoryAction(
  id: string,
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    isActive: toBoolean(formData.get("isActive")),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid category data.",
    };
  }

  const image = formData.get("image");

  try {
    const imageUrl = image instanceof File ? await uploadCategoryImage(image) : null;
    const supabase = await createServerSupabaseClient();
    const payload: Record<string, unknown> = {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
    };

    if (imageUrl) {
      payload.image_url = imageUrl;
    }

    const { error } = await supabase.from("categories").update(payload).eq("id", id);

    if (error) {
      logActionError("updateCategoryAction", error);
      return { ok: false, message: getActionErrorMessage("update category") };
    }

    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${id}/edit`);
    return { ok: true, message: "Category updated." };
  } catch (error) {
    logActionError("updateCategoryAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("update category"),
    };
  }
}

export async function deleteCategoryAction(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  await supabase.from("categories").delete().eq("id", id);

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}
