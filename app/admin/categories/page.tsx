import { DeleteForm } from "@/components/admin/DeleteForm";
import Link from "next/link";
import { AdminLayout } from "../AdminLayout";
import { deleteCategoryAction } from "./actions";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  audience: string | null;
};

export default async function AdminCategoriesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <AdminLayout
      title="Categories"
      action={
        <Link className="admin-button inline-flex" href="/admin/categories/new">
          New category
        </Link>
      }
    >
      {error ? (
        (console.error("[AdminCategoriesPage]", error),
        (
          <p className="border border-black bg-white p-4 text-sm">
            Could not load categories.
          </p>
        ))
      ) : (
        <div className="overflow-x-auto border border-black bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-black bg-neutral-100 text-xs uppercase tracking-[0.2em]">
              <tr>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Slug</th>
                <th className="px-4 py-4">Audience</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Sort</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {((categories || []) as CategoryRow[]).map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-4 font-medium text-black">
                    {category.name}
                  </td>
                  <td className="px-4 py-4 text-neutral-600">
                    {category.slug}
                  </td>
                  <td className="px-4 py-4">
                    {category.audience || "Needs review"}
                  </td>
                  <td className="px-4 py-4">
                    {category.is_active ? "Active" : "Inactive"}
                  </td>
                  <td className="px-4 py-4">{category.sort_order}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        className="admin-secondary"
                        href={`/admin/categories/${category.id}/edit`}
                      >
                        Edit
                      </Link>
                      <DeleteForm
                        action={deleteCategoryAction}
                        id={category.id}
                        label={category.name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!categories?.length ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-neutral-600"
                    colSpan={6}
                  >
                    No categories yet.
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
