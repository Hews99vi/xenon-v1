-- Xenon commerce schema for Supabase PostgreSQL.
-- Run this in the Supabase SQL editor for a fresh development database.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  short_description text,
  base_price numeric(12, 2) not null check (base_price >= 0),
  sale_price numeric(12, 2) check (sale_price is null or sale_price >= 0),
  effective_price numeric(12, 2) generated always as (coalesce(sale_price, base_price)) stored,
  sku text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'out_of_stock', 'archived')),
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sale_price_lte_base_price_check check (
    sale_price is null or sale_price <= base_price
  )
);

alter table public.products
add column if not exists effective_price numeric(12, 2)
generated always as (coalesce(sale_price, base_price)) stored;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists product_images_one_primary_per_product
on public.product_images (product_id)
where is_primary = true;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color text,
  size text,
  sku text not null unique,
  price numeric(12, 2) check (price is null or price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists product_variants_unique_color_size
on public.product_variants (
  product_id,
  lower(coalesce(color, '')),
  lower(coalesce(size, 'Free Size'))
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  minimum_order_amount numeric(12, 2) not null default 0 check (minimum_order_amount >= 0),
  max_discount_amount numeric(12, 2) check (max_discount_amount is null or max_discount_amount >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_codes_percentage_value_check check (
    discount_type <> 'percentage' or discount_value <= 100
  ),
  constraint promo_codes_date_check check (
    expires_at is null or starts_at is null or expires_at > starts_at
  )
);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  district text,
  postal_codes text[],
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  free_delivery_minimum numeric(12, 2) check (free_delivery_minimum is null or free_delivery_minimum >= 0),
  estimated_days_min integer not null default 1 check (estimated_days_min >= 0),
  estimated_days_max integer not null default 3 check (estimated_days_max >= estimated_days_min),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_email text not null,
  customer_phone text not null,
  customer_first_name text not null,
  customer_last_name text not null,
  shipping_address_line1 text not null,
  shipping_address_line2 text,
  shipping_city text not null,
  shipping_district text,
  shipping_postal_code text,
  shipping_country text not null default 'Sri Lanka',
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_district text,
  billing_postal_code text,
  billing_country text,
  delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  promo_code_id uuid references public.promo_codes(id) on delete set null,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount_total numeric(12, 2) not null default 0 check (discount_total >= 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  tax_total numeric(12, 2) not null default 0 check (tax_total >= 0),
  grand_total numeric(12, 2) not null check (grand_total >= 0),
  currency text not null default 'LKR',
  payment_method text not null default 'cod' check (payment_method in ('payhere', 'cod', 'bank_transfer')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  order_status text not null default 'pending' check (order_status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  customer_notes text,
  admin_notes text,
  stock_released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
add column if not exists stock_released_at timestamptz;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  product_sku text,
  variant_color text,
  variant_size text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'manual',
  provider_transaction_id text,
  merchant_id text,
  payment_id text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'LKR',
  status text not null default 'pending' check (status in ('pending', 'authorized', 'paid', 'failed', 'cancelled', 'refunded')),
  raw_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  source text,
  subscribed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_uidx
on public.newsletter_subscribers (lower(email));

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  eyebrow text,
  image_url text,
  mobile_image_url text,
  cta_label text,
  cta_url text,
  secondary_cta_label text,
  secondary_cta_url text,
  placement text not null default 'home_hero',
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint banners_date_check check (
    ends_at is null or starts_at is null or ends_at > starts_at
  )
);

alter table public.banners
add column if not exists eyebrow text;

alter table public.banners
add column if not exists secondary_cta_label text;

alter table public.banners
add column if not exists secondary_cta_url text;

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  micro_label text,
  title text not null,
  body text,
  cta_label text,
  cta_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.homepage_sections(id) on delete cascade,
  title text not null,
  subtitle text,
  image_url text,
  cta_label text,
  cta_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  cover_image_url text,
  author_name text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.policy_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'manager' check (role in ('owner', 'admin', 'manager')),
  avatar_url text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin-managed media is part of the application setup, not an optional
-- module. Supabase creates storage.buckets and storage.objects by default.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'blog-images',
    'blog-images',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'banner-images',
    'banner-images',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'category-images',
    'category-images',
    true,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  ),
  (
    'product-images',
    'product-images',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists categories_active_sort_idx on public.categories (is_active, sort_order);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_effective_price_idx on public.products (effective_price);
create index if not exists products_status_featured_idx on public.products (status, is_featured);
create index if not exists product_images_product_sort_idx on public.product_images (product_id, sort_order);
create index if not exists product_variants_product_idx on public.product_variants (product_id);
create unique index if not exists delivery_zones_unique_district_city
on public.delivery_zones (
  lower(coalesce(district, '')),
  lower(coalesce(city, ''))
);
create index if not exists orders_customer_email_idx on public.orders (customer_email);
create index if not exists orders_status_created_idx on public.orders (order_status, created_at desc);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_delivery_zone_idx on public.orders (delivery_zone_id);
create index if not exists orders_promo_code_idx on public.orders (promo_code_id);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists order_items_variant_idx on public.order_items (variant_id);
create index if not exists payment_transactions_order_idx on public.payment_transactions (order_id);
create unique index if not exists payment_transactions_provider_transaction_uidx
on public.payment_transactions (provider, provider_transaction_id);
create index if not exists newsletter_subscribers_status_subscribed_idx
on public.newsletter_subscribers (status, subscribed_at desc);
create index if not exists blog_posts_status_published_idx on public.blog_posts (status, published_at desc);
create index if not exists banners_placement_active_sort_idx on public.banners (placement, is_active, sort_order);
create index if not exists homepage_sections_key_active_idx on public.homepage_sections (section_key, is_active);
create index if not exists homepage_section_items_section_sort_idx on public.homepage_section_items (section_id, is_active, sort_order);
create unique index if not exists homepage_section_items_section_title_uidx
on public.homepage_section_items (section_id, lower(title));

drop policy if exists "Admin image uploads" on storage.objects;
create policy "Admin image uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('banner-images', 'blog-images', 'category-images', 'product-images')
  and exists (
    select 1
    from public.admin_profiles
    where admin_profiles.id = auth.uid()
      and admin_profiles.is_active = true
  )
);

drop policy if exists "Admin image updates" on storage.objects;
create policy "Admin image updates"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('banner-images', 'blog-images', 'category-images', 'product-images')
  and exists (
    select 1
    from public.admin_profiles
    where admin_profiles.id = auth.uid()
      and admin_profiles.is_active = true
  )
)
with check (
  bucket_id in ('banner-images', 'blog-images', 'category-images', 'product-images')
  and exists (
    select 1
    from public.admin_profiles
    where admin_profiles.id = auth.uid()
      and admin_profiles.is_active = true
  )
);

drop policy if exists "Admin image deletes" on storage.objects;
create policy "Admin image deletes"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('banner-images', 'blog-images', 'category-images', 'product-images')
  and exists (
    select 1
    from public.admin_profiles
    where admin_profiles.id = auth.uid()
      and admin_profiles.is_active = true
  )
);

drop policy if exists "Public image reads" on storage.objects;
create policy "Public image reads"
on storage.objects
for select
to public
using (bucket_id in ('banner-images', 'blog-images', 'category-images', 'product-images'));

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_product_variants_updated_at on public.product_variants;
create trigger set_product_variants_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

drop trigger if exists set_promo_codes_updated_at on public.promo_codes;
create trigger set_promo_codes_updated_at
before update on public.promo_codes
for each row execute function public.set_updated_at();

drop trigger if exists set_delivery_zones_updated_at on public.delivery_zones;
create trigger set_delivery_zones_updated_at
before update on public.delivery_zones
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger set_newsletter_subscribers_updated_at
before update on public.newsletter_subscribers
for each row execute function public.set_updated_at();

drop trigger if exists set_banners_updated_at on public.banners;
create trigger set_banners_updated_at
before update on public.banners
for each row execute function public.set_updated_at();

drop trigger if exists set_homepage_sections_updated_at on public.homepage_sections;
create trigger set_homepage_sections_updated_at
before update on public.homepage_sections
for each row execute function public.set_updated_at();

drop trigger if exists set_homepage_section_items_updated_at on public.homepage_section_items;
create trigger set_homepage_section_items_updated_at
before update on public.homepage_section_items
for each row execute function public.set_updated_at();

drop trigger if exists set_blog_posts_updated_at on public.blog_posts;
create trigger set_blog_posts_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_policy_pages_updated_at on public.policy_pages;
create trigger set_policy_pages_updated_at
before update on public.policy_pages
for each row execute function public.set_updated_at();

drop trigger if exists set_admin_profiles_updated_at on public.admin_profiles;
create trigger set_admin_profiles_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

create or replace function public.is_active_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = user_id
      and is_active = true
  );
