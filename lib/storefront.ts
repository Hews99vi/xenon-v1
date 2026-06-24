import { supabasePublic } from "./supabasePublic";

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
};

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
};

export type ProductSummary = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  basePrice: number;
  salePrice: number | null;
  primaryImage: string | null;
  colors: string[];
  sizes: string[];
};

export type ProductImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
  isPrimary: boolean;
};

export type ProductVariant = {
  id: string;
  color: string | null;
  size: string | null;
  sku: string;
  price: number | null;
  stockQuantity: number;
  isActive: boolean;
};

export type ProductDetail = ProductSummary & {
  seoTitle: string | null;
  seoDescription: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
};

type ProductRow = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  base_price: number;
  sale_price: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

export async function getHeroBanners() {
  const now = new Date().toISOString();
  const { data } = await supabasePublic
    .from("banners")
    .select("id, title, subtitle, image_url, mobile_image_url, cta_label, cta_url")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("sort_order", { ascending: true })
    .limit(3);

  return ((data || []) as {
    id: string;
    title: string;
    subtitle: string | null;
    image_url: string | null;
    mobile_image_url: string | null;
    cta_label: string | null;
    cta_url: string | null;
  }[]).map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    imageUrl: banner.image_url,
    mobileImageUrl: banner.mobile_image_url,
    ctaLabel: banner.cta_label,
    ctaUrl: banner.cta_url,
  }));
}

export async function getActiveCategories(limit?: number) {
  let query = supabasePublic
    .from("categories")
    .select("id, name, slug, description, image_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data } = await query;

  return ((data || []) as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
  }[]).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.image_url,
  }));
}

export async function getProductSummaries(options?: {
  featuredOnly?: boolean;
  categorySlug?: string;
  search?: string;
  limit?: number;
}) {
  const category = options?.categorySlug
    ? await getCategoryBySlug(options.categorySlug)
    : null;

  if (options?.categorySlug && !category) {
    return [];
  }

  let query = supabasePublic
    .from("products")
    .select(
      "id, category_id, name, slug, description, short_description, base_price, sale_price",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (options?.featuredOnly) {
    query = query.eq("is_featured", true);
  }

  if (category) {
    query = query.eq("category_id", category.id);
  }

  if (options?.search) {
    const search = options.search.replace(/[%_]/g, "\\$&");
    query = query.or(
      `name.ilike.%${search}%,description.ilike.%${search}%`,
    );
  }

  query = query.limit(options?.limit || 60);

  const { data: products } = await query;
  return hydrateProductSummaries((products || []) as ProductRow[]);
}

export async function getCategoryBySlug(slug: string) {
  const { data } = await supabasePublic
    .from("categories")
    .select("id, name, slug, description, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    imageUrl: data.image_url,
  } satisfies CategorySummary;
}

export async function getProductBySlug(slug: string) {
  const { data: product } = await supabasePublic
    .from("products")
    .select(
      "id, category_id, name, slug, description, short_description, base_price, sale_price, seo_title, seo_description",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!product) {
    return null;
  }

  const [summary] = await hydrateProductSummaries([product as ProductRow]);
  const [{ data: images }, { data: variants }] = await Promise.all([
    supabasePublic
      .from("product_images")
      .select("id, image_url, alt_text, is_primary, sort_order")
      .eq("product_id", product.id)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true }),
    supabasePublic
      .from("product_variants")
      .select("id, color, size, sku, price, stock_quantity, is_active")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("color", { ascending: true })
      .order("size", { ascending: true }),
  ]);

  return {
    ...summary,
    seoTitle: product.seo_title,
    seoDescription: product.seo_description,
    images: ((images || []) as {
      id: string;
      image_url: string;
      alt_text: string | null;
      is_primary: boolean;
    }[]).map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      altText: image.alt_text,
      isPrimary: image.is_primary,
    })),
    variants: ((variants || []) as {
      id: string;
      color: string | null;
      size: string | null;
      sku: string;
      price: number | null;
      stock_quantity: number;
      is_active: boolean;
    }[]).map((variant) => ({
      id: variant.id,
      color: variant.color,
      size: variant.size || "Free Size",
      sku: variant.sku,
      price: variant.price,
      stockQuantity: variant.stock_quantity,
      isActive: variant.is_active,
    })),
  } satisfies ProductDetail;
}

export async function getAllCategorySlugs() {
  const { data } = await supabasePublic
    .from("categories")
    .select("slug")
    .eq("is_active", true);

  return ((data || []) as { slug: string }[]).map((item) => item.slug);
}

export async function getAllProductSlugs() {
  const { data } = await supabasePublic
    .from("products")
    .select("slug")
    .eq("status", "active");

  return ((data || []) as { slug: string }[]).map((item) => item.slug);
}

async function hydrateProductSummaries(products: ProductRow[]) {
  if (!products.length) {
    return [];
  }

  const productIds = products.map((product) => product.id);
  const categoryIds = products
    .map((product) => product.category_id)
    .filter((id): id is string => Boolean(id));

  const [{ data: images }, { data: variants }, { data: categories }] =
    await Promise.all([
      supabasePublic
        .from("product_images")
        .select("product_id, image_url, is_primary, sort_order")
        .in("product_id", productIds)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true }),
      supabasePublic
        .from("product_variants")
        .select("product_id, color, size")
        .in("product_id", productIds)
        .eq("is_active", true),
      categoryIds.length
        ? supabasePublic
            .from("categories")
            .select("id, name, slug")
            .in("id", categoryIds)
        : Promise.resolve({ data: [] }),
    ]);

  const primaryImages = new Map<string, string>();
  for (const image of (images || []) as {
    product_id: string;
    image_url: string;
  }[]) {
    if (!primaryImages.has(image.product_id)) {
      primaryImages.set(image.product_id, image.image_url);
    }
  }

  const variantMap = new Map<string, { colors: Set<string>; sizes: Set<string> }>();
  for (const product of products) {
    variantMap.set(product.id, { colors: new Set(), sizes: new Set() });
  }

  for (const variant of (variants || []) as {
    product_id: string;
    color: string | null;
    size: string | null;
  }[]) {
    const entry = variantMap.get(variant.product_id);
    if (entry) {
      if (variant.color) entry.colors.add(variant.color);
      if (variant.size) entry.sizes.add(variant.size);
    }
  }

  const categoryMap = new Map(
    ((categories || []) as { id: string; name: string; slug: string }[]).map(
      (category) => [category.id, category],
    ),
  );

  return products.map((product) => {
    const category = product.category_id
      ? categoryMap.get(product.category_id)
      : null;
    const variantEntry = variantMap.get(product.id);

    return {
      id: product.id,
      categoryId: product.category_id,
      categoryName: category?.name || null,
      categorySlug: category?.slug || null,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.short_description,
      basePrice: Number(product.base_price),
      salePrice:
        product.sale_price === null || product.sale_price === undefined
          ? null
          : Number(product.sale_price),
      primaryImage: primaryImages.get(product.id) || null,
      colors: Array.from(variantEntry?.colors || []),
      sizes: Array.from(variantEntry?.sizes || []),
    } satisfies ProductSummary;
  });
}
