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
  const { data: deliveryZones } = await supabase
    .from("delivery_zones")
    .select("id, name, district, city, delivery_fee")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8">
        <CheckoutForm deliveryZones={(deliveryZones || []) as DeliveryZone[]} />
      </div>
    </section>
  );
}
