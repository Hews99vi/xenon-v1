"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const bannerSchema = z.object({
  title: z.string().trim().min(2, "Title is required."),
  subtitle: z.string().trim().optional(),
  buttonText: z.string().trim().optional(),
  buttonLink: z.string().trim().optional(),
  sortOrder: z.coerce.number().int().min(0, "Sort order cannot be negative."),
  isActive: z.coerce.boolean(),
});

export type BannerActionState = {
  ok: boolean;
  message: string;
};

const defaultState: BannerActionState = {
  ok: false,
  message: "",
};

const allowedBannerImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBannerImageSize = 5 * 1024 * 1024;

function toBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function sanitizeFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
}

async function uploadBannerImage(file: File) {
  if (!file.size) {
    return null;
  }

  if (!allowedBannerImageTypes.has(file.type)) {
    throw new Error("invalid_banner_image_type");
  }

  if (file.size > maxBannerImageSize) {
    throw new Error("banner_image_too_large");
  }

  const supabase = await createServerSupabaseClient();
  const path = `banners/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
  const { error } = await supabase.storage
    .from("banner-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("banner-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function createBannerAction(
  prevState: BannerActionState = defaultState,
  formData: FormData,
): Promise<BannerActionState> {
  void prevState;
  const parsed = bannerSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    buttonText: formData.get("buttonText"),
    buttonLink: formData.get("buttonLink"),
    sortOrder: formData.get("sortOrder") || 0,
    isActive: toBoolean(formData.get("isActive")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid banner.",
    };
  }

  try {
    const image = formData.get("image");

    if (!(image instanceof File) || !image.size) {
      return { ok: false, message: "Banner image is required." };
    }

    const imageUrl = image instanceof File ? await uploadBannerImage(image) : null;
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("banners").insert({
      title: parsed.data.title,
      subtitle: parsed.data.subtitle || null,
      image_url: imageUrl,
      cta_label: parsed.data.buttonText || null,
      cta_url: parsed.data.buttonLink || null,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
      placement: "home_hero",
    });

    if (error) {
      logActionError("createBannerAction", error);
      return { ok: false, message: getActionErrorMessage("create banner") };
    }

    revalidatePath("/admin/banners");
    revalidatePath("/");
    return { ok: true, message: "Banner created." };
  } catch (error) {
    logActionError("createBannerAction", error);
    if (error instanceof Error && error.message === "invalid_banner_image_type") {
      return {
        ok: false,
        message: "Upload a JPG, PNG, or WebP banner image.",
      };
    }

    if (error instanceof Error && error.message === "banner_image_too_large") {
      return {
        ok: false,
        message: "Banner image must be 5 MB or smaller.",
      };
    }

    return {
      ok: false,
      message: getActionErrorMessage("create banner"),
    };
  }
}

export async function updateBannerAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const parsed = bannerSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    buttonText: formData.get("buttonText"),
    buttonLink: formData.get("buttonLink"),
    sortOrder: formData.get("sortOrder") || 0,
    isActive: toBoolean(formData.get("isActive")),
  });

  if (!id || !parsed.success) {
    return;
  }

  try {
    const image = formData.get("image");
    const imageUrl = image instanceof File ? await uploadBannerImage(image) : null;
    const supabase = await createServerSupabaseClient();
    const payload: Record<string, unknown> = {
      title: parsed.data.title,
      subtitle: parsed.data.subtitle || null,
      cta_label: parsed.data.buttonText || null,
      cta_url: parsed.data.buttonLink || null,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
    };

    if (imageUrl) {
      payload.image_url = imageUrl;
    }

    await supabase.from("banners").update(payload).eq("id", id);
    revalidatePath("/admin/banners");
    revalidatePath("/");
  } catch (error) {
    logActionError("updateBannerAction", error);
  }
}

export async function deleteBannerAction(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  await supabase.from("banners").delete().eq("id", id);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}
