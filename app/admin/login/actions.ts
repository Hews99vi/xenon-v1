"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export type LoginActionState = {
  message: string;
};

const defaultRedirect = "/admin/dashboard";

export async function signInAdminAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const redirectedFrom = getSafeAdminRedirect(
    String(formData.get("redirectedFrom") || ""),
  );

  if (!email || !password) {
    return { message: "Enter your email and password." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { message: "Invalid admin credentials." };
  }

  const { data: adminProfile } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", data.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!adminProfile) {
    await supabase.auth.signOut();
    return { message: "This account does not have admin access." };
  }

  await supabase
    .from("admin_profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  redirect(redirectedFrom);
}

function getSafeAdminRedirect(value: string) {
  if (
    value.startsWith("/admin/") &&
    value !== "/admin/login" &&
    !value.startsWith("/admin/login?")
  ) {
    return value;
  }

  return defaultRedirect;
}
