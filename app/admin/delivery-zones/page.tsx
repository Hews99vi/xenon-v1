import { AdminLayout } from "../AdminLayout";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { formatMoney } from "../orders/types";
import {
  deleteDeliveryZoneAction,
  updateDeliveryZoneAction,
} from "./actions";
import { MutationForm } from "@/components/admin/MutationForm";
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
        <section className="min-w-0 border border-neutral-200 bg-white">
          <h2 className="border-b p-5 text-lg font-medium">Districts and fees</h2>
          {error ? <p role="alert" className="p-5 text-sm">Could not load delivery zones. Please try again.</p> : <ul className="divide-y divide-neutral-200">
            {((zones || []) as DeliveryZone[]).map(zone=><li key={zone.id} className="p-5">
              <MutationForm action={updateDeliveryZoneAction} className="space-y-4">
                <input type="hidden" name="id" value={zone.id}/>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="editor-field"><span>District</span><input name="district" defaultValue={zone.district||zone.name} required/></label>
                  <label className="editor-field"><span>City (optional)</span><input name="city" defaultValue={zone.city||""}/></label>
                  <label className="editor-field"><span>Delivery fee (LKR)</span><input name="deliveryFee" type="number" min="0" step="0.01" defaultValue={Number(zone.delivery_fee)}/></label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4"><label className="flex min-h-11 items-center gap-3 text-sm"><input name="isActive" type="checkbox" defaultChecked={zone.is_active}/>Active zone</label><button className="admin-button" type="submit">Save changes</button></div>
              </MutationForm>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-t pt-4"><p className="text-sm text-neutral-600">Current fee: {formatMoney(zone.delivery_fee)}</p><MutationForm action={deleteDeliveryZoneAction} confirmation={`Delete ${zone.name}? This cannot be undone.`}><input type="hidden" name="id" value={zone.id}/><button className="min-h-11 text-sm text-red-800 underline" type="submit">Delete zone</button></MutationForm></div>
            </li>)}
            {!zones?.length&&<li className="p-8 text-sm text-neutral-600">No delivery zones yet. Add a district to enable delivery.</li>}
          </ul>}
        </section>

        <aside>
          <DeliveryZoneForm />
        </aside>
      </div>
    </AdminLayout>
  );
}
