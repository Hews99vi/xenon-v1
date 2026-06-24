/* eslint-disable @next/next/no-img-element */
import { AdminLayout } from "../AdminLayout";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { BannerForm } from "./BannerForm";
import { deleteBannerAction, updateBannerAction } from "./actions";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export default async function BannersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: banners, error } = await supabase
    .from("banners")
    .select("id, title, subtitle, image_url, cta_label, cta_url, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <AdminLayout title="Banners">
      <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
        <section className="space-y-4">
          {error ? (
            (console.error("[AdminBannersPage]", error),
            <p className="border border-black bg-white p-5 text-sm">
              Could not load banners.
            </p>)
          ) : (banners || []).length ? (
            ((banners || []) as Banner[]).map((banner) => (
              <form
                key={banner.id}
                action={updateBannerAction}
                className="grid gap-4 border border-black bg-white p-4 lg:grid-cols-[10rem_1fr]"
              >
                <input type="hidden" name="id" value={banner.id} />
                <div className="aspect-[4/3] overflow-hidden border border-neutral-300 bg-neutral-100">
                  {banner.image_url ? (
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      className="admin-input"
                      name="title"
                      defaultValue={banner.title}
                      required
                    />
                    <input
                      className="admin-input"
                      name="sortOrder"
                      min="0"
                      type="number"
                      defaultValue={banner.sort_order}
                    />
                  </div>
                  <textarea
                    className="admin-input min-h-20 py-3"
                    name="subtitle"
                    defaultValue={banner.subtitle || ""}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      className="admin-input"
                      name="buttonText"
                      defaultValue={banner.cta_label || ""}
                      placeholder="Button text"
                    />
                    <input
                      className="admin-input"
                      name="buttonLink"
                      defaultValue={banner.cta_url || ""}
                      placeholder="/products"
                    />
                  </div>
                  <input
                    className="admin-file"
                    name="image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-3 text-sm font-medium">
                      <input
                        className="h-4 w-4 accent-black"
                        name="isActive"
                        type="checkbox"
                        defaultChecked={banner.is_active}
                      />
                      Active
                    </label>
                    <div className="flex gap-2">
                      <button className="border border-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">
                        Save
                      </button>
                      <button
                        className="border border-black bg-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                        formAction={deleteBannerAction}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ))
          ) : (
            <p className="border border-black bg-white p-8 text-center text-sm text-neutral-600">
              No banners yet.
            </p>
          )}
        </section>

        <aside>
          <BannerForm />
        </aside>
      </div>
    </AdminLayout>
  );
}
