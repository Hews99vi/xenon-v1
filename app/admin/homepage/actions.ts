"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";

export type HomepageActionState = {
  ok: boolean;
  message: string;
};

const defaultState: HomepageActionState = {
  ok: false,
  message: "",
};
import {
  createUploadPath,
  getImageUploadErrorMessage,
  isEmptyFileInput,
  validateImageFile,
} from "@/lib/adminImageUploads";
import { removeStorageFilesFromPublicUrls } from "@/lib/adminStorageCleanup";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const sectionSchema = z.object({
  sectionId: z.string().uuid(),
  microLabel: z.string().trim().optional(),
  title: z.string().trim().min(2, "Title is required."),
  body: z.string().trim().optional(),
  values: z.string().trim().optional(),
  defaultGender: z.enum(["men", "women"]).optional(),
  isActive: z.coerce.boolean(),
});

const itemSchema = z.object({
  sectionId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Item title is required."),
  subtitle: z.string().trim().optional(),
  ctaLabel: z.string().trim().optional(),
  ctaUrl: z.string().trim().optional(),
  sortOrder: z.coerce.number().int().min(0, "Sort order cannot be negative."),
  objectPosition: z.string().trim().optional(),
  gender: z.enum(["all", "men", "women"]).optional(),
  layout: z.enum(["detail", "editorial", "wide"]).optional(),
  isActive: z.coerce.boolean(),
});

function toBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

