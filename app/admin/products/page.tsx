import { AdminLayout } from "../AdminLayout";
import { deleteProductAction } from "./actions";
import { requireAdmin } from "@/lib/content/server";
import {
  AdminPagination,
  ADMIN_PAGE_SIZE,
  adminPage,
  filterSearch,
} from "@/components/admin/AdminPagination";
import { DeleteForm } from "@/components/admin/DeleteForm";
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    audience?: string;
    page?: string;
  }>;
}) {
  const {
    q = "",
    category = "",
    audience = "",
    page: rawPage,
  } = await searchParams;
  const page = adminPage(rawPage);
  const { db } = await requireAdmin();
  let query = db
    .from("products")
    .select("*,categories(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  const search = filterSearch(q);
  if (search)
    query = query.or(
      `name.ilike.%${search}%,sku.ilike.%${search}%,slug.ilike.%${search}%`,
    );
  if (category) query = query.eq("category_id", category);
  if (audience === "unassigned") query = query.is("audience", null);
  else if (["women", "men", "unisex"].includes(audience))
    query = query.eq("audience", audience);
  const [categories, result] = await Promise.all([
    db.from("categories").select("id,name").order("name"),
    query,
  ]);
  // Native editor entry links preserve document boundaries for history warnings.
  return (
    <AdminLayout
      title="Products"
      action={
        <a className="admin-button" href="/admin/products/new">
          New product
        </a>
      }
    >
      <form className="mb-6 grid gap-4 border bg-white p-4 sm:grid-cols-2 xl:grid-cols-[1fr_12rem_12rem_auto]">
        <label className="editor-field">
          <span>Search</span>
          <input name="q" defaultValue={q} placeholder="Name, SKU, or slug" />
        </label>
        <label className="editor-field">
          <span>Category</span>
          <select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="editor-field">
          <span>Audience</span>
          <select name="audience" defaultValue={audience}>
            <option value="">All audiences</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
            <option value="unisex">Unisex</option>
            <option value="unassigned">Needs review</option>
          </select>
        </label>
        <button className="admin-button self-end" type="submit">
          Filter
        </button>
      </form>
      <p className="mb-4 text-sm text-neutral-600">
        Assign an audience to existing products before enabling audience
        navigation. Prices and stock changes take effect immediately.
      </p>
      {result.error ? (
        <p role="alert" className="admin-panel">
          Could not load products. Please try again.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto border bg-white">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-neutral-50">
                <tr>
                  {[
                    "Product",
                    "Category",
                    "Audience",
                    "SKU",
                    "Status",
                    "Price",
                    "Featured",
                    "Actions",
                  ].map((label) => (
                    <th className="p-4" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.data?.map((product) => {
                  const category = product.categories as
                    { name: string } | { name: string }[] | null;
                  return (
                    <tr key={product.id}>
                      <td className="p-4">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-neutral-500">
                          {product.slug}
                        </p>
                      </td>
                      <td className="p-4">
                        {(Array.isArray(category)
                          ? category[0]?.name
                          : category?.name) || "None"}
                      </td>
                      <td className="p-4">
                        {product.audience || (
                          <span className="border border-amber-300 bg-amber-50 px-2 py-1 text-xs">
                            Needs review
                          </span>
                        )}
                      </td>
                      <td className="p-4">{product.sku}</td>
                      <td className="p-4">
                        {product.status.replaceAll("_", " ")}
                      </td>
                      <td className="p-4">
                        LKR{" "}
                        {Number(
                          product.sale_price ?? product.base_price,
                        ).toLocaleString()}
                        {product.sale_price !== null && (
                          <span className="ml-2 text-neutral-500 line-through">
                            {Number(product.base_price).toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {product.is_featured ? "Yes" : "No"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <a
                            className="admin-secondary"
                            href={`/admin/products/${product.id}/edit`}
                          >
                            Edit
                          </a>
                          <DeleteForm
                            action={deleteProductAction}
                            id={product.id}
                            label={product.name}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!result.data?.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-neutral-600"
                    >
                      No products match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            path="/admin/products"
            page={page}
            count={result.count || 0}
            filters={{ q, category, audience }}
          />
        </>
      )}
    </AdminLayout>
  );
}
