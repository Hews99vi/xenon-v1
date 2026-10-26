"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/content/server";

const promoCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "Code is required.")
      .transform((value) => value.toUpperCase()),
    description: z.string().trim().optional(),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.coerce.number().positive("Discount value must be greater than 0."),
    minimumOrderAmount: z.coerce
      .number()
      .min(0, "Minimum order cannot be negative."),
    usageLimit: z.coerce.number().int().positive().optional().or(z.literal("")),
    startsAt: z.string().optional(),
    expiresAt: z.string().optional(),
    isActive: z.coerce.boolean(),
  })
  .refine(
    (data) =>
      data.discountType !== "percentage" ||
      (data.discountValue >= 1 && data.discountValue <= 100),
    {
      message: "Percentage discounts must be between 1 and 100.",
      path: ["discountValue"],
    },
  )
  .refine(
    (data) =>
      !data.startsAt ||
      !data.expiresAt ||
      new Date(data.expiresAt).getTime() > new Date(data.startsAt).getTime(),
    {
      message: "Expiry date must be after start date.",
      path: ["expiresAt"],
    },
  );

export type PromotionActionState = {
  ok: boolean;
  message: string;
};

const defaultState: PromotionActionState = {
  ok: false,
  message: "",
};

function toBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function toTimestamp(value?: string) {
  return value ? new Date(value).toISOString() : null;
}

export async function createPromotionAction(
  prevState: PromotionActionState = defaultState,
  formData: FormData,
): Promise<PromotionActionState> {
  void prevState;
  const parsed = promoCodeSchema.safeParse({
    code: formData.get("code"),
    description: formData.get("description"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    minimumOrderAmount: formData.get("minimumOrderAmount") || 0,
    usageLimit: formData.get("usageLimit") || "",
    startsAt: formData.get("startsAt") || "",
    expiresAt: formData.get("expiresAt") || "",
    isActive: toBoolean(formData.get("isActive")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid promo code.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("promo_codes")
    .select("id")
    .eq("code", parsed.data.code)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      message: "A promo code with this code already exists.",
    };
  }

  const { error } = await supabase.from("promo_codes").insert({
    code: parsed.data.code,
    description: parsed.data.description || null,
    discount_type: parsed.data.discountType,
    discount_value: parsed.data.discountValue,
    minimum_order_amount: parsed.data.minimumOrderAmount,
    usage_limit:
      parsed.data.usageLimit === "" || parsed.data.usageLimit === undefined
        ? null
        : parsed.data.usageLimit,
    starts_at: toTimestamp(parsed.data.startsAt),
    expires_at: toTimestamp(parsed.data.expiresAt),
    is_active: parsed.data.isActive,
  });

  if (error) {
    logActionError("createPromotionAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("create promo code"),
    };
  }

  revalidatePath("/admin/promotions");
  return {
    ok: true,
    message: "Promo code created.",
  };
}

export async function togglePromotionAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const isActive = toBoolean(formData.get("isActive"));

  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, message: "Choose a valid promotion." };
  try {
    const { db } = await requireAdmin();
    const { data, error } = await db.from("promo_codes").update({ is_active: isActive }).eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, message: "This promotion is no longer available. Refresh the page." };
    revalidatePath("/admin/promotions");
    return { ok: true, message: isActive ? "Promotion enabled." : "Promotion disabled." };
  } catch (error) {
    logActionError("togglePromotionAction", error);
    return { ok: false, message: "Could not update the promotion. Check your session and try again." };
  }
}

export async function deletePromotionAction(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, message: "Choose a valid promotion." };
  try {
    const { db } = await requireAdmin();
    const { data, error } = await db.from("promo_codes").delete().eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, message: "This promotion is no longer available. Refresh the page." };
    revalidatePath("/admin/promotions");
    return { ok: true, message: "Promotion deleted." };
  } catch (error) {
    logActionError("deletePromotionAction", error);
    return { ok: false, message: "Could not delete the promotion. Check your session and try again." };
  }
}
