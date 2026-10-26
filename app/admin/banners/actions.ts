"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import {
  createUploadPath,
  getImageUploadErrorMessage,
  isEmptyFileInput,
  validateImageFile,
} from "@/lib/adminImageUploads";
import { removeStorageFilesFromPublicUrls } from "@/lib/adminStorageCleanup";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const bannerSchema = z.object({
  title: z.string().trim().min(2, "Title is required."),
  subtitle: z.string().trim().optional(),
  eyebrow: z.string().trim().optional(),
  placement: z.enum(["home_hero", "home_editorial", "home_campaign_secondary"]),
  buttonText: z.string().trim().optional(),
  buttonLink: z.string().trim().optional(),
  secondaryButtonText: z.string().trim().optional(),
  secondaryButtonLink: z.string().trim().optional(),
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

function toBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

async function uploadBannerImage(file: File, label = "Banner image") {
  if (isEmptyFileInput(file)) {
    return null;
  }

  validateImageFile(file, label);

  const supabase = await createServerSupabaseClient();
  const path = createUploadPath("banners", file);
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
    eyebrow: formData.get("eyebrow"),
    placement: formData.get("placement") || "home_hero",
    buttonText: formData.get("buttonText"),
    buttonLink: formData.get("buttonLink"),
    secondaryButtonText: formData.get("secondaryButtonText"),
    secondaryButtonLink: formData.get("secondaryButtonLink"),
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

    if (!(image instanceof File) || isEmptyFileInput(image)) {
      return { ok: false, message: "Banner image is required." };
    }

    const mobileImage = formData.get("mobileImage");
    const imageUrl = image instanceof File ? await uploadBannerImage(image) : null;
    const mobileImageUrl =
      mobileImage instanceof File
        ? await uploadBannerImage(mobileImage, "Mobile banner image")
        : null;
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("banners").insert({
      title: parsed.data.title,
      subtitle: parsed.data.subtitle || null,
      eyebrow: parsed.data.eyebrow || null,
      image_url: imageUrl,
      mobile_image_url: mobileImageUrl,
      cta_label: parsed.data.buttonText || null,
      cta_url: parsed.data.buttonLink || null,
      secondary_cta_label: parsed.data.secondaryButtonText || null,
      secondary_cta_url: parsed.data.secondaryButtonLink || null,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
      placement: parsed.data.placement,
    });

    if (error) {
      logActionError("createBannerAction", error);
      if (imageUrl) {
        await removeStorageFilesFromPublicUrls(
          supabase,
          "banner-images",
          [imageUrl, mobileImageUrl],
          "createBannerAction:bannerInsertFailed",
        );
      }
      return { ok: false, message: getActionErrorMessage("create banner") };
    }

    revalidatePath("/admin/banners");
    revalidatePath("/");
    return { ok: true, message: "Banner created." };
  } catch (error) {
    logActionError("createBannerAction", error);
    const imageUploadMessage = getImageUploadErrorMessage(error);

    if (imageUploadMessage) {
      return { ok: false, message: imageUploadMessage };
    }

    return {
      ok: false,
      message: getActionErrorMessage("create banner"),
    };
  }
}

export async function updateBannerAction(
  prevState: BannerActionState = defaultState,
  formData: FormData,
): Promise<BannerActionState> {
  void prevState;
  const id = String(formData.get("id") || "");
  const parsed = bannerSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    eyebrow: formData.get("eyebrow"),
    placement: formData.get("placement") || "home_hero",
    buttonText: formData.get("buttonText"),
    buttonLink: formData.get("buttonLink"),
    secondaryButtonText: formData.get("secondaryButtonText"),
    secondaryButtonLink: formData.get("secondaryButtonLink"),
    sortOrder: formData.get("sortOrder") || 0,
    isActive: toBoolean(formData.get("isActive")),
  });

  if (!id) {
    return { ok: false, message: "Banner could not be identified." };
  }

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid banner.",
    };
  }

  try {
    const image = formData.get("image");
    const mobileImage = formData.get("mobileImage");
    const imageUrl = image instanceof File ? await uploadBannerImage(image) : null;
    const mobileImageUrl =
      mobileImage instanceof File
        ? await uploadBannerImage(mobileImage, "Mobile banner image")
        : null;
    const supabase = await createServerSupabaseClient();
    const { data: currentBanner, error: currentBannerError } = imageUrl || mobileImageUrl
      ? await supabase.from("banners").select("image_url, mobile_image_url").eq("id", id).maybeSingle()
      : { data: null, error: null };

    if (currentBannerError) {
      logActionError("updateBannerAction:getCurrentImage", currentBannerError);
    }

    const payload: Record<string, unknown> = {
      title: parsed.data.title,
      subtitle: parsed.data.subtitle || null,
      eyebrow: parsed.data.eyebrow || null,
      placement: parsed.data.placement,
      cta_label: parsed.data.buttonText || null,
      cta_url: parsed.data.buttonLink || null,
      secondary_cta_label: parsed.data.secondaryButtonText || null,
      secondary_cta_url: parsed.data.secondaryButtonLink || null,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
    };

    if (imageUrl) {
      payload.image_url = imageUrl;
    }

    if (mobileImageUrl) {
      payload.mobile_image_url = mobileImageUrl;
    }

    const { error } = await supabase.from("banners").update(payload).eq("id", id);

    if (error) {
      logActionError("updateBannerAction", error);
      if (imageUrl) {
        await removeStorageFilesFromPublicUrls(
          supabase,
          "banner-images",
          [imageUrl, mobileImageUrl],
          "updateBannerAction:bannerUpdateFailed",
        );
      }
      return { ok: false, message: getActionErrorMessage("update banner") };
    }

    if (imageUrl && currentBanner?.image_url) {
      await removeStorageFilesFromPublicUrls(
        supabase,
        "banner-images",
        [currentBanner.image_url],
        "updateBannerAction",
      );
    }

    if (mobileImageUrl && currentBanner?.mobile_image_url) {
      await removeStorageFilesFromPublicUrls(
        supabase,
        "banner-images",
        [currentBanner.mobile_image_url],
        "updateBannerAction:mobile",
      );
    }

    revalidatePath("/admin/banners");
    revalidatePath("/");
    return { ok: true, message: "Banner updated." };
  } catch (error) {
    logActionError("updateBannerAction", error);
    return {
      ok: false,
      message:
        getImageUploadErrorMessage(error) ||
        getActionErrorMessage("update banner"),
    };
  }
}

export async function deleteBannerAction(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  const { data: banner, error: bannerError } = await supabase
    .from("banners")
    .select("image_url, mobile_image_url")
    .eq("id", id)
    .maybeSingle();

  if (bannerError) {
    logActionError("deleteBannerAction:getImage", bannerError);
  }

  const { error } = await supabase.from("banners").delete().eq("id", id);

  if (error) {
    logActionError("deleteBannerAction", error);
    return;
  }

  await removeStorageFilesFromPublicUrls(
    supabase,
    "banner-images",
    [banner?.image_url, banner?.mobile_image_url],
    "deleteBannerAction",
  );

  revalidatePath("/admin/banners");
  revalidatePath("/");
}
