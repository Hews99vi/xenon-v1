import Link from "next/link";
import { AdminLayout } from "../../AdminLayout";
import { CategoryForm } from "../CategoryForm";
import { createCategoryAction } from "../actions";

export default function NewCategoryPage() {
  return (
    <AdminLayout
      title="New category"
      action={
        <Link className="border border-black px-4 py-3 text-xs uppercase tracking-[0.22em]" href="/admin/categories">
          Back
        </Link>
      }
    >
      <div className="border border-black bg-white p-6">
        <CategoryForm action={createCategoryAction} submitLabel="Create category" />
      </div>
    </AdminLayout>
  );
}
