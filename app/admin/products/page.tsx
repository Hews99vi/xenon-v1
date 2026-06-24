import Link from "next/link";
import { AdminLayout } from "../AdminLayout";
import { deleteProductAction } from "./actions";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

type Category = {
  id: string;
  name: string;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: string;
  base_price: number;
  sale_price: number | null;
  is_featured: boolean;
  categories:
    | {
        name: string;
      }[]
    | null;
};

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const { q = "", category = "" } = await searchParams;
  const supabase = await createServerSupabaseClient();

  let productsQuery = supabase
    .from("products")
    .select(
      "id, name, slug, sku, status, base_price, sale_price, is_featured, categories(name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    productsQuery = productsQuery.or(`name.ilike.%${q}%,sku.ilike.%${q}%,slug.ilike.%${q}%`);
  }

  if (category) {
    productsQuery = productsQuery.eq("category_id", category);
  }

  const [{ data: categories }, productsResult] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    productsQuery,
  ]);

  return (
    <AdminLayout
      title="Products"
      action={
        <Link className="admin-button inline-flex" href="/admin/products/new">
          New product
        </Link>
      }
    >
      <form className="mb-6 grid gap-4 border border-black bg-white p-4 md:grid-cols-[1fr_16rem_auto]">
        <input
          className="admin-input"
          name="q"
          placeholder="Search name, SKU, or slug"
          defaultValue={q}
        />
        <select className="admin-input" name="category" defaultValue={category}>
          <option value="">All categories</option>
          {((categories || []) as Category[]).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button className="admin-button" type="submit">
          Filter
        </button>
      </form>

      {productsResult.error ? (
        (console.error("[AdminProductsPage]", productsResult.error),
        <p className="border border-black bg-white p-4 text-sm">
          Could not load products.
        </p>)
      ) : (
        <div className="overflow-hidden border border-black bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-black bg-neutral-100 text-xs uppercase tracking-[0.2em]">
              <tr>
                <th className="px-4 py-4">Product</th>
                <th className="px-4 py-4">Category</th>
                <th className="px-4 py-4">SKU</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Price</th>
                <th className="px-4 py-4">Featured</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {((productsResult.data || []) as ProductRow[]).map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-4">
                    <p className="font-medium text-black">{product.name}</p>
                    <p className="text-xs text-neutral-500">{product.slug}</p>
                  </td>
                  <td className="px-4 py-4">
                    {product.categories?.[0]?.name || "None"}
                  </td>
                  <td className="px-4 py-4">{product.sku}</td>
                  <td className="px-4 py-4">{product.status.replaceAll("_", " ")}</td>
                  <td className="px-4 py-4">
                    {product.sale_price ? (
                      <>
                        <span>{product.sale_price.toLocaleString()}</span>
                        <span className="ml-2 text-xs text-neutral-500 line-through">
                          {product.base_price.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      product.base_price.toLocaleString()
                    )}
                  </td>
                  <td className="px-4 py-4">{product.is_featured ? "Yes" : "No"}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        className="border border-black px-3 py-2 text-xs uppercase tracking-[0.18em]"
                        href={`/admin/products/${product.id}/edit`}
                      >
                        Edit
                      </Link>
                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={product.id} />
                        <button
                          className="border border-black bg-black px-3 py-2 text-xs uppercase tracking-[0.18em] text-white"
                          type="submit"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!productsResult.data?.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-neutral-600" colSpan={7}>
                    No products match this filter.
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
