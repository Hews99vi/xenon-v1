import { audienceValues, type Audience } from "./content/schema";
import { supabasePublic } from "./supabasePublic";

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  placement: string;
};

export type HomepageSectionItem = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  metadata: Record<string, unknown>;
};

export type HomepageSection = {
  id: string;
  sectionKey: string;
  microLabel: string | null;
  title: string;
  body: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  metadata: Record<string, unknown>;
  items: HomepageSectionItem[];
};

export type CategorySummary = {
  audience?: Audience | null;
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
};

export type ProductSummary = {
  inStock?: boolean;
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
  quickAddVariant: {
    id: string;
    color: string | null;
    size: string | null;
    price: number | null;
    stockQuantity: number;
  } | null;
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

export async function getBannersByPlacement(placement: string, limit = 3) {
  const now = new Date().toISOString();
  const { data, error } = await supabasePublic
    .from("banners")
    .select(
      "id, title, subtitle, eyebrow, image_url, mobile_image_url, cta_label, cta_url, secondary_cta_label, secondary_cta_url, placement",
    )
    .eq("placement", placement)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingSchemaFeature(error.message)) {
      return getLegacyBannersByPlacement(placement, limit);
    }

    console.error("[Storefront] Could not load banners.", {
      placement,
      error: error.message,
    });
    return [];
  }

  return ((data || []) as {
    id: string;
    title: string;
    subtitle: string | null;
    eyebrow: string | null;
    image_url: string | null;
    mobile_image_url: string | null;
    cta_label: string | null;
    cta_url: string | null;
    secondary_cta_label: string | null;
    secondary_cta_url: string | null;
    placement: string;
  }[]).map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    eyebrow: banner.eyebrow,
    imageUrl: banner.image_url,
    mobileImageUrl: banner.mobile_image_url,
    ctaLabel: banner.cta_label,
    ctaUrl: banner.cta_url,
    secondaryCtaLabel: banner.secondary_cta_label,
    secondaryCtaUrl: banner.secondary_cta_url,
    placement: banner.placement,
  }));
}

export async function getPrimaryBanner(placement: string) {
  const [banner] = await getBannersByPlacement(placement, 1);
  return banner || null;
}

export async function getHeroBanners() {
  return getBannersByPlacement("home_hero", 3);
}

export async function getHomepageSection(sectionKey: string) {
  const { data: section, error: sectionError } = await supabasePublic
    .from("homepage_sections")
    .select("id, section_key, micro_label, title, body, cta_label, cta_url, metadata")
    .eq("section_key", sectionKey)
    .eq("is_active", true)
    .maybeSingle();

  if (sectionError || !section) {
    if (sectionError && !isMissingSchemaFeature(sectionError.message)) {
      console.error("[Storefront] Could not load homepage section.", {
        sectionKey,
        error: sectionError.message,
      });
    }
    return null;
  }

  const { data: items, error: itemsError } = await supabasePublic
    .from("homepage_section_items")
    .select("id, title, subtitle, image_url, cta_label, cta_url, sort_order, metadata")
    .eq("section_id", section.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    console.error("[Storefront] Could not load homepage section items.", {
      sectionKey,
      error: itemsError.message,
    });
  }

  return {
    id: section.id,
    sectionKey: section.section_key,
    microLabel: section.micro_label,
    title: section.title,
    body: section.body,
    ctaLabel: section.cta_label,
    ctaUrl: section.cta_url,
    metadata: normalizeMetadata(section.metadata),
    items: ((items || []) as {
      id: string;
      title: string;
      subtitle: string | null;
      image_url: string | null;
      cta_label: string | null;
      cta_url: string | null;
      sort_order: number;
      metadata: unknown;
    }[]).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      imageUrl: item.image_url,
      ctaLabel: item.cta_label,
      ctaUrl: item.cta_url,
      sortOrder: item.sort_order,
      metadata: normalizeMetadata(item.metadata),
    })),
  } satisfies HomepageSection;
}

