import Link from "next/link";
import { AdminLayout } from "../../AdminLayout";
import { createPolicyAction } from "../actions";
import { PolicyForm } from "../PolicyForm";

export default function NewPolicyPage() {
  return (
    <AdminLayout
      title="New policy"
      action={
        <Link
          className="border border-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em]"
          href="/admin/policies"
        >
          Back
        </Link>
      }
    >
      <div className="max-w-5xl">
        <PolicyForm action={createPolicyAction} submitLabel="Create policy" />
      </div>
    </AdminLayout>
  );
}
