import Link from "next/link";
import type { ReactNode } from "react";
import { AdminLayout } from "../AdminLayout";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { formatDate, formatMoney, orderStatusOptions, titleCase } from "./types";

type OrdersPageProps = {
  searchParams: Promise<{
    status?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_first_name: string;
  customer_last_name: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  grand_total: number;
  created_at: string;
};

const pageSize = 25;

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const { status = "", from = "", to = "", page = "1" } = await searchParams;
  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const fromIndex = (currentPage - 1) * pageSize;
  const toIndex = fromIndex + pageSize - 1;
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_first_name, customer_last_name, payment_method, payment_status, order_status, grand_total, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(fromIndex, toIndex);

  if (status) {
    query = query.eq("order_status", status);
  }

  if (from) {
    query = query.gte("created_at", `${from}T00:00:00.000Z`);
  }

  if (to) {
    query = query.lte("created_at", `${to}T23:59:59.999Z`);
  }

  const { data: orders, error, count } = await query;
  const totalOrders = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <AdminLayout title="Orders">
      <form className="mb-6 grid gap-4 border border-black bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
            Status
          </span>
          <select className="admin-input" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {orderStatusOptions.map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
            From
          </span>
          <input className="admin-input" name="from" type="date" defaultValue={from} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
            To
          </span>
          <input className="admin-input" name="to" type="date" defaultValue={to} />
        </label>
        <button className="admin-button self-end" type="submit">
          Filter
        </button>
      </form>

      {error ? (
        (console.error("[AdminOrdersPage]", error),
        <p className="border border-black bg-white p-4 text-sm">
          Could not load orders.
        </p>)
      ) : (
        <div className="overflow-hidden border border-black bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-black bg-neutral-100 text-xs uppercase tracking-[0.2em]">
              <tr>
                <th className="px-4 py-4">Order</th>
                <th className="px-4 py-4">Customer</th>
                <th className="px-4 py-4">Payment method</th>
                <th className="px-4 py-4">Payment</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Total</th>
                <th className="px-4 py-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {((orders || []) as OrderRow[]).map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-semibold text-black underline"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    {order.customer_first_name} {order.customer_last_name}
                  </td>
                  <td className="px-4 py-4 uppercase">{order.payment_method}</td>
                  <td className="px-4 py-4">{titleCase(order.payment_status)}</td>
                  <td className="px-4 py-4">{titleCase(order.order_status)}</td>
                  <td className="px-4 py-4 font-semibold">
                    {formatMoney(order.grand_total)}
                  </td>
                  <td className="px-4 py-4">{formatDate(order.created_at)}</td>
                </tr>
              ))}
              {!orders?.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-neutral-600" colSpan={7}>
                    No orders match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="flex flex-col gap-3 border-t border-black p-4 text-xs uppercase tracking-[0.18em] text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {currentPage} of {totalPages} · {totalOrders} orders
            </span>
            <div className="flex gap-2">
              <PaginationLink
                disabled={!hasPreviousPage}
                href={getOrdersPageHref({
                  status,
                  from,
                  to,
                  page: currentPage - 1,
                })}
              >
                Previous
              </PaginationLink>
              <PaginationLink
                disabled={!hasNextPage}
                href={getOrdersPageHref({
                  status,
                  from,
                  to,
                  page: currentPage + 1,
                })}
              >
                Next
              </PaginationLink>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function getOrdersPageHref({
  status,
  from,
  to,
  page,
}: {
  status: string;
  from: string;
  to: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (status) params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="border border-neutral-300 px-3 py-2 text-neutral-400">
        {children}
      </span>
    );
  }

  return (
    <Link className="border border-black px-3 py-2 text-black" href={href}>
      {children}
    </Link>
  );
}
