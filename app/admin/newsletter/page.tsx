import {
  AdminPagination,
  ADMIN_PAGE_SIZE,
  adminPage,
  filterSearch,
} from "@/components/admin/AdminPagination";
import { AdminLayout } from "../AdminLayout";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

type Subscriber = {
  id: string;
  email: string;
  status: "active" | "unsubscribed";
  source: string | null;
  subscribed_at: string;
  updated_at: string;
};

export default async function NewsletterAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page: rawPage } = await searchParams;
  const page = adminPage(rawPage);
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("newsletter_subscribers")
    .select("id, email, status, source, subscribed_at, updated_at", {
      count: "exact",
    })
    .order("subscribed_at", { ascending: false })
    .order("id")
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  const search = filterSearch(q);
  if (search) query = query.ilike("email", `%${search}%`);
  const [{ data, error, count }, active] = await Promise.all([
    query,
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);
  const subscribers = (data || []) as Subscriber[];
  const activeCount = active.count || 0;

  return (
    <AdminLayout title="Newsletter">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Active subscribers" value={activeCount} />
          <Metric label="Total records" value={count || 0} />
        </div>
        <form className="flex flex-wrap gap-3">
          <label className="editor-field flex-1">
            <span>Search subscribers</span>
            <input name="q" defaultValue={q} placeholder="Email address" />
          </label>
          <button className="admin-button self-end">Search</button>
        </form>
        <section className="overflow-x-auto border border-black bg-white">
          {error ? (
            <p className="p-5 text-sm text-red-900">
              Could not load newsletter subscribers.
            </p>
          ) : subscribers.length ? (
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-black bg-neutral-50 text-xs uppercase tracking-[0.16em]">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Subscribed</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr
                    key={subscriber.id}
                    className="border-b border-black/10 last:border-0"
                  >
                    <td className="px-4 py-4 font-medium">
                      {subscriber.email}
                    </td>
                    <td className="px-4 py-4 uppercase tracking-[0.12em] text-neutral-600">
                      {subscriber.status}
                    </td>
                    <td className="px-4 py-4 text-neutral-600">
                      {subscriber.source || "—"}
                    </td>
                    <td className="px-4 py-4 text-neutral-600">
                      {formatDate(subscriber.subscribed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-sm text-neutral-600">
              No subscribers match this search.
            </p>
          )}
        </section>
        {!error && (
          <AdminPagination
            path="/admin/newsletter"
            page={page}
            count={count || 0}
            filters={{ q }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-black bg-white p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