$$;

create or replace function public.admin_upsert_product(
  p_product_id uuid,
  p_product jsonb,
  p_images jsonb,
  p_variants jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_id uuid;
  product_slug text;
  image_row record;
  variant_row record;
  next_image_sort_order integer;
  has_primary_image boolean;
begin
  if not public.is_active_admin() then
    raise exception 'not_authorized';
  end if;

  if jsonb_typeof(coalesce(p_product, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_images, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_variants, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_product_payload';
  end if;

  if p_product_id is null then
    insert into public.products (
      category_id, name, slug, description, short_description,
      base_price, sale_price, sku, status, is_featured,
      seo_title, seo_description
    )
    values (
      (p_product->>'category_id')::uuid,
      trim(p_product->>'name'),
      trim(p_product->>'slug'),
      nullif(trim(p_product->>'description'), ''),
      nullif(trim(p_product->>'short_description'), ''),
      (p_product->>'base_price')::numeric,
      nullif(trim(p_product->>'sale_price'), '')::numeric,
      trim(p_product->>'sku'),
      p_product->>'status',
      coalesce((p_product->>'is_featured')::boolean, false),
      nullif(trim(p_product->>'seo_title'), ''),
      nullif(trim(p_product->>'seo_description'), '')
    )
    returning id, slug into v_product_id, product_slug;
  else
    update public.products
    set
      category_id = (p_product->>'category_id')::uuid,
      name = trim(p_product->>'name'),
      slug = trim(p_product->>'slug'),
      description = nullif(trim(p_product->>'description'), ''),
      short_description = nullif(trim(p_product->>'short_description'), ''),
      base_price = (p_product->>'base_price')::numeric,
      sale_price = nullif(trim(p_product->>'sale_price'), '')::numeric,
      sku = trim(p_product->>'sku'),
      status = p_product->>'status',
      is_featured = coalesce((p_product->>'is_featured')::boolean, false),
      seo_title = nullif(trim(p_product->>'seo_title'), ''),
      seo_description = nullif(trim(p_product->>'seo_description'), '')
    where id = p_product_id
    returning id, slug into v_product_id, product_slug;

    if not found then
      raise exception 'product_not_found';
    end if;
  end if;

  select coalesce(max(sort_order) + 1, 0), coalesce(bool_or(is_primary), false)
  into next_image_sort_order, has_primary_image
  from public.product_images
  where public.product_images.product_id = v_product_id;

  for image_row in
    select * from jsonb_to_recordset(p_images) as image(image_url text, alt_text text)
  loop
    if nullif(trim(image_row.image_url), '') is null then
      raise exception 'invalid_product_image';
    end if;

    insert into public.product_images (
      product_id, image_url, alt_text, sort_order, is_primary
    )
    values (
      v_product_id,
      trim(image_row.image_url),
      nullif(trim(image_row.alt_text), ''),
      next_image_sort_order,
      not has_primary_image and next_image_sort_order = coalesce(next_image_sort_order, 0)
    );

    has_primary_image := true;
    next_image_sort_order := next_image_sort_order + 1;
  end loop;

  delete from public.product_variants existing_variant
  where existing_variant.product_id = v_product_id
    and not exists (
      select 1
      from jsonb_to_recordset(p_variants) as submitted_variant(id uuid)
      where submitted_variant.id is not null
        and submitted_variant.id = existing_variant.id
    );

  for variant_row in
    select * from jsonb_to_recordset(p_variants) as variant(
      id uuid, color text, size text, sku text, price numeric,
      stock_quantity integer, is_active boolean
    )
  loop
    if nullif(trim(variant_row.sku), '') is null then
      raise exception 'invalid_variant_sku';
    end if;

    if variant_row.id is null then
      insert into public.product_variants (
        product_id, color, size, sku, price, stock_quantity, is_active
      )
      values (
        v_product_id,
        nullif(trim(variant_row.color), ''),
        coalesce(nullif(trim(variant_row.size), ''), 'Free Size'),
        trim(variant_row.sku),
        variant_row.price,
        variant_row.stock_quantity,
        coalesce(variant_row.is_active, true)
      );
    else
      if not exists (
        select 1 from public.product_variants
        where id = variant_row.id
          and public.product_variants.product_id = v_product_id
      ) then
        raise exception 'variant_not_found';
      end if;

      update public.product_variants
      set
        color = nullif(trim(variant_row.color), ''),
        size = coalesce(nullif(trim(variant_row.size), ''), 'Free Size'),
        sku = trim(variant_row.sku),
        price = variant_row.price,
        stock_quantity = variant_row.stock_quantity,
        is_active = coalesce(variant_row.is_active, true)
      where id = variant_row.id
        and public.product_variants.product_id = v_product_id;
    end if;
  end loop;

  return jsonb_build_object('product_id', v_product_id, 'slug', product_slug);
end;
$$;

revoke execute on function public.admin_upsert_product(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.admin_upsert_product(uuid, jsonb, jsonb, jsonb) to authenticated, service_role;

create or replace function public.checkout_transaction(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  item_quantity integer;
  item_product_id uuid;
  item_variant_id uuid;
  requested_item record;
  variant_row record;
  delivery_row record;
  promo_row record;
  order_id uuid;
  promo_id uuid := null;
  order_number text := nullif(trim(payload->>'order_number'), '');
  promo_code text := nullif(upper(trim(coalesce(payload->>'promo_code', ''))), '');
  subtotal numeric(12, 2) := 0;
  discount_total numeric(12, 2) := 0;
  delivery_fee numeric(12, 2) := 0;
  grand_total numeric(12, 2) := 0;
begin
  if order_number is null then
    raise exception 'order_number_required';
  end if;

  if payload->>'payment_method' <> 'cod' then
    raise exception 'unsupported_payment_method';
  end if;

  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then
    raise exception 'cart_empty';
  end if;

  select dz.id, dz.name, dz.city, dz.district, dz.delivery_fee
  into delivery_row
  from public.delivery_zones dz
  where dz.id = (payload->>'delivery_zone_id')::uuid
    and dz.is_active = true;

  if not found then
    raise exception 'delivery_zone_not_found';
  end if;

  delivery_fee := round(delivery_row.delivery_fee, 2);

  create temporary table if not exists checkout_requested_items (
    product_id uuid not null,
    variant_id uuid not null,
    quantity integer not null
  ) on commit drop;

  create temporary table if not exists checkout_requested_items_merged (
    product_id uuid not null,
    variant_id uuid not null,
    quantity integer not null
  ) on commit drop;

  create temporary table if not exists checkout_order_items (
    product_id uuid not null,
    variant_id uuid not null,
    product_name text not null,
    product_sku text,
    variant_color text,
    variant_size text,
    quantity integer not null,
    unit_price numeric(12, 2) not null,
    line_total numeric(12, 2) not null
  ) on commit drop;

  truncate table checkout_requested_items;
  truncate table checkout_requested_items_merged;
  truncate table checkout_order_items;

  for item in select * from jsonb_array_elements(payload->'items')
  loop
    item_quantity := (item->>'quantity')::integer;
    item_product_id := (item->>'product_id')::uuid;
    item_variant_id := (item->>'variant_id')::uuid;

    if item_quantity is null or item_quantity <= 0 then
      raise exception 'invalid_quantity';
    end if;

    insert into checkout_requested_items (
      product_id,
      variant_id,
      quantity
    )
    values (
      item_product_id,
      item_variant_id,
      item_quantity
    );
  end loop;

  insert into checkout_requested_items_merged (
    product_id,
    variant_id,
    quantity
  )
  select
    product_id,
    variant_id,
    sum(quantity)::integer
  from checkout_requested_items
  group by product_id, variant_id;

  truncate table checkout_requested_items;

  insert into checkout_requested_items (
    product_id,
    variant_id,
    quantity
  )
  select
    product_id,
    variant_id,
    quantity
  from checkout_requested_items_merged;

  for requested_item in select * from checkout_requested_items
  loop
    item_quantity := requested_item.quantity;
    item_product_id := requested_item.product_id;
    item_variant_id := requested_item.variant_id;

    select
      pv.id as variant_id,
      pv.product_id,
      pv.color,
      coalesce(nullif(pv.size, ''), 'Free Size') as size,
      pv.sku,
      pv.price as variant_price,
      pv.stock_quantity,
      pv.is_active as variant_is_active,
      p.name as product_name,
      p.base_price,
      p.sale_price,
      p.status as product_status
    into variant_row
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = item_variant_id
      and pv.product_id = item_product_id
    for update of pv;

    if not found or not variant_row.variant_is_active or variant_row.product_status <> 'active' then
      raise exception 'cart_item_unavailable';
    end if;

    if variant_row.stock_quantity < item_quantity then
      raise exception 'insufficient_stock';
    end if;

    insert into checkout_order_items (
      product_id,
      variant_id,
      product_name,
      product_sku,
      variant_color,
      variant_size,
      quantity,
      unit_price,
      line_total
    )
    values (
      variant_row.product_id,
      variant_row.variant_id,
      variant_row.product_name,
      variant_row.sku,
      variant_row.color,
      variant_row.size,
      item_quantity,
      round(coalesce(variant_row.variant_price, variant_row.sale_price, variant_row.base_price), 2),
      round(coalesce(variant_row.variant_price, variant_row.sale_price, variant_row.base_price) * item_quantity, 2)
    );
  end loop;

  select round(coalesce(sum(line_total), 0), 2)
  into subtotal
  from checkout_order_items;

  if promo_code is not null then
    select *
    into promo_row
    from public.promo_codes
    where code = promo_code
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now())
    for update;

    if not found then
      raise exception 'promo_invalid';
    end if;

    if promo_row.usage_limit is not null and promo_row.used_count >= promo_row.usage_limit then
      raise exception 'promo_usage_limit_reached';
    end if;

    if subtotal < promo_row.minimum_order_amount then
      raise exception 'promo_minimum_not_met';
    end if;

    if promo_row.discount_type = 'percentage' then
      discount_total := round(subtotal * (promo_row.discount_value / 100), 2);
    else
      discount_total := round(promo_row.discount_value, 2);
    end if;

    if promo_row.max_discount_amount is not null then
      discount_total := least(discount_total, promo_row.max_discount_amount);
    end if;

    discount_total := least(discount_total, subtotal);

    update public.promo_codes
    set used_count = used_count + 1
    where id = promo_row.id;

    promo_id := promo_row.id;
  end if;

  grand_total := round(subtotal - discount_total + delivery_fee, 2);

  insert into public.orders (
    order_number,
    customer_email,
    customer_phone,
    customer_first_name,
    customer_last_name,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_district,
    shipping_postal_code,
    shipping_country,
    delivery_zone_id,
    promo_code_id,
    subtotal,
    discount_total,
    delivery_fee,
    tax_total,
    grand_total,
    currency,
    payment_method,
    payment_status,
    order_status,
    customer_notes
  )
  values (
    order_number,
    coalesce(nullif(trim(payload->>'customer_email'), ''), 'guest@xenon.local'),
    nullif(trim(payload->>'customer_phone'), ''),
    nullif(trim(payload->>'customer_first_name'), ''),
    nullif(trim(payload->>'customer_last_name'), ''),
    nullif(trim(payload->>'shipping_address_line1'), ''),
    nullif(trim(payload->>'shipping_address_line2'), ''),
    nullif(trim(payload->>'shipping_city'), ''),
    coalesce(nullif(trim(payload->>'shipping_district'), ''), delivery_row.district),
    nullif(trim(payload->>'shipping_postal_code'), ''),
    'Sri Lanka',
    delivery_row.id,
    promo_id,
    subtotal,
    discount_total,
    delivery_fee,
    0,
    grand_total,
    'LKR',
    payload->>'payment_method',
    'pending',
    'pending',
    nullif(trim(payload->>'customer_notes'), '')
  )
  returning id into order_id;

  insert into public.order_items (
    order_id,
    product_id,
    variant_id,
    product_name,
    product_sku,
    variant_color,
    variant_size,
    quantity,
    unit_price,
    line_total
  )
  select
    order_id,
    product_id,
    variant_id,
    product_name,
    product_sku,
    variant_color,
    variant_size,
    quantity,
    unit_price,
    line_total
  from checkout_order_items;

  update public.product_variants pv
  set stock_quantity = pv.stock_quantity - checkout_order_items.quantity
  from checkout_order_items
  where pv.id = checkout_order_items.variant_id;

  return jsonb_build_object(
    'order_id', order_id,
    'order_number', order_number,
    'subtotal', subtotal,
    'discount_total', discount_total,
    'delivery_fee', delivery_fee,
    'grand_total', grand_total
  );
end;
$$;

revoke execute on function public.checkout_transaction(jsonb) from public, anon, authenticated;
grant execute on function public.checkout_transaction(jsonb) to service_role;

create or replace function public.release_order_stock(
  p_order_id uuid default null,
  p_order_number text default null,
  p_cancel_order boolean default true,
  p_payment_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  order_row record;
  released_at timestamptz := now();
  restored_quantity integer := 0;
begin
  if not public.is_active_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not_authorized';
  end if;

  if p_order_id is null and nullif(trim(coalesce(p_order_number, '')), '') is null then
    raise exception 'order_identifier_required';
  end if;

  if p_payment_status is not null and p_payment_status not in ('pending', 'paid', 'failed', 'refunded', 'cancelled') then
    raise exception 'invalid_payment_status';
  end if;

  select
    id,
    order_number,
    order_status,
    payment_status,
    stock_released_at
  into order_row
  from public.orders
  where (
    p_order_id is not null
    and id = p_order_id
  )
  or (
    p_order_id is null
    and order_number = nullif(trim(coalesce(p_order_number, '')), '')
  )
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if order_row.stock_released_at is not null then
    if p_cancel_order and order_row.order_status <> 'cancelled' then
      update public.orders
      set
        order_status = 'cancelled',
        payment_status = coalesce(p_payment_status, payment_status)
      where id = order_row.id;
    end if;

    return jsonb_build_object(
      'order_id', order_row.id,
      'order_number', order_row.order_number,
      'stock_released', false,
      'already_released', true,
      'stock_released_at', order_row.stock_released_at,
      'restored_quantity', 0
    );
  end if;

  if order_row.order_status not in ('pending', 'confirmed', 'processing', 'cancelled') then
    raise exception 'order_stock_release_not_allowed';
  end if;

  select coalesce(sum(quantity), 0)::integer
  into restored_quantity
  from public.order_items
  where order_id = order_row.id
    and variant_id is not null;

  update public.product_variants pv
  set stock_quantity = pv.stock_quantity + order_item_totals.quantity
  from (
    select
      variant_id,
      sum(quantity)::integer as quantity
    from public.order_items
    where order_id = order_row.id
      and variant_id is not null
    group by variant_id
  ) as order_item_totals
  where pv.id = order_item_totals.variant_id;

  update public.orders
  set
    stock_released_at = released_at,
    order_status = case when p_cancel_order then 'cancelled' else order_status end,
    payment_status = coalesce(p_payment_status, payment_status)
  where id = order_row.id;

  return jsonb_build_object(
    'order_id', order_row.id,
    'order_number', order_row.order_number,
    'stock_released', true,
    'already_released', false,
    'stock_released_at', released_at,
    'restored_quantity', restored_quantity
  );
end;
$$;

grant execute on function public.release_order_stock(uuid, text, boolean, text) to authenticated, service_role;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.promo_codes enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.banners enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.homepage_section_items enable row level security;
alter table public.blog_posts enable row level security;
alter table public.site_settings enable row level security;
alter table public.policy_pages enable row level security;
alter table public.admin_profiles enable row level security;

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
on public.categories for select
using (is_active = true or public.is_active_admin());

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
on public.categories for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
using (status = 'active' or public.is_active_admin());

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
on public.products for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read active product images" on public.product_images;
create policy "Public can read active product images"
on public.product_images for select
using (
  public.is_active_admin()
  or exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and products.status = 'active'
  )
);

drop policy if exists "Admins manage product images" on public.product_images;
create policy "Admins manage product images"
on public.product_images for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants"
on public.product_variants for select
using (
  public.is_active_admin()
  or (
    is_active = true
    and exists (
      select 1
      from public.products
      where products.id = product_variants.product_id
        and products.status = 'active'
    )
  )
);

drop policy if exists "Admins manage product variants" on public.product_variants;
create policy "Admins manage product variants"
on public.product_variants for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read active promo codes" on public.promo_codes;
create policy "Public can read active promo codes"
on public.promo_codes for select
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (expires_at is null or expires_at >= now())
  or public.is_active_admin()
);

drop policy if exists "Admins manage promo codes" on public.promo_codes;
create policy "Admins manage promo codes"
on public.promo_codes for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read active delivery zones" on public.delivery_zones;
create policy "Public can read active delivery zones"
on public.delivery_zones for select
using (is_active = true or public.is_active_admin());

drop policy if exists "Admins manage delivery zones" on public.delivery_zones;
create policy "Admins manage delivery zones"
on public.delivery_zones for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders"
on public.orders for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items"
on public.order_items for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Admins manage payment transactions" on public.payment_transactions;
create policy "Admins manage payment transactions"
on public.payment_transactions for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Admins read newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins read newsletter subscribers"
on public.newsletter_subscribers for select
using (public.is_active_admin());

drop policy if exists "Admins manage newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins manage newsletter subscribers"
on public.newsletter_subscribers for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read active banners" on public.banners;
create policy "Public can read active banners"
on public.banners for select
using (
  public.is_active_admin()
  or (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  )
);

drop policy if exists "Admins manage banners" on public.banners;
create policy "Admins manage banners"
on public.banners for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read active homepage sections" on public.homepage_sections;
create policy "Public can read active homepage sections"
on public.homepage_sections for select
using (is_active = true or public.is_active_admin());

drop policy if exists "Admins manage homepage sections" on public.homepage_sections;
create policy "Admins manage homepage sections"
on public.homepage_sections for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read active homepage section items" on public.homepage_section_items;
create policy "Public can read active homepage section items"
on public.homepage_section_items for select
using (
  public.is_active_admin()
  or (
    is_active = true
    and exists (
      select 1
      from public.homepage_sections
      where homepage_sections.id = homepage_section_items.section_id
        and homepage_sections.is_active = true
    )
  )
);

drop policy if exists "Admins manage homepage section items" on public.homepage_section_items;
create policy "Admins manage homepage section items"
on public.homepage_section_items for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read published blog posts" on public.blog_posts;
create policy "Public can read published blog posts"
on public.blog_posts for select
using (status = 'published' or public.is_active_admin());

drop policy if exists "Admins manage blog posts" on public.blog_posts;
create policy "Admins manage blog posts"
on public.blog_posts for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read public site settings" on public.site_settings;
create policy "Public can read public site settings"
on public.site_settings for select
using (is_public = true or public.is_active_admin());

drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings"
on public.site_settings for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read published policy pages" on public.policy_pages;
create policy "Public can read published policy pages"
on public.policy_pages for select
using (status = 'published' or public.is_active_admin());

drop policy if exists "Admins manage policy pages" on public.policy_pages;
create policy "Admins manage policy pages"
on public.policy_pages for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Admins can read their profile" on public.admin_profiles;
create policy "Admins can read their profile"
on public.admin_profiles for select
using (id = auth.uid() and is_active = true or public.is_active_admin());

drop policy if exists "Admins manage admin profiles" on public.admin_profiles;
create policy "Admins manage admin profiles"
on public.admin_profiles for all
using (public.is_active_admin())
with check (public.is_active_admin());

insert into public.categories (name, slug, description, image_url, sort_order)
values
  (
    'Evening Wear',
    'evening-wear',
    'Black-tie silhouettes, refined tailoring, and occasion-ready statement pieces.',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c',
    1
  ),
  (
    'Accessories',
    'accessories',
    'Minimal finishing pieces designed to complete a luxury wardrobe.',
    'https://images.unsplash.com/photo-1523170335258-f5ed11844a49',
    2
  ),
  (
    'Signature Collection',
    'signature-collection',
    'Core Xenon pieces with restrained palettes, premium materials, and lasting form.',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b',
    3
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.products (
  category_id,
  name,
  slug,
  description,
  short_description,
  base_price,
  sale_price,
  sku,
  status,
  is_featured,
  seo_title,
  seo_description
)
values
  (
    (select id from public.categories where slug = 'evening-wear'),
    'Noir Satin Column Dress',
    'noir-satin-column-dress',
    'A floor-length satin column dress with a clean neckline, sculpted waist, and concealed back closure.',
    'Floor-length satin column dress in black.',
    42500.00,
    null,
    'XEN-EVE-001',
    'active',
    true,
    'Noir Satin Column Dress | Xenon',
    'A refined black satin evening dress for formal occasions.'
  ),
  (
    (select id from public.categories where slug = 'signature-collection'),
    'Ivory Tailored Blazer',
    'ivory-tailored-blazer',
    'A structured ivory blazer with sharp shoulders, single-button closure, and soft satin lining.',
    'Structured ivory blazer with satin lining.',
    36500.00,
    32900.00,
    'XEN-SIG-001',
    'active',
    true,
    'Ivory Tailored Blazer | Xenon',
    'A luxury ivory blazer for elevated everyday and occasion styling.'
  ),
  (
    (select id from public.categories where slug = 'accessories'),
    'Monochrome Leather Clutch',
    'monochrome-leather-clutch',
    'A compact leather clutch with monochrome finish, magnetic closure, and interior slip pocket.',
    'Compact monochrome leather clutch.',
    18500.00,
    null,
    'XEN-ACC-001',
    'active',
    false,
    'Monochrome Leather Clutch | Xenon',
    'A compact leather clutch for evening and formal styling.'
  )
on conflict (slug) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  short_description = excluded.short_description,
  base_price = excluded.base_price,
  sale_price = excluded.sale_price,
  sku = excluded.sku,
  status = excluded.status,
  is_featured = excluded.is_featured,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  updated_at = now();

insert into public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
values
  (
    (select id from public.products where slug = 'noir-satin-column-dress'),
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8',
    'Noir Satin Column Dress front view',
    1,
    true
  ),
  (
    (select id from public.products where slug = 'ivory-tailored-blazer'),
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
    'Ivory Tailored Blazer on model',
    1,
    true
  ),
  (
    (select id from public.products where slug = 'monochrome-leather-clutch'),
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3',
    'Monochrome Leather Clutch product image',
    1,
    true
  )
on conflict do nothing;

insert into public.product_variants (product_id, color, size, sku, price, stock_quantity)
values
  (
    (select id from public.products where slug = 'noir-satin-column-dress'),
    'Black',
    'S',
    'XEN-EVE-001-BLK-S',
    42500.00,
    8
  ),
  (
    (select id from public.products where slug = 'noir-satin-column-dress'),
    'Black',
    'M',
    'XEN-EVE-001-BLK-M',
    42500.00,
    12
  ),
  (
    (select id from public.products where slug = 'ivory-tailored-blazer'),
    'Ivory',
    'M',
    'XEN-SIG-001-IVY-M',
    32900.00,
    10
  ),
  (
    (select id from public.products where slug = 'monochrome-leather-clutch'),
    'Black',
    'One Size',
    'XEN-ACC-001-BLK-OS',
    18500.00,
    15
  )
on conflict (sku) do update
set
  product_id = excluded.product_id,
  color = excluded.color,
  size = excluded.size,
  price = excluded.price,
  stock_quantity = excluded.stock_quantity,
  updated_at = now();

insert into public.promo_codes (
  code,
  description,
  discount_type,
  discount_value,
  minimum_order_amount,
  usage_limit,
  starts_at,
  expires_at
)
values
  ('WELCOME10', 'Development promo for first orders.', 'percentage', 10, 15000.00, 100, now(), now() + interval '90 days'),
  ('XENON5000', 'Fixed-value development promo.', 'fixed', 5000.00, 50000.00, 50, now(), now() + interval '60 days')
on conflict (code) do update
set
  description = excluded.description,
  discount_type = excluded.discount_type,
  discount_value = excluded.discount_value,
  minimum_order_amount = excluded.minimum_order_amount,
  usage_limit = excluded.usage_limit,
  starts_at = excluded.starts_at,
  expires_at = excluded.expires_at,
  updated_at = now();

insert into public.delivery_zones (
  name,
  city,
  district,
  postal_codes,
  delivery_fee,
  free_delivery_minimum,
  estimated_days_min,
  estimated_days_max,
  sort_order
)
values
  ('Colombo Central', 'Colombo Central', 'Colombo', array['00100', '00200', '00300', '00400', '00500'], 450.00, 50000.00, 1, 2, 1),
  ('Greater Colombo', 'Greater Colombo', 'Colombo', array['00600', '00700', '00800', '00900', '01000'], 650.00, 65000.00, 2, 3, 2)
on conflict do nothing;

insert into public.banners (
  title,
  subtitle,
  eyebrow,
  image_url,
  cta_label,
  cta_url,
  secondary_cta_label,
  secondary_cta_url,
  placement,
  sort_order
)
select
  seed.title,
  seed.subtitle,
  seed.eyebrow,
  seed.image_url,
  seed.cta_label,
  seed.cta_url,
  seed.secondary_cta_label,
  seed.secondary_cta_url,
  seed.placement,
  seed.sort_order
from (
  values
  (
    'NO NOISE.
JUST FORM.',
    'Monochrome essentials. Zero compromise.',
    'Xenon · SS26',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae',
    'Shop Signature',
    '/products?category=signature-collection',
    'Shop Evening Wear',
    '/products?category=evening-wear',
    'home_hero',
    1
  ),
  (
    'THE MONOCHROME UNIFORM',
    'Built for quiet confidence — tailored essentials for day and night.',
    'Campaign',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b',
    'Shop Now',
    '/products',
    null,
    null,
    'home_editorial',
    1
  )
) as seed (
  title,
  subtitle,
  eyebrow,
  image_url,
  cta_label,
  cta_url,
  secondary_cta_label,
  secondary_cta_url,
  placement,
  sort_order
)
where not exists (
  select 1
  from public.banners
  where banners.placement = seed.placement
    and banners.title = seed.title
);

insert into public.homepage_sections (
  section_key,
  micro_label,
  title,
  body,
  sort_order,
  metadata
)
values
  (
    'home_occasions',
    'STYLE CODES',
    'SHOP BY OCCASION',
    null,
    1,
    '{"defaultGender":"men"}'::jsonb
  ),
  (
    'home_atelier',
    'ATELIER',
    'PRECISION IN RESTRAINT',
    'Xenon is built around monochrome silhouettes, clean construction, and everyday refinement.',
    2,
    '{"values":["CONSIDERED SILHOUETTES","EVERYDAY LUXURY","MEN AND WOMEN EDITS"]}'::jsonb
  )
on conflict (section_key) do update
set
  micro_label = excluded.micro_label,
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.homepage_section_items (
  section_id,
  title,
  subtitle,
  image_url,
  cta_label,
  cta_url,
  sort_order,
  metadata
)
values
  (
    (select id from public.homepage_sections where section_key = 'home_occasions'),
    'WORK',
    'Sharp essentials for long days.',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
    'Shop Now',
    '/products?q=work',
    1,
    '{"gender":"all","objectPosition":"42% 18%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_occasions'),
    'EVENING',
    'Quiet pieces after dark.',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c',
    'Shop Now',
    '/products?q=evening',
    2,
    '{"gender":"all","objectPosition":"54% 16%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_occasions'),
    'WEEKEND',
    'Relaxed silhouettes, refined.',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b',
    'Shop Now',
    '/products?q=weekend',
    3,
    '{"gender":"all","objectPosition":"62% 20%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_occasions'),
    'TRAVEL',
    'Movement without noise.',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f',
    'Shop Now',
    '/products?q=travel',
    4,
    '{"gender":"all","objectPosition":"48% 22%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_atelier'),
    'Fabric / Detail',
    null,
    'https://images.unsplash.com/photo-1516762689617-e1cffcef479d',
    null,
    null,
    1,
    '{"layout":"detail","objectPosition":"42% 20%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_atelier'),
    'Model / Editorial',
    null,
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c',
    null,
    null,
    2,
    '{"layout":"editorial","objectPosition":"58% 16%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_atelier'),
    'Product / Close-Up',
    null,
    'https://images.unsplash.com/photo-1523170335258-f5ed11844a49',
    null,
    null,
    3,
    '{"layout":"wide","objectPosition":"50% 28%"}'::jsonb
  )
