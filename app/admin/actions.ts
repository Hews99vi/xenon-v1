"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function getCurrentAdminSession() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      adminProfile: null,
    };
  }

  const { data: adminProfile } = await supabase
    .from("admin_profiles")
    .select("id, full_name, role, avatar_url, is_active, last_login_at")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return {
    user: adminProfile ? user : null,
    adminProfile,
  };
}
