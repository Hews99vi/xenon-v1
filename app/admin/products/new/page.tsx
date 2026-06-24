import Link from "next/link";
import { AdminLayout } from "../../AdminLayout";
import { ProductForm } from "../ProductForm";
import { createProductAction } from "../actions";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

type CategoryOption = {
  id: string;
  name: string;
};

export default async function NewProductPage() {
  const supabase = await createServerSupabaseClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <AdminLayout
      title="New product"
      action={
        <Link
          className="border border-black px-4 py-3 text-xs uppercase tracking-[0.22em]"
          href="/admin/products"
        >
          Back
        </Link>
      }
    >
      <div className="border border-black bg-white p-6">
        {error ? (
          (console.error("[AdminNewProductPage]", error),
          <p className="border border-black bg-neutral-100 p-4 text-sm">
            Could not load product categories.
          </p>)
        ) : categories?.length ? (
          <ProductForm
            categories={(categories || []) as CategoryOption[]}
            action={createProductAction}
          />
        ) : (
          <p className="text-sm text-neutral-700">
            Create an active category before adding products.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
