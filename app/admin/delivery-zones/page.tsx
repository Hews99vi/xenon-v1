import { AdminLayout } from "../AdminLayout";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { formatMoney } from "../orders/types";
import {
  deleteDeliveryZoneAction,
  updateDeliveryZoneAction,
} from "./actions";
import { DeliveryZoneForm } from "./DeliveryZoneForm";

type DeliveryZone = {
  id: string;
  name: string;
  district: string | null;
  city: string | null;
  delivery_fee: number;
  is_active: boolean;
};

export default async function DeliveryZonesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: zones, error } = await supabase
    .from("delivery_zones")
    .select("id, name, district, city, delivery_fee, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <AdminLayout title="Delivery zones">
      <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
        <section className="overflow-hidden border border-black bg-white">
          <div className="border-b border-black p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em]">
              Zones
            </h2>
          </div>
          {error ? (
            (console.error("[AdminDeliveryZonesPage]", error),
            <p className="p-5 text-sm">Could not load delivery zones.</p>)
          ) : (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-black bg-neutral-100 text-xs uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-4 py-4">District</th>
                  <th className="px-4 py-4">City</th>
                  <th className="px-4 py-4">Fee</th>
                  <th className="px-4 py-4">Active</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {((zones || []) as DeliveryZone[]).map((zone) => (
                  <tr key={zone.id}>
                    <td className="px-4 py-4">
                      <form
                        id={`zone-${zone.id}`}
                        action={updateDeliveryZoneAction}
                        className="contents"
                      >
                        <input type="hidden" name="id" value={zone.id} />
                        <input
                          className="admin-input"
                          name="district"
                          defaultValue={zone.district || zone.name}
                          required
                        />
                      </form>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className="admin-input"
                        form={`zone-${zone.id}`}
                        name="city"
                        defaultValue={zone.city || ""}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className="admin-input"
                        form={`zone-${zone.id}`}
                        min="0"
                        name="deliveryFee"
                        step="0.01"
                        type="number"
                        defaultValue={Number(zone.delivery_fee)}
                      />
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatMoney(zone.delivery_fee)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className="h-4 w-4 accent-black"
                        form={`zone-${zone.id}`}
                        name="isActive"
                        type="checkbox"
                        defaultChecked={zone.is_active}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          className="border border-black px-3 py-2 text-xs uppercase tracking-[0.16em]"
                          form={`zone-${zone.id}`}
                          type="submit"
                        >
                          Save
                        </button>
                        <form action={deleteDeliveryZoneAction}>
                          <input type="hidden" name="id" value={zone.id} />
                          <button className="border border-black bg-black px-3 py-2 text-xs uppercase tracking-[0.16em] text-white">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {!zones?.length ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-neutral-600" colSpan={5}>
                      No delivery zones yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </section>

        <aside>
          <DeliveryZoneForm />
        </aside>
      </div>
    </AdminLayout>
  );
}
