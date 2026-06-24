import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLayout } from "../../../AdminLayout";
import { ProductForm } from "../../ProductForm";
import { updateProductAction } from "../../actions";
import type { ProductVariantInput } from "@/lib/adminSchemas";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type CategoryOption = {
  id: string;
  name: string;
};

type ProductVariantRow = {
  id: string;
  color: string | null;
  size: string | null;
  sku: string;
  price: number | null;
  stock_quantity: number;
  is_active: boolean;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const [{ data: categories }, { data: product }, { data: variants }] =
    await Promise.all([
      supabase.from("categories").select("id, name").order("name"),
      supabase
        .from("products")
        .select(
          "id, category_id, name, slug, description, short_description, base_price, sale_price, sku, status, is_featured, seo_title, seo_description",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("product_variants")
        .select("id, color, size, sku, price, stock_quantity, is_active")
        .eq("product_id", id)
        .order("color", { ascending: true })
        .order("size", { ascending: true }),
    ]);

  if (!product) {
    notFound();
  }

  const action = updateProductAction.bind(null, id);
  const productVariants: ProductVariantInput[] = (
    (variants || []) as ProductVariantRow[]
  ).map((variant) => ({
      id: variant.id,
      color: variant.color || "",
      size: variant.size || "Free Size",
      sku: variant.sku,
      price:
        variant.price === null || Number(variant.price) === Number(product.base_price)
          ? ""
          : Number(variant.price),
      stockQuantity: variant.stock_quantity,
      isActive: variant.is_active,
    }));

  return (
    <AdminLayout
      title="Edit product"
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
        <ProductForm
          categories={(categories || []) as CategoryOption[]}
          action={action}
          submitLabel="Update product"
          defaultValues={{
            name: product.name,
            slug: product.slug,
            description: product.description || "",
            shortDescription: product.short_description || "",
            basePrice: Number(product.base_price),
            salePrice:
              product.sale_price === null ? "" : Number(product.sale_price),
            sku: product.sku,
            status: product.status,
            isFeatured: product.is_featured,
            categoryId: product.category_id,
            seoTitle: product.seo_title || "",
            seoDescription: product.seo_description || "",
            variants: productVariants.length
              ? productVariants
              : [
                  {
                    color: "",
                    size: "Free Size",
                    sku: `${product.sku}-FS`,
                    price: "",
                    stockQuantity: 0,
                    isActive: true,
                  },
                ],
          }}
        />
      </div>
    </AdminLayout>
  );
}
