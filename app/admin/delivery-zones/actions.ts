"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

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

  if (!id || !parsed.success) {
    return;
  }

  const supabase = await createServerSupabaseClient();
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

  const { data: duplicate } = await duplicateQuery.maybeSingle();

  if (duplicate) {
    return;
  }

  const name = city ? `${district} - ${city}` : district;

  await supabase
    .from("delivery_zones")
    .update({
      name,
      district,
      city,
      delivery_fee: parsed.data.deliveryFee,
      is_active: parsed.data.isActive,
    })
    .eq("id", id);

  revalidatePath("/admin/delivery-zones");
}

export async function deleteDeliveryZoneAction(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  await supabase.from("delivery_zones").delete().eq("id", id);
  revalidatePath("/admin/delivery-zones");
}