on conflict do nothing;

insert into public.blog_posts (
  title,
  slug,
  excerpt,
  content,
  cover_image_url,
  author_name,
  status,
  published_at
)
values
  (
    'Building a Monochrome Wardrobe',
    'building-a-monochrome-wardrobe',
    'A short guide to shape, contrast, and texture in black-and-white styling.',
    'Use contrast, texture, and proportion to keep a monochrome wardrobe precise without feeling flat.',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d',
    'Xenon Atelier',
    'published',
    now()
  )
on conflict (slug) do update
set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  cover_image_url = excluded.cover_image_url,
  author_name = excluded.author_name,
  status = excluded.status,
  published_at = excluded.published_at,
  updated_at = now();

insert into public.site_settings (key, value, description, is_public)
values
  ('store_profile', '{"name":"Xenon","currency":"LKR","support_email":"hello@example.com","support_phone":"+94 77 000 0000"}', 'Public store identity and support details.', true),
  ('payhere', '{"enabled":false,"sandbox":true}', 'Future PayHere configuration placeholder. Store secrets only in environment variables when the gateway is implemented.', false),
  ('seo_defaults', '{"title":"Xenon","description":"Luxury black-and-white commerce."}', 'Default SEO values.', true)
on conflict (key) do update
set
  value = excluded.value,
  description = excluded.description,
  is_public = excluded.is_public,
  updated_at = now();

insert into public.policy_pages (title, slug, content, status, published_at)
values
  ('Privacy Policy', 'privacy-policy', 'Development placeholder privacy policy content.', 'published', now()),
  ('Shipping Policy', 'shipping-policy', 'Development placeholder shipping policy content.', 'published', now()),
  ('Returns Policy', 'returns-policy', 'Development placeholder returns policy content.', 'published', now())
on conflict (slug) do update
set
  title = excluded.title,
  content = excluded.content,
  status = excluded.status,
  published_at = excluded.published_at,
  updated_at = now();
