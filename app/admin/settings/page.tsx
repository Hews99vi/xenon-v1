import { AdminLayout } from "../AdminLayout";
import { withDefaultSiteSettings, type SiteSettingsValue } from "@/lib/siteSettings";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "contact_and_policies")
    .maybeSingle();

  const settings = withDefaultSiteSettings(
    (data?.value || {}) as Partial<SiteSettingsValue>,
  );

  return (
    <AdminLayout title="Site settings">
      <div className="max-w-4xl">
        <SettingsForm settings={settings} />
      </div>
    </AdminLayout>
  );
}
