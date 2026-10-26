import { AdminLayout } from "../AdminLayout";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { formatMoney, formatDate } from "../orders/types";
import {
  deletePromotionAction,
  togglePromotionAction,
} from "./actions";
import { MutationForm } from "@/components/admin/MutationForm";
import { PromotionForm } from "./PromotionForm";

type PromoCode = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  minimum_order_amount: number;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

export default async function PromotionsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: promoCodes, error } = await supabase
    .from("promo_codes")
    .select(
      "id, code, description, discount_type, discount_value, minimum_order_amount, usage_limit, used_count, starts_at, expires_at, is_active",
    )
    .order("created_at", { ascending: false });

  return (
    <AdminLayout title="Promotions">
      <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
        <section className="overflow-x-auto border border-black bg-white">
          <div className="border-b border-black p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em]">
              Promo codes
            </h2>
          </div>
          {error ? (
            (console.error("[AdminPromotionsPage]", error),
            <p className="p-5 text-sm">Could not load promo codes.</p>)
          ) : (
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-black bg-neutral-100 text-xs uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-4 py-4">Code</th>
                  <th className="px-4 py-4">Discount</th>
                  <th className="px-4 py-4">Minimum</th>
                  <th className="px-4 py-4">Usage</th>
                  <th className="px-4 py-4">Remaining</th>
                  <th className="px-4 py-4">Expires</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {((promoCodes || []) as PromoCode[]).map((promo) => {
                  const remaining =
                    promo.usage_limit === null
                      ? "Unlimited"
                      : Math.max(0, promo.usage_limit - promo.used_count);

                  return (
                    <tr key={promo.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{promo.code}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {promo.description || "No description"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {promo.discount_type === "percentage"
                          ? `${Number(promo.discount_value)}%`
                          : formatMoney(promo.discount_value)}
                      </td>
                      <td className="px-4 py-4">
                        {formatMoney(promo.minimum_order_amount)}
                      </td>
                      <td className="px-4 py-4">{promo.used_count}</td>
                      <td className="px-4 py-4">{remaining}</td>
                      <td className="px-4 py-4">
                        {promo.expires_at ? formatDate(promo.expires_at) : "No expiry"}
                      </td>
                      <td className="px-4 py-4">
                        {promo.is_active ? "Active" : "Inactive"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <MutationForm action={togglePromotionAction}>
                            <input type="hidden" name="id" value={promo.id} />
                            <input
                              type="hidden"
                              name="isActive"
                              value={promo.is_active ? "false" : "true"}
                            />
                            <button className="admin-secondary !px-3">
                              {promo.is_active ? "Disable" : "Enable"}
                            </button>
                          </MutationForm>
                          <MutationForm action={deletePromotionAction} confirmation={`Delete promotion ${promo.code}? This cannot be undone.`}>
                            <input type="hidden" name="id" value={promo.id} />
                            <button className="admin-secondary !px-3 !text-red-800">
                              Delete
                            </button>
                          </MutationForm>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!promoCodes?.length ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-neutral-600" colSpan={8}>
                      No promo codes yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </section>

        <aside>
          <PromotionForm />
        </aside>
      </div>
    </AdminLayout>
  );
}
