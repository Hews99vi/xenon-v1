"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const settingsSchema = z.object({
  whatsappNumber: z.string().trim().optional(),
  instagramUrl: z.string().trim().url("Use a valid Instagram URL.").optional().or(z.literal("")),
  tiktokUrl: z.string().trim().url("Use a valid TikTok URL.").optional().or(z.literal("")),
  returnPolicyText: z.string().trim().optional(),
  shippingPolicyText: z.string().trim().optional(),
  supportEmail: z.string().trim().email("Use a valid email.").optional().or(z.literal("")),
  supportPhone: z.string().trim().optional(),
  announcementText: z.string().trim().optional(),
});

export type SettingsActionState = {
  ok: boolean;
  message: string;
};

const defaultState: SettingsActionState = {
  ok: false,
  message: "",
};

export async function saveSiteSettingsAction(
  prevState: SettingsActionState = defaultState,
  formData: FormData,
): Promise<SettingsActionState> {
  void prevState;
  const parsed = settingsSchema.safeParse({
    whatsappNumber: formData.get("whatsappNumber"),
    instagramUrl: formData.get("instagramUrl"),
    tiktokUrl: formData.get("tiktokUrl"),
    returnPolicyText: formData.get("returnPolicyText"),
    shippingPolicyText: formData.get("shippingPolicyText"),
    supportEmail: formData.get("supportEmail"),
    supportPhone: formData.get("supportPhone"),
    announcementText: formData.get("announcementText"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid settings.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("site_settings").upsert(
    {
      key: "contact_and_policies",
      value: parsed.data,
      description: "Contact links and public policy text for the storefront.",
      is_public: true,
    },
    {
      onConflict: "key",
    },
  );

  if (error) {
    logActionError("saveSiteSettingsAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("save site settings"),
    };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/");

  return {
    ok: true,
    message: "Site settings saved.",
  };
}
