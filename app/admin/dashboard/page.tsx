import { redirect } from "next/navigation";
import { AdminLayout } from "../AdminLayout";
import { getCurrentAdminSession } from "../actions";

export default async function AdminDashboardPage() {
  const { user, adminProfile } = await getCurrentAdminSession();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <AdminLayout title="Welcome back" eyebrow="Admin dashboard">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="border border-black bg-white p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em]">
            Current session
          </h2>
          <dl className="space-y-4 text-sm text-neutral-700">
            <div>
              <dt className="font-semibold text-black">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt className="font-semibold text-black">Admin profile</dt>
              <dd>
                {adminProfile
                  ? `${adminProfile.full_name} (${adminProfile.role})`
                  : "No admin profile row found yet."}
              </dd>
            </div>
          </dl>
        </div>

        <div className="border border-black bg-black p-6 text-white">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em]">
            Protected area
          </h2>
          <p className="text-sm leading-7 text-neutral-300">
            This route is guarded by Supabase Auth middleware for all /admin/*
            pages.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
