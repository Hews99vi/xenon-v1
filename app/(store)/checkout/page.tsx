import { CheckoutForm } from "./CheckoutForm";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type DeliveryZone = {
  id: string;
  name: string;
  district: string | null;
  city: string | null;
  delivery_fee: number;
};

export default async function CheckoutPage() {
  const supabase = await createServerSupabaseClient();
  const { data: deliveryZones,error } = await supabase
    .from("delivery_zones")
    .select("id, name, district, city, delivery_fee")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if(error)throw new Error("Delivery settings are temporarily unavailable. Please try again.");
  return (
    <section className="bg-[var(--x-ivory)]">
      <div className="x-container py-8 sm:py-12">
        <CheckoutForm deliveryZones={(deliveryZones || []) as DeliveryZone[]} />
      </div>
    </section>
  );
}
