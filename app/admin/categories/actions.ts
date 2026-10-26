"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { categorySchema } from "@/lib/adminSchemas";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import {
  createUploadPath,
  getImageUploadErrorMessage,
  isEmptyFileInput,
  validateImageFile,
} from "@/lib/adminImageUploads";
import { removeStorageFilesFromPublicUrls } from "@/lib/adminStorageCleanup";
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

async function uploadCategoryImage(file: File) {
  if (isEmptyFileInput(file)) {
    return null;
  }

  validateImageFile(file, "Category image");

  const supabase = await createServerSupabaseClient();
  const path = createUploadPath("categories", file);

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
    audience: formData.get("audience") || "",
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
      audience: parsed.data.audience || null,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      image_url: imageUrl,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
    });

    if (error) {
      logActionError("createCategoryAction", error);
      if (imageUrl) {
        await removeStorageFilesFromPublicUrls(
          supabase,
          "category-images",
          [imageUrl],
          "createCategoryAction:categoryInsertFailed",
        );
      }
      return { ok: false, message: getActionErrorMessage("create category") };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/products"); // Revalidate storefront product listing (shows categories)
    revalidatePath("/", "layout"); // Revalidate homepage (shows category grid)
    return { ok: true, message: "Category created." };
  } catch (error) {
    logActionError("createCategoryAction", error);
    const imageUploadMessage = getImageUploadErrorMessage(error);

    if (imageUploadMessage) {
      return { ok: false, message: imageUploadMessage };
    }

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
    audience: formData.get("audience") || "",
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
    const { data: currentCategory, error: currentCategoryError } = imageUrl
      ? await supabase.from("categories").select("image_url").eq("id", id).maybeSingle()
      : { data: null, error: null };

    if (currentCategoryError) {
      logActionError("updateCategoryAction:getCurrentImage", currentCategoryError);
    }

    const payload: Record<string, unknown> = {
      audience: parsed.data.audience || null,
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
      if (imageUrl) {
        await removeStorageFilesFromPublicUrls(
          supabase,
          "category-images",
          [imageUrl],
          "updateCategoryAction:categoryUpdateFailed",
        );
      }
      return { ok: false, message: getActionErrorMessage("update category") };
    }

    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${id}/edit`);
    revalidatePath("/products"); // Revalidate storefront product listing (shows categories)
    revalidatePath("/", "layout"); // Revalidate homepage (shows category grid)

    if (imageUrl && currentCategory?.image_url) {
      await removeStorageFilesFromPublicUrls(
        supabase,
        "category-images",
        [currentCategory.image_url],
        "updateCategoryAction",
      );
    }

    return { ok: true, message: "Category updated." };
  } catch (error) {
    logActionError("updateCategoryAction", error);
    const imageUploadMessage = getImageUploadErrorMessage(error);

    if (imageUploadMessage) {
      return { ok: false, message: imageUploadMessage };
    }

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
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();

  if (categoryError) {
    logActionError("deleteCategoryAction:getImage", categoryError);
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    logActionError("deleteCategoryAction", error);
    return;
  }

  await removeStorageFilesFromPublicUrls(
    supabase,
    "category-images",
    [category?.image_url],
    "deleteCategoryAction",
  );

  revalidatePath("/admin/categories");
  revalidatePath("/products"); // Revalidate storefront (categories filter)
  revalidatePath("/", "layout"); // Revalidate homepage (category grid)
  redirect("/admin/categories");
}
