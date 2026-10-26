import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLayout } from "../../AdminLayout";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { OrderStatusForm } from "../OrderStatusForm";
import {
  formatDate,
  formatMoney,
  titleCase,
  type OrderStatus,
  type PaymentStatus,
} from "../types";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type OrderItemRow = {
  id: string;
  product_name: string;
  product_sku: string | null;
  variant_color: string | null;
  variant_size: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type OrderDetail = {
  id: string;
  order_number: string;
  customer_email: string;
  customer_phone: string;
  customer_first_name: string;
  customer_last_name: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_district: string | null;
  shipping_postal_code: string | null;
  shipping_country: string;
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  tax_total: number;
  grand_total: number;
  currency: string;
  payment_method: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  customer_notes: string | null;
  created_at: string;
  promo_codes: { code: string }[] | null;
  delivery_zones: { name: string }[] | null;
  order_items: OrderItemRow[];
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        customer_email,
        customer_phone,
        customer_first_name,
        customer_last_name,
        shipping_address_line1,
        shipping_address_line2,
        shipping_city,
        shipping_district,
        shipping_postal_code,
        shipping_country,
        subtotal,
        discount_total,
        delivery_fee,
        tax_total,
        grand_total,
        currency,
        payment_method,
        payment_status,
        order_status,
        customer_notes,
        created_at,
        promo_codes(code),
        delivery_zones(name),
        order_items(
          id,
          product_name,
          product_sku,
          variant_color,
          variant_size,
          quantity,
          unit_price,
          line_total
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const order = data as unknown as OrderDetail;
  const promoCode = order.promo_codes?.[0]?.code;
  const deliveryZone = order.delivery_zones?.[0]?.name;

  return (
    <AdminLayout
      title={order.order_number}
      eyebrow="Order detail"
      action={
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/orders/${order.id}/invoice`}
            className="admin-button inline-flex"
          >
            Invoice
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex border border-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em]"
          >
            Back
          </Link>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <section className="border border-black bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em]">
              Customer
            </h2>
            <div className="grid gap-4 text-sm text-neutral-700 md:grid-cols-2">
              <Info label="Name">
                {order.customer_first_name} {order.customer_last_name}
              </Info>
              <Info label="Phone">{order.customer_phone}</Info>
              <Info label="Email">{order.customer_email}</Info>
              <Info label="Created">{formatDate(order.created_at)}</Info>
              <Info label="Address">
                {order.shipping_address_line1}
                {order.shipping_address_line2 ? `, ${order.shipping_address_line2}` : ""}
                <br />
                {order.shipping_city}
                {deliveryZone ? `, ${deliveryZone}` : ""}
                {order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ""}
                <br />
                {order.shipping_country}
              </Info>
              <Info label="Delivery note">
                {order.customer_notes || "No delivery note."}
              </Info>
            </div>
          </section>

          <section className="overflow-x-auto border border-black bg-white">
            <div className="border-b border-black p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em]">
                Items
              </h2>
            </div>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-neutral-100 text-xs uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-4 py-4">Item</th>
                  <th className="px-4 py-4">Color</th>
                  <th className="px-4 py-4">Size</th>
                  <th className="px-4 py-4">SKU</th>
                  <th className="px-4 py-4">Unit</th>
                  <th className="px-4 py-4">Qty</th>
                  <th className="px-4 py-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {order.order_items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-medium">{item.product_name}</td>
                    <td className="px-4 py-4">{item.variant_color || "-"}</td>
                    <td className="px-4 py-4">{item.variant_size || "Free Size"}</td>
                    <td className="px-4 py-4">{item.product_sku || "-"}</td>
                    <td className="px-4 py-4">{formatMoney(item.unit_price)}</td>
                    <td className="px-4 py-4">{item.quantity}</td>
                    <td className="px-4 py-4 font-semibold">
                      {formatMoney(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="space-y-6">
          <OrderStatusForm
            orderId={order.id}
            orderStatus={order.order_status}
            paymentStatus={order.payment_status}
          />

          <section className="border border-black bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em]">
              Totals
            </h2>
            <div className="space-y-3 text-sm">
              <SummaryRow label="Payment method" value={titleCase(order.payment_method)} />
              <SummaryRow label="Payment status" value={titleCase(order.payment_status)} />
              <SummaryRow label="Order status" value={titleCase(order.order_status)} />
              <SummaryRow label="Promo code" value={promoCode || "-"} />
              <SummaryRow label="Subtotal" value={formatMoney(order.subtotal)} />
              <SummaryRow label="Discount" value={`-${formatMoney(order.discount_total)}`} />
              <SummaryRow label="Delivery" value={formatMoney(order.delivery_fee)} />
              <SummaryRow label="Tax" value={formatMoney(order.tax_total)} />
              <div className="flex items-center justify-between border-t border-black pt-4 text-base font-semibold">
                <span>Total</span>
                <span>{formatMoney(order.grand_total)}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </AdminLayout>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </dt>
      <dd className="mt-1 text-black">{children}</dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-neutral-600">{label}</span>
      <span className="font-semibold text-black">{value}</span>
    </div>
  );
}
