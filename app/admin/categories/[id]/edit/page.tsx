import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLayout } from "../../../AdminLayout";
import { CategoryForm } from "../../CategoryForm";
import { updateCategoryAction } from "../../actions";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

type EditCategoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url, is_active, sort_order")
    .eq("id", id)
    .maybeSingle();

  if (!category) {
    notFound();
  }

  const action = updateCategoryAction.bind(null, id);

  return (
    <AdminLayout
      title="Edit category"
      action={
        <Link className="border border-black px-4 py-3 text-xs uppercase tracking-[0.22em]" href="/admin/categories">
          Back
        </Link>
      }
    >
      <div className="border border-black bg-white p-6">
        <CategoryForm
          action={action}
          submitLabel="Update category"
          defaultValues={{
            name: category.name,
            slug: category.slug,
            description: category.description || "",
            imageUrl: category.image_url,
            isActive: category.is_active,
            sortOrder: category.sort_order,
          }}
        />
      </div>
    </AdminLayout>
  );
}
