import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { formatDate, formatMoney } from "../../types";
import { PrintButton } from "./PrintButton";

type InvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
};

type InvoiceOrder = {
  id: string;
  order_number: string;
  customer_email: string;
  customer_phone: string;
  customer_first_name: string;
  customer_last_name: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_postal_code: string | null;
  shipping_country: string;
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  tax_total: number;
  grand_total: number;
  payment_method: string;
  created_at: string;
  promo_codes: { code: string }[] | null;
  order_items: {
    id: string;
    product_name: string;
    product_sku: string | null;
    variant_color: string | null;
    variant_size: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
};

export default async function InvoicePage({ params }: InvoicePageProps) {
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
        shipping_postal_code,
        shipping_country,
        subtotal,
        discount_total,
        delivery_fee,
        tax_total,
        grand_total,
        payment_method,
        created_at,
        promo_codes(code),
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

  const order = data as unknown as InvoiceOrder;

  return (
    <section className="bg-background print:bg-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8 print:max-w-none print:px-0 print:py-0">
        <div className="mb-6 flex justify-end gap-3 print:hidden">
          <PrintButton />
          <Link
            href={`/admin/orders/${order.id}`}
            className="border border-black bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em]"
          >
            Back
          </Link>
        </div>

        <article className="border border-black bg-white p-8 print:border-0">
          <header className="flex flex-col gap-8 border-b border-black pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.36em]">
                Xenon
              </p>
              <h1 className="mt-4 text-4xl font-semibold">Invoice</h1>
              <p className="mt-2 text-sm text-neutral-600">
                Thank you for shopping with Xenon.
              </p>
            </div>
            <div className="text-sm sm:text-right">
              <p className="font-semibold">{order.order_number}</p>
              <p className="mt-1 text-neutral-600">{formatDate(order.created_at)}</p>
              <p className="mt-1 uppercase text-neutral-600">
                {order.payment_method}
              </p>
            </div>
          </header>

          <section className="grid gap-6 border-b border-black py-8 sm:grid-cols-2">
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]">
                Company
              </h2>
              <p className="font-semibold">Xenon</p>
              <p className="mt-1 text-sm text-neutral-600">
                Luxury black-and-white commerce
              </p>
              <p className="mt-1 text-sm text-neutral-600">hello@example.com</p>
            </div>
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]">
                Bill to
              </h2>
              <p className="font-semibold">
                {order.customer_first_name} {order.customer_last_name}
              </p>
              <p className="mt-1 text-sm text-neutral-600">{order.customer_phone}</p>
              <p className="mt-1 text-sm text-neutral-600">{order.customer_email}</p>
              <p className="mt-1 text-sm text-neutral-600">
                {order.shipping_address_line1}
                {order.shipping_address_line2 ? `, ${order.shipping_address_line2}` : ""}
                <br />
                {order.shipping_city}
                {order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ""}
                <br />
                {order.shipping_country}
              </p>
            </div>
          </section>

          <section className="overflow-hidden py-8">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black text-xs uppercase tracking-[0.18em]">
                <tr>
                  <th className="py-3 pr-3">Item</th>
                  <th className="px-3 py-3">Variant</th>
                  <th className="px-3 py-3">SKU</th>
                  <th className="px-3 py-3 text-right">Unit</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="py-3 pl-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {order.order_items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4 pr-3 font-medium">{item.product_name}</td>
                    <td className="px-3 py-4">
                      {[item.variant_color, item.variant_size || "Free Size"]
                        .filter(Boolean)
                        .join(" / ")}
                    </td>
                    <td className="px-3 py-4">{item.product_sku || "-"}</td>
                    <td className="px-3 py-4 text-right">
                      {formatMoney(item.unit_price)}
                    </td>
                    <td className="px-3 py-4 text-right">{item.quantity}</td>
                    <td className="py-4 pl-3 text-right font-semibold">
                      {formatMoney(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="ml-auto w-full max-w-sm border-t border-black pt-6 text-sm">
            <SummaryRow label="Subtotal" value={formatMoney(order.subtotal)} />
            <SummaryRow
              label={`Discount${order.promo_codes?.[0]?.code ? ` (${order.promo_codes[0].code})` : ""}`}
              value={`-${formatMoney(order.discount_total)}`}
            />
            <SummaryRow label="Delivery" value={formatMoney(order.delivery_fee)} />
            <SummaryRow label="Tax" value={formatMoney(order.tax_total)} />
            <div className="mt-4 flex items-center justify-between border-t border-black pt-4 text-lg font-semibold">
              <span>Total</span>
              <span>{formatMoney(order.grand_total)}</span>
            </div>
          </section>

          <footer className="mt-10 border-t border-black pt-6 text-center text-sm text-neutral-600">
            Thank you for your order. We appreciate your business.
          </footer>
        </article>
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <span className="text-neutral-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