async function uploadHomepageImage(file: File) {
  if (isEmptyFileInput(file)) {
    return null;
  }

  validateImageFile(file, "Homepage image");

  const supabase = await createServerSupabaseClient();
  const path = createUploadPath("homepage", file);
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

export async function updateHomepageSectionAction(
  prevState: HomepageActionState = defaultState,
  formData: FormData,
): Promise<HomepageActionState> {
  void prevState;
  const parsed = sectionSchema.safeParse({
    sectionId: formData.get("sectionId"),
    microLabel: formData.get("microLabel"),
    title: formData.get("title"),
    body: formData.get("body"),
    values: formData.get("values"),
    defaultGender: formData.get("defaultGender") || undefined,
    isActive: toBoolean(formData.get("isActive")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid homepage section.",
    };
  }

  const metadata: Record<string, unknown> = {};

  if (parsed.data.defaultGender) {
    metadata.defaultGender = parsed.data.defaultGender;
  }

  const values = parseLines(parsed.data.values || "");
  if (values.length) {
    metadata.values = values;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("homepage_sections")
    .update({
      micro_label: parsed.data.microLabel || null,
      title: parsed.data.title,
      body: parsed.data.body || null,
      is_active: parsed.data.isActive,
      metadata,
    })
    .eq("id", parsed.data.sectionId);

  if (error) {
    logActionError("updateHomepageSectionAction", error);
    return { ok: false, message: getActionErrorMessage("update homepage section") };
  }

  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return { ok: true, message: "Homepage section updated." };
}

export async function createHomepageItemAction(
  prevState: HomepageActionState = defaultState,
  formData: FormData,
): Promise<HomepageActionState> {
  void prevState;
  const parsed = itemSchema.safeParse({
    sectionId: formData.get("sectionId"),
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    ctaLabel: formData.get("ctaLabel"),
    ctaUrl: formData.get("ctaUrl"),
    sortOrder: formData.get("sortOrder") || 0,
    objectPosition: formData.get("objectPosition"),
    gender: formData.get("gender") || "all",
    layout: formData.get("layout") || undefined,
    isActive: toBoolean(formData.get("isActive")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid homepage item.",
    };
  }

  try {
    const image = formData.get("image");
    const imageUrl = image instanceof File ? await uploadHomepageImage(image) : null;
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("homepage_section_items").insert({
      section_id: parsed.data.sectionId,
      title: parsed.data.title,
      subtitle: parsed.data.subtitle || null,
      image_url: imageUrl,
      cta_label: parsed.data.ctaLabel || null,
      cta_url: parsed.data.ctaUrl || null,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
      metadata: buildItemMetadata(parsed.data),
    });

    if (error) {
      logActionError("createHomepageItemAction", error);
      if (imageUrl) {
        await removeStorageFilesFromPublicUrls(
          supabase,
          "banner-images",
          [imageUrl],
          "createHomepageItemAction:itemInsertFailed",
        );
      }
      return { ok: false, message: getActionErrorMessage("create homepage item") };
    }
  } catch (error) {
    logActionError("createHomepageItemAction", error);
    return {
      ok: false,
      message:
        getImageUploadErrorMessage(error) ||
        getActionErrorMessage("create homepage item"),
    };
  }

  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return { ok: true, message: "Homepage item created." };
}

export async function updateHomepageItemAction(
  prevState: HomepageActionState = defaultState,
  formData: FormData,
): Promise<HomepageActionState> {
  void prevState;
  const itemId = String(formData.get("itemId") || "");
  const parsed = itemSchema.safeParse({
    sectionId: formData.get("sectionId"),
    itemId,
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    ctaLabel: formData.get("ctaLabel"),
    ctaUrl: formData.get("ctaUrl"),
    sortOrder: formData.get("sortOrder") || 0,
    objectPosition: formData.get("objectPosition"),
    gender: formData.get("gender") || "all",
    layout: formData.get("layout") || undefined,
    isActive: toBoolean(formData.get("isActive")),
  });

  if (!itemId) {
    return { ok: false, message: "Homepage item could not be identified." };
  }

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid homepage item.",
    };
  }

  try {
    const image = formData.get("image");
    const imageUrl = image instanceof File ? await uploadHomepageImage(image) : null;
    const supabase = await createServerSupabaseClient();
    const { data: currentItem, error: currentItemError } = imageUrl
      ? await supabase
          .from("homepage_section_items")
          .select("image_url")
          .eq("id", itemId)
          .maybeSingle()
      : { data: null, error: null };

    if (currentItemError) {
      logActionError("updateHomepageItemAction:getCurrentImage", currentItemError);
    }

    const payload: Record<string, unknown> = {
      title: parsed.data.title,
      subtitle: parsed.data.subtitle || null,
      cta_label: parsed.data.ctaLabel || null,
      cta_url: parsed.data.ctaUrl || null,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
      metadata: buildItemMetadata(parsed.data),
    };

    if (imageUrl) {
      payload.image_url = imageUrl;
    }

    const { error } = await supabase
      .from("homepage_section_items")
      .update(payload)
      .eq("id", itemId);

    if (error) {
      logActionError("updateHomepageItemAction", error);
      if (imageUrl) {
        await removeStorageFilesFromPublicUrls(
          supabase,
          "banner-images",
          [imageUrl],
          "updateHomepageItemAction:itemUpdateFailed",
        );
      }
      return { ok: false, message: getActionErrorMessage("update homepage item") };
    } else if (imageUrl && currentItem?.image_url) {
      await removeStorageFilesFromPublicUrls(
        supabase,
        "banner-images",
        [currentItem.image_url],
        "updateHomepageItemAction",
      );
    }
  } catch (error) {
    logActionError("updateHomepageItemAction", error);
    return {
      ok: false,
      message:
        getImageUploadErrorMessage(error) ||
        getActionErrorMessage("update homepage item"),
    };
  }

  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return { ok: true, message: "Homepage item updated." };
}

export async function deleteHomepageItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId") || "");

  if (!itemId) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  const { data: item, error: itemError } = await supabase
    .from("homepage_section_items")
    .select("image_url")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError) {
    logActionError("deleteHomepageItemAction:getImage", itemError);
  }

  const { error } = await supabase
    .from("homepage_section_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    logActionError("deleteHomepageItemAction", error);
  } else {
    await removeStorageFilesFromPublicUrls(
      supabase,
      "banner-images",
      [item?.image_url],
      "deleteHomepageItemAction",
    );
  }

  revalidatePath("/admin/homepage");
  revalidatePath("/");
}

function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildItemMetadata(data: z.infer<typeof itemSchema>) {
  return {
    objectPosition: data.objectPosition || "50% 50%",
    gender: data.gender || "all",
    ...(data.layout ? { layout: data.layout } : {}),
  };
}