async function getLegacyBannersByPlacement(placement: string, limit: number) {
  const now = new Date().toISOString();
  const { data, error } = await supabasePublic
    .from("banners")
    .select("id, title, subtitle, image_url, mobile_image_url, cta_label, cta_url, placement")
    .eq("placement", placement)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error) {
    if (!isMissingSchemaFeature(error.message)) {
      console.error("[Storefront] Could not load legacy banners.", {
        placement,
        error: error.message,
      });
    }
    return [];
  }

  return ((data || []) as {
    id: string;
    title: string;
    subtitle: string | null;
    image_url: string | null;
    mobile_image_url: string | null;
    cta_label: string | null;
    cta_url: string | null;
    placement: string;
  }[]).map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    eyebrow: null,
    imageUrl: banner.image_url,
    mobileImageUrl: banner.mobile_image_url,
    ctaLabel: banner.cta_label,
    ctaUrl: banner.cta_url,
    secondaryCtaLabel: null,
    secondaryCtaUrl: null,
    placement: banner.placement,
  }));
}

export async function getActiveCategories(limit?: number): Promise<CategorySummary[]> {
  let query = supabasePublic.from("categories").select("*").eq("is_active",true).order("sort_order").order("name");
  if(limit) query=query.limit(limit);
  const {data,error}=await query;
  if(error) throw new Error("Categories could not be loaded. Please try again.");
  return (data||[]).map(c=>({id:c.id,name:c.name,slug:c.slug,description:c.description,imageUrl:c.image_url,audience:c.audience||null}));
}

export type ProductSortOption = "newest" | "price-asc" | "price-desc";

export type ProductSummaryQueryOptions = {
  featuredOnly?: boolean;
  audience?: string;
  productIds?: string[];
  categorySlug?: string;
  search?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSortOption;
  limit?: number;
  page?: number;
  pageSize?: number;
  offset?: number;
};

export type ProductSummariesPage = {
  products: ProductSummary[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
};

export async function getProductSummaries(options?: ProductSummaryQueryOptions) {
  const result = await getProductSummariesPage(options);
  return result.products;
}

export async function getProductSummariesPage(
  options?: ProductSummaryQueryOptions,
): Promise<ProductSummariesPage> {
  const category = options?.categorySlug
    ? await getCategoryBySlug(options.categorySlug)
    : null;
  const pagination = getProductPagination(options);

  if (options?.categorySlug && !category) {
    return {
      products: [],
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
    };
  }

  /* ── Sorting ──────────────────────────────────────────────── */
  let ascending = false;          // default: newest first
  let orderColumn = "created_at";
  if (options?.sort === "price-asc") {
    orderColumn = "effective_price";
    ascending = true;
  } else if (options?.sort === "price-desc") {
    orderColumn = "effective_price";
    ascending = false;
  }

  const hasVariantFilters = Boolean(options?.color || options?.size);
  const productSelect = hasVariantFilters
    ? "id, category_id, name, slug, description, short_description, base_price, sale_price, product_variants!inner(id)"
    : "id, category_id, name, slug, description, short_description, base_price, sale_price";

  let query = supabasePublic
    .from("products")
    .select(productSelect, { count: "exact" })
    .eq("status", "active")
    .order(orderColumn, { ascending }).order("id");

  if (options?.productIds) {
    if (!options.productIds.length) return { products: [], currentPage: 1, pageSize: pagination.pageSize, totalCount: 0, totalPages: 0, hasNextPage: false };
    query = query.in("id", options.productIds);
  }

  if (options?.featuredOnly) {
    query = query.eq("is_featured", true);
  }

  const audiences = audienceValues(options?.audience);
  if (audiences) query = query.in("audience", audiences);

  if (category) {
    query = query.eq("category_id", category.id);
  }

  if (options?.search) {
    const search = options.search.replace(/[,()]/g," ").slice(0,120).replace(/[%_]/g, "\\$&");
    query = query.or(
      `name.ilike.%${search}%,description.ilike.%${search}%`,
    );
  }

  if (hasVariantFilters) {
    query = query.eq("product_variants.is_active", true);

    if (options?.color) {
      query = query.ilike("product_variants.color", escapeLikePattern(options.color));
    }

    if (options?.size) {
      query = query.eq("product_variants.size", options.size);
    }
  }

  /* ── Price filters ────────────────────────────────────────── */
  // effective_price is generated in Postgres as coalesce(sale_price, base_price).
  if (options?.minPrice !== undefined && options.minPrice > 0) {
    query = query.gte("effective_price", options.minPrice);
  }
  if (options?.maxPrice !== undefined && options.maxPrice > 0) {
    query = query.lte("effective_price", options.maxPrice);
  }

  query = query.range(pagination.from, pagination.to);

  const { data: products, count, error } = await query;
  if (error) throw new Error("Products could not be loaded. Please try again.");
  const summaries = await hydrateProductSummaries(
    (products || []) as unknown as ProductRow[],
  );
  if (options?.productIds) summaries.sort((a,b) => options.productIds!.indexOf(a.id)-options.productIds!.indexOf(b.id));
  const totalCount = count || 0;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pagination.pageSize) : 0;

  return {
    products: summaries,
    currentPage: pagination.currentPage,
    pageSize: pagination.pageSize,
    totalCount,
    totalPages,
    hasNextPage: pagination.currentPage < totalPages,
  };
}

