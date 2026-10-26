import Link from "next/link";
import { AdminLayout } from "../AdminLayout";
import { requireAdmin } from "@/lib/content/server";
export default async function Dashboard() {
  const { db, profile } = await requireAdmin();
  const [orders, stock, unclassified, documents] = await Promise.all([
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("order_status", "pending"),
    db
      .from("products")
      .select("id,product_variants!inner(id)", { count: "exact", head: true })
      .eq("status", "active")
      .eq("product_variants.is_active", true)
      .lte("product_variants.stock_quantity", 5),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .is("audience", null),
    db
      .from("content_documents")
      .select("draft_revision_id,published_revision_id"),
  ]);
  const metrics = [
    {
      label: "Pending orders",
      value: orders.error ? "Unavailable" : orders.count || 0,
      href: "/admin/orders?status=pending",
    },
    {
      label: "Low-stock products",
      value: stock.error ? "Unavailable" : stock.count || 0,
      href: "/admin/products",
    },
    {
      label: "Products awaiting audience",
      value: unclassified.error ? "Setup required" : unclassified.count || 0,
      href: "/admin/products?audience=unassigned",
    },
    {
      label: "Unpublished documents",
      value: documents.error
        ? "Setup required"
        : documents.data?.filter(
            (d) => d.draft_revision_id !== d.published_revision_id,
          ).length || 0,
      href: "/admin/website",
    },
  ];
  return (
    <AdminLayout title={`Welcome, ${profile.full_name || "admin"}`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <Link key={m.label} href={m.href} className="admin-panel">
            <p className="text-sm text-neutral-500">{m.label}</p>
            <p className="mt-3 text-3xl font-semibold">{m.value}</p>
          </Link>
        ))}
      </div>
      <div className="admin-panel mt-6">
        <h2>Update your website</h2>
        <p className="my-3 text-neutral-600">
          Edit content, check the desktop and mobile preview, and publish when
          it is ready.
        </p>
        <Link className="admin-button" href="/admin/website">
          Open website editor
        </Link>
      </div>
    </AdminLayout>
  );
}
