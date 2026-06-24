import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLayout } from "../../../AdminLayout";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { PolicyForm } from "../../PolicyForm";
import { updatePolicyAction } from "../../actions";

type EditPolicyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPolicyPage({ params }: EditPolicyPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: policy } = await supabase
    .from("policy_pages")
    .select("id, title, slug, content")
    .eq("id", id)
    .maybeSingle();

  if (!policy) {
    notFound();
  }

  const action = updatePolicyAction.bind(null, id);

  return (
    <AdminLayout
      title="Edit policy"
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
        <PolicyForm
          action={action}
          submitLabel="Update policy"
          defaultValues={{
            title: policy.title,
            slug: policy.slug,
            content: policy.content,
          }}
        />
      </div>
    </AdminLayout>
  );
}
