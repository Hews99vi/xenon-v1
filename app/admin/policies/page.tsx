import Link from "next/link";
import { AdminLayout } from "../AdminLayout";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { formatDate } from "../orders/types";
import { deletePolicyAction } from "./actions";

type PolicyPage = {
  id: string;
  title: string;
  slug: string;
  updated_at: string;
};

export default async function AdminPoliciesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: policies, error } = await supabase
    .from("policy_pages")
    .select("id, title, slug, updated_at")
    .order("title", { ascending: true });

  return (
    <AdminLayout
      title="Policies"
      action={
        <Link className="admin-button inline-flex" href="/admin/policies/new">
          New policy
        </Link>
      }
    >
      {error ? (
        (console.error("[AdminPoliciesPage]", error),
        <p className="border border-black bg-white p-5 text-sm">
          Could not load policy pages.
        </p>)
      ) : (
        <div className="overflow-hidden border border-black bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-black bg-neutral-100 text-xs uppercase tracking-[0.18em]">
              <tr>
                <th className="px-4 py-4">Title</th>
                <th className="px-4 py-4">Slug</th>
                <th className="px-4 py-4">Updated</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {((policies || []) as PolicyPage[]).map((policy) => (
                <tr key={policy.id}>
                  <td className="px-4 py-4 font-semibold">{policy.title}</td>
                  <td className="px-4 py-4">{policy.slug}</td>
                  <td className="px-4 py-4">{formatDate(policy.updated_at)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        className="border border-black px-3 py-2 text-xs uppercase tracking-[0.16em]"
                        href={`/admin/policies/${policy.id}/edit`}
                      >
                        Edit
                      </Link>
                      <form action={deletePolicyAction}>
                        <input type="hidden" name="id" value={policy.id} />
                        <button className="border border-black bg-black px-3 py-2 text-xs uppercase tracking-[0.16em] text-white">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!policies?.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-neutral-600" colSpan={4}>
                    No policy pages yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