/**
 * Returns the full set of distinct colors and sizes available across
 * all products matching the given category/search, without a limit.
 * Used to populate the filter sidebar options correctly.
 */
export async function getProductFilterOptions(options?: {
  audience?: string;
  categorySlug?: string;
  search?: string;
}) {
  const optionsResult = await supabasePublic.rpc("storefront_filter_options", { p_category_slug:options?.categorySlug||null, p_search:options?.search||null, p_audience:options?.audience||null });
  if(!optionsResult.error)return optionsResult.data as {colors:string[];sizes:string[]};
  if(!["PGRST202","42883"].includes(optionsResult.error.code))throw new Error("Filters could not be loaded.");
  // Read compatibility for databases awaiting the additive migration.
  const category = options?.categorySlug
    ? await getCategoryBySlug(options.categorySlug)
    : null;

  if (options?.categorySlug && !category) {
    return { colors: [] as string[], sizes: [] as string[] };
  }

  let query = supabasePublic
    .from("products")
    .select("id")
    .eq("status", "active");

  const audiences = audienceValues(options?.audience);
  if (audiences) query = query.in("audience", audiences);

  if (category) {
    query = query.eq("category_id", category.id);
  }

  if (options?.search) {
    const search = options.search.replace(/[,()]/g," ").slice(0,120).replace(/[%_]/g, "\\$&");
    query = query.or(
      `name.ilike.%${search}%,description.ilike.%${search}%`,
    );
  }

  const { data: products, error } = await query;
  if (error) throw new Error("Filters could not be loaded. Please try again.");
  if (!products?.length) {
    return { colors: [] as string[], sizes: [] as string[] };
  }

  const productIds = (products as { id: string }[]).map((p) => p.id);

  const { data: variants, error: variantsError } = await supabasePublic
    .from("product_variants")
    .select("color, size")
    .in("product_id", productIds)
    .eq("is_active", true);

  if(variantsError)throw new Error("Filters could not be loaded.");
  const colorSet = new Set<string>();
  const sizeSet = new Set<string>();

  for (const v of (variants || []) as { color: string | null; size: string | null }[]) {
    if (v.color) colorSet.add(v.color);
    if (v.size) sizeSet.add(v.size);
  }

  return {
    colors: Array.from(colorSet).sort(),
    sizes: Array.from(sizeSet).sort(),
  };
}

