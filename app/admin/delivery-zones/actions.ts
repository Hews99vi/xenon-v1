"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/content/server";

const deliveryZoneSchema = z.object({
  district: z.string().trim().min(2, "District is required."),
  city: z.string().trim().optional(),
  deliveryFee: z.coerce.number().min(0, "Delivery fee cannot be negative."),
  isActive: z.coerce.boolean(),
});

export type DeliveryZoneActionState = {
  ok: boolean;
  message: string;
};

const defaultState: DeliveryZoneActionState = {
  ok: false,
  message: "",
};

function toBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function normalizeLocationName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export async function createDeliveryZoneAction(
  prevState: DeliveryZoneActionState = defaultState,
  formData: FormData,
): Promise<DeliveryZoneActionState> {
  void prevState;
  const parsed = deliveryZoneSchema.safeParse({
    district: formData.get("district"),
    city: formData.get("city"),
    deliveryFee: formData.get("deliveryFee"),
    isActive: toBoolean(formData.get("isActive")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid delivery zone.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const district = normalizeLocationName(parsed.data.district);
  const city = parsed.data.city ? normalizeLocationName(parsed.data.city) : null;
  let duplicateQuery = supabase
    .from("delivery_zones")
    .select("id")
    .ilike("district", district);

  duplicateQuery = city
    ? duplicateQuery.ilike("city", city)
    : duplicateQuery.is("city", null);

  const { data: duplicate } = await duplicateQuery.maybeSingle();

  if (duplicate) {
    return {
      ok: false,
      message: "A delivery zone for this district and city already exists.",
    };
  }

  const name = city ? `${district} - ${city}` : district;
  const { error } = await supabase.from("delivery_zones").insert({
    name,
    district,
    city,
    delivery_fee: parsed.data.deliveryFee,
    is_active: parsed.data.isActive,
  });

  if (error) {
    logActionError("createDeliveryZoneAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("create delivery zone"),
    };
  }

  revalidatePath("/admin/delivery-zones");
  return {
    ok: true,
    message: "Delivery zone created.",
  };
}

export async function updateDeliveryZoneAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const parsed = deliveryZoneSchema.safeParse({
    district: formData.get("district"),
    city: formData.get("city"),
    deliveryFee: formData.get("deliveryFee"),
    isActive: toBoolean(formData.get("isActive")),
  });

  if (!z.string().uuid().safeParse(id).success || !parsed.success) {
    return { ok: false, message: !parsed.success ? parsed.error.issues[0]?.message || "Check the delivery details." : "Choose a valid delivery zone." };
  }

  try {
  const { db: supabase } = await requireAdmin();
  const district = normalizeLocationName(parsed.data.district);
  const city = parsed.data.city ? normalizeLocationName(parsed.data.city) : null;
  let duplicateQuery = supabase
    .from("delivery_zones")
    .select("id")
    .neq("id", id)
    .ilike("district", district);

  duplicateQuery = city
    ? duplicateQuery.ilike("city", city)
    : duplicateQuery.is("city", null);

  const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle();
  if (duplicateError) throw duplicateError;

  if (duplicate) {
    return { ok: false, message: "A delivery zone for this district and city already exists." };
  }

  const name = city ? `${district} - ${city}` : district;

  const { data, error } = await supabase
    .from("delivery_zones")
    .update({
      name,
      district,
      city,
      delivery_fee: parsed.data.deliveryFee,
      is_active: parsed.data.isActive,
    })
    .eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, message: "This delivery zone is no longer available. Refresh the page." };
  revalidatePath("/admin/delivery-zones");
  return { ok: true, message: "Delivery zone updated." };
  } catch (error) {
    logActionError("updateDeliveryZoneAction", error);
    return { ok: false, message: "Could not update the delivery zone. Check your session and try again." };
  }
}

export async function deleteDeliveryZoneAction(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, message: "Choose a valid delivery zone." };
  try {
    const { db } = await requireAdmin();
    const { data, error } = await db.from("delivery_zones").delete().eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, message: "This delivery zone is no longer available. Refresh the page." };
    revalidatePath("/admin/delivery-zones");
    return { ok: true, message: "Delivery zone deleted." };
  } catch (error) {
    logActionError("deleteDeliveryZoneAction", error);
    return { ok: false, message: "Could not delete the delivery zone. Check your session and try again." };
  }
}