export async function getCategoryBySlug(slug: string) {
  const { data, error } = await supabasePublic
    .from("categories")
    .select("id, name, slug, description, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if(error)throw new Error("Category could not be loaded.");
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
  const { data: product, error: productError } = await supabasePublic
    .from("products")
    .select(
      "id, category_id, name, slug, description, short_description, base_price, sale_price, seo_title, seo_description",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if(productError)throw new Error("Product could not be loaded.");
  if (!product) {
    return null;
  }

  const [summary] = await hydrateProductSummaries([product as ProductRow]);
  const [{ data: images, error: imageError }, { data: variants, error: variantError }] = await Promise.all([
    supabasePublic
      .from("product_images")
      .select("id, image_url, alt_text, is_primary, sort_order")
      .eq("product_id", product.id)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true }).order("id"),
    supabasePublic
      .from("product_variants")
      .select("id, color, size, sku, price, stock_quantity, is_active")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("color", { ascending: true })
      .order("size", { ascending: true }),
  ]);

  if(imageError||variantError)throw new Error("Product details could not be loaded.");
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

  const [{ data: images, error: imageError }, { data: variants, error: variantError }, { data: categories, error: categoryError }] =
    await Promise.all([
      supabasePublic
        .from("product_images")
        .select("product_id, image_url, is_primary, sort_order")
        .in("product_id", productIds)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true }).order("id"),
      supabasePublic
        .from("product_variants")
        .select("id, product_id, color, size, price, stock_quantity")
        .in("product_id", productIds)
        .eq("is_active", true)
        .order("stock_quantity", { ascending: false }),
      categoryIds.length
        ? supabasePublic
            .from("categories")
            .select("id, name, slug")
            .in("id", categoryIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if(imageError||variantError||categoryError)throw new Error("Product information could not be loaded.");
  const primaryImages = new Map<string, string>();
  for (const image of (images || []) as {
    product_id: string;
    image_url: string;
  }[]) {
    if (!primaryImages.has(image.product_id)) {
      primaryImages.set(image.product_id, image.image_url);
    }
  }

  const variantMap = new Map<
    string,
    {
      colors: Set<string>;
      sizes: Set<string>;
      /* All in-stock active variants for this product */
      inStockVariants: Array<{
        id: string;
        color: string | null;
        size: string | null;
        price: number | null;
        stockQuantity: number;
      }>;
    }
  >();
  for (const product of products) {
    variantMap.set(product.id, {
      colors: new Set(),
      sizes: new Set(),
      inStockVariants: [],
    });
  }

  for (const variant of (variants || []) as {
    id: string;
    product_id: string;
    color: string | null;
    size: string | null;
    price: number | null;
    stock_quantity: number;
  }[]) {
    const entry = variantMap.get(variant.product_id);
    if (entry) {
      if (variant.color) entry.colors.add(variant.color);
      if (variant.size) entry.sizes.add(variant.size);
      /* Collect every in-stock variant — decision made after the loop */
      if (variant.stock_quantity > 0) {
        entry.inStockVariants.push({
          id: variant.id,
          color: variant.color,
          size: variant.size,
          price: variant.price === null ? null : Number(variant.price),
          stockQuantity: variant.stock_quantity,
        });
      }
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
      inStock: Boolean(variantEntry?.inStockVariants.length),
      colors: Array.from(variantEntry?.colors || []),
      sizes: Array.from(variantEntry?.sizes || []),
      /*
       * quickAddVariant is only set when the product has EXACTLY ONE
       * in-stock variant. Multi-size / multi-color products must return
       * null here so product cards redirect to the PDP instead of
       * silently adding an arbitrary size to the cart.
       */
      quickAddVariant: (() => {
        const inStock = variantEntry?.inStockVariants || [];
        if (inStock.length !== 1) return null;
        const v = inStock[0];
        return {
          id: v.id,
          color: v.color,
          size: v.size || "Free Size",
          price: v.price,
          stockQuantity: v.stockQuantity,
        };
      })(),
    } satisfies ProductSummary;
  });
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function isMissingSchemaFeature(message: string) {
  return (
    message.includes("Could not find the table") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

function getProductPagination(options?: ProductSummaryQueryOptions) {
  const pageSize = Math.max(1, Math.min(options?.pageSize || options?.limit || 200, 100));
  const currentPage = Math.max(1, Math.floor(options?.page || 1));
  const offset =
    options?.offset !== undefined
      ? Math.max(0, Math.floor(options.offset))
      : (currentPage - 1) * pageSize;

  return {
    currentPage: Math.floor(offset / pageSize) + 1,
    pageSize,
    from: offset,
    to: offset + pageSize - 1,
  };
}
